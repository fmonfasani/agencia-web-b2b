#!/usr/bin/env python3
"""
Aristóteles — Modo Claude Code
El plan de Claude se pasa por stdin o --plan-file.
Este script maneja solo los pasos 2 (OpenAI) y 3 (Gemini).

Uso:
    python aristoteles_cc.py --task "mi tarea" --plan-file plan_claude.txt
    echo "mi plan" | python aristoteles_cc.py --task "mi tarea"
"""

import os, sys, argparse, datetime
from pathlib import Path

# Forzar UTF-8 en Windows
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if sys.stderr.encoding != "utf-8":
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

RESET   = "\033[0m";  BOLD = "\033[1m";  DIM = "\033[2m"
CYAN    = "\033[36m"; GREEN = "\033[32m"; YELLOW = "\033[33m"
MAGENTA = "\033[35m"; RED = "\033[31m";  WHITE = "\033[97m"

def p_step(n, name, role, color):
    print(f"\n{BOLD}{color}{'-'*60}{RESET}")
    print(f"{BOLD}{color}  PASO {n}: {name.upper()}{RESET}")
    print(f"{DIM}{color}  Rol: {role}{RESET}")
    print(f"{BOLD}{color}{'-'*60}{RESET}\n")

def p_ok(msg):   print(f"{GREEN}  ✓ {msg}{RESET}")
def p_err(msg):  print(f"{RED}  ✗ {msg}{RESET}")
def p_think(msg): print(f"{DIM}  ⟳ {msg}...{RESET}", flush=True)

def preview(text, n=8):
    lines = text.strip().splitlines()
    for l in lines[:n]:
        print(f"  {DIM}{l}{RESET}")
    if len(lines) > n:
        print(f"  {DIM}... ({len(lines)-n} líneas más){RESET}")


SYSTEM_OPENAI = """Sos un revisor técnico senior. Analizá el plan del arquitecto e identificá:
1. Gaps, ambigüedades o suposiciones incorrectas
2. Riesgos técnicos no considerados
3. Mejoras concretas y específicas
4. Lo que falta (testing, observabilidad, seguridad, etc.)
Respondé en español. Cada observación requiere una propuesta concreta."""

SYSTEM_GEMINI = """Sos un arquitecto y revisor técnico senior. Recibís un plan de implementación y tu trabajo es:
1. Identificar gaps, riesgos y mejoras concretas
2. Reforzar las decisiones correctas
3. Producir el plan DEFINITIVO mejorado con estas secciones markdown:
## Resumen ejecutivo
## Arquitectura final
## Plan de implementación (paso a paso, con archivos y snippets relevantes)
## Testing strategy
## Riesgos y mitigaciones
## Decisiones técnicas y justificaciones
Respondé en español. Este documento va directo al equipo de desarrollo."""


def call_openai(task: str, claude_plan: str, model: str = "gpt-4o") -> str:
    p_step(2, "OpenAI", "Crítico — analiza el plan de Claude", YELLOW)
    p_think(f"Consultando {model}")

    try:
        from openai import OpenAI
    except ImportError:
        p_err("pip install openai"); sys.exit(1)

    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_OPENAI},
            {"role": "user", "content":
                f"Tarea: {task}\n\n---\n\nPLAN (Claude Code):\n{claude_plan}\n\n---\n\n"
                "Analizá este plan. Identificá gaps, riesgos y mejoras concretas."},
        ],
        temperature=0.3,
        max_tokens=4000,
    )
    result = resp.choices[0].message.content
    p_ok(f"Análisis recibido ({len(result.split())} palabras)")
    preview(result)
    return result


def call_gemini(task: str, claude_plan: str, openai_analysis: str = "") -> str:
    step_label = "Juez — revisa y mejora el plan de Claude" if not openai_analysis else "Juez — sintetiza Claude + OpenAI"
    p_step(2, "Gemini", step_label, MAGENTA)
    p_think("Consultando gemini-2.5-flash")

    try:
        from google import genai
        from google.genai import types
    except ImportError:
        p_err("pip install google-genai"); sys.exit(1)

    api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)

    if openai_analysis:
        prompt = (
            f"Tarea: {task}\n\n---\n\n"
            f"## PLAN ORIGINAL (Claude Code):\n\n{claude_plan}\n\n---\n\n"
            f"## ANÁLISIS CRÍTICO (OpenAI):\n\n{openai_analysis}\n\n---\n\n"
            "Sintetizá ambas visiones y producí el plan DEFINITIVO en markdown."
        )
    else:
        prompt = (
            f"Tarea: {task}\n\n---\n\n"
            f"## PLAN (Claude Code):\n\n{claude_plan}\n\n---\n\n"
            "Revisá este plan, identificá gaps y mejoras, y producí el plan DEFINITIVO en markdown."
        )

    resp = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_GEMINI,
            temperature=0.3,
            max_output_tokens=6000,
        ),
    )
    result = resp.text
    p_ok(f"Plan final recibido ({len(result.split())} palabras)")
    preview(result)
    return result


def save(task, claude_plan, openai_analysis, gemini_final, output_path=None):
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    if not output_path:
        safe = "".join(c if c.isalnum() else "_" for c in task[:40]).strip("_")
        output_path = f"plan_{safe}_{ts}.md"

    Path(output_path).write_text(f"""# Plan de Implementación — Aristóteles
**Tarea:** {task}
**Fecha:** {datetime.datetime.now().strftime("%d/%m/%Y %H:%M")}
**Pipeline:** Claude Code (Arquitecto) → OpenAI (Crítico) → Gemini (Juez)

---

{gemini_final}

---

<details>
<summary>📋 Plan original — Claude Code</summary>

{claude_plan}

</details>

<details>
<summary>🔍 Análisis crítico — OpenAI</summary>

{openai_analysis}

</details>
""", encoding="utf-8")
    return output_path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--task", "-t", required=True, help="Descripción de la tarea")
    parser.add_argument("--plan-file", "-f", help="Archivo con el plan de Claude (.txt/.md)")
    parser.add_argument("--output", "-o", help="Archivo de salida (.md)")
    parser.add_argument("--model", default="gpt-4o")
    parser.add_argument("--skip-openai", action="store_true", help="Saltear OpenAI, ir directo a Gemini")
    args = parser.parse_args()

    # Leer plan de Claude
    if args.plan_file:
        claude_plan = Path(args.plan_file).read_text(encoding="utf-8")
    elif not sys.stdin.isatty():
        claude_plan = sys.stdin.read()
    else:
        p_err("Pasá el plan via --plan-file o stdin")
        sys.exit(1)

    claude_plan = claude_plan.strip()
    if not claude_plan:
        p_err("El plan de Claude está vacío")
        sys.exit(1)

    print(f"\n{BOLD}{WHITE}  Tarea:{RESET} {args.task}")
    print(f"{DIM}  Plan de Claude: {len(claude_plan.split())} palabras{RESET}\n")

    openai_analysis = ""
    if not args.skip_openai:
        openai_analysis = call_openai(args.task, claude_plan, model=args.model)
    else:
        print(f"\n{DIM}  [OpenAI omitido]{RESET}")

    gemini_final = call_gemini(args.task, claude_plan, openai_analysis)
    saved        = save(args.task, claude_plan, openai_analysis, gemini_final, args.output)

    print(f"\n{BOLD}{GREEN}{'═'*60}{RESET}")
    print(f"{BOLD}{GREEN}  ✓ PLAN FINAL GENERADO{RESET}")
    print(f"{BOLD}{GREEN}{'═'*60}{RESET}")
    print(f"\n  {WHITE}Archivo:{RESET} {BOLD}{saved}{RESET}\n")


if __name__ == "__main__":
    try:
        from dotenv import load_dotenv
        load_dotenv(Path(__file__).parent / ".env", override=False)
    except ImportError:
        env_file = Path(__file__).parent / ".env"
        if env_file.exists():
            for line in env_file.read_text(encoding="utf-8-sig").splitlines():
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, _, val = line.partition("=")
                    os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))
    main()
