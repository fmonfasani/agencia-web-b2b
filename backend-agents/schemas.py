from pydantic import BaseModel
from typing import Optional

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[Message]
    session_id: str
    metadata: Optional[dict] = {}

class CreateAgentRequest(BaseModel):
    name: str
    system_prompt: str
    description: Optional[str] = None
    tenant_id: Optional[str] = None

class CreateKeyRequest(BaseModel):
    agent_id: str
    label: str
