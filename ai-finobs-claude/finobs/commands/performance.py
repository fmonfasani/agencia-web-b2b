import typer
from rich.console import Console

app = typer.Typer()
console = Console()


@app.callback(invoke_without_command=True)
def run(run_id: str = typer.Argument(...)):
    from finobs.scripts.trace_parser import load_trace
    from finobs.scripts.metrics_aggregator import compute_latency_metrics

    trace = load_trace(run_id)
    if not trace:
        console.print(f"[red]Trace not found: {run_id}[/red]")
        raise typer.Exit(1)

    metrics = compute_latency_metrics(trace.steps)
    console.print(f"\n[bold]Performance — {run_id}[/bold]\n")
    console.print(f"  p50:   [bold]{metrics['p50']:.0f}ms[/bold]")
    console.print(f"  p95:   [bold]{metrics['p95']:.0f}ms[/bold]")
    console.print(f"  p99:   [bold]{metrics['p99']:.0f}ms[/bold]")
    console.print(f"  total: [bold]{metrics['total_ms']:.0f}ms[/bold]")
    console.print(f"\n  Slowest steps:")
    for s in metrics["slowest_steps"]:
        console.print(f"    [yellow]•[/yellow] {s['tool']:<25} {s['ms']:.0f}ms")
    console.print()
