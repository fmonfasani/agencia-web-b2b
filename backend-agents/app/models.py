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
    query: str = Field(..., description="Pregunta del usuario", min_length=3, max_length=2000)
    tenant_id: str = Field(..., description="ID del tenant (empresa)", min_length=3)
    user_id: Optional[str] = Field(None, description="ID del usuario (opcional)")
    conversation_id: Optional[str] = Field(None, description="ID de conversación")
    trace_id: Optional[str] = Field(None, description="ID de tracing externo")
    enable_detailed_trace: bool = Field(default=False, description="Habilitar trazas detalladas paso a paso")
    max_iterations: Optional[int] = Field(default=5, ge=1, le=10, description="Máximo de iteraciones del agente")
    temperature: Optional[float] = Field(default=0.7, ge=0.0, le=2.0, description="Temperatura del LLM")
    # Agent Lab overrides — permiten comparar modelos/providers por request
    llm_provider: Optional[str] = Field(None, description="Override de provider: 'ollama' | 'openrouter'")
    model: Optional[str] = Field(None, description="Override de modelo: 'gemma3:latest', 'qwen2.5:3b', 'openai/gpt-4o-mini'...")
    # Agent instance — usa config de template + instancia
    agent_instance_id: Optional[str] = Field(None, description="ID de instancia de agente (agent_instances.id)")

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
    trace_id: str = Field(description="ID único del request para tracing")
    tenant_id: str = Field(description="Tenant que hizo el request")
    query: str = Field(description="Query original del usuario")
    session_id: Optional[str] = Field(None, description="ID de sesión para mantener historial de conversación")
    iterations: int = Field(default=0, description="Número de iteraciones del agente")
    result: List[Dict[str, str]] = Field(description="Resultado del agente (lista de mensajes)")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Metadata de ejecución (modelo, tiempo, etc.)")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Timestamp de finalización")
    total_duration_ms: Optional[int] = Field(None, description="Duración total en milisegundos")
    timestamp_start: Optional[datetime] = Field(None, description="Timestamp de inicio")
    x_process_time: Optional[str] = Field(None, description="Header X-Process-Time")


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
