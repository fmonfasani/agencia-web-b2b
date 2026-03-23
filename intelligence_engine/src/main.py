from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import pandas as pd
import uvicorn
import os

# Ajuste de imports para la nueva estructura
from database.classified_repo import ClassifiedRepo

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicializar DB al arrancar
    print("🚀 Iniciando Lead Intelligence Engine...")
    ClassifiedRepo.init_db()
    yield

app = FastAPI(
    title="Lead Intelligence Engine — Webshooks",
    lifespan=lifespan
)

# Configurar CORS para que el frontend Next.js pueda consultar
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # En producción limitar al dominio de la agencia
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/leads")
async def get_classified_leads(
    sector: str = None, 
    categoria: str = None, 
    min_score: int = None, 
    has_email: str = None,
    has_socials: bool = None,
    has_whatsapp: bool = None,
    has_website: bool = None,
    limit: int = 50, 
    offset: int = 0
):
    try:
        df = ClassifiedRepo.search_leads(
            sector=sector, 
            categoria=categoria, 
            min_score=min_score, 
            has_email=has_email,
            has_socials=has_socials,
            has_whatsapp=has_whatsapp,
            has_website=has_website,
            limit=limit, 
            offset=offset
        )
        return {
            "count": len(df),
            "limit": limit,
            "offset": offset,
            "leads": df.to_dict(orient="records")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error consultando DB: {str(e)}")

@app.get("/leads/{lead_id}")
async def get_lead_detail(lead_id: str):
    try:
        lead = ClassifiedRepo.get_lead_by_id(lead_id)
        if not lead:
            raise HTTPException(status_code=404, detail="Lead no encontrado")
        return lead
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener detalle: {str(e)}")

@app.get("/analytics/summary")
async def get_analytics_summary():
    try:
        stats = ClassifiedRepo.get_summary_stats()
        # Mock de datos adicionales si faltan en la DB
        if not stats.get("total_leads"):
            conn = ClassifiedRepo.get_connection()
            count = conn.execute("SELECT COUNT(*) FROM leads_processed").fetchone()[0]
            conn.close()
            stats["total_leads"] = count
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en analytics: {str(e)}")

@app.get("/leads/top")
async def get_top_leads(limit: int = 100, offset: int = 0):
    try:
        conn = ClassifiedRepo.get_connection()
        query = f"SELECT * FROM leads_processed ORDER BY digital_score_lice DESC LIMIT {limit} OFFSET {offset}"
        df = pd.read_sql(query, conn)
        conn.close()
        return {
            "count": len(df),
            "leads": df.to_dict(orient="records")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener top leads: {str(e)}")

# Endpoint para taxonomía (puedes adaptarlo si tienes el archivo .json)
@app.get("/taxonomy")
async def get_taxonomy():
    # Retornamos una básica por ahora o podrías leer el archivo taxonomy.json si lo migraste
    return {
        "Salud": {
            "Clínicas": [],
            "Hospitales": [],
            "Dental": []
        },
        "Software": {
            "SaaS": [],
            "Consultoría": []
        }
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8008)
