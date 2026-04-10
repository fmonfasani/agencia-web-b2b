"""
Servicio de onboarding.
Procesa el formulario, carga datos estructurados en PostgreSQL,
procesa documentos con LLM y almacena chunks en Qdrant.
"""
import hashlib
import json
import time
import logging
import asyncio
from pathlib import Path
from typing import Optional

import os
import httpx
import psycopg2
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct,
    Filter, FieldCondition, MatchValue
)

from app.onboarding_models import OnboardingForm, IngestResponse
from app.qdrant.client import _normalize_tenant_id

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# CONFIG
# ---------------------------------------------------------------------------
OLLAMA_URL   = os.getenv("OLLAMA_URL", "http://localhost:11434")
QDRANT_URL   = os.getenv("QDRANT_URL", "http://localhost:6333")
EMBED_MODEL  = os.getenv("EMBED_MODEL", "nomic-embed-text")
LLM_MODEL    = os.getenv("LLM_MODEL", "qwen2.5:0.5b")
_raw_db_dsn = os.environ.get("DATABASE_URL")
if not _raw_db_dsn:
    raise RuntimeError(
        "DATABASE_URL environment variable is required. "
        "Set it in your .env file or deployment config."
    )
DB_DSN: str = _raw_db_dsn
UPLOAD_DIR   = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


# ---------------------------------------------------------------------------
# HELPERS — embeddings y LLM
# ---------------------------------------------------------------------------

async def embed(text: str) -> list[float]:
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(
            f"{OLLAMA_URL}/api/embeddings",
            json={"model": EMBED_MODEL, "prompt": text},
        )
        r.raise_for_status()
        return r.json()["embedding"]


async def llm_call(prompt: str, model: str = LLM_MODEL) -> str:
    """Llama al LLM local. Fallback a OpenAI si falla."""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(
                f"{OLLAMA_URL}/api/generate",
                json={"model": model, "prompt": prompt, "stream": False, "format": "json"},
            )
            r.raise_for_status()
            return r.json()["response"]
    except Exception as e:
        logger.warning(f"LLM local falló ({e}), intentando fallback OpenAI...")
        return await llm_openai_fallback(prompt)


async def llm_openai_fallback(prompt: str) -> str:
    """Fallback a OpenAI si el modelo local falla."""
    import os
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY no configurado y LLM local falló")

    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": "Respondé SOLO con JSON válido, sin texto adicional."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.1,
            }
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]


def chunk_id(tenant_id: str, entity: str, category: str) -> str:
    return hashlib.md5(f"{tenant_id}:{category}:{entity}".encode()).hexdigest()


def chunk_id_int(cid: str) -> int:
    return int(cid[:8], 16)


# ---------------------------------------------------------------------------
# PASO 1 — PostgreSQL: setup de tablas dinámicas
# ---------------------------------------------------------------------------

def setup_postgresql(form: OnboardingForm):
    """
    Crea tablas dinámicas según las entidades del formulario
    y carga todos los datos estructurados.
    """
    conn = psycopg2.connect(DB_DSN)
    cur = conn.cursor()

    # Tabla de tenants
    cur.execute("""
        CREATE TABLE IF NOT EXISTS tenants (
            id              VARCHAR(100) PRIMARY KEY,
            nombre          VARCHAR(200),
            industria       VARCHAR(100),
            subcategoria    VARCHAR(100),
            descripcion     TEXT,
            config          JSONB,
            created_at      TIMESTAMP DEFAULT NOW()
        );
    """)

    # Tabla de coberturas (genérica para cualquier tenant con coberturas)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS tenant_coberturas (
            id              SERIAL PRIMARY KEY,
            tenant_id       VARCHAR(100) NOT NULL,
            nombre          VARCHAR(200) NOT NULL,
            activa          BOOLEAN DEFAULT TRUE,
            sedes_disponibles JSONB DEFAULT '[]'
        );
    """)

    # Tabla de sedes/ubicaciones
    cur.execute("""
        CREATE TABLE IF NOT EXISTS tenant_sedes (
            id              SERIAL PRIMARY KEY,
            tenant_id       VARCHAR(100) NOT NULL,
            nombre          VARCHAR(100) NOT NULL,
            direccion       TEXT,
            telefonos       JSONB,
            mail            VARCHAR(200),
            horario_semana  VARCHAR(200),
            horario_sabado  VARCHAR(200),
            coberturas_disponibles VARCHAR(100) DEFAULT 'todas'
        );
    """)

    # Tabla de servicios/productos
    cur.execute("""
        CREATE TABLE IF NOT EXISTS tenant_servicios (
            id              SERIAL PRIMARY KEY,
            tenant_id       VARCHAR(100) NOT NULL,
            nombre          VARCHAR(200) NOT NULL,
            categoria       VARCHAR(100),
            descripcion     TEXT
        );
    """)

    # Tabla de routing rules
    cur.execute("""
        CREATE TABLE IF NOT EXISTS tenant_routing_rules (
            id              SERIAL PRIMARY KEY,
            tenant_id       VARCHAR(100) NOT NULL,
            patron          VARCHAR(100),
            estrategia      VARCHAR(50),
            config          JSONB
        );
    """)

    # Limpiar datos previos del tenant
    for tabla in ["tenant_coberturas", "tenant_sedes", "tenant_servicios", "tenant_routing_rules"]:
        cur.execute(f"DELETE FROM {tabla} WHERE tenant_id = %s", (form.tenant_id,))

    cur.execute("DELETE FROM tenants WHERE id = %s", (form.tenant_id,))

    # Insertar tenant
    cur.execute("""
        INSERT INTO tenants (id, nombre, industria, subcategoria, descripcion, config)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (
        form.tenant_id,
        form.tenant_nombre,
        form.industria.value,
        form.subcategoria,
        form.descripcion_corta,
        json.dumps({
            "proposito": form.proposito_principal,
            "acciones_habilitadas": form.acciones_habilitadas,
            "acciones_prohibidas": form.acciones_prohibidas,
            "tono": form.tono,
            "mensaje_fallback": form.mensaje_fallback,
        })
    ))

    # Insertar coberturas
    for cobertura in form.coberturas:
        sedes_nombres = [s.nombre for s in form.sedes]
        cur.execute("""
            INSERT INTO tenant_coberturas (tenant_id, nombre, activa, sedes_disponibles)
            VALUES (%s, %s, TRUE, %s)
        """, (form.tenant_id, cobertura, json.dumps(sedes_nombres)))

    # Insertar sedes
    for sede in form.sedes:
        cur.execute("""
            INSERT INTO tenant_sedes
                (tenant_id, nombre, direccion, telefonos, mail,
                 horario_semana, horario_sabado, coberturas_disponibles)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            form.tenant_id, sede.nombre, sede.direccion,
            json.dumps(sede.telefonos), sede.mail,
            sede.horario_semana, sede.horario_sabado,
            sede.coberturas_disponibles
        ))

    # Insertar servicios
    for servicio in form.servicios:
        cur.execute("""
            INSERT INTO tenant_servicios (tenant_id, nombre, categoria, descripcion)
            VALUES (%s, %s, %s, %s)
        """, (form.tenant_id, servicio.nombre, servicio.categoria, servicio.descripcion))

    # Insertar routing rules
    for rule in form.routing_rules:
        cur.execute("""
            INSERT INTO tenant_routing_rules (tenant_id, patron, estrategia, config)
            VALUES (%s, %s, %s, %s)
        """, (
            form.tenant_id, rule.patron, rule.estrategia.value,
            json.dumps(rule.dict())
        ))

    conn.commit()
    cur.close()
    conn.close()

    return {
        "coberturas": len(form.coberturas),
        "sedes": len(form.sedes),
        "servicios": len(form.servicios),
        "routing_rules": len(form.routing_rules),
    }


# ---------------------------------------------------------------------------
# PASO 2 — LLM procesa documentos y genera chunks
# ---------------------------------------------------------------------------

async def process_document_with_llm(
    text: str,
    form: OnboardingForm,
    model: str = LLM_MODEL
) -> list[dict]:
    """
    El LLM lee el documento crudo y genera chunks semánticos.
    Usa el formulario como contexto para reducir ambigüedad.
    """

    prompt = f"""Sos un sistema de extracción de conocimiento para un agente de IA.

CONTEXTO DEL NEGOCIO:
- Industria: {form.industria.value}
- Subcategoría: {form.subcategoria}
- Descripción: {form.descripcion_corta}
- Términos clave del sector: {', '.join(form.hints.terminos_clave)}
- Preguntas frecuentes esperadas: {json.dumps(form.hints.preguntas_frecuentes_esperadas, ensure_ascii=False)}

INSTRUCCIONES:
Analizá el siguiente documento y generá chunks semánticos.
Cada chunk debe ser autosuficiente (se puede leer solo y tiene sentido completo).
Granularidad: {form.instrucciones_chunking.granularidad}
Máximo {form.instrucciones_chunking.max_tokens_por_chunk} tokens por chunk.
Idioma del display_text: {form.instrucciones_chunking.idioma_display_text}

Para cada chunk devolvé:
- raw_text: texto optimizado para embedding (conciso, con términos clave)
- display_text: texto optimizado para mostrar al usuario (claro, en {form.instrucciones_chunking.idioma_display_text})
- category: categoría del chunk (cobertura, sede, servicio, especialidad, laboratorio, imagen, institucional, faq, otro)
- entity: nombre de la entidad principal del chunk
- entities: lista de entidades mencionadas
- search_terms: lista de términos de búsqueda que un usuario real usaría
- priority: número entre 0 y 1 (1 = muy consultado)
- storage: "qdrant" o "skip" (skip si ya está en PostgreSQL como dato estructurado)

Datos que YA están en PostgreSQL (NO generes chunks para estos, poneles storage="skip"):
- Coberturas: {', '.join(form.coberturas[:10])}{'...' if len(form.coberturas) > 10 else ''}
- Sedes: {', '.join([s.nombre for s in form.sedes])}
- Servicios con descripción corta ya cargados

DOCUMENTO A PROCESAR:
{text[:3000]}

Respondé SOLO con JSON válido. Formato:
{{
  "chunks": [
    {{
      "raw_text": "...",
      "display_text": "...",
      "category": "...",
      "entity": "...",
      "entities": ["..."],
      "search_terms": ["..."],
      "priority": 0.9,
      "storage": "qdrant"
    }}
  ]
}}"""

    raw_response = await llm_call(prompt, model)

    # Parsear JSON — con retry si el LLM devuelve formato roto
    try:
        data = json.loads(raw_response)
        return data.get("chunks", [])
    except json.JSONDecodeError:
        logger.warning("LLM devolvió JSON inválido, intentando extraer...")
        # Buscar el JSON dentro del texto
        import re
        match = re.search(r'\{.*\}', raw_response, re.DOTALL)
        if match:
            try:
                data = json.loads(match.group())
                return data.get("chunks", [])
            except Exception:
                pass
        logger.error("No se pudo parsear respuesta del LLM")
        return []


# ---------------------------------------------------------------------------
# PASO 3 — Generar chunks desde datos estructurados (sin LLM)
# ---------------------------------------------------------------------------

def generate_deterministic_chunks(form: OnboardingForm) -> list[dict]:
    """
    Genera chunks determinísticos desde los datos estructurados del formulario.
    Estos son 100% confiables — no pasan por LLM.
    """
    chunks = []

    # Chunks de sedes (autosuficientes)
    for sede in form.sedes:
        tels = " / ".join(sede.telefonos)
        raw = (
            f"Sede {sede.nombre}. Dirección: {sede.direccion}. "
            f"Teléfonos: {tels}. Mail: {sede.mail}. "
            f"Horario semana: {sede.horario_semana}."
        )
        if sede.horario_sabado:
            raw += f" Sábado: {sede.horario_sabado}."

        display = (
            f"Sede {sede.nombre}: {sede.direccion}\n"
            f"📞 {tels}\n"
            f"✉️ {sede.mail}\n"
            f"🕐 {sede.horario_semana}"
        )
        if sede.horario_sabado:
            display += f" | {sede.horario_sabado}"

        chunks.append({
            "raw_text": raw,
            "display_text": display,
            "category": "sede",
            "entity": sede.nombre,
            "entities": [sede.nombre, "sede", "dirección", "horario", "teléfono"],
            "search_terms": [
                f"sede {sede.nombre.lower()}", "dirección", "donde queda",
                "teléfono", "horario", "cómo llegar", sede.nombre.lower()
            ],
            "priority": 0.9,
            "storage": "qdrant",
            "source": "formulario",
            "confidence": 1.0,
        })

    # Chunks de coberturas (1 por cobertura = retrieval atómico)
    for cobertura in form.coberturas:
        sedes_nombres = " y ".join([s.nombre for s in form.sedes])
        raw = (
            f"Cobertura {cobertura}. "
            f"{form.tenant_nombre} acepta {cobertura}. "
            f"Disponible en: {sedes_nombres}."
        )
        display = (
            f"Sí, atendemos con {cobertura}. "
            f"Disponible en: {sedes_nombres}."
        )
        chunks.append({
            "raw_text": raw,
            "display_text": display,
            "category": "cobertura",
            "entity": cobertura,
            "entities": [cobertura] + [s.nombre for s in form.sedes] + ["cobertura", "obra social"],
            "search_terms": [
                cobertura.lower(), "obra social", "cobertura", "prepaga",
                "atienden con", "tienen convenio", "acepta",
            ],
            "priority": 0.95,
            "storage": "qdrant",
            "source": "formulario",
            "confidence": 1.0,
        })

    # Chunk resumen coberturas
    if form.coberturas:
        todas = ", ".join(form.coberturas[:10])
        chunks.append({
            "raw_text": f"{form.tenant_nombre} tiene convenio con {len(form.coberturas)} obras sociales: {todas}.",
            "display_text": (
                f"Tenemos convenio con {len(form.coberturas)} obras sociales y prepagas. "
                f"Consultá si tu cobertura está incluida."
            ),
            "category": "cobertura",
            "entity": "resumen_coberturas",
            "entities": ["coberturas", "obras sociales", "prepagas"],
            "search_terms": [
                "qué obras sociales", "qué coberturas", "tienen convenio",
                "lista coberturas", "cuántas coberturas", "prepagas"
            ],
            "priority": 0.85,
            "storage": "qdrant",
            "source": "formulario",
            "confidence": 1.0,
        })

    # Chunks de servicios
    for servicio in form.servicios:
        raw = f"{servicio.nombre}. {servicio.descripcion}"
        display = f"{servicio.nombre}: {servicio.descripcion}"
        chunks.append({
            "raw_text": raw,
            "display_text": display,
            "category": servicio.categoria,
            "entity": servicio.nombre,
            "entities": [servicio.nombre, servicio.categoria],
            "search_terms": [
                servicio.nombre.lower(),
                servicio.categoria.lower(),
                servicio.descripcion.lower()[:50],
            ],
            "priority": 0.85,
            "storage": "qdrant",
            "source": "formulario",
            "confidence": 1.0,
        })

    return chunks


# ---------------------------------------------------------------------------
# PASO 4 — Almacenar en Qdrant
# ---------------------------------------------------------------------------

async def store_in_qdrant(chunks: list[dict], tenant_id: str, modelo_usado: str) -> tuple[int, list[str]]:
    """
    Genera embeddings y almacena chunks en Qdrant.
    Retorna (cantidad_almacenada, errores)
    """
    collection_name = _normalize_tenant_id(tenant_id)
    client = QdrantClient(url=QDRANT_URL, timeout=30)
    errores = []

    # Dimensión del modelo
    dim = len(await embed("test"))

    # Crear colección si no existe
    if not client.collection_exists(collection_name):
        client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=dim, distance=Distance.COSINE),
        )

    # Eliminar chunks anteriores del tenant (reingesta limpia)
    try:
        client.delete_collection(collection_name)
        client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=dim, distance=Distance.COSINE),
        )
    except Exception:
        pass

    # Filtrar chunks que van a Qdrant
    qdrant_chunks = [c for c in chunks if c.get("storage") != "skip"]

    points = []
    for i, chunk in enumerate(qdrant_chunks):
        try:
            vector = await embed(chunk["raw_text"])
            cid = chunk_id(tenant_id, chunk.get("entity", str(i)), chunk.get("category", "general"))

            points.append(PointStruct(
                id=chunk_id_int(cid),
                vector=vector,
                payload={
                    "chunk_id":       cid,
                    "tenant_id":      tenant_id,
                    "text":           chunk["display_text"],
                    "raw_text":       chunk["raw_text"],
                    "category":       chunk.get("category", "general"),
                    "entity":         chunk.get("entity", ""),
                    "entities":       chunk.get("entities", []),
                    "search_terms":   chunk.get("search_terms", []),
                    "priority":       chunk.get("priority", 0.5),
                    "source":         chunk.get("source", "documento"),
                    "modelo_ingesta": modelo_usado,
                    "confidence":     chunk.get("confidence", 0.8),
                    "version":        "2026-03",
                }
            ))
        except Exception as e:
            errores.append(f"Error en chunk '{chunk.get('entity')}': {str(e)}")
            logger.error(f"Error procesando chunk: {e}")

    if points:
        client.upsert(collection_name=collection_name, points=points)

    return len(points), errores


# ---------------------------------------------------------------------------
# FUNCIÓN PRINCIPAL — pipeline completo
# ---------------------------------------------------------------------------

async def run_ingestion_pipeline(
    form: OnboardingForm,
    document_texts: list[str],
) -> IngestResponse:
    """
    Ejecuta el pipeline completo de ingesta:
    1. PostgreSQL con datos estructurados
    2. Chunks determinísticos desde formulario
    3. LLM procesa documentos
    4. Almacena todo en Qdrant
    """
    start = time.time()
    all_chunks = []
    errores = []
    modelo_usado = LLM_MODEL

    # 1. PostgreSQL
    logger.info(f"[{form.tenant_id}] Cargando datos en PostgreSQL...")
    setup_postgresql(form)

    # 2. Chunks determinísticos (sin LLM)
    logger.info(f"[{form.tenant_id}] Generando chunks determinísticos...")
    det_chunks = generate_deterministic_chunks(form)
    all_chunks.extend(det_chunks)
    logger.info(f"  {len(det_chunks)} chunks determinísticos generados")

    # 3. LLM procesa documentos (Opción B)
    for i, text in enumerate(document_texts):
        if not text.strip():
            continue
        logger.info(f"[{form.tenant_id}] LLM procesando documento {i+1}/{len(document_texts)}...")
        try:
            llm_chunks = await process_document_with_llm(text, form, modelo_usado)
            # Filtrar chunks duplicados (que ya existen como determinísticos)
            existing_entities = {c["entity"].lower() for c in all_chunks}
            nuevos = [
                c for c in llm_chunks
                if c.get("entity", "").lower() not in existing_entities
                and c.get("storage") != "skip"
            ]
            all_chunks.extend(nuevos)
            logger.info(f"  {len(nuevos)} chunks nuevos del LLM")
        except Exception as e:
            errores.append(f"Error procesando documento {i+1}: {str(e)}")
            logger.error(f"Error LLM: {e}")

    # 4. Almacenar en Qdrant
    logger.info(f"[{form.tenant_id}] Almacenando {len(all_chunks)} chunks en Qdrant...")
    almacenados, qdrant_errores = await store_in_qdrant(all_chunks, form.tenant_id, modelo_usado)
    errores.extend(qdrant_errores)

    tiempo_ms = int((time.time() - start) * 1000)
    logger.info(f"[{form.tenant_id}] Ingesta completada en {tiempo_ms}ms")

    return IngestResponse(
        tenant_id=form.tenant_id,
        chunks_generados=len(all_chunks),
        chunks_almacenados=almacenados,
        modelo_usado=modelo_usado,
        errores=errores,
        tiempo_ms=tiempo_ms,
    )