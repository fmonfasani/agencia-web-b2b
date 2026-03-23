"""
Sample FastAPI agent instrumented with finobs @traced decorator.
Run: uvicorn examples.sample_agent.main:app --reload --port 8001
"""
import uuid
import random
from fastapi import FastAPI
from pydantic import BaseModel

from finobs import traced, flush_trace
from finobs.scripts.trace_interceptor import set_run_id

app = FastAPI(title="Sample LLM Agent")


class TaskRequest(BaseModel):
    task: str
    tenant: str = "default"


class TaskResponse(BaseModel):
    run_id: str
    result: str
    trace_path: str


@traced("search_documents")
def search_documents(query: str) -> str:
    # Simulate RAG retrieval
    import time; time.sleep(random.uniform(0.1, 0.5))
    return f"Found 3 documents relevant to: {query}"


@traced("llm_call")
def llm_call(prompt: str) -> str:
    # Simulate LLM call latency
    import time; time.sleep(random.uniform(0.3, 1.2))
    return f"LLM response for: {prompt[:50]}"


@traced("validate_output")
def validate_output(output: str) -> str:
    import time; time.sleep(0.05)
    if random.random() < 0.1:
        raise ValueError("Validation failed")
    return "valid"


@traced("write_file")
def write_file(content: str) -> str:
    import time; time.sleep(0.05)
    return f"Written {len(content)} chars"


@app.post("/invoke", response_model=TaskResponse)
async def invoke(request: TaskRequest):
    run_id = str(uuid.uuid4())[:8]
    set_run_id(run_id)

    # Simulate agent execution
    docs = search_documents(request.task)
    response = llm_call(f"Given: {docs}. Task: {request.task}")
    search_documents(request.task)   # Intentional loop for demo
    llm_call(f"Refine: {response}")
    search_documents(request.task)   # Loop again
    try:
        validate_output(response)
    except ValueError:
        pass  # captured in trace as error
    write_file(response)

    trace_path = flush_trace(run_id=run_id, tenant=request.tenant)

    return TaskResponse(
        run_id=run_id,
        result=response,
        trace_path=trace_path,
    )


@app.get("/health")
def health():
    return {"status": "ok"}
