import httpx
import json
import asyncio

async def test_scraper():
    url = "http://localhost:8000/scraper/run"
    headers = {
        "Content-Type": "application/json",
        "x-admin-secret": "tu_admin_secret_aqui"
    }
    payload = {
        "query": "gimnasios",
        "location": "Buenos Aires",
        "max_leads": 5,
        "tenant_id": "test-tenant",
        "provider": "google"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            print(f"Enviando request a {url}...")
            response = await client.post(url, json=payload, headers=headers)
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_scraper())
