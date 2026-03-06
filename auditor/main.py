from fastapi import FastAPI, BackgroundTasks, HTTPException
from typing import Optional
from pydantic import BaseModel
from auditor.reports.report_generator import ReportGenerator
import os

app = FastAPI(title="AI Software Auditor API")

class AuditRequest(BaseModel):
    repository_url: str

class AuditStatus(BaseModel):
    audit_id: str
    status: str

generator = ReportGenerator()

@app.post("/audit/start", response_model=AuditStatus)
async def start_audit(request: AuditRequest, background_tasks: BackgroundTasks):
    try:
        # We start the audit task in the background
        # Note: In a production environment, we would use a task queue like Celery or RQ
        background_tasks.add_task(generator.run_audit, request.repository_url)
        return AuditStatus(audit_id="pending_assignment", status="job_enqueued")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/audit/{audit_id}")
async def get_audit(audit_id: str):
    # This would normally query the database for the audit record
    # For now, we just return a placeholder or query the AuditorDB
    from auditor.database import AuditorDB
    db = AuditorDB()
    with db.get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM \"Audit\" WHERE id = %s", (audit_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Audit not found")
            
            cur.execute("SELECT * FROM \"Finding\" WHERE \"auditId\" = %s", (audit_id,))
            findings = cur.fetchall()
            
            return {
                "audit": row,
                "findings": findings
            }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
