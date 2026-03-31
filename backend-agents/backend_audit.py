"""
backend_audit.py
================
Analiza TODA la estructura de los backends:
- Directorios y archivos
- Dependencias (requirements.txt, poetry, etc)
- Variables de entorno (.env)
- Configuraciones (config files)
- Puertos y URLs
- Conexiones a bases de datos
- Endpoints

Ejecutar: python backend_audit.py

Genera: BACKEND_AUDIT_REPORT.txt
"""

import os
import json
from pathlib import Path
from typing import Optional, Dict, List

# ============================================================================
# CONFIG
# ============================================================================

BACKEND_PATHS = [
    "D:\\Software Development\\Agencia B2B\\Agencia B2B\\agencia-web-b2b\\backend-saas",
    "D:\\Software Development\\Agencia B2B\\Agencia B2B\\agencia-web-b2b\\backend-agents",
]

IMPORTANT_FILES = {
    "requirements.txt": "Python dependencies",
    "pyproject.toml": "Poetry config",
    "poetry.lock": "Poetry lockfile",
    ".env": "Environment variables",
    ".env.example": "Example env",
    "main.py": "FastAPI entry point",
    "config.py": "Configuration",
    "settings.py": "Settings",
    "Dockerfile": "Docker config",
    "docker-compose.yml": "Docker Compose",
}

# ============================================================================
# HELPERS
# ============================================================================

def safe_read(path: str) -> Optional[str]:
    """Lee archivo de forma segura."""
    try:
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                return f.read()
    except:
        pass
    return None

def get_directory_tree(path: str, prefix: str = "", max_depth: int = 3, current_depth: int = 0) -> str:
    """Genera árbol de directorios."""
    if current_depth >= max_depth:
        return ""
    
    try:
        items = sorted(os.listdir(path))
        # Filtrar directorios irrelevantes
        skip = {'.git', '__pycache__', '.pytest_cache', 'node_modules', '.venv', 'venv', '.egg-info'}
        items = [i for i in items if i not in skip and not i.startswith('.')]
        
        output = ""
        for i, item in enumerate(items):
            item_path = os.path.join(path, item)
            is_last = i == len(items) - 1
            current_prefix = "└── " if is_last else "├── "
            output += f"{prefix}{current_prefix}{item}\n"
            
            if os.path.isdir(item_path) and current_depth < max_depth - 1:
                next_prefix = prefix + ("    " if is_last else "│   ")
                output += get_directory_tree(item_path, next_prefix, max_depth, current_depth + 1)
        
        return output
    except:
        return ""

def extract_python_imports(content: str) -> List[str]:
    """Extrae imports de código Python."""
    imports = []
    for line in content.split('\n'):
        line = line.strip()
        if line.startswith('import ') or line.startswith('from '):
            imports.append(line)
    return imports[:10]  # Primeros 10

def parse_requirements(content: str) -> List[str]:
    """Parse requirements.txt."""
    lines = []
    for line in content.split('\n'):
        line = line.strip()
        if line and not line.startswith('#'):
            lines.append(line)
    return lines

def analyze_backend(backend_path: str) -> Dict:
    """Analiza un backend completo."""
    result = {
        "name": os.path.basename(backend_path),
        "path": backend_path,
        "exists": os.path.exists(backend_path),
        "structure": "",
        "requirements": [],
        "env_vars": {},
        "main_entry": None,
        "config": {},
        "imports": [],
        "endpoints": [],
    }
    
    if not result["exists"]:
        return result
    
    # 1. Estructura
    result["structure"] = get_directory_tree(backend_path)
    
    # 2. Requirements
    req_path = os.path.join(backend_path, "requirements.txt")
    req_content = safe_read(req_path)
    if req_content:
        result["requirements"] = parse_requirements(req_content)
    
    # 3. Environment variables
    env_path = os.path.join(backend_path, ".env")
    env_content = safe_read(env_path)
    if env_content:
        for line in env_content.split('\n'):
            line = line.strip()
            if line and '=' in line and not line.startswith('#'):
                key, value = line.split('=', 1)
                result["env_vars"][key.strip()] = value.strip()
    
    # 4. Main entry point
    main_path = os.path.join(backend_path, "app", "main.py")
    main_content = safe_read(main_path)
    if main_content:
        result["main_entry"] = "Found: app/main.py"
        result["imports"] = extract_python_imports(main_content)
        
        # Buscar puerto
        for line in main_content.split('\n'):
            if 'port' in line.lower():
                result["config"]["port"] = line.strip()
    
    # 5. Config files
    for config_name in ["config.py", "settings.py"]:
        config_path = os.path.join(backend_path, "app", config_name)
        config_content = safe_read(config_path)
        if config_content:
            result["config"][config_name] = config_content[:500]  # Primeros 500 chars
    
    # 6. Endpoints (busca en routers)
    routers_path = os.path.join(backend_path, "app")
    if os.path.exists(routers_path):
        for file in os.listdir(routers_path):
            if file.endswith("_router.py") or file == "main.py":
                file_path = os.path.join(routers_path, file)
                content = safe_read(file_path)
                if content:
                    for line in content.split('\n'):
                        if '@router' in line or '@app.' in line:
                            result["endpoints"].append(line.strip())
    
    return result

# ============================================================================
# MAIN
# ============================================================================

def main():
    print("=" * 80)
    print("BACKEND AUDIT - Analizando estructura completa".center(80))
    print("=" * 80)
    
    report = []
    report.append("=" * 80)
    report.append("BACKEND STRUCTURE & CONFIGURATION AUDIT")
    report.append("=" * 80)
    report.append("")
    
    for backend_path in BACKEND_PATHS:
        print(f"\n▶ Analizando: {backend_path}")
        
        if not os.path.exists(backend_path):
            print(f"  ✗ No existe")
            continue
        
        analysis = analyze_backend(backend_path)
        
        # Generar reporte
        report.append(f"\n{'='*80}")
        report.append(f"BACKEND: {analysis['name'].upper()}")
        report.append(f"{'='*80}\n")
        
        report.append(f"📁 PATH: {analysis['path']}")
        report.append(f"✓ EXISTS: {analysis['exists']}\n")
        
        # Estructura
        report.append("📂 DIRECTORY STRUCTURE:")
        report.append("-" * 40)
        report.append(analysis["structure"] or "[No structure found]")
        report.append("")
        
        # Requirements
        report.append("📦 DEPENDENCIES (requirements.txt):")
        report.append("-" * 40)
        if analysis["requirements"]:
            for req in analysis["requirements"]:
                report.append(f"  • {req}")
            report.append(f"\n  Total: {len(analysis['requirements'])} dependencies\n")
        else:
            report.append("  [No requirements.txt found]\n")
        
        # Environment variables
        report.append("🔐 ENVIRONMENT VARIABLES (.env):")
        report.append("-" * 40)
        if analysis["env_vars"]:
            for key, value in analysis["env_vars"].items():
                # Ocultar valores sensibles
                if any(x in key.lower() for x in ['password', 'secret', 'key', 'token']):
                    value = "***REDACTED***"
                report.append(f"  {key} = {value}")
            report.append(f"\n  Total: {len(analysis['env_vars'])} variables\n")
        else:
            report.append("  [No .env file found]\n")
        
        # Main entry
        report.append("🚀 MAIN ENTRY POINT:")
        report.append("-" * 40)
        report.append(f"  {analysis['main_entry'] or '[Not found]'}\n")
        
        # Imports
        if analysis["imports"]:
            report.append("📚 KEY IMPORTS (from main.py):")
            report.append("-" * 40)
            for imp in analysis["imports"]:
                report.append(f"  {imp}")
            report.append("")
        
        # Config
        if analysis["config"]:
            report.append("⚙️ CONFIGURATION:")
            report.append("-" * 40)
            for key, value in analysis["config"].items():
                if key == "port":
                    report.append(f"  {value}")
                else:
                    report.append(f"  {key}:")
                    report.append(f"    {str(value)[:200]}...")
            report.append("")
        
        # Endpoints
        if analysis["endpoints"]:
            report.append("📡 ENDPOINTS DETECTED:")
            report.append("-" * 40)
            for ep in analysis["endpoints"][:10]:  # Primeros 10
                report.append(f"  {ep}")
            if len(analysis["endpoints"]) > 10:
                report.append(f"  ... y {len(analysis['endpoints']) - 10} más")
            report.append("")
        
        print(f"  ✓ Análisis completado")
    
    # Guardar reporte
    report_text = "\n".join(report)
    report_file = "BACKEND_AUDIT_REPORT.txt"
    
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(report_text)
    
    print(f"\n✓ Reporte guardado en: {report_file}")
    print(report_text)

if __name__ == "__main__":
    main()
