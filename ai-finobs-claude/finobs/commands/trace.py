import typer
from rich.console import Console

app = typer.Typer()
console = Console()


@app.callback(invoke_without_command=True)
def run(run_id: str = typer.Argument(..., help="Agent run ID")):
    from finobs.scripts.trace_parser import load_trace
    trace = load_trace(run_id)
    if not trace:
        console.print(f"[red]Trace not found: {run_id}[/red]")
        raise typer.Exit(1)

    console.print(f"\n[bold]Trace for [cyan]{run_id}[/cyan][/bold]\n")
    for i, step in enumerate(trace.steps):
        status_color = "green" if step.status == "success" else "red"
        console.print(
            f"  [{status_color}]{i+1:03d}[/{status_color}] "
            f"[bold]{step.tool:<25}[/bold] "
            f"{step.duration_ms:6.0f}ms  "
            f"[dim]{step.input_tokens}→{step.output_tokens} tokens[/dim]"
        )
    console.print()
