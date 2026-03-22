# ============================================================================
# INSTALACIÓN DEL SISTEMA DE TRAZABILIDAD
# Rutas configuradas para tu sistema
# ============================================================================

Write-Host "🔍 INSTALANDO SISTEMA DE TRAZABILIDAD" -ForegroundColor Cyan
Write-Host "=" * 80

# ============================================================================
# CONFIGURACIÓN DE RUTAS
# ============================================================================

$sourceDir = "C:\Users\Usuario\Downloads\Webshooks\tracing-system"
$projectDir = "D:\Software Development\Agencia B2B\Agencia B2B\agencia-web-b2b"

Write-Host "`n📂 Configuración:"
Write-Host "   Archivos origen: $sourceDir"
Write-Host "   Proyecto destino: $projectDir"

# ============================================================================
# 1. VERIFICAR QUE EXISTAN LOS ARCHIVOS DESCARGADOS
# ============================================================================

Write-Host "`n📥 Verificando archivos descargados..."

$requiredFiles = @(
    "agent_request_model.py",
    "tracing_context.py",
    "integration_example.py",
    "tracing_examples.py",
    "test_agent_tracing_complete.py",
    "tracing_dashboard.html",
    "README_TRACING_SYSTEM.md"
)

$missingFiles = @()

foreach ($file in $requiredFiles) {
    $filePath = Join-Path $sourceDir $file
    if (-not (Test-Path $filePath)) {
        $missingFiles += $file
        Write-Host "   ❌ $file (falta)" -ForegroundColor Red
    } else {
        Write-Host "   ✅ $file" -ForegroundColor Green
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "`n❌ ERROR: Faltan $($missingFiles.Count) archivo(s)" -ForegroundColor Red
    Write-Host "   Descargá los archivos faltantes y ponelos en:" -ForegroundColor Yellow
    Write-Host "   $sourceDir" -ForegroundColor Yellow
    exit 1
}

# ============================================================================
# 2. NAVEGAR AL PROYECTO
# ============================================================================

Write-Host "`n📁 Navegando al proyecto..."

if (-not (Test-Path $projectDir)) {
    Write-Host "❌ ERROR: No se encuentra el directorio del proyecto" -ForegroundColor Red
    Write-Host "   $projectDir" -ForegroundColor Yellow
    exit 1
}

Set-Location $projectDir
Write-Host "   ✅ Ubicación: $(Get-Location)" -ForegroundColor Green

# ============================================================================
# 3. CREAR DIRECTORIOS
# ============================================================================

Write-Host "`n📁 Creando estructura de directorios..."

$directories = @(
    "backend\app\models",
    "backend\tests",
    "frontend\tools",
    "docs\tracing"
)

foreach ($dir in $directories) {
    $fullPath = Join-Path $projectDir $dir
    if (-not (Test-Path $fullPath)) {
        New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
        Write-Host "   ✅ Creado: $dir" -ForegroundColor Green
    } else {
        Write-Host "   ✓ Existe: $dir" -ForegroundColor Gray
    }
}

# ============================================================================
# 4. COPIAR ARCHIVOS
# ============================================================================

Write-Host "`n📋 Copiando archivos..."

# Modelos Pydantic → backend/app/models/
Copy-Item (Join-Path $sourceDir "agent_request_model.py") "backend\app\models\" -Force
Write-Host "   ✅ agent_request_model.py → backend\app\models\" -ForegroundColor Green

Copy-Item (Join-Path $sourceDir "tracing_context.py") "backend\app\models\" -Force
Write-Host "   ✅ tracing_context.py → backend\app\models\" -ForegroundColor Green

# Tests → backend/tests/
Copy-Item (Join-Path $sourceDir "test_agent_tracing_complete.py") "backend\tests\" -Force
Write-Host "   ✅ test_agent_tracing_complete.py → backend\tests\" -ForegroundColor Green

# Dashboard → frontend/tools/
Copy-Item (Join-Path $sourceDir "tracing_dashboard.html") "frontend\tools\" -Force
Write-Host "   ✅ tracing_dashboard.html → frontend\tools\" -ForegroundColor Green

# Documentación → docs/tracing/
Copy-Item (Join-Path $sourceDir "README_TRACING_SYSTEM.md") "docs\tracing\" -Force
Write-Host "   ✅ README_TRACING_SYSTEM.md → docs\tracing\" -ForegroundColor Green

Copy-Item (Join-Path $sourceDir "integration_example.py") "docs\tracing\" -Force
Write-Host "   ✅ integration_example.py → docs\tracing\" -ForegroundColor Green

Copy-Item (Join-Path $sourceDir "tracing_examples.py") "docs\tracing\" -Force
Write-Host "   ✅ tracing_examples.py → docs\tracing\" -ForegroundColor Green

# ============================================================================
# 5. CREAR __init__.py EN MODELS
# ============================================================================

Write-Host "`n🔧 Configurando __init__.py..."

$initPath = "backend\app\models\__init__.py"

$initContent = @"
"""
Models package - Trazabilidad del sistema de agentes
"""

from .agent_request_model import (
    AgentRequest,
    AgentResponse,
    ErrorResponse,
    TraceStep,
    TraceStepType,
    EmbeddingTrace,
    QdrantSearchTrace,
    RAGContextTrace,
    LLMCallTrace
)

from .tracing_context import (
    TracingContext,
    create_tracing_context
)

__all__ = [
    # Request/Response models
    "AgentRequest",
    "AgentResponse",
    "ErrorResponse",
    
    # Trace models
    "TraceStep",
    "TraceStepType",
    "EmbeddingTrace",
    "QdrantSearchTrace",
    "RAGContextTrace",
    "LLMCallTrace",
    
    # Context
    "TracingContext",
    "create_tracing_context"
]
"@

if (-not (Test-Path $initPath)) {
    $initContent | Out-File -FilePath $initPath -Encoding UTF8
    Write-Host "   ✅ Creado: backend\app\models\__init__.py" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Ya existe: backend\app\models\__init__.py" -ForegroundColor Yellow
    Write-Host "   📝 Revisá que incluya los imports necesarios" -ForegroundColor Yellow
}

# ============================================================================
# 6. VERIFICAR INSTALACIÓN
# ============================================================================

Write-Host "`n🔍 Verificando instalación..."

$filesToCheck = @{
    "backend\app\models\agent_request_model.py" = "Pydantic models"
    "backend\app\models\tracing_context.py" = "TracingContext"
    "backend\app\models\__init__.py" = "Module init"
    "backend\tests\test_agent_tracing_complete.py" = "Tests"
    "frontend\tools\tracing_dashboard.html" = "Dashboard"
    "docs\tracing\README_TRACING_SYSTEM.md" = "Documentación"
}

$allOk = $true

foreach ($file in $filesToCheck.Keys) {
    $fullPath = Join-Path $projectDir $file
    if (Test-Path $fullPath) {
        Write-Host "   ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $file (falta)" -ForegroundColor Red
        $allOk = $false
    }
}

# ============================================================================
# 7. TEST DE IMPORTS
# ============================================================================

Write-Host "`n🧪 Probando imports..."

Set-Location "backend"

$testScript = @"
import sys
sys.path.insert(0, '.')

try:
    from app.models.tracing_context import TracingContext, create_tracing_context
    from app.models.agent_request_model import AgentRequest, AgentResponse
    print('✅ Imports exitosos')
except Exception as e:
    print(f'❌ Error de import: {e}')
    sys.exit(1)
"@

$testScript | python -

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Python imports funcionan correctamente" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Revisar imports en __init__.py" -ForegroundColor Yellow
}

Set-Location $projectDir

# ============================================================================
# 8. RESUMEN
# ============================================================================

Write-Host "`n" + ("=" * 80)
Write-Host "✅ INSTALACIÓN COMPLETA" -ForegroundColor Green
Write-Host ("=" * 80)

Write-Host "`n📂 Estructura creada:"
Write-Host ""
Write-Host "agencia-web-b2b/"
Write-Host "├── backend/"
Write-Host "│   ├── app/"
Write-Host "│   │   └── models/"
Write-Host "│   │       ├── __init__.py                 ✅ Exports"
Write-Host "│   │       ├── agent_request_model.py      ✅ Pydantic models"
Write-Host "│   │       └── tracing_context.py          ✅ TracingContext"
Write-Host "│   └── tests/"
Write-Host "│       └── test_agent_tracing_complete.py  ✅ 11 tests"
Write-Host "├── frontend/"
Write-Host "│   └── tools/"
Write-Host "│       └── tracing_dashboard.html          ✅ Dashboard visual"
Write-Host "└── docs/"
Write-Host "    └── tracing/"
Write-Host "        ├── README_TRACING_SYSTEM.md        ✅ Documentación"
Write-Host "        ├── integration_example.py          ✅ Guía de integración"
Write-Host "        └── tracing_examples.py             ✅ Ejemplos"

# ============================================================================
# 9. PRÓXIMOS PASOS
# ============================================================================

Write-Host "`n🚀 PRÓXIMOS PASOS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1️⃣  Leer la documentación:"
Write-Host "   code docs\tracing\README_TRACING_SYSTEM.md"
Write-Host ""
Write-Host "2️⃣  Ver guía de integración:"
Write-Host "   code docs\tracing\integration_example.py"
Write-Host ""
Write-Host "3️⃣  Probar imports:"
Write-Host "   cd backend"
Write-Host "   python -c `"from app.models.tracing_context import TracingContext; print('OK')`""
Write-Host ""
Write-Host "4️⃣  Abrir dashboard:"
Write-Host "   start frontend\tools\tracing_dashboard.html"
Write-Host ""
Write-Host "5️⃣  Correr tests (con backend running):"
Write-Host "   # Terminal 1:"
Write-Host "   cd backend"
Write-Host "   uvicorn app.main:app --reload --port 8000"
Write-Host ""
Write-Host "   # Terminal 2:"
Write-Host "   cd backend"
Write-Host "   pytest tests\test_agent_tracing_complete.py -v"
Write-Host ""

Write-Host ("=" * 80)
Write-Host "✨ ¡Sistema listo para usar!" -ForegroundColor Green
Write-Host ("=" * 80)
