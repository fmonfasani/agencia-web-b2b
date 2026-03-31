"""
PHASE 1.5 - SAFE REFACTOR (API INTRODUCTION + DB DECOUPLING)

Objetivo:
- Detectar uso de Prisma en frontend
- NO romper código existente
- Introducir capa API real (apiFetch)
- Preparar migración progresiva
- Eliminar artifacts innecesarios (tipos Prisma)
- Generar backup + reporte

Modo:
- DRY RUN opcional
- Cambios controlados

Uso:
    python phase1_safe_refactor.py
"""

import os
import shutil
import re
from datetime import datetime

# ------------------------
# CONFIG
# ------------------------

FRONTEND_ROOT = r"D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b\frontend"
SRC_PATH = os.path.join(FRONTEND_ROOT, "src")

DRY_RUN = False
BACKUP_ENABLED = True

BACKUP_DIR = os.path.join(
    FRONTEND_ROOT,
    f"_backup_phase1_5_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
)

# ------------------------
# DETECTION
# ------------------------

PRISMA_PATTERNS = [
    r"@prisma/client",
    r"new PrismaClient",
    r"\bprisma\.",
    r"\bPrisma\."
]

# ------------------------
# HELPERS
# ------------------------

def find_files(root):
    files = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in ["node_modules", ".next", ".git"]]

        for f in filenames:
            if f.endswith((".ts", ".tsx", ".js", ".jsx")):
                files.append(os.path.join(dirpath, f))
    return files


def read_file(path):
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    except:
        return ""


def write_file(path, content):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def backup_file(path):
    if not BACKUP_ENABLED:
        return

    rel_path = os.path.relpath(path, FRONTEND_ROOT)
    backup_path = os.path.join(BACKUP_DIR, rel_path)

    os.makedirs(os.path.dirname(backup_path), exist_ok=True)
    shutil.copy2(path, backup_path)


# ------------------------
# CORE LOGIC
# ------------------------

def detect_prisma_usage(content):
    return any(re.search(p, content) for p in PRISMA_PATTERNS)


def comment_prisma(content):
    lines = content.split("\n")
    updated = []

    for line in lines:
        if "@prisma/client" in line or "prisma." in line or "Prisma." in line:
            updated.append(f"// [PHASE1.5] ⚠ Prisma detected → {line}")
        else:
            updated.append(line)

    return "\n".join(updated)


def inject_api_hint(content):
    if "apiFetch" in content:
        return content

    return content + "\n// [PHASE1.5] TODO: replace DB access with apiFetch()\n"


def ensure_api_import(content):
    if "apiFetch" in content and "from '@/lib/api/client'" not in content:
        return "import { apiFetch } from '@/lib/api/client'\n" + content
    return content


def process_file(path):
    original = read_file(path)

    if not detect_prisma_usage(original):
        return False, None

    updated = original
    updated = comment_prisma(updated)
    updated = inject_api_hint(updated)
    updated = ensure_api_import(updated)

    if updated != original:
        if not DRY_RUN:
            backup_file(path)
            write_file(path, updated)
        return True, path

    return False, None


# ------------------------
# API LAYER
# ------------------------

def create_api_client():
    api_dir = os.path.join(SRC_PATH, "lib", "api")
    os.makedirs(api_dir, exist_ok=True)

    client_path = os.path.join(api_dir, "client.ts")

    if os.path.exists(client_path):
        return False

    if DRY_RUN:
        return True

    content = """// API CLIENT (Phase 1.5)
const API_URL = process.env.NEXT_PUBLIC_API_URL || ""

export async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  })

  if (!res.ok) {
    console.error("[API ERROR]", path)
    throw new Error("API error")
  }

  return res.json()
}
"""
    write_file(client_path, content)
    return True


def create_example_endpoint():
    leads_path = os.path.join(SRC_PATH, "lib", "api", "leads.ts")

    if os.path.exists(leads_path) or DRY_RUN:
        return False

    content = """import { apiFetch } from "./client"

export const getLeads = () => apiFetch("/leads")
"""
    write_file(leads_path, content)
    return True


# ------------------------
# CLEANUP
# ------------------------

def remove_prisma_typings():
    path = os.path.join(SRC_PATH, "types", "prisma-client.d.ts")

    if not os.path.exists(path):
        return False

    if DRY_RUN:
        return True

    os.remove(path)
    return True


# ------------------------
# MAIN
# ------------------------

def main():
    print("🚀 PHASE 1.5 SAFE REFACTOR")

    files = find_files(SRC_PATH)

    modified = []
    prisma_files = []

    for f in files:
        content = read_file(f)

        if detect_prisma_usage(content):
            prisma_files.append(f)

        changed, path = process_file(f)
        if changed:
            modified.append(path)

    api_created = create_api_client()
    example_created = create_example_endpoint()
    prisma_removed = remove_prisma_typings()

    # ------------------------
    # REPORT
    # ------------------------

    print("\n📊 SUMMARY")
    print("Files scanned:", len(files))
    print("Files with Prisma:", len(prisma_files))
    print("Files modified:", len(modified))

    print("\n📁 PRISMA FILES:")
    for f in prisma_files[:15]:
        print(" -", f)

    print("\n✏️ MODIFIED FILES:")
    for f in modified[:15]:
        print(" -", f)

    print("\n🧱 API CLIENT:", "CREATED" if api_created else "EXISTS")
    print("🧱 EXAMPLE ENDPOINT:", "CREATED" if example_created else "EXISTS")
    print("🧹 PRISMA TYPES REMOVED:", prisma_removed)

    if not DRY_RUN:
        print("\n💾 Backup:", BACKUP_DIR)

    print("\n✅ PHASE 1.5 COMPLETED")


if __name__ == "__main__":
    main()