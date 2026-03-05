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
