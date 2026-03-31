$ProjectPath = "c:/Users/fmonf/Desktop/Software Enginnering LAPTOP/Agencia B2B/agencia-web-b2b"
$OutputFile = "$ProjectPath/.agents/skills/radiografia/output.json"

$result = @{}

# 1. Estructura del proyecto (Depth 1 for speed)
Write-Host "Analizando estructura (Depth 1)..."
try {
    $result.estructura = Get-ChildItem -Path $ProjectPath -ErrorAction SilentlyContinue `
        -Exclude "node_modules", ".git", ".next" `
    | Select-Object Name, @{Name = "Type"; Expression = { if ($_.PSIsContainer) { "Directory" }else { "File" } } } `
    | ConvertTo-Json -Compress
}
catch {
    $result.estructura = "[]"
}

# 2. Package.json / dependencias
Write-Host "Analizando dependencias..."
$pkgPath = Join-Path $ProjectPath "package.json"
if (Test-Path $pkgPath) {
    try {
        $result.dependencias = Get-Content $pkgPath | ConvertFrom-Json `
        | Select-Object name, version, dependencies, devDependencies
    }
    catch {}
}

# 3. Git: últimos 20 commits
Write-Host "Analizando git log..."
$result.git_log = git -C $ProjectPath log --oneline --format="%h|%an|%ad|%s" `
    --date=short -20 | ConvertTo-Json -Compress

# 4. Git: archivos más modificados (hotspots)
Write-Host "Analizando hotspots..."
$result.git_hotspots = git -C $ProjectPath log --pretty=format: --name-only `
| Where-Object { $_ } | Group-Object | Sort-Object Count -Descending `
| Select-Object -First 10 | Select-Object Name, Count | ConvertTo-Json -Compress

# 5. Variables de entorno presentes
Write-Host "Analizando variables de entorno..."
$envPath = Join-Path $ProjectPath ".env"
if (Test-Path $envPath) {
    $result.env_keys = Get-Content $envPath `
    | Where-Object { $_ -match "^[^#\s]" } `
    | ForEach-Object { ($_ -split "=")[0].Trim() } `
    | ConvertTo-Json -Compress
}

# 6. Estado VPS via SSH
Write-Host "Analizando VPS (SSH)..."
$vps = "root@134.209.41.51"
try {
    $result.vps = @{
        docker_containers = (ssh -o ConnectTimeout=5 -o BatchMode=yes $vps "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'" 2>$null)
        docker_stats      = (ssh -o ConnectTimeout=5 -o BatchMode=yes $vps "docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}'" 2>$null)
        compose_status    = (ssh -o ConnectTimeout=5 -o BatchMode=yes $vps "cd /root && docker compose ps 2>/dev/null || docker compose ls" 2>$null)
        disk              = (ssh -o ConnectTimeout=5 -o BatchMode=yes $vps "df -h /" 2>$null)
        memory            = (ssh -o ConnectTimeout=5 -o BatchMode=yes $vps "free -h" 2>$null)
        load              = (ssh -o ConnectTimeout=5 -o BatchMode=yes $vps "uptime" 2>$null)
        nginx             = (ssh -o ConnectTimeout=5 -o BatchMode=yes $vps "systemctl is-active nginx 2>/dev/null || echo 'no nginx'" 2>$null)
        logs_recientes    = (ssh -o ConnectTimeout=5 -o BatchMode=yes $vps "docker compose logs --tail=20 2>/dev/null" 2>$null)
    }
}
catch {
    $result.vps = "Error en conexión SSH (requiere password o agent)"
}

# Ensure output directory exists
$outputDir = Split-Path $OutputFile -Parent
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Force -Path $outputDir
}

$result | ConvertTo-Json -Depth 10 | Out-File $OutputFile -Encoding UTF8
Write-Host "Radiografía recolectada en $OutputFile".