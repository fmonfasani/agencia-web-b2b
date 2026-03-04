"""
Muestra el estado del pipeline en la terminal.
Uso: python3 status.py
"""
import os, psycopg2, psycopg2.extras
from dotenv import load_dotenv

load_dotenv()
conn = psycopg2.connect(os.getenv("DATABASE_URL"), cursor_factory=psycopg2.extras.RealDictCursor)

with conn.cursor() as cur:
    cur.execute("SELECT COUNT(*) as total FROM leads")
    total = cur.fetchone()["total"]

    cur.execute("SELECT status, COUNT(*) as n FROM leads GROUP BY status ORDER BY n DESC")
    by_status = cur.fetchall()

    cur.execute("SELECT rubro, COUNT(*) as n FROM leads GROUP BY rubro ORDER BY n DESC LIMIT 10")
    by_rubro = cur.fetchall()

    cur.execute("SELECT COUNT(*) as n FROM leads WHERE email IS NOT NULL")
    con_email = cur.fetchone()["n"]

    cur.execute("SELECT COUNT(*) as n FROM leads WHERE email_enviado = true")
    contactados = cur.fetchone()["n"]

    cur.execute("SELECT COUNT(*) as n FROM leads WHERE status = 'RESPONDED'")
    respondieron = cur.fetchone()["n"]

    cur.execute("SELECT COUNT(*) as n FROM leads WHERE status = 'CLOSED_WON'")
    cerrados = cur.fetchone()["n"]

conn.close()

print("\n" + "="*50)
print("📊 ESTADO DEL PIPELINE")
print("="*50)
print(f"Total leads:        {total}")
print(f"Con email:          {con_email} ({round(con_email/total*100 if total else 0)}%)")
print(f"Contactados:        {contactados}")
print(f"Respondieron:       {respondieron}")
print(f"Cerrados (won):     {cerrados}")

if contactados:
    print(f"\nConversión contacto→respuesta: {round(respondieron/contactados*100 if contactados else 0)}%")
if respondieron:
    print(f"Conversión respuesta→cierre:   {round(cerrados/respondieron*100 if respondieron else 0)}%")

print("\n--- Por status ---")
for row in by_status:
    print(f"  {row['status']:20} {row['n']}")

print("\n--- Top rubros ---")
for row in by_rubro:
    print(f"  {row['rubro']:25} {row['n']}")
print()
