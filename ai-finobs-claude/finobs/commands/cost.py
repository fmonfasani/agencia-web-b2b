import typer
from rich.console import Console
from rich.table import Table
from rich import box

app = typer.Typer()
console = Console()


@app.callback(invoke_without_command=True)
def run(
    target: str = typer.Argument(..., help="run_id or tenant name"),
    model: str = typer.Option("claude-sonnet-4-20250514", "--model", "-m"),
):
    from finobs.scripts.trace_parser import load_trace, load_tenant_traces
    from finobs.scripts.cost_analyzer import compute_cost

    # Intentar como run_id primero, luego como tenant
    trace = load_trace(target)
    if trace:
        traces = [trace]
        label = f"Run {target}"
    else:
        traces = load_tenant_traces(target)
        label = f"Tenant {target}"

    if not traces:
        console.print(f"[red]No traces found for: {target}[/red]")
        raise typer.Exit(1)

    console.print(f"\n[bold]Cost Analysis — {label}[/bold]\n")

    total_cost = 0.0
    table = Table(box=box.SIMPLE)
    table.add_column("Run ID", style="cyan")
    table.add_column("Steps", justify="right")
    table.add_column("Input tokens", justify="right")
    table.add_column("Output tokens", justify="right")
    table.add_column("Cost (USD)", justify="right")
    table.add_column("Waste steps", justify="right", style="yellow")

    for t in traces:
        result = compute_cost(t.steps, model=model)
        total_cost += result["total_usd"]
        table.add_row(
            t.run_id,
            str(len(t.steps)),
            f"{result['input_tokens']:,}",
            f"{result['output_tokens']:,}",
            f"${result['total_usd']:.4f}",
            str(len(result["waste_steps"])),
        )

    console.print(table)
    console.print(f"\n[bold]Total: [green]${total_cost:.4f} USD[/green][/bold]\n")
