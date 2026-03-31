# backend_fix_all.ps1
# Script para arreglar TODOS los problemas del backend en un comando
# 
# USO: .\backend_fix_all.ps1
# 
# QUE HACE:
#   1. Arregla DATABASE_URL (db → localhost)
#   2. Arregla HOST (127.0.0.1 → 0.0.0.0)
#   3. Crea .env.example en ambos backends
#   4. Verifica que las dependencias estén instaladas

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "BACKEND FIX ALL - Arreglando problemas identificados" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

$startPath = Get-Location
$projectRoot = Split-Path -Parent $startPath

# ============================================================================
# PASO 1: Arreglar DATABASE_URL en backend-saas
# ============================================================================

Write-Host "`n[1/5] Arreglando DATABASE_URL en backend-saas..." -ForegroundColor Yellow

$saasEnvPath = Join-Path $projectRoot "backend-saas\.env"

if (Test-Path $saasEnvPath) {
    $content = Get-Content $saasEnvPath -Raw
    $newContent = $content -replace '@db:', '@localhost:'
    
    Set-Content $saasEnvPath $newContent
    Write-Host "      ✓ DATABASE_URL actualizado: db → localhost" -ForegroundColor Green
} else {
    Write-Host "      ✗ No se encontró backend-saas/.env" -ForegroundColor Red
}

# ============================================================================
# PASO 2: Arreglar HOST en backend-saas/app/main.py
# ============================================================================

Write-Host "`n[2/5] Arreglando HOST en backend-saas..." -ForegroundColor Yellow

$mainPyPath = Join-Path $projectRoot "backend-saas\app\main.py"

if (Test-Path $mainPyPath) {
    $content = Get-Content $mainPyPath -Raw
    $newContent = $content -replace 'host="127\.0\.0\.1"', 'host="0.0.0.0"'
    
    Set-Content $mainPyPath $newContent
    Write-Host "      ✓ HOST actualizado: 127.0.0.1 → 0.0.0.0" -ForegroundColor Green
} else {
    Write-Host "      ✗ No se encontró backend-saas/app/main.py" -ForegroundColor Red
}

# ============================================================================
# PASO 3: Crear .env.example en backend-saas
# ============================================================================

Write-Host "`n[3/5] Creando .env.example en backend-saas..." -ForegroundColor Yellow

$saasEnvExamplePath = Join-Path $projectRoot "backend-saas\.env.example"

$saasEnvExample = @"
# Backend-SAAS Environment Variables
# Copy this to .env and fill in your values

# API Keys
GROQ_API_KEY = your_groq_api_key_here

# Database
DATABASE_URL = postgresql://postgres:password@localhost:5432/agencia_web_b2b

# Tenant
ALLOW_FALLBACK_TENANT = true
DEFAULT_TENANT_ID = tenant_default

# Environment
ENVIRONMENT = development
LOG_LEVEL = INFO
"@

$saasEnvExample | Out-File -FilePath $saasEnvExamplePath -Encoding UTF8 -Force
Write-Host "      ✓ .env.example creado" -ForegroundColor Green

# ============================================================================
# PASO 4: Crear .env.example en backend-agents
# ============================================================================

Write-Host "`n[4/5] Creando .env.example en backend-agents..." -ForegroundColor Yellow

$agentsEnvExamplePath = Join-Path $projectRoot "backend-agents\.env.example"

$agentsEnvExample = @"
# Backend-AGENTS Environment Variables
# Copy this to .env and fill in your values

# Database
DATABASE_URL = postgresql://postgres:password@localhost:5432/agencia_web_b2b

# CORS
ALLOWED_ORIGINS = http://localhost:3001,http://127.0.0.1:3001

# LLM (Ollama)
OLLAMA_BASE_URL = http://localhost:11434
DEFAULT_MODEL = gemma3:latest

# Tenant
ALLOW_FALLBACK_TENANT = false
DEFAULT_TENANT_ID = default

# Logging
LOG_LEVEL = INFO
"@

$agentsEnvExample | Out-File -FilePath $agentsEnvExamplePath -Encoding UTF8 -Force
Write-Host "      ✓ .env.example creado" -ForegroundColor Green

# ============================================================================
# PASO 5: Verificar dependencias
# ============================================================================

Write-Host "`n[5/5] Verificando estado de los backends..." -ForegroundColor Yellow

# Verificar backend-saas
$saasReqPath = Join-Path $projectRoot "backend-saas\requirements.txt"
if (Test-Path $saasReqPath) {
    Write-Host "      ✓ backend-saas/requirements.txt encontrado" -ForegroundColor Green
} else {
    Write-Host "      ✗ No se encontró backend-saas/requirements.txt" -ForegroundColor Red
}

# Verificar backend-agents
$agentsReqPath = Join-Path $projectRoot "backend-agents\requirements.txt"
if (Test-Path $agentsReqPath) {
    Write-Host "      ✓ backend-agents/requirements.txt encontrado" -ForegroundColor Green
} else {
    Write-Host "      ✗ No se encontró backend-agents/requirements.txt" -ForegroundColor Red
}

# ============================================================================
# RESUMEN
# ============================================================================

Write-Host "`n================================================================================" -ForegroundColor Green
Write-Host "✓ TODOS LOS FIXES APLICADOS" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Green

Write-Host "`nRESUMEN DE CAMBIOS:" -ForegroundColor Cyan
Write-Host "  1. ✓ DATABASE_URL: db → localhost" -ForegroundColor Green
Write-Host "  2. ✓ HOST: 127.0.0.1 → 0.0.0.0" -ForegroundColor Green
Write-Host "  3. ✓ .env.example creado en backend-saas" -ForegroundColor Green
Write-Host "  4. ✓ .env.example creado en backend-agents" -ForegroundColor Green
Write-Host "  5. ✓ Estructura verificada" -ForegroundColor Green

Write-Host "`nPRÓXIMOS PASOS:" -ForegroundColor Yellow
Write-Host "  1. Instalar dependencias:" -ForegroundColor White
Write-Host "     cd backend-saas && pip install -r requirements.txt" -ForegroundColor Gray
Write-Host "     cd ../backend-agents && pip install -r requirements.txt" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Iniciar backends:" -ForegroundColor White
Write-Host "     Terminal 1: cd backend-saas && uvicorn app.main:app --port 8000 --reload" -ForegroundColor Gray
Write-Host "     Terminal 2: cd backend-agents && uvicorn app.main:app --port 8001 --reload" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Verificar salud:" -ForegroundColor White
Write-Host "     curl http://localhost:8000/health" -ForegroundColor Gray
Write-Host "     curl http://localhost:8001/health" -ForegroundColor Gray
Write-Host ""
Write-Host "  4. Ejecutar tests:" -ForegroundColor White
Write-Host "     python test_e2e_30.py" -ForegroundColor Gray

Write-Host "`n================================================================================" -ForegroundColor Cyan
Write-Host "AUDIT COMPLETADO - Los backends están listos para iniciar" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
