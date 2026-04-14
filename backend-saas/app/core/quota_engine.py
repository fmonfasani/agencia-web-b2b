"""
core/quota_engine.py — Atomic Quota Engine (v2)

BEFORE (broken):
    await quota.check()          # gap here ← race condition
    # ... execution ...
    await quota.commit_usage()

AFTER (atomic):
    reservation = await quota.check_and_reserve(tenant_id, tokens=500)
    try:
        result = await execute(...)
        await quota.commit(reservation, actual_tokens=result.tokens)
    except:
        await quota.rollback(reservation)
        raise

Pipeline:
    check_and_reserve()  →  [execution]  →  commit()
                                ↓ on failure
                           rollback()

Redis Lua script guarantees atomicity: check + reserve in one transaction.
PostgreSQL is source of truth for limits; Redis is real-time counter.
"""
import asyncio
import os
import secrets
import logging
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import date
from typing import Optional

import psycopg2
import redis.asyncio as aioredis

from app.core.circuit_breaker import IS_PRODUCTION, safe_redis, TIMEOUTS

logger = logging.getLogger(__name__)

# ── Lua script: atomic check + reserve ───────────────────────────────────────
#
# KEYS: [tokens_key, exec_day_key, exec_month_key]
# ARGV: [tokens_limit, daily_limit, monthly_limit, tokens_to_reserve,
#        ttl_day, ttl_month]
#
# Returns: [status, reason, counter_value, limit_value]
#   status 1 = ok (reserved), 0 = rejected
#
_LUA_CHECK_AND_RESERVE = """
local tokens_key    = KEYS[1]
local exec_day_key  = KEYS[2]
local exec_month_key = KEYS[3]

local tokens_limit   = tonumber(ARGV[1])
local daily_limit    = tonumber(ARGV[2])
local monthly_limit  = tonumber(ARGV[3])
local tokens_reserve = tonumber(ARGV[4])
local ttl_day        = tonumber(ARGV[5])
local ttl_month      = tonumber(ARGV[6])

local tokens_used  = tonumber(redis.call('GET', tokens_key) or 0)
local exec_day     = tonumber(redis.call('GET', exec_day_key) or 0)
local exec_month   = tonumber(redis.call('GET', exec_month_key) or 0)

-- Check daily execution limit
if daily_limit ~= -1 and exec_day >= daily_limit then
    return {0, 'daily_limit_exceeded', exec_day, daily_limit}
end

-- Check monthly execution limit
if monthly_limit ~= -1 and exec_month >= monthly_limit then
    return {0, 'monthly_limit_exceeded', exec_month, monthly_limit}
end

-- Check token limit (with reservation headroom)
if tokens_limit ~= -1 and (tokens_used + tokens_reserve) > tokens_limit then
    return {0, 'token_limit_exceeded', tokens_used, tokens_limit}
end

-- All checks passed — atomically reserve
redis.call('INCRBY', tokens_key, tokens_reserve)
if redis.call('TTL', tokens_key) == -1 then
    redis.call('EXPIRE', tokens_key, ttl_month)
end

redis.call('INCR', exec_day_key)
if redis.call('TTL', exec_day_key) == -1 then
    redis.call('EXPIRE', exec_day_key, ttl_day)
end

redis.call('INCR', exec_month_key)
if redis.call('TTL', exec_month_key) == -1 then
    redis.call('EXPIRE', exec_month_key, ttl_month)
end

return {1, 'ok', tokens_used + tokens_reserve, tokens_limit}
"""

# Lua script: rollback a reservation (undo the increment)
_LUA_ROLLBACK = """
local tokens_key     = KEYS[1]
local exec_day_key   = KEYS[2]
local exec_month_key = KEYS[3]
local tokens_reserved = tonumber(ARGV[1])

if tonumber(redis.call('GET', tokens_key) or 0) > 0 then
    redis.call('DECRBY', tokens_key, tokens_reserved)
end
if tonumber(redis.call('GET', exec_day_key) or 0) > 0 then
    redis.call('DECR', exec_day_key)
end
if tonumber(redis.call('GET', exec_month_key) or 0) > 0 then
    redis.call('DECR', exec_month_key)
end
return 1
"""

# ── Redis singleton ───────────────────────────────────────────────────────────

_redis_client: Optional[aioredis.Redis] = None


def _get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
        _redis_client = aioredis.from_url(url, decode_responses=True)
    return _redis_client


def _get_db_dsn() -> str:
    return os.environ.get("DATABASE_URL", "")


# ── Data classes ──────────────────────────────────────────────────────────────

@dataclass
class QuotaLimits:
    tokens_limit: int       # -1 = unlimited
    daily_limit: int        # -1 = unlimited
    monthly_limit: int      # -1 = unlimited
    is_suspended: bool = False
    plan_id: str = "starter"


@dataclass
class QuotaState:
    tenant_id: str
    plan_id: str
    tokens_limit: int
    tokens_used: int
    executions_limit: int
    executions_used_month: int
    executions_used_today: int
    daily_limit: int
    is_suspended: bool

    @property
    def tokens_remaining(self) -> int:
        if self.tokens_limit == -1:
            return 999_999_999
        return max(0, self.tokens_limit - self.tokens_used)

    @property
    def can_execute(self) -> bool:
        if self.is_suspended:
            return False
        if self.daily_limit != -1 and self.executions_used_today >= self.daily_limit:
            return False
        if self.executions_limit != -1 and self.executions_used_month >= self.executions_limit:
            return False
        return True


@dataclass
class QuotaReservation:
    """
    Represents an atomic reservation of quota.

    Created by check_and_reserve(). Must be either committed or rolled back.
    Never leave a reservation pending — use the execution() context manager.
    """
    id: str
    tenant_id: str
    tokens_reserved: int
    status: str = "pending"   # pending | committed | rolled_back

    @property
    def is_pending(self) -> bool:
        return self.status == "pending"


class QuotaExceeded(Exception):
    """Raised when a quota limit is reached during check_and_reserve()."""
    def __init__(self, reason: str, counter: int = 0, limit: int = 0):
        self.reason = reason
        self.counter = counter
        self.limit = limit
        super().__init__(reason)


# ── Quota Engine ──────────────────────────────────────────────────────────────

class QuotaEngine:
    """
    Atomic quota enforcement using Redis Lua scripts.

    Guarantees:
    - No race conditions: check + reserve is a single Redis transaction (Lua)
    - Rollback support: reservation can be undone if execution fails
    - PostgreSQL fallback: limits loaded from DB, counters in Redis
    - Audit trail: reservations tracked in quota_reservations table
    """

    DAILY_TTL   = 86_400
    MONTHLY_TTL = 32 * 86_400

    # Pre-loaded Lua script SHAs (populated on first use)
    _reserve_sha: Optional[str] = None
    _rollback_sha: Optional[str] = None

    # ── Redis key builders ────────────────────────────────────────────────────

    @staticmethod
    def _key_tokens(tenant_id: str) -> str:
        m = date.today().strftime("%Y-%m")
        return f"quota:tokens:{tenant_id}:{m}"

    @staticmethod
    def _key_exec_day(tenant_id: str) -> str:
        d = date.today().isoformat()
        return f"quota:exec:day:{tenant_id}:{d}"

    @staticmethod
    def _key_exec_month(tenant_id: str) -> str:
        m = date.today().strftime("%Y-%m")
        return f"quota:exec:month:{tenant_id}:{m}"

    # ── Script loading ────────────────────────────────────────────────────────

    async def _load_scripts(self, r: aioredis.Redis) -> None:
        """SCRIPT LOAD once per connection; use EVALSHA after."""
        if self._reserve_sha is None:
            QuotaEngine._reserve_sha = await r.script_load(_LUA_CHECK_AND_RESERVE)
        if self._rollback_sha is None:
            QuotaEngine._rollback_sha = await r.script_load(_LUA_ROLLBACK)

    # ── Limits from DB ────────────────────────────────────────────────────────

    def _load_limits(self, tenant_id: str) -> QuotaLimits:
        """
        Load quota limits from PostgreSQL, auto-provision if missing.

        Fail behaviour:
          production  → re-raise (HTTP 503 is raised by caller)
          dev/staging → fail-open with unlimited defaults
        """
        try:
            conn = psycopg2.connect(_get_db_dsn())
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO tenant_quotas (tenant_id, plan_id)
                VALUES (%s, 'starter')
                ON CONFLICT (tenant_id) DO NOTHING
            """, (tenant_id,))
            cur.execute("""
                SELECT
                    tq.plan_id,
                    COALESCE(tq.custom_tokens_limit,      qp.tokens_per_month)      AS tokens_limit,
                    COALESCE(tq.custom_executions_limit,  qp.executions_per_month)  AS exec_limit,
                    qp.executions_per_day                                            AS daily_limit,
                    tq.is_suspended
                FROM tenant_quotas tq
                JOIN quota_plans qp ON qp.plan_id = tq.plan_id
                WHERE tq.tenant_id = %s
            """, (tenant_id,))
            row = cur.fetchone()
            conn.commit()
            conn.close()
            if not row:
                return QuotaLimits(tokens_limit=500_000, daily_limit=100, monthly_limit=1_000)
            plan_id, tokens_limit, exec_limit, daily_limit, suspended = row
            return QuotaLimits(
                plan_id=plan_id,
                tokens_limit=tokens_limit,
                daily_limit=daily_limit,
                monthly_limit=exec_limit,
                is_suspended=bool(suspended),
            )
        except Exception as e:
            logger.error(f"[QuotaEngine] DB load limits failed for tenant={tenant_id}: {e}")
            if IS_PRODUCTION:
                raise  # Caller converts to HTTP 503
            return QuotaLimits(tokens_limit=-1, daily_limit=-1, monthly_limit=-1)

    def _persist_reservation(self, res: "QuotaReservation") -> None:
        """INSERT reservation into quota_reservations (best-effort, non-blocking)."""
        try:
            conn = psycopg2.connect(_get_db_dsn())
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO quota_reservations (id, tenant_id, tokens_reserved, status)
                VALUES (%s, %s, %s, 'pending')
                ON CONFLICT (id) DO NOTHING
            """, (res.id, res.tenant_id, res.tokens_reserved))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"[QuotaEngine] _persist_reservation failed res={res.id}: {e}")

    def _update_reservation(self, res: "QuotaReservation", actual_tokens: Optional[int] = None) -> None:
        """UPDATE reservation status to committed or rolled_back."""
        try:
            conn = psycopg2.connect(_get_db_dsn())
            cur = conn.cursor()
            if res.status == "committed":
                cur.execute("""
                    UPDATE quota_reservations
                    SET status = 'committed', committed_at = NOW(), actual_tokens = %s
                    WHERE id = %s
                """, (actual_tokens, res.id))
            else:
                cur.execute("""
                    UPDATE quota_reservations
                    SET status = 'rolled_back'
                    WHERE id = %s
                """, (res.id,))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"[QuotaEngine] _update_reservation failed res={res.id}: {e}")

    # ── Core API ──────────────────────────────────────────────────────────────

    async def check_and_reserve(
        self,
        tenant_id: str,
        tokens: int = 500,
    ) -> QuotaReservation:
        """
        Atomically check quota and reserve capacity.

        Uses a Redis Lua script — check + increment is a single transaction.
        Persists reservation to quota_reservations for audit + reconciliation.

        Fail behaviour (Redis unavailable):
          production  → HTTP 503 (fail-closed)
          dev/staging → allow request, log warning (fail-open)

        Raises QuotaExceeded if any limit is breached.
        """
        limits = self._load_limits(tenant_id)

        if limits.is_suspended:
            raise QuotaExceeded("tenant_suspended", 0, 0)

        async def _run_lua():
            r = _get_redis()
            await self._load_scripts(r)
            return await r.evalsha(
                self._reserve_sha,
                3,
                self._key_tokens(tenant_id),
                self._key_exec_day(tenant_id),
                self._key_exec_month(tenant_id),
                str(limits.tokens_limit),
                str(limits.daily_limit),
                str(limits.monthly_limit),
                str(tokens),
                str(self.DAILY_TTL),
                str(self.MONTHLY_TTL),
            )

        lua_result = await safe_redis(
            _run_lua,
            fallback=None,
            timeout=TIMEOUTS.REDIS,
        )

        if lua_result is not None:
            status, reason, counter, limit = (
                int(lua_result[0]), lua_result[1],
                int(lua_result[2]), int(lua_result[3]),
            )
            if status == 0:
                raise QuotaExceeded(reason, counter, limit)
        else:
            # safe_redis returned None → Redis was unavailable
            # IS_PRODUCTION path already raised 503 inside safe_redis;
            # reaching here means dev/staging fail-open.
            logger.warning(
                f"[QuotaEngine] Redis unavailable — allowing request (dev mode) "
                f"tenant={tenant_id}"
            )

        reservation = QuotaReservation(
            id=f"res_{secrets.token_hex(8)}",
            tenant_id=tenant_id,
            tokens_reserved=tokens,
        )
        # Persist to DB for audit trail + reconciliation (best-effort)
        await asyncio.get_event_loop().run_in_executor(
            None, self._persist_reservation, reservation
        )
        return reservation

    async def commit(self, reservation: QuotaReservation, actual_tokens: int) -> None:
        """
        Finalize a reservation with the actual token count.

        If actual < reserved: refunds the difference atomically.
        If actual > reserved: charges the overage.
        Updates quota_reservations to status='committed'.
        """
        if reservation.status != "pending":
            logger.warning(f"[QuotaEngine] commit called on non-pending res={reservation.id}")
            return

        delta = actual_tokens - reservation.tokens_reserved
        if delta != 0:
            key = self._key_tokens(reservation.tenant_id)

            async def _adjust():
                r = _get_redis()
                if delta > 0:
                    return await r.incrby(key, delta)
                else:
                    return await r.decrby(key, abs(delta))

            await safe_redis(_adjust, fallback=None, timeout=TIMEOUTS.REDIS)

        reservation.status = "committed"
        await asyncio.get_event_loop().run_in_executor(
            None, self._update_reservation, reservation, actual_tokens
        )

    async def rollback(self, reservation: QuotaReservation) -> None:
        """
        Undo a reservation (execution failed before producing usage).
        Decrements the counters atomically via Lua script.
        Updates quota_reservations to status='rolled_back'.
        """
        if reservation.status != "pending":
            return

        async def _run_rollback():
            r = _get_redis()
            await self._load_scripts(r)
            return await r.evalsha(
                self._rollback_sha,
                3,
                self._key_tokens(reservation.tenant_id),
                self._key_exec_day(reservation.tenant_id),
                self._key_exec_month(reservation.tenant_id),
                str(reservation.tokens_reserved),
            )

        await safe_redis(_run_rollback, fallback=None, timeout=TIMEOUTS.REDIS)

        reservation.status = "rolled_back"
        await asyncio.get_event_loop().run_in_executor(
            None, self._update_reservation, reservation, None
        )

    async def get_state(self, tenant_id: str) -> QuotaState:
        """Read current quota state (limits from DB, counters from Redis)."""
        limits = self._load_limits(tenant_id)
        tokens_used, exec_day, exec_month = 0, 0, 0

        try:
            r = _get_redis()
            rv = await r.get(self._key_tokens(tenant_id))
            rd = await r.get(self._key_exec_day(tenant_id))
            rm = await r.get(self._key_exec_month(tenant_id))
            if rv: tokens_used = int(rv)
            if rd: exec_day    = int(rd)
            if rm: exec_month  = int(rm)
        except Exception as e:
            logger.warning(f"[QuotaEngine] Redis read failed, counters may be stale: {e}")

        return QuotaState(
            tenant_id=tenant_id,
            plan_id=limits.plan_id,
            tokens_limit=limits.tokens_limit,
            tokens_used=tokens_used,
            executions_limit=limits.monthly_limit,
            executions_used_month=exec_month,
            executions_used_today=exec_day,
            daily_limit=limits.daily_limit,
            is_suspended=limits.is_suspended,
        )

    async def sync_to_db(self, tenant_id: str) -> None:
        """Sync Redis counters → PostgreSQL (call from background task or cron)."""
        try:
            r = _get_redis()
            tokens  = int(await r.get(self._key_tokens(tenant_id)) or 0)
            ex_day  = int(await r.get(self._key_exec_day(tenant_id)) or 0)
            ex_mon  = int(await r.get(self._key_exec_month(tenant_id)) or 0)

            conn = psycopg2.connect(_get_db_dsn())
            cur = conn.cursor()
            cur.execute("""
                UPDATE tenant_quotas SET
                    tokens_used_month      = %s,
                    executions_used_month  = %s,
                    executions_used_today  = %s,
                    today_date             = CURRENT_DATE,
                    updated_at             = NOW()
                WHERE tenant_id = %s
            """, (tokens, ex_mon, ex_day, tenant_id))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"[QuotaEngine] sync_to_db failed for tenant={tenant_id}: {e}")

    # ── Context manager ───────────────────────────────────────────────────────

    @asynccontextmanager
    async def execution(self, tenant_id: str, estimated_tokens: int = 500):
        """
        Async context manager for a quota-guarded execution.

        Guarantees: reservation is ALWAYS committed or rolled back.

        Usage:
            async with quota_engine.execution(tenant_id, 500) as res:
                result = await run_agent(...)
                await res.finalize(result.tokens_used)
        """
        reservation = await self.check_and_reserve(tenant_id, estimated_tokens)

        class _Ctx:
            def __init__(self, engine: "QuotaEngine", r: QuotaReservation):
                self._engine = engine
                self._reservation = r
                self._actual_tokens: Optional[int] = None

            def finalize(self, actual_tokens: int) -> None:
                """Call with real token count before exiting the context."""
                self._actual_tokens = actual_tokens

        ctx = _Ctx(self, reservation)
        try:
            yield ctx
            actual = ctx._actual_tokens if ctx._actual_tokens is not None else estimated_tokens
            await self.commit(reservation, actual)
        except Exception:
            await self.rollback(reservation)
            raise


# ── Singleton ─────────────────────────────────────────────────────────────────
quota_engine = QuotaEngine()
