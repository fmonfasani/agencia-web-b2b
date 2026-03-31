"""
Router FastAPI para ingesta de onboarding en backend-agents.
SOLO maneja procesamiento con LLM y carga en Qdrant.

Endpoints:
  POST /onboarding/ingest → procesa documentos con LLM y carga en Qdrant

Los datos estructurados vienen de backend-saas (PostgreSQL).
"""
import json
import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException, Form, Depends

from app.onboarding_models import IngestResponse
from app.onboarding_service import run_ingestion_pipeline, UPLOAD_DIR
from app.auth.agent_auth import get_user_by_api_key

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/onboarding", tags=["Onboarding"])


async def get_agent_auth(request_headers: dict) -> dict:
    """Dependency para validar API Key en /onboarding/ingest."""
    api_key = request_headers.get("X-API-Key")
    if not api_key:
        raise HTTPException(status_code=401, detail="X-API-Key requerida")
    
    user = await get_user_by_api_key(api_key)
    if not user:
        raise HTTPException(status_code=401, detail="API Key inválida")
    
    return user


# ---------------------------------------------------------------------------
# POST /onboarding/ingest — pipeline de ingesta con LLM + Qdrant
# ---------------------------------------------------------------------------

@router.post(
    "/ingest",
    summary="Disparar pipeline de ingesta con LLM (backend-agents)",
    description="""
Ejecuta el pipeline completo de ingesta para un tenant:

1. **Chunks determinísticos** — genera chunks desde los datos del formulario (sin LLM)
2. **LLM procesa documentos** — lee los archivos subidos en backend-saas y genera chunks adicionales
3. **Embeddings** — convierte chunks en vectores con nomic-embed-text
4. **Qdrant** — almacena todos los chunks con metadata completa

Usa `gemma3:latest` como modelo principal.

**IMPORTANTE:** 
- Los datos estructurados (tenants, coberturas, sedes, servicios) YA deben estar en PostgreSQL
- Los archivos YA deben haber sido subidos via POST /onboarding/upload en backend-saas
- Solo funciona si el tenant existe en PostgreSQL

⚠️ Este proceso puede tardar varios minutos dependiendo de la cantidad de documentos.
    """,
    response_model=IngestResponse,
)
async def ingest(
    tenant_id: str = Form(..., description="ID del tenant a ingestar"),
    form_json: str = Form(..., description="JSON del formulario de onboarding (mismo que se usó en POST /onboarding/tenant)"),
    api_key: str = Form(..., description="API Key para autenticación"),
):
    """Procesa documentos con LLM y carga chunks en Qdrant."""
    
    # Validar API Key
    user = await get_user_by_api_key(api_key)
    if not user:
        raise HTTPException(status_code=401, detail="API Key inválida")
    
    # Parsear formulario
    try:
        from app.onboarding_models import OnboardingForm
        form_data = json.loads(form_json)
        form = OnboardingForm(**form_data)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Error parseando formulario: {str(e)}")

    if form.tenant_id != tenant_id:
        raise HTTPException(status_code=400, detail="tenant_id no coincide con el formulario")

    # Leer documentos subidos (en backend-saas)
    tenant_dir = UPLOAD_DIR / tenant_id
    document_texts = []

    if tenant_dir.exists():
        for archivo in tenant_dir.iterdir():
            try:
                if archivo.suffix == ".txt":
                    document_texts.append(archivo.read_text(encoding="utf-8"))
                elif archivo.suffix == ".pdf":
                    document_texts.append(_read_pdf(archivo))
                elif archivo.suffix in (".xlsx", ".csv"):
                    document_texts.append(_read_table(archivo))
            except Exception as e:
                logger.warning(f"Error leyendo {archivo.name}: {e}")
    else:
        logger.warning(f"No directory found for tenant {tenant_id}. Proceeding without document files.")

    logger.info(f"[{tenant_id}] Documentos a procesar: {len(document_texts)}")

    # Ejecutar pipeline de ingesta
    try:
        result = await run_ingestion_pipeline(form, document_texts)
        return result
    except Exception as e:
        logger.error(f"Error en pipeline de ingesta para {tenant_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error en ingesta: {str(e)}")


# ---------------------------------------------------------------------------
# Helpers para leer archivos
# ---------------------------------------------------------------------------

def _read_pdf(path: Path) -> str:
    """Lee contenido de archivo PDF."""
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(str(path))
        text = ""
        for page in doc:
            text += page.get_text()
        return text
    except ImportError:
        logger.warning("pymupdf no instalado, saltando PDF")
        return ""
    except Exception as e:
        logger.error(f"Error leyendo PDF {path}: {e}")
        return ""


def _read_table(path: Path) -> str:
    """Lee contenido de archivo Excel o CSV."""
    try:
        import pandas as pd
        if path.suffix == ".xlsx":
            df = pd.read_excel(path)
        else:
            df = pd.read_csv(path)
        return df.to_string(index=False)
    except ImportError:
        logger.warning("pandas no instalado, saltando tabla")
        return ""
    except Exception as e:
        logger.error(f"Error leyendo tabla {path}: {e}")
        return ""