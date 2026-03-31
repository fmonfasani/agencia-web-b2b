"""
Router: /intelligence
Endpoints para analizar leads y obtener inteligencia comercial.
"""
import logging
import asyncio
from typing import Optional

from fastapi import APIRouter, HTTPException, Header, BackgroundTasks
from pydantic import BaseModel
import httpx

from core.config import settings
from services.intelligence_service import analyze_lead

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/intelligence", tags=["intelligence"])

INTERNAL_SECRET = settings.internal_api_secret
NEXTJS_URL = settings.nextjs_internal_url


def check_auth(x_admin_secret: Optional[str] = None):
    if not x_admin_secret or x_admin_secret != settings.admin_secret:
        raise HTTPException(status_code=401, detail="Unauthorized")


class AnalyzeRequest(BaseModel):
    lead_id: str
    # Si se pasa el lead directo (sin ir a buscarlo en Vercel)
    lead_data: Optional[dict] = None


async def fetch_lead_from_vercel(lead_id: str) -> dict:
    """Descarga los datos del lead desde Vercel para analizarlo."""
    headers = {
        "X-Internal-Secret": INTERNAL_SECRET,
        "X-Admin-Secret": settings.admin_secret,
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{NEXTJS_URL}/api/leads/intelligence/pending?limit=1",
            headers=headers,
        )
        # Buscamos por ID en los leads pendientes
    raise HTTPException(status_code=404, detail=f"Lead {lead_id} not found or already analyzed")


async def save_intelligence_to_vercel(lead_id: str, result) -> bool:
    """Guarda los resultados del análisis en Vercel via /api/leads/[id]/intelligence."""
    wa = result.website_analysis

    payload = {
        "tier":              result.tier,
        "opportunityScore":  result.opportunity_score,
        "demandScore":       result.demand_score,
        "digitalGapScore":   result.digital_gap_score,
        "outreachScore":     result.outreach_score,
        "websiteLoads":      wa.loads       if wa else None,
        "hasSSL":            wa.has_ssl     if wa else None,
        "hasContactForm":    wa.has_contact_form    if wa else None,
        "hasBookingSystem":  wa.has_booking_system  if wa else None,
        "hasChatbot":        wa.has_chatbot if wa else None,
        "hasWhatsappLink":   wa.has_whatsapp_link if wa else None,
        "responseTimeMs":    wa.response_time_ms  if wa else None,
        "detectedProblems":  result.detected_problems,
        "topProblem":        result.top_problem,
        "revenueEstimate":   result.revenue_estimate,
        "bestChannel":       result.best_channel,
        "channelScores":     result.channel_scores,
        "whatsappMsg":       result.whatsapp_msg,
        "emailSubject":      result.email_subject,
        "emailBody":         result.email_body,
        "strategicBrief":    result.strategic_brief,
        "modelVersion":      "1.0",
    }

    headers = {
        "X-Internal-Secret": INTERNAL_SECRET,
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{NEXTJS_URL}/api/leads/{lead_id}/intelligence",
            json=payload,
            headers=headers,
        )
        return resp.status_code in (200, 201)


@router.post("/analyze")
async def analyze_single(
    req: AnalyzeRequest,
    x_admin_secret: Optional[str] = Header(None),
):
    """
    Analiza un lead específico (por su ID o con datos pasados directamente).
    POST /intelligence/analyze
    Body: { lead_id: "...", lead_data: {...} }
    """
    check_auth(x_admin_secret)

    lead_data = req.lead_data
    if not lead_data:
        raise HTTPException(status_code=400, detail="lead_data requerido")

    try:
        result = await analyze_lead(lead_data)
        saved = await save_intelligence_to_vercel(req.lead_id, result)

        wa = result.website_analysis
        return {
            "lead_id":          req.lead_id,
            "tier":             result.tier,
            "opportunity_score": result.opportunity_score,
            "top_problem":      result.top_problem,
            "best_channel":     result.best_channel,
            "problems_count":   len(result.detected_problems),
            "website_loads":    wa.loads if wa else None,
            "saved_to_db":      saved,
        }
    except Exception as e:
        logger.error(f"Error analizando lead {req.lead_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch")
async def analyze_batch(
    background_tasks: BackgroundTasks,
    limit: int = 10,
    tenant_id: Optional[str] = None,
    x_admin_secret: Optional[str] = Header(None),
):
    """
    Descarga leads sin intelligence desde Vercel y los analiza en background.
    POST /intelligence/batch?limit=10&tenant_id=xxx
    """
    check_auth(x_admin_secret)

    # 1. Obtener leads pendientes desde Vercel
    params = {"limit": limit}
    if tenant_id:
        params["tenantId"] = tenant_id

    headers = {"X-Internal-Secret": INTERNAL_SECRET}
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            f"{NEXTJS_URL}/api/leads/intelligence/pending",
            params=params,
            headers=headers,
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"Error fetching pending leads: {resp.status_code}")

    data = resp.json()
    leads = data.get("leads", [])

    if not leads:
        return {"message": "No hay leads pendientes de análisis", "count": 0}

    # 2. Analizar en background
    async def process_batch(leads_list: list):
        results = {"analyzed": 0, "errors": 0}
        for lead in leads_list:
            try:
                result = await analyze_lead(lead)
                await save_intelligence_to_vercel(lead["id"], result)
                results["analyzed"] += 1
                logger.info(f"[Intelligence] ✅ {lead.get('name')} → {result.tier} ({result.opportunity_score})")
                await asyncio.sleep(0.5)  # throttle gentil
            except Exception as e:
                results["errors"] += 1
                logger.error(f"[Intelligence] ❌ {lead.get('name')}: {e}")
        logger.info(f"[Intelligence] Batch completado: {results}")

    background_tasks.add_task(process_batch, leads)

    return {
        "message": f"Analizando {len(leads)} leads en background",
        "count": len(leads),
        "leads": [{"id": l["id"], "name": l.get("name"), "website": l.get("website")} for l in leads],
    }


@router.get("/status/{lead_id}")
async def get_intelligence(
    lead_id: str,
    x_admin_secret: Optional[str] = Header(None),
):
    """Proxy: devuelve el LeadIntelligence de un lead via Vercel."""
    check_auth(x_admin_secret)
    headers = {"X-Internal-Secret": INTERNAL_SECRET}
    async with httpx.AsyncClient(timeout=8.0) as client:
        resp = await client.get(
            f"{NEXTJS_URL}/api/leads/{lead_id}/intelligence",
            headers=headers,
        )
    if resp.status_code == 404:
        raise HTTPException(status_code=404, detail="Sin intelligence para este lead")
    return resp.json()
