#!/usr/bin/env python3
"""
db.py — Persistent SQLite database for lead generator.
Schema: leads, queries, sessions.
"""

import sqlite3
import json
import time
from datetime import datetime
from pathlib import Path
from contextlib import contextmanager

DB_PATH = Path.cwd() / "leads.db"


def init_db(path: Path = DB_PATH) -> None:
    """Create all tables if they don't exist."""
    with sqlite3.connect(path) as conn:
        conn.executescript("""
        PRAGMA journal_mode=WAL;
        PRAGMA foreign_keys=ON;

        CREATE TABLE IF NOT EXISTS sessions (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            started_at  TEXT    NOT NULL,
            finished_at TEXT,
            queries     TEXT,   -- JSON array of search strings
            discovered  INTEGER DEFAULT 0,
            prescreened INTEGER DEFAULT 0,
            analyzed    INTEGER DEFAULT 0,
            notes       TEXT
        );

        CREATE TABLE IF NOT EXISTS leads (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            url                 TEXT    NOT NULL UNIQUE,
            domain              TEXT    NOT NULL,
            session_id          INTEGER REFERENCES sessions(id),
            query_used          TEXT,

            -- Discovery metadata
            discovered_at       TEXT    NOT NULL,
            serp_title          TEXT,
            serp_snippet        TEXT,
            serp_position       INTEGER,
            search_engine       TEXT,

            -- Company signals (from pre-screen)
            page_title          TEXT,
            meta_description    TEXT,
            h1                  TEXT,
            language            TEXT,

            -- Pre-screen scores (fast, lightweight)
            prescreen_at        TEXT,
            prescreen_score     REAL,   -- 0-100: marketing quality (low = bad marketing)
            opportunity_score   REAL,   -- 0-100: lead opportunity (100 - prescreen_score)

            -- Full analysis scores
            analyzed_at         TEXT,
            marketing_score     REAL,   -- composite from analyze_page.py
            seo_score           REAL,
            cta_score           REAL,
            trust_score         REAL,
            tracking_score      REAL,

            -- Conversion signals
            cta_count           INTEGER DEFAULT 0,
            form_count          INTEGER DEFAULT 0,
            has_tracking        INTEGER DEFAULT 0,  -- 0/1
            social_link_count   INTEGER DEFAULT 0,
            word_count          INTEGER DEFAULT 0,

            -- Lead ranking
            lead_rank_score     REAL,   -- final score used for ranking (higher = better lead)
            lead_tier           TEXT,   -- A/B/C/D

            -- Pipeline status
            status              TEXT    DEFAULT 'discovered',
            -- discovered → prescreened → analyzed → exported

            -- Raw data blob
            raw_prescreen       TEXT,   -- JSON
            raw_analysis        TEXT,   -- JSON

            -- Contact hints
            contact_email       TEXT,
            linkedin_url        TEXT,

            -- Timestamps
            updated_at          TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_leads_domain      ON leads(domain);
        CREATE INDEX IF NOT EXISTS idx_leads_status      ON leads(status);
        CREATE INDEX IF NOT EXISTS idx_leads_opportunity ON leads(opportunity_score DESC);
        CREATE INDEX IF NOT EXISTS idx_leads_rank        ON leads(lead_rank_score DESC);
        CREATE INDEX IF NOT EXISTS idx_leads_session     ON leads(session_id);
        """)
    print(f"[db] Initialized at {path}")


@contextmanager
def get_conn(path: Path = DB_PATH):
    conn = sqlite3.connect(path, timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ── Sessions ──────────────────────────────────────────────────────────────────

def create_session(queries: list[str], notes: str = "") -> int:
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO sessions (started_at, queries, notes) VALUES (?,?,?)",
            (datetime.utcnow().isoformat(), json.dumps(queries), notes)
        )
        return cur.lastrowid


def finish_session(session_id: int) -> None:
    with get_conn() as conn:
        conn.execute(
            """UPDATE sessions SET finished_at=?,
               discovered=(SELECT COUNT(*) FROM leads WHERE session_id=?),
               prescreened=(SELECT COUNT(*) FROM leads WHERE session_id=? AND status!='discovered'),
               analyzed=(SELECT COUNT(*) FROM leads WHERE session_id=? AND status='analyzed')
            WHERE id=?""",
            (datetime.utcnow().isoformat(),
             session_id, session_id, session_id, session_id)
        )


# ── Leads ─────────────────────────────────────────────────────────────────────

def upsert_discovered(leads: list[dict], session_id: int) -> int:
    """Insert discovered URLs, skip duplicates. Returns count of NEW records."""
    now = datetime.utcnow().isoformat()
    inserted = 0
    with get_conn() as conn:
        for lead in leads:
            try:
                conn.execute("""
                    INSERT INTO leads
                        (url, domain, session_id, query_used, discovered_at,
                         serp_title, serp_snippet, serp_position, search_engine, status)
                    VALUES (?,?,?,?,?,?,?,?,?,'discovered')
                """, (
                    lead["url"], lead["domain"], session_id, lead.get("query"),
                    now, lead.get("title"), lead.get("snippet"),
                    lead.get("position"), lead.get("engine", "google")
                ))
                inserted += 1
            except sqlite3.IntegrityError:
                pass  # URL already exists — silently skip
    return inserted


def get_leads_by_status(status: str, limit: int = 500) -> list[sqlite3.Row]:
    with get_conn() as conn:
        return conn.execute(
            "SELECT * FROM leads WHERE status=? ORDER BY id LIMIT ?",
            (status, limit)
        ).fetchall()


def update_prescreen(url: str, data: dict) -> None:
    now = datetime.utcnow().isoformat()
    with get_conn() as conn:
        conn.execute("""
            UPDATE leads SET
                prescreen_at=?, prescreen_score=?, opportunity_score=?,
                page_title=?, meta_description=?, h1=?,
                raw_prescreen=?, status='prescreened', updated_at=?
            WHERE url=?
        """, (
            now,
            data.get("prescreen_score"),
            data.get("opportunity_score"),
            data.get("title"),
            data.get("meta_description"),
            data.get("h1"),
            json.dumps(data),
            now, url
        ))


def update_analysis(url: str, data: dict) -> None:
    now = datetime.utcnow().isoformat()
    analysis = data.get("analysis", {})
    scores = analysis.get("scores", {})

    # Final lead rank: opportunity weighted by depth of data
    op_score = data.get("opportunity_score", 50)
    mkt_score = data.get("overall_score", 50)
    lead_rank = round((op_score * 0.7) + ((100 - mkt_score * 10) * 0.3), 1)
    lead_rank = max(0, min(100, lead_rank))

    tier = "A" if lead_rank >= 75 else "B" if lead_rank >= 55 else "C" if lead_rank >= 35 else "D"

    with get_conn() as conn:
        conn.execute("""
            UPDATE leads SET
                analyzed_at=?, marketing_score=?, seo_score=?, cta_score=?,
                trust_score=?, tracking_score=?,
                cta_count=?, form_count=?, has_tracking=?, social_link_count=?,
                word_count=?, lead_rank_score=?, lead_tier=?,
                raw_analysis=?, status='analyzed', updated_at=?
            WHERE url=?
        """, (
            now,
            data.get("overall_score"),
            scores.get("seo"), scores.get("cta"),
            scores.get("trust"), scores.get("tracking"),
            analysis.get("conversion", {}).get("cta_count", 0),
            analysis.get("conversion", {}).get("form_count", 0),
            1 if analysis.get("tracking", {}).get("tools_count", 0) > 0 else 0,
            analysis.get("trust", {}).get("social_link_count", 0),
            analysis.get("content", {}).get("word_count", 0),
            lead_rank, tier,
            json.dumps(data),
            now, url
        ))


def mark_failed(url: str, reason: str) -> None:
    with get_conn() as conn:
        conn.execute(
            "UPDATE leads SET status='failed', updated_at=?, raw_prescreen=? WHERE url=?",
            (datetime.utcnow().isoformat(), json.dumps({"error": reason}), url)
        )


# ── Reporting ─────────────────────────────────────────────────────────────────

def get_ranking(limit: int = 100, tier: str = None) -> list[sqlite3.Row]:
    """Get leads sorted by lead_rank_score descending."""
    with get_conn() as conn:
        if tier:
            return conn.execute("""
                SELECT id, url, domain, lead_tier, lead_rank_score, opportunity_score,
                       marketing_score, page_title, h1, cta_count, has_tracking,
                       word_count, discovered_at, status
                FROM leads WHERE lead_tier=? AND status='analyzed'
                ORDER BY lead_rank_score DESC LIMIT ?
            """, (tier, limit)).fetchall()
        return conn.execute("""
            SELECT id, url, domain, lead_tier, lead_rank_score, opportunity_score,
                   marketing_score, page_title, h1, cta_count, has_tracking,
                   word_count, discovered_at, status
            FROM leads WHERE status='analyzed'
            ORDER BY lead_rank_score DESC LIMIT ?
        """, (limit,)).fetchall()


def get_stats() -> dict:
    with get_conn() as conn:
        total = conn.execute("SELECT COUNT(*) FROM leads").fetchone()[0]
        by_status = dict(conn.execute(
            "SELECT status, COUNT(*) FROM leads GROUP BY status"
        ).fetchall())
        by_tier = dict(conn.execute(
            "SELECT lead_tier, COUNT(*) FROM leads WHERE lead_tier IS NOT NULL GROUP BY lead_tier"
        ).fetchall())
        avg_rank = conn.execute(
            "SELECT AVG(lead_rank_score) FROM leads WHERE status='analyzed'"
        ).fetchone()[0]
        top5 = conn.execute("""
            SELECT domain, lead_rank_score, lead_tier FROM leads
            WHERE status='analyzed' ORDER BY lead_rank_score DESC LIMIT 5
        """).fetchall()
    return {
        "total": total,
        "by_status": by_status,
        "by_tier": by_tier,
        "avg_rank_score": round(avg_rank or 0, 1),
        "top5": [dict(r) for r in top5]
    }


def export_csv(path: str = "leads_export.csv", min_tier: str = "C") -> int:
    """Export analyzed leads to CSV ordered by rank."""
    import csv
    tier_order = {"A": 0, "B": 1, "C": 2, "D": 3}
    min_val = tier_order.get(min_tier, 2)

    with get_conn() as conn:
        rows = conn.execute("""
            SELECT url, domain, lead_tier, lead_rank_score, opportunity_score,
                   marketing_score, seo_score, cta_score, trust_score,
                   cta_count, form_count, has_tracking, social_link_count,
                   page_title, h1, meta_description, word_count,
                   query_used, search_engine, serp_position, discovered_at
            FROM leads WHERE status='analyzed'
            ORDER BY lead_rank_score DESC
        """).fetchall()

    filtered = [r for r in rows if tier_order.get(r["lead_tier"], 9) <= min_val]

    if not filtered:
        return 0

    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=filtered[0].keys())
        writer.writeheader()
        writer.writerows([dict(r) for r in filtered])

    return len(filtered)
