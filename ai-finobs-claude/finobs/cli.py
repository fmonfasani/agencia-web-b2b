import typer
from finobs.commands import audit, trace, loops, cost, performance, debug

app = typer.Typer(
    name="finobs",
    help="finobs — LLM Agent Observability Suite",
    no_args_is_help=True,
    rich_markup_mode="rich",
)

app.add_typer(audit.app,       name="audit",       help="Full observability audit of an agent run")
app.add_typer(trace.app,       name="trace",        help="Reconstruct and visualize execution trace")
app.add_typer(loops.app,       name="loops",        help="Detect loops and redundant steps")
app.add_typer(cost.app,        name="cost",         help="Cost analysis by run or tenant")
app.add_typer(performance.app, name="performance",  help="Latency and throughput analysis")
app.add_typer(debug.app,       name="debug",        help="Deep debug of a failed run")

if __name__ == "__main__":
    app()
