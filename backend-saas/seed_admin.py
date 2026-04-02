#!/usr/bin/env python3
"""
seed_admin.py — Script para crear el usuario administrador inicial

USO:
    python seed_admin.py

RESULTADO:
    - Crea user con email=admin@webshooks.com, role=admin, activo=True
    - Maneja duplicados sin error
    - Imprime credenciales de forma clara
"""

import sys
import os
import io

# Configure UTF-8 output on Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Agregar app al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.auth_service import create_user
from app.lib.exceptions import DuplicateEmailError, WebshooksException


def seed_admin() -> None:
    """Crea el usuario admin inicial o informa si ya existe."""

    email = "admin@webshooks.com"
    password = "ChangeMe123!"
    nombre = "Administrador"
    rol = "admin"

    try:
        result = create_user(
            email=email,
            password=password,
            nombre=nombre,
            rol=rol,
            tenant_id=None,
            activo=True,
        )

        # Éxito: Usuario creado
        print("\n" + "="*70)
        print("[OK] Admin user created successfully!")
        print("="*70)
        print(f"   Email:     {result['email']}")
        print(f"   Password:  {password}")
        print(f"   ID:        {result['id']}")
        print(f"   API Key:   {result['api_key']}")
        print("="*70)
        print("\n[WARNING] IMPORTANTE:")
        print("   1. Guardá el API Key en lugar seguro (no compartir)")
        print("   2. Cambiá la contraseña en la siguiente acción")
        print("   3. No compartir esta información con nadie")
        print()

    except DuplicateEmailError as e:
        # Admin ya existe: información
        print("\n" + "="*70)
        print("[INFO] Admin user already exists")
        print("="*70)
        print(f"   Email: {email}")
        print(f"   Status: ACTIVE")
        print("="*70)
        print("\n[INFO] The admin user is already initialized.")
        print()

    except WebshooksException as e:
        # Error controlado
        print("\n" + "="*70)
        print(f"[ERROR] {e.message}")
        print("="*70)
        sys.exit(1)

    except Exception as e:
        # Error inesperado
        print("\n" + "="*70)
        print(f"[ERROR] Unexpected error: {type(e).__name__}")
        print(f"        {str(e)}")
        print("="*70)
        sys.exit(1)


if __name__ == "__main__":
    seed_admin()
