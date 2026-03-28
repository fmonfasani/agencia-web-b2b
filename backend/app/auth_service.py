"""
auth_service.py — Lógica de autenticación con API Keys
"""
import hashlib
import secrets
import logging
import psycopg2
from typing import Optional
from passlib.context import CryptContext

_pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
_PREHASH_PREFIX = "sha256$"

logger = logging.getLogger(__name__)

DB_DSN = "postgresql://postgres:Karaoke27570Echeverria@localhost:5432/agencia_web_b2b"


# ---------------------------------------------------------------------------
# Setup tabla users
# ---------------------------------------------------------------------------

def setup_users_table():
    conn = psycopg2.connect(DB_DSN)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id              SERIAL PRIMARY KEY,
            email           VARCHAR(200) UNIQUE NOT NULL,
            password_hash   VARCHAR(200) NOT NULL,
            nombre          VARCHAR(200) NOT NULL,
            rol             VARCHAR(20) NOT NULL DEFAULT 'cliente',
            tenant_id       VARCHAR(100),
            api_key         VARCHAR(100) UNIQUE NOT NULL,
            activo          BOOLEAN DEFAULT FALSE,
            created_at      TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);
        CREATE INDEX IF NOT EXISTS idx_users_email   ON users(email);
    """)
    conn.commit()
    cur.close()
    conn.close()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    """
    Hashea password usando pre-hash SHA256 + bcrypt.
    Evita el limite de 72 bytes de bcrypt y mantiene formato versionado.
    """
    prehashed = hashlib.sha256(password.encode("utf-8")).digest()
    return f"{_PREHASH_PREFIX}{_pwd_ctx.hash(prehashed)}"


def verify_password(plain: str, stored_hash: str) -> bool:
    """Verifica password contra bcrypt. Backward-compat con SHA256 legacy."""
    if len(stored_hash) == 64 and all(c in "0123456789abcdef" for c in stored_hash):
        # Hash legacy SHA256 — comparar y migrar en el próximo login
        return hashlib.sha256(plain.encode()).digest() == stored_hash
    if stored_hash.startswith(_PREHASH_PREFIX):
        bcrypt_hash = stored_hash[len(_PREHASH_PREFIX):]
        prehashed = hashlib.sha256(plain.encode("utf-8")).digest()
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
    cur.execute("SELECT id FROM users WHERE email = %s", (email,))
    if cur.fetchone():
        conn.close()
        raise ValueError(f"El email '{email}' ya está registrado")

    # Validar cliente tiene tenant_id
    if rol == "cliente" and not tenant_id:
        conn.close()
        raise ValueError("Los clientes deben tener un tenant_id")

    api_key = generate_api_key()
    password_hash = hash_password(password)

    cur.execute("""
        INSERT INTO users (email, password_hash, nombre, rol, tenant_id, api_key, activo)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """, (email, password_hash, nombre, rol, tenant_id, api_key, activo))

    user_id = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()

    return {
        "id": user_id,
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
        SELECT id, email, nombre, rol, tenant_id, api_key, activo, password_hash
        FROM users WHERE email = %s
    """, (email,))
    row = cur.fetchone()
    conn.close()

    if not row:
        raise ValueError("Email o contraseña incorrectos")

    id_, email_, nombre, rol, tenant_id, api_key, activo, password_hash = row

    if not verify_password(password, password_hash):
        raise ValueError("Email o contraseña incorrectos")

    # Migrar hash legacy SHA256 → bcrypt silenciosamente
    if len(password_hash) == 64 and all(c in "0123456789abcdef" for c in password_hash):
        new_hash = hash_password(password)
        with psycopg2.connect(DB_DSN) as _conn:
            with _conn.cursor() as _cur:
                _cur.execute("UPDATE users SET password_hash=%s WHERE id=%s", (new_hash, id_))
            _conn.commit()

    if not activo:
        raise ValueError("Usuario pendiente de activación. Contactá al administrador.")

    return {
        "id": id_,
        "email": email_,
        "nombre": nombre,
        "rol": rol,
        "tenant_id": tenant_id,
        "api_key": api_key,
    }


def get_user_by_api_key(api_key: str) -> Optional[dict]:
    """Verifica la API key y retorna el usuario. Retorna None si es inválida."""
    conn = psycopg2.connect(DB_DSN)
    cur = conn.cursor()
    cur.execute("""
        SELECT id, email, nombre, rol, tenant_id, activo
        FROM users WHERE api_key = %s
    """, (api_key,))
    row = cur.fetchone()
    conn.close()

    if not row:
        return None
    id_, email, nombre, rol, tenant_id, activo = row
    if not activo:
        return None
    return {"id": id_, "email": email, "nombre": nombre, "rol": rol, "tenant_id": tenant_id}


def list_users() -> list[dict]:
    conn = psycopg2.connect(DB_DSN)
    cur = conn.cursor()
    cur.execute("""
        SELECT id, email, nombre, rol, tenant_id, activo, created_at
        FROM users ORDER BY created_at DESC
    """)
    rows = cur.fetchall()
    conn.close()
    return [
        {"id": r[0], "email": r[1], "nombre": r[2], "rol": r[3],
         "tenant_id": r[4], "activo": r[5], "created_at": str(r[6])}
        for r in rows
    ]


def activate_user(user_id: int, activo: bool) -> dict:
    conn = psycopg2.connect(DB_DSN)
    cur = conn.cursor()
    cur.execute("""
        UPDATE users SET activo = %s WHERE id = %s
        RETURNING id, email, nombre, rol, activo
    """, (activo, user_id))
    row = cur.fetchone()
    conn.commit()
    conn.close()
    if not row:
        raise ValueError(f"Usuario {user_id} no encontrado")
    return {"id": row[0], "email": row[1], "nombre": row[2], "rol": row[3], "activo": row[4]}
