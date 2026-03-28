# Backend: Agent Engine (LangGraph) + FastAPI Skeleton

Este repositorio contiene un esqueleto minimalista para un agente IA end-to-end
implementación real en el VPS; no es una solución completa de producción.

Estructura principal:

- backend/app/main.py: FastAPI gateway con /agent/execute
- backend/app/engine/langgraph_engine.py: motor LangGraph simulado (state machine)
- backend/app/tools/registry.py: registry de herramientas
- backend/app/llm/ollama_client.py: cliente LLm simulando Ollama
- backend/app/db/ y backend/docker-compose.yml: persistencia y orquestación básica

Requisitos

- Python 3.11+
- pip install -r backend/requirements.txt
- Docker y Docker Compose si quieres levantar el stack completo

Ejecutar localmente (solo skeleton):

- Instalar dependencias
  cd backend
  pip install -r requirements.txt
- Levantar backend (usa uvicorn)
  uvicorn app.main:app --reload --port 8000

Notas

- Este skeleton debe ser ampliado para incluir seguridad, multi-tenancy con tenant_id obligatorio,
  orquestación completa y tests automatizados.
