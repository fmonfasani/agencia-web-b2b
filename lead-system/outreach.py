"""
Envía emails personalizados a leads con email disponible.
Secuencia: Email inicial → Follow-up día 3 → Follow-up día 7.
Uso: python3 outreach.py --tipo inicial --limite 20
"""
import argparse, os
from datetime import datetime, timedelta
import psycopg2, psycopg2.extras
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
BREVO_API_KEY = os.getenv("BREVO_API_KEY")
MI_EMAIL      = os.getenv("MI_EMAIL", "tu@email.com")
MI_NOMBRE     = os.getenv("MI_NOMBRE", "Tu Nombre")
AGENCIA_NOMBRE = os.getenv("AGENCIA_NOMBRE", "Tu Agencia")
MI_CALENDLY   = os.getenv("MI_CALENDLY", "https://calendly.com/tu-link")

# ── Templates de emails ──
def email_inicial(lead: dict) -> tuple[str, str]:
    sin_web = not lead.get("tiene_web")
    tiene_wp = "WordPress" in (lead.get("dolor") or "")

    if sin_web:
        subject = f"Vi que {lead['nombre']} no tiene web — te cuento algo"
        body = f"""
<p>Hola,</p>

<p>Vi el negocio de <strong>{lead['nombre']}</strong> en Google Maps y noté que no tienen sitio web todavía.</p>

<p>Todos los días, personas en {lead['ciudad']} buscan "{lead['rubro']}" en Google y encuentran a tu competencia — no a vos.</p>

<p>Puedo tener tu sitio web profesional listo en <strong>48 horas</strong>, con un asistente que responde consultas automáticamente las 24hs. Costo: desde $150.</p>

<p>¿Tenés 15 minutos esta semana para que te muestre un ejemplo? Podemos hablar por Zoom o por WhatsApp.</p>

<p>Saludos,<br/>
<strong>{MI_NOMBRE}</strong><br/>
{AGENCIA_NOMBRE}<br/>
→ <a href="{MI_CALENDLY}">Agendar 15 min gratis</a></p>
        """
    elif tiene_wp:
        subject = f"Tu web en WordPress está perdiendo clientes — te explico"
        body = f"""
<p>Hola,</p>

<p>Visité la web de <strong>{lead['nombre']}</strong> y noté que está en WordPress.</p>

<p>El problema más común: los visitantes llegan a las 10pm, tienen una duda sobre precios o disponibilidad, y como no hay nadie que responda, se van y contratan a otro.</p>

<p>La solución que implemento tarda 48 horas y cuesta $80/mes: un asistente IA que responde solo, todo el tiempo, sin que vos hagas nada.</p>

<p>¿Tenés 15 minutos para ver cómo funciona en vivo?</p>

<p>Saludos,<br/>
<strong>{MI_NOMBRE}</strong><br/>
{AGENCIA_NOMBRE}<br/>
→ <a href="{MI_CALENDLY}">Ver demo en 15 min</a></p>
        """
    else:
        subject = f"Una pregunta rápida sobre {lead['nombre']}"
        body = f"""
<p>Hola,</p>

<p>Estuve mirando la presencia digital de <strong>{lead['nombre']}</strong> en {lead['ciudad']}.</p>

<p>Tengo una solución concreta para capturar más clientes sin agregar trabajo al equipo. Tarda 48hs en implementarse.</p>

<p>¿Tenés 15 minutos esta semana para que te muestre cómo funciona?</p>

<p>Saludos,<br/>
<strong>{MI_NOMBRE}</strong><br/>
{AGENCIA_NOMBRE}<br/>
→ <a href="{MI_CALENDLY}">Agendar demo gratis</a></p>
        """
    return subject, body

def email_followup1(lead: dict) -> tuple[str, str]:
    subject = f"Re: {lead['nombre']} — ¿llegó mi email?"
    body = f"""
<p>Hola,</p>

<p>Te escribí hace unos días sobre una oportunidad para <strong>{lead['nombre']}</strong>.</p>

<p>Entiendo que el tiempo no sobra. Te dejo el link directo para agendar 15 min cuando mejor te venga:</p>

<p>→ <a href="{MI_CALENDLY}">{MI_CALENDLY}</a></p>

<p>Si no es el momento, no hay problema. Solo decime y no te escribo más.</p>

<p>Saludos,<br/>
<strong>{MI_NOMBRE}</strong></p>
    """
    return subject, body

def email_followup2(lead: dict) -> tuple[str, str]:
    subject = f"Último mensaje — {lead['nombre']}"
    body = f"""
<p>Hola,</p>

<p>Es el último mensaje que te envío.</p>

<p>Si en algún momento querés ver cómo aumentar los contactos de <strong>{lead['nombre']}</strong> sin trabajo extra, podés escribirme a {MI_EMAIL} o agendar acá:</p>

<p>→ <a href="{MI_CALENDLY}">{MI_CALENDLY}</a></p>

<p>Éxitos.<br/>
<strong>{MI_NOMBRE}</strong></p>
    """
    return subject, body

def send_email(to_email: str, to_name: str, subject: str, body: str) -> bool:
    config = sib_api_v3_sdk.Configuration()
    config.api_key["api-key"] = BREVO_API_KEY
    api = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(config))

    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        to=[{"email": to_email, "name": to_name}],
        sender={"email": MI_EMAIL, "name": MI_NOMBRE},
        subject=subject,
        html_content=body,
    )
    try:
        api.send_transac_email(send_smtp_email)
        return True
    except ApiException as e:
        print(f"  ❌ Error Brevo: {e}")
        return False

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--tipo",   choices=["inicial", "followup1", "followup2"], default="inicial")
    parser.add_argument("--limite", type=int, default=20)
    parser.add_argument("--rubro",  default=None)
    args = parser.parse_args()

    conn = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    now  = datetime.now()

    with conn.cursor() as cur:
        if args.tipo == "inicial":
            query = """
                SELECT * FROM leads
                WHERE email IS NOT NULL
                  AND email_enviado = false
                  AND status = 'NEW'
            """
        elif args.tipo == "followup1":
            tres_dias = now - timedelta(days=3)
            query = f"""
                SELECT * FROM leads
                WHERE email IS NOT NULL
                  AND email_enviado = true
                  AND followup1_enviado = false
                  AND status = 'NEW'
                  AND email_enviado_at < '{tres_dias}'
            """
        else:  # followup2
            siete_dias = now - timedelta(days=7)
            query = f"""
                SELECT * FROM leads
                WHERE email IS NOT NULL
                  AND followup1_enviado = true
                  AND followup2_enviado = false
                  AND status = 'NEW'
                  AND followup1_at < '{siete_dias}'
            """

        if args.rubro:
            query += f" AND rubro ILIKE '%{args.rubro}%'"
        query += f" ORDER BY score DESC LIMIT {args.limite}"
        cur.execute(query)
        leads = cur.fetchall()

    print(f"\n📧 Enviando {args.tipo} a {len(leads)} leads...\n")
    sent = 0

    for lead in leads:
        if args.tipo == "inicial":
            subject, body = email_inicial(lead)
            update_fields = "email_enviado = true, email_enviado_at = now(), status = 'CONTACTED'"
        elif args.tipo == "followup1":
            subject, body = email_followup1(lead)
            update_fields = "followup1_enviado = true, followup1_at = now()"
        else:
            subject, body = email_followup2(lead)
            update_fields = "followup2_enviado = true, followup2_at = now()"

        print(f"  → {lead['nombre']} <{lead['email']}>", end=" ")
        ok = send_email(lead["email"], lead["nombre"], subject, body)

        if ok:
            with conn.cursor() as cur:
                cur.execute(f"UPDATE leads SET {update_fields}, ultimo_contacto = now() WHERE id = %s", (lead["id"],))
            conn.commit()
            print("✅")
            sent += 1
        else:
            print("❌")

        # Pausa entre emails para evitar spam filters
        import time; time.sleep(2)

    conn.close()
    print(f"\n📊 Enviados: {sent}/{len(leads)}")

main()
