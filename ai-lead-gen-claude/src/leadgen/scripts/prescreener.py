#!/usr/bin/env python3
"""
prescreener.py — Fast async pre-qualification of discovered URLs.

Logic:
  - Fetches homepage with short timeout (5s)
  - Extracts minimal signals in < 100ms parse
  - Computes marketing_quality_score (0-100): how good is their marketing?
  - opportunity_score = 100 - quality: LOW quality = HIGH opportunity for us
  - Filters out: parked domains, error pages, non-business sites
  - Passes qualified leads forward for full analysis
"""

import asyncio
import aiohttp
import random
import re
from html.parser import HTMLParser
from urllib.parse import urlparse
from typing import Optional


# ── Fast HTML Parser (minimal — just what we need) ──────────────────────────

class FastPageParser(HTMLParser):
    """Extract only critical marketing signals. Stops early if possible."""

    MAX_BYTES = 60_000  # Only parse first ~60KB — enough for <head> + above fold

    def __init__(self):
        super().__init__()
        self.title = ""
        self.meta_description = ""
        self.h1 = ""
        self.og_title = ""
        self.canonical = ""
        self.has_viewport = False
        self.cta_count = 0
        self.has_tracking = False
        self.has_analytics = False
        self.link_count = 0
        self.image_count = 0
        self.images_without_alt = 0
        self.form_count = 0
        self.social_links = 0
        self.schema_present = False
        self.language = ""

        self._in_title = False
        self._in_h1 = False
        self._title_done = False
        self._h1_done = False
        self._in_script = False
        self._script_type = ""
        self._script_src = ""
        self._current_text = ""

        self._TRACKING_PATTERNS = re.compile(
            r"gtag|googletagmanager|google-analytics|fbevents|hotjar|"
            r"mixpanel|segment|amplitude|hubspot|intercom|clarity|dataLayer",
            re.IGNORECASE
        )
        self._CTA_WORDS = re.compile(
            r"\b(sign up|get started|try free|start free|buy now|subscribe|"
            r"register|download|book|schedule|request demo|contact us|"
            r"learn more|see pricing|start trial|create account|free trial|"
            r"contratar|comenzar|probar|solicitar|registrarse|ver precios)\b",
            re.IGNORECASE
        )
        self._SOCIAL_DOMAINS = re.compile(
            r"(twitter|x\.com|facebook|linkedin|instagram|youtube|tiktok)"
        )

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)

        if tag == "html":
            self.language = attrs_dict.get("lang", "")

        elif tag == "title" and not self._title_done:
            self._in_title = True
            self._current_text = ""

        elif tag == "meta":
            name = attrs_dict.get("name", "").lower()
            prop = attrs_dict.get("property", "").lower()
            content = attrs_dict.get("content", "")
            if name == "description" and not self.meta_description:
                self.meta_description = content[:300]
            elif name == "viewport":
                self.has_viewport = True
            elif prop == "og:title":
                self.og_title = content
            # Detect generator (Wix, WordPress, etc.)
            elif name == "generator":
                pass  # could store for tech detection

        elif tag == "link":
            rel = attrs_dict.get("rel", "")
            if "canonical" in rel:
                self.canonical = attrs_dict.get("href", "")

        elif tag == "h1" and not self._h1_done:
            self._in_h1 = True
            self._current_text = ""

        elif tag == "a":
            self.link_count += 1
            href = attrs_dict.get("href", "")
            text = ""  # text collected in handle_data
            if href and self._SOCIAL_DOMAINS.search(href):
                self.social_links += 1
            # CTA detection from href patterns
            if any(kw in href.lower() for kw in ["signup", "register", "pricing", "demo", "trial"]):
                self.cta_count += 1

        elif tag == "img":
            self.image_count += 1
            alt = attrs_dict.get("alt", None)
            if alt is None or alt.strip() == "":
                self.images_without_alt += 1

        elif tag == "form":
            self.form_count += 1

        elif tag == "button":
            self._in_button = True
            self._current_text = ""

        elif tag == "script":
            self._in_script = True
            self._script_type = attrs_dict.get("type", "")
            src = attrs_dict.get("src", "")
            if src and self._TRACKING_PATTERNS.search(src):
                self.has_tracking = True
                self.has_analytics = True
            if "application/ld+json" in self._script_type:
                self.schema_present = True
            self._current_text = ""

    def handle_endtag(self, tag):
        if tag == "title" and self._in_title:
            self._in_title = False
            self._title_done = True
            self.title = self._current_text.strip()[:200]

        elif tag == "h1" and self._in_h1:
            self._in_h1 = False
            self._h1_done = True
            self.h1 = self._current_text.strip()[:200]

        elif tag == "script" and self._in_script:
            self._in_script = False
            content = self._current_text
            if content and self._TRACKING_PATTERNS.search(content):
                self.has_tracking = True
                self.has_analytics = True

    def handle_data(self, data):
        if self._in_title or self._in_h1:
            self._current_text += data

        if self._in_script:
            if len(self._current_text) < 5000:  # Don't accumulate huge scripts
                self._current_text += data

        # CTA detection in visible text
        if not self._in_script and self._CTA_WORDS.search(data):
            self.cta_count = min(self.cta_count + 1, 20)

    def get_signals(self) -> dict:
        return {
            "title": self.title or self.og_title,
            "meta_description": self.meta_description,
            "h1": self.h1,
            "language": self.language,
            "has_viewport": self.has_viewport,
            "has_tracking": self.has_tracking,
            "has_analytics": self.has_analytics,
            "schema_present": self.schema_present,
            "cta_count": self.cta_count,
            "form_count": self.form_count,
            "social_links": self.social_links,
            "link_count": self.link_count,
            "image_count": self.image_count,
            "images_without_alt": self.images_without_alt,
        }


# ── Scoring ───────────────────────────────────────────────────────────────────

def compute_scores(signals: dict) -> tuple[float, float]:
    """
    Returns (marketing_quality_score, opportunity_score), both 0–100.

    marketing_quality = how good their marketing already is.
    opportunity = how bad their marketing is = how much they need help.

    High opportunity → high value lead for marketing services.
    """
    score = 0.0
    max_score = 100.0

    title = signals.get("title", "")
    meta = signals.get("meta_description", "")
    h1 = signals.get("h1", "")

    # Title quality (20 pts)
    if title:
        score += 10
        if 30 <= len(title) <= 65:
            score += 10
        elif len(title) > 10:
            score += 5

    # Meta description (20 pts)
    if meta:
        score += 10
        if 100 <= len(meta) <= 165:
            score += 10
        elif len(meta) > 30:
            score += 5

    # H1 present (15 pts)
    if h1:
        score += 15

    # Tracking / analytics (20 pts)
    if signals.get("has_tracking") or signals.get("has_analytics"):
        score += 20

    # CTAs (15 pts)
    ctas = signals.get("cta_count", 0)
    if ctas >= 3:
        score += 15
    elif ctas >= 1:
        score += 8

    # Social presence (10 pts)
    socials = signals.get("social_links", 0)
    if socials >= 3:
        score += 10
    elif socials >= 1:
        score += 5

    marketing_quality = round(min(score, max_score), 1)
    opportunity = round(100 - marketing_quality, 1)
    return marketing_quality, opportunity


def is_parked_or_dead(html: str, signals: dict) -> bool:
    """Detect parked domains, error pages, splash-only pages."""
    if not html or len(html) < 500:
        return True

    title_lower = (signals.get("title") or "").lower()
    parked_signals = [
        "parked domain", "domain for sale", "buy this domain",
        "this domain is for sale", "coming soon", "under construction",
        "404", "page not found", "error 403", "403 forbidden",
        "account suspended", "website disabled", "godaddy"
    ]
    for sig in parked_signals:
        if sig in title_lower or sig in html[:2000].lower():
            return True

    # Very low word count = probably not a real business page
    if signals.get("link_count", 0) < 3 and not signals.get("title"):
        return True

    return False


# ── Async fetcher ─────────────────────────────────────────────────────────────

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
]


async def _fetch(session: aiohttp.ClientSession, url: str) -> Optional[str]:
    headers = {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
    }
    try:
        async with session.get(url, headers=headers, allow_redirects=True,
                               timeout=aiohttp.ClientTimeout(total=8)) as resp:
            if resp.status not in (200, 301, 302):
                return None
            content_type = resp.headers.get("Content-Type", "")
            if "text/html" not in content_type:
                return None
            # Read only first 80KB to keep it fast
            raw = await resp.content.read(80_000)
            return raw.decode("utf-8", errors="replace")
    except Exception:
        return None


async def prescreen_one(session: aiohttp.ClientSession,
                         lead: dict,
                         min_opportunity: float = 30.0) -> Optional[dict]:
    """
    Pre-screen a single lead.
    Returns enriched dict with scores, or None if disqualified.
    """
    url = lead["url"]
    html = await _fetch(session, url)

    if not html:
        return None  # Unreachable — skip silently

    parser = FastPageParser()
    try:
        # Feed only first 60KB for speed
        parser.feed(html[:FastPageParser.MAX_BYTES])
    except Exception:
        pass

    signals = parser.get_signals()

    if is_parked_or_dead(html, signals):
        return None

    quality, opportunity = compute_scores(signals)

    # Filter: must meet minimum opportunity threshold
    if opportunity < min_opportunity:
        return None  # Already has decent marketing — skip

    return {
        **lead,
        "title": signals["title"],
        "meta_description": signals["meta_description"],
        "h1": signals["h1"],
        "language": signals["language"],
        "prescreen_score": quality,
        "opportunity_score": opportunity,
        "signals": signals,
    }


async def prescreen_batch(
    leads: list[dict],
    concurrency: int = 15,
    min_opportunity: float = 30.0,
    on_progress=None,  # callback(done, total, passed)
) -> list[dict]:
    """
    Pre-screen a batch of leads concurrently.
    Returns only leads that pass the opportunity threshold.
    """
    semaphore = asyncio.Semaphore(concurrency)
    connector = aiohttp.TCPConnector(ssl=False, limit=concurrency)

    results = []
    done = 0

    async def _bounded(lead):
        nonlocal done
        async with semaphore:
            result = await prescreen_one(session, lead, min_opportunity)
            done += 1
            if on_progress:
                on_progress(done, len(leads), len(results))
            return result

    async with aiohttp.ClientSession(connector=connector) as session:
        tasks = [_bounded(lead) for lead in leads]
        for coro in asyncio.as_completed(tasks):
            result = await coro
            if result is not None:
                results.append(result)

    # Sort by opportunity score descending before returning
    results.sort(key=lambda x: x["opportunity_score"], reverse=True)
    return results
