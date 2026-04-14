"""
core/usage_tracker.py — Billing-grade usage event pipeline (v2)

BEFORE (broken):
  - Column name: idempotency_key  ← mismatch with DB event_id
  - Query: TO_CHAR(occurred_at, ...) ← column doesn't exist
  - asyncio.create_task() ← fire-and-forget, no retry

AFTER (fixed):
  - Column name: event_id (SHA-256 of trace_id:tenant_id)
  - Query: TO_CHAR(created_at, ...)
  - Redis queue (LPUSH) + background worker (BLPOP) with retry + DLQ

Architecture:
    Execution
        ↓
    UsageEvent (source of truth)
        ↓
    Billing (cost calculation)
        ↓
    Quota (derivado — QuotaEngine.commit() is called SEPARATELY by ExecutionRuntime)

UsageTracker ONLY writes events. Quota is managed by ExecutionRuntime.
"""
import hashlib
import json
import logging
import os
import uuid
from dataclasses import dataclass, field
from datetime import date
from typing import Optional

import psycopg2
import redis.asyncio as aioredis

logger = logging.getLogger(__name__)

# ── Redis queue keys ──────────────────────────────────────────────────────────
USAGE_QUEUE_KEY = "usage:events:queue"
USAGE_DLQ_KEY   = "usage:events:dlq"
MAX_RETRIES     = 3
BATCH_SIZE      = int(os.getenv("USAGE_WORKER_BATCH_SIZE",  "50"))
SLEEP_IF_EMPTY  = float(os.getenv("USAGE_WORKER_SLEEP_S",   "0.1"))

# ── Token pricing (per 1M tokens, USD) ───────────────────────────────────────
TOKEN_PRICING: dict[str, tuple[float, float]] = {
    "openai/gpt-4o-mini":                      (0.15,  0.60),
    "openai/gpt-3.5-turbo":                    (0.50,  1.50),
    "anthropic/claude-haiku":                  (0.25,  1.25),
    "anthropic/claude-3-haiku-20240307":       (0.25,  1.25),
    "meta-llama/llama-3.1-8b-instruct":        (0.055, 0.055),
    "meta-llama/llama-3.1-70b-instruct":       (0.35,  0.40),
    "google/gemini-flash-1.5":                 (0.075, 0.30),
    "mistralai/mistral-7b-instruct":           (0.055, 0.055),
    "ollama/gemma3:latest":                    (0.0,   0.0),
    "ollama/qwen2.5:3b":                       (0.0,   0.0),
    "ollama/qwen2.5:7b":                       (0.0,   0.0),
    "ollama/llama3.2:3b":                      (0.0,   0.0),
}


def compute_cost_usd(model: str, tokens_in: int, tokens_out: int) -> float:
    price_in, price_out = TOKEN_PRICING.get(model, (0.0, 0.0))
    return (tokens_in * price_in + tokens_out * price_out) / 1_000_000


def _make_event_id(trace_id: str, tenant_id: str) -> str:
    """Deterministic, collision-resistant event_id = SHA-256(trace_id:tenant_id)."""
    return hashlib.sha256(f"{trace_id}:{tenant_id}".encode()).hexdigest()


def _get_db_dsn() -> str:
    return os.environ.get("DATABASE_URL", "")


def _get_redis() -> aioredis.Redis:
    url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    return aioredis.from_url(url, decode_responses=True)


# ── UsageEvent ────────────────────────────────────────────────────────────────

@dataclass
class UsageEvent:
    tenant_id: str
    agent_type: str
    tokens_in: int
    tokens_out: int
    model: str = "ollama/gemma3:latest"
    session_id: Optional[str] = None
    trace_id: Optional[str] = None
    duration_ms: int = 0
    finish_reason: str = "stop"
    cost_usd: float = field(init=False)
    event_id: str = field(init=False)

    def __post_init__(self):
        if not self.trace_id:
            self.trace_id = str(uuid.uuid4())
        self.cost_usd = compute_cost_usd(self.model, self.tokens_in, self.tokens_out)
        self.event_id = _make_event_id(self.trace_id, self.tenant_id)

    @property
    def tokens_total(self) -> int:
        return self.tokens_in + self.tokens_out

    def to_dict(self) -> dict:
        return {
            "tenant_id": self.tenant_id,
            "agent_type": self.agent_type,
            "tokens_in": self.tokens_in,
            "tokens_out": self.tokens_out,
            "model": self.model,
            "session_id": self.session_id,
            "trace_id": self.trace_id,
            "duration_ms": self.duration_ms,
            "finish_reason": self.finish_reason,
            "cost_usd": self.cost_usd,
            "event_id": self.event_id,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "UsageEvent":
        e = cls(
            tenant_id=d["tenant_id"],
            agent_type=d["agent_type"],
            tokens_in=d["tokens_in"],
            tokens_out=d["tokens_out"],
            model=d.get("model", "ollama/gemma3:latest"),
            session_id=d.get("session_id"),
            trace_id=d.get("trace_id"),
            duration_ms=d.get("duration_ms", 0),
            finish_reason=d.get("finish_reason", "stop"),
        )
        # Restore pre-computed fields if present (worker re-hydration)
        if "event_id" in d:
            e.event_id = d["event_id"]
        if "cost_usd" in d:
            e.cost_usd = d["cost_usd"]
        return e


# ── UsageTracker ──────────────────────────────────────────────────────────────

class UsageTracker:
    """
    Writes billing events to PostgreSQL (append-only, idempotent via event_id).

    Responsibility boundary:
        UsageTracker  → writes usage_events (billing source of truth)
        QuotaEngine   → manages counters (enforcement)
        ExecutionRuntime → coordinates both (called by proxy router)

    UsageTracker does NOT call QuotaEngine. That coupling is removed.
    """

    async def enqueue(self, event: UsageEvent) -> None:
        """
        Push event to Redis queue for reliable async processing.

        Replaces fire-and-forget asyncio.create_task().
        The background worker (start_worker) processes events with retry.
        """
        try:
            r = _get_redis()
            payload = json.dumps({**event.to_dict(), "_attempts": 0})
            await r.lpush(USAGE_QUEUE_KEY, payload)
        except Exception as e:
            # Queue unavailable — write directly to avoid losing the event
            logger.warning(f"[UsageTracker] Queue push failed, writing directly: {e}")
            await self._write_to_db(event)

    async def record_direct(self, event: UsageEvent) -> None:
        """Synchronous write — use when you need guaranteed delivery before returning."""
        await self._write_to_db(event)

    async def start_worker(self) -> None:
        """
        Background worker with batch processing and backpressure.

        Each iteration:
          1. BLPOP up to BATCH_SIZE items from the queue in one round-trip
             (LMPOP when available, fallback to sequential RPOP)
          2. Write each item to DB; on failure: retry or DLQ
          3. If queue was empty: sleep SLEEP_IF_EMPTY to avoid busy-loop

        Throughput is bounded by BATCH_SIZE × DB write latency.
        BATCH_SIZE and SLEEP_IF_EMPTY are tunable via env vars.
        """
        import asyncio
        logger.info(
            f"[UsageTracker] Worker started "
            f"(batch_size={BATCH_SIZE}, sleep_empty={SLEEP_IF_EMPTY}s)"
        )
        r = _get_redis()
        while True:
            try:
                # ── Drain up to BATCH_SIZE items from the queue ───────────────
                batch: list[str] = []

                # First item: blocking pop with 5s timeout (avoids busy-loop
                # when queue is empty for long periods)
                first = await r.brpop(USAGE_QUEUE_KEY, timeout=5)
                if first is None:
                    # Queue was empty for 5s — yield to event loop and retry
                    await asyncio.sleep(SLEEP_IF_EMPTY)
                    continue

                _, first_payload = first
                batch.append(first_payload)

                # Non-blocking drain of remaining items up to BATCH_SIZE - 1
                for _ in range(BATCH_SIZE - 1):
                    item = await r.rpop(USAGE_QUEUE_KEY)
                    if item is None:
                        break
                    batch.append(item)

                # ── Process batch ─────────────────────────────────────────────
                for payload_str in batch:
                    try:
                        payload = json.loads(payload_str)
                        attempts = payload.pop("_attempts", 0)

                        try:
                            event = UsageEvent.from_dict(payload)
                            await self._write_to_db(event)
                        except Exception as write_err:
                            attempts += 1
                            if attempts >= MAX_RETRIES:
                                logger.error(
                                    f"[UsageTracker] DLQ after {attempts} attempts: "
                                    f"event={payload.get('event_id', '?')} err={write_err}"
                                )
                                await self._send_to_dlq(r, payload, str(write_err))
                            else:
                                payload["_attempts"] = attempts
                                await r.lpush(USAGE_QUEUE_KEY, json.dumps(payload))
                                logger.warning(
                                    f"[UsageTracker] Retry {attempts}/{MAX_RETRIES} "
                                    f"event={payload.get('event_id', '?')}"
                                )
                    except Exception as item_err:
                        logger.error(f"[UsageTracker] Malformed payload: {item_err}")

                # ── Backpressure: if batch was smaller than max, queue is draining
                if len(batch) < BATCH_SIZE:
                    await asyncio.sleep(SLEEP_IF_EMPTY)

            except Exception as e:
                logger.error(f"[UsageTracker] Worker loop error: {e}")
                await asyncio.sleep(1)  # brief pause before retrying on unexpected errors

    # ── Summary query ─────────────────────────────────────────────────────────

    async def get_tenant_usage_summary(
        self, tenant_id: str, month: Optional[str] = None
    ) -> dict:
        """Aggregated usage for a tenant. month = 'YYYY-MM', defaults to current."""
        target_month = month or date.today().strftime("%Y-%m")
        try:
            conn = psycopg2.connect(_get_db_dsn())
            cur = conn.cursor()
            cur.execute("""
                SELECT
                    COUNT(*)                     AS executions,
                    COALESCE(SUM(tokens_in),  0) AS tokens_in,
                    COALESCE(SUM(tokens_out), 0) AS tokens_out,
                    COALESCE(SUM(tokens_in + tokens_out), 0) AS tokens_total,
                    COALESCE(SUM(cost_usd),  0.0) AS cost_usd,
                    model
                FROM usage_events
                WHERE tenant_id = %s
                  AND TO_CHAR(created_at, 'YYYY-MM') = %s
                GROUP BY model
                ORDER BY tokens_total DESC
            """, (tenant_id, target_month))
            rows = cur.fetchall()
            conn.close()

            by_model = [
                {
                    "model": r[5],
                    "executions": r[0],
                    "tokens_in": r[1],
                    "tokens_out": r[2],
                    "tokens_total": r[3],
                    "cost_usd": float(r[4]),
                }
                for r in rows
            ]
            return {
                "tenant_id": tenant_id,
                "month": target_month,
                "executions": sum(x["executions"] for x in by_model),
                "tokens_in": sum(x["tokens_in"] for x in by_model),
                "tokens_out": sum(x["tokens_out"] for x in by_model),
                "tokens_total": sum(x["tokens_total"] for x in by_model),
                "cost_usd": round(sum(x["cost_usd"] for x in by_model), 6),
                "by_model": by_model,
            }
        except Exception as e:
            logger.error(f"[UsageTracker] summary query failed: {e}")
            return {"tenant_id": tenant_id, "month": target_month, "error": str(e)}

    # ── Internal ──────────────────────────────────────────────────────────────

    async def _write_to_db(self, event: UsageEvent) -> None:
        """
        Insert into usage_events.
        ON CONFLICT (event_id) DO NOTHING → idempotent.
        """
        try:
            conn = psycopg2.connect(_get_db_dsn())
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO usage_events (
                    tenant_id, agent_type, model,
                    tokens_in, tokens_out,
                    cost_usd, duration_ms,
                    session_id, trace_id, finish_reason,
                    event_id
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (event_id) DO NOTHING
            """, (
                event.tenant_id,
                event.agent_type,
                event.model,
                event.tokens_in,
                event.tokens_out,
                event.cost_usd,
                event.duration_ms,
                event.session_id,
                event.trace_id,
                event.finish_reason,
                event.event_id,
            ))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"[UsageTracker] DB write failed for event={event.event_id[:12]}…: {e}")
            raise  # Let worker handle retry

    async def _send_to_dlq(self, r: aioredis.Redis, payload: dict, error: str) -> None:
        """Move failed event to Redis DLQ + PostgreSQL dlq table."""
        try:
            await r.lpush(USAGE_DLQ_KEY, json.dumps({**payload, "_error": error}))
        except Exception:
            pass
        try:
            conn = psycopg2.connect(_get_db_dsn())
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO usage_queue_dlq (payload, error, attempts, last_attempt_at)
                VALUES (%s::jsonb, %s, %s, NOW())
            """, (json.dumps(payload), error, MAX_RETRIES))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"[UsageTracker] DLQ write also failed: {e}")


# ── Singleton ─────────────────────────────────────────────────────────────────
usage_tracker = UsageTracker()
