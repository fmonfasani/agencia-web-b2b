from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Any, Dict
from engine.langgraph_engine import LangGraphEngine

app = FastAPI(title="webshooks-agent-backend")

class ExecuteRequest(BaseModel):
    task: str
    tenant_id: str

@app.post("/agent/execute")
async def execute(req: ExecuteRequest):
    if not req.task or not req.tenant_id:
        raise HTTPException(status_code=400, detail="Missing task or tenant_id")
    engine = LangGraphEngine(tenant_id=req.tenant_id)
    result, metadata = await engine.run(req.task)
    return {"result": result, "metadata": metadata}
