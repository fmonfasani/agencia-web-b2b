from app.core.redis import redis_client


class UsageService:
    QUOTA_LIMIT = 100000

    @classmethod
    def check_and_consume_quota(cls, tenant_id: str, tokens: int) -> bool:
        key = f"quota:{tenant_id}"
        current = int(redis_client.get(key) or 0)

        if current + tokens > cls.QUOTA_LIMIT:
            return False

        redis_client.incrby(key, tokens)
        return True
