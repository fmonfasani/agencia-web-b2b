import asyncio
import typer
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import box

from finobs.scripts.trace_parser import load_trace
from finobs.scripts.report_generator import generate_report
from finobs.scripts.scoring import compute_overall_score
from finobs.agents import latency, quality, cost, behavior, rag

app = typer.Typer()
console = Console()


@app.callback(invoke_without_command=True)
def run(
    run_id: str = typer.Argument(..., help="Agent run ID to audit"),
    llm: bool = typer.Option(False, "--llm", help="Enable Claude semantic analysis (costs tokens)"),
    dry_run: bool = typer.Option(False, "--dry-run", help="Preview LLM cost without running"),
    output: str = typer.Option(None, "--output", "-o", help="Custom output path for report"),
):
    asyncio.run(_run_audit(run_id, llm=llm, dry_run=dry_run, output=output))


async def _run_audit(run_id: str, llm: bool = False, dry_run: bool = False, output: str = None):
    console.print(f"\n[bold]Loading trace for [cyan]{run_id}[/cyan]...[/bold]")

    trace = load_trace(run_id)
    if not trace:
        console.print(f"[red]✗ Trace not found for run_id: {run_id}[/red]")
        console.print(f"  Expected at: [dim]~/.finobs/traces/trace_{run_id}.json[/dim]\n")
        raise typer.Exit(1)

    token_total = sum(s.input_tokens + s.output_tokens for s in trace.steps)
    console.print(
        f"Parsed [bold]{len(trace.steps)}[/bold] steps | "
        f"[bold]{token_total:,}[/bold] tokens\n"
    )

    if dry_run:
        from finobs.scripts.llm_analyzer import estimate_cost_of_analysis
        estimate = await estimate_cost_of_analysis(trace)
        console.print("[bold]LLM Analysis Cost Estimate:[/bold]")
        console.print(f"  Model:           {estimate['model']}")
        console.print(f"  Input tokens:    ~{estimate['estimated_input_tokens']:,}")
        console.print(f"  Output tokens:   ~{estimate['estimated_output_tokens']:,}")
        console.print(f"  Estimated cost:  [yellow]~${estimate['estimated_cost_usd']:.5f} USD[/yellow]")
        console.print(f"\n  Run with [bold]--llm[/bold] to proceed.\n")
        return

    console.print("[bold]Launching 5 analysis agents...[/bold]\n")

    results = await asyncio.gather(
        latency.analyze(trace),
        quality.analyze(trace),
        cost.analyze(trace),
        behavior.analyze(trace),
        rag.analyze(trace),
    )

    scores = {
        "performance": results[0].score,
        "quality":     results[1].score,
        "cost":        results[2].score,
        "stability":   results[3].score,
        "rag":         results[4].score,
    }

    _print_results(results, scores)
    overall = compute_overall_score(scores)
    _print_overall(overall)
    _print_critical_issues(results)

    llm_insight = None
    if llm:
        llm_insight = await _run_llm_analysis(trace)

    path = generate_report(run_id, results, scores, overall, output, llm_insight=llm_insight)
    console.print(f"Report saved to: [bold green]{path}[/bold green]\n")


async def _run_llm_analysis(trace):
    from finobs.scripts.llm_analyzer import analyze_trace
    console.print("[dim]Running Claude semantic analysis...[/dim]\n")
    try:
        insight = await analyze_trace(trace)
        _print_llm_insight(insight)
        return insight
    except EnvironmentError as e:
        console.print(f"[yellow]⚠ LLM analysis skipped: {e}[/yellow]\n")
        return None
    except Exception as e:
        console.print(f"[yellow]⚠ LLM analysis failed: {e}[/yellow]\n")
        return None


def _print_llm_insight(insight):
    lines = []
    lines.append(f"[bold]Root Cause:[/bold] {insight.root_cause}")

    if insight.patterns:
        lines.append("\n[bold]Patterns:[/bold]")
        for p in insight.patterns:
            lines.append(f"  • {p}")

    if insight.fixes:
        lines.append("\n[bold]Fixes:[/bold]")
        for fix in insight.fixes:
            color = "red" if fix["priority"] == "high" else "yellow" if fix["priority"] == "medium" else "dim"
            lines.append(
                f"  [{color}][{fix['priority'].upper()}][/{color}] "
                f"[{fix.get('area', 'general')}] {fix['description']}"
            )
            if fix.get("example"):
                lines.append(f"    [dim]→ {fix['example']}[/dim]")

    lines.append(f"\n[dim]Confidence: {insight.confidence:.0%} | Tokens used: {insight.tokens_used:,}[/dim]")

    console.print(Panel(
        "\n".join(lines),
        title="[bold cyan]Claude Semantic Analysis[/bold cyan]",
        border_style="cyan",
        padding=(1, 2),
    ))
    console.print()


def _print_results(results, scores):
    labels = [
        ("Latency Analysis",     "performance"),
        ("Quality Analysis",     "quality"),
        ("Cost Efficiency",      "cost"),
        ("Behavior & Stability", "stability"),
        ("RAG Performance",      "rag"),
    ]
    table = Table(box=box.SIMPLE, show_header=False, pad_edge=False)
    table.add_column(width=30)
    table.add_column(width=20)
    table.add_column()

    for (label, dim), result in zip(labels, results):
        score = scores[dim]
        color = "green" if score >= 85 else "yellow" if score >= 65 else "red"
        summary = getattr(result, "summary", "")
        table.add_row(
            f"✓ {label}",
            f"Score: [{color}]{score}/100[/{color}]",
            f"[dim]{summary}[/dim]"
        )
    console.print(table)


def _print_overall(score: float):
    color = "green" if score >= 85 else "yellow" if score >= 65 else "red"
    band = "HEALTHY" if score >= 85 else "DEGRADED" if score >= 65 else "CRITICAL"
    console.print(f"{'─' * 52}")
    console.print(f"  Overall Agent Score: [{color}]{score:.0f}/100 — {band}[/{color}]")
    console.print(f"{'─' * 52}\n")


def _print_critical_issues(results):
    critical = [
        issue
        for result in results
        for issue in getattr(result, "issues", [])
        if issue.get("severity") == "high"
    ]
    if not critical:
        return
    console.print("[bold red]Critical Issues:[/bold red]")
    for issue in critical:
        console.print(f"  [red]✗[/red] {issue['description']}")
    console.print()
