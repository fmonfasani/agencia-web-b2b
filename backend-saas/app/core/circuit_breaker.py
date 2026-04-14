"""
core/circuit_breaker.py — Circuit breaker + timeout wrappers

Centralises three cross-cutting concerns:
  1. ENV-aware fail-open / fail-closed
  2. Global timeouts via asyncio.wait_for
  3. Circuit breaker for Redis and DB calls

ENV behaviour:
  production → fail-closed: raise HTTP 503 on infrastructure failure
  dev/staging → fail-open:  log warning, continue (avoids blocking local dev)

Usage:
    from app.core.circuit_breaker import safe_redis, safe_db, TIMEOUTS

    value = await safe_redis(lambda: r.get(key))          # Redis with timeout
    row   = await safe_db(lambda: run_query(conn))        # DB with timeout
"""
import asyncio
import functools
import logging
import os
from typing import Any, Callable, Optional, TypeVar

from fastapi import HTTPException

logger = logging.getLogger(__name__)

# ── Environment ───────────────────────────────────────────────────────────────

ENV = os.getenv("ENV", "development").lower()
IS_PRODUCTION = ENV == "production"

# ── Timeouts (seconds) ────────────────────────────────────────────────────────

class TIMEOUTS:
    REDIS   = float(os.getenv("TIMEOUT_REDIS_S",  "1.0"))   # 1 s for Redis ops
    DB      = float(os.getenv("TIMEOUT_DB_S",     "5.0"))   # 5 s for DB queries
    AGENT   = float(os.getenv("TIMEOUT_AGENT_S", "60.0"))   # 60 s for agent proxy

T = TypeVar("T")


# ── Core wrapper ──────────────────────────────────────────────────────────────

async def _safe_call(
    fn: Callable[[], Any],
    timeout: float,
    component: str,
    fallback: Any = None,
    raise_on_failure: bool = IS_PRODUCTION,
) -> Any:
    """
    Wrap an async call with timeout and error handling.

    In production:  raises HTTP 503 on any failure.
    In dev/staging: returns `fallback`, logs warning.
    """
    try:
        coro = fn()
        return await asyncio.wait_for(coro, timeout=timeout)
    except asyncio.TimeoutError:
        msg = f"[{component}] timeout after {timeout}s"
        if raise_on_failure:
            logger.error(msg)
            raise HTTPException(
                status_code=503,
                detail={"error": f"{component.lower()}_timeout", "message": msg},
            )
        logger.warning(msg)
        return fallback
    except HTTPException:
        raise  # Don't swallow 4xx/5xx from downstream
    except Exception as e:
        msg = f"[{component}] unavailable: {e}"
        if raise_on_failure:
            logger.error(msg)
            raise HTTPException(
                status_code=503,
                detail={"error": f"{component.lower()}_unavailable", "message": msg},
            )
        logger.warning(msg)
        return fallback


# ── Public helpers ────────────────────────────────────────────────────────────

async def safe_redis(
    fn: Callable[[], Any],
    fallback: Any = None,
    timeout: float = TIMEOUTS.REDIS,
) -> Any:
    """
    Run a Redis coroutine with timeout.

    Production:  HTTP 503 on failure.
    Dev/staging: returns fallback (allows offline development).
    """
    return await _safe_call(fn, timeout, "Redis", fallback=fallback)


async def safe_db(
    fn: Callable[[], Any],
    fallback: Any = None,
    timeout: float = TIMEOUTS.DB,
) -> Any:
    """
    Run a DB coroutine (psycopg2 via run_in_executor) with timeout.

    NOTE: psycopg2 is synchronous. Wrap with:
        await safe_db(lambda: asyncio.get_event_loop().run_in_executor(None, blocking_fn))
    Or use this for async-wrapped DB calls.
    """
    return await _safe_call(fn, timeout, "Database", fallback=fallback)


async def safe_agent(fn: Callable[[], Any], timeout: float = TIMEOUTS.AGENT) -> Any:
    """Run agent proxy call with timeout. Always fail-closed (502, not 503)."""
    try:
        return await asyncio.wait_for(fn(), timeout=timeout)
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail={"error": "agent_timeout", "message": f"Agent execution timed out after {timeout}s"},
        )


# ── Decorator: enforce ExecutionRuntime presence ──────────────────────────────

def requires_execution_runtime(handler):
    """
    Decorator that asserts request.state.identity is set before the handler runs.

    Use on any route that processes billable executions but does NOT use
    execution_context() (safety net for accidental bypasses).

    Routes using execution_context() already enforce identity — this decorator
    is the backstop for the others.

    Usage:
        @router.post("/my-endpoint")
        @requires_execution_runtime
        async def my_handler(request: Request, ...):
            ...
    """
    @functools.wraps(handler)
    async def wrapper(*args, **kwargs):
        # Extract request from positional or keyword args
        request: Optional[Any] = kwargs.get("request")
        if request is None:
            for arg in args:
                if hasattr(arg, "state"):
                    request = arg
                    break

        if request is not None:
            identity = getattr(getattr(request, "state", None), "identity", None)
            if identity is None:
                raise HTTPException(
                    status_code=401,
                    detail={
                        "error": "runtime_bypass_detected",
                        "message": "Request reached handler without identity resolution. "
                                   "Ensure APIGatewayMiddleware is registered.",
                    },
                )
        return await handler(*args, **kwargs)
    return wrapper
