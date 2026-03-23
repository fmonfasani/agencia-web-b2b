import typer
from rich.console import Console

app = typer.Typer()
console = Console()


@app.callback(invoke_without_command=True)
def run(run_id: str = typer.Argument(..., help="Agent run ID")):
    from finobs.scripts.trace_parser import load_trace
    from finobs.scripts.loop_detector import detect_loops

    trace = load_trace(run_id)
    if not trace:
        console.print(f"[red]Trace not found: {run_id}[/red]")
        raise typer.Exit(1)

    loops = detect_loops(trace.steps)

    if not loops:
        console.print(f"\n[green]✓ No loops detected in {run_id}[/green]\n")
        return

    console.print(f"\n[bold red]⚠ {len(loops)} loop(s) detected in {run_id}[/bold red]\n")
    for loop in loops:
        console.print(
            f"  [red]•[/red] [bold]{loop['tool']}[/bold] "
            f"— {loop['occurrences']}x at steps {loop['step_indices']}"
        )
    console.print()
