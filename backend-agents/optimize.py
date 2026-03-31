import asyncio
from pathlib import Path
import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich import box

app = typer.Typer()
console = Console()


@app.callback(invoke_without_command=True)
def run(
    run_id: str = typer.Argument(..., help="Agent run ID to optimize"),
    llm: bool = typer.Option(False, "--llm", help="Enrich plan with Claude suggestions"),
    apply: bool = typer.Option(False, "--apply", help="Auto-apply safe patches to agent source"),
    dry_run: bool = typer.Option(False, "--dry-run", help="Show what --apply would do, without modifying files"),
    agent_path: str = typer.Option(None, "--agent-path", "-p", help="Path to agent source dir/file"),
    rollback: str = typer.Option(None, "--rollback", help="Rollback patches on a specific file"),
):
    asyncio.run(_run_optimize(
        run_id, llm=llm, apply=apply, dry_run=dry_run,
        agent_path=agent_path, rollback=rollback
    ))


async def _run_optimize(
    run_id: str,
    llm: bool = False,
    apply: bool = False,
    dry_run: bool = False,
    agent_path: str = None,
    rollback: str = None,
):
    # Rollback mode
    if rollback:
        _do_rollback(rollback)
        return

    from finobs.scripts.trace_parser import load_trace
    from finobs.scripts.optimizer import build_optimization_plan, enrich_with_llm, save_plan

    trace = load_trace(run_id)
    if not trace:
        console.print(f"[red]✗ Trace not found: {run_id}[/red]")
        raise typer.Exit(1)

    console.print(f"\n[bold]Generating optimization plan for [cyan]{run_id}[/cyan]...[/bold]\n")

    plan = build_optimization_plan(trace)
    plan.run_id = run_id

    if llm:
        console.print("[dim]Enriching with Claude suggestions...[/dim]")
        try:
            plan = await enrich_with_llm(plan, trace)
        except EnvironmentError as e:
            console.print(f"[yellow]⚠ LLM skipped: {e}[/yellow]")
        except Exception as e:
            console.print(f"[yellow]⚠ LLM failed: {e}[/yellow]")

    _print_plan(plan)

    # --apply o --dry-run
    if apply or dry_run:
        await _do_apply(plan, agent_path=agent_path, dry_run=dry_run)

    path = save_plan(plan)
    console.print(f"Plan saved to: [bold green]{path}[/bold green]\n")


async def _do_apply(plan, agent_path: str = None, dry_run: bool = False):
    from finobs.scripts.patcher import resolve_patch_targets, apply_patches

    mode_label = "[dim][dry-run][/dim]" if dry_run else "[bold green][APPLYING][/bold green]"
    console.print(f"\n{mode_label} Resolving patch targets...\n")

    # Resolver archivos del agente
    agent_files = _resolve_agent_files(agent_path)
    if not agent_files:
        console.print(
            "[yellow]⚠ No agent files found. Use --agent-path to specify your agent directory.[/yellow]\n"
        )
        return

    console.print(f"Found [bold]{len(agent_files)}[/bold] agent file(s):")
    for f in agent_files:
        console.print(f"  [dim]{f}[/dim]")
    console.print()

    targets = resolve_patch_targets(plan, agent_files)

    if not targets:
        console.print("[yellow]No patchable targets found in agent files.[/yellow]\n")
        return

    report = apply_patches(targets, dry_run=dry_run)

    # Print results
    table = Table(box=box.SIMPLE, show_header=True, pad_edge=False)
    table.add_column("Patch",      style="bold")
    table.add_column("Function",   style="cyan")
    table.add_column("File",       style="dim")
    table.add_column("Status",     justify="right")

    for result in report.patches_applied:
        table.add_row(
            result.patch_type,
            result.function_name or "module-level",
            Path(result.file_path).name,
            "[green]✓ Applied[/green]",
        )
        if result.backup_path:
            console.print(f"  [dim]Backup: {result.backup_path}[/dim]")

    for result in report.patches_skipped:
        reason = result.error or result.diff_summary or "skipped"
        table.add_row(
            result.patch_type,
            result.function_name or "module-level",
            Path(result.file_path).name if result.file_path else "—",
            f"[yellow]⊘ {reason[:40]}[/yellow]",
        )

    console.print(table)
    console.print(
        f"\nApplied: [green]{report.total_applied}[/green]  "
        f"Skipped: [yellow]{report.total_skipped}[/yellow]\n"
    )

    if report.total_applied > 0 and not dry_run:
        console.print(
            "[dim]To rollback: finobs optimize <run_id> --rollback <file_path>[/dim]\n"
        )


def _do_rollback(file_path: str):
    from finobs.scripts.patcher import rollback
    path = Path(file_path)
    console.print(f"\n[bold]Rolling back patches on [cyan]{path.name}[/cyan]...[/bold]")
    if rollback(path):
        console.print(f"[green]✓ Restored from backup.[/green]\n")
    else:
        console.print(f"[red]✗ No backup found for {file_path}[/red]\n")
        raise typer.Exit(1)


def _resolve_agent_files(agent_path: str = None) -> list[Path]:
    """Busca archivos .py del agente."""
    if agent_path:
        p = Path(agent_path)
        if p.is_file():
            return [p]
        if p.is_dir():
            return list(p.rglob("*.py"))
        return []

    # Buscar en directorios comunes
    candidates = ["agents/", "agent/", "src/", "app/", "."]
    for candidate in candidates:
        p = Path(candidate)
        if p.exists():
            files = [f for f in p.rglob("*.py") if "finobs" not in str(f) and "__pycache__" not in str(f)]
            if files:
                return files[:10]  # límite de seguridad

    return []


def _print_plan(plan):
    if not plan.actions and not plan.llm_suggestions:
        console.print("[green]✓ No optimizations needed.[/green]\n")
        return

    priority_order = {"high": 0, "medium": 1, "low": 2}
    for action in sorted(plan.actions, key=lambda a: priority_order.get(a["priority"], 3)):
        badge = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(action["priority"], "•")
        color = {"high": "red", "medium": "yellow", "low": "green"}.get(action["priority"], "white")
        lines = [
            f"[bold]{badge} [{action['category']}][/bold] {action['issue']}",
            f"  [bold]Fix:[/bold] {action['fix']}",
        ]
        if action.get("estimated_usd_savings"):
            lines.append(f"  [dim]Saves ~${action['estimated_usd_savings']:.5f} USD/run[/dim]")
        if action.get("estimated_step_savings"):
            lines.append(f"  [dim]Eliminates ~{action['estimated_step_savings']} steps[/dim]")
        if action.get("code_hint"):
            lines.append(f"\n[dim]{action['code_hint']}[/dim]")
        console.print(Panel("\n".join(lines), border_style=color, padding=(0, 2)))

    if plan.llm_suggestions:
        console.print("\n[bold cyan]Claude Suggestions:[/bold cyan]")
        for s in plan.llm_suggestions:
            badge = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(s.get("priority", "low"), "•")
            console.print(f"  {badge} [{s.get('area', '')}] {s.get('suggestion', '')}")
            if s.get("example"):
                console.print(f"    [dim]→ {s['example']}[/dim]")
        console.print()

    savings = plan.estimated_savings
    if savings.get("steps_eliminated") or savings.get("usd_saved_per_run"):
        console.print(
            f"[bold]Estimated savings:[/bold] "
            f"{savings.get('steps_eliminated', 0)} steps | "
            f"~${savings.get('usd_saved_per_run', 0):.5f} USD/run\n"
        )
