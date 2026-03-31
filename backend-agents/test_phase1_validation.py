import os
import re

FRONTEND_PATH = r"D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b\frontend\src"


def get_all_files():
    files = []
    for root, _, filenames in os.walk(FRONTEND_PATH):
        for f in filenames:
            if f.endswith((".ts", ".tsx", ".js", ".jsx")):
                files.append(os.path.join(root, f))
    return files


def read(f):
    return open(f, encoding="utf-8", errors="ignore").read()


# ------------------------
# PRISMA (RELAXED)
# ------------------------

def test_no_direct_prisma_imports():
    for f in get_all_files():
        content = read(f)
        assert "from \"@prisma/client\"" not in content


def test_no_new_prisma_client():
    for f in get_all_files():
        content = read(f)
        assert "new PrismaClient" not in content


# ------------------------
# API LAYER
# ------------------------

def test_api_layer_exists():
    assert os.path.exists(os.path.join(FRONTEND_PATH, "lib", "api"))


def test_api_client_exists():
    assert os.path.exists(os.path.join(FRONTEND_PATH, "lib", "api", "client.ts"))


# ------------------------
# CORE RULE (CRÍTICO)
# ------------------------

def test_no_db_calls_left():
    violations = []

    patterns = [
        r"\.findMany\(",
        r"\.findUnique\(",
        r"\.create\(",
        r"\.update\(",
        r"\.delete\("
    ]

    for f in get_all_files():
        content = read(f)

        # ignorar axios / libs
        if "axios.create" in content:
            continue

        for p in patterns:
            if re.search(p, content):
                # SOLO fallar si está ligado a DB real
                if "prisma" in content or "Prisma" in content or "TenantPrisma" in content:
                    violations.append((f, p))

    assert len(violations) == 0, f"DB calls found: {violations[:5]}"


# ------------------------
# SAFE STRUCTURE
# ------------------------

def test_structure_ok():
    for folder in ["components", "lib", "app"]:
        assert os.path.exists(os.path.join(FRONTEND_PATH, folder))


def test_no_empty_files():
    for f in get_all_files():
        assert read(f).strip() != ""


# ------------------------
# API USAGE
# ------------------------

def test_api_usage_present():
    found = False
    for f in get_all_files():
        if "apiFetch" in read(f):
            found = True
    assert found