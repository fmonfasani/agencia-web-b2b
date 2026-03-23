#!/usr/bin/env python3
"""
discovery.py — Async Google/Bing SERP scraper.

Strategy:
  1. Build search queries from a topic + optional modifiers
  2. Scrape Google (primary) with rotating UAs, random delays
  3. Fall back to Bing on block detection
  4. Parse result URLs — filter noise (ads, wiki, big brands)
  5. Return list of {url, domain, title, snippet, position, engine, query}
"""

import asyncio
import aiohttp
import random
import re
import time
import json
from html.parser import HTMLParser
from urllib.parse import urlparse, urlencode, unquote
from typing import AsyncIterator


# ── User-Agent pool ────────────────────────────────────────────────────────────

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0",
]

# ── Domains to always skip in SERP results ─────────────────────────────────────

SKIP_DOMAINS = {
    # Search / social giants
    "google.com", "google.com.ar", "youtube.com", "facebook.com", "instagram.com",
    "twitter.com", "x.com", "linkedin.com", "tiktok.com", "pinterest.com",
    # Directories and aggregators (not target companies)
    "yelp.com", "trustpilot.com", "g2.com", "capterra.com", "clutch.co",
    "bbb.org", "yellowpages.com", "manta.com", "crunchbase.com", "angellist.com",
    # News & reference
    "wikipedia.org", "wikihow.com", "quora.com", "reddit.com", "medium.com",
    "forbes.com", "techcrunch.com", "bloomberg.com", "reuters.com", "bbc.com",
    "cnn.com", "businessinsider.com", "entrepreneur.com",
    # Dev/tech infra
    "github.com", "stackoverflow.com", "npmjs.com", "docs.microsoft.com",
    "developer.apple.com", "aws.amazon.com",
    # E-commerce giants
    "amazon.com", "ebay.com", "shopify.com", "etsy.com", "mercadolibre.com",
    # Misc
    "maps.google.com", "play.google.com", "support.google.com",
}


# ── SERP HTML Parsers ──────────────────────────────────────────────────────────

class GoogleSERPParser(HTMLParser):
    """Extract organic results from Google SERP HTML."""

    def __init__(self):
        super().__init__()
        self.results: list[dict] = []
        self._in_result = False
        self._in_title = False
        self._in_snippet = False
        self._current_url = ""
        self._current_title = ""
        self._current_snippet = ""
        self._depth = 0
        self._result_depth = 0
        self._pending_urls: list[str] = []

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        self._depth += 1

        # Google result blocks: <div class="g"> or class containing "g "
        cls = attrs_dict.get("class", "")
        if tag == "div" and ("tF2Cxc" in cls or (" g " in f" {cls} " and "kno-result" not in cls)):
            self._in_result = True
            self._result_depth = self._depth
            self._current_title = ""
            self._current_snippet = ""
            self._current_url = ""

        # Extract href from <a> inside result
        if tag == "a" and attrs_dict.get("href", "").startswith("http"):
            href = attrs_dict["href"]
            if "/url?q=" in href:
                # Unwrap Google redirect
                m = re.search(r"/url\?q=([^&]+)", href)
                if m:
                    href = unquote(m.group(1))
            if self._in_result and not self._current_url:
                self._current_url = href

        # Title: <h3> inside result
        if tag == "h3" and self._in_result:
            self._in_title = True
            self._current_text_buf = ""

        # Snippet: <div> with class "VwiC3b" or "IsZvec"
        if tag in ("div", "span") and self._in_result and (
            "VwiC3b" in cls or "IsZvec" in cls or "st" in cls.split()
        ):
            self._in_snippet = True

    def handle_endtag(self, tag):
        if tag == "h3" and self._in_title:
            self._in_title = False
            self._current_title = getattr(self, "_current_text_buf", "")

        if self._in_result and tag == "div" and self._depth <= self._result_depth:
            if self._current_url:
                self.results.append({
                    "url": self._current_url,
                    "title": self._current_title.strip(),
                    "snippet": self._current_snippet.strip()
                })
            self._in_result = False
            self._in_snippet = False

        self._depth -= 1

    def handle_data(self, data):
        if self._in_title:
            self._current_text_buf = getattr(self, "_current_text_buf", "") + data
        elif self._in_snippet and len(self._current_snippet) < 300:
            self._current_snippet += data


class BingSERPParser(HTMLParser):
    """Extract organic results from Bing SERP HTML."""

    def __init__(self):
        super().__init__()
        self.results: list[dict] = []
        self._in_result = False
        self._in_title = False
        self._current_url = ""
        self._current_title = ""
        self._current_snippet = ""
        self._depth = 0
        self._result_depth = 0

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        self._depth += 1
        cls = attrs_dict.get("class", "")

        if tag == "li" and "b_algo" in cls:
            self._in_result = True
            self._result_depth = self._depth
            self._current_url = ""
            self._current_title = ""
            self._current_snippet = ""

        if tag == "a" and self._in_result and not self._current_url:
            href = attrs_dict.get("href", "")
            if href.startswith("http") and "bing.com" not in href:
                self._current_url = href
                self._in_title = True
                self._title_buf = ""

        if tag in ("p", "div") and self._in_result and "b_caption" in cls:
            self._in_caption = True

    def handle_endtag(self, tag):
        if tag == "a" and self._in_title:
            self._in_title = False
            self._current_title = getattr(self, "_title_buf", "")

        if tag == "li" and self._in_result and self._depth <= self._result_depth:
            if self._current_url:
                self.results.append({
                    "url": self._current_url,
                    "title": self._current_title.strip(),
                    "snippet": self._current_snippet.strip()
                })
            self._in_result = False

        self._depth -= 1

    def handle_data(self, data):
        if self._in_title:
            self._title_buf = getattr(self, "_title_buf", "") + data
        elif self._in_result and len(self._current_snippet) < 300:
            self._current_snippet += data


# ── Core scraper ───────────────────────────────────────────────────────────────

def _domain(url: str) -> str:
    try:
        return urlparse(url).netloc.lower().replace("www.", "")
    except Exception:
        return ""


def _is_valid_url(url: str) -> bool:
    """Filter out noise and skip-listed domains."""
    if not url or not url.startswith("http"):
        return False
    dom = _domain(url)
    if not dom:
        return False
    # Skip if domain or any parent domain is blacklisted
    parts = dom.split(".")
    for i in range(len(parts) - 1):
        candidate = ".".join(parts[i:])
        if candidate in SKIP_DOMAINS:
            return False
    # Skip Google internal pages, ad URLs, etc.
    skip_patterns = [
        "/search?", "webcache.googleusercontent", "translate.google",
        "accounts.google", "policies.google", "support.google"
    ]
    for pat in skip_patterns:
        if pat in url:
            return False
    return True


def _headers(referer: str = "") -> dict:
    return {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        **({"Referer": referer} if referer else {}),
    }


async def _scrape_google(session: aiohttp.ClientSession, query: str,
                          start: int = 0, num: int = 10) -> tuple[list[dict], bool]:
    """
    Returns (results, blocked).
    blocked=True when Google returns a CAPTCHA/bot page.
    """
    params = {"q": query, "num": num, "start": start, "hl": "en", "gl": "us"}
    url = "https://www.google.com/search?" + urlencode(params)

    try:
        async with session.get(url, headers=_headers("https://www.google.com"),
                               timeout=aiohttp.ClientTimeout(total=15)) as resp:
            if resp.status != 200:
                return [], resp.status == 429

            html = await resp.text(errors="replace")

            # Detect CAPTCHA / bot challenge
            if "detected unusual traffic" in html or "CAPTCHA" in html or "/sorry/" in html:
                return [], True

            parser = GoogleSERPParser()
            parser.feed(html)

            # Fallback: regex extraction if parser found nothing
            results = parser.results
            if not results:
                results = _regex_extract_google(html)

            return results, False

    except asyncio.TimeoutError:
        return [], False
    except Exception:
        return [], False


def _regex_extract_google(html: str) -> list[dict]:
    """Fallback regex extractor for Google SERP."""
    results = []
    # Match href="/url?q=<url>&" patterns
    for m in re.finditer(r'href="/url\?q=([^&"]+)[^"]*"[^>]*>([^<]*)', html):
        url = unquote(m.group(1))
        title = m.group(2).strip()
        if _is_valid_url(url):
            results.append({"url": url, "title": title, "snippet": ""})
    # Also match direct href="https://..." in <a> within result divs
    for m in re.finditer(r'<a href="(https://[^"]+)"[^>]*class="[^"]*r[^"]*"', html):
        url = m.group(1)
        if _is_valid_url(url):
            results.append({"url": url, "title": "", "snippet": ""})
    return results[:20]


async def _scrape_bing(session: aiohttp.ClientSession, query: str,
                        first: int = 1, count: int = 10) -> list[dict]:
    """Scrape Bing SERP — more lenient than Google on scraping."""
    params = {"q": query, "count": count, "first": first, "setlang": "en"}
    url = "https://www.bing.com/search?" + urlencode(params)

    try:
        async with session.get(url, headers=_headers("https://www.bing.com"),
                               timeout=aiohttp.ClientTimeout(total=15)) as resp:
            if resp.status != 200:
                return []
            html = await resp.text(errors="replace")
            parser = BingSERPParser()
            parser.feed(html)
            return parser.results
    except Exception:
        return []


# ── Public API ─────────────────────────────────────────────────────────────────

def build_queries(topic: str, modifiers: list[str] = None,
                  geo: str = None, page_type: str = "company") -> list[str]:
    """
    Generate search query variants from a base topic.

    Example:
        topic = "agencias de marketing digital"
        → ["agencias de marketing digital Buenos Aires",
           "agencia marketing digital precio",
           "empresa marketing digital sitio web", ...]
    """
    base_queries = [topic]

    # Add geo modifier
    if geo:
        base_queries.append(f"{topic} {geo}")

    # Intent-based variants to find companies with poor marketing
    intent_variants = [
        f"{topic} precio",
        f"{topic} servicios",
        f"{topic} empresa",
        f"{topic} contratar",
        f"mejor {topic}",
        f"{topic} pequeña empresa",
        f"{topic} pyme",
    ]

    # Tech-stack hints to find specific types
    tech_variants = [
        f'"{topic}" site:wix.com',    # Wix sites = usually small biz
        f'"{topic}" inurl:wixsite',
        f"{topic} -facebook.com -instagram.com",
    ]

    all_queries = base_queries + intent_variants
    if modifiers:
        for mod in modifiers:
            all_queries.append(f"{topic} {mod}")

    # Deduplicate while preserving order
    seen = set()
    result = []
    for q in all_queries:
        if q not in seen:
            seen.add(q)
            result.append(q)

    return result


async def discover(
    queries: list[str],
    results_per_query: int = 30,
    max_total: int = 500,
    delay_range: tuple = (2.0, 5.0),
    use_bing_fallback: bool = True,
    on_progress=None,  # callback(query, found_count)
) -> list[dict]:
    """
    Main discovery function. Scrapes Google (+ Bing fallback) for all queries.

    Returns list of unique lead dicts:
    {url, domain, title, snippet, position, engine, query}
    """
    seen_domains: set[str] = set()
    all_leads: list[dict] = []

    connector = aiohttp.TCPConnector(ssl=False, limit=3)  # Low concurrency — be polite
    timeout = aiohttp.ClientTimeout(total=20)

    async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
        for query in queries:
            if len(all_leads) >= max_total:
                break

            query_leads = []
            google_blocked = False
            pages = max(1, results_per_query // 10)

            # Google: paginate through results
            for page in range(pages):
                if len(all_leads) + len(query_leads) >= max_total:
                    break

                start = page * 10
                results, blocked = await _scrape_google(session, query, start=start, num=10)
                google_blocked = blocked

                if blocked:
                    print(f"  [discovery] Google blocked on '{query}' — switching to Bing")
                    break

                for i, r in enumerate(results):
                    url = r["url"]
                    if not _is_valid_url(url):
                        continue
                    dom = _domain(url)
                    if dom in seen_domains:
                        continue
                    seen_domains.add(dom)
                    query_leads.append({
                        "url": url.rstrip("/"),
                        "domain": dom,
                        "title": r.get("title", ""),
                        "snippet": r.get("snippet", ""),
                        "position": start + i + 1,
                        "engine": "google",
                        "query": query,
                    })

                # Random delay between pages
                await asyncio.sleep(random.uniform(*delay_range))

            # Bing fallback if Google blocked or found too few
            if use_bing_fallback and (google_blocked or len(query_leads) < 5):
                bing_results = await _scrape_bing(session, query, count=min(50, results_per_query))
                for i, r in enumerate(bing_results):
                    url = r["url"]
                    if not _is_valid_url(url):
                        continue
                    dom = _domain(url)
                    if dom in seen_domains:
                        continue
                    seen_domains.add(dom)
                    query_leads.append({
                        "url": url.rstrip("/"),
                        "domain": dom,
                        "title": r.get("title", ""),
                        "snippet": r.get("snippet", ""),
                        "position": i + 1,
                        "engine": "bing",
                        "query": query,
                    })
                await asyncio.sleep(random.uniform(1.5, 3.0))

            all_leads.extend(query_leads)

            if on_progress:
                on_progress(query, len(query_leads))
            else:
                print(f"  [discovery] '{query}' → {len(query_leads)} results (total: {len(all_leads)})")

            # Delay between queries — critical to avoid blocks
            await asyncio.sleep(random.uniform(*delay_range))

    return all_leads
