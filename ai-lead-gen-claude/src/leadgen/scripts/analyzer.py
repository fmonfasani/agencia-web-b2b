#!/usr/bin/env python3
"""
analyzer.py — Full marketing analysis adapted from analyze_page.py.
Adds opportunity scoring on top of the original scoring system.
"""

import asyncio
import aiohttp
import random
import json
import re
import ssl
from html.parser import HTMLParser
from urllib.parse import urlparse


USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36",
]


class MarketingPageParser(HTMLParser):
    """Adapted from scripts/analyze_page.py — full marketing signal extraction."""

    def __init__(self):
        super().__init__()
        self.title = ""
        self.meta_description = ""
        self.og_tags = {}
        self.headings = {f"h{i}": [] for i in range(1, 7)}
        self.links = []
        self.images = []
        self.forms = []
        self.buttons = []
        self.scripts = []
        self.schema_data = []
        self.ctas = []
        self.social_links = []
        self.tracking_scripts = []

        self._in_title = False
        self._in_heading = None
        self._in_button = False
        self._in_a = False
        self._current_text = ""
        self._in_script = False
        self._script_type = ""
        self._in_form = False
        self._current_form = {}
        self._form_fields = []
        self._text_content = []
        self._has_viewport = False
        self._canonical = ""
        self._robots_meta = ""

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)

        if tag == "title":
            self._in_title = True
            self._current_text = ""
        elif tag == "meta":
            name = attrs_dict.get("name", "").lower()
            prop = attrs_dict.get("property", "").lower()
            content = attrs_dict.get("content", "")
            if name == "description":
                self.meta_description = content
            elif name == "viewport":
                self._has_viewport = True
            elif name == "robots":
                self._robots_meta = content
            elif prop.startswith("og:"):
                self.og_tags[prop] = content
        elif tag == "link":
            if "canonical" in attrs_dict.get("rel", ""):
                self._canonical = attrs_dict.get("href", "")
        elif tag in self.headings:
            self._in_heading = tag
            self._current_text = ""
        elif tag == "a":
            self._in_a = True
            self._current_text = ""
            href = attrs_dict.get("href", "")
            self.links.append({"href": href, "text": "", "attrs": attrs_dict})
            for platform in ["twitter.com", "x.com", "facebook.com", "linkedin.com",
                             "instagram.com", "youtube.com", "tiktok.com"]:
                if platform in href:
                    self.social_links.append({"platform": platform.split(".")[0], "url": href})
        elif tag == "img":
            self.images.append({
                "src": attrs_dict.get("src", ""),
                "alt": attrs_dict.get("alt", ""),
                "has_alt": "alt" in attrs_dict,
            })
        elif tag == "button":
            self._in_button = True
            self._current_text = ""
        elif tag == "form":
            self._in_form = True
            self._current_form = {"action": attrs_dict.get("action", ""),
                                  "method": attrs_dict.get("method", "GET").upper()}
            self._form_fields = []
        elif tag == "input" and self._in_form:
            self._form_fields.append({
                "type": attrs_dict.get("type", "text"),
                "name": attrs_dict.get("name", ""),
                "required": "required" in attrs_dict
            })
        elif tag == "script":
            self._in_script = True
            self._script_type = attrs_dict.get("type", "")
            self._current_text = ""
            src = attrs_dict.get("src", "")
            if src:
                self.scripts.append(src)
                tracking_map = {
                    "gtag": "Google Analytics", "googletagmanager": "Google Tag Manager",
                    "fbevents": "Meta Pixel", "hotjar": "Hotjar",
                    "mixpanel": "Mixpanel", "amplitude": "Amplitude",
                    "segment": "Segment", "hubspot": "HubSpot",
                    "intercom": "Intercom", "clarity": "Microsoft Clarity",
                    "tiktok": "TikTok Pixel",
                }
                for key, name in tracking_map.items():
                    if key in src.lower():
                        self.tracking_scripts.append(name)

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False
            self.title = self._current_text.strip()
        elif tag in self.headings and self._in_heading == tag:
            text = self._current_text.strip()
            if text:
                self.headings[tag].append(text)
            self._in_heading = None
        elif tag == "a" and self._in_a:
            self._in_a = False
            text = self._current_text.strip()
            if self.links:
                self.links[-1]["text"] = text
            cta_words = ["sign up", "get started", "try free", "buy now", "subscribe",
                         "register", "download", "book", "demo", "contact", "pricing",
                         "contratar", "comenzar", "probar", "solicitar", "ver precios"]
            if any(w in text.lower() for w in cta_words):
                self.ctas.append({"text": text, "href": self.links[-1]["href"], "type": "link"})
        elif tag == "button" and self._in_button:
            self._in_button = False
            text = self._current_text.strip()
            if text:
                self.buttons.append(text)
                self.ctas.append({"text": text, "type": "button"})
        elif tag == "form" and self._in_form:
            self._in_form = False
            self._current_form["fields"] = self._form_fields
            self._current_form["field_count"] = len(self._form_fields)
            self.forms.append(self._current_form)
        elif tag == "script" and self._in_script:
            self._in_script = False
            content = self._current_text
            if "gtag" in content or "dataLayer" in content:
                self.tracking_scripts.append("Google Analytics/GTM (inline)")
            if "fbq" in content:
                self.tracking_scripts.append("Meta Pixel (inline)")
            if self._script_type == "application/ld+json":
                try:
                    schema = json.loads(content)
                    if isinstance(schema, list):
                        self.schema_data.extend(schema)
                    else:
                        self.schema_data.append(schema)
                except Exception:
                    pass

    def handle_data(self, data):
        if any([self._in_title, self._in_heading, self._in_a,
                self._in_button, self._in_script]):
            self._current_text += data
        self._text_content.append(data)

    def get_results(self) -> dict:
        images_without_alt = sum(1 for img in self.images
                                  if not img.get("has_alt") or not img.get("alt"))
        heading_issues = []
        if not self.headings["h1"]:
            heading_issues.append("Missing H1")
        elif len(self.headings["h1"]) > 1:
            heading_issues.append(f"Multiple H1 ({len(self.headings['h1'])})")
        if self.headings["h3"] and not self.headings["h2"]:
            heading_issues.append("H3 without H2")

        tracking = list(set(self.tracking_scripts))
        full_text = " ".join(self._text_content)
        word_count = len(full_text.split())

        return {
            "seo": {
                "title": self.title,
                "title_length": len(self.title),
                "title_ok": 30 <= len(self.title) <= 60,
                "meta_description": self.meta_description,
                "meta_description_length": len(self.meta_description),
                "meta_description_ok": 120 <= len(self.meta_description) <= 160,
                "canonical": self._canonical,
                "has_viewport": self._has_viewport,
                "og_tags": self.og_tags,
                "headings": {k: v for k, v in self.headings.items() if v},
                "heading_issues": heading_issues,
                "images_total": len(self.images),
                "images_without_alt": images_without_alt,
            },
            "content": {
                "word_count": word_count,
                "h1": self.headings["h1"],
                "h2": self.headings["h2"],
            },
            "conversion": {
                "ctas": self.ctas[:20],
                "cta_count": len(self.ctas),
                "forms": self.forms,
                "form_count": len(self.forms),
                "buttons": self.buttons[:20],
            },
            "trust": {
                "social_links": self.social_links,
                "social_link_count": len(self.social_links),
            },
            "tracking": {
                "tools_detected": tracking,
                "tools_count": len(tracking),
                "schema_types": [s.get("@type", "Unknown") for s in self.schema_data],
                "schema_count": len(self.schema_data),
            },
            "technical": {
                "total_links": len(self.links),
                "scripts_count": len(self.scripts),
            }
        }


def _compute_scores(analysis: dict) -> dict:
    seo = analysis["seo"]
    conv = analysis["conversion"]
    trust = analysis["trust"]
    tracking = analysis["tracking"]

    # SEO score /10
    seo_s = 10
    if not seo["title"]: seo_s -= 3
    elif not seo["title_ok"]: seo_s -= 1
    if not seo["meta_description"]: seo_s -= 3
    elif not seo["meta_description_ok"]: seo_s -= 1
    if not seo["headings"].get("h1"): seo_s -= 2
    if seo["images_without_alt"] > 0: seo_s -= min(2, seo["images_without_alt"])
    if seo["heading_issues"]: seo_s -= 1
    if not seo["has_viewport"]: seo_s -= 1

    # CTA score /10
    cta_s = 5
    if conv["cta_count"] == 0: cta_s = 1
    elif conv["cta_count"] >= 4: cta_s = 8
    elif conv["cta_count"] >= 2: cta_s = 7
    if any(len(c.get("text", "")) > 10 for c in conv["ctas"]):
        cta_s = min(10, cta_s + 1)

    # Trust score /10
    trust_s = 5
    if trust["social_link_count"] >= 3: trust_s += 2
    elif trust["social_link_count"] >= 1: trust_s += 1
    if tracking["schema_count"] > 0: trust_s += 1

    # Tracking score /10
    tc = tracking["tools_count"]
    track_s = 3 if tc == 0 else 5 if tc == 1 else 7 if tc == 2 else 9

    scores = {
        "seo": max(0, seo_s),
        "cta": cta_s,
        "trust": min(10, trust_s),
        "tracking": track_s,
    }
    overall = round(sum(scores.values()) / len(scores), 1)
    return scores, overall


async def analyze_url(session: aiohttp.ClientSession, url: str) -> dict:
    """Full marketing analysis of a URL. Returns analysis dict."""
    headers = {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
    }
    try:
        async with session.get(url, headers=headers, allow_redirects=True,
                               timeout=aiohttp.ClientTimeout(total=15)) as resp:
            if resp.status != 200:
                return {"url": url, "status": "error", "message": f"HTTP {resp.status}"}
            html = await resp.text(errors="replace")
    except Exception as e:
        return {"url": url, "status": "error", "message": str(e)}

    parser = MarketingPageParser()
    try:
        parser.feed(html)
    except Exception as e:
        return {"url": url, "status": "error", "message": f"Parse error: {e}"}

    analysis = parser.get_results()

    # Internal/external links
    domain = urlparse(url).netloc
    internal = sum(1 for l in parser.links if l["href"].startswith("/") or domain in l["href"])
    external = sum(1 for l in parser.links if l["href"].startswith("http") and domain not in l["href"])
    analysis["technical"]["internal_links"] = internal
    analysis["technical"]["external_links"] = external

    scores, overall = _compute_scores(analysis)

    # Opportunity = inverse of marketing quality
    opportunity_score = round(100 - (overall * 10), 1)  # overall is /10, convert
    opportunity_score = max(0, min(100, opportunity_score))

    return {
        "url": url,
        "status": "success",
        "overall_score": overall,
        "opportunity_score": opportunity_score,
        "scores": scores,
        "analysis": analysis,
    }


async def analyze_batch(
    leads: list[dict],
    concurrency: int = 8,
    on_progress=None,
) -> list[dict]:
    semaphore = asyncio.Semaphore(concurrency)
    connector = aiohttp.TCPConnector(ssl=False, limit=concurrency)
    results = []
    done = 0

    async def _bounded(lead):
        nonlocal done
        async with semaphore:
            result = await analyze_url(session, lead["url"])
            done += 1
            if on_progress:
                on_progress(done, len(leads))
            return {**lead, **result}

    async with aiohttp.ClientSession(connector=connector) as session:
        tasks = [_bounded(lead) for lead in leads]
        for coro in asyncio.as_completed(tasks):
            results.append(await coro)

    return results
