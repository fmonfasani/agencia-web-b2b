import logging
import httpx
from core.config import settings

logger = logging.getLogger(__name__)

async def generate_outreach_messages(lead_name: str, top_problem: str, service: str, pain: str) -> dict:
    """
    Genera un mensaje de WhatsApp y un Email personalizado usando Gemini API.
    """
    if not settings.gemini_api_key:
        logger.warning("GEMINI_API_KEY no configurado. Usando templates genéricos.")
        return {
            "whatsapp": f"Hola {lead_name}, noté que no tienen {top_problem}. Podríamos ayudarlos con {service}.",
            "email_subject": f"Oportunidad para mejorar {lead_name}",
            "email_body": f"Hola, vimos que {pain}. Ofrecemos {service}."
        }

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.gemini_api_key}"
    
    prompt = f"""
    Actúa como un experto en ventas B2B y marketing digital.
    Tu objetivo es redactar un mensaje de primer contacto (cold outreach) altamente persuasivo, empático e irresistible.
    
    DATOS DEL LEAD:
    - Nombre del Negocio: {lead_name}
    - Problema Detectado: {top_problem} (Pain: {pain})
    - Solución que ofrecemos: {service}
    
    REGLAS PARA EL WHATSAPP:
    - Muy breve (máximo 3 párrafos cortos).
    - Tono profesional pero cercano (usar 'Hola', no 'Estimado').
    - Estilo chileno/neutro (evitar 'voseo' extremo o modismos muy locales).
    - No sonar como un bot. Mencionar el beneficio directo de resolver {top_problem}.
    - Terminar siempre con una pregunta de tipo 'Call to Action' (CTA).
    
    REGLAS PARA EL EMAIL:
    - Asunto corto y con gancho.
    - Estructura: Gancho (problema) -> Valor (solución) -> Cierre (CTA).
    
    ENTREGA EL RESULTADO EN FORMATO JSON PLANO:
    {{
        "whatsapp": "...",
        "email_subject": "...",
        "email_body": "..."
    }}
    Responde ÚNICAMENTE el JSON.
    """

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url,
                json={
                    "contents": [{
                        "parts": [{"text": prompt}]
                    }]
                }
            )
            
            if response.status_code != 200:
                logger.error(f"Error de Gemini API: {response.text}")
                raise Exception("Gemini API error")
                
            data = response.json()
            text = data['candidates'][0]['content']['parts'][0]['text']
            
            # Limpiar el texto si Gemini devuelve markdown wrapping
            text = text.replace("```json", "").replace("```", "").strip()
            
            import json
            return json.loads(text)
            
    except Exception as e:
        logger.error(f"Error generando mensajes con AI: {e}")
        return {
            "whatsapp": f"Hola {lead_name}, soy de Agencia B2B. Noté que podrían mejorar su presencia digital eliminando el problema de: {top_problem}. ¿Les interesaría coordinar una breve llamada?",
            "email_subject": f"Consulta sobre la presencia digital de {lead_name}",
            "email_body": f"Hola,\n\nEstaba revisando su sitio y noté que {pain}. En Agencia B2B nos especializamos en {service}.\n\n¿Le interesaría una breve auditoría gratuita?\n\nSaludos."
        }

async def generate_strategic_brief(lead_name: str, category: str, website: str, problems: List[Dict]) -> str:
    """
    Genera un brief estratégico en Markdown para el equipo de ventas.
    """
    if not settings.gemini_api_key:
        return f"# Brief: {lead_name}\n\nLead analizado sin IA. Problemas detectados: {len(problems)}."

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.gemini_api_key}"
    
    problems_str = "\n".join([f"- {p['problem']} (Pain: {p['pain']}, Solución: {p['service']})" for p in problems])
    
    prompt = f"""
    Actúa como un Consultor Estratégico Senior de una Agencia de Marketing B2B.
    Tu objetivo es crear un "Strategic Brief" (Reporte Estratégico) para que un vendedor lo use antes de llamar a un cliente.
    
    DATOS DEL LEAD:
    - Negocio: {lead_name}
    - Rubro: {category}
    - Sitio Web: {website}
    - Problemas Técnicos Detectados:
    {problems_str}
    
    ESTRUCTURA DEL REPORTE (en Markdown):
    1. ## 🎯 Gancho de Apertura (The Opener): Una frase disruptiva basada en surubro y un problema detectado.
    2. ## 🔍 Análisis de Situación: Breve descripción de por qué su situación actual les está haciendo perder dinero.
    3. ## 💡 Solución Sugerida: Qué servicio específico de la Agencia B2B deberíamos ofrecerle primero.
    4. ## 🚀 Impacto Estimado: Qué resultado verían en 3-6 meses si implementamos la solución.
    
    REGLAS:
    - Lenguaje ejecutivo, profesional e inspirador.
    - No uses placeholders como [Nombre del Vendedor].
    - El reporte debe ser directo al grano (máximo 400 palabras).
    - Tono adaptado al rubro {category}.
    
    Responde ÚNICAMENTE el contenido en Markdown.
    """

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url,
                json={
                    "contents": [{
                        "parts": [{"text": prompt}]
                    }]
                }
            )
            data = response.json()
            return data['candidates'][0]['content']['parts'][0]['text']
    except Exception as e:
        logger.error(f"Error generando strategic brief: {e}")
        return f"Error generando brief para {lead_name}. Revisar logs."
async def generate_market_analysis(category: str, location: str = "Chile") -> str:
    """
    Genera un análisis de mercado/tendencias para un rubro específico.
    """
    if not settings.gemini_api_key:
        return f"# Análisis de Mercado: {category}\n\nNo se pudo generar sin IA."

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.gemini_api_key}"
    
    prompt = f"""
    Actúa como un Especialista en Inteligencia de Mercado B2B.
    Tu objetivo es redactar un reporte de tendencias y estado del mercado para el rubro: {category} en {location}.
    
    ESTRUCTURA (Markdown):
    1. ## 📈 Tendencias Actuales: 3 tendencias clave que están transformando este sector.
    2. ## 🚨 Desafíos del Sector: Qué problemas comunes enfrentan las empresas de este rubro hoy.
    3. ## ⚔️ Panorama Competitivo: Cómo es la competencia y qué diferencia a los líderes.
    4. ## 💡 Oportunidad no Aprovechada: Dónde está el "dinero sobre la mesa" para este tipo de negocios.
    
    Responde en español, tono ejecutivo. Máximo 500 palabras.
    """

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json={"contents": [{"parts": [{"text": prompt}]}]})
            data = response.json()
            return data['candidates'][0]['content']['parts'][0]['text']
    except Exception as e:
        logger.error(f"Error generando market analysis: {e}")
        return f"Error en análisis de mercado para {category}."

async def generate_niche_analysis(lead_name: str, category: str, website: str) -> str:
    """
    Genera un análisis de nicho y posicionamiento para el lead.
    """
    if not settings.gemini_api_key:
        return f"# Análisis de Nicho: {lead_name}\n\nNo se pudo generar sin IA."

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.gemini_api_key}"
    
    prompt = f"""
    Actúa como un Estratega de Branding y Nicho B2B.
    Analiza el posicionamiento de {lead_name} ({category}) basado en su identidad (web: {website}).
    
    ESTRUCTURA (Markdown):
    1. ## 🎯 Segmento Objetivo: A quién le está hablando realmente este negocio.
    2. ## 💎 Diferenciador Único: Qué los hace (o debería hacerlos) diferentes a su competencia directa.
    3. ## ⚠️ Brecha de Posicionamiento: Qué les falta comunicar para cobrar 2x o 3x más.
    4. ## 🚀 Propuesta de Valor Sugerida: Una frase que resuma su valor de forma irresistible.
    
    Responde en español, tono estratégico. Máximo 400 palabras.
    """

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json={"contents": [{"parts": [{"text": prompt}]}]})
            data = response.json()
            return data['candidates'][0]['content']['parts'][0]['text']
    except Exception as e:
        logger.error(f"Error generando niche analysis: {e}")
        return f"Error en análisis de nicho para {lead_name}."

async def generate_interview_guide(lead_name: str, brief: str) -> str:
    """
    Genera una guía de entrevista/reunión basada en el brief estratégico.
    """
    if not settings.gemini_api_key:
        return f"# Guía de Entrevista: {lead_name}\n\nNo se pudo generar sin IA."

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.gemini_api_key}"
    
    prompt = f"""
    Actúa como un Sales Coach B2B de alto rendimiento.
    Crea una "Hoja de Ruta de Entrevista" para que el vendedor cierre a {lead_name}.
    
    CONTEXTO (Brief Estratégico):
    {brief}
    
    ESTRUCTURA (Markdown):
    1. ## 🧊 Rompehielos (The Icebreaker): Una pregunta de apertura basada en el brief.
    2. ## ❓ Preguntas de Diagnóstico (Spin Selling): 3 preguntas clave para que el cliente admita su problema.
    3. ## 🛡️ Manejo de Objeciones: Las 2 objeciones más probables de este rubro y cómo rebatirlas.
    4. ## 💵 El Cierre de Valor: Cómo presentar la inversión y pedir el siguiente paso.
    
    Responde en español, tono motivador y táctico. Máximo 400 palabras.
    """

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json={"contents": [{"parts": [{"text": prompt}]}]})
            data = response.json()
            return data['candidates'][0]['content']['parts'][0]['text']
    except Exception as e:
        logger.error(f"Error generando interview guide: {e}")
        return f"Error en guía de entrevista para {lead_name}."
