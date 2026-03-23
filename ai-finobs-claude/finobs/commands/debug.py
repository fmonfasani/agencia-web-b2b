import asyncio
import typer
from rich.console import Console
from rich.panel import Panel

app = typer.Typer()
console = Console()


@app.callback(invoke_without_command=True)
def run(
    run_id: str = typer.Argument(...),
    llm: bool = typer.Option(False, "--llm", help="Claude root cause analysis"),
):
    asyncio.run(_run_debug(run_id, llm=llm))


async def _run_debug(run_id: str, llm: bool = False):
    from finobs.scripts.trace_parser import load_trace
    trace = load_trace(run_id)
    if not trace:
        console.print(f"[red]Trace not found: {run_id}[/red]")
        raise typer.Exit(1)

    failed = [s for s in trace.steps if s.status == "error"]
    console.print(f"\n[bold]Debug — {run_id}[/bold]\n")

    if not failed:
        console.print("[green]✓ No failed steps found[/green]\n")
    else:
        console.print(f"[red]✗ {len(failed)} failed step(s):[/red]\n")
        for step in failed:
            console.print(f"  [red]•[/red] [bold]{step.tool}[/bold]")
            console.print(f"    step_id:      {step.step_id}")
            console.print(f"    input_tokens: {step.input_tokens}")
            console.print(f"    duration_ms:  {step.duration_ms:.0f}\n")

    if llm:
        console.print("[dim]Running Claude root cause analysis...[/dim]\n")
        try:
            from finobs.scripts.llm_analyzer import analyze_trace
            insight = await analyze_trace(trace)
            lines = [f"[bold]Root Cause:[/bold] {insight.root_cause}"]
            if insight.fixes:
                lines.append("\n[bold]Fixes:[/bold]")
                for fix in insight.fixes:
                    color = "red" if fix["priority"] == "high" else "yellow"
                    lines.append(
                        f"  [{color}][{fix['priority'].upper()}][/{color}] {fix['description']}"
                    )
                    if fix.get("example"):
                        lines.append(f"    [dim]→ {fix['example']}[/dim]")
            lines.append(f"\n[dim]Confidence: {insight.confidence:.0%} | Tokens: {insight.tokens_used:,}[/dim]")
            console.print(Panel(
                "\n".join(lines),
                title="[bold cyan]Claude Root Cause Analysis[/bold cyan]",
                border_style="cyan",
                padding=(1, 2),
            ))
        except EnvironmentError as e:
            console.print(f"[yellow]⚠ {e}[/yellow]\n")
        except Exception as e:
            console.print(f"[yellow]⚠ LLM analysis failed: {e}[/yellow]\n")
