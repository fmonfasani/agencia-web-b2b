"""
seed_users_prisma.py — Crea usuarios en tabla "User" de Prisma
Correr UNA SOLA VEZ: python seed_users_prisma.py
"""

import psycopg2
import hashlib
import secrets
import json

DB_DSN = "postgresql://postgres:Karaoke27570Echeverria@localhost:5432/agencia_web_b2b"

def hash_password(password: str) -> str:
    """Hash de contraseña con SHA256 pre-hash + bcrypt."""
    from passlib.context import CryptContext
    _pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
    _PREHASH_PREFIX = "sha256$"
    
    prehashed = hashlib.sha256(password.encode("utf-8")).hexdigest()
    bcrypt_hash = _pwd_ctx.hash(prehashed)
    return f"{_PREHASH_PREFIX}{bcrypt_hash}"

def generate_api_key(rol: str) -> str:
    """Genera API Key única."""
    return f"wh_{rol}_{secrets.token_hex(12)}"

def seed():
    print("=" * 80)
    print("SEED — Creando usuarios en tabla \"User\" de Prisma")
    print("=" * 80)

    conn = psycopg2.connect(DB_DSN)
    cur = conn.cursor()

    try:
        # Verificar si la tabla "User" existe
        print("\n[1/3] Verificando tabla \"User\"...")
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'User'
            );
        """)
        
        table_exists = cur.fetchone()[0]
        if not table_exists:
            print("  ✗ Tabla \"User\" no existe. ¿Ejecutaste migrations de Prisma?")
            print("  Comando: npx prisma migrate dev")
            conn.close()
            return

        print("  ✓ Tabla \"User\" existe")

        # Verificar si ya existen usuarios
        print("\n[2/3] Verificando usuarios existentes...")
        cur.execute('SELECT COUNT(*) FROM "User"')
        count = cur.fetchone()[0]

        if count > 0:
            print(f"  [WARN] Ya existen {count} usuario(s). No se crean duplicados.")
            conn.close()
            return

        # Insertar usuarios
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
            user_id = f"c_{secrets.token_hex(10)}"

            cur.execute(
                """
                INSERT INTO "User" 
                (id, email, "passwordHash", name, role, "defaultTenantId", "apiKey", status, "createdAt", "updatedAt")
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                RETURNING id, email, "apiKey", role, "defaultTenantId"
                """,
                (
                    user_id,
                    user_data["email"],
                    password_hash,
                    user_data["nombre"],
                    user_data["rol"].upper(),
                    user_data["tenant_id"],
                    api_key,
                    "ACTIVE",
                ),
            )

            result = cur.fetchone()
            created_users.append({
                "id": result[0],
                "email": result[1],
                "api_key": result[2],
                "rol": result[3].lower(),
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
        print("   python test_e2e.py")
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
