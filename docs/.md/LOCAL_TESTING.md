# 🧪 LOCAL TESTING GUIDE - Webshooks Platform

**Objetivo:** Levantar el ambiente completo localmente y testear todos los endpoints

---

## ✅ REQUISITOS PREVIOS

### Software necesario:
- Docker Desktop instalado (con Docker Compose v2.8+)
- Ollama instalado (`ollama.ai`)
- curl o Postman
- 16 GB RAM mínimo

### Verificar:
```bash
docker --version
docker compose version
ollama --version
```

---

## 🚀 PASO 1: Levantar Ollama

**Importante:** Ollama debe estar corriendo ANTES de los servicios.

```bash
# Terminal 1: Iniciar Ollama server
ollama serve

# Terminal 2: Descargar modelos (en paralelo)
ollama pull gemma3:latest
ollama pull nomic-embed-text

# Verificar:
ollama list
```

⏱️ **Tiempo:** ~5-10 minutos

---

## 🚀 PASO 2: Levantar Servicios

```bash
cd /tu/path/agencia-web-b2b

# Opción A: Compose de desarrollo
docker compose up -d

# Opción B: Compose de producción
docker compose -f docker-compose.prod.yml up -d

# Ver estado:
docker compose ps

# Ver logs en tiempo real:
docker compose logs -f backend-saas backend-agents
```

**Esperar a que todos estén "healthy"** (2-3 minutos)

---

## 🔧 PASO 3: Inicializar BD

```bash
# Crear tablas y usuario admin
docker compose exec backend-saas python -m app.db.seed

# Verificar tablas:
docker compose exec postgres psql -U postgres -d agencia_web_b2b -c "\dt"
```

---

## 🧪 PASO 4: Testear Endpoints

### Test 1: Health (sin auth)

```bash
curl -s http://localhost:8000/health | jq '.'
```

### Test 2: Register User

```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@clinic.ar",
    "password": "TestPass123!",
    "nombre": "Test User",
    "rol": "cliente",
    "tenant_id": "clinic-test"
  }'

# Guardar: USER_ID
```

### Test 3: Activate User

```bash
# Primero necesitas el API key del admin (creado en seed)
# O usa: X-API-Key: wh_admin_default

curl -X POST http://localhost:8000/auth/activate \
  -H "X-API-Key: wh_admin_key" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\": \"$USER_ID\"}"
```

### Test 4: Login (obtener API Key)

```bash
API_KEY=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@clinic.ar",
    "password": "TestPass123!"
  }' | jq -r '.api_key')

echo "API Key: $API_KEY"
```

### Test 5: Get Current User

```bash
curl -s http://localhost:8000/auth/me \
  -H "X-API-Key: $API_KEY" | jq '.'
```

### Test 6: Create Tenant

```bash
curl -X POST http://localhost:8000/onboarding/tenant \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "clinic-test",
    "tenant_nombre": "Clínica Test",
    "industria": "salud",
    "servicios": [
      {"nombre": "Cardiología", "descripcion": "Cardio"}
    ],
    "sedes": [
      {
        "nombre": "Sede Central",
        "direccion": "Av. Test 123",
        "telefonos": ["1123456789"],
        "horario_semana": "Lun-Vier 8:00-20:00"
      }
    ],
    "coberturas": ["OSDE", "Swiss Medical"]
  }'
```

### Test 7: Upload Document

```bash
# Crear archivo de prueba
cat > /tmp/test.txt << 'DOC'
Clínica Test Services:
- Cardiología: Mon-Fri 8-18
- Coberturas: OSDE, Swiss Medical
DOC

# Upload
curl -X POST http://localhost:8000/onboarding/upload \
  -H "X-API-Key: $API_KEY" \
  -F "tenant_id=clinic-test" \
  -F "file1=@/tmp/test.txt"
```

### Test 8: Check Onboarding Status

```bash
curl -s http://localhost:8000/onboarding/status/clinic-test \
  -H "X-API-Key: $API_KEY" | jq '.'

# Debe mostrar: "overall_status": "ready"
```

### Test 9: Execute Agent (🔑 MAIN TEST)

```bash
curl -X POST http://localhost:8000/agent/execute \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "¿Qué servicios ofrecen?",
    "tenant_id": "clinic-test",
    "enable_detailed_trace": false,
    "max_iterations": 3,
    "temperature": 0.7
  }'

# ESPERADO: response with "result" containing the agent answer
# 🎉 Si esto funciona, TODO está funcionando!
```

### Test 10: Get Traces

```bash
curl -s http://localhost:8000/agent/traces \
  -H "X-API-Key: $API_KEY" | jq '.'
```

### Test 11: Get Metrics

```bash
curl -s http://localhost:8000/agent/metrics/agent \
  -H "X-API-Key: $API_KEY" | jq '.'
```

---

## 🚀 PASO 5: Correr E2E Test Script

```bash
chmod +x scripts/test-e2e.sh
./scripts/test-e2e.sh http://localhost:8000

# ESPERADO:
# ==========================================
#   E2E TEST SUMMARY
# ==========================================
# ✅ Passed: 11
# ❌ Failed: 0
# ✅ ALL TESTS PASSED
```

---

## 📊 PASO 6: Swagger UI

Abrir en navegador:

```
http://localhost:8000/docs
```

Verás todos los endpoints documentados, ejemplos, y puedes usar "Try it out" para testear.

---

## 🔍 DEBUGGING

```bash
# Ver todos los logs
docker compose logs -f

# Solo un servicio
docker compose logs -f backend-saas
docker compose logs -f backend-agents
docker compose logs -f postgres

# Últimas 50 líneas
docker compose logs --tail=50 -f
```

---

## 🛑 SHUTDOWN

```bash
# Detener servicios (mantiene datos)
docker compose down

# Detener y eliminar TODO
docker compose down -v

# Detener Ollama: Ctrl+C en su terminal
```

---

## ✅ CHECKLIST FINAL

- [ ] Ollama corriendo ✅
- [ ] docker compose ps → todos "healthy"
- [ ] GET /health → 200
- [ ] POST /auth/register → 200
- [ ] POST /auth/login → 200 + API key
- [ ] POST /onboarding/tenant → 200
- [ ] POST /onboarding/upload → 200
- [ ] GET /onboarding/status → "ready"
- [ ] POST /agent/execute → 200 + respuesta
- [ ] GET /agent/traces → array de trazas
- [ ] GET /agent/metrics/agent → métricas
- [ ] Swagger UI accesible
- [ ] E2E tests pasan ✅

**Si TODO está ✅ → ¡LISTO PARA PRODUCCIÓN!**

---

## ⚡ QUICK START (30 segundos)

```bash
# Terminal 1
ollama serve

# Terminal 2
cd agencia-web-b2b
docker compose up -d
sleep 30
docker compose exec backend-saas python -m app.db.seed
./scripts/test-e2e.sh http://localhost:8000

# ✅ ¡Done!
```

---

## 📝 NOTAS IMPORTANTES

1. **Ollama DEBE estar corriendo** - Sin Ollama, backend-agents no funcionará
2. **Primera vez toma tiempo** - Los modelos se descargan (~5 GB)
3. **Necesitas RAM** - Mínimo 16 GB para correr todo
4. **Los logs te ayudan** - Si algo falla, revisa los logs
5. **Swagger es tu amigo** - Usa `/docs` para explorar endpoints

---

**¡Todo listo para testear en local!**
