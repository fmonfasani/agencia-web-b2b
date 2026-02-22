"""
Detección de Presencia Digital — LICE
Analiza el email y website de cada lead para determinar:
  - correo_institucional: si el email es de un dominio propio (no Gmail, etc.)
  - redes_detectadas: lista de redes sociales identificadas en el website
  - tiene_web_propia: si tiene un sitio propio (no es solo un perfil de red social)
  - digital_score: score actualizado 0-100
"""

import re
import sqlite3
import pandas as pd
from urllib.parse import urlparse

# ── Dominios de email genéricos (no institucionales) ────────────────────────
GENERIC_DOMAINS = {
    "gmail.com", "hotmail.com", "yahoo.com", "outlook.com",
    "icloud.com", "live.com", "hotmail.com.ar", "yahoo.com.ar",
    "yahoo.es", "hotmail.es", "msn.com", "aol.com",
    "protonmail.com", "zoho.com", "yandex.com",
}

# ── Plataformas de redes sociales ────────────────────────────────────────────
SOCIAL_PLATFORMS = {
    "instagram": ["instagram.com"],
    "facebook": ["facebook.com", "fb.com"],
    "tiktok": ["tiktok.com"],
    "twitter": ["twitter.com", "x.com"],
    "linkedin": ["linkedin.com"],
    "whatsapp": ["wa.me", "whatsapp.com", "api.whatsapp.com"],
    "youtube": ["youtube.com", "youtu.be"],
}

# Todos los dominios sociales aplanados para detectar "solo red social"
ALL_SOCIAL_DOMAINS = {
    domain
    for domains in SOCIAL_PLATFORMS.values()
    for domain in domains
}


def is_corporate_email(email: str) -> bool:
    """
    Retorna True si el email tiene un dominio propio (no genérico).
    Ej: contacto@miempresa.com → True
        juan@gmail.com → False
    """
    if not email or pd.isna(email):
        return False
    email = str(email).strip().lower()
    if "@" not in email:
        return False
    domain = email.split("@")[-1].strip()
    return domain not in GENERIC_DOMAINS and "." in domain


def detect_socials(website: str) -> list[str]:
    """
    Detecta qué redes sociales están mencionadas en el campo website.
    Retorna lista de nombres de plataformas: ["instagram", "facebook", ...]
    """
    if not website or pd.isna(website):
        return []

    website_lower = str(website).lower()
    detected = []
    for platform, domains in SOCIAL_PLATFORMS.items():
        for domain in domains:
            if domain in website_lower:
                detected.append(platform)
                break

    return detected


def has_own_website(website: str) -> bool:
    """
    Retorna True si el lead tiene un sitio web propio (no es solo red social).
    Evalúa TODOS los URLs separados por espacio/coma del campo website.
    """
    if not website or pd.isna(website):
        return False

    # Separar múltiples URLs
    urls = re.split(r"[\s,;|]+", str(website).strip())

    for url in urls:
        url = url.strip().lower()
        if not url or not ("http" in url or "." in url):
            continue

    # Normalizar para comparar dominio
    try:
        parsed = urlparse(url if url.startswith("http") else "http://" + url)
        hostname = parsed.hostname or ""
    except Exception:
        hostname = url

    # Chequear si el hostname contiene algún dominio social
    is_social = any(social in hostname for social in ALL_SOCIAL_DOMAINS)
    if not is_social and hostname and "." in hostname:
        return True

    return False


def extract_whatsapp_number(website: str) -> str:
    """
    Intenta extraer un número de teléfono de un link de WhatsApp en el website.
    Ej: https://wa.me/5491122334455 -> 5491122334455
    """
    if not website or pd.isna(website):
        return ""
    
    # Regex para detectar números en links de wa.me o whatsapp.com/send?phone=...
    patterns = [
        r"wa\.me/(\d+)",
        r"phone=(\d+)",
        r"send\?phone=(\d+)",
        r"whatsapp\.com/send/(\d+)"
    ]
    
    website_str = str(website).lower()
    for pattern in patterns:
        match = re.search(pattern, website_str)
        if match:
            return match.group(1)
            
    return ""


def calculate_digital_score(
    corporate_email: bool,
    own_website: bool,
    socials: list[str],
    existing_score: float = 0,
) -> int:
    """
    Calcula el score de madurez digital (0-100).
    Puntuación:
      +20: email institucional
      +20: web propia (no red social)
      +15: LinkedIn
      +10: Instagram
      +10: Facebook
      + 5: otras redes (Twitter, TikTok, YouTube, WhatsApp)
    """
    score = 0
    if corporate_email:
        score += 20
    if own_website:
        score += 20
    if "linkedin" in socials:
        score += 15
    if "instagram" in socials:
        score += 10
    if "facebook" in socials:
        score += 10
    other_nets = [s for s in socials if s not in {"linkedin", "instagram", "facebook"}]
    score += min(len(other_nets) * 5, 10)

    return min(score, 100)


def detect_presence(df: pd.DataFrame, empresas_db: str = None) -> pd.DataFrame:
    """
    Analiza la presencia digital de todos los leads en el DataFrame.
    Agrega columnas:
      - correo_institucional (bool)
      - redes_detectadas (str, separado por comas)
      - tiene_web_propia (bool)
      - digital_score_lice (int)
      - whatsapp_number (str)

    Args:
        df: DataFrame con columnas 'email' y 'website'
        empresas_db: Ruta a empresas.db para enriquecer emails (opcional)
    """
    print(f"🌐 Detectando presencia digital en {len(df)} leads...")

    # Enriquecer emails desde empresas.db si está disponible
    extra_emails: dict[str, str] = {}
    if empresas_db:
        try:
            conn = sqlite3.connect(empresas_db)
            rows = conn.execute(
                "SELECT place_id, business_email FROM business_emails WHERE business_email IS NOT NULL"
            ).fetchall()
            conn.close()
            extra_emails = {row[0]: row[1] for row in rows}
            print(f"   ℹ️  {len(extra_emails)} emails adicionales desde empresas.db")
        except Exception as e:
            print(f"   ⚠️  empresas.db no disponible: {e}")

    corp_emails = []
    redes_list = []
    has_web_list = []
    scores = []
    whatsapp_numbers = []

    for _, row in df.iterrows():
        # Email: usar el del lead o el de empresas.db si existe
        email = str(row.get("email", "") or "")
        if not email and extra_emails:
            lead_id = str(row.get("id", ""))
            email = extra_emails.get(lead_id, "")

        website = str(row.get("website", "") or "")

        corporate = is_corporate_email(email)
        socials = detect_socials(website)
        own_web = has_own_website(website)
        score = calculate_digital_score(corporate, own_web, socials)
        whatsapp = extract_whatsapp_number(website)

        corp_emails.append(corporate)
        redes_list.append(",".join(socials))
        has_web_list.append(own_web)
        scores.append(score)
        whatsapp_numbers.append(whatsapp)

    df["correo_institucional"] = corp_emails
    df["redes_detectadas"]     = redes_list
    df["tiene_web_propia"]     = has_web_list
    df["digital_score_lice"]   = scores
    df["whatsapp_number"]      = whatsapp_numbers

    # Estadísticas
    n_corp   = sum(corp_emails)
    n_web    = sum(has_web_list)
    n_social = sum(1 for r in redes_list if r)
    n_wa     = sum(1 for w in whatsapp_numbers if w)

    print(f"   ✅ Email corporativo: {n_corp} ({n_corp/len(df)*100:.1f}%)")
    print(f"   ✅ Web propia:        {n_web} ({n_web/len(df)*100:.1f}%)")
    print(f"   ✅ Con redes:         {n_social} ({n_social/len(df)*100:.1f}%)")
    print(f"   ✅ Con WhatsApp:      {n_wa} ({n_wa/len(df)*100:.1f}%)")

    return df
