# Webshooks SaaS API - Documentación Completa

**Última actualización:** 2 de abril de 2026
**Versión API:** 1.0.0
**Base URL:** `http://localhost:8000` (desarrollo) | `https://api.webshooks.com` (producción)

---

## Tabla de Contenidos

1. [Introducción](#introducción)
2. [Autenticación](#autenticación)
3. [Flujos Principales](#flujos-principales)
4. [Referencia de Endpoints](#referencia-de-endpoints)
5. [Ejemplos cURL](#ejemplos-curl)
6. [Errores y Códigos de Estado](#errores-y-códigos-de-estado)
7. [Notas Finales](#notas-finales)

---

## Introducción

**Webshooks** es una plataforma multitenant que permite gestionar agentes especializados por industria (salud, educación, comercio, etc.). Cada tenant (empresa/negocio) puede:

- **Subir documentos** (PDFs, TXTs) para procesamiento con LLM
- **Gestionar especialidades/servicios** con información estructurada
- **Ejecutar agentes** que responden consultas usando RAG (Retrieval-Augmented Generation)
- **Monitorear trazas** de ejecuciones y métricas

### Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Web/App                      │
└────────────┬────────────────────────┬────────────────────┘
             │                        │
             v                        v
    backend-saas:8000         backend-agents:8001
    ┌──────────────────┐     ┌──────────────────┐
    │ Auth             │     │ Agent Execution  │
    │ Onboarding       │     │ RAG Search       │
    │ Tenant Mgmt      │     │ LLM Processing   │
    │ PostgreSQL       │     │ Qdrant Vectors   │
    └──────────────────┘     └──────────────────┘
```

### ¿Por Qué Dos Servicios?

- **backend-saas**: gestiona usuarios, autenticación, datos estructurados
- **backend-agents**: procesa documentos con LLM, mantiene vectores en Qdrant

Ambos comparten la tabla `User` en PostgreSQL para validación unificada.

---

## Autenticación

### Flujo de Autenticación (Paso a Paso)

#### 1. Registrarse

```
POST /auth/register
Body: { email, password, rol?, tenant_id? }
  ↓
Usuario INACTIVO en PostgreSQL
```

#### 2. Admin Activa Usuario (solo admins)

```
POST /auth/activate
Body: { user_id }
  ↓
Usuario ACTIVO
```

#### 3. Login

```
POST /auth/login
Body: { email, password }
  ↓
Response: { api_key: "wh_xxxxx...", user_id, rol, ... }
```

#### 4. Usar API Key en Requests

```
GET /auth/me
Header: X-API-Key: wh_xxxxx...
  ↓
Acceso permitido ✓
```

### Formatos y Reglas de API Key

| Propiedad | Valor |
|-----------|-------|
| **Prefijo** | `wh_` |
| **Longitud** | 43-47 caracteres (alfanuméricos + `-_`) |
| **Generada** | Automáticamente en POST /auth/login |
| **Expiración** | Nunca (válida indefinidamente) |
| **Revocación** | Manual por admin (cambiar contraseña = nueva key) |

### Encabezados Soportados

| Header | Requerido | Descripción | Ejemplo |
|--------|-----------|-------------|---------|
| `X-API-Key` | ✓ | API key obtenida en login | `wh_abc123...` |
| `X-Trace-Id` | ✗ | ID único para tracing. Se genera automáticamente | `550e8400-e29b-41d4-a716-446655440000` |
| `Content-Type` | ✗ | Tipo de contenido. Automático para JSON | `application/json` |

### Roles y Permisos

| Rol | Registro | Gestión Tenants | Gestión Usuarios | Admin Only |
|-----|----------|-----------------|------------------|-----------|
| `cliente` | Sí (con tenant_id) | Solo propio tenant | No | No |
| `analista` | No (admin only) | Todos los tenants | No | No |
| `admin` | Sí (sin restricción) | Todos | Sí | Sí |
| `superadmin` | Sí (sin restricción) | Todos | Sí | Sí |

**Nota:** Los roles `admin` y `superadmin` son equivalentes en la mayoría de endpoints.

---

## Flujos Principales

### Flujo 1: Registro y Activación de Usuario

**Escenario:** Un nuevo empleado necesita acceso a la plataforma.

```
1. Cliente o Admin ejecuta:
   POST /auth/register
   {
     "email": "juan@empresa.com",
     "password": "SecurePass123!",
     "rol": "analista"
   }
   ↓
   Response: { "user_id": "usr_123", "email": "juan@empresa.com", "activo": false }

2. Admin lo activa:
   POST /auth/activate
   { "user_id": "usr_123" }
   ↓
   Response: { "message": "Usuario activado", "activo": true }

3. Usuario hace login:
   POST /auth/login
   {
     "email": "juan@empresa.com",
     "password": "SecurePass123!"
   }
   ↓
   Response: {
     "api_key": "wh_abc123...",
     "user_id": "usr_123",
     "email": "juan@empresa.com",
     "rol": "analista",
     "activo": true,
     "created_at": "2026-04-02T10:30:00Z"
   }

4. Juan usa API Key en todos los requests:
   GET /auth/me
   Header: X-API-Key: wh_abc123...
```

### Flujo 2: Onboarding Completo (Crear Tenant + Ingerir Datos)

**Escenario:** Clínica X quiere usar Webshooks.

**Paso 1: Crear Tenant (backend-saas)**

```bash
POST /onboarding/tenant
X-API-Key: wh_abc123...
Content-Type: application/json

Body:
{
  "tenant_id": "clinica-x-buenos-aires",
  "tenant_nombre": "Clínica X - Buenos Aires",
  "created_by": "analista_interno",
  "industria": "salud",
  "subcategoria": "clinica_multiespialista",
  "descripcion_corta": "Clínica privada multiespecialista",
  "ubicacion": "Buenos Aires, Argentina",
  "idioma": "es",
  "proposito_principal": "Agendar turnos",
  "acciones_habilitadas": ["agendar_turno", "consultar_cobertura"],
  "acciones_prohibidas": ["modificar_historia"],
  "tono": "profesional_y_cercano",
  "mensaje_fallback": "No puedo ayudarte con eso.",
  "entidades_clave": [
    {
      "nombre": "Especialidades",
      "descripcion": "Especialidades médicas",
      "storage": "postgresql_y_qdrant",
      "es_consultable_directamente": true,
      "atributos": ["nombre", "descripcion"]
    }
  ]
}

Response 200:
{
  "tenant_id": "clinica-x-buenos-aires",
  "tenant_nombre": "Clínica X - Buenos Aires",
  "created_at": "2026-04-02T10:35:00Z",
  "status": "created"
}
```

**Paso 2: Subir Documentos (backend-saas)**

```bash
POST /onboarding/upload
X-API-Key: wh_abc123...

Form Data:
  tenant_id: "clinica-x-buenos-aires"
  files: [documento.pdf, protocolo.txt]

Response 200:
{
  "tenant_id": "clinica-x-buenos-aires",
  "uploaded_files": ["documento.pdf", "protocolo.txt"],
  "total_size_mb": 2.5,
  "upload_date": "2026-04-02T10:40:00Z"
}
```

**Paso 3: Procesar con LLM (backend-agents:8001)**

```bash
POST http://localhost:8001/onboarding/ingest
Content-Type: multipart/form-data

Form Data:
  tenant_id: "clinica-x-buenos-aires"
  api_key: "wh_abc123..."
  form_json: { "tenant_id": "...", ...todo el JSON anterior... }

Response 200:
{
  "tenant_id": "clinica-x-buenos-aires",
  "chunks_created": 245,
  "vectors_indexed": 245,
  "processing_time_seconds": 45,
  "status": "completed"
}
```

**Paso 4: Verificar Estado (backend-saas)**

```bash
GET /onboarding/status/clinica-x-buenos-aires
X-API-Key: wh_abc123...

Response 200:
{
  "tenant_id": "clinica-x-buenos-aires",
  "postgresql_data": {
    "created_at": "2026-04-02T10:35:00Z",
    "entidades": 1,
    "total_records": 15
  },
  "qdrant_data": {
    "collection": "clinica-x-buenos-aires",
    "vector_count": 245,
    "last_indexed": "2026-04-02T11:30:00Z"
  },
  "status": "ready"
}
```

### Flujo 3: Consumir Agente (Ejecutar Queries)

**Escenario:** Usuario final pregunta "¿Cuáles son las especialidades disponibles?"

```bash
POST http://localhost:8001/agent/execute
X-API-Key: wh_abc123...
Content-Type: application/json

Body:
{
  "tenant_id": "clinica-x-buenos-aires",
  "query": "¿Cuáles son las especialidades disponibles?"
}

Response 200:
{
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "tenant_id": "clinica-x-buenos-aires",
  "query": "¿Cuáles son las especialidades disponibles?",
  "result": "Contamos con las siguientes especialidades: Cardiología, Neurología, Dermatología...",
  "processing_time_seconds": 3.2,
  "metadata": {
    "chunks_retrieved": 5,
    "model_used": "gemma3",
    "temperature": 0.7
  }
}
```

---

## Referencia de Endpoints

### AUTENTICACIÓN

#### POST /auth/register

Registra un nuevo usuario en el sistema.

**Permisos:**
- Público (cualquiera puede registrarse)
- Solo admins pueden crear usuarios con `rol` especificado

**Request Body:**

```json
{
  "email": "usuario@empresa.com",
  "password": "SecurePassword123!",
  "rol": "cliente",
  "tenant_id": "clinica-x-buenos-aires"
}
```

**Parámetros:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `email` | string | Sí | Email único. Max 255 caracteres |
| `password` | string | Sí | Min 8 caracteres, 1 mayúscula, 1 número |
| `rol` | string | No | `cliente`, `analista`, `admin`, `superadmin`. Default: `cliente` |
| `tenant_id` | string | No | ID del tenant (requerido si rol=cliente) |

**Response 201:**

```json
{
  "user_id": "usr_550e8400e29b41d4",
  "email": "usuario@empresa.com",
  "rol": "cliente",
  "tenant_id": "clinica-x-buenos-aires",
  "activo": false,
  "created_at": "2026-04-02T10:30:00Z"
}
```

**Errores:**

- `400 Bad Request` - Email inválido, password débil, tenant_id no existe
- `409 Conflict` - Email ya registrado

---

#### POST /auth/login

Autentica un usuario y retorna su API Key.

**Permisos:**
- Público

**Request Body:**

```json
{
  "email": "usuario@empresa.com",
  "password": "SecurePassword123!"
}
```

**Parámetros:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `email` | string | Sí | Email registrado |
| `password` | string | Sí | Contraseña |

**Response 200:**

```json
{
  "api_key": "wh_VzXvpQ5t8K2mN9jL4pR7sW3x6yA1bC8d_E2fG5hJ",
  "user_id": "usr_550e8400e29b41d4",
  "email": "usuario@empresa.com",
  "rol": "cliente",
  "tenant_id": "clinica-x-buenos-aires",
  "activo": true,
  "created_at": "2026-04-02T10:30:00Z",
  "last_login": "2026-04-02T11:00:00Z"
}
```

**Errores:**

- `400 Bad Request` - Email o password faltante
- `401 Unauthorized` - Credenciales inválidas
- `403 Forbidden` - Usuario inactivo

---

#### GET /auth/me

Obtiene los datos del usuario autenticado.

**Permisos:**
- Requiere `X-API-Key` válida

**Headers Requeridos:**

```
X-API-Key: wh_VzXvpQ5t8K2mN9jL4pR7sW3x6yA1bC8d_E2fG5hJ
```

**Response 200:**

```json
{
  "user_id": "usr_550e8400e29b41d4",
  "email": "usuario@empresa.com",
  "rol": "cliente",
  "tenant_id": "clinica-x-buenos-aires",
  "activo": true,
  "created_at": "2026-04-02T10:30:00Z",
  "last_login": "2026-04-02T11:00:00Z"
}
```

**Errores:**

- `401 Unauthorized` - API Key faltante o inválida
- `403 Forbidden` - Usuario inactivo

---

#### GET /auth/users

Lista todos los usuarios del sistema.

**Permisos:**
- Solo `admin` o `superadmin`

**Headers Requeridos:**

```
X-API-Key: wh_VzXvpQ5t8K2mN9jL4pR7sW3x6yA1bC8d_E2fG5hJ
```

**Query Parameters:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `skip` | integer | Número de registros a saltar. Default: 0 |
| `limit` | integer | Número de registros a retornar. Default: 50, Max: 100 |
| `rol` | string | Filtrar por rol (cliente, analista, admin, superadmin) |
| `activo` | boolean | Filtrar por estado (true/false) |

**Response 200:**

```json
{
  "total": 45,
  "skip": 0,
  "limit": 50,
  "users": [
    {
      "user_id": "usr_550e8400e29b41d4",
      "email": "usuario@empresa.com",
      "rol": "cliente",
      "tenant_id": "clinica-x-buenos-aires",
      "activo": true,
      "created_at": "2026-04-02T10:30:00Z"
    },
    {
      "user_id": "usr_a1b2c3d4e5f6g7h8",
      "email": "otro@empresa.com",
      "rol": "analista",
      "tenant_id": null,
      "activo": false,
      "created_at": "2026-04-01T15:20:00Z"
    }
  ]
}
```

**Errores:**

- `401 Unauthorized` - API Key inválida
- `403 Forbidden` - No es admin/superadmin

---

#### POST /auth/activate

Activa un usuario inactivo.

**Permisos:**
- Solo `admin` o `superadmin`

**Headers Requeridos:**

```
X-API-Key: wh_VzXvpQ5t8K2mN9jL4pR7sW3x6yA1bC8d_E2fG5hJ
```

**Request Body:**

```json
{
  "user_id": "usr_a1b2c3d4e5f6g7h8"
}
```

**Parámetros:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `user_id` | string | Sí | ID del usuario a activar |

**Response 200:**

```json
{
  "user_id": "usr_a1b2c3d4e5f6g7h8",
  "email": "otro@empresa.com",
  "activo": true,
  "updated_at": "2026-04-02T11:15:00Z"
}
```

**Errores:**

- `401 Unauthorized` - API Key inválida
- `403 Forbidden` - No es admin/superadmin
- `404 Not Found` - Usuario no existe
- `409 Conflict` - Usuario ya activo

---

### ONBOARDING

#### POST /onboarding/tenant

Crea un nuevo tenant (empresa/negocio) con datos estructurados.

**Permisos:**
- Requiere `X-API-Key` válida y rol `analista` o `admin`

**Headers Requeridos:**

```
X-API-Key: wh_VzXvpQ5t8K2mN9jL4pR7sW3x6yA1bC8d_E2fG5hJ
Content-Type: application/json
```

**Request Body:**

```json
{
  "tenant_id": "clinica-x-buenos-aires",
  "tenant_nombre": "Clínica X - Buenos Aires",
  "created_by": "analista_interno",
  "industria": "salud",
  "subcategoria": "clinica_multiespialista",
  "descripcion_corta": "Clínica privada multiespecialista con 50+ profesionales",
  "ubicacion": "Buenos Aires, Argentina",
  "idioma": "es",
  "proposito_principal": "Agendar turnos y consultar coberturas",
  "acciones_habilitadas": [
    "agendar_turno",
    "consultar_cobertura",
    "ver_especialidades"
  ],
  "acciones_prohibidas": [
    "modificar_historia",
    "acceder_datos_paciente"
  ],
  "tono": "profesional_y_cercano",
  "mensaje_fallback": "Lo siento, no puedo ayudarte con eso.",
  "entidades_clave": [
    {
      "nombre": "Especialidades",
      "descripcion": "Especialidades médicas disponibles",
      "storage": "postgresql_y_qdrant",
      "es_consultable_directamente": true,
      "atributos": ["nombre", "descripcion", "tiempo_consulta"]
    },
    {
      "nombre": "Coberturas",
      "descripcion": "Planes de salud aceptados",
      "storage": "postgresql",
      "es_consultable_directamente": false,
      "atributos": ["nombre", "cobertura_porcentaje"]
    }
  ]
}
```

**Parámetros:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `tenant_id` | string | Sí | ID único en el sistema (lowercase, max 64 chars) |
| `tenant_nombre` | string | Sí | Nombre legible de la empresa |
| `created_by` | string | Sí | Usuario/admin que crea el tenant |
| `industria` | string | Sí | `salud`, `educacion`, `comercio`, etc |
| `subcategoria` | string | No | Subcategoría específica |
| `descripcion_corta` | string | Sí | Descripción breve (max 500 chars) |
| `ubicacion` | string | No | Ubicación geográfica |
| `idioma` | string | Sí | Código ISO 639-1: `es`, `en`, `pt` |
| `proposito_principal` | string | Sí | Objetivo principal del agent |
| `acciones_habilitadas` | array | Sí | Acciones permitidas |
| `acciones_prohibidas` | array | No | Acciones prohibidas (explícitamente) |
| `tono` | string | Sí | Tono de respuesta del agent |
| `mensaje_fallback` | string | Sí | Mensaje cuando agent no puede responder |
| `entidades_clave` | array | Sí | Entidades de datos (ver estructura abajo) |

**Estructura de entidades_clave:**

```json
{
  "nombre": "string (requerido)",
  "descripcion": "string (requerido)",
  "storage": "postgresql | qdrant | postgresql_y_qdrant (requerido)",
  "es_consultable_directamente": "boolean",
  "atributos": ["string"]
}
```

**Response 201:**

```json
{
  "tenant_id": "clinica-x-buenos-aires",
  "tenant_nombre": "Clínica X - Buenos Aires",
  "created_by": "analista_interno",
  "industria": "salud",
  "created_at": "2026-04-02T10:35:00Z",
  "status": "created"
}
```

**Errores:**

- `400 Bad Request` - JSON inválido o campos faltantes
- `401 Unauthorized` - API Key inválida
- `403 Forbidden` - No tiene permisos (debe ser analista+)
- `409 Conflict` - tenant_id ya existe

---

#### POST /onboarding/upload

Sube archivos (PDFs, TXTs) para un tenant.

**Permisos:**
- Requiere `X-API-Key` válida y rol `analista` o `admin`

**Headers Requeridos:**

```
X-API-Key: wh_VzXvpQ5t8K2mN9jL4pR7sW3x6yA1bC8d_E2fG5hJ
Content-Type: multipart/form-data
```

**Form Data:**

```
tenant_id: clinica-x-buenos-aires
files: [documento.pdf, protocolo.txt, imagen.jpg]
```

**Parámetros:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `tenant_id` | string | Sí | ID del tenant destino |
| `files` | file[] | Sí | Archivos a subir (PDF, TXT, JPG, PNG) |

**Response 200:**

```json
{
  "tenant_id": "clinica-x-buenos-aires",
  "uploaded_files": [
    "documento.pdf",
    "protocolo.txt",
    "imagen.jpg"
  ],
  "total_size_mb": 2.5,
  "upload_date": "2026-04-02T10:40:00Z",
  "status": "uploaded"
}
```

**Errores:**

- `400 Bad Request` - tenant_id faltante o archivos vacíos
- `401 Unauthorized` - API Key inválida
- `403 Forbidden` - No tiene permisos
- `404 Not Found` - tenant_id no existe
- `413 Payload Too Large` - Archivo > 50MB

---

#### GET /onboarding/status/{tenant_id}

Obtiene el estado actual del onboarding de un tenant (datos en PostgreSQL y Qdrant).

**Permisos:**
- Requiere `X-API-Key` válida

**Headers Requeridos:**

```
X-API-Key: wh_VzXvpQ5t8K2mN9jL4pR7sW3x6yA1bC8d_E2fG5hJ
```

**Path Parameters:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `tenant_id` | string | ID del tenant |

**Response 200:**

```json
{
  "tenant_id": "clinica-x-buenos-aires",
  "postgresql_data": {
    "tenant_nombre": "Clínica X - Buenos Aires",
    "created_at": "2026-04-02T10:35:00Z",
    "industria": "salud",
    "entidades_count": 2,
    "total_records": 15
  },
  "qdrant_data": {
    "collection": "clinica-x-buenos-aires",
    "vector_count": 245,
    "dimensions": 384,
    "last_indexed": "2026-04-02T11:30:00Z"
  },
  "status": "ready",
  "completeness_percent": 100
}
```

**Respuesta si aún no se ha hecho ingest:**

```json
{
  "tenant_id": "clinica-x-buenos-aires",
  "postgresql_data": {
    "tenant_nombre": "Clínica X - Buenos Aires",
    "created_at": "2026-04-02T10:35:00Z"
  },
  "qdrant_data": null,
  "status": "pending_ingest",
  "completeness_percent": 50
}
```

**Errores:**

- `401 Unauthorized` - API Key inválida
- `404 Not Found` - tenant_id no existe

---

### TENANT

#### GET /tenant/me

Obtiene los datos del tenant del usuario actual.

**Permisos:**
- Requiere `X-API-Key` válida
- Usuario debe ser rol `cliente` o tener tenant asociado

**Headers Requeridos:**

```
X-API-Key: wh_VzXvpQ5t8K2mN9jL4pR7sW3x6yA1bC8d_E2fG5hJ
```

**Response 200:**

```json
{
  "tenant_id": "clinica-x-buenos-aires",
  "tenant_nombre": "Clínica X - Buenos Aires",
  "industria": "salud",
  "descripcion_corta": "Clínica privada multiespecialista",
  "ubicacion": "Buenos Aires, Argentina",
  "idioma": "es",
  "proposito_principal": "Agendar turnos",
  "created_at": "2026-04-02T10:35:00Z"
}
```

**Errores:**

- `401 Unauthorized` - API Key inválida
- `403 Forbidden` - Usuario no tiene tenant asociado
- `404 Not Found` - tenant_id no existe

---

## Ejemplos cURL

### Ejemplo 1: Registrarse y Hacer Login

```bash
#!/bin/bash

BASE_URL="http://localhost:8000"

# Paso 1: Registrarse
echo "=== 1. Registrando usuario ==="
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan@clinica-x.com",
    "password": "SecurePass123!",
    "rol": "cliente",
    "tenant_id": "clinica-x-buenos-aires"
  }')

echo "$REGISTER_RESPONSE" | jq .
USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.user_id')

# Paso 2: Admin activa el usuario (simulado con API Key de admin)
echo ""
echo "=== 2. Admin activa usuario ==="
ADMIN_API_KEY="wh_admin_key_example"
curl -s -X POST "$BASE_URL/auth/activate" \
  -H "X-API-Key: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\": \"$USER_ID\"}" | jq .

# Paso 3: Usuario hace login
echo ""
echo "=== 3. Usuario hace login ==="
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan@clinica-x.com",
    "password": "SecurePass123!"
  }')

echo "$LOGIN_RESPONSE" | jq .
API_KEY=$(echo "$LOGIN_RESPONSE" | jq -r '.api_key')

# Paso 4: Obtener datos del usuario autenticado
echo ""
echo "=== 4. Obtener datos del usuario ==="
curl -s -X GET "$BASE_URL/auth/me" \
  -H "X-API-Key: $API_KEY" | jq .
```

### Ejemplo 2: Flujo Completo de Onboarding

```bash
#!/bin/bash

BASE_URL="http://localhost:8000"
AGENTS_BASE_URL="http://localhost:8001"
API_KEY="wh_your_api_key_here"
TENANT_ID="clinica-x-buenos-aires"

# Paso 1: Crear tenant
echo "=== 1. Creando tenant ==="
curl -s -X POST "$BASE_URL/onboarding/tenant" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "'$TENANT_ID'",
    "tenant_nombre": "Clínica X - Buenos Aires",
    "created_by": "analista_001",
    "industria": "salud",
    "subcategoria": "clinica_multiespialista",
    "descripcion_corta": "Clínica privada multiespecialista con 50+ profesionales",
    "ubicacion": "Buenos Aires, Argentina",
    "idioma": "es",
    "proposito_principal": "Agendar turnos y consultar coberturas",
    "acciones_habilitadas": ["agendar_turno", "consultar_cobertura", "ver_especialidades"],
    "acciones_prohibidas": ["modificar_historia", "acceder_datos_paciente"],
    "tono": "profesional_y_cercano",
    "mensaje_fallback": "Lo siento, no puedo ayudarte con eso.",
    "entidades_clave": [
      {
        "nombre": "Especialidades",
        "descripcion": "Especialidades médicas disponibles",
        "storage": "postgresql_y_qdrant",
        "es_consultable_directamente": true,
        "atributos": ["nombre", "descripcion", "tiempo_consulta"]
      }
    ]
  }' | jq .

# Paso 2: Subir archivos
echo ""
echo "=== 2. Subiendo archivos ==="
curl -s -X POST "$BASE_URL/onboarding/upload" \
  -H "X-API-Key: $API_KEY" \
  -F "tenant_id=$TENANT_ID" \
  -F "files=@documento.pdf" \
  -F "files=@protocolo.txt" | jq .

# Paso 3: Ejecutar ingest en backend-agents
echo ""
echo "=== 3. Procesando con LLM (backend-agents) ==="
curl -s -X POST "$AGENTS_BASE_URL/onboarding/ingest" \
  -F "tenant_id=$TENANT_ID" \
  -F "api_key=$API_KEY" \
  -F "form_json=@form_data.json" | jq .

# Paso 4: Verificar estado
echo ""
echo "=== 4. Verificando estado ==="
curl -s -X GET "$BASE_URL/onboarding/status/$TENANT_ID" \
  -H "X-API-Key: $API_KEY" | jq .
```

### Ejemplo 3: Ejecutar Agent (Query)

```bash
#!/bin/bash

AGENTS_BASE_URL="http://localhost:8001"
API_KEY="wh_your_api_key_here"
TENANT_ID="clinica-x-buenos-aires"

echo "=== Ejecutando query en agent ==="
curl -s -X POST "$AGENTS_BASE_URL/agent/execute" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "'$TENANT_ID'",
    "query": "¿Cuáles son las especialidades disponibles?"
  }' | jq .
```

### Ejemplo 4: Listar Usuarios (Admin Only)

```bash
#!/bin/bash

BASE_URL="http://localhost:8000"
ADMIN_API_KEY="wh_admin_api_key"

echo "=== Listando usuarios ==="
curl -s -X GET "$BASE_URL/auth/users?skip=0&limit=10&activo=true" \
  -H "X-API-Key: $ADMIN_API_KEY" | jq .
```

---

## Errores y Códigos de Estado

### Tabla de Códigos HTTP

| Código | Nombre | Descripción | Ejemplo |
|--------|--------|-------------|---------|
| **200** | OK | Solicitud exitosa | GET /auth/me |
| **201** | Created | Recurso creado exitosamente | POST /onboarding/tenant |
| **400** | Bad Request | Datos inválidos o faltantes | email inválido en register |
| **401** | Unauthorized | API Key faltante o inválida | X-API-Key: wh_invalid |
| **403** | Forbidden | No tiene permisos para acceder | cliente intentando listar usuarios |
| **404** | Not Found | Recurso no existe | GET /onboarding/status/inexistente |
| **409** | Conflict | Recurso ya existe o estado inconsistente | email duplicado |
| **413** | Payload Too Large | Archivo excede límite | archivo > 50MB |
| **429** | Too Many Requests | Límite de rate limiting alcanzado | 100+ requests/min |
| **500** | Server Error | Error interno del servidor | conexión DB falló |
| **502** | Bad Gateway | Servicio downstream no disponible | backend-agents offline |
| **503** | Service Unavailable | Servicio temporalmente indisponible | PostgreSQL en mantenimiento |

### Estructura de Errores

Todos los errores siguen este formato:

```json
{
  "detail": "Descripción del error",
  "error_code": "ERROR_CODE",
  "status_code": 400,
  "timestamp": "2026-04-02T11:00:00Z",
  "trace_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Errores Comunes

#### 401 Unauthorized - API Key Inválida

```json
{
  "detail": "API Key requerida. Usá POST /auth/login para obtenerla.",
  "error_code": "MISSING_API_KEY",
  "status_code": 401,
  "headers": {
    "WWW-Authenticate": "ApiKey"
  }
}
```

**Solución:** Obtener API Key con POST /auth/login

#### 409 Conflict - Email Duplicado

```json
{
  "detail": "Email 'juan@empresa.com' ya está registrado",
  "error_code": "DUPLICATE_EMAIL",
  "status_code": 409
}
```

**Solución:** Usar otro email o hacer login si el usuario ya existe

#### 403 Forbidden - Permisos Insuficientes

```json
{
  "detail": "Solo admins pueden realizar esta acción",
  "error_code": "INSUFFICIENT_PERMISSIONS",
  "status_code": 403
}
```

**Solución:** Usar cuenta con rol admin/superadmin

#### 404 Not Found - Tenant No Existe

```json
{
  "detail": "Tenant 'inexistente' no encontrado",
  "error_code": "TENANT_NOT_FOUND",
  "status_code": 404
}
```

**Solución:** Verificar que el tenant_id sea correcto

---

## Notas Finales

### Rate Limiting

- **Límite:** 100 requests por minuto por IP
- **Header de respuesta:** `X-RateLimit-Remaining: 95`
- **Si se alcanza:** HTTP 429 (Too Many Requests)
- **Espera recomendada:** 1 minuto antes de reintentar

### Zonas Horarias

Todos los timestamps están en **ISO 8601 UTC** (formato: `2026-04-02T11:00:00Z`).

Para convertir a tu zona horaria local:
- Argentina (Buenos Aires): UTC-3
- España (Madrid): UTC+2 (verano) / UTC+1 (invierno)

Ejemplo en JavaScript:
```javascript
const date = new Date("2026-04-02T11:00:00Z");
const argDate = new Date(date.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }));
```

### CORS (Cross-Origin Resource Sharing)

El backend acepta requests desde:

```
http://localhost:3001
http://127.0.0.1:3001
https://webshooks.com (producción)
```

Para agregar más orígenes, configurar en `ALLOWED_ORIGINS` (env var).

### Seguridad

- **Contraseñas:** Hasheadas con bcrypt (SHA256 pre-hash + bcrypt)
- **API Keys:** Almacenadas en base de datos (no reversibles)
- **Headers:**
  - `X-API-Key` siempre en HTTPS (producción)
  - No envíes API Key en URL o body
  - Regenerar API Key: cambiar password

### Versionado

- **API Version:** 1.0.0
- **Breaking Changes:** Se anunciarán con 90 días de anticipación
- **Deprecated:** Endpoints obsoletos se marcarán con `@deprecated`

### Soporte y Contacto

| Categoría | Contacto |
|-----------|----------|
| **Bugs técnicos** | `tech-support@webshooks.com` |
| **Facturación** | `billing@webshooks.com` |
| **Consultas generales** | `hello@webshooks.com` |
| **Documentación** | https://docs.webshooks.com |
| **Status de servicio** | https://status.webshooks.com |

### Mejores Prácticas

1. **Almacenar API Key de forma segura**
   - No guardes en git o código fuente
   - Usa variables de entorno
   - Rotá periódicamente

2. **Manejo de Errores**
   - Siempre parsear response body
   - Usar `trace_id` para debugging
   - Implementar reintentos exponenciales

3. **Optimización**
   - Cachear respuestas estables
   - Usar batch operations cuando sea posible
   - Monitorear latencia con `X-Process-Time`

4. **Testing**
   - Usar sandbox/staging antes de producción
   - Implementar tests de integración
   - Verificar rate limiting

---

**Última actualización:** 2 de abril de 2026
**Próxima revisión:** 2 de mayo de 2026

Para actualizaciones y cambios, suscribirse a: `docs-updates@webshooks.com`
