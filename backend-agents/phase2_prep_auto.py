import os
import re
import shutil
from datetime import datetime

FRONTEND_ROOT = r"D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b\frontend"
SRC_PATH = os.path.join(FRONTEND_ROOT, "src")

BACKUP_DIR = os.path.join(
    FRONTEND_ROOT,
    f"_backup_phase2_v3_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
)

def find_files():
    files = []
    for root, dirs, filenames in os.walk(SRC_PATH):
        dirs[:] = [d for d in dirs if d not in ["node_modules", ".next", ".git"]]
        for f in filenames:
            if f.endswith((".ts", ".tsx", ".js", ".jsx")):
                files.append(os.path.join(root, f))
    return files


def backup(path):
    rel = os.path.relpath(path, FRONTEND_ROOT)
    dst = os.path.join(BACKUP_DIR, rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copy2(path, dst)


def read(path):
    return open(path, encoding="utf-8", errors="ignore").read()


def write(path, content):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


# ------------------------
# REMOVE IMPORTS (MULTILINE SAFE)
# ------------------------

def remove_prisma_imports(content):
    content = re.sub(
        r'import\s+[\s\S]*?from\s+[\'"]@prisma/client[\'"];?',
        '',
        content
    )

    content = re.sub(
        r'import\s+[\s\S]*?from\s+[\'"]@/lib/prisma[\'"];?',
        '',
        content
    )

    return content


# ------------------------
# REMOVE SERVER
# ------------------------

def remove_server(content):
    content = re.sub(r'["\']use server["\'];?', '', content)
    return content


# ------------------------
# REPLACE DB CALLS (GENERIC)
# ------------------------

def replace_db_calls(content):
    patterns = [
        r'\b\w+\.\w+\.(findMany|findUnique|create|update|delete)\s*\([\s\S]*?\)',
    ]

    for p in patterns:
        content = re.sub(p, '[]', content)

    return content


# ------------------------
# REMOVE PRISMA VARIABLES
# ------------------------

def remove_prisma_refs(content):
    content = re.sub(r'\bprisma\b', '/* prisma removed */', content)
    content = re.sub(r'\bPrisma\b', '/* Prisma removed */', content)
    return content


# ------------------------
# REMOVE THROW (SERVER LOGIC)
# ------------------------

def neutralize_throw(content):
    content = re.sub(r'throw new Error\([^\)]*\)', 'console.warn("error removed")', content)
    return content


# ------------------------
# MAIN PROCESS
# ------------------------

def process_file(path):
    original = read(path)

    if not any(x in original for x in ["prisma", "Prisma", "@prisma"]):
        return False

    updated = original

    updated = remove_prisma_imports(updated)
    updated = remove_server(updated)
    updated = replace_db_calls(updated)
    updated = remove_prisma_refs(updated)
    updated = neutralize_throw(updated)

    if updated != original:
        backup(path)
        write(path, updated)
        return True

    return False


def main():
    print("🚀 PHASE 2 PREP v3 (FULL CLEAN)")

    files = find_files()
    modified = []

    for f in files:
        if process_file(f):
            modified.append(f)

    print("\n📊 RESULT")
    print("Files:", len(files))
    print("Modified:", len(modified))

    print("\n✏️ SAMPLE:")
    for f in modified[:15]:
        print(" -", f)

    print("\n💾 Backup:", BACKUP_DIR)
    print("\n✅ DONE")


if __name__ == "__main__":
    main()