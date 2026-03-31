import os
import re
import json
from collections import defaultdict

FRONTEND_PATH = r"D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b\frontend\src"

DB_PATTERNS = [
    r"\.findMany\(",
    r"\.findUnique\(",
    r"\.create\(",
    r"\.update\(",
    r"\.delete\(",
]

PRISMA_PATTERNS = [
    r"@prisma/client",
    r"\bprisma\.",
    r"\bPrisma\.",
    r"getTenantPrisma",
    r"tPrisma",
]

API_ROUTE_HINTS = {
    "findMany": "GET /resource",
    "findUnique": "GET /resource/:id",
    "create": "POST /resource",
    "update": "PATCH /resource/:id",
    "delete": "DELETE /resource/:id",
}


def get_files():
    files = []
    for root, _, filenames in os.walk(FRONTEND_PATH):
        for f in filenames:
            if f.endswith((".ts", ".tsx", ".js", ".jsx")):
                files.append(os.path.join(root, f))
    return files


def read(f):
    return open(f, encoding="utf-8", errors="ignore").read()


def detect_db_calls(content):
    matches = []
    for p in DB_PATTERNS:
        if re.search(p, content):
            matches.append(p)
    return matches


def detect_prisma(content):
    return any(re.search(p, content) for p in PRISMA_PATTERNS)


def extract_entity(file_path):
    # heurística simple
    parts = file_path.lower().split("\\")
    for p in parts:
        if p in ["deals", "leads", "appointments", "tenant"]:
            return p
    return "unknown"


def suggest_endpoint(pattern, entity):
    if "findMany" in pattern:
        return f"GET /{entity}"
    if "findUnique" in pattern:
        return f"GET /{entity}/:id"
    if "create" in pattern:
        return f"POST /{entity}"
    if "update" in pattern:
        return f"PATCH /{entity}/:id"
    if "delete" in pattern:
        return f"DELETE /{entity}/:id"
    return "unknown"


def analyze():
    report = []
    summary = defaultdict(int)

    for f in get_files():
        content = read(f)

        if not detect_prisma(content):
            continue

        db_calls = detect_db_calls(content)
        entity = extract_entity(f)

        if db_calls:
            entry = {
                "file": f,
                "entity": entity,
                "db_calls": [],
            }

            for call in db_calls:
                endpoint = suggest_endpoint(call, entity)
                entry["db_calls"].append({
                    "pattern": call,
                    "suggested_endpoint": endpoint
                })
                summary[entity] += 1

            report.append(entry)

    return report, summary


def print_report(report, summary):
    print("=" * 80)
    print("FRONTEND → BACKEND DECOUPLING AUDIT")
    print("=" * 80)

    print("\n📊 SUMMARY (by domain):")
    for k, v in summary.items():
        print(f"  {k}: {v} DB calls")

    print("\n📁 DETAILS:\n")

    for r in report[:30]:
        print(f"FILE: {r['file']}")
        print(f"ENTITY: {r['entity']}")
        for call in r["db_calls"]:
            print(f"  - {call['pattern']} → {call['suggested_endpoint']}")
        print("-" * 40)

    print("\n⚠️ ACTION PLAN:")
    print("1. Elegir dominio con más ocurrencias")
    print("2. Crear endpoints backend sugeridos")
    print("3. Reemplazar prisma → apiFetch")
    print("4. Eliminar /app/api para ese dominio")
    print("5. Repetir")


def save_json(report):
    with open("DECOUPLING_REPORT.json", "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)


def main():
    report, summary = analyze()
    print_report(report, summary)
    save_json(report)
    print("\n✅ Reporte guardado en DECOUPLING_REPORT.json")


if __name__ == "__main__":
    main()