import asyncio

async def test_basic_flow():
    # Placeholder test to ensure the engine imports and can run a tiny loop
    from backend.app.engine.langgraph_engine import LangGraphEngine
    eng = LangGraphEngine(tenant_id='tenant_test')
    res, meta = await eng.run('test task')
    assert isinstance(res, list)
    assert 'iterations' in meta
