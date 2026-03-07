from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from pydantic import BaseModel
from datetime import time

from core.auth import require_admin
from core.database import get_conn
from core.scheduler import scraper_scheduler

router = APIRouter(prefix="/schedules", tags=["Schedules"])

class ScheduleCreate(BaseModel):
    tenant_id: str
    query: str
    location: str
    max_leads: int = 50
    provider: str = "google"
    frequency_minutes: Optional[int] = None
    specific_time: Optional[str] = None # HH:MM format

@router.post("/", dependencies=[Depends(require_admin)])
async def create_schedule(req: ScheduleCreate):
    # Validar que tenga frecuencia o tiempo específico
    if not req.frequency_minutes and not req.specific_time:
        raise HTTPException(status_code=400, detail="Debe especificar frecuencia o un horario específico.")
    
    specific_time_obj = None
    if req.specific_time:
        try:
            h, m = map(int, req.specific_time.split(":"))
            specific_time_obj = time(h, m)
        except:
            raise HTTPException(status_code=400, detail="Formato de hora inválido (HH:MM)")

    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO scraper_schedules 
                    (tenant_id, query, location, max_leads, provider, frequency_minutes, specific_time)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING *
                """, (req.tenant_id, req.query, req.location, req.max_leads, req.provider, req.frequency_minutes, specific_time_obj))
                new_sched = cur.fetchone()
                conn.commit()
                
                # Agregar al scheduler en memoria
                scraper_scheduler.add_job_to_scheduler(new_sched)
                
                return new_sched
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", dependencies=[Depends(require_admin)])
async def list_schedules(tenant_id: Optional[str] = None):
    query = "SELECT * FROM scraper_schedules"
    params = []
    if tenant_id:
        query += " WHERE tenant_id = %s"
        params.append(tenant_id)
    
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(query, tuple(params))
            return cur.fetchall()

@router.delete("/{schedule_id}", dependencies=[Depends(require_admin)])
async def delete_schedule(schedule_id: str):
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM scraper_schedules WHERE id = %s", (schedule_id,))
                conn.commit()
                
                # Quitar del scheduler
                if schedule_id in scraper_scheduler._running_jobs:
                    scraper_scheduler.scheduler.remove_job(schedule_id)
                    del scraper_scheduler._running_jobs[schedule_id]
                
                return {"message": "Schedule eliminado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
