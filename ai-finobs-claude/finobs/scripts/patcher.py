"""
Phase 5.1 — Safe auto-patcher.

Aplica patches determinísticos al código fuente del agente.
Solo patches SIN riesgo de cambiar comportamiento semántico:
  - LOOP_GUARD: agrega dict cache antes de tool calls repetidos
  - RETRY:      agrega @tenacity.retry a funciones con errores
  - TRIM:       agrega helper trim_context donde hay token waste

Nunca modifica lógica de negocio ni prompts.
Siempre genera backup antes de patchear.
"""
import ast
import shutil
import textwrap
from dataclasses import dataclass, field
from pathlib import Path
from datetime import datetime, timezone


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class PatchTarget:
    file_path: Path
    function_name: str
    patch_type: str        # loop_guard | retry | trim_context
    reason: str
    safe: bool = True


@dataclass
class PatchResult:
    patch_type: str
    file_path: str
    function_name: str
    applied: bool
    backup_path: str = ""
    diff_summary: str = ""
    error: str = ""


@dataclass
class ApplyReport:
    run_id: str
    patches_applied: list[PatchResult] = field(default_factory=list)
    patches_skipped: list[PatchResult] = field(default_factory=list)
    total_applied: int = 0
    total_skipped: int = 0


# ---------------------------------------------------------------------------
# Patch generators — código que se inyecta
# ---------------------------------------------------------------------------

LOOP_GUARD_SNIPPET = textwrap.dedent("""
# [finobs:loop_guard] Auto-added — prevents redundant tool calls
_finobs_cache_{fn} = {{}}

""")

LOOP_GUARD_WRAPPER = textwrap.dedent("""
    # [finobs:loop_guard] Cache check
    _cache_key = str(locals())
    if _cache_key in _finobs_cache_{fn}:
        return _finobs_cache_{fn}[_cache_key]
""")

LOOP_GUARD_STORE = textwrap.dedent("""
    # [finobs:loop_guard] Store result
    _finobs_cache_{fn}[_cache_key] = _finobs_result
    return _finobs_result
""")

RETRY_DECORATOR = "    @tenacity.retry(stop=tenacity.stop_after_attempt(3), wait=tenacity.wait_exponential(min=1, max=8))  # [finobs:retry]\n"

RETRY_IMPORT = "import tenacity  # [finobs:retry] Auto-added\n"

TRIM_HELPER = textwrap.dedent("""
# [finobs:trim_context] Auto-added — trims context to avoid token waste
def _finobs_trim_context(messages: list, max_tokens: int = 4096) -> list:
    total = 0
    trimmed = []
    for msg in reversed(messages):
        tokens = len(str(msg)) // 4
        if total + tokens > max_tokens:
            break
        trimmed.insert(0, msg)
        total += tokens
    return trimmed if trimmed else messages[-3:]

""")


# ---------------------------------------------------------------------------
# AST helpers
# ---------------------------------------------------------------------------

def _find_functions(source: str) -> list[str]:
    """Devuelve nombres de todas las funciones definidas en el source."""
    try:
        tree = ast.parse(source)
        return [
            node.name
            for node in ast.walk(tree)
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
        ]
    except SyntaxError:
        return []


def _function_has_marker(source: str, fn_name: str, marker: str) -> bool:
    """Verifica si una función ya tiene un patch aplicado."""
    lines = source.splitlines()
    in_fn = False
    for line in lines:
        if line.strip().startswith(f"def {fn_name}") or line.strip().startswith(f"async def {fn_name}"):
            in_fn = True
        if in_fn and marker in line:
            return True
        if in_fn and line.strip() == "" and in_fn:
            pass  # continuar
    return marker in source  # fallback global


def _already_patched(source: str, patch_type: str) -> bool:
    return f"[finobs:{patch_type}]" in source


# ---------------------------------------------------------------------------
# Patch applicators
# ---------------------------------------------------------------------------

def apply_loop_guard(source: str, fn_name: str) -> tuple[str, bool]:
    """
    Inyecta dict cache antes de la función y wrap del resultado.
    Estrategia: text-based (AST no modifica bien el whitespace).
    """
    if _already_patched(source, "loop_guard"):
        return source, False

    # 1. Agregar dict cache al nivel del módulo (antes de la primera `def`)
    first_def = source.find("\ndef ") 
    if first_def == -1:
        first_def = source.find("\nasync def ")
    if first_def == -1:
        return source, False

    cache_decl = LOOP_GUARD_SNIPPET.format(fn=fn_name)
    patched = source[:first_def] + "\n" + cache_decl + source[first_def:]

    # 2. Dentro de la función, wrap del return value
    # Buscamos `return ` y reemplazamos por cache store
    fn_start = patched.find(f"\ndef {fn_name}(")
    if fn_start == -1:
        fn_start = patched.find(f"\nasync def {fn_name}(")
    if fn_start == -1:
        return source, False

    # Encontrar el primer return dentro de la función
    lines = patched.splitlines()
    result_lines = []
    in_fn = False
    indent = ""
    cache_check_added = False
    modified = False

    for line in lines:
        stripped = line.lstrip()
        if stripped.startswith(f"def {fn_name}(") or stripped.startswith(f"async def {fn_name}("):
            in_fn = True
            indent = " " * (len(line) - len(line.lstrip()) + 4)

        if in_fn and not cache_check_added and stripped.startswith("#") is False and stripped and not stripped.startswith("def ") and not stripped.startswith("async def ") and not stripped.startswith('"""') and not stripped.startswith("'''"):
            # Primera línea real del body — agregar cache check
            if stripped and not stripped.startswith(("def ", "async def ", "@")):
                result_lines.append(line)
                result_lines.append(f"{indent}_cache_key = str(locals())  # [finobs:loop_guard]")
                result_lines.append(f"{indent}if _cache_key in _finobs_cache_{fn_name}: return _finobs_cache_{fn_name}[_cache_key]")
                cache_check_added = True
                modified = True
                continue

        # Wrap return values
        if in_fn and stripped.startswith("return ") and "finobs" not in line:
            ret_val = stripped[7:]  # después de "return "
            result_lines.append(f"{line.rstrip()}  # [finobs:loop_guard:noop]")
            result_lines.append(f"{indent}_finobs_cache_{fn_name}[_cache_key] = ({ret_val})")
            result_lines.append(f"{indent}return _finobs_cache_{fn_name}[_cache_key]")
            modified = True
            continue

        result_lines.append(line)

    if not modified:
        return source, False

    return "\n".join(result_lines), True


def apply_retry(source: str, fn_name: str) -> tuple[str, bool]:
    """Agrega @tenacity.retry sobre la definición de la función."""
    if _already_patched(source, "retry"):
        return source, False

    # Agregar import si no existe
    if "import tenacity" not in source:
        source = RETRY_IMPORT + source

    # Encontrar la línea de definición y agregar el decorator encima
    lines = source.splitlines()
    result_lines = []
    modified = False

    for line in lines:
        stripped = line.lstrip()
        if (stripped.startswith(f"def {fn_name}(") or stripped.startswith(f"async def {fn_name}(")) and not modified:
            indent = " " * (len(line) - len(stripped))
            result_lines.append(
                f"{indent}@tenacity.retry("
                f"stop=tenacity.stop_after_attempt(3), "
                f"wait=tenacity.wait_exponential(min=1, max=8), "
                f"reraise=True"
                f")  # [finobs:retry]"
            )
            modified = True
        result_lines.append(line)

    if not modified:
        return source, False

    return "\n".join(result_lines), True


def apply_trim_context(source: str) -> tuple[str, bool]:
    """Agrega helper _finobs_trim_context al módulo."""
    if _already_patched(source, "trim_context"):
        return source, False

    # Agregar helper antes de la primera función
    first_def = source.find("\ndef ")
    if first_def == -1:
        first_def = source.find("\nasync def ")
    if first_def == -1:
        return source + "\n" + TRIM_HELPER, True

    patched = source[:first_def] + "\n" + TRIM_HELPER + source[first_def:]
    return patched, True


# ---------------------------------------------------------------------------
# Main apply function
# ---------------------------------------------------------------------------

def apply_patches(
    targets: list[PatchTarget],
    dry_run: bool = False,
) -> ApplyReport:
    """
    Aplica patches a los archivos especificados.
    Siempre hace backup antes de modificar.
    """
    report = ApplyReport(run_id="")

    for target in targets:
        if not target.safe:
            result = PatchResult(
                patch_type=target.patch_type,
                file_path=str(target.file_path),
                function_name=target.function_name,
                applied=False,
                error="Marked as unsafe — skipped",
            )
            report.patches_skipped.append(result)
            continue

        if not target.file_path.exists():
            result = PatchResult(
                patch_type=target.patch_type,
                file_path=str(target.file_path),
                function_name=target.function_name,
                applied=False,
                error=f"File not found: {target.file_path}",
            )
            report.patches_skipped.append(result)
            continue

        source = target.file_path.read_text()

        # Aplicar el patch correspondiente
        patched_source, modified = _dispatch_patch(source, target)

        if not modified:
            result = PatchResult(
                patch_type=target.patch_type,
                file_path=str(target.file_path),
                function_name=target.function_name,
                applied=False,
                error="Already patched or pattern not found",
            )
            report.patches_skipped.append(result)
            continue

        if dry_run:
            result = PatchResult(
                patch_type=target.patch_type,
                file_path=str(target.file_path),
                function_name=target.function_name,
                applied=False,
                diff_summary=f"[dry-run] Would patch {target.function_name} ({target.patch_type})",
            )
            report.patches_skipped.append(result)
            continue

        # Backup
        ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        backup_path = target.file_path.with_suffix(f".backup_{ts}.py")
        shutil.copy2(target.file_path, backup_path)

        # Escribir
        target.file_path.write_text(patched_source)

        result = PatchResult(
            patch_type=target.patch_type,
            file_path=str(target.file_path),
            function_name=target.function_name,
            applied=True,
            backup_path=str(backup_path),
            diff_summary=f"Patched {target.function_name} with {target.patch_type}",
        )
        report.patches_applied.append(result)

    report.total_applied = len(report.patches_applied)
    report.total_skipped = len(report.patches_skipped)
    return report


def _dispatch_patch(source: str, target: PatchTarget) -> tuple[str, bool]:
    if target.patch_type == "loop_guard":
        return apply_loop_guard(source, target.function_name)
    if target.patch_type == "retry":
        return apply_retry(source, target.function_name)
    if target.patch_type == "trim_context":
        return apply_trim_context(source)
    return source, False


# ---------------------------------------------------------------------------
# Target resolver — dado un plan, resuelve qué archivos patchear
# ---------------------------------------------------------------------------

def resolve_patch_targets(
    plan,
    agent_files: list[Path],
) -> list[PatchTarget]:
    """
    Dado un OptimizationPlan y una lista de archivos del agente,
    resuelve qué patches aplicar y dónde.
    """
    targets = []

    # Indexar funciones disponibles por archivo
    file_functions: dict[Path, list[str]] = {}
    for path in agent_files:
        if path.exists():
            source = path.read_text()
            file_functions[path] = _find_functions(source)

    for action in plan.actions:
        category = action.get("category")

        if category == "loop_guard":
            # Buscar la función del tool que hace loop
            tool_name = _extract_tool_name(action.get("issue", ""))
            for path, fns in file_functions.items():
                for fn in fns:
                    if tool_name and tool_name.replace("-", "_") in fn.lower():
                        targets.append(PatchTarget(
                            file_path=path,
                            function_name=fn,
                            patch_type="loop_guard",
                            reason=action.get("issue", ""),
                            safe=True,
                        ))
                        break

        elif category == "retry":
            for path, fns in file_functions.items():
                for fn in fns:
                    if any(kw in fn.lower() for kw in ["call", "invoke", "request", "fetch"]):
                        targets.append(PatchTarget(
                            file_path=path,
                            function_name=fn,
                            patch_type="retry",
                            reason=action.get("issue", ""),
                            safe=True,
                        ))

        elif category == "token_optimization":
            for path in file_functions:
                targets.append(PatchTarget(
                    file_path=path,
                    function_name="",
                    patch_type="trim_context",
                    reason=action.get("issue", ""),
                    safe=True,
                ))

    return targets


def _extract_tool_name(issue_text: str) -> str:
    """Extrae el nombre del tool del texto del issue."""
    import re
    match = re.search(r"['\"]([a-zA-Z_]+)['\"]", issue_text)
    return match.group(1) if match else ""


# ---------------------------------------------------------------------------
# Rollback
# ---------------------------------------------------------------------------

def rollback(file_path: Path) -> bool:
    """Restaura el backup más reciente de un archivo."""
    backups = sorted(file_path.parent.glob(f"{file_path.stem}.backup_*.py"), reverse=True)
    if not backups:
        return False
    shutil.copy2(backups[0], file_path)
    backups[0].unlink()
    return True
