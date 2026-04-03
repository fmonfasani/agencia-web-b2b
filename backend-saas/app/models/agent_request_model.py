"""
Modelos de Request/Response con trazabilidad completa
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

# ============================================================================
# REQUEST MODELS
# ============================================================================

class AgentRequest(BaseModel):
    """Request para ejecutar el agente con trazabilidad"""
    
    # REQUIRED
    tenant_id: str = Field(
        ...,
        description="ID del tenant (empresa) para multitenancy",
        examples=["tenant_acme", "tenant_globant"],
        min_length=3
    )
    
    query: str = Field(
        ..., 
        description="Consulta del usuario final",
        examples=[
            "Buscar empresas de software en Argentina con +50 empleados",
            "¿Cuáles son los leads más calificados del último mes?",
            "Analizar pipeline de ventas del Q1 2026"
        ],
        min_length=3,
        max_length=2000  # Prevenir abuse
    )
    
    # OPTIONAL - Para debugging/testing
    trace_id: Optional[str] = Field(
        None,
        description="ID de tracing externo (si viene de frontend/logging system)",
        examples=["req_abc123", "trace-2026-03-22-12345"]
    )
    
    enable_detailed_trace: bool = Field(
        default=False,
        description="Si es True, retorna trazabilidad completa paso a paso"
    )
    
    # OPTIONAL - Configuración avanzada
    max_iterations: Optional[int] = Field(
        default=5,
        ge=1,
        le=10,
        description="Máximo de iteraciones del agente (default: 5)"
    )
    
    temperature: Optional[float] = Field(
        default=0.7,
        ge=0.0,
        le=2.0,
        description="Temperatura del LLM (default: 0.7)"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "tenant_id": "tenant_test",
                    "query": "Buscar empresas de fintech en LATAM",
                    "enable_detailed_trace": True
                }
            ]
        }
    )


# ============================================================================
# TRACE MODELS
# ============================================================================

class TraceStepType(str, Enum):
    """Tipos de pasos en el flujo"""
    REQUEST_RECEIVED = "request_received"
    VALIDATION = "validation"
    EMBEDDING_START = "embedding_start"
    EMBEDDING_COMPLETE = "embedding_complete"
    QDRANT_SEARCH = "qdrant_search"
    RAG_CONTEXT_BUILD = "rag_context_build"
    LLM_CALL_START = "llm_call_start"
    LLM_CALL_COMPLETE = "llm_call_complete"
    AGENT_ITERATION = "agent_iteration"
    TOOL_EXECUTION = "tool_execution"
    RESPONSE_COMPLETE = "response_complete"
    ERROR = "error"


class TraceStep(BaseModel):
    """Paso individual en la trazabilidad"""
    
    step_id: str = Field(
        description="ID único del paso (ej: embedding_1, llm_call_2)"
    )
    
    step_type: TraceStepType = Field(
        description="Tipo de paso en el flujo"
    )
    
    timestamp: datetime = Field(
        description="Timestamp UTC del paso"
    )
    
    duration_ms: Optional[int] = Field(
        None,
        description="Duración del paso en milisegundos"
    )
    
    input_data: Optional[Dict[str, Any]] = Field(
        None,
        description="Datos de entrada del paso (ej: query original, chunks)"
    )
    
    output_data: Optional[Dict[str, Any]] = Field(
        None,
        description="Datos de salida del paso (ej: embeddings, search results)"
    )
    
    metadata: Optional[Dict[str, Any]] = Field(
        None,
        description="Metadata adicional (ej: model used, tokens consumed)"
    )
    
    error: Optional[str] = Field(
        None,
        description="Error message si el paso falló"
    )


class EmbeddingTrace(BaseModel):
    """Trazabilidad específica de embeddings"""
    
    model_name: str = Field(description="Modelo usado (ej: BAAI/bge-small-en-v1.5)")
    input_text: str = Field(description="Texto original a embeddear")
    input_length_chars: int = Field(description="Longitud del texto en caracteres")
    vector_dimension: int = Field(description="Dimensión del vector resultante")
    duration_ms: int = Field(description="Tiempo de generación del embedding")
    vector_preview: List[float] = Field(
        description="Primeros 5 valores del vector (para debugging)"
    )


class QdrantSearchTrace(BaseModel):
    """Trazabilidad específica de búsqueda en Qdrant"""
    
    collection_name: str = Field(description="Colección de Qdrant consultada")
    query_vector_preview: List[float] = Field(description="Preview del vector de búsqueda")
    top_k: int = Field(description="Número de resultados solicitados")
    filter_applied: Optional[Dict[str, Any]] = Field(
        None,
        description="Filtros aplicados (ej: tenant_id)"
    )
    results_count: int = Field(description="Cantidad de resultados retornados")
    top_scores: List[float] = Field(description="Scores de los top 3 resultados")
    duration_ms: int = Field(description="Tiempo de búsqueda en Qdrant")
    
    # Chunks encontrados
    chunks_found: List[Dict[str, Any]] = Field(
        description="Chunks de texto encontrados con sus scores"
    )


class RAGContextTrace(BaseModel):
    """Trazabilidad del contexto RAG construido"""
    
    total_chunks: int = Field(description="Total de chunks recuperados")
    total_chars: int = Field(description="Total de caracteres en el contexto")
    context_preview: str = Field(
        description="Primeros 500 chars del contexto construido"
    )
    chunk_sources: List[str] = Field(
        description="IDs de los chunks usados (para rastrear origen)"
    )


class LLMCallTrace(BaseModel):
    """Trazabilidad de llamada al LLM"""
    
    model_name: str = Field(description="Modelo LLM usado (ej: qwen2.5:0.5b)")
    provider: str = Field(description="Provider (ollama, openai, anthropic)")
    prompt_length_chars: int = Field(description="Longitud del prompt en chars")
    prompt_preview: str = Field(description="Primeros 300 chars del prompt")
    temperature: float = Field(description="Temperatura usada")
    max_tokens: Optional[int] = Field(None, description="Max tokens configurado")
    
    # Response
    response_length_chars: int = Field(description="Longitud de la respuesta")
    response_preview: str = Field(description="Primeros 300 chars de la respuesta")
    
    # Métricas
    tokens_input: Optional[int] = Field(None, description="Tokens de entrada")
    tokens_output: Optional[int] = Field(None, description="Tokens de salida")
    duration_ms: int = Field(description="Tiempo de respuesta del LLM")
    
    # Metadata
    finish_reason: Optional[str] = Field(None, description="Razón de finalización")
    model_version: Optional[str] = Field(None, description="Versión exacta del modelo")


# ============================================================================
# RESPONSE MODEL
# ============================================================================

class AgentResponse(BaseModel):
    """Response completo con trazabilidad"""
    
    # Request context
    trace_id: str = Field(description="ID único del request para tracing")
    tenant_id: str = Field(description="Tenant que hizo el request")
    query: str = Field(description="Query original del usuario")

    # Convergence — exposed at top level for quick client consumption
    iterations: int = Field(
        default=0,
        description="Número real de iteraciones del agente en esta ejecución",
    )

    # Result
    result: List[Dict[str, str]] = Field(
        description="Resultado del agente (lista de mensajes)",
        examples=[[
            {"role": "assistant", "content": "Voy a buscar empresas de fintech..."},
            {"role": "tool", "content": "Encontré 5 empresas: ..."}
        ]]
    )
    
    # Metadata general
    metadata: Dict[str, Any] = Field(
        description="Metadata de ejecución (iterations, rag_queries, etc.)"
    )
    
    # Timing summary
    total_duration_ms: int = Field(description="Duración total del request")
    timestamp_start: datetime = Field(description="Inicio del request")
    timestamp_end: datetime = Field(description="Fin del request")
    
    # Trazabilidad detallada (solo si enable_detailed_trace=True)
    trace: Optional[List[TraceStep]] = Field(
        None,
        description="Trazabilidad completa paso a paso del flujo"
    )
    
    # Traces específicos (siempre presentes)
    embedding_trace: Optional[List[EmbeddingTrace]] = Field(
        None,
        description="Trazas de embeddings generados"
    )
    
    qdrant_trace: Optional[List[QdrantSearchTrace]] = Field(
        None,
        description="Trazas de búsquedas en Qdrant"
    )
    
    rag_context_trace: Optional[RAGContextTrace] = Field(
        None,
        description="Traza del contexto RAG construido"
    )
    
    llm_traces: Optional[List[LLMCallTrace]] = Field(
        None,
        description="Trazas de todas las llamadas al LLM"
    )
    
    # Headers útiles para logging
    x_process_time: Optional[str] = Field(
        None,
        description="Header X-Process-Time retornado"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "trace_id": "trace_abc123",
                    "tenant_id": "tenant_test",
                    "query": "Buscar empresas fintech LATAM",
                    "result": [
                        {"role": "assistant", "content": "Encontré 5 empresas..."}
                    ],
                    "metadata": {
                        "iterations": 2,
                        "rag_queries": 1
                    },
                    "total_duration_ms": 18500,
                    "embedding_trace": [
                        {
                            "model_name": "BAAI/bge-small-en-v1.5",
                            "input_text": "Buscar empresas fintech LATAM",
                            "vector_dimension": 384,
                            "duration_ms": 120
                        }
                    ]
                }
            ]
        }
    )


# ============================================================================
# ERROR RESPONSE
# ============================================================================

class ErrorResponse(BaseModel):
    """Response de error con contexto de tracing"""

    trace_id: str = Field(description="ID del request fallido")
    error_type: str = Field(description="Tipo de error")
    error_message: str = Field(description="Mensaje de error")
    timestamp: datetime = Field(description="Timestamp del error")

    # Contexto del error
    failed_at_step: Optional[str] = Field(
        None,
        description="En qué paso falló (ej: 'qdrant_search', 'llm_call')"
    )

    partial_trace: Optional[List[TraceStep]] = Field(
        None,
        description="Trazabilidad hasta el punto de falla"
    )

    debug_info: Optional[Dict[str, Any]] = Field(
        None,
        description="Info adicional para debugging"
    )


# ============================================================================
# AGENT CONFIG MODELS
# ============================================================================

class AgentSede(BaseModel):
    """Modelo de sede para respuesta de /agent/config"""
    nombre: str = Field(description="Nombre de la sede")
    direccion: Optional[str] = Field(None, description="Dirección completa")
    telefonos: Optional[List[str]] = Field(None, description="Lista de teléfonos de contacto")
    mail: Optional[str] = Field(None, description="Email de contacto")
    horario_semana: Optional[str] = Field(None, description="Horario de lunes a viernes")
    horario_sabado: Optional[str] = Field(None, description="Horario los sábados")
    coberturas_disponibles: Optional[str] = Field(None, description="'todas' o lista de coberturas")


class AgentServicio(BaseModel):
    """Modelo de servicio para respuesta de /agent/config"""
    nombre: str = Field(description="Nombre del servicio o especialidad")
    categoria: Optional[str] = Field(None, description="Categoría del servicio")
    descripcion: Optional[str] = Field(None, description="Descripción del servicio")


class AgentCobertura(BaseModel):
    """Modelo de cobertura (obra social/prepaga)"""
    nombre: str = Field(description="Nombre de la cobertura")
    activa: bool = Field(description="Si está activa actualmente")
    sedes_disponibles: Optional[List[str]] = Field(None, description="En qué sedes aplica")


class AgentConfigResponse(BaseModel):
    """Respuesta completa de GET /agent/config"""
    tenant_id: str = Field(description="ID del tenant")
    nombre: str = Field(description="Nombre del negocio/clínica")
    descripcion: Optional[str] = Field(None, description="Descripción corta")
    config: Optional[Dict[str, Any]] = Field(None, description="Configuración adicional del agente")
    servicios: List[AgentServicio] = Field(description="Lista de servicios ofrecidos")
    sedes: List[AgentSede] = Field(description="Lista de sedes físicas")
    coberturas: List[AgentCobertura] = Field(description="Obras sociales y prepagas aceptadas")
    routing_rules: Optional[List[Dict[str, Any]]] = Field(None, description="Reglas de routing configuradas")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "tenant_id": "clinica-x-buenos-aires",
                "nombre": "Clínica X - Buenos Aires",
                "descripcion": "Clínica privada multiespecialista",
                "config": {
                    "proposito": "Agendar turnos y consultar coberturas",
                    "tono": "profesional_y_cercano"
                },
                "servicios": [
                    {"nombre": "Cardiología", "categoria": "especialidad", "descripcion": "Diagnóstico y tratamiento cardiovascular"}
                ],
                "sedes": [
                    {
                        "nombre": "Sede Centro",
                        "direccion": "Av. Corrientes 1234, CABA",
                        "telefonos": ["1123456789"],
                        "mail": "centro@clinica-x.ar",
                        "horario_semana": "Lun-Vier 8:00-20:00",
                        "coberturas_disponibles": "todas"
                    }
                ],
                "coberturas": [
                    {"nombre": "OSDE", "activa": True, "sedes_disponibles": ["Sede Centro"]},
                    {"nombre": "Swiss Medical", "activa": True, "sedes_disponibles": ["Sede Centro"]}
                ],
                "routing_rules": []
            }
        }
    )
