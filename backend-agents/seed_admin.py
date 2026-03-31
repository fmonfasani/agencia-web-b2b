"""
seed_admin.py — Crea el primer admin del sistema.
Correr UNA SOLA VEZ:  python seed_admin.py

Podés cambiar las credenciales antes de correrlo.
"""
from app.auth_service import setup_users_table, create_user, hash_password
import psycopg2

DB_DSN = "postgresql://postgres:Karaoke27570Echeverria@localhost:5432/agencia_web_b2b"

# ---------------------------------------------------------------------------
# CONFIGURÁ ESTAS CREDENCIALES ANTES DE CORRER
# ---------------------------------------------------------------------------
ADMIN_EMAIL    = "admin@webshooks.com"
ADMIN_PASSWORD = "Admin2026!"
ADMIN_NOMBRE   = "Admin Principal"
# ---------------------------------------------------------------------------

def seed():
    print("=" * 50)
    print("SEED -- Creando admin inicial")
    print("=" * 50)

    # Crear tabla si no existe
    setup_users_table()

    # Verificar si ya existe un admin
    conn = psycopg2.connect(DB_DSN)
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM users WHERE rol = 'admin'")
    count = cur.fetchone()[0]
    conn.close()

    if count > 0:
        print(f"[WARN] Ya existe {count} admin(s) en la DB. No se crea otro.")
        print("   Si queres crear otro admin, usa POST /auth/create-analista desde Swagger.")
        return

    # Crear admin activo directamente
    user = create_user(
        email=ADMIN_EMAIL,
        password=ADMIN_PASSWORD,
        nombre=ADMIN_NOMBRE,
        rol="admin",
        activo=True,  # admin se crea activo
    )

    print(f"\n[OK] Admin creado correctamente")
    print(f"   Email:   {user['email']}")
    print(f"   Nombre:  {user['nombre']}")
    print(f"   API Key: {user['api_key']}")
    print(f"\n>> Guarda esta API Key -- la necesitas para el boton Authorize en Swagger")
    print(f"   http://localhost:8000/docs")
    print("=" * 50)


if __name__ == "__main__":
    seed()
