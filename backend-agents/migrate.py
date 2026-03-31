#!/usr/bin/env python3
"""
migrate.py - Migración simple: backend-saas -> backend-saas + backend-agents

Uso:
  python migrate.py --dry-run    (solo muestra qué haría)
  python migrate.py              (ejecuta realmente)
"""

import os
import sys
import shutil
import argparse
from pathlib import Path

def log_info(msg):
    print(f"[INFO] {msg}")

def log_ok(msg):
    print(f"[OK]   {msg}")

def log_warn(msg):
    print(f"[!]    {msg}")

def log_error(msg):
    print(f"[ERR]  {msg}")

def main():
    parser = argparse.ArgumentParser(description="Migración: backend-saas -> backend-agents")
    parser.add_argument("--dry-run", action="store_true", help="Solo muestra cambios sin ejecutar")
    args = parser.parse_args()

    dry_run = args.dry_run

    print("=" * 70)
    print("MIGRATION: backend-saas -> backend-saas + backend-agents")
    print("=" * 70)
    print()

    # Verificar que estamos en el directorio correcto
    if not Path("backend-saas").exists():
        log_error("No estás en el directorio correcto")
        log_error("Debes estar en: D:\\...\\agencia-web-b2b\\")
        sys.exit(1)

    log_ok(f"Directorio actual: {os.getcwd()}")
    print()

    if dry_run:
        log_warn("MODO: DRY-RUN (sin ejecutar cambios)")
        print()

    # PASO 1: Crear directorios
    print("PASO 1: Crear estructura backend-agents/")
    print("=" * 70)

    dirs_to_create = [
        "backend-agents",
        "backend-agents/app",
        "backend-agents/app/engine",
        "backend-agents/app/tools",
        "backend-agents/app/qdrant",
        "backend-agents/app/llm",
        "backend-agents/app/db",
        "backend-agents/app/lib",
        "backend-agents/app/auth",
    ]

    for dir_path in dirs_to_create:
        if Path(dir_path).exists():
            log_warn(f"Existe: {dir_path}")
        else:
            if dry_run:
                log_warn(f"[DRY-RUN] Crear: {dir_path}")
            else:
                Path(dir_path).mkdir(parents=True, exist_ok=True)
                log_ok(f"Crear: {dir_path}")

    print()

    # PASO 2: Mover archivos
    print("PASO 2: Mover archivos AI/RAG")
    print("=" * 70)

    moves = [
        ("backend-saas/app/engine", "backend-agents/app/engine"),
        ("backend-saas/app/tools", "backend-agents/app/tools"),
        ("backend-saas/app/qdrant", "backend-agents/app/qdrant"),
        ("backend-saas/app/embedding_utils.py", "backend-agents/app/embedding_utils.py"),
        ("backend-saas/app/llm", "backend-agents/app/llm"),
    ]

    for src, dst in moves:
        src_path = Path(src)
        if src_path.exists():
            if dry_run:
                log_warn(f"[DRY-RUN] Mover: {src} -> {dst}")
            else:
                try:
                    if src_path.is_dir():
                        shutil.copytree(src_path, dst, dirs_exist_ok=True)
                    else:
                        shutil.copy2(src_path, dst)
                    shutil.rmtree(src_path) if src_path.is_dir() else os.remove(src_path)
                    log_ok(f"Mover: {src}")
                except Exception as e:
                    log_error(f"Error moviendo {src}: {e}")
        else:
            log_warn(f"No existe: {src}")

    print()

    # PASO 3: Copiar models.py
    print("PASO 3: Copiar models.py")
    print("=" * 70)

    models_src = Path("backend-saas/app/models.py")
    if models_src.exists():
        models_dst = Path("backend-agents/app/models.py")
        if dry_run:
            log_warn(f"[DRY-RUN] Copiar: models.py")
        else:
            shutil.copy2(models_src, models_dst)
            log_ok(f"Copiar: models.py")
    else:
        log_warn("No existe: backend-saas/app/models.py")

    print()

    # PASO 4: Crear requirements.txt
    print("PASO 4: Crear requirements.txt")
    print("=" * 70)

    requirements_content = """fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.2
pydantic-settings==2.1.0
langgraph==0.0.20
langchain==0.1.10
langchain-core==0.1.28
langsmith==0.1.1
qdrant-client==2.7.3
psycopg2-binary==2.9.9
httpx==0.25.2
asyncio-contextmanager==1.0.0
ollama==0.0.56
openai==1.6.1
python-json-logger==2.0.7
slowapi==0.1.9
python-dotenv==1.0.0
"""

    if dry_run:
        log_warn("[DRY-RUN] Crear: backend-agents/requirements.txt")
    else:
        with open("backend-agents/requirements.txt", "w") as f:
            f.write(requirements_content)
        log_ok("Crear: backend-agents/requirements.txt")

    print()

    # PASO 5: Crear __init__.py
    print("PASO 5: Crear __init__.py files")
    print("=" * 70)

    init_files = [
        "backend-agents/app/__init__.py",
        "backend-agents/app/engine/__init__.py",
        "backend-agents/app/tools/__init__.py",
        "backend-agents/app/qdrant/__init__.py",
        "backend-agents/app/db/__init__.py",
        "backend-agents/app/auth/__init__.py",
    ]

    for init_file in init_files:
        init_path = Path(init_file)
        if init_path.exists():
            log_warn(f"Existe: {init_file}")
        else:
            if dry_run:
                log_warn(f"[DRY-RUN] Crear: {init_file}")
            else:
                init_path.touch()
                log_ok(f"Crear: {init_file}")

    print()

    # PASO 6: Limpiar backend-saas
    print("PASO 6: Limpiar backend-saas/app/")
    print("=" * 70)

    cleanup_items = [
        "backend-saas/app/engine",
        "backend-saas/app/tools",
        "backend-saas/app/qdrant",
        "backend-saas/app/embedding_utils.py",
        "backend-saas/app/llm",
    ]

    for item in cleanup_items:
        item_path = Path(item)
        if item_path.exists():
            if dry_run:
                log_warn(f"[DRY-RUN] Deletrear: {item}")
            else:
                try:
                    if item_path.is_dir():
                        shutil.rmtree(item_path)
                    else:
                        os.remove(item_path)
                    log_ok(f"Deletreado: {item}")
                except Exception as e:
                    log_error(f"Error deletreando {item}: {e}")

    print()

    # PASO 7: Git
    print("PASO 7: Preparar git")
    print("=" * 70)

    if dry_run:
        log_warn("[DRY-RUN] git add backend-agents/")
        log_warn("[DRY-RUN] git rm (archivos movidos)")
    else:
        try:
            os.system("git add backend-agents/")
            log_ok("git add backend-agents/")
        except:
            log_warn("No se pudo ejecutar git add")

    print()

    # RESUMEN
    print("=" * 70)
    if dry_run:
        log_warn("RESUMEN: DRY-RUN completado")
        print()
        print("Para ejecutar REALMENTE:")
        print("  python migrate.py")
    else:
        log_ok("RESUMEN: MIGRACION COMPLETADA")
        print()
        print("Proximos pasos:")
        print("  1. Descargar: backend-agents-main.py.template")
        print("  2. copy backend-agents-main.py.template backend-agents/app/main.py")
        print("  3. Ver: POST-MIGRACION-CHECKLIST.md")
        print("  4. Actualizar imports en backend-agents/")

    print("=" * 70)

if __name__ == "__main__":
    main()
