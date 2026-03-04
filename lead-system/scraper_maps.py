"""
Scraper de Google Maps — extrae negocios por rubro y ciudad.
Uso: python3 scraper_maps.py --rubro "peluqueria" --ciudad "Cordoba" --limite 50
"""
import asyncio, argparse, json, re, time, os
from playwright.async_api import async_playwright
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

async def scrape_google_maps(rubro: str, ciudad: str, limite: int) -> list[dict]:
    leads = []
    query = f"{rubro} en {ciudad} Argentina"

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        await page.goto(f"https://www.google.com/maps/search/{query.replace(' ', '+')}")
        await page.wait_for_timeout(3000)

        # Scroll para cargar más resultados
        for _ in range(10):
            await page.keyboard.press("End")
            await page.wait_for_timeout(1500)

        # Obtener todos los resultados
        results = await page.query_selector_all('[role="feed"] > div > div > a')

        for result in results[:limite]:
            try:
                await result.click()
                await page.wait_for_timeout(2000)

                lead = {
                    "nombre": "",
                    "rubro": rubro,
                    "ciudad": ciudad,
                    "telefono": "",
                    "url_web": "",
                    "tiene_web": False,
                    "fuente": "google_maps",
                }

                # Nombre
                name_el = await page.query_selector('h1')
                if name_el:
                    lead["nombre"] = await name_el.inner_text()

                # Teléfono
                phone_el = await page.query_selector('[data-tooltip="Copiar número de teléfono"]')
                if phone_el:
                    lead["telefono"] = await phone_el.get_attribute("aria-label") or ""
                    lead["telefono"] = lead["telefono"].replace("Número de teléfono: ", "")

                # Web
                web_el = await page.query_selector('[data-tooltip="Abrir sitio web"]')
                if web_el:
                    lead["url_web"] = await web_el.get_attribute("href") or ""
                    lead["tiene_web"] = bool(lead["url_web"])

                # Score básico: sin web = más interesante
                lead["score"] = 80 if not lead["tiene_web"] else 30
                lead["dolor"] = "Sin presencia web detectada" if not lead["tiene_web"] else "Web existente - evaluar calidad"

                if lead["nombre"]:
                    leads.append(lead)
                    print(f"  ✅ {lead['nombre']} | Web: {'Sí' if lead['tiene_web'] else 'No'} | Tel: {lead['telefono']}")

            except Exception as e:
                continue

        await browser.close()

    return leads

def save_to_db(leads: list[dict]):
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    inserted = 0
    skipped  = 0
    with conn:
        with conn.cursor() as cur:
            for lead in leads:
                # Evitar duplicados por nombre + ciudad
                cur.execute(
                    "SELECT id FROM leads WHERE nombre = %s AND ciudad = %s",
                    (lead["nombre"], lead["ciudad"])
                )
                if cur.fetchone():
                    skipped += 1
                    continue
                cur.execute("""
                    INSERT INTO leads (nombre, rubro, ciudad, telefono, url_web, tiene_web, score, dolor, fuente)
                    VALUES (%(nombre)s, %(rubro)s, %(ciudad)s, %(telefono)s, %(url_web)s,
                            %(tiene_web)s, %(score)s, %(dolor)s, %(fuente)s)
                """, lead)
                inserted += 1
    conn.close()
    print(f"\n📊 Insertados: {inserted} | Duplicados ignorados: {skipped}")

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--rubro",  default="peluqueria")
    parser.add_argument("--ciudad", default="Córdoba")
    parser.add_argument("--limite", type=int, default=30)
    args = parser.parse_args()

    print(f"\n🔍 Scrapeando: {args.rubro} en {args.ciudad} (límite: {args.limite})\n")
    leads = await scrape_google_maps(args.rubro, args.ciudad, args.limite)
    print(f"\n💾 Guardando {len(leads)} leads en DB...")
    save_to_db(leads)

asyncio.run(main())
