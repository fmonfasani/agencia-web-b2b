import re
import os
import json
from pathlib import Path
from collections import defaultdict

INPUT_FILE = "scrap.md"
OUTPUT_DIR = Path("output")

CODE_DIR = OUTPUT_DIR / "code_blocks"
FILES_DIR = OUTPUT_DIR / "files"

CODE_DIR.mkdir(parents=True, exist_ok=True)
FILES_DIR.mkdir(parents=True, exist_ok=True)

# -----------------------------
# UTILIDADES
# -----------------------------

def detect_language(code_block):
    if code_block.startswith("```"):
        first_line = code_block.split("\n")[0]
        return first_line.replace("```", "").strip() or "plain"
    return "plain"


def clean_code_block(code_block):
    lines = code_block.strip().split("\n")
    if lines[0].startswith("```"):
        lines = lines[1:]
    if lines and lines[-1].startswith("```"):
        lines = lines[:-1]
    return "\n".join(lines)


def infer_filename(code, idx):
    # heurísticas
    if "import React" in code:
        return f"Component_{idx}.tsx"
    if "def " in code:
        return f"script_{idx}.py"
    if "SELECT " in code.upper():
        return f"query_{idx}.sql"
    if "{" in code and "}" in code:
        return f"data_{idx}.json"
    if "<html" in code.lower():
        return f"page_{idx}.html"
    return f"file_{idx}.txt"


def extract_possible_filename(context_lines):
    for line in context_lines:
        match = re.search(r'([\w\-/]+?\.(py|ts|tsx|js|json|sql|html|css))', line)
        if match:
            return match.group(1)
    return None


# -----------------------------
# PROCESAMIENTO
# -----------------------------

with open(INPUT_FILE, "r", encoding="utf-8") as f:
    content = f.read()

# Extraer bloques de código
code_blocks = re.findall(r"```[\s\S]*?```", content)

metadata = []
file_map = defaultdict(list)

for idx, block in enumerate(code_blocks):
    language = detect_language(block)
    clean_code = clean_code_block(block)

    # contexto cercano para inferir nombre
    start = content.find(block)
    context_window = content[max(0, start - 300):start].split("\n")[-5:]

    filename = extract_possible_filename(context_window)
    if not filename:
        filename = infer_filename(clean_code, idx)

    # guardar bloque individual
    code_file = CODE_DIR / f"block_{idx}.{language}"
    with open(code_file, "w", encoding="utf-8") as f:
        f.write(clean_code)

    # agrupar por archivo inferido
    file_map[filename].append(clean_code)

    metadata.append({
        "id": idx,
        "language": language,
        "filename": filename,
        "path": str(code_file)
    })

# -----------------------------
# RECONSTRUIR ARCHIVOS
# -----------------------------

for filename, parts in file_map.items():
    full_path = FILES_DIR / filename
    with open(full_path, "w", encoding="utf-8") as f:
        f.write("\n\n".join(parts))

# -----------------------------
# RESUMEN BÁSICO
# -----------------------------

summary = f"""
# Technical Summary

## Total Code Blocks
{len(code_blocks)}

## Detected Files
{len(file_map)}

### Files:
"""

for f in file_map:
    summary += f"- {f}\n"

summary += "\n## Notes\n- Archivos reconstruidos por heurística\n"

with open(OUTPUT_DIR / "summary.md", "w", encoding="utf-8") as f:
    f.write(summary)

# -----------------------------
# METADATA JSON
# -----------------------------

with open(OUTPUT_DIR / "index.json", "w", encoding="utf-8") as f:
    json.dump(metadata, f, indent=2)

print("✅ Extracción completa:")
print(f"- Bloques: {len(code_blocks)}")
print(f"- Archivos: {len(file_map)}")
print(f"- Output: {OUTPUT_DIR}")