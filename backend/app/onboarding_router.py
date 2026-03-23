"""
Router FastAPI para el pipeline de onboarding.
Expone los endpoints en Swagger para uso del analista.

Endpoints:
  POST /onboarding/tenant   → crea tenant con datos del formulario
  POST /onboarding/upload   → sube archivos de la fuente de verdad
  POST /onboarding/ingest   → dispara el pipeline de ingesta
  GET  /onboarding/status   → estado del tenant en DB y Qdrant
  DELETE /onboarding/tenant → elimina todos los datos del tenant
"""
import json
import logging
from pathlib import Path
from typing import Optional

import psycopg2
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from qdrant_client import QdrantClient

from app.onboarding_models import (
    OnboardingForm,
    OnboardingStatusResponse,
    IngestResponse,
)
from app.onboarding_service import run_ingestion_pipeline, UPLOAD_DIR, QDRANT_URL, DB_DSN
from app.qdrant.client import _normalize_tenant_id
from app.auth_router import require_analista_or_admin

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/onboarding", tags=["Onboarding"])


# ---------------------------------------------------------------------------
# POST /onboarding/tenant — crear tenant desde formulario JSON
# ---------------------------------------------------------------------------

@router.post(
    "/tenant",
    summary="Crear tenant desde formulario de onboarding",
    description="""
Recibe el JSON del formulario de onboarding y carga los datos estructurados
en PostgreSQL. NO procesa documentos todavía.

**Flujo recomendado:**
1. `POST /onboarding/tenant` — crear tenant
2. `POST /onboarding/upload` — subir documentos
3. `POST /onboarding/ingest` — procesar con LLM y cargar en Qdrant
4. `GET /onboarding/status` — verificar resultado
    """,
    response_model=dict,
)
async def create_tenant(form: OnboardingForm, _: dict = Depends(require_analista_or_admin)):
    try:
        from app.onboarding_service import setup_postgresql
        stats = setup_postgresql(form)
        return {
            "status": "ok",
            "tenant_id": form.tenant_id,
            "mensaje": f"Tenant '{form.tenant_nombre}' creado correctamente",
            "datos_cargados": stats,
        }
    except Exception as e:
        logger.error(f"Error creando tenant: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# POST /onboarding/upload — subir archivos
# ---------------------------------------------------------------------------

@router.post(
    "/upload",
    summary="Subir archivos de fuente de verdad",
    description="""
Sube archivos desde la máquina del analista al servidor.
Formatos soportados: .txt, .pdf, .xlsx, .csv

Los archivos se guardan en el servidor y se procesan en el paso de ingesta.
    """,
    response_model=dict,
)
async def upload_files(
    tenant_id: str = Form(..., description="ID del tenant"),
    file1: UploadFile = File(..., description="Archivo principal"),
    file2: Optional[UploadFile] = File(None, description="Archivo 2 (opcional)"),
    file3: Optional[UploadFile] = File(None, description="Archivo 3 (opcional)"),
):
    files = [f for f in [file1, file2, file3] if f is not None]
    tenant_dir = UPLOAD_DIR / tenant_id
    tenant_dir.mkdir(parents=True, exist_ok=True)

    guardados = []
    errores = []

    TIPOS_PERMITIDOS = {".txt", ".pdf", ".xlsx", ".csv", ".json"}

    for file in files:
        ext = Path(file.filename).suffix.lower()
        if ext not in TIPOS_PERMITIDOS:
            errores.append(f"{file.filename}: tipo no permitido ({ext})")
            continue
        try:
            content = await file.read()
            dest = tenant_dir / file.filename
            dest.write_bytes(content)
            guardados.append({
                "nombre": file.filename,
                "tamaño_bytes": len(content),
                "tipo": ext,
            })
        except Exception as e:
            errores.append(f"{file.filename}: {str(e)}")

    return {
        "status": "ok" if not errores else "parcial",
        "tenant_id": tenant_id,
        "archivos_guardados": guardados,
        "errores": errores,
        "mensaje": f"{len(guardados)} archivo(s) subido(s) correctamente",
    }


# ---------------------------------------------------------------------------
# POST /onboarding/ingest — pipeline completo
# ---------------------------------------------------------------------------

@router.post(
    "/ingest",
    summary="Disparar pipeline de ingesta con LLM",
    description="""
Ejecuta el pipeline completo de ingesta para un tenant:

1. **Chunks determinísticos** — genera chunks desde los datos del formulario (sin LLM)
2. **LLM procesa documentos** — lee los archivos subidos y genera chunks adicionales
3. **Embeddings** — convierte chunks en vectores con nomic-embed-text
4. **Qdrant** — almacena todos los chunks con metadata completa

Usa `qwen2.5:0.5b` como modelo principal. Si falla, usa OpenAI como fallback.

⚠️ Este proceso puede tardar varios minutos dependiendo de la cantidad de documentos.
    """,
    response_model=IngestResponse,
)
async def ingest(
    tenant_id: str = Form(..., description="ID del tenant a ingestar"),
    form_json: str = Form(..., description="JSON del formulario de onboarding (mismo que se usó en /tenant)"),
    _: dict = Depends(require_analista_or_admin),
):
    # Parsear formulario
    try:
        form_data = json.loads(form_json)
        form = OnboardingForm(**form_data)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Error parseando formulario: {str(e)}")

    if form.tenant_id != tenant_id:
        raise HTTPException(status_code=400, detail="tenant_id no coincide con el formulario")

    # Leer documentos subidos
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

    logger.info(f"[{tenant_id}] Documentos a procesar: {len(document_texts)}")

    # Ejecutar pipeline
    result = await run_ingestion_pipeline(form, document_texts)
    return result


# ---------------------------------------------------------------------------
# GET /onboarding/status — estado del tenant
# ---------------------------------------------------------------------------

@router.get(
    "/status/{tenant_id}",
    summary="Estado del tenant en PostgreSQL y Qdrant",
    description="Muestra cuántos registros hay en PostgreSQL y cuántos chunks en Qdrant para el tenant.",
    response_model=OnboardingStatusResponse,
)
async def get_status(tenant_id: str):
    pg_stats = {}
    qdrant_stats = {}
    gaps = []

    # PostgreSQL
    try:
        conn = psycopg2.connect(DB_DSN)
        cur = conn.cursor()

        for tabla in ["tenant_coberturas", "tenant_sedes", "tenant_servicios"]:
            cur.execute(f"SELECT COUNT(*) FROM {tabla} WHERE tenant_id = %s", (tenant_id,))
            pg_stats[tabla] = cur.fetchone()[0]

        cur.execute("SELECT nombre, industria FROM tenants WHERE id = %s", (tenant_id,))
        row = cur.fetchone()
        if row:
            pg_stats["tenant_nombre"] = row[0]
            pg_stats["industria"] = row[1]
        else:
            gaps.append("Tenant no encontrado en PostgreSQL — ejecutá POST /onboarding/tenant primero")

        conn.close()
    except Exception as e:
        pg_stats["error"] = str(e)

    # Qdrant
    try:
        collection_name = _normalize_tenant_id(tenant_id)
        client = QdrantClient(url=QDRANT_URL, timeout=10)
        if client.collection_exists(collection_name):
            count_result = client.count(collection_name=collection_name)
            qdrant_stats["chunks_total"] = count_result.count
            qdrant_stats["collection"] = collection_name

            all_points, _ = client.scroll(
                collection_name=collection_name,
                limit=500,
                with_payload=True,
                with_vectors=False,
            )
            cats = {}
            for p in all_points:
                cat = p.payload.get("category", "desconocida")
                cats[cat] = cats.get(cat, 0) + 1
            qdrant_stats["por_categoria"] = cats
        else:
            qdrant_stats["chunks_total"] = 0
            gaps.append(f"Coleccion '{collection_name}' no existe en Qdrant -- ejecuta POST /onboarding/ingest primero")
    except Exception as e:
        qdrant_stats["error"] = str(e)

    # Detectar gaps obvios
    if pg_stats.get("tenant_coberturas", 0) == 0 and pg_stats.get("tenant_sedes", 0) == 0:
        gaps.append("No hay datos estructurados en PostgreSQL")
    if qdrant_stats.get("chunks_total", 0) == 0:
        gaps.append("No hay chunks en Qdrant — el agente no tiene conocimiento del negocio")

    status = "listo" if not gaps else "incompleto"

    return OnboardingStatusResponse(
        tenant_id=tenant_id,
        status=status,
        postgresql=pg_stats,
        qdrant=qdrant_stats,
        gaps=gaps,
        mensaje="Sistema listo para recibir consultas" if status == "listo"
                else f"Faltan {len(gaps)} paso(s) para completar el onboarding",
    )


# ---------------------------------------------------------------------------
# DELETE /onboarding/tenant — eliminar tenant
# ---------------------------------------------------------------------------

@router.delete(
    "/tenant/{tenant_id}",
    summary="Eliminar todos los datos de un tenant",
    response_model=dict,
)
async def delete_tenant(tenant_id: str, _: dict = Depends(require_analista_or_admin)):
    # PostgreSQL
    conn = psycopg2.connect(DB_DSN)
    cur = conn.cursor()
    for tabla in ["tenant_coberturas", "tenant_sedes", "tenant_servicios", "tenant_routing_rules"]:
        cur.execute(f"DELETE FROM {tabla} WHERE tenant_id = %s", (tenant_id,))
    cur.execute("DELETE FROM tenants WHERE id = %s", (tenant_id,))
    conn.commit()
    conn.close()

    # Qdrant
    client = QdrantClient(url=QDRANT_URL, timeout=10)
    collection_name = _normalize_tenant_id(tenant_id)
    if client.collection_exists(collection_name):
        client.delete_collection(collection_name)

    # Archivos
    import shutil
    tenant_dir = UPLOAD_DIR / tenant_id
    if tenant_dir.exists():
        shutil.rmtree(tenant_dir)

    return {"status": "ok", "tenant_id": tenant_id, "mensaje": "Tenant eliminado completamente"}


# ---------------------------------------------------------------------------
# Helpers para leer archivos
# ---------------------------------------------------------------------------

def _read_pdf(path: Path) -> str:
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

