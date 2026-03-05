"""
Lead Intelligence Service
Analiza la presencia digital de un negocio y genera:
- Scoring multidimensional (demanda + brecha digital + outreach)
- Detección de problemas digitales
- Channel intelligence
- Mensajes de outreach AI (via Gemini/Groq)
"""
import time
import logging
import re
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field

import httpx
from bs4 import BeautifulSoup
from services.ai_service import generate_outreach_messages

logger = logging.getLogger(__name__)

# ─── Mapa de Problemas → Oportunidades ────────────────────────────────────────

PROBLEM_MAP = {
    "no_website": {
        "problem": "No tiene sitio web",
        "pain": "Invisible para quienes buscan online",
        "service": "Landing page profesional + SEO local",
        "urgency": 5, "revenue": 500,
    },
    "no_booking": {
        "problem": "Sin sistema de turnos online",
        "pain": "Pierde clientes que reservan fuera de horario",
        "service": "Sistema de reservas + recordatorios automáticos",
        "urgency": 5, "revenue": 800,
    },
    "no_chatbot": {
        "problem": "No responde consultas automáticamente",
        "pain": "Leads se van a la competencia si no hay respuesta inmediata",
        "service": "Chatbot WhatsApp IA 24/7",
        "urgency": 4, "revenue": 600,
    },
    "slow_website": {
        "problem": "Sitio web lento (>3s de carga)",
        "pain": "Pierde el 40% de usuarios móviles",
        "service": "Optimización técnica + hosting mejorado",
        "urgency": 3, "revenue": 400,
    },
    "no_ssl": {
        "problem": "Sitio sin HTTPS / certificado SSL",
        "pain": "Browsers muestran 'sitio no seguro' → pérdida de confianza",
        "service": "Migración a HTTPS + SSL gratuito",
        "urgency": 3, "revenue": 200,
    },
    "no_contact_form": {
        "problem": "Sin formulario de contacto en el sitio",
        "pain": "Visitas no se convierten en consultas",
        "service": "Formulario de contacto + integración CRM",
        "urgency": 2, "revenue": 300,
    },
    "no_social": {
        "problem": "Sin presencia en redes sociales",
        "pain": "No construye comunidad ni genera referidos",
        "service": "Gestión de redes + contenido mensual",
        "urgency": 2, "revenue": 700,
    },
}


@dataclass
class WebsiteAnalysis:
    loads: bool = False
    has_ssl: bool = False
    has_contact_form: bool = False
    has_booking_system: bool = False
    has_chatbot: bool = False
    has_whatsapp_link: bool = False
    response_time_ms: Optional[int] = None
    error: Optional[str] = None


@dataclass
class IntelligenceResult:
    tier: str = "COLD"
    opportunity_score: int = 0
    demand_score: int = 0
    digital_gap_score: int = 0
    outreach_score: int = 0
    website_analysis: Optional[WebsiteAnalysis] = None
    detected_problems: List[Dict] = field(default_factory=list)
    top_problem: Optional[str] = None
    revenue_estimate: Optional[int] = None
    best_channel: Optional[str] = None
    channel_scores: Dict[str, int] = field(default_factory=dict)
    whatsapp_msg: Optional[str] = None
    email_subject: Optional[str] = None
    email_body: Optional[str] = None


# ─── Análisis de Website (HTTP-only, sin Playwright) ──────────────────────────

BOOKING_KEYWORDS = [
    "reserva", "reservar", "turno", "turnos", "agenda", "agendar",
    "cita", "booking", "schedule", "appointment", "calendly", "booksy",
    "acuityscheduling", "simplybook",
]
CHATBOT_KEYWORDS = [
    "crisp", "tawk", "intercom", "drift", "freshdesk", "hubspot",
    "whatsapp-chat", "tidio", "botpress", "manychat",
]
FORM_KEYWORDS = [
    "<form", "contact", "contacto", "consulta", "enviar", "submit",
    "input type=\"email\"", "input type='email'",
]

async def analyze_website(url: str) -> WebsiteAnalysis:
    """
    Analiza un website via HTTP sin browser headless.
    Detecta: carga, SSL, formularios, booking, chatbot, WhatsApp.
    """
    if not url:
        return WebsiteAnalysis(loads=False, error="No URL provided")

    # Asegurar que tiene esquema
    if not url.startswith("http"):
        url = "https://" + url

    analysis = WebsiteAnalysis()

    try:
        start = time.time()
        async with httpx.AsyncClient(
            timeout=10.0, follow_redirects=True,
            headers={"User-Agent": "Mozilla/5.0 (compatible; LeadIntelligenceBot/1.0)"}
        ) as client:
            resp = await client.get(url)

        elapsed = int((time.time() - start) * 1000)
        analysis.response_time_ms = elapsed
        analysis.loads = resp.status_code < 400
        analysis.has_ssl = str(resp.url).startswith("https://")

        if not analysis.loads:
            return analysis

        # Parsear HTML
        html = resp.text.lower()
        soup = BeautifulSoup(resp.text, "html.parser")

        # Detectar formulario de contacto
        has_form = bool(soup.find("form"))
        has_email_input = bool(soup.find("input", {"type": "email"}))
        contact_text = any(kw in html for kw in ["contacto", "contact", "consulta", "escribinos"])
        analysis.has_contact_form = has_form and (has_email_input or contact_text)

        # Detectar sistema de turnos / booking
        analysis.has_booking_system = any(kw in html for kw in BOOKING_KEYWORDS)

        # Detectar chatbot
        analysis.has_chatbot = any(kw in html for kw in CHATBOT_KEYWORDS)

        # Detectar link de WhatsApp
        wa_links = soup.find_all("a", href=re.compile(r"wa\.me|whatsapp\.com|api\.whatsapp", re.I))
        analysis.has_whatsapp_link = len(wa_links) > 0

    except httpx.TimeoutException:
        analysis.error = "timeout"
        analysis.loads = False
    except Exception as e:
        analysis.error = str(e)[:100]
        analysis.loads = False

    return analysis


# ─── Detección de Problemas ───────────────────────────────────────────────────

def detect_problems(lead: dict, wa: WebsiteAnalysis) -> List[Dict]:
    problems = []

    if not lead.get("website"):
        problems.append({"key": "no_website", **PROBLEM_MAP["no_website"]})
        return problems  # si no hay web, el resto no aplica

    if not wa.loads:
        problems.append({"key": "no_website", **{**PROBLEM_MAP["no_website"],
                         "problem": "Sitio web no funciona o es inaccesible"}})
        return problems

    if not wa.has_booking_system:
        problems.append({"key": "no_booking", **PROBLEM_MAP["no_booking"]})

    if not wa.has_chatbot:
        problems.append({"key": "no_chatbot", **PROBLEM_MAP["no_chatbot"]})

    if wa.response_time_ms and wa.response_time_ms > 3000:
        problems.append({"key": "slow_website", **PROBLEM_MAP["slow_website"]})

    if not wa.has_ssl:
        problems.append({"key": "no_ssl", **PROBLEM_MAP["no_ssl"]})

    if not wa.has_contact_form:
        problems.append({"key": "no_contact_form", **PROBLEM_MAP["no_contact_form"]})

    has_social = any([lead.get("instagram"), lead.get("facebook"),
                      lead.get("tiktok"), lead.get("linkedin")])
    if not has_social:
        problems.append({"key": "no_social", **PROBLEM_MAP["no_social"]})

    # Ordenar por urgencia descendente
    problems.sort(key=lambda p: p.get("urgency", 0), reverse=True)
    return problems


# ─── Scoring ──────────────────────────────────────────────────────────────────

def compute_scores(lead: dict, wa: WebsiteAnalysis) -> Dict[str, int]:
    # Demanda (el negocio tiene clientes activos)
    rating = lead.get("rating") or 0
    reviews = lead.get("reviewsCount") or lead.get("reviews_count") or 0

    import math
    rating_norm = (rating / 5.0) * 50         # 0-50 pts
    reviews_norm = min(50, math.log1p(reviews) * 8)  # 0-50 pts
    demand = int(rating_norm + reviews_norm)

    # Brecha digital (mayor brecha = mayor oportunidad)
    gap = 0
    if not lead.get("website"):     gap += 30
    elif not wa.loads:              gap += 25
    else:
        if not wa.has_booking_system: gap += 20
        if not wa.has_chatbot:        gap += 15
        if wa.response_time_ms and wa.response_time_ms > 3000: gap += 15
        if not wa.has_ssl:            gap += 10
        if not wa.has_contact_form:   gap += 10
    has_social = any([lead.get("instagram"), lead.get("facebook")])
    if not has_social:              gap += 10
    gap = min(100, gap)

    # Outreach (podemos contactarlos)
    outreach = 0
    if lead.get("whatsapp") or (wa.loads and wa.has_whatsapp_link): outreach += 40
    if lead.get("phone"):   outreach += 20
    if lead.get("instagram"): outreach += 20
    if lead.get("email"):   outreach += 20
    outreach = min(100, outreach)

    # Score final ponderado
    score = int(0.35 * demand + 0.40 * gap + 0.25 * outreach)

    # Tier
    if score >= 80:   tier = "HOT"
    elif score >= 60: tier = "WARM"
    elif score >= 40: tier = "COOL"
    else:             tier = "COLD"

    return {
        "opportunity_score": score,
        "demand_score": demand,
        "digital_gap_score": gap,
        "outreach_score": outreach,
        "tier": tier,
    }


# ─── Channel Intelligence ─────────────────────────────────────────────────────

def compute_channels(lead: dict, wa: WebsiteAnalysis) -> Dict:
    scores: Dict[str, int] = {}

    # WhatsApp — más efectivo en LATAM
    if lead.get("whatsapp"):
        scores["whatsapp"] = 95
    elif wa.loads and wa.has_whatsapp_link:
        scores["whatsapp"] = 85
    elif lead.get("phone"):
        scores["whatsapp"] = 60  # podemos intentar por número de teléfono

    # Email
    if lead.get("email"):
        scores["email"] = 80

    # Instagram DM
    if lead.get("instagram"):
        scores["instagram"] = 65

    # LinkedIn
    if lead.get("linkedin"):
        scores["linkedin"] = 55

    best = max(scores, key=lambda k: scores[k]) if scores else None
    return {"channel_scores": scores, "best_channel": best}


# ─── Main analyze function ───────────────────────────────────────────────────

async def analyze_lead(lead: dict) -> IntelligenceResult:
    """
    Pipeline completo de análisis de un lead.
    lead: dict con campos name, website, phone, whatsapp, instagram, rating, reviewsCount, etc.
    """
    result = IntelligenceResult()

    # 1. Analizar website
    wa = await analyze_website(lead.get("website", ""))
    result.website_analysis = wa

    # 2. Detectar problemas
    problems = detect_problems(lead, wa)
    result.detected_problems = problems
    result.top_problem = problems[0]["problem"] if problems else None
    result.revenue_estimate = sum(p.get("revenue", 0) for p in problems[:3]) if problems else None

    # 3. Scoring
    scores = compute_scores(lead, wa)
    result.tier = scores["tier"]
    result.opportunity_score = scores["opportunity_score"]
    result.demand_score = scores["demand_score"]
    result.digital_gap_score = scores["digital_gap_score"]
    result.outreach_score = scores["outreach_score"]

    # 4. Channel intelligence
    channels = compute_channels(lead, wa)
    result.channel_scores = channels["channel_scores"]
    result.best_channel = channels["best_channel"]

    # 5. Generar mensajes de outreach AI
    if result.top_problem:
        # Encontrar los detalles del problema principal para dárselos a la IA
        problem_info = next((p for p in result.detected_problems if p["problem"] == result.top_problem), None)
        if problem_info:
            ai_msgs = await generate_outreach_messages(
                lead_name=lead.get("name", "Negocio"),
                top_problem=result.top_problem,
                service=problem_info.get("service", "Servicios digitales"),
                pain=problem_info.get("pain", "Falta de optimización digital")
            )
            result.whatsapp_msg = ai_msgs.get("whatsapp")
            result.email_subject = ai_msgs.get("email_subject")
            result.email_body = ai_msgs.get("email_body")

    return result
