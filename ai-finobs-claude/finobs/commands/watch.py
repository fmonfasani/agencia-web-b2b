import typer
from rich.console import Console
from rich.table import Table
from rich import box

app = typer.Typer()
console = Console()


@app.callback(invoke_without_command=True)
def run(
    target: str = typer.Argument(..., help="Tenant name or run_id prefix"),
    last: int = typer.Option(10, "--last", "-n", help="Number of recent runs to analyze"),
):
    from finobs.scripts.degradation_detector import analyze_degradation

    console.print(f"\n[bold]Watching trend for [cyan]{target}[/cyan] (last {last} runs)...[/bold]\n")
    report = analyze_degradation(target, last_n=last)

    if report.trend == "insufficient_data":
        console.print(f"[yellow]⚠ {report.recommendation}[/yellow]\n")
        return

    # Trend badge
    trend_display = {
        "improving": "[bold green]📈 IMPROVING[/bold green]",
        "stable":    "[bold dim]➡ STABLE[/bold dim]",
        "degrading": "[bold yellow]📉 DEGRADING[/bold yellow]",
        "critical":  "[bold red]🚨 CRITICAL[/bold red]",
    }
    console.print(f"Trend: {trend_display.get(report.trend, report.trend)}\n")

    # Tabla de runs
    if report.points:
        table = Table(box=box.SIMPLE, show_header=True, pad_edge=False)
        table.add_column("Run ID",      style="cyan")
        table.add_column("Score",       justify="right")
        table.add_column("p95 (ms)",    justify="right")
        table.add_column("Cost (USD)",  justify="right")
        table.add_column("Loops",       justify="right")
        table.add_column("Errors",      justify="right")

        for point in report.points:
            score_color = "green" if point.overall_score >= 85 else "yellow" if point.overall_score >= 65 else "red"
            table.add_row(
                point.run_id[:12],
                f"[{score_color}]{point.overall_score:.0f}[/{score_color}]",
                f"{point.p95_ms:.0f}",
                f"${point.cost_usd:.4f}",
                str(point.loop_count),
                str(point.error_count),
            )
        console.print(table)

    # Degrading metrics
    if report.degrading_metrics:
        console.print("\n[bold yellow]Degrading metrics:[/bold yellow]")
        for m in report.degrading_metrics:
            console.print(f"  [yellow]↓[/yellow] {m}")

    console.print(f"\n[dim]Recommendation:[/dim] {report.recommendation}\n")
