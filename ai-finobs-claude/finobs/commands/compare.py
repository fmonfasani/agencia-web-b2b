import typer
from rich.console import Console
from rich.table import Table
from rich import box

app = typer.Typer()
console = Console()


@app.callback(invoke_without_command=True)
def run(
    run_a: str = typer.Argument(..., help="Baseline run ID"),
    run_b: str = typer.Argument(..., help="New run ID to compare"),
):
    from finobs.scripts.trace_parser import load_trace
    from finobs.scripts.diff_engine import diff_traces

    trace_a = load_trace(run_a)
    trace_b = load_trace(run_b)

    for rid, trace in [(run_a, trace_a), (run_b, trace_b)]:
        if not trace:
            console.print(f"[red]✗ Trace not found: {rid}[/red]")
            raise typer.Exit(1)

    diff = diff_traces(trace_a, trace_b)

    console.print(f"\n[bold]Compare[/bold] [cyan]{run_a}[/cyan] → [cyan]{run_b}[/cyan]\n")
    console.print(f"[dim]{diff.summary}[/dim]\n")

    if diff.regressions:
        console.print("[bold red]Regressions:[/bold red]")
        table = Table(box=box.SIMPLE, show_header=True, pad_edge=False)
        table.add_column("Metric",    style="bold")
        table.add_column("Baseline",  justify="right")
        table.add_column("New run",   justify="right")
        table.add_column("Change",    justify="right")
        for r in diff.regressions:
            badge = "🔴" if r["severity"] == "high" else "🟡"
            table.add_row(
                f"{badge} {r['metric']}",
                r["run_a"],
                r["run_b"],
                f"[red]{r['change_pct']:+.1f}%[/red]",
            )
        console.print(table)

    if diff.improvements:
        console.print("\n[bold green]Improvements:[/bold green]")
        table = Table(box=box.SIMPLE, show_header=True, pad_edge=False)
        table.add_column("Metric",    style="bold")
        table.add_column("Baseline",  justify="right")
        table.add_column("New run",   justify="right")
        table.add_column("Change",    justify="right")
        for imp in diff.improvements:
            table.add_row(
                f"🟢 {imp['metric']}",
                imp["run_a"],
                imp["run_b"],
                f"[green]{imp['change_pct']:+.1f}%[/green]",
            )
        console.print(table)

    if diff.unchanged:
        console.print(f"\n[dim]Unchanged: {', '.join(diff.unchanged)}[/dim]")

    console.print()
