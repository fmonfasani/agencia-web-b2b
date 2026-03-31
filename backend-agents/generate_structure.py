#!/usr/bin/env python3
"""
Genera STRUCTURED.md con:
1. Árbol de directorios (tree)
2. Análisis de dependencias (imports)
3. Reporte de líneas de código por archivo

Ejecutar diariamente con: 0 6 * * * python generate_structure.py
"""

import os
import ast
from pathlib import Path
from collections import defaultdict
from datetime import datetime

# Configuración
# Usar directorio actual (donde está parado) en lugar de parent.parent
PROJECT_ROOT = Path.cwd()  # Escanea SOLO este directorio
IGNORE_DIRS = {
    # Python
    '__pycache__', '.venv', 'venv', '.pytest_cache', '.egg-info', 'build', 'dist', '.eggs', '*.egg',
    # Node/JS
    'node_modules', '.next', '.turbo', '.yarn', '.pnpm-store',
    # Misc
    '.git', '.github', '.husky', '.codex', '.agents', 
    # Archivos generados/backups
    '_pycache_', '_migration_backup_*', '.archived_scripts', '.playwright-mcp',
    'playwright-report', 'test-results', 'benchmarks', '.pytest_cache',
    # Proyectos secundarios (no core)
    'ai-finobs-claude', 'ai-lead-gen-claude', 'ai-marketing-claude', 
    'mcp-servers', 'Strategy', 'revisar',
}
IGNORE_EXTENSIONS = {'.pyc', '.pyo', '.pyd', '.so', '.egg-info', '.whl', '.lock', '.log', '.cache'}
IGNORE_FILES = {
    'lighthouserc.json', 'mcp_config_template.json', 'tsconfig.tsbuildifo',
    '.mcp.json', '.gitignore', '.env', '.env.local', '.env.example'
}
OUTPUT_FILE = PROJECT_ROOT / "STRUCTURED.md"

# Extensiones relevantes
CODE_EXTENSIONS = {'.py', '.js', '.jsx', '.tsx', '.ts', '.sql', '.yml', '.yaml', '.json', '.md'}

def should_ignore(path):
    """Determinar si ignorar un archivo/directorio."""
    # Verificar si ALGÚN componente del path está en IGNORE_DIRS
    for part in path.parts:
        if part in IGNORE_DIRS:
            return True
    
    # Ignorar por nombre de archivo específico
    if path.name in IGNORE_FILES:
        return True
    
    # Ignorar por extensión
    if path.suffix in IGNORE_EXTENSIONS:
        return True
    
    # Ignorar archivos que empiezan con punto (excepto en directorios válidos)
    if path.name.startswith('.') and path.is_file():
        return True
    
    return False

def count_lines(file_path):
    """Contar líneas en un archivo."""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            return len(f.readlines())
    except:
        return 0

def get_imports(file_path):
    """Extraer imports de un archivo Python."""
    if file_path.suffix != '.py':
        return []
    
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            tree = ast.parse(f.read())
        
        imports = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(alias.name.split('.')[0])
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    imports.append(node.module.split('.')[0])
        
        return list(set(imports))
    except:
        return []

def build_tree(path, prefix="", file_stats=None):
    """Construir árbol de directorios (tipo tree) usando os.walk."""
    import os
    
    if file_stats is None:
        file_stats = {}
    
    lines = []
    
    try:
        entries = sorted([p for p in path.iterdir() if not should_ignore(p)])
    except (PermissionError, FileNotFoundError):
        return lines
    
    dirs = [e for e in entries if e.is_dir()]
    files = [e for e in entries if e.is_file()]
    
    # Directorios primero
    for i, dir_path in enumerate(dirs):
        is_last_dir = (i == len(dirs) - 1) and len(files) == 0
        connector = "└── " if is_last_dir else "├── "
        lines.append(f"{prefix}{connector}{dir_path.name}/")
        
        extension = "    " if is_last_dir else "│   "
        try:
            lines.extend(build_tree(dir_path, prefix + extension, file_stats))
        except (PermissionError, FileNotFoundError):
            # Si no podemos entrar a un directorio, ignorar
            continue
    
    # Archivos después
    for i, file_path in enumerate(files):
        is_last = i == len(files) - 1
        connector = "└── " if is_last else "├── "
        
        try:
            loc = count_lines(file_path)
        except:
            loc = 0
        
        # Guardar stats
        file_stats[str(file_path.relative_to(PROJECT_ROOT))] = loc
        
        lines.append(f"{prefix}{connector}{file_path.name} ({loc} líneas)")
    
    return lines

def analyze_dependencies():
    """Analizar dependencias entre archivos Python."""
    import os
    
    imports_by_file = {}
    
    try:
        for root, dirs, files in os.walk(PROJECT_ROOT, topdown=True, onerror=lambda e: None):
            # Filtrar directorios ANTES de que os.walk intente entrar
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and not d.startswith('.')]
            
            for file in files:
                if not file.endswith('.py'):
                    continue
                
                py_file = Path(root) / file
                
                if should_ignore(py_file):
                    continue
                
                try:
                    imports = get_imports(py_file)
                    if imports:
                        rel_path = str(py_file.relative_to(PROJECT_ROOT))
                        imports_by_file[rel_path] = imports
                except Exception:
                    # Ignorar silenciosamente archivos problemáticos
                    continue
    except Exception as e:
        print(f"⚠️  Error en análisis de dependencias: {e}")
    
    return imports_by_file

def generate_markdown(tree_lines, file_stats, imports_by_file):
    """Generar contenido del markdown."""
    md = []
    
    # Header
    md.append("# STRUCTURED.md")
    md.append(f"\n**Generado:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    md.append("\n---\n")
    
    # Árbol
    md.append("## 📂 Estructura de Directorios\n")
    md.append("```")
    md.append(PROJECT_ROOT.name + "/")
    md.extend(tree_lines)
    md.append("```\n")
    
    # Reporte de LOC
    md.append("## 📊 Reporte de Líneas de Código\n")
    
    # Por extensión
    by_extension = defaultdict(lambda: {"files": 0, "lines": 0})
    for file_path, loc in file_stats.items():
        ext = Path(file_path).suffix or "sin extensión"
        by_extension[ext]["files"] += 1
        by_extension[ext]["lines"] += loc
    
    md.append("### Por Extensión\n")
    md.append("| Extensión | Archivos | Líneas |")
    md.append("|-----------|----------|--------|")
    for ext in sorted(by_extension.keys()):
        stats = by_extension[ext]
        md.append(f"| {ext} | {stats['files']} | {stats['lines']} |")
    
    total_files = len(file_stats)
    total_lines = sum(file_stats.values())
    md.append(f"\n**Total:** {total_files} archivos, {total_lines} líneas\n")
    
    # Top 10 archivos por LOC
    md.append("### Top 10 Archivos Más Grandes\n")
    md.append("| Archivo | Líneas |")
    md.append("|---------|--------|")
    for file_path, loc in sorted(file_stats.items(), key=lambda x: x[1], reverse=True)[:10]:
        md.append(f"| {file_path} | {loc} |")
    md.append("")
    
    # Análisis de dependencias
    if imports_by_file:
        md.append("\n## 🔗 Análisis de Dependencias\n")
        
        # Módulos más importados
        all_imports = defaultdict(int)
        for imports in imports_by_file.values():
            for imp in imports:
                all_imports[imp] += 1
        
        md.append("### Módulos Más Importados\n")
        md.append("| Módulo | Importado por |")
        md.append("|--------|---------------|")
        for module in sorted(all_imports.keys(), key=lambda x: all_imports[x], reverse=True)[:15]:
            md.append(f"| {module} | {all_imports[module]} archivos |")
        md.append("")
        
        # Archivos con más dependencias
        md.append("### Archivos con Más Dependencias\n")
        md.append("| Archivo | Dependencias |")
        md.append("|---------|--------------|")
        for file_path in sorted(imports_by_file.keys(), 
                               key=lambda x: len(imports_by_file[x]), 
                               reverse=True)[:10]:
            count = len(imports_by_file[file_path])
            md.append(f"| {file_path} | {count} |")
        md.append("")
    
    return "\n".join(md)

def main():
    """Ejecutar generación."""
    print(f"🔍 Analizando {PROJECT_ROOT.name}...")
    
    # Construir árbol y recolectar stats
    file_stats = {}
    tree_lines = build_tree(PROJECT_ROOT, file_stats=file_stats)
    
    # Analizar dependencias
    imports_by_file = analyze_dependencies()
    
    # Generar markdown
    content = generate_markdown(tree_lines, file_stats, imports_by_file)
    
    # Guardar
    OUTPUT_FILE.write_text(content, encoding='utf-8')
    
    print(f"✅ {OUTPUT_FILE.name} generado: {OUTPUT_FILE}")
    print(f"   - {len(file_stats)} archivos analizados")
    print(f"   - {sum(file_stats.values())} líneas de código totales")
    print(f"   - {len(imports_by_file)} archivos Python con imports")

if __name__ == "__main__":
    main()