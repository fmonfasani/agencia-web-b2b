from fastapi import APIRouter, Depends, Request, HTTPException
from models.schemas import ChatRequest
from core.auth import get_agent_from_key
from core.database import get_or_create_conversation, append_message
from core.rate_limit import limiter
from llm import llm

router = APIRouter(prefix="/api", tags=["chat"])

@router.post("/agents/{agent_id}/chat")
@limiter.limit("20/minute")
async def chat(request: Request, agent_id: str, body: ChatRequest, agent: dict = Depends(get_agent_from_key)):
    if str(agent["agent_id"]) != agent_id:
        raise HTTPException(status_code=403, detail="Key does not match agent")

    conversation = get_or_create_conversation(agent_id, body.session_id, body.metadata or {})
    history = conversation["messages"] if isinstance(conversation["messages"], list) else []
    new_messages = [m.model_dump() for m in body.messages]
    full_messages = history[-20:] + new_messages  # últimos 20 mensajes de contexto

    response_text = await llm.complete(system_prompt=agent["system_prompt"], messages=full_messages)

    for msg in new_messages:
        append_message(conversation["id"], msg["role"], msg["content"])
    append_message(conversation["id"], "assistant", response_text)

    return {"response": response_text, "session_id": body.session_id}
