import asyncio
import sys
from pathlib import Path

import pytest
from fastapi import HTTPException

sys.path.append(str(Path(__file__).resolve().parents[1]))

from core.auth import require_admin
from core.config import settings
from routers import schedules


class DummyCursor:
    def execute(self, *_args, **_kwargs):
        return None

    def fetchone(self):
        return {"id": "schedule-1"}

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


class DummyConn:
    def cursor(self):
        return DummyCursor()

    def commit(self):
        return None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


def _fake_get_conn():
    return DummyConn()


def setup_module(_module):
    settings.admin_secret = "test-admin-secret"
    schedules.get_conn = _fake_get_conn
    schedules.scraper_scheduler.add_job_to_scheduler = lambda _sched: None


def test_post_without_credentials_returns_403():
    with pytest.raises(HTTPException) as exc:
        require_admin(x_admin_secret="")
    assert exc.value.status_code == 403


def test_post_with_admin_secret_returns_201():
    require_admin(x_admin_secret="test-admin-secret")

    route = next(r for r in schedules.router.routes if getattr(r, "path", "") == "/schedules/")
    assert route.status_code == 201

    payload = schedules.ScheduleCreate(
        tenant_id="tenant-1",
        query="personal trainer",
        location="Buenos Aires",
        frequency_minutes=30,
    )
    result = asyncio.run(schedules.create_schedule(payload))
    assert result["id"] == "schedule-1"
