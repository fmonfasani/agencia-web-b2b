#!/usr/bin/env python3
"""
test-migration.py - Testear toda la migración

Uso:
  python test-migration.py
"""
import os
import sys
import subprocess
from pathlib import Path

def log_ok(msg):
    print(f"✅ {msg}")

def log_err(msg):
    print(f"❌ {msg}")
    return False

def log_info(msg):
    print(f"ℹ️  {msg}")

def check_directory_structure():
    """Verificar que los directorios existan"""
    print("\n" + "=" * 70)
    print("TEST 1: Estructura de directorios")
    print("=" * 70)
    
    dirs = [
        "backend-saas",
        "backend-agents",
        "backend-agents/app",
        "backend-agents/app/engine",
        "backend-agents/app/tools",
        "backend-agents/app/qdrant",
        "backend-agents/app/db",
        "backend-agents/app/auth",
        "backend-agents/app/lib",
    ]
    
    all_ok = True
    for dir_path in dirs:
        if Path(dir_path).exists():
            log_ok(f"Directorio existe: {dir_path}")
        else:
            log_err(f"Directorio NO existe: {dir_path}")
            all_ok = False
    
    return all_ok


def check_files_migrated():
    """Verificar que los archivos fueron movidos"""
    print("\n" + "=" * 70)
    print("TEST 2: Archivos migrados")
    print("=" * 70)
    
    # Verificar que existen en backend-agents
    agent_files = [
        "backend-agents/app/engine/langgraph_engine.py",
        "backend-agents/app/engine/planner.py",
        "backend-agents/app/tools/rag.py",
        "backend-agents/app/tools/registry.py",
        "backend-agents/app/qdrant/client.py",
        "backend-agents/app/embedding_utils.py",
        "backend-agents/app/models.py",
        "backend-agents/app/auth/agent_auth.py",
        "backend-agents/app/db/trace_service.py",
    ]
    
    # Verificar que NO existen en backend-saas
    saas_should_not_have = [
        "backend-saas/app/engine",
        "backend-saas/app/tools",
        "backend-saas/app/qdrant",
    ]
    
    all_ok = True
    
    for file_path in agent_files:
        if Path(file_path).exists():
            log_ok(f"Archivo en backend-agents: {file_path}")
        else:
            log_err(f"Archivo NO encontrado: {file_path}")
            all_ok = False
    
    for dir_path in saas_should_not_have:
        if not Path(dir_path).exists():
            log_ok(f"Directorio NO en backend-saas: {dir_path}")
        else:
            log_err(f"Directorio ATRÁS en backend-saas: {dir_path}")
            all_ok = False
    
    return all_ok


def check_requirements():
    """Verificar requirements.txt"""
    print("\n" + "=" * 70)
    print("TEST 3: requirements.txt")
    print("=" * 70)
    
    req_path = Path("backend-agents/requirements.txt")
    if not req_path.exists():
        return log_err("requirements.txt no existe")
    
    with open(req_path) as f:
        content = f.read()
    
    required_packages = [
        "fastapi",
        "uvicorn",
        "pydantic",
        "langgraph",
        "langchain",
        "qdrant-client",
        "psycopg2",
        "httpx",
    ]
    
    all_ok = True
    for pkg in required_packages:
        if pkg in content:
            log_ok(f"Package en requirements: {pkg}")
        else:
            log_err(f"Package NO en requirements: {pkg}")
            all_ok = False
    
    # Verificar que qdrant-client sea 1.17.1 (no 2.7.3)
    if "qdrant-client==1.17.1" in content:
        log_ok("qdrant-client versión correcta (1.17.1)")
    elif "qdrant-client==2.7.3" in content:
        log_err("qdrant-client versión INCORRECTA (2.7.3 no existe)")
        all_ok = False
    
    return all_ok


def check_python_imports():
    """Testear que los imports funcionan"""
    print("\n" + "=" * 70)
    print("TEST 4: Python imports")
    print("=" * 70)
    
    os.chdir("backend-agents")
    
    imports_to_test = [
        ("app.models", ["AgentRequest", "AgentResponse", "TraceStepType"]),
        ("app.tools.rag", ["search"]),
        ("app.auth.agent_auth", ["get_user_by_api_key"]),
        ("app.db.trace_service", ["persist_trace", "ensure_traces_table"]),
        ("app.lib.logging_utils", ["setup_structured_logging"]),
    ]
    
    all_ok = True
    for module_name, symbols in imports_to_test:
        try:
            module = __import__(module_name, fromlist=symbols)
            symbols_found = all(hasattr(module, sym) for sym in symbols)
            if symbols_found:
                log_ok(f"Import OK: {module_name}")
            else:
                log_err(f"Import INCOMPLETO: {module_name} (faltan símbolos)")
                all_ok = False
        except Exception as e:
            log_err(f"Import FALLO: {module_name} - {e}")
            all_ok = False
    
    os.chdir("..")
    return all_ok


def check_main_py():
    """Verificar main.py"""
    print("\n" + "=" * 70)
    print("TEST 5: main.py")
    print("=" * 70)
    
    main_path = Path("backend-agents/app/main.py")
    if not main_path.exists():
        return log_err("main.py no existe")
    
    with open(main_path) as f:
        content = f.read()
    
    checks = [
        ("FastAPI imports", "from fastapi import FastAPI"),
        ("Engine import", "from app.engine.langgraph_engine import LangGraphEngine"),
        ("Auth import", "from app.auth.agent_auth import get_user_by_api_key"),
        ("Agent routes", "POST /agent/execute" in content or "/agent/execute" in content),
        ("Traces routes", "POST /agent/traces" in content or "/agent/traces" in content),
    ]
    
    all_ok = True
    for check_name, check_expr in checks:
        if isinstance(check_expr, bool):
            result = check_expr
        else:
            result = check_expr in content
        
        if result:
            log_ok(f"main.py tiene: {check_name}")
        else:
            log_err(f"main.py NO tiene: {check_name}")
            all_ok = False
    
    return all_ok


def check_backend_saas_still_works():
    """Verificar que backend-saas aún tiene lo que necesita"""
    print("\n" + "=" * 70)
    print("TEST 6: backend-saas integridad")
    print("=" * 70)
    
    saas_files = [
        "backend-saas/app/main.py",
        "backend-saas/app/onboarding_service.py",
        "backend-saas/app/onboarding_router.py",
        "backend-saas/app/auth_service.py",
    ]
    
    all_ok = True
    for file_path in saas_files:
        if Path(file_path).exists():
            log_ok(f"backend-saas tiene: {file_path}")
        else:
            log_err(f"backend-saas NO tiene: {file_path}")
            all_ok = False
    
    return all_ok


def check_env_files():
    """Verificar .env"""
    print("\n" + "=" * 70)
    print("TEST 7: .env files")
    print("=" * 70)
    
    env_files = [
        ("backend-saas/.env", "DATABASE_URL"),
        ("backend-agents/.env", "DATABASE_URL"),
    ]
    
    all_ok = True
    for env_path, key in env_files:
        if Path(env_path).exists():
            with open(env_path) as f:
                content = f.read()
            if key in content:
                log_ok(f"{env_path} existe y tiene {key}")
            else:
                log_err(f"{env_path} existe pero NO tiene {key}")
                all_ok = False
        else:
            log_err(f"{env_path} NO existe")
            all_ok = False
    
    return all_ok


def summary(results):
    """Mostrar resumen"""
    print("\n" + "=" * 70)
    print("RESUMEN")
    print("=" * 70)
    
    passed = sum(1 for r in results if r)
    total = len(results)
    
    print(f"Tests pasados: {passed}/{total}")
    
    if passed == total:
        print("\n✅ MIGRACION EXITOSA - Todos los tests pasaron")
        return True
    else:
        print(f"\n❌ {total - passed} test(s) fallaron")
        return False


def main():
    print("=" * 70)
    print("TESTING MIGRACION: backend-saas -> backend-agents")
    print("=" * 70)
    
    results = [
        check_directory_structure(),
        check_files_migrated(),
        check_requirements(),
        check_python_imports(),
        check_main_py(),
        check_backend_saas_still_works(),
        check_env_files(),
    ]
    
    all_ok = summary(results)
    
    print("\n" + "=" * 70)
    if all_ok:
        print("PRÓXIMOS PASOS:")
        print("  1. cd backend-agents")
        print("  2. pip install -r requirements.txt")
        print("  3. uvicorn app.main:app --port 8001 --reload")
        print("\nEN OTRA TERMINAL:")
        print("  cd backend-saas")
        print("  uvicorn app.main:app --port 8000 --reload")
    else:
        print("REVISAR ERRORES ARRIBA Y CORREGIR")
    print("=" * 70)
    
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
