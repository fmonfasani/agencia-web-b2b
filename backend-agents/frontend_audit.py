"""
frontend_audit_pro.py

Audit profundo orientado a:
- desacoplar frontend → SPA
- detectar anti-patterns reales
- preparar migración a API-first
"""

import os
import json
import sys
import re
from pathlib import Path

# ------------------------
# CONFIG
# ------------------------

FRONTEND_ROOT = r"D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b\frontend"
SRC_PATH = os.path.join(FRONTEND_ROOT, "src")

# ------------------------
# ENCODING FIX
# ------------------------

sys.stdout.reconfigure(encoding='utf-8')

# ------------------------
# DETECCIÓN
# ------------------------

DANGEROUS_IMPORTS = [
    "@prisma/client",
    "prisma",
    "fs",
    "path"
]

SERVER_PATTERNS = [
    "new PrismaClient",
    "use server",
    "process.env.",
]

# ------------------------
# HELPERS
# ------------------------

def read_file(path):
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    except Exception as e:
        print("ERROR reading:", path, e)
        return ""

def find_files(root):
    files = []
    for dirpath, dirnames, filenames in os.walk(root):
        # skip dirs
        dirnames[:] = [d for d in dirnames if d not in ["node_modules", ".next", ".git"]]

        for f in filenames:
            if f.endswith((".ts", ".tsx", ".js", ".jsx")):
                files.append(os.path.join(dirpath, f))
    return files

# ------------------------
# ANALYSIS
# ------------------------

def analyze_codebase():
    files = find_files(SRC_PATH)

    issues = []
    stats = {
        "files": len(files),
        "dangerous_imports": 0,
        "server_patterns": 0,
    }

    for file in files:
        content = read_file(file)

        # imports peligrosos (mejorado)
        for imp in DANGEROUS_IMPORTS:
            if f"from '{imp}'" in content or f'from "{imp}"' in content:
                issues.append(f"[IMPORT] {file} usa '{imp}'")
                stats["dangerous_imports"] += 1

        # patrones server
        for pattern in SERVER_PATTERNS:
            if pattern in content:
                issues.append(f"[SERVER LOGIC] {file} contiene '{pattern}'")
                stats["server_patterns"] += 1

    return stats, issues

# ------------------------
# PACKAGE ANALYSIS
# ------------------------

def analyze_package():
    pkg_path = Path(FRONTEND_ROOT) / "package.json"

    print("DEBUG package path:", pkg_path)

    if not pkg_path.exists():
        return {"flags": {}, "error": "package.json not found"}

    content = read_file(pkg_path)

    if not content.strip():
        return {"flags": {}, "error": "empty package.json"}

    try:
        data = json.loads(content)
    except Exception as e:
        return {"flags": {}, "error": str(e)}

    deps = data.get("dependencies", {})

    return {
        "name": data.get("name", "unknown"),
        "deps_count": len(deps),
        "flags": {
            "uses_prisma": "@prisma/client" in deps,
            "uses_next": "next" in deps,
            "uses_react": "react" in deps,
            "uses_axios": "axios" in deps,
        }
    }

# ------------------------
# ENV ANALYSIS
# ------------------------

def analyze_env():
    env_path = Path(FRONTEND_ROOT) / ".env.local"

    if not env_path.exists():
        return {"exists": False}

    content = read_file(env_path)
    lines = content.split("\n")

    api_urls = []
    for line in lines:
        if "API" in line or "URL" in line:
            api_urls.append(line.strip())

    return {
        "exists": True,
        "api_urls": api_urls,
        "total": len(lines)
    }

# ------------------------
# API LAYER
# ------------------------

def detect_api_layer():
    api_path = os.path.join(SRC_PATH, "lib", "api")

    return {
        "exists": os.path.exists(api_path),
        "files": os.listdir(api_path) if os.path.exists(api_path) else []
    }

# ------------------------
# SCORE
# ------------------------

def compute_score(stats, pkg, api, env):
    score = 10

    flags = pkg.get("flags", {})

    if not api.get("exists"):
        score -= 3

    if not env.get("exists"):
        score -= 2

    if flags.get("uses_prisma", False):
        score -= 3

    if stats.get("dangerous_imports", 0) > 0:
        score -= 2

    if stats.get("server_patterns", 0) > 0:
        score -= 2

    if not pkg.get("name"):
        score -= 2

    return max(score, 0)

# ------------------------
# MAIN
# ------------------------

def main():
    print("🚀 Analizando frontend (modo PRO)...")

    stats, issues = analyze_codebase()
    pkg = analyze_package()
    env = analyze_env()
    api = detect_api_layer()

    score = compute_score(stats, pkg, api, env)

    report = []
    report.append("=" * 80)
    report.append("FRONTEND ARCHITECTURE AUDIT (SPA MIGRATION READY)")
    report.append("=" * 80)

    # stats
    report.append("\nCODEBASE:")
    report.append(f"  Files: {stats['files']}")
    report.append(f"  Dangerous imports: {stats['dangerous_imports']}")
    report.append(f"  Server patterns: {stats['server_patterns']}")

    # package
    report.append("\nPACKAGE:")
    report.append(f"  Name: {pkg.get('name')}")
    report.append(f"  Dependencies: {pkg.get('deps_count')}")

    if pkg.get("error"):
        report.append(f"  ERROR: {pkg['error']}")

    # env
    report.append("\nENV:")
    report.append(f"  Exists: {env['exists']}")
    for url in env.get("api_urls", []):
        report.append(f"  → {url}")

    # api layer
    report.append("\nAPI LAYER:")
    report.append(f"  Exists: {api['exists']}")
    if api["exists"]:
        for f in api["files"]:
            report.append(f"  • {f}")

    # issues
    report.append("\nISSUES:")
    if issues:
        for i in issues[:50]:
            report.append(f"  - {i}")
    else:
        report.append("  (No issues detected — revisar manualmente)")

    # score
    report.append("\nARCHITECTURE SCORE (SPA READY):")
    report.append(f"  Score: {score}/10")

    # recomendaciones
    report.append("\nREFACTOR PLAN:")
    report.append("  1. Eliminar Prisma del frontend")
    report.append("  2. Mover lógica de /lib → backend")
    report.append("  3. Centralizar llamadas en /lib/api")
    report.append("  4. Usar hooks (useApi, useAuth)")
    report.append("  5. Convertir Next.js → SPA (sin server actions)")

    with open("FRONTEND_AUDIT_REPORT.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(report))

    print("\n".join(report))


if __name__ == "__main__":
    main()