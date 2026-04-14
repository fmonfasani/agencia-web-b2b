"""
core/execution_runtime.py — Deterministic Execution Pipeline

The ONLY path through which agent executions are authorized and billed.
No route handler can bypass this without explicitly opting out (and being
caught in code review).

Pipeline (guaranteed order):
    1. Identity    — resolved by APIGatewayMiddleware (already in request.state)
    2. Authorize   — RBAC + ABAC via PolicyEngine
    3. Reserve     — atomic quota check+reserve via QuotaEngine Lua script
    4. Execute     — caller-supplied coroutine
    5. UsageEvent  — write to Redis queue (idempotent, with retry)
    6. Commit      — finalize quota with actual token count
    7. Rollback    — if execution failed, undo reservation

Usage:
    async with ExecutionRuntime(request, tenant_id=tid) as rt:
        result = await proxy.forward(...)
        rt.record_usage(
            tokens_in=result["metadata"]["tokens_in"],
            tokens_out=result["metadata"]["tokens_out"],
            model=result["metadata"]["model"],
            trace_id=result.get("trace_id"),
            agent_type="recepcionista",
        )
    return result

The context manager guarantees:
  - If rt.record_usage() is called → quota committed, event enqueued
  - If execution raises → quota rolled back, no event written
  - If record_usage() is NOT called → quota rolled back (safety net)
"""
import logging
import time
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import HTTPException, Request

from app.core.policy_engine import (
    Permission, PolicyViolation, authorize,
)
from app.core.quota_engine import QuotaEngine, QuotaExceeded, QuotaReservation, quota_engine
from app.core.usage_tracker import UsageEvent, usage_tracker
from app.middleware.api_gateway import Identity

logger = logging.getLogger(__name__)

# Default estimated token budget for pre-execution quota reservation
_DEFAULT_ESTIMATED_TOKENS = 500


class ExecutionRuntime:
    """
    Context manager that enforces the deterministic execution pipeline.

    All state is per-request — not shared between coroutines.
    """

    def __init__(
        self,
        request: Request,
        *,
        tenant_id: str,
        permission: Permission = Permission.AGENTS_EXECUTE,
        estimated_tokens: int = _DEFAULT_ESTIMATED_TOKENS,
    ):
        self._request = request
        self._tenant_id = tenant_id
        self._permission = permission
        self._estimated_tokens = estimated_tokens

        # Set during __aenter__
        self._identity: Optional[Identity] = None
        self._reservation: Optional[QuotaReservation] = None
        self._start_time: float = 0.0

        # Set by caller via record_usage()
        self._usage_event: Optional[UsageEvent] = None

    # ── Context manager protocol ──────────────────────────────────────────────

    async def __aenter__(self) -> "ExecutionRuntime":
        self._start_time = time.monotonic()

        # ── Step 1: Identity (already resolved by APIGatewayMiddleware) ───────
        identity: Optional[Identity] = getattr(self._request.state, "identity", None)
        if identity is None:
            # Middleware was bypassed (test / internal call) — reject
            raise HTTPException(
                status_code=401,
                detail={"error": "unauthenticated", "message": "No identity in request state"},
            )
        self._identity = identity

        # ── Step 2: Authorize (RBAC + ABAC + API key scopes) ─────────────────
        try:
            authorize(
                identity.to_user_dict(),
                self._permission,
                resource={"tenant_id": self._tenant_id},
                api_key_meta=identity.to_api_key_meta(),
            )
        except PolicyViolation:
            raise  # Already an HTTPException(403)

        # ── Step 3: Atomic quota reservation ─────────────────────────────────
        try:
            self._reservation = await quota_engine.check_and_reserve(
                self._tenant_id,
                tokens=self._estimated_tokens,
            )
        except QuotaExceeded as qe:
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "quota_exceeded",
                    "reason": qe.reason,
                    "counter": qe.counter,
                    "limit": qe.limit,
                },
            )

        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> bool:
        # ── Step 7: Execution failed → rollback, no usage event ──────────────
        if exc_type is not None:
            if self._reservation:
                await quota_engine.rollback(self._reservation)
            return False  # Re-raise

        if self._usage_event is None:
            # record_usage() was never called — safety rollback
            logger.warning(
                f"[ExecutionRuntime] record_usage() not called — rolling back. "
                f"tenant={self._tenant_id} trace={getattr(self._request.state, 'trace_id', '?')}"
            )
            if self._reservation:
                await quota_engine.rollback(self._reservation)
            return False

        # ── Correct order: commit quota FIRST, then enqueue usage event ───────
        #
        # Why this order matters:
        #   If we enqueue usage first and then quota-commit fails, billing records
        #   exist but quota counters are wrong → over-billing on next reconcile.
        #
        #   If quota-commit fails but usage was NOT yet written, reconciliation
        #   will re-derive the correct counter from usage_events — self-healing.
        #
        # ── Step 6: Commit quota (adjust reservation to actual tokens) ────────
        if self._reservation:
            await quota_engine.commit(
                self._reservation,
                actual_tokens=self._usage_event.tokens_total,
            )

        # ── Step 5: Enqueue usage event (reliable queue, with retry + DLQ) ───
        await usage_tracker.enqueue(self._usage_event)

        return False

    # ── Public API ────────────────────────────────────────────────────────────

    def record_usage(
        self,
        *,
        tokens_in: int,
        tokens_out: int,
        model: str = "ollama/gemma3:latest",
        agent_type: str = "default",
        trace_id: Optional[str] = None,
        session_id: Optional[str] = None,
        finish_reason: str = "stop",
    ) -> None:
        """
        Record actual usage after execution completes.

        Must be called INSIDE the async with block before it exits.
        Normalizes model name to include provider prefix.
        """
        duration_ms = int((time.monotonic() - self._start_time) * 1000)

        # Normalize model — ensure provider prefix for pricing lookup
        if model and "/" not in model:
            model = f"ollama/{model}"

        self._usage_event = UsageEvent(
            tenant_id=self._tenant_id,
            agent_type=agent_type,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            model=model,
            session_id=session_id,
            trace_id=trace_id or self._request.state.trace_id,
            duration_ms=duration_ms,
            finish_reason=finish_reason,
        )

    @property
    def identity(self) -> Identity:
        assert self._identity is not None, "identity accessed before __aenter__"
        return self._identity

    @property
    def duration_ms(self) -> int:
        return int((time.monotonic() - self._start_time) * 1000)


# ── Convenience async context manager function ────────────────────────────────

@asynccontextmanager
async def execution_context(
    request: Request,
    *,
    tenant_id: str,
    permission: Permission = Permission.AGENTS_EXECUTE,
    estimated_tokens: int = _DEFAULT_ESTIMATED_TOKENS,
):
    """
    Functional alias for ExecutionRuntime as an async context manager.

    Usage:
        async with execution_context(request, tenant_id=tid) as rt:
            result = await proxy.forward(...)
            rt.record_usage(tokens_in=..., tokens_out=..., model=...)
        return result
    """
    rt = ExecutionRuntime(
        request,
        tenant_id=tenant_id,
        permission=permission,
        estimated_tokens=estimated_tokens,
    )
    async with rt:
        yield rt
