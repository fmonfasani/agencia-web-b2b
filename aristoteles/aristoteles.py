#!/usr/bin/env python3
"""
╔═══════════════════════════════════════════════════════════════╗
║              ARISTÓTELES — Orquestador Multi-IA               ║
║                                                               ║
║  Flujo:                                                       ║
║    1. Claude Code CLI → Arquitecto: crea el plan inicial      ║
║    2. OpenAI          → Crítico:    analiza y mejora          ║
║    3. Gemini          → Juez:       sintetiza el plan final   ║
║    4. Output          → plan_final.md listo para implementar  ║
╚═══════════════════════════════════════════════════════════════╝

Uso:
    python aristoteles.py "Crear un sistema de autenticación JWT"
    python aristoteles.py --task "mi tarea" --output resultado.md
    python aristoteles.py --interactive
"""

import os
import sys
import argparse
import datetime
import subprocess
from pathlib import Path
from typing import Optional

# ── Colores ───────────────────────────────────────────────────────────────────

RESET   = "\033[0m"
BOLD    = "\033[1m"
DIM     = "\033[2m"
CYAN    = "\033[36m"
GREEN   = "\033[32m"
YELLOW  = "\033[33m"
MAGENTA = "\033[35m"
RED     = "\033[31m"
WHITE   = "\033[97m"

def print_header():
    print(f"""
{BOLD}{WHITE}╔═══════════════════════════════════════════════════════════════╗
║              ARISTÓTELES — Orquestador Multi-IA               ║
║                                                               ║
║  Claude Code  →  OpenAI  →  Gemini  →  Plan Final            ║
╚═══════════════════════════════════════════════════════════════╝{RESET}
""")

def print_step(n: int, name: str, role: str, color: str):
    print(f"\n{BOLD}{color}{'─'*60}{RESET}")
    print(f"{BOLD}{color}  PASO {n}: {name.upper()}{RESET}")
    print(f"{DIM}{color}  Rol: {role}{RESET}")
    print(f"{BOLD}{color}{'─'*60}{RESET}\n")

def print_thinking(msg: str):
    print(f"{DIM}  ⟳ {msg}...{RESET}", flush=True)

def print_ok(msg: str):
    print(f"{GREEN}  ✓ {msg}{RESET}")

def print_error(msg: str):
    print(f"{RED}  ✗ {msg}{RESET}")

def print_preview(text: str, lines: int = 8):
    preview = "\n".join(text.strip().splitlines()[:lines])
    for line in preview.splitlines():
        print(f"  {DIM}{line}{RESET}")
    total = len(text.splitlines())
    if total > lines:
        print(f"  {DIM}... ({total - lines} líneas más){RESET}")


# ── Clientes de IA ────────────────────────────────────────────────────────────

def get_openai_client():
    try:
        from openai import OpenAI
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY no encontrada")
        return OpenAI(api_key=api_key)
    except ImportError:
        print_error("openai no instalado. Ejecutá: pip install openai")
        sys.exit(1)

def get_gemini_client():
    try:
        import google.generativeai as genai
        api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY no encontrada")
        genai.configure(api_key=api_key)
        return genai.GenerativeModel("gemini-1.5-pro")
    except ImportError:
        print_error("google-generativeai no instalado. Ejecutá: pip install google-generativeai")
        sys.exit(1)


# ── Prompts ───────────────────────────────────────────────────────────────────

PROMPT_CLAUDE_ARCHITECT = """Sos un arquitecto de software senior. Tu tarea es crear un plan de implementación técnico, detallado y accionable.

Producí:
1. Análisis del problema
2. Arquitectura propuesta (componentes, patrones, tecnologías)
3. Plan de implementación paso a paso (archivos a crear/modificar, con estructura de código)
4. Consideraciones de seguridad, performance y escalabilidad
5. Riesgos y cómo mitigarlos

Respondé en español. Sé preciso y exhaustivo.

TAREA: {task}"""

SYSTEM_OPENAI_CRITIC = """Sos un revisor técnico senior experto en encontrar problemas, gaps y oportunidades de mejora en planes de software.

Dado el plan de otro arquitecto, tu trabajo es:
1. Identificar gaps, ambigüedades o suposiciones incorrectas
2. Señalar riesgos técnicos no considerados
3. Proponer alternativas o mejoras concretas y específicas
4. Evaluar completitud (¿falta algo crítico?)
5. Agregar consideraciones de testing, observabilidad y mantenibilidad

Respondé en español. Sé crítico pero constructivo — cada observación requiere una propuesta concreta."""

SYSTEM_GEMINI_JUDGE = """Sos el árbitro técnico final de un proceso de revisión multi-IA.

Recibís:
- El plan original del arquitecto (Claude Code)
- El análisis crítico del revisor (OpenAI)

Tu trabajo es sintetizar ambas visiones y producir el plan DEFINITIVO:
1. Tomá lo mejor del plan original
2. Incorporá las mejoras válidas del análisis crítico
3. Resolvé contradicciones con criterio técnico fundado
4. Producí un plan completo y listo para que el equipo codee

Estructura el output como markdown con estas secciones:
## Resumen ejecutivo
## Arquitectura final
## Plan de implementación (paso a paso, con archivos y código cuando sea relevante)
## Testing strategy
## Riesgos y mitigaciones
## Decisiones técnicas y justificaciones

Respondé en español. Este documento va directo al equipo de desarrollo."""


# ── Pasos del pipeline ────────────────────────────────────────────────────────

def step1_claude_code(task: str) -> str:
    """Claude Code CLI actúa como Arquitecto — sin API key."""
    print_step(1, "Claude Code", "Arquitecto — crea el plan inicial (CLI local)", CYAN)
    print_thinking("Ejecutando claude CLI")

    prompt = PROMPT_CLAUDE_ARCHITECT.format(task=task)

    # Intentamos distintas variantes del CLI en orden
    strategies = [
        ["claude", "-p", "--dangerously-skip-permissions"],  # prompt via stdin, skip perms
        ["claude", "--print", "--dangerously-skip-permissions"],
        ["claude", "-p"],
        ["claude", "--print"],
    ]

    last_error = None

    for cmd in strategies:
        try:
            result = subprocess.run(
                cmd,
                input=prompt,
                capture_output=True,
                text=True,
                timeout=180,
                encoding="utf-8",
            )

            if result.returncode == 0:
                output = result.stdout.strip()
                if output:
                    print_ok(f"Plan recibido ({len(output.split())} palabras)  [cmd: {' '.join(cmd)}]")
                    print_preview(output)
                    return output

            last_error = f"código {result.returncode} | stderr: {result.stderr.strip()[:200]}"

        except FileNotFoundError:
            print_error("claude CLI no encontrado en PATH.")
            print(f"\n  {DIM}Asegurate de que Claude Code esté instalado y 'claude' esté en el PATH.{RESET}\n")
            sys.exit(1)
        except subprocess.TimeoutExpired:
            last_error = "timeout (180s)"
            break

    raise RuntimeError(f"Todas las estrategias fallaron. Último error: {last_error}")


def step2_openai(task: str, claude_plan: str, model: str = "gpt-4o") -> str:
    """OpenAI actúa como Crítico — analiza el plan de Claude."""
    print_step(2, "OpenAI", "Crítico — analiza y mejora el plan de Claude", YELLOW)
    print_thinking(f"Consultando {model}")

    client = get_openai_client()

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_OPENAI_CRITIC},
            {
                "role": "user",
                "content": (
                    f"Tarea original: {task}\n\n"
                    f"---\n\n"
                    f"PLAN DEL ARQUITECTO (Claude Code):\n{claude_plan}\n\n"
                    f"---\n\n"
                    f"Analizá este plan. Identificá gaps, riesgos y mejoras concretas."
                ),
            },
        ],
        temperature=0.3,
        max_tokens=4000,
    )

    result = response.choices[0].message.content
    print_ok(f"Análisis recibido ({len(result.split())} palabras)")
    print_preview(result)
    return result


def step3_gemini(task: str, claude_plan: str, openai_analysis: str) -> str:
    """Gemini actúa como Juez y produce el plan final definitivo."""
    print_step(3, "Gemini", "Juez — sintetiza el plan definitivo", MAGENTA)
    print_thinking("Consultando gemini-1.5-pro")

    model = get_gemini_client()

    prompt = (
        f"Tarea original: {task}\n\n"
        f"---\n\n"
        f"## PLAN DEL ARQUITECTO (Claude Code):\n\n{claude_plan}\n\n"
        f"---\n\n"
        f"## ANÁLISIS CRÍTICO (OpenAI):\n\n{openai_analysis}\n\n"
        f"---\n\n"
        f"Sintetizá ambas visiones y producí el plan de implementación DEFINITIVO en markdown."
    )

    response = model.generate_content(
        prompt,
        generation_config={"temperature": 0.3, "max_output_tokens": 6000},
        system_instruction=SYSTEM_GEMINI_JUDGE,
    )

    result = response.text
    print_ok(f"Plan final recibido ({len(result.split())} palabras)")
    print_preview(result)
    return result


# ── Guardar output ────────────────────────────────────────────────────────────

def save_output(
    task: str,
    claude_plan: str,
    openai_analysis: str,
    gemini_final: str,
    output_path: Optional[str] = None,
) -> str:
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    if not output_path:
        safe_name = "".join(c if c.isalnum() else "_" for c in task[:40]).strip("_")
        output_path = f"plan_{safe_name}_{timestamp}.md"

    content = f"""# Plan de Implementación — Aristóteles
**Tarea:** {task}
**Fecha:** {datetime.datetime.now().strftime("%d/%m/%Y %H:%M")}
**Pipeline:** Claude Code (Arquitecto) → OpenAI (Crítico) → Gemini (Juez)

---

{gemini_final}

---

<details>
<summary>📋 Plan original — Claude Code (Arquitecto)</summary>

{claude_plan}

</details>

<details>
<summary>🔍 Análisis crítico — OpenAI (Crítico)</summary>

{openai_analysis}

</details>
"""

    Path(output_path).write_text(content, encoding="utf-8")
    return output_path


# ── Orquestador principal ─────────────────────────────────────────────────────

def run_aristoteles(task: str, output_path: Optional[str] = None, openai_model: str = "gpt-4o") -> str:
    print(f"\n{BOLD}{WHITE}  Tarea:{RESET} {task}\n")

    # Paso 1: Claude Code CLI → Plan inicial
    try:
        claude_plan = step1_claude_code(task)
    except Exception as e:
        print_error(f"Claude Code falló: {e}")
        raise

    # Paso 2: OpenAI → Análisis crítico
    try:
        openai_analysis = step2_openai(task, claude_plan, model=openai_model)
    except Exception as e:
        print_error(f"OpenAI falló: {e}")
        raise

    # Paso 3: Gemini → Plan definitivo
    try:
        gemini_final = step3_gemini(task, claude_plan, openai_analysis)
    except Exception as e:
        print_error(f"Gemini falló: {e}")
        raise

    saved_path = save_output(task, claude_plan, openai_analysis, gemini_final, output_path)

    print(f"\n{BOLD}{GREEN}{'═'*60}{RESET}")
    print(f"{BOLD}{GREEN}  ✓ PLAN FINAL GENERADO{RESET}")
    print(f"{BOLD}{GREEN}{'═'*60}{RESET}")
    print(f"\n  {WHITE}Archivo:{RESET} {BOLD}{saved_path}{RESET}")
    print(f"  {WHITE}Pipeline:{RESET} Claude Code → OpenAI → Gemini\n")

    return saved_path


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    print_header()

    parser = argparse.ArgumentParser(
        description="Aristóteles — Orquestador Multi-IA",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos:
  python aristoteles.py "Crear sistema de autenticación JWT"
  python aristoteles.py --task "API REST para e-commerce" --output plan.md
  python aristoteles.py --interactive
  python aristoteles.py "Mi tarea" --model gpt-4-turbo
        """,
    )
    parser.add_argument("task", nargs="?", help="Tarea a planificar")
    parser.add_argument("--task", "-t", dest="task_flag", help="Tarea (flag alternativo)")
    parser.add_argument("--output", "-o", help="Archivo de salida (.md)")
    parser.add_argument("--model", default="gpt-4o", help="Modelo OpenAI (default: gpt-4o)")
    parser.add_argument("--interactive", "-i", action="store_true", help="Modo interactivo")

    args = parser.parse_args()
    task = args.task or args.task_flag

    if args.interactive or not task:
        print(f"  {CYAN}Ingresá la tarea que querés planificar:{RESET}")
        print(f"  {DIM}(Ej: 'Crear sistema de notificaciones en tiempo real'){RESET}\n")
        task = input(f"  {BOLD}> {RESET}").strip()
        if not task:
            print_error("No ingresaste ninguna tarea.")
            sys.exit(1)

    # Verificar solo las keys necesarias (ya NO se necesita ANTHROPIC_API_KEY)
    print(f"\n{DIM}  Verificando credenciales...{RESET}")
    missing = []
    if not os.environ.get("OPENAI_API_KEY"):
        missing.append("OPENAI_API_KEY")
    if not (os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")):
        missing.append("GOOGLE_API_KEY")

    if missing:
        print_error(f"Faltan variables de entorno: {', '.join(missing)}")
        print(f"\n  {DIM}Configurá tu .env:{RESET}")
        for k in missing:
            print(f"  {DIM}  {k}=...\n{RESET}")
        sys.exit(1)

    print_ok("Credenciales OK (Claude Code no necesita API key)")

    try:
        run_aristoteles(task, output_path=args.output, openai_model=args.model)
    except KeyboardInterrupt:
        print(f"\n\n{YELLOW}  Pipeline interrumpido.{RESET}\n")
        sys.exit(0)
    except Exception as e:
        print_error(f"Error en el pipeline: {e}")
        sys.exit(1)


if __name__ == "__main__":
    # Cargar .env
    try:
        from dotenv import load_dotenv
        load_dotenv(Path(__file__).parent / ".env", override=False)
    except ImportError:
        env_file = Path(__file__).parent / ".env"
        if env_file.exists():
            for line in env_file.read_text(encoding="utf-8-sig").splitlines():
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, _, value = line.partition("=")
                    os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))

    main()
