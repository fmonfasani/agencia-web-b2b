"""
Enriquece leads: busca email en la web, detecta si la web es vieja/lenta,
asigna score final y dolor específico.
Uso: python3 enricher.py --limit 50
"""
import asyncio, re, argparse, os
from playwright.async_api import async_playwright
import psycopg2, psycopg2.extras
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

EMAIL_RE = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')

IGNORE_DOMAINS = ["sentry.io", "wixpress.com", "squarespace.com",
                  "shopify.com", "example.com", "gmail.com", "hotmail.com"]

async def enrich_lead(page, lead: dict) -> dict:
    updates = {}

    # Si tiene web, visitarla y buscar email
    if lead["tiene_web"] and lead["url_web"]:
        try:
            await page.goto(lead["url_web"], timeout=10000, wait_until="domcontentloaded")
            content = await page.content()

            # Buscar emails en el HTML
            emails = EMAIL_RE.findall(content)
            valid_emails = [
                e for e in emails
                if not any(d in e for d in IGNORE_DOMAINS)
                and len(e) < 80
            ]
            if valid_emails:
                updates["email"] = valid_emails[0]

            # Detectar tecnología de la web
            dolor_parts = []
            if "wordpress" in content.lower():
                dolor_parts.append("WordPress detectado")
            if "wix" in content.lower():
                dolor_parts.append("Wix detectado - baja performance")
            if "2018" in content or "2019" in content or "2020" in content:
                dolor_parts.append("Web desactualizada (año antiguo)")

            if dolor_parts:
                updates["dolor"] = " | ".join(dolor_parts)
                updates["score"] = 60
            else:
                updates["score"] = 25  # tiene web moderna → menos urgencia

        except Exception:
            pass  # Web inaccesible
    else:
        # Sin web = máximo score
        updates["score"] = 90
        updates["dolor"] = "Sin sitio web — oportunidad directa"

    return updates

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=50)
    args = parser.parse_args()

    conn = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)

    with conn.cursor() as cur:
        cur.execute("""
            SELECT id, nombre, tiene_web, url_web
            FROM leads
            WHERE status = 'NEW' AND email IS NULL
            ORDER BY score DESC
            LIMIT %s
        """, (args.limit,))
        leads = cur.fetchall()

    print(f"🔍 Enriqueciendo {len(leads)} leads...\n")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page    = await browser.new_page()

        for lead in leads:
            print(f"  → {lead['nombre']}", end=" ")
            updates = await enrich_lead(page, lead)

            if updates:
                set_clause = ", ".join(f"{k} = %s" for k in updates)
                values     = list(updates.values()) + [lead["id"]]
                with conn.cursor() as cur:
                    cur.execute(f"UPDATE leads SET {set_clause} WHERE id = %s", values)
                conn.commit()
                print(f"✅ email={updates.get('email','—')} score={updates.get('score','—')}")
            else:
                print("—")

        await browser.close()

    conn.close()
    print("\n✅ Enriquecimiento completo")

asyncio.run(main())
