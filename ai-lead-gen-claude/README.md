# leadgen

Lead generation pipeline for marketing audit services.

Discovers hundreds of websites via Google/Bing scraping, scores them by **marketing opportunity** (the worse their marketing, the higher the score), and stores everything in a local SQLite database ranked and ready for outreach.

Designed as the upstream stage of [ai-marketing-claude](https://github.com/your-repo/ai-marketing-claude).

## Install

```bash
pip install leadgen
```

## Quick start

```bash
# Copy agents and skills to your project
leadgen init

# Run the full pipeline
leadgen run "agencias de marketing digital" --geo "Buenos Aires" --max 200

# See ranked results
leadgen rank --tier A

# Export to CSV
leadgen export --output leads.csv --min-tier B
```

## Pipeline

```
Google/Bing SERP scraping
        ↓
Pre-screen  (fast, 8s timeout — filters parked domains and good-marketing sites)
        ↓
Full analysis  (SEO, CTAs, tracking, trust signals)
        ↓
leads.db  (SQLite, persists across runs)
        ↓
CSV export  →  ai-marketing-claude
```

## Scoring

`opportunity_score = 100 - marketing_quality`

A site with no analytics, no CTAs, and no meta description scores **opportunity: 85** — that's a Tier A lead.

| Tier | Range  | Action             |
| ---- | ------ | ------------------ |
| A    | 75–100 | Contact within 48h |
| B    | 55–74  | Contact this week  |
| C    | 35–54  | Nurture list       |
| D    | 0–34   | Discard            |

## Commands

```bash
leadgen run "<topic>"       # Full pipeline
leadgen discover "<topic>"  # Discovery only (no analysis)
leadgen rank                # Show ranked leads
leadgen rank --tier A       # Filter by tier
leadgen stats               # DB statistics
leadgen export              # Export to CSV
leadgen init                # Copy agents/skills to current directory
```

## Requirements

- Python 3.11+
- `aiohttp`, `aiosqlite`
