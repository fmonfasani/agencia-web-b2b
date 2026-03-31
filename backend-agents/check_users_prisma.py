import psycopg2

DB_DSN = "postgresql://postgres:Karaoke27570Echeverria@localhost:5432/agencia_web_b2b"

conn = psycopg2.connect(DB_DSN)
cur = conn.cursor()

print("=" * 80)
print("USUARIOS EN TABLA \"User\" DE PRISMA")
print("=" * 80)

cur.execute('SELECT id, email, "apiKey", role, status FROM "User" ORDER BY "createdAt" DESC LIMIT 10;')

for row in cur.fetchall():
    user_id, email, api_key, role, status = row
    print(f"\nID:       {user_id}")
    print(f"Email:    {email}")
    print(f"API Key:  {api_key}")
    print(f"Rol:      {role}")
    print(f"Status:   {status}")

conn.close()

print("\n" + "=" * 80)