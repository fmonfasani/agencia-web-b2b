"""
auth_service.py — Lógica de autenticación con API Keys
"""
import hashlib
import secrets
import logging
import psycopg2
import os
from typing import Optional
from passlib.context import CryptContext

_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
_PREHASH_PREFIX = "sha256$"

logger = logging.getLogger(__name__)

# Configuración de DB con prioridad a variable de entorno para Docker/Local
DEFAULT_DSN = "postgresql://postgres:Karaoke27570Echeverria@127.0.0.1:5432/agencia_web_b2b"
DB_DSN = os.getenv("DATABASE_URL", DEFAULT_DSN)

# ---------------------------------------------------------------------------
# Setup tabla users
# ---------------------------------------------------------------------------

def setup_users_table():
    """Deprecado: El esquema es manejado por Prisma."""
    pass


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    """
    Hashea password usando pre-hash SHA256 + bcrypt.
    Evita el limite de 72 bytes de bcrypt y mantiene formato versionado.
    """
    prehashed = hashlib.sha256(password.encode("utf-8")).hexdigest()
    return f"{_PREHASH_PREFIX}{_pwd_ctx.hash(prehashed)}"


def verify_password(plain: str, stored_hash: str) -> bool:
    """Verifica password contra bcrypt o scrypt (frontend)."""
    if not stored_hash:
        return False
    
    # Soporte para scrypt del frontend (formato salt:hash)
    if ":" in stored_hash:
        try:
            salt_hex, hash_hex = stored_hash.split(":")
            salt = bytes.fromhex(salt_hex)
            stored_hash_bytes = bytes.fromhex(hash_hex)
            
            # Node defaults: N=16384, r=8, p=1, dklen=64
            computed_hash = hashlib.scrypt(
                plain.encode("utf-8"),
                salt=salt,
                n=16384,
                r=8,
                p=1,
                maxmem=32 * 1024 * 1024, # 32MB should be enough for N=16384
                dklen=len(stored_hash_bytes)
            )
            return secrets.compare_digest(computed_hash, stored_hash_bytes)
        except Exception as e:
            logger.error(f"Error verificando scrypt hash: {e}")
            return False

    if len(stored_hash) == 64 and all(c in "0123456789abcdef" for c in stored_hash):
        # Hash legacy SHA256 — comparar y migrar en el próximo login
        return hashlib.sha256(plain.encode()).hexdigest() == stored_hash
    
    if stored_hash.startswith(_PREHASH_PREFIX):
        bcrypt_hash = stored_hash[len(_PREHASH_PREFIX):]
        prehashed = hashlib.sha256(plain.encode("utf-8")).hexdigest()
        return _pwd_ctx.verify(prehashed, bcrypt_hash)

    # Backward-compat con bcrypt historico sin pre-hash
    return _pwd_ctx.verify(plain, stored_hash)


def generate_api_key() -> str:
    return f"wh_{secrets.token_urlsafe(32)}"


# ---------------------------------------------------------------------------
# Operaciones
# ---------------------------------------------------------------------------

def create_user(
    email: str,
    password: str,
    nombre: str,
    rol: str,
    tenant_id: Optional[str] = None,
    activo: bool = False,
) -> dict:
    conn = psycopg2.connect(DB_DSN)
    cur = conn.cursor()

    # Verificar email duplicado
    cur.execute('SELECT id FROM "User" WHERE email = %s', (email,))
    if cur.fetchone():
        conn.close()
        raise ValueError(f"El email '{email}' ya está registrado")

    api_key = generate_api_key()
    password_hash = hash_password(password)
    status = "ACTIVE" if activo else "INACTIVE"
    user_id = f"c_{secrets.token_hex(10)}" # Generar un ID compatible con cuid-ish strings

    cur.execute("""
        INSERT INTO "User" (id, email, "passwordHash", name, role, "defaultTenantId", "apiKey", status, "updatedAt")
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
        RETURNING id
    """, (user_id, email, password_hash, nombre, rol.upper(), tenant_id, api_key, status))

    row = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()

    return {
        "id": row[0],
        "email": email,
        "nombre": nombre,
        "rol": rol,
        "tenant_id": tenant_id,
        "api_key": api_key,
        "activo": activo,
    }


def login_user(email: str, password: str) -> dict:
    conn = psycopg2.connect(DB_DSN)
    cur = conn.cursor()

    cur.execute("""
        SELECT id, email, name, role, "defaultTenantId", "apiKey", status, "passwordHash"
        FROM "User" WHERE email = %s
    """, (email,))
    row = cur.fetchone()
    conn.close()

    if not row:
        raise ValueError("Email o contraseña incorrectos")

    id_, email_, nombre, rol, tenant_id, api_key, status, password_hash = row

    if not verify_password(password, password_hash):
        raise ValueError("Email o contraseña incorrectos")

    if status != "ACTIVE":
        raise ValueError("Usuario pendiente de activación. Contactá al administrador.")

    return {
        "id": id_,
        "email": email_,
        "nombre": nombre or "Usuario",
        "rol": rol.lower() if rol else "member",
        "tenant_id": tenant_id,
        "api_key": api_key,
    }


def get_user_by_api_key(api_key: str) -> Optional[dict]:
    """Verifica la API key y retorna el usuario. Retorna None si es inválida."""
    conn = psycopg2.connect(DB_DSN)
    cur = conn.cursor()
    cur.execute("""
        SELECT id, email, name, role, "defaultTenantId", status
        FROM "User" WHERE "apiKey" = %s
    """, (api_key,))
    row = cur.fetchone()
    conn.close()

    if not row:
        return None
    id_, email, nombre, rol, tenant_id, status = row
    if status != "ACTIVE":
        return None
    return {"id": id_, "email": email, "nombre": nombre or "Usuario", "rol": rol.lower() if rol else "member", "tenant_id": tenant_id}


def list_users() -> list[dict]:
    conn = psycopg2.connect(DB_DSN)
    cur = conn.cursor()
    cur.execute("""
        SELECT id, email, name, role, "defaultTenantId", status, "createdAt"
        FROM "User" ORDER BY "createdAt" DESC
    """)
    rows = cur.fetchall()
    conn.close()
    return [
        {"id": r[0], "email": r[1], "nombre": r[2], "rol": r[3],
         "tenant_id": r[4], "activo": r[5] == "ACTIVE", "created_at": str(r[6])}
        for r in rows
    ]


def activate_user(user_id: str, activo: bool) -> dict:
    conn = psycopg2.connect(DB_DSN)
    cur = conn.cursor()
    status = "ACTIVE" if activo else "INACTIVE"
    cur.execute("""
        UPDATE "User" SET status = %s WHERE id = %s
        RETURNING id, email, name, role, status
    """, (status, user_id))
    row = cur.fetchone()
    conn.commit()
    conn.close()
    if not row:
        raise ValueError(f"Usuario {user_id} no encontrado")
    return {"id": row[0], "email": row[1], "nombre": row[2], "rol": row[3], "activo": row[4] == "ACTIVE"}
