# Lead Intelligence Engine (LICE)

Este módulo gestiona la inteligencia de leads y el scoring digital (LICE) para la agencia.

## Estructura

- `src/presence/`: Lógica de detección de redes sociales, emails institucionales y scoring.
- `src/database/`: Repositorio de base de datos intermedia (SQLite).
- `src/main.py`: API FastAPI para servir los datos al dashboard de la agencia.
- `data/leads_processed.db`: Base de datos de resultados (se genera al procesar).

## Cómo ejecutar la API

1. Asegúrate de tener instalado Python 3.9+ y las librerías necesarias:
   ```bash
   pip install fastapi uvicorn pandas sqlean.py
   ```
2. Ejecuta la API desde esta carpeta:
   ```bash
   python src/main.py
   ```

## Integración con Next.js

El dashboard se encuentra en la ruta de Next.js: `src/app/admin/intelligence`.
Asegúrate de configurar la variable de entorno `NEXT_PUBLIC_INTEL_API_URL` si la API corre en un puerto distinto al 8000.
