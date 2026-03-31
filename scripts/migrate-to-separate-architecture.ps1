# migrate-to-separate-architecture.ps1
# Migra backend-saas a dos servicios: backend-saas (SaaS) y backend-agents (AI/RAG)
# 
# Ejecutar desde: D:\...\agencia-web-b2b\
# Uso: powershell -ExecutionPolicy Bypass -File migrate-to-separate-architecture.ps1

param(
    [switch]$DryRun = $false,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Stop"

# Colors
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }
function Write-Info { Write-Host $args -ForegroundColor Cyan }

Clear-Host
Write-Info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Info "  MIGRATION: backend-saas → backend-saas + backend-agents"
Write-Info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Info ""

# Verify current directory
if (-not (Test-Path "backend-saas")) {
    Write-Error "ERROR: No estás en el directorio correcto."
    Write-Error "Debe estar: D:\...\agencia-web-b2b\"
    exit 1
}

Write-Success "✓ Directorio correcto detectado"
Write-Info ""

if ($DryRun) {
    Write-Warning "⚠️  MODO DRY-RUN (solo muestra cambios, no ejecuta)"
    Write-Info ""
}

# PASO 1: Crear estructura backend-agents
Write-Info "PASO 1: Creando estructura backend-agents/"
Write-Info "──────────────────────────────────────────"

$newDirs = @(
    "backend-agents",
    "backend-agents/app",
    "backend-agents/app/engine",
    "backend-agents/app/tools",
    "backend-agents/app/qdrant",
    "backend-agents/app/llm",
    "backend-agents/app/db",
    "backend-agents/app/lib",
    "backend-agents/app/auth",
    "backend-agents/tests"
)

foreach ($dir in $newDirs) {
    if (-not (Test-Path $dir)) {
        if (-not $DryRun) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Success "   ✓ Creado: $dir"
        } else {
            Write-Warning "   [DRY-RUN] Sería creado: $dir"
        }
    } else {
        Write-Info "   ⚠️  Ya existe: $dir"
    }
}

Write-Info ""

# PASO 2: Copiar archivos AI/RAG
Write-Info "PASO 2: Moviendo archivos AI/RAG a backend-agents/"
Write-Info "────────────────────────────────────────────────"

$moveOperations = @(
    @{src="backend-saas/app/engine"; dst="backend-agents/app/engine"; desc="engine/"},
    @{src="backend-saas/app/tools"; dst="backend-agents/app/tools"; desc="tools/"},
    @{src="backend-saas/app/qdrant"; dst="backend-agents/app/qdrant"; desc="qdrant/"},
    @{src="backend-saas/app/embedding_utils.py"; dst="backend-agents/app/embedding_utils.py"; desc="embedding_utils.py"},
    @{src="backend-saas/app/llm"; dst="backend-agents/app/llm"; desc="llm/"}
)

foreach ($op in $moveOperations) {
    if (Test-Path $op.src) {
        Write-Info "   Moviendo: $($op.desc)"
        if (-not $DryRun) {
            if ((Get-Item $op.src).PSIsContainer) {
                Copy-Item -Path "$($op.src)/*" -Destination $op.dst -Recurse -Force
                Remove-Item -Path $op.src -Recurse -Force
            } else {
                Copy-Item -Path $op.src -Destination $op.dst -Force
                Remove-Item -Path $op.src -Force
            }
            Write-Success "      ✓ Completado"
        } else {
            Write-Warning "      [DRY-RUN] Sería movido"
        }
    } else {
        Write-Warning "      ⚠️  No encontrado: $($op.src)"
    }
}

Write-Info ""

# PASO 3: Copiar models.py relevantes
Write-Info "PASO 3: Copiando modelos de agent a backend-agents/"
Write-Info "────────────────────────────────────────────────"

if (Test-Path "backend-saas/app/models.py") {
    Write-Info "   Copiando models.py (con AgentRequest, AgentResponse, etc)"
    if (-not $DryRun) {
        Copy-Item -Path "backend-saas/app/models.py" -Destination "backend-agents/app/models.py" -Force
        Write-Success "   ✓ Copiado"
    } else {
        Write-Warning "   [DRY-RUN] Sería copiado"
    }
}

Write-Info ""

# PASO 4: Copiar auth para backend-agents
Write-Info "PASO 4: Creando auth específica para backend-agents/"
Write-Info "────────────────────────────────────────────────"

$authCode = @"
# backend-agents/app/auth/agent_auth.py
# Agent-specific authentication (API keys from SaaS backend)

from fastapi import HTTPException
import psycopg2
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:Karaoke27570Echeverria@localhost:5432/agencia_web_b2b")

def get_user_by_api_key(api_key: str) -> dict:
    """Get user/tenant info from API key (same as backend-saas)."""
    if not api_key or not api_key.startswith("wh_"):
        return None
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute(
            "SELECT user_id, tenant_id, rol, email FROM api_keys WHERE key = %s AND is_active = true",
            (api_key,)
        )
        row = cur.fetchone()
        conn.close()
        if row:
            return {
                "user_id": row[0],
                "tenant_id": row[1],
                "rol": row[2],
                "email": row[3],
            }
    except Exception as e:
        print(f"Error validating API key: {e}")
    return None
"@

if (-not $DryRun) {
    $authCode | Set-Content -Path "backend-agents/app/auth/agent_auth.py"
    Write-Success "   ✓ Creado: backend-agents/app/auth/agent_auth.py"
} else {
    Write-Warning "   [DRY-RUN] Sería creado: backend-agents/app/auth/agent_auth.py"
}

Write-Info ""

# PASO 5: Crear __init__.py files
Write-Info "PASO 5: Creando __init__.py files"
Write-Info "─────────────────────────────"

$initFiles = @(
    "backend-agents/app/__init__.py",
    "backend-agents/app/engine/__init__.py",
    "backend-agents/app/tools/__init__.py",
    "backend-agents/app/qdrant/__init__.py",
    "backend-agents/app/llm/__init__.py",
    "backend-agents/app/db/__init__.py",
    "backend-agents/app/lib/__init__.py",
    "backend-agents/app/auth/__init__.py"
)

foreach ($file in $initFiles) {
    if (-not $DryRun) {
        if (-not (Test-Path $file)) {
            "" | Set-Content -Path $file
            Write-Success "   ✓ $file"
        }
    } else {
        Write-Warning "   [DRY-RUN] Sería creado: $file"
    }
}

Write-Info ""

# PASO 6: Crear backend-agents/requirements.txt
Write-Info "PASO 6: Creando backend-agents/requirements.txt"
Write-Info "──────────────────────────────────────────"

$agentRequirements = @"
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.2
pydantic-settings==2.1.0

# LangGraph
langgraph==0.0.20
langchain==0.1.10
langchain-core==0.1.28
langsmith==0.1.1

# Vector DB
qdrant-client==2.7.3

# Database
psycopg2-binary==2.9.9

# HTTP
httpx==0.25.2

# Async
asyncio-contextmanager==1.0.0

# LLM & Embeddings
ollama==0.0.56
openai==1.6.1

# Logging & Observability
python-json-logger==2.0.7

# Rate Limiting
slowapi==0.1.9

# Utilities
python-dotenv==1.0.0
"@

if (-not $DryRun) {
    $agentRequirements | Set-Content -Path "backend-agents/requirements.txt"
    Write-Success "   ✓ Creado: backend-agents/requirements.txt"
} else {
    Write-Warning "   [DRY-RUN] Sería creado"
}

Write-Info ""

# PASO 7: Limpiar backend-saas
Write-Info "PASO 7: Limpiando backend-saas/app/"
Write-Info "───────────────────────────────"

$filesToDelete = @(
    "backend-saas/app/engine",
    "backend-saas/app/tools",
    "backend-saas/app/qdrant",
    "backend-saas/app/embedding_utils.py",
    "backend-saas/app/llm"
)

foreach ($file in $filesToDelete) {
    if (Test-Path $file) {
        if (-not $DryRun) {
            Remove-Item -Path $file -Recurse -Force
            Write-Success "   ✓ Deletreado: $file"
        } else {
            Write-Warning "   [DRY-RUN] Sería deletreado: $file"
        }
    }
}

Write-Info ""

# PASO 8: Git operations
Write-Info "PASO 8: Preparando git"
Write-Info "─────────────────────"

if (-not $DryRun) {
    Write-Info "   Agregando backend-agents a git..."
    git add backend-agents/
    Write-Info "   Removiendo archivos movidos de git..."
    git rm -r --cached backend-saas/app/engine --quiet -f
    git rm -r --cached backend-saas/app/tools --quiet -f
    git rm -r --cached backend-saas/app/qdrant --quiet -f
    Write-Success "   ✓ Git preparado"
} else {
    Write-Warning "   [DRY-RUN] Sería ejecutado: git add backend-agents/"
}

Write-Info ""

# SUMMARY
Write-Info "RESUMEN DE CAMBIOS"
Write-Info "──────────────────"

if (-not $DryRun) {
    Write-Success "✓ MIGRACIÓN COMPLETADA"
    Write-Info ""
    Write-Info "Estructura nueva:"
    Write-Info "   backend-saas/    ← SaaS (auth, onboarding, users)"
    Write-Info "   backend-agents/  ← AI Agent Engine (LangGraph, RAG, tools)"
    Write-Info ""
    Write-Info "Próximos pasos:"
    Write-Info "   1. Revisar files: git status"
    Write-Info "   2. Actualizar imports en backend-agents/ (ver PROPUESTA_SEPARACION_ARQUITECTONICA.md)"
    Write-Info "   3. Crear backend-agents/app/main.py"
    Write-Info "   4. Crear backend-agents/docker-compose.yml"
    Write-Info "   5. Test: cd backend-agents && pip install -r requirements.txt"
    Write-Info "   6. Commit: git commit -m 'refactor: separate SaaS from Agent architecture'"
} else {
    Write-Warning "⚠️  [DRY-RUN] Simulación completada."
    Write-Info ""
    Write-Info "Para ejecutar realmente:"
    Write-Info "   powershell -ExecutionPolicy Bypass -File migrate-to-separate-architecture.ps1"
}

Write-Info ""
Write-Info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
