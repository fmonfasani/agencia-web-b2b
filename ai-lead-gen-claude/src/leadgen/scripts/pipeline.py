#!/usr/bin/env python3
"""
pipeline.py — Lead generation pipeline orchestrator.

Flow:
  Discovery (Google/Bing) → DB → Pre-screen → DB → Full Analysis → DB → Ranking

Usage:
  python pipeline.py run "agencias de marketing digital" --geo "Buenos Aires" --max 200
  python pipeline.py rank --tier A
  python pipeline.py export --output leads.csv
  python pipeline.py stats
"""

import asyncio
import shutil
from pathlib import Path
import argparse
import sys
import json
import time
from datetime import datetime

from leadgen.scripts import db
from leadgen.scripts import discovery
from leadgen.scripts import prescreener
from leadgen.scripts import analyzer


# ── Helpers ───────────────────────────────────────────────────────────────────

def print_banner():
    print("""
╔══════════════════════════════════════════════════════╗
║          Lead Generator — Marketing Audit Pipeline   ║
║  Discovery → Pre-screen → Analysis → Ranked DB       ║
╚══════════════════════════════════════════════════════╝
""")


def print_progress(label: str, done: int, total: int, extra: str = ""):
    pct = int(done / total * 100) if total else 0
    bar = "█" * (pct // 5) + "░" * (20 - pct // 5)
    print(f"\r  {label} [{bar}] {done}/{total} ({pct}%) {extra}", end="", flush=True)


def fmt_score(score) -> str:
    if score is None:
        return "  —  "
    s = float(score)
    if s >= 75:
        return f"\033[92m{s:5.1f}\033[0m"  # green
    elif s >= 50:
        return f"\033[93m{s:5.1f}\033[0m"  # yellow
    else:
        return f"\033[91m{s:5.1f}\033[0m"  # red


# ── Pipeline stages ───────────────────────────────────────────────────────────

async def stage_discovery(queries: list[str], session_id: int,
                           results_per_query: int, max_total: int) -> int:
    print(f"\n[1/3] DISCOVERY — {len(queries)} queries, up to {max_total} URLs")
    print("  Queries:")
    for q in queries:
        print(f"    • {q}")
    print()

    found_total = 0

    def on_progress(query, count):
        nonlocal found_total
        found_total += count
        print(f"  ✓ '{query[:50]}' → {count} results")

    leads = await discovery.discover(
        queries=queries,
        results_per_query=results_per_query,
        max_total=max_total,
        delay_range=(2.5, 5.0),
        on_progress=on_progress,
    )

    inserted = db.upsert_discovered(leads, session_id)
    print(f"\n  → {len(leads)} URLs found, {inserted} new (skipped {len(leads) - inserted} duplicates)")
    return inserted


async def stage_prescreen(session_id: int, min_opportunity: float,
                           concurrency: int) -> int:
    pending = db.get_leads_by_status("discovered", limit=2000)
    if not pending:
        print("\n[2/3] PRE-SCREEN — nothing to process")
        return 0

    print(f"\n[2/3] PRE-SCREEN — {len(pending)} URLs (concurrency={concurrency})")
    print(f"  Min opportunity threshold: {min_opportunity}/100")

    passed = [0]
    start = time.time()

    def on_progress(done, total, n_passed):
        passed[0] = n_passed
        elapsed = time.time() - start
        rate = done / elapsed if elapsed > 0 else 0
        eta = int((total - done) / rate) if rate > 0 else 0
        print_progress("Pre-screen", done, total,
                        f"passed={n_passed} rate={rate:.1f}/s ETA={eta}s")

    leads_list = [dict(r) for r in pending]
    qualified = await prescreener.prescreen_batch(
        leads_list,
        concurrency=concurrency,
        min_opportunity=min_opportunity,
        on_progress=on_progress,
    )
    print()

    # Mark all as prescreened in DB (passed ones with scores, failed ones as skipped)
    screened_urls = {q["url"] for q in qualified}
    for lead in leads_list:
        if lead["url"] in screened_urls:
            q = next(q for q in qualified if q["url"] == lead["url"])
            db.update_prescreen(lead["url"], q)
        else:
            db.mark_failed(lead["url"], "disqualified_prescreen")

    print(f"  → {len(qualified)}/{len(pending)} passed ({min_opportunity}% threshold)")
    return len(qualified)


async def stage_analysis(session_id: int, concurrency: int) -> int:
    pending = db.get_leads_by_status("prescreened", limit=1000)
    if not pending:
        print("\n[3/3] ANALYSIS — nothing to process")
        return 0

    print(f"\n[3/3] FULL ANALYSIS — {len(pending)} URLs (concurrency={concurrency})")
    start = time.time()

    def on_progress(done, total):
        elapsed = time.time() - start
        rate = done / elapsed if elapsed > 0 else 0
        eta = int((total - done) / rate) if rate > 0 else 0
        print_progress("Analysis", done, total, f"rate={rate:.1f}/s ETA={eta}s")

    leads_list = [dict(r) for r in pending]
    results = await analyzer.analyze_batch(
        leads_list,
        concurrency=concurrency,
        on_progress=on_progress,
    )
    print()

    success = 0
    for r in results:
        if r.get("status") == "success":
            db.update_analysis(r["url"], r)
            success += 1
        else:
            db.mark_failed(r["url"], r.get("message", "analysis_failed"))

    print(f"  → {success}/{len(pending)} analyzed successfully")
    return success


# ── CLI commands ──────────────────────────────────────────────────────────────

async def cmd_run(args):
    print_banner()
    db.init_db()

    # Build queries
    queries = discovery.build_queries(
        topic=args.topic,
        geo=args.geo,
        modifiers=args.modifiers.split(",") if args.modifiers else None,
    )
    # Limit to reasonable number to avoid too many requests
    queries = queries[:args.max_queries]

    session_id = db.create_session(queries, notes=args.topic)
    print(f"Session #{session_id} started — {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}")

    t0 = time.time()

    # Stage 1: Discovery
    discovered = await stage_discovery(
        queries, session_id,
        results_per_query=args.per_query,
        max_total=args.max,
    )

    # Stage 2: Pre-screen
    qualified = await stage_prescreen(
        session_id,
        min_opportunity=args.min_opportunity,
        concurrency=args.concurrency,
    )

    # Stage 3: Full analysis (only if pre-screen found something)
    analyzed = 0
    if qualified > 0:
        analyzed = await stage_analysis(session_id, concurrency=args.concurrency // 2)

    db.finish_session(session_id)
    elapsed = int(time.time() - t0)

    print(f"""
┌─────────────────────────────┐
│  Pipeline Complete           │
│  Time: {elapsed}s               
│  Discovered:  {discovered}          
│  Qualified:   {qualified}          
│  Analyzed:    {analyzed}          
└─────────────────────────────┘
""")

    # Auto-show top results
    await cmd_rank(argparse.Namespace(limit=10, tier=None, json=False))


async def cmd_rank(args):
    db.init_db()
    rows = db.get_ranking(limit=args.limit, tier=getattr(args, "tier", None))

    if not rows:
        print("No analyzed leads yet. Run: python pipeline.py run <topic>")
        return

    if getattr(args, "json", False):
        print(json.dumps([dict(r) for r in rows], indent=2, default=str))
        return

    print(f"\n{'#':>3}  {'Tier':4} {'Rank':>6} {'Opp':>5} {'Mkt':>5}  {'Domain':<35} {'Title'}")
    print("─" * 100)
    for i, r in enumerate(rows, 1):
        tier = r["lead_tier"] or "?"
        tier_colored = {
            "A": "\033[92mA\033[0m",
            "B": "\033[93mB\033[0m",
            "C": "\033[33mC\033[0m",
            "D": "\033[91mD\033[0m",
        }.get(tier, tier)
        domain = (r["domain"] or "")[:34]
        title = (r["page_title"] or r.get("h1") or "")[:45]
        rank = fmt_score(r["lead_rank_score"])
        opp = fmt_score(r["opportunity_score"])
        mkt_raw = r["marketing_score"]
        mkt = f"{float(mkt_raw)*10:5.1f}" if mkt_raw else "  —  "
        print(f"{i:>3}.  {tier_colored}   {rank} {opp} {mkt}  {domain:<35} {title}")

    print(f"\n  {len(rows)} leads shown. Rank/Opp are 0-100 (higher = better lead).")
    print("  Mkt = marketing quality (lower = worse marketing = more opportunity).")


async def cmd_stats(args):
    db.init_db()
    stats = db.get_stats()

    print(f"""
╔══════════════════════════════════╗
║  Database Stats                  ║
╚══════════════════════════════════╝

  Total leads:     {stats['total']}
  Avg rank score:  {stats['avg_rank_score']}

  By status:
{chr(10).join(f"    {k:15} {v}" for k, v in stats['by_status'].items())}

  By tier:
{chr(10).join(f"    Tier {k}: {v}" for k, v in sorted(stats['by_tier'].items()))}

  Top 5 leads:
""")
    for i, lead in enumerate(stats["top5"], 1):
        print(f"  {i}. [{lead.get('lead_tier','?')}] {lead['domain']:35} score={lead['lead_rank_score']}")


async def cmd_export(args):
    db.init_db()
    output = args.output or "leads_export.csv"
    tier = getattr(args, "min_tier", "C")
    count = db.export_csv(output, min_tier=tier)
    print(f"Exported {count} leads (tier ≥ {tier}) to {output}")


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Lead Generator — Marketing Audit Pipeline",
        formatter_class=argparse.RawTextHelpFormatter,
    )
    sub = parser.add_subparsers(dest="command")

    # run
    p_run = sub.add_parser("run", help="Run full pipeline: discover → prescreen → analyze")
    p_run.add_argument("topic", help='Search topic, e.g. "agencias marketing digital"')
    p_run.add_argument("--geo", default="", help="Geographic modifier, e.g. 'Buenos Aires'")
    p_run.add_argument("--modifiers", default="", help="Comma-separated extra query modifiers")
    p_run.add_argument("--max", type=int, default=200, help="Max URLs to discover (default: 200)")
    p_run.add_argument("--per-query", type=int, default=30, help="Results per query (default: 30)")
    p_run.add_argument("--max-queries", type=int, default=8, help="Max query variants (default: 8)")
    p_run.add_argument("--min-opportunity", type=float, default=35.0,
                        help="Min opportunity score to pass pre-screen (default: 35)")
    p_run.add_argument("--concurrency", type=int, default=15,
                        help="Async concurrency for fetching (default: 15)")

    # rank
    p_rank = sub.add_parser("rank", help="Show lead ranking from DB")
    p_rank.add_argument("--limit", type=int, default=20)
    p_rank.add_argument("--tier", choices=["A", "B", "C", "D"], help="Filter by tier")
    p_rank.add_argument("--json", action="store_true", help="Output as JSON")

    # stats
    sub.add_parser("stats", help="Show database statistics")

    # export
    p_exp = sub.add_parser("export", help="Export leads to CSV")
    p_exp.add_argument("--output", default="leads_export.csv")
    p_exp.add_argument("--min-tier", choices=["A", "B", "C", "D"], default="C")

    # discover-only (useful for testing)
    p_disc = sub.add_parser("discover", help="Run discovery only (no analysis)")
    p_disc.add_argument("topic")
    p_disc.add_argument("--geo", default="")
    p_disc.add_argument("--max", type=int, default=100)

    # init — copy agents/skills to cwd
    sub.add_parser("init", help="Copy agents/ and skills/ to current directory")

    args = parser.parse_args()

    if args.command == "run":
        asyncio.run(cmd_run(args))
    elif args.command == "rank":
        asyncio.run(cmd_rank(args))
    elif args.command == "stats":
        asyncio.run(cmd_stats(args))
    elif args.command == "export":
        asyncio.run(cmd_export(args))
    elif args.command == "discover":
        async def _disc():
            db.init_db()
            queries = discovery.build_queries(args.topic, geo=args.geo)
            sid = db.create_session(queries, notes=f"discover-only: {args.topic}")
            leads = await discovery.discover(queries, max_total=args.max)
            n = db.upsert_discovered(leads, sid)
            print(f"\nDiscovered {n} new URLs. Run 'python pipeline.py stats' to see DB.")
        asyncio.run(_disc())
    elif args.command == "init":
        cmd_init()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()


def cmd_init():
    """Copy agents/ and skills/ to the current working directory."""
    import importlib.resources as pkg_resources

    data_src = Path(pkg_resources.files("leadgen")) / "data"
    cwd = Path.cwd()

    if not data_src.exists():
        print("Error: package data not found. Reinstall with: pip install leadgen")
        sys.exit(1)

    for subdir in ("agents", "skills"):
        src = data_src / subdir
        dst = cwd / subdir
        if dst.exists():
            print(f"  skip  {subdir}/ (already exists)")
        else:
            shutil.copytree(src, dst)
            print(f"  created  {dst}")

    print("\nDone. agents/ and skills/ are ready in the current directory.")
