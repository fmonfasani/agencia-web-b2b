import asyncio
import pytest
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

@pytest.mark.asyncio
async def test_basic_flow():
    # Placeholder test to ensure the engine imports and can run a tiny loop
    from app.engine.langgraph_engine import LangGraphEngine
    eng = LangGraphEngine(tenant_id='tenant_test')
    res, meta = await eng.run('test task')
    assert isinstance(res, list)
    assert 'iterations' in meta
