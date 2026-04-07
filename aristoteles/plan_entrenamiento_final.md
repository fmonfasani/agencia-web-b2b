# Plan de Implementación — Aristóteles
**Tarea:** Modulo de Entrenamiento: cliente sube documentos, analista los preprocesa y mejora, luego los ingesta al vector store Qdrant. El analista tiene control total de calidad antes de que lleguen al agente IA.
**Fecha:** 06/04/2026 21:41
**Pipeline:** Claude Code (Arquitecto) → OpenAI (Crítico) → Gemini (Juez)

---

¡Excelente plan inicial! Has identificado correctamente los puntos clave y la necesidad de un control de calidad robusto por parte del analista. Mi revisión se centrará en reforzar las decisiones correctas, cerrar los gaps identificados y proponer mejoras concretas para un sistema más escalable, mantenible y robusto.

Aquí tienes el plan DEFINITIVO mejorado, listo para el equipo de desarrollo.

---

## Resumen ejecutivo

Este documento detalla el plan definitivo para el **Módulo de Entrenamiento**, una pieza crítica que permite a los clientes subir documentos para que un analista los revise, preprocese y mejore antes de su ingesta en el vector store (Qdrant). El objetivo principal es asegurar la máxima calidad del conocimiento que alimenta a los agentes de IA, otorgando al analista un control total sobre el proceso de preprocesamiento, chunking y metadatos. Se introduce un flujo de trabajo claro con estados intermedios, un panel de administración para el analista y un sistema de versionado para el contenido procesado.

**Objetivos clave:**
*   **Control de Calidad:** El analista tiene la última palabra antes de la ingesta.
*   **Trazabilidad:** Seguimiento del estado de los documentos y versionado del contenido procesado.
*   **Flexibilidad:** El analista puede editar contenido, añadir metadatos y configurar el chunking.
*   **Experiencia de Usuario:** Interfaces claras para cliente (estado) y analista (gestión).

## Arquitectura final

La arquitectura propuesta se basa en un enfoque de microservicios o servicios bien definidos, separando las responsabilidades de la carga de archivos, el preprocesamiento, la gestión de la base de datos y la ingesta final. Se introduce un **Servicio de Ingesta** dedicado para manejar la lógica compleja de chunking, embedding y almacenamiento en Qdrant.

```mermaid
graph TD
    subgraph Cliente
        C[Frontend Cliente] -- Sube Documentos --> API_UPLOAD
        C -- Consulta Estado --> API_STATUS
    end

    subgraph Backend Principal (Next.js/Node.js)
        API_UPLOAD(POST /training/upload)
        API_LIST_TENANT(GET /training/documents/{tenant_id})
        API_LIST_PENDING(GET /training/pending)
        API_EDIT_DOC(PATCH /training/documents/{id})
        API_REJECT_DOC(POST /training/documents/{id}/reject)
        API_STATUS(GET /training/status/{tenant_id})
        API_INGEST_TRIGGER(POST /training/documents/{id}/ingest)
    end

    subgraph Servicio de Preprocesamiento (Python/Node.js)
        PREPROCESS_SERVICE[Servicio de Preprocesamiento]
    end

    subgraph Servicio de Ingesta (Python/Node.js)
        INGEST_SERVICE[Servicio de Ingesta]
    end

    DB[PostgreSQL]
    QDRANT[Qdrant Vector Store]
    S3[S3/Object Storage]
    NOTIF[Servicio de Notificaciones]

    API_UPLOAD --> S3
    API_UPLOAD --> PREPROCESS_SERVICE
    PREPROCESS_SERVICE --> DB
    API_UPLOAD --> DB
    API_LIST_TENANT --> DB
    API_LIST_PENDING --> DB
    API_EDIT_DOC --> DB
    API_REJECT_DOC --> DB
    API_STATUS --> DB

    API_INGEST_TRIGGER --> INGEST_SERVICE
    INGEST_SERVICE --> DB
    INGEST_SERVICE --> QDRANT
    INGEST_SERVICE --> NOTIF

    DB -- Almacena metadatos, estados, content_processed --> S3
    S3 -- Almacena content_raw (archivos originales) --> PREPROCESS_SERVICE
    S3 -- Almacena content_processed (opcional para grandes docs) --> INGEST_SERVICE
```

**Componentes clave:**

1.  **Frontend Cliente:** Interfaz para que el cliente suba documentos y consulte su estado.
2.  **Frontend Analista (Admin):** Panel de administración para que el analista revise, edite, configure y apruebe documentos.
3.  **Backend Principal (Next.js/Node.js):**
    *   Gestiona los endpoints de la API para clientes y analistas.
    *   Orquesta el flujo de trabajo.
    *   Interactúa con PostgreSQL para la gestión de metadatos y estados.
    *   Actúa como *proxy* o *trigger* para los servicios de Preprocesamiento e Ingesta.
4.  **Servicio de Preprocesamiento:**
    *   Responsable de la extracción de texto de diversos formatos de archivo (PDF, DOCX, CSV, TXT).
    *   Puede realizar una limpieza inicial automatizada (ej. eliminar encabezados/pies de página genéricos).
    *   Almacena el `content_raw` en S3 y el texto extraído inicial en `content_processed` en la DB.
    *   *Justificación:* Separar esta lógica permite usar lenguajes/librerías específicas (ej. Python para PyMuPDF) y escalar de forma independiente.
5.  **Servicio de Ingesta:**
    *   Recibe una solicitud del Backend Principal con el `document_id` y los parámetros de chunking/metadatos.
    *   Recupera `content_processed` (de DB o S3).
    *   Realiza el chunking del texto según la configuración del analista.
    *   Genera los embeddings para cada chunk.
    *   Almacena los vectores y metadatos asociados en Qdrant.
    *   Actualiza el estado del documento en PostgreSQL.
    *   Notifica al cliente.
    *   *Justificación:* Encapsula la lógica compleja y sensible de la IA, permitiendo reintentos, monitoreo y escalabilidad específicos.
6.  **PostgreSQL:** Base de datos relacional para almacenar metadatos de documentos, estados, historial de versiones y referencias a archivos en S3.
7.  **Qdrant:** Vector store para almacenar los embeddings de los chunks de documentos.
8.  **S3/Object Storage:** Almacenamiento de objetos para los archivos originales (`content_raw`) y, opcionalmente, para `content_processed` si los documentos son muy grandes.
9.  **Servicio de Notificaciones:** Envía notificaciones al cliente (email, in-app) sobre el estado de sus documentos.

## Plan de implementación

### Fase 1: Backend y Base de Datos (MVP)

1.  **Definición de Esquema de Base de Datos:**
    *   **`tenants`**: (ya existente) `id UUID PRIMARY KEY`.
    *   **`users`**: (ya existente) `id UUID PRIMARY KEY`.
    *   **`training_documents`**:
        ```sql
        CREATE TABLE training_documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES tenants(id),
          filename TEXT NOT NULL,          -- Nombre original del archivo
          file_type TEXT NOT NULL,         -- Tipo MIME o extensión (ej. 'application/pdf')
          s3_raw_path TEXT NOT NULL,       -- Ruta al archivo original en S3
          content_processed TEXT,          -- Contenido procesado (editable por analista)
          status TEXT DEFAULT 'uploaded',  -- uploaded|processing|reviewing|processed|ingested|rejected|failed
          metadata JSONB DEFAULT '{}',     -- tags, categoria, importancia, chunking_params, etc.
          uploaded_at TIMESTAMPTZ DEFAULT NOW(),
          processed_by UUID REFERENCES users(id), -- Analista que lo procesó
          processed_at TIMESTAMPTZ,
          ingested_at TIMESTAMPTZ,
          rejection_reason TEXT,
          last_version_id UUID             -- Referencia a la última versión en training_document_versions
        );
        ```
    *   **`training_document_versions`**:
        ```sql
        CREATE TABLE training_document_versions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          document_id UUID NOT NULL REFERENCES training_documents(id),
          version_number INT NOT NULL,
          content_processed_snapshot TEXT NOT NULL, -- Snapshot del contenido en esta versión
          metadata_snapshot JSONB DEFAULT '{}',     -- Snapshot de los metadatos en esta versión
          edited_by UUID REFERENCES users(id),
          edited_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE (document_id, version_number)
        );
        ```
    *   *Justificación:* `s3_raw_path` para manejar archivos grandes. `last_version_id` y `training_document_versions` para un versionado explícito de `content_processed`. Nuevo estado `processing` para la extracción inicial.

2.  **Servicio de Preprocesamiento (Microservicio o Módulo Interno):**
    *   **Endpoint:** `POST /internal/preprocess-document` (recibe `s3_raw_path`, `document_id`, `tenant_id`).
    *   **Lógica:**
        *   Descarga el archivo de S3.
        *   Extrae texto usando librerías adecuadas (PyMuPDF, python-docx, etc.).
        *   Realiza una limpieza básica (ej. eliminar dobles espacios, saltos de línea excesivos).
        *   Actualiza `training_documents` con `content_processed` (texto extraído) y `status = 'reviewing'`.
        *   Manejo de errores: Si falla la extracción, `status = 'failed'` y `rejection_reason`.
    *   *Tecnología:* Python es una buena opción por sus librerías de procesamiento de documentos.

3.  **Endpoints Backend Principal (Next.js Server Actions / API Routes):**

    *   **`POST /api/training/upload` (Cliente)**
        *   Recibe `FormData` con el archivo.
        *   Valida tamaño (20MB), tipo de archivo.
        *   Sube el archivo a S3 (`s3_raw_path`).
        *   Crea un registro en `training_documents` con `status = 'uploaded'`, `s3_raw_path`.
        *   Llama asíncronamente al Servicio de Preprocesamiento.
        *   Retorna `document_id` y `status`.
        *   *Snippet (ejemplo conceptual):*
            ```typescript
            // server-action.ts
            export async function uploadTrainingDocument(formData: FormData) {
              const file = formData.get('file') as File;
              // ... validaciones ...
              const s3Path = await uploadToS3(file);
              const doc = await db.insert('training_documents').values({
                tenant_id: currentTenantId,
                filename: file.name,
                file_type: file.type,
                s3_raw_path: s3Path,
                status: 'uploaded'
              }).returning({ id: true });

              // Disparar preprocesamiento (ej. con una cola de mensajes o fetch interno)
              await fetch('/internal/preprocess-document', {
                method: 'POST',
                body: JSON.stringify({ s3_raw_path: s3Path, document_id: doc.id, tenant_id: currentTenantId })
              });

              return { success: true, documentId: doc.id };
            }
            ```

    *   **`GET /api/training/documents/{tenant_id}` (Analista)**
        *   Lista documentos de un tenant específico. Requiere rol `analista`.

    *   **`GET /api/training/pending` (Analista)**
        *   Lista todos los documentos con `status = 'reviewing'` o `status = 'processed'`. Requiere rol `analista`.

    *   **`GET /api/training/documents/{id}` (Analista)**
        *   Obtiene detalles de un documento, incluyendo `content_raw` (si es pequeño, o un link a S3), `content_processed`, `metadata`, historial de versiones.

    *   **`PATCH /api/training/documents/{id}` (Analista)**
        *   Actualiza `content_processed`, `metadata`.
        *   Crea una nueva entrada en `training_document_versions` con el snapshot del contenido y metadatos.
        *   Actualiza `last_version_id` en `training_documents`.
        *   Actualiza `status = 'processed'` si no lo estaba.
        *   *Snippet (ejemplo conceptual):*
            ```typescript
            // server-action.ts
            export async function updateDocumentContent(id: string, newContent: string, newMetadata: Record<string, any>) {
              // ... auth check for analista ...
              const currentDoc = await db.select().from('training_documents').where(eq(training_documents.id, id)).first();
              if (!currentDoc) throw new Error('Document not found');

              const newVersionNumber = (await db.max(training_document_versions.version_number).where(eq(training_document_versions.document_id, id))) + 1;

              await db.transaction(async (tx) => {
                const version = await tx.insert('training_document_versions').values({
                  document_id: id,
                  version_number: newVersionNumber,
                  content_processed_snapshot: newContent,
                  metadata_snapshot: newMetadata,
                  edited_by: currentUserId,
                }).returning({ id: true });

                await tx.update('training_documents').set({
                  content_processed: newContent,
                  metadata: newMetadata,
                  status: 'processed', // O mantener 'reviewing' si es un borrador
                  processed_by:

---

<details>
<summary>📋 Plan original — Claude Code</summary>

## Plan Arquitectónico — Módulo de Entrenamiento

**Tarea:** Módulo donde el cliente sube documentos, el analista de Webshooks los revisa, preprocesa y mejora, y luego los ingesta al vector store (Qdrant). El cliente solo sube — el control de calidad y la ingesta real la hace el analista.

---

### 1. Análisis del problema

El sistema actual tiene `onboarding.uploadFiles()` y `onboarding.status()` pero carece de:
- Estado intermedio "en revisión" entre upload e ingesta
- Panel analista para ver, editar y procesar documentos por tenant
- Historial de versiones de documentos
- Pipeline de preprocesamiento (limpieza, chunking manual, metadatos)
- Notificaciones al cliente cuando su agente está listo

### 2. Arquitectura propuesta

```
Cliente sube docs
      ↓
[PostgreSQL: training_documents]
  - id, tenant_id, filename, content_raw, content_processed
  - status: uploaded | reviewing | processed | ingested | rejected
  - uploaded_at, processed_by, processed_at
      ↓
Analista accede al panel admin
      ↓
[Panel Analista]
  - Ve docs pendientes por tenant
  - Edita content_processed (mejora el texto)
  - Agrega metadatos (categoría, importancia, tags)
  - Marca como "listo para ingestar"
      ↓
[Trigger de ingesta]
  - Llama a /onboarding/upload con el contenido procesado
  - Actualiza status → ingested
  - Notifica al cliente
```

### 3. Nueva tabla PostgreSQL

```sql
CREATE TABLE training_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  content_raw TEXT,
  content_processed TEXT,
  status TEXT DEFAULT 'uploaded',  -- uploaded|reviewing|processed|ingested|rejected
  metadata JSONB DEFAULT '{}',     -- tags, categoria, importancia
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  processed_by UUID REFERENCES users(id),
  processed_at TIMESTAMPTZ,
  ingested_at TIMESTAMPTZ,
  rejection_reason TEXT
);
```

### 4. Nuevos endpoints backend

```
POST   /training/upload                  → cliente sube archivo
GET    /training/documents/{tenant_id}   → analista lista docs de un tenant
GET    /training/pending                 → analista ve todos los pendientes (cross-tenant)
PATCH  /training/documents/{id}          → analista edita content_processed + metadata
POST   /training/documents/{id}/ingest   → analista dispara ingesta a Qdrant
POST   /training/documents/{id}/reject   → analista rechaza con motivo
GET    /training/status/{tenant_id}      → cliente ve estado de sus docs
```

### 5. Frontend Cliente — /app/training

- Tabla de documentos propios con columnas: nombre, tipo, estado badge, fecha
- Upload drag & drop (ya implementado, mejorar para mostrar progreso por archivo)
- Estados visibles: Subido / En revisión / Procesado / Ingestado / Rechazado
- Si rechazado: mostrar motivo del rechazo
- KPIs: total subidos, pendientes de revisión, vectores activos

### 6. Frontend Analista — /admin/training

- Vista principal: tabla de todos los docs pendientes agrupados por tenant
- Badge contador en sidebar con número de pendientes
- Vista detalle de un documento:
  - Tab "Original": content_raw (solo lectura)
  - Tab "Procesado": textarea editable para content_processed
  - Panel lateral: metadatos (categoría, tags, nivel de importancia 1-5)
- Acciones: Guardar borrador / Marcar procesado / Ingestar / Rechazar
- Filtros: por tenant, por status, por tipo de archivo, por fecha

### 7. Server Actions (Next.js)

```typescript
// Cliente
getMyDocuments(): Promise<TrainingDocument[]>
uploadTrainingDocument(formData: FormData): Promise<{success, error?}>

// Analista (admin)
getPendingDocuments(): Promise<TrainingDocument[]>
getDocumentDetail(id: string): Promise<TrainingDocumentDetail>
updateDocumentContent(id, content, metadata): Promise<{success}>
ingestDocument(id: string): Promise<{success, vectors?}>
rejectDocument(id: string, reason: string): Promise<{success}>
```

### 8. Flujo completo

```
1. Cliente sube PDF → backend extrae texto → status: uploaded
2. Analista ve en panel → abre doc → status: reviewing
3. Analista edita, mejora, agrega tags → guarda → status: processed
4. Analista presiona "Ingestar" → /onboarding/upload → Qdrant → status: ingested
5. Cliente ve badge verde → agente actualizado con nuevo conocimiento
```

### 9. Consideraciones técnicas

- Extracción de texto: PyMuPDF (PDF), python-docx (DOCX), pandas (CSV), built-in (TXT)
- Seguridad: analista solo puede ver docs de tenants activos
- Chunking configurable: el analista define chunk_size antes de ingestar
- Versionado: content_raw es inmutable, content_processed es mutable con historial
- Rate limiting: máx 10 docs simultáneos por tenant
- Tamaño máximo: 20MB por archivo, validación en frontend y backend

</details>

<details>
<summary>🔍 Análisis crítico — OpenAI</summary>



</details>
