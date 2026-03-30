"""
app/models.py - Modelos Pydantic para Agent Service
"""
from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
import uuid


class TraceStepType(str, Enum):
    """Tipos de pasos en trace"""
    EMBEDDING = "embedding"
    RAG_SEARCH = "rag_search"
    LLM_CALL = "llm_call"
    AGENT_DECISION = "agent_decision"

class AgentRequest(BaseModel):
    """Request para ejecutar agent"""
    query: str = Field(..., description="Pregunta del usuario")
    tenant_id: str = Field(..., description="ID del tenant")
    user_id: Optional[str] = Field(None, description="ID del usuario (opcional)")
    conversation_id: Optional[str] = Field(None, description="ID de conversación")
    max_iterations: int = Field(default=5, ge=1, le=10)
    enable_detailed_trace: bool = Field(default=False, description="Habilitar trazas detalladas")

class RagResult(BaseModel):
    """Resultado de búsqueda RAG"""
    id: int
    score: float
    text: str
    category: Optional[str] = None
    entity: Optional[str] = None
    source: Optional[str] = None


class AgentDecision(BaseModel):
    """Decisión del agente"""
    thought: str = Field(default="", description="Razonamiento")
    action: str = Field(default="none", description="Acción a ejecutar")
    action_input: Optional[Dict[str, Any]] = Field(default=None)
    is_finished: bool = Field(default=False)
    answer: Optional[str] = Field(default=None)


class TraceStep(BaseModel):
    """Un paso en la traza de ejecución"""
    step_type: TraceStepType
    step_number: int
    duration_ms: int
    input_data: Optional[Dict[str, Any]] = None
    output_data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class AgentResponse(BaseModel):
    """Response de ejecución agent"""
    trace_id: str
    tenant_id: str
    query: str
    iterations: int
    result: List[Dict[str, str]]  # Lista de {role, content}
    metadata: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ErrorResponse(BaseModel):
    """Response de error"""
    error: str
    error_code: str
    details: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


def create_tracing_context() -> Dict[str, Any]:
    """Crear contexto de trazabilidad"""
    return {
        "trace_id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow().isoformat(),
        "steps": []
    }
