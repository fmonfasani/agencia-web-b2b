"""
frontend_audit_sla_ready.py

Auditoría frontend orientada a:
- detectar acoplamiento real (DB, server logic)
- validar arquitectura SPA (API-first)
- medir readiness para SLA
- generar scoring confiable

Ejecutar:
    python frontend_audit_sla_ready.py

Salida:
    FRONTEND_AUDIT_REPORT.txt
"""

import os
import json
import sys
from pathlib import Path

# =========================
# CONFIG
# =========================

FRONTEND_ROOT = r"D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b\frontend"
SRC_PATH = os.path.join(FRONTEND_ROOT, "src")

sys.stdout.reconfigure(encoding="utf-8")

# =========================
# PATTERNS
# =========================

DANGEROUS_IMPORTS = [
    "@prisma/client",
    "prisma",
]

SERVER_PATTERNS = [
    "use server",
    "process.env.",
    "new PrismaClient",
]

API_USAGE_PATTERNS = [
    "fetch(",
    "axios",
]

# =========================
# HELPERS
# =========================

def read_file(path):
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    except:
        return ""

def find_files(root):
    files = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in ["node_modules", ".next", ".git"]]

        for f in filenames:
            if f.endswith((".ts", ".tsx", ".js", ".jsx")):
                files.append(os.path.join(dirpath, f))
    return files

# =========================
# ANALYSIS
# =========================

def analyze_codebase():
    files = find_files(SRC_PATH)

    stats = {
        "files": len(files),
        "dangerous_imports": 0,
        "server_logic": 0,
        "api_calls": 0,
    }

    issues = []

    for file in files:
        content = read_file(file)

        # dangerous imports
        for imp in DANGEROUS_IMPORTS:
            if f"from '{imp}'" in content or f'from "{imp}"' in content:
                stats["dangerous_imports"] += 1
                issues.append(f"[DB ACCESS] {file} usa {imp}")

        # server patterns
        for pattern in SERVER_PATTERNS:
            if pattern in content:
                stats["server_logic"] += 1
                issues.append(f"[SERVER LOGIC] {file} contiene '{pattern}'")

        # api usage
        for pattern in API_USAGE_PATTERNS:
            if pattern in content:
                stats["api_calls"] += 1
                break

    return stats, issues

# =========================
# PACKAGE
# =========================

def analyze_package():
    pkg_path = Path(FRONTEND_ROOT) / "package.json"

    if not pkg_path.exists():
        return {"error": "package.json not found", "flags": {}}

    content = read_file(pkg_path)

    try:
        data = json.loads(content)
    except:
        return {"error": "invalid json", "flags": {}}

    deps = data.get("dependencies", {})

    return {
        "name": data.get("name"),
        "deps": len(deps),
        "flags": {
            "next": "next" in deps,
            "react": "react" in deps,
            "axios": "axios" in deps,
            "prisma": "@prisma/client" in deps,
        }
    }

# =========================
# ENV
# =========================

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
        "api_urls": api_urls
    }

# =========================
# API LAYER
# =========================

def analyze_api_layer():
    api_path = os.path.join(SRC_PATH, "lib", "api")

    return {
        "exists": os.path.exists(api_path),
        "files": os.listdir(api_path) if os.path.exists(api_path) else []
    }

# =========================
# ARCHITECTURE SCORE
# =========================

def compute_score(stats, pkg, api, env):
    score = 10

    if stats["dangerous_imports"] > 0:
        score -= 3

    if stats["server_logic"] > 0:
        score -= 3

    if not api["exists"]:
        score -= 2

    if not env["exists"]:
        score -= 1

    if pkg.get("flags", {}).get("prisma"):
        score -= 2

    return max(score, 0)

# =========================
# SLA READINESS
# =========================

def sla_assessment(stats):
    readiness = []

    if stats["dangerous_imports"] == 0:
        readiness.append("✔ No DB access in frontend")
    else:
        readiness.append("❌ DB access detected (invalid for SLA)")

    if stats["server_logic"] == 0:
        readiness.append("✔ No server logic in frontend")
    else:
        readiness.append("❌ Server logic present (breaks SPA model)")

    if stats["api_calls"] > 0:
        readiness.append("✔ API usage detected")
    else:
        readiness.append("❌ No API usage detected")

    return readiness

# =========================
# MAIN
# =========================

def main():
    print("🚀 Running SLA-ready frontend audit...")

    stats, issues = analyze_codebase()
    pkg = analyze_package()
    env = analyze_env()
    api = analyze_api_layer()

    score = compute_score(stats, pkg, api, env)
    sla = sla_assessment(stats)

    report = []
    report.append("=" * 80)
    report.append("FRONTEND SLA-READY AUDIT")
    report.append("=" * 80)

    report.append("\nCODEBASE:")
    report.append(str(stats))

    report.append("\nPACKAGE:")
    report.append(str(pkg))

    report.append("\nENV:")
    report.append(str(env))

    report.append("\nAPI LAYER:")
    report.append(str(api))

    report.append("\nISSUES:")
    for i in issues[:50]:
        report.append(f"- {i}")

    report.append("\nSLA READINESS:")
    for s in sla:
        report.append(s)

    report.append(f"\nFINAL SCORE: {score}/10")

    report.append("\nNEXT STEPS:")
    report.append("- Remove Prisma from frontend")
    report.append("- Remove server actions and API routes")
    report.append("- Move logic to backend services")
    report.append("- Use frontend only as API consumer")

    with open("FRONTEND_AUDIT_REPORT.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(report))

    print("\n".join(report))


if __name__ == "__main__":
    main()