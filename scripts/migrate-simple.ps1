# migrate-simple.ps1
# Migración limpia sin caracteres corruptos
# Uso: powershell -ExecutionPolicy Bypass -File migrate-simple.ps1 -DryRun

param(
    [switch]$DryRun = $false
)

$ErrorActionPreference = "Stop"

Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "  MIGRATION: backend-saas > backend-saas + backend-agents" -ForegroundColor Cyan
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar directorio
if (-not (Test-Path "backend-saas")) {
    Write-Host "ERROR: No estás en el directorio correcto" -ForegroundColor Red
    Write-Host "Debes estar en: D:\...\agencia-web-b2b\" -ForegroundColor Red
    exit 1
}

Write-Host "Directorio OK: $(Get-Location)" -ForegroundColor Green
Write-Host ""

if ($DryRun) {
    Write-Host "MODE: DRY-RUN (sin ejecutar cambios)" -ForegroundColor Yellow
    Write-Host ""
}

# PASO 1: Crear directorios
Write-Host "PASO 1: Crear estructura backend-agents/" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

$dirs = @(
    "backend-agents",
    "backend-agents/app",
    "backend-agents/app/engine",
    "backend-agents/app/tools",
    "backend-agents/app/qdrant",
    "backend-agents/app/llm",
    "backend-agents/app/db",
    "backend-agents/app/lib",
    "backend-agents/app/auth"
)

foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) {
        if ($DryRun) {
            Write-Host "  [DRY-RUN] Crear: $dir" -ForegroundColor Yellow
        } else {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Host "  Crear: $dir" -ForegroundColor Green
        }
    } else {
        Write-Host "  Existe: $dir" -ForegroundColor Gray
    }
}

Write-Host ""

# PASO 2: Mover archivos AI/RAG
Write-Host "PASO 2: Mover archivos a backend-agents/" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

$moves = @(
    @{ src = "backend-saas/app/engine"; dst = "backend-agents/app/engine"; tipo = "dir" },
    @{ src = "backend-saas/app/tools"; dst = "backend-agents/app/tools"; tipo = "dir" },
    @{ src = "backend-saas/app/qdrant"; dst = "backend-agents/app/qdrant"; tipo = "dir" },
    @{ src = "backend-saas/app/embedding_utils.py"; dst = "backend-agents/app/embedding_utils.py"; tipo = "file" },
    @{ src = "backend-saas/app/llm"; dst = "backend-agents/app/llm"; tipo = "dir" }
)

foreach ($move in $moves) {
    if (Test-Path $move.src) {
        if ($DryRun) {
            Write-Host "  [DRY-RUN] Mover: $($move.src) > $($move.dst)" -ForegroundColor Yellow
        } else {
            if ($move.tipo -eq "dir") {
                Copy-Item -Path "$($move.src)/*" -Destination $move.dst -Recurse -Force
            } else {
                Copy-Item -Path $move.src -Destination $move.dst -Force
            }
            Remove-Item -Path $move.src -Recurse -Force
            Write-Host "  Movido: $($move.src)" -ForegroundColor Green
        }
    } else {
        Write-Host "  No existe: $($move.src)" -ForegroundColor Gray
    }
}

Write-Host ""

# PASO 3: Copiar models.py
Write-Host "PASO 3: Copiar models.py" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan

if (Test-Path "backend-saas/app/models.py") {
    if ($DryRun) {
        Write-Host "  [DRY-RUN] Copiar: models.py" -ForegroundColor Yellow
    } else {
        Copy-Item -Path "backend-saas/app/models.py" -Destination "backend-agents/app/models.py" -Force
        Write-Host "  Copiado: models.py" -ForegroundColor Green
    }
}

Write-Host ""

# PASO 4: Crear requirements.txt
Write-Host "PASO 4: Crear requirements.txt" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

$requirements = @"
fastapi==0.104.1
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
"@

if ($DryRun) {
    Write-Host "  [DRY-RUN] Crear: backend-agents/requirements.txt" -ForegroundColor Yellow
} else {
    $requirements | Set-Content -Path "backend-agents/requirements.txt"
    Write-Host "  Creado: backend-agents/requirements.txt" -ForegroundColor Green
}

Write-Host ""

# PASO 5: Crear __init__.py
Write-Host "PASO 5: Crear __init__.py files" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

$initFiles = @(
    "backend-agents/app/__init__.py",
    "backend-agents/app/engine/__init__.py",
    "backend-agents/app/tools/__init__.py",
    "backend-agents/app/qdrant/__init__.py",
    "backend-agents/app/db/__init__.py",
    "backend-agents/app/auth/__init__.py"
)

foreach ($file in $initFiles) {
    if (-not (Test-Path $file)) {
        if ($DryRun) {
            Write-Host "  [DRY-RUN] Crear: $file" -ForegroundColor Yellow
        } else {
            "" | Set-Content -Path $file
            Write-Host "  Creado: $file" -ForegroundColor Green
        }
    }
}

Write-Host ""

# PASO 6: Limpiar backend-saas
Write-Host "PASO 6: Limpiar backend-saas/app/" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

$cleanup = @(
    "backend-saas/app/engine",
    "backend-saas/app/tools",
    "backend-saas/app/qdrant",
    "backend-saas/app/embedding_utils.py",
    "backend-saas/app/llm"
)

foreach ($item in $cleanup) {
    if (Test-Path $item) {
        if ($DryRun) {
            Write-Host "  [DRY-RUN] Deletrear: $item" -ForegroundColor Yellow
        } else {
            Remove-Item -Path $item -Recurse -Force
            Write-Host "  Deletreado: $item" -ForegroundColor Green
        }
    }
}

Write-Host ""

# PASO 7: Git
Write-Host "PASO 7: Preparar git" -ForegroundColor Cyan
Write-Host "====================" -ForegroundColor Cyan

if (-not $DryRun) {
    Write-Host "  Ejecutando: git add backend-agents/" -ForegroundColor Gray
    git add backend-agents/ 2>$null
    
    Write-Host "  Ejecutando: git rm (archivos movidos)" -ForegroundColor Gray
    git rm -r --cached "backend-saas/app/engine" -q -f 2>$null
    git rm -r --cached "backend-saas/app/tools" -q -f 2>$null
    git rm -r --cached "backend-saas/app/qdrant" -q -f 2>$null
    
    Write-Host "  Git preparado" -ForegroundColor Green
} else {
    Write-Host "  [DRY-RUN] git add backend-agents/" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Cyan

if ($DryRun) {
    Write-Host "RESUMEN: DRY-RUN completado" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Para ejecutar REALMENTE:" -ForegroundColor Cyan
    Write-Host "  powershell -ExecutionPolicy Bypass -File migrate-simple.ps1" -ForegroundColor Yellow
} else {
    Write-Host "RESUMEN: MIGRACIÓN COMPLETADA" -ForegroundColor Green
    Write-Host ""
    Write-Host "Próximos pasos:" -ForegroundColor Cyan
    Write-Host "  1. copy backend-agents-main.py.template backend-agents/app/main.py" -ForegroundColor Yellow
    Write-Host "  2. Ver POST-MIGRACION-CHECKLIST.md" -ForegroundColor Yellow
    Write-Host "  3. Actualizar imports en backend-agents/" -ForegroundColor Yellow
}

Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host ""
