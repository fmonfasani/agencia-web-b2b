"""
Modelos Pydantic para el pipeline de onboarding.
Validan el JSON del formulario antes de procesarlo.
"""
from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class Industria(str, Enum):
    salud = "salud"
    ecommerce = "ecommerce"
    servicios = "servicios"
    educacion = "educacion"
    gastronomia = "gastronomia"
    inmobiliaria = "inmobiliaria"
    otro = "otro"


class TipoStorage(str, Enum):
    postgresql = "postgresql"
    qdrant = "qdrant"
    ambos = "postgresql_y_qdrant"


class EstrategiaRouting(str, Enum):
    db_lookup = "db_lookup"
    db_lookup_cruzado = "db_lookup_cruzado"
    rag = "rag"
    fallback = "fallback"


# ---------------------------------------------------------------------------
# Sub-modelos
# ---------------------------------------------------------------------------

class EntidadClave(BaseModel):
    nombre: str
    descripcion: str
    storage: TipoStorage
    es_consultable_directamente: bool
    atributos: list[str]


class Sede(BaseModel):
    nombre: str
    direccion: str
    telefonos: list[str]
    mail: str
    horario_semana: str
    horario_sabado: Optional[str] = None
    coberturas_disponibles: str = "todas"


class Servicio(BaseModel):
    nombre: str
    categoria: str
    descripcion: str


class InstruccionesChunking(BaseModel):
    granularidad: str = "atomica_por_entidad"
    max_tokens_por_chunk: int = 200
    idioma_display_text: str = "español"


class Documento(BaseModel):
    nombre: str
    tipo: str  # txt, pdf, xlsx
    contenido_esperado: list[str]
    prioridad: str = "alta"


class ReglaRouting(BaseModel):
    patron: str
    ejemplo: str
    estrategia: EstrategiaRouting
    tabla: Optional[str] = None
    tablas: Optional[list[str]] = None
    sin_llm: bool
    mensaje: Optional[str] = None


class HintsLLM(BaseModel):
    industria_context: str
    terminos_clave: list[str]
    preguntas_frecuentes_esperadas: list[str]
    entidades_de_alta_frecuencia: list[str]
    datos_ausentes_conocidos: list[str] = []


# ---------------------------------------------------------------------------
# Modelo principal del formulario
# ---------------------------------------------------------------------------

class OnboardingForm(BaseModel):
    # Identidad del tenant
    tenant_id: str = Field(..., description="ID único del tenant, sin espacios")
    tenant_nombre: str
    created_by: str = "analista_interno"

    # Negocio
    industria: Industria
    subcategoria: str
    descripcion_corta: str
    ubicacion: str = "Argentina"
    idioma: str = "es"

    # Objetivo del agente
    proposito_principal: str
    acciones_habilitadas: list[str]
    acciones_prohibidas: list[str] = []
    tono: str = "profesional_y_cercano"
    mensaje_fallback: str

    # Entidades clave (define el schema dinámico)
    entidades_clave: list[EntidadClave]

    # Datos estructurados (van directo a PostgreSQL)
    coberturas: list[str] = []
    sedes: list[Sede] = []
    servicios: list[Servicio] = []

    # Documentos a procesar con LLM
    instrucciones_chunking: InstruccionesChunking = InstruccionesChunking()

    # Hints para el LLM
    hints: HintsLLM

    # Routing rules
    routing_rules: list[ReglaRouting] = []


# ---------------------------------------------------------------------------
# Responses
# ---------------------------------------------------------------------------

class OnboardingStatusResponse(BaseModel):
    tenant_id: str
    status: str
    postgresql: dict
    qdrant: dict
    gaps: list[str] = []
    mensaje: str


class IngestResponse(BaseModel):
    tenant_id: str
    chunks_generados: int
    chunks_almacenados: int
    modelo_usado: str
    errores: list[str] = []
    tiempo_ms: int