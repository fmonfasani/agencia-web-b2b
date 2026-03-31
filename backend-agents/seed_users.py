"""
seed_users_v2.py — Crea tabla users e inserta usuarios iniciales
Correr UNA SOLA VEZ: python seed_users_v2.py
"""

import psycopg2
import hashlib
import secrets
import json
from passlib.context import CryptContext

DB_DSN = "postgresql://postgres:Karaoke27570Echeverria@localhost:5432/agencia_web_b2b"

_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
_PREHASH_PREFIX = "sha256$"

def hash_password(password: str) -> str:
    """Mismo algoritmo que auth_service.py: SHA256 prehash + bcrypt."""
    prehashed = hashlib.sha256(password.encode("utf-8")).hexdigest()
    return f"{_PREHASH_PREFIX}{_pwd_ctx.hash(prehashed)}"

def generate_api_key(rol: str) -> str:
    """Genera API Key única."""
    return f"wh_{rol}_{secrets.token_hex(12)}"

def seed():
    print("=" * 80)
    print("SEED — Creando tabla users e insertando usuarios")
    print("=" * 80)

    conn = psycopg2.connect(DB_DSN)
    cur = conn.cursor()

    try:
        # 1. Crear tabla users si no existe
        print("\n[1/3] Creando tabla users...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id                  SERIAL PRIMARY KEY,
                email               VARCHAR(100) UNIQUE NOT NULL,
                password_hash       VARCHAR(255) NOT NULL,
                nombre              VARCHAR(200),
                rol                 VARCHAR(50) NOT NULL,
                tenant_id           VARCHAR(100),
                api_key             VARCHAR(100) UNIQUE NOT NULL,
                activo              BOOLEAN DEFAULT TRUE,
                created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        print("  ✓ Tabla users creada (o ya existe)")

        # 2. Verificar si ya existen usuarios
        print("\n[2/3] Verificando usuarios existentes...")
        cur.execute("SELECT COUNT(*) FROM users")
        count = cur.fetchone()[0]

        if count > 0:
            print(f"  [WARN] Ya existen {count} usuario(s). No se crean duplicados.")
            conn.close()
            return

        # 3. Insertar usuarios
        print("\n[3/3] Insertando usuarios...")

        usuarios = [
            {
                "email": "cliente@webshooks.com",
                "password": "Cliente2026!",
                "nombre": "Usuario Cliente",
                "rol": "cliente",
                "tenant_id": "tenant_cliente_default",
            },
            {
                "email": "admin@webshooks.com",
                "password": "Admin2026!",
                "nombre": "Administrador",
                "rol": "admin",
                "tenant_id": None,
            },
            {
                "email": "superadmin@webshooks.com",
                "password": "SuperAdmin2026!",
                "nombre": "Super Administrador",
                "rol": "superadmin",
                "tenant_id": None,
            },
        ]

        created_users = []

        for user_data in usuarios:
            password_hash = hash_password(user_data["password"])
            api_key = generate_api_key(user_data["rol"])

            cur.execute(
                """
                INSERT INTO users (email, password_hash, nombre, rol, tenant_id, api_key, activo)
                VALUES (%s, %s, %s, %s, %s, %s, TRUE)
                RETURNING id, email, api_key, rol, tenant_id
                """,
                (
                    user_data["email"],
                    password_hash,
                    user_data["nombre"],
                    user_data["rol"],
                    user_data["tenant_id"],
                    api_key,
                ),
            )

            result = cur.fetchone()
            created_users.append({
                "id": result[0],
                "email": result[1],
                "api_key": result[2],
                "rol": result[3],
                "tenant_id": result[4],
            })
            print(f"  ✓ {user_data['rol'].upper()} creado: {user_data['email']}")

        conn.commit()

        # Mostrar credenciales
        print("\n" + "=" * 80)
        print("CREDENCIALES CREADAS")
        print("=" * 80 + "\n")

        for user in created_users:
            print(f"👤 Rol:      {user['rol'].upper()}")
            print(f"📧 Email:    {user['email']}")
            print(f"🔑 API Key:  {user['api_key']}")
            if user['tenant_id']:
                print(f"🏢 Tenant:   {user['tenant_id']}")
            print()

        # Guardar credenciales en archivo
        creds_file = "CREDENCIALES_SEED.json"
        with open(creds_file, "w") as f:
            json.dump(created_users, f, indent=2)

        print("=" * 80)
        print(f"✓ Credenciales guardadas en: {creds_file}")
        print()
        print("PRÓXIMOS PASOS:")
        print()
        print("1. Para test_e2e.py:")
        print("   Edita test_e2e.py línea 16:")
        print(f"   TEST_API_KEY = \"{created_users[0]['api_key']}\"  # Cliente")
        print()
        print("2. Para Swagger:")
        print("   http://localhost:8000/docs")
        print("   Presioná 'Authorize' y pega cualquiera de los API Keys arriba")
        print()
        print("3. Para ejecutar tests:")
        print("   cd .. && python test_e2e.py")
        print("=" * 80)

    except Exception as e:
        conn.rollback()
        print(f"\n✗ Error: {e}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    seed()