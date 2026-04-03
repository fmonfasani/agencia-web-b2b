# Guía End-to-End: Test Completo vía Swagger UI

Esta guía cubre el flujo completo desde registrar un usuario hasta que el cliente final consulta al asistente IA. Funciona igual en local y en VPS.

---

## Acceso a Swagger UI

- **Local:** http://localhost:8000/docs
- **VPS:** https://tu-dominio.com/docs

---

## PASO 1 — Registrar usuario admin

**Endpoint:** `POST /auth/register`

JSON a pegar en el body:
```json
{
  "email": "admin@miempresa.com",
  "password": "Admin1234",
  "nombre": "Admin Principal",
  "role": "admin"
}
```

**Respuesta esperada:**
```json
{
  "status": "pendiente",
  "email": "admin@miempresa.com",
  "rol": "cliente"
}
```

> El sistema crea el usuario como `cliente` y `pendiente` por seguridad. El primer admin debe activarse manualmente en la base de datos (ver Paso 2).

---

## PASO 2 — Activar y promover a admin (solo la primera vez)

Esto se hace una única vez para el primer admin. Conectarse a la base de datos y ejecutar:

```sql
UPDATE "User"
SET role = 'ADMIN', status = 'ACTIVE'
WHERE email = 'admin@miempresa.com';
```

**Con Docker en local:**
```
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d agencia_web_b2b -c "UPDATE \"User\" SET role='ADMIN', status='ACTIVE' WHERE email='admin@miempresa.com';"
```

---

## PASO 3 — Login y obtener API Key

**Endpoint:** `POST /auth/login`

JSON:
```json
{
  "email": "admin@miempresa.com",
  "password": "Admin1234"
}
```

**Respuesta esperada:**
```json
{
  "id": "c_xxxxxxxxxxxxx",
  "api_key": "wh_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "email": "admin@miempresa.com",
  "nombre": "Admin Principal",
  "rol": "admin",
  "tenant_id": null,
  "mensaje": "Bienvenido Admin Principal. Copiá tu api_key y usala en Authorize."
}
```

> **Copiá el valor de `api_key`.** Lo vas a usar en todos los pasos siguientes.

---

## PASO 4 — Autorizar en Swagger

1. Hacer click en el botón **Authorize** (candado arriba a la derecha en Swagger UI)
2. En el campo **`X-API-Key`** pegar el valor de `api_key` obtenido en el Paso 3
3. Hacer click en **Authorize** y luego en **Close**

A partir de este punto todos los endpoints usan tu API Key automáticamente.

---

## PASO 5 — Crear el tenant (negocio del cliente)

**Endpoint:** `POST /onboarding/tenant`

Este endpoint carga la configuración completa del negocio en PostgreSQL.

JSON:
```json
{
  "tenant_id": "mi-empresa",
  "tenant_nombre": "Mi Empresa SaaS",
  "industria": "servicios",
  "subcategoria": "Software B2B",
  "descripcion_corta": "Plataforma de automatización para empresas",
  "proposito_principal": "Responder consultas de clientes sobre productos, precios y soporte",
  "acciones_habilitadas": ["responder", "consultar", "derivar"],
  "acciones_prohibidas": ["comprar", "modificar_datos"],
  "tono": "profesional_y_cercano",
  "mensaje_fallback": "No tengo esa información disponible. Te recomiendo contactar a nuestro equipo en soporte@miempresa.com",
  "coberturas": [],
  "sedes": [
    {
      "nombre": "Oficina Central",
      "direccion": "Av. Corrientes 1234, CABA, Argentina",
      "telefonos": ["1134567890", "1187654321"],
      "mail": "info@miempresa.com",
      "horario_semana": "Lunes a Viernes 9:00 - 18:00",
      "horario_sabado": "Sábados 10:00 - 14:00"
    }
  ],
  "servicios": [
    {
      "nombre": "Plan Starter",
      "categoria": "producto",
      "descripcion": "Hasta 3 agentes IA, 1.000 consultas/mes. Precio: USD 99/mes"
    },
    {
      "nombre": "Plan Pro",
      "categoria": "producto",
      "descripcion": "Hasta 10 agentes IA, 10.000 consultas/mes, CRM integrado. Precio: USD 299/mes"
    },
    {
      "nombre": "Plan Enterprise",
      "categoria": "producto",
      "descripcion": "Agentes ilimitados, consultas ilimitadas, soporte 24/7, SLA garantizado. Precio: a consultar"
    },
    {
      "nombre": "Integración CRM",
      "categoria": "addon",
      "descripcion": "Conector con Salesforce, HubSpot y Zoho. Precio: USD 49/mes adicional"
    }
  ],
  "entidades_clave": [
    {
      "nombre": "plan",
      "descripcion": "Plan de precios y funcionalidades",
      "storage": "qdrant",
      "es_consultable_directamente": true,
      "atributos": ["nombre", "precio", "funcionalidades", "limite_consultas"]
    },
    {
      "nombre": "integracion",
      "descripcion": "Integraciones disponibles con otros sistemas",
      "storage": "qdrant",
      "es_consultable_directamente": true,
      "atributos": ["nombre", "precio", "sistemas_compatibles"]
    }
  ],
  "hints": {
    "industria_context": "Empresa de software SaaS B2B en Argentina que ofrece agentes IA para automatización de atención al cliente",
    "terminos_clave": ["agente", "IA", "plan", "precio", "consultas", "integracion", "CRM", "soporte"],
    "preguntas_frecuentes_esperadas": [
      "Cuanto cuesta el plan Pro?",
      "Que incluye el Plan Starter?",
      "Tienen integración con Salesforce?",
      "Como funciona el soporte?",
      "Cual es el horario de atención?"
    ],
    "entidades_de_alta_frecuencia": ["plan", "precio", "integracion"],
    "datos_ausentes_conocidos": ["precios del Plan Enterprise"]
  },
  "routing_rules": []
}
```

**Respuesta esperada:**
```json
{
  "status": "ok",
  "tenant_id": "mi-empresa",
  "mensaje": "Tenant 'Mi Empresa SaaS' creado correctamente en PostgreSQL",
  "datos_cargados": {
    "coberturas": 0,
    "sedes": 1,
    "servicios": 4,
    "routing_rules": 0
  },
  "proximo_paso": "POST http://localhost:8001/onboarding/ingest (backend-agents)"
}
```

---

## PASO 6 — Subir documentos de conocimiento

**Endpoint:** `POST /onboarding/upload`

Este endpoint acepta archivos (PDF, TXT, XLSX, CSV) con información del negocio.

En Swagger:
1. Ir a `POST /onboarding/upload`
2. Click en **Try it out**
3. En el campo `tenant_id` escribir: `mi-empresa`
4. En el campo `file1` hacer click en **Choose File** y seleccionar tu archivo

**Tipos de archivos recomendados:**
- `catalogo_productos.pdf` — Catálogo de productos con precios detallados
- `faq.txt` — Preguntas frecuentes respondidas
- `manual_soporte.pdf` — Guía de soporte técnico

**Respuesta esperada:**
```json
{
  "status": "ok",
  "tenant_id": "mi-empresa",
  "archivos_guardados": [
    {
      "nombre": "catalogo_productos.pdf",
      "tamaño_bytes": 45230,
      "tipo": ".pdf"
    }
  ],
  "errores": [],
  "mensaje": "1 archivo(s) subido(s) correctamente",
  "proximo_paso": "POST http://localhost:8001/onboarding/ingest (backend-agents)"
}
```

> Si no tenés archivos, el sistema igual funciona con los datos del formulario del Paso 5.

---

## PASO 7 — Ejecutar el ingest (procesar documentos con IA)

El ingest procesa los archivos subidos con el LLM local (Ollama) y los vectoriza en Qdrant. Este paso se ejecuta directamente en backend-agents.

**Con Docker en local** (mientras no está expuesto via Swagger):
```
docker compose -f docker-compose.prod.yml exec backend-agents python -c "
import asyncio, httpx, json
form = json.dumps({
  'tenant_id': 'mi-empresa',
  'tenant_nombre': 'Mi Empresa SaaS',
  'industria': 'servicios',
  'subcategoria': 'Software B2B',
  'descripcion_corta': 'Plataforma de automatización para empresas',
  'proposito_principal': 'Responder consultas de clientes sobre productos, precios y soporte',
  'acciones_habilitadas': ['responder', 'consultar', 'derivar'],
  'mensaje_fallback': 'No tengo esa información. Contactá a soporte@miempresa.com',
  'servicios': [
    {'nombre': 'Plan Starter', 'categoria': 'producto', 'descripcion': 'Hasta 3 agentes IA. Precio: USD 99/mes'},
    {'nombre': 'Plan Pro', 'categoria': 'producto', 'descripcion': 'Hasta 10 agentes, CRM integrado. Precio: USD 299/mes'},
    {'nombre': 'Plan Enterprise', 'categoria': 'producto', 'descripcion': 'Ilimitado, soporte 24/7. Precio: a consultar'}
  ],
  'sedes': [{'nombre': 'Oficina Central', 'direccion': 'Av. Corrientes 1234', 'telefonos': ['1134567890'], 'mail': 'info@miempresa.com', 'horario_semana': 'Lun-Vie 9-18hs'}],
  'entidades_clave': [{'nombre': 'plan', 'descripcion': 'Plan de precios', 'storage': 'qdrant', 'es_consultable_directamente': True, 'atributos': ['nombre', 'precio']}],
  'hints': {'industria_context': 'SaaS B2B Argentina', 'terminos_clave': ['plan', 'precio', 'agente', 'IA'], 'preguntas_frecuentes_esperadas': ['Cuanto cuesta?', 'Que incluye?'], 'entidades_de_alta_frecuencia': ['plan'], 'datos_ausentes_conocidos': []}
})
async def run():
    async with httpx.AsyncClient(timeout=180) as c:
        r = await c.post('http://localhost:8001/onboarding/ingest',
            data={'tenant_id': 'mi-empresa', 'form_json': form, 'api_key': 'TU_API_KEY_AQUI'})
        print(r.text)
asyncio.run(run())
"
```

> Reemplazar `TU_API_KEY_AQUI` con el valor obtenido en el Paso 3.

**Respuesta esperada:**
```json
{
  "tenant_id": "mi-empresa",
  "chunks_generados": 7,
  "chunks_almacenados": 7,
  "modelo_usado": "gemma3:latest",
  "errores": [],
  "tiempo_ms": 62000
}
```

> El ingest puede tardar entre 30 segundos y 3 minutos dependiendo de la cantidad de documentos y el hardware.

---

## PASO 8 — Verificar estado del tenant

**Endpoint:** `GET /onboarding/status/{tenant_id}`

En Swagger:
1. Ir a `GET /onboarding/status/{tenant_id}`
2. En el campo `tenant_id` escribir: `mi-empresa`
3. Ejecutar

**Respuesta esperada:**
```json
{
  "tenant_id": "mi-empresa",
  "existe_en_db": true,
  "nombre": "Mi Empresa SaaS",
  "servicios_count": 4,
  "sedes_count": 1,
  "coberturas_count": 0,
  "qdrant_collection": "tenant_mi-empresa",
  "qdrant_vectors_count": 7
}
```

Si `qdrant_vectors_count` es mayor a 0, el ingest fue exitoso y el agente tiene conocimiento para responder.

---

## PASO 9 — Consultar la configuración del agente

**Endpoint:** `GET /agent/config`

Query param: `tenant_id=mi-empresa`

En Swagger:
1. Ir a `GET /agent/config`
2. En el campo `tenant_id` escribir: `mi-empresa`
3. Ejecutar

**Respuesta esperada:**
```json
{
  "tenant_id": "mi-empresa",
  "nombre": "Mi Empresa SaaS",
  "descripcion": "Plataforma de automatización para empresas",
  "servicios": [
    {"nombre": "Plan Starter", "categoria": "producto", "descripcion": "..."},
    {"nombre": "Plan Pro", "categoria": "producto", "descripcion": "..."}
  ],
  "sedes": [
    {"nombre": "Oficina Central", "direccion": "Av. Corrientes 1234 CABA"}
  ],
  "coberturas": [],
  "routing_rules": []
}
```

---

## PASO 10 — Ejecutar consulta al agente (el flujo del cliente final)

Este es el endpoint principal. Simula lo que haría el cliente de tu cliente al consultar al asistente IA.

**Endpoint:** `POST /agent/execute`

JSON — consulta sobre precios:
```json
{
  "tenant_id": "mi-empresa",
  "query": "Que planes tienen disponibles y cuanto cuestan?",
  "enable_detailed_trace": false
}
```

**Respuesta esperada:**
```json
{
  "trace_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "tenant_id": "mi-empresa",
  "query": "Que planes tienen disponibles y cuanto cuestan?",
  "iterations": 1,
  "result": [
    {
      "role": "assistant",
      "content": "Tenemos 3 planes disponibles: Plan Starter a USD 99/mes (hasta 3 agentes, 1.000 consultas), Plan Pro a USD 299/mes (hasta 10 agentes, CRM incluido) y Plan Enterprise con precio a consultar (ilimitado con soporte 24/7)."
    }
  ],
  "metadata": {
    "iterations": 1,
    "llm_calls": 1,
    "rag_hits_count": 5,
    "finish_reason": "results_found",
    "model": "gemma3:latest",
    "embedding_ms": 85,
    "rag_ms": 30,
    "llm_ms": 8500
  },
  "total_duration_ms": 9200,
  "timestamp_start": "2026-04-03T04:00:00",
  "timestamp": "2026-04-03T04:00:09"
}
```

**Otros ejemplos de queries para probar:**

Query sobre soporte:
```json
{
  "tenant_id": "mi-empresa",
  "query": "Como funciona el soporte tecnico?",
  "enable_detailed_trace": false
}
```

Query sobre integraciones:
```json
{
  "tenant_id": "mi-empresa",
  "query": "Tienen integracion con Salesforce o HubSpot?",
  "enable_detailed_trace": false
}
```

Query sobre horarios:
```json
{
  "tenant_id": "mi-empresa",
  "query": "Cual es el horario de atencion?",
  "enable_detailed_trace": false
}
```

Query con trace detallado (para debugging):
```json
{
  "tenant_id": "mi-empresa",
  "query": "Que incluye el Plan Pro?",
  "enable_detailed_trace": true,
  "max_iterations": 3
}
```

---

## PASO 11 — Ver trazas de ejecución

**Endpoint:** `GET /agent/traces`

Query params: `tenant_id=mi-empresa&limit=10`

Devuelve el historial de consultas ejecutadas con sus resultados, útil para auditoría y debugging.

---

## PASO 12 — Ver métricas del agente

**Endpoint:** `GET /agent/metrics/agent`

Query param: `tenant_id=mi-empresa`

Devuelve estadísticas de uso: cantidad de consultas, iteraciones promedio, tasa de éxito, etc.

---

## Indicadores de éxito por paso

| Paso | Indicador de éxito |
|------|--------------------|
| Register | `status: pendiente` en la respuesta |
| Login | Recibir `api_key` que empieza con `wh_` |
| Authorize | Candado cerrado en Swagger |
| Crear tenant | `status: ok` con `datos_cargados` |
| Upload | `archivos_guardados` con tamaño > 0 |
| Ingest | `chunks_almacenados` > 0 |
| Status | `qdrant_vectors_count` > 0 |
| Execute | `result` no vacío y `llm_calls: 1` |

---

## Troubleshooting rápido

**`result: []` con `finish_reason: no_results`**
El ingest no generó chunks o el query no matchea el contenido. Re-ejecutar el ingest con datos más completos.

**`finish_reason: rag_only` con `llm_calls: 1`**
El LLM se llamó pero devolvió el mensaje de fallback. El contexto RAG no tenía información relevante al query. Probar con un query más específico que coincida con los datos ingresados.

**`detail: Agent service unavailable`**
El backend-agents no está corriendo. Verificar con `docker compose ps`.

**`detail: API Key inválida`**
El usuario no está activo o la API key venció. Re-hacer login.

**Ingest tarda más de 3 minutos**
Normal con CPU-only y modelo gemma3. En VPS con más RAM puede mejorar. Considerar usar `qwen2.5:0.5b` como modelo alternativo más rápido.

---

## Flujo resumido visual

```
[Usuario Admin]
      |
      v
POST /auth/register → POST /auth/login → Authorize en Swagger
      |
      v
POST /onboarding/tenant (datos del negocio)
      |
      v
POST /onboarding/upload (archivos PDF/TXT)
      |
      v
Ingest en backend-agents (LLM procesa y vectoriza)
      |
      v
GET /onboarding/status (verificar chunks en Qdrant)
      |
      v
POST /agent/execute (el cliente final hace su consulta)
      |
      v
[Respuesta del asistente IA]
```
