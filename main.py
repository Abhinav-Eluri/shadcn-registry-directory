#!/usr/bin/env python3
"""
Unified Shadcn Registry & Component Scraper (High-Performance Concurrent Engine)
Zero framework bloat — pure Python with connection pooling and ThreadPoolExecutor.
"""

from __future__ import annotations

import json
import os
import re
import time
import xml.etree.ElementTree as ET
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Optional, Tuple
from urllib.parse import urlparse

import requests
from requests.adapters import HTTPAdapter


# -------------------------------
# HTTP Session Setup
# -------------------------------

def create_session(pool_size: int = 50) -> requests.Session:
    s = requests.Session()
    adapter = HTTPAdapter(
        pool_connections=pool_size,
        pool_maxsize=pool_size,
        max_retries=1
    )
    s.mount("https://", adapter)
    s.mount("http://", adapter)
    s.headers.update({
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    })
    return s


SESSION = create_session(50)
URL_CACHE: Dict[str, int] = {}


def check_url_status(url: str, session: requests.Session = SESSION, timeout: int = 4) -> int:
    """
    Checks if a URL returns HTTP 200 OK.
    Uses HEAD request with fallback to lightweight streaming GET.
    Caches responses to eliminate redundant network roundtrips.
    """
    if not url:
        return 0
    if url in URL_CACHE:
        return URL_CACHE[url]

    try:
        res = session.head(url, timeout=timeout, allow_redirects=True)
        status = res.status_code
        if status in (405, 403, 501):
            res = session.get(url, timeout=timeout, stream=True)
            status = res.status_code

        URL_CACHE[url] = status
        return status
    except Exception:
        URL_CACHE[url] = 0
        return 0


# -------------------------------
# API & URL Placeholders
# -------------------------------

def fetch_registries(session: requests.Session = SESSION) -> List[dict]:
    """Fetches the official list of 294+ registries from shadcn."""
    url = "https://ui.shadcn.com/r/registries.json"
    response = session.get(url, timeout=20)
    response.raise_for_status()
    return response.json()


def resolve_install_url(url_pattern: str, comp_name: str, style: str = "default") -> str:
    """Resolves {style} and {name} placeholders in registry URL pattern."""
    resolved = url_pattern.replace("{style}", style)
    return resolved.replace("{name}", comp_name)


def get_registry_index_candidates(name: str, url_pattern: str) -> List[str]:
    """
    Generates candidate URLs to fetch registry index JSON.
    Handles registries requiring {style} substitution.
    """
    candidates = []

    # Known registry overrides
    overrides = {
        "@react-easy-modals": "https://react-easy-modals-docs.vercel.app/r/registry.json",
        "@saaskit": "https://saaskit-theta.vercel.app/registry.json",
        "@motion-primitives": "https://motion-primitives.com/c/registry.json",
        "@optics": "https://optics.agusmayol.com.ar/r/registry.json",
    }
    if name in overrides:
        candidates.append(overrides[name])

    patterns = [url_pattern]
    if "{style}" in url_pattern:
        patterns = [
            url_pattern.replace("{style}", "default"),
            url_pattern.replace("{style}", "new-york"),
            url_pattern.replace("/{style}", ""),
            url_pattern.replace("{style}/", ""),
        ]

    for pat in patterns:
        candidates.extend([
            pat.replace("{name}.json", "registry.json"),
            pat.replace("{name}.json", "index.json"),
        ])
        if "{name}" in pat:
            candidates.extend([
                pat.replace("{name}", "registry"),
                pat.replace("{name}", "index"),
            ])
        if "/" in pat:
            base_folder = pat.rsplit("/", 1)[0]
            candidates.extend([
                f"{base_folder}/registry.json",
                f"{base_folder}/index.json",
            ])

    seen = set()
    deduped = []
    for c in candidates:
        if c not in seen:
            seen.add(c)
            deduped.append(c)
    return deduped


# -------------------------------
# Sitemap & Doc Discovery
# -------------------------------

SITEMAP_NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}

IGNORE_SLUGS = {
    "", "docs", "components", "blocks", "block", "ui-blocks", "registry",
    "installation", "figma", "migrating-from-v3", "changelog", "resources",
    "styling", "introduction", "overview", "getting-started", "theming",
    "dark-mode", "cli", "license", "privacy", "terms", "about", "blog",
    "sponsors", "contributors", "themes", "submit-project", "index"
}


def parse_sitemap(url: str, session: requests.Session = SESSION) -> List[str]:
    """Parses sitemap.xml and sitemap indexes recursively."""
    try:
        res = session.get(url, timeout=8)
        res.raise_for_status()
        root = ET.fromstring(res.content)

        if root.tag.endswith("sitemapindex"):
            urls = []
            for loc in root.findall(".//sm:loc", SITEMAP_NS):
                if loc.text:
                    urls.extend(parse_sitemap(loc.text, session))
            return urls

        return [loc.text for loc in root.findall(".//sm:loc", SITEMAP_NS) if loc.text]
    except Exception:
        return []


def build_sitemap_slug_index(sitemap_urls: List[str]) -> Dict[str, str]:
    """Indexes component slugs to their exact documentation URLs."""
    slug_map: Dict[str, str] = {}
    for link in sitemap_urls:
        parsed = urlparse(link)
        slug = parsed.path.rstrip("/").split("/")[-1].lower()
        if not slug or slug in IGNORE_SLUGS:
            continue

        lower = link.lower()
        score = 0
        if "/docs/components/" in lower or "/docs/blocks/" in lower:
            score = 4
        elif "/docs/" in lower:
            score = 3
        elif "/components/" in lower or "/blocks/" in lower:
            score = 2
        elif "/ui/" in lower:
            score = 1

        if slug not in slug_map or score >= 2:
            slug_map[slug] = link
    return slug_map


def probe_registry_doc_pattern(homepage: str, sample_comp: str, session: requests.Session = SESSION) -> Optional[str]:
    """
    For registries without a sitemap, probes standard subpage patterns.
    Returns the working format template if verified 200 OK.
    """
    clean_home = homepage.rstrip("/")
    patterns = [
        "{base}/docs/components/{name}",
        "{base}/components/{name}",
        "{base}/docs/{name}",
        "{base}/blocks/{name}",
        "{base}/components#{name}",
    ]
    for pat in patterns:
        test_url = pat.format(base=clean_home, name=sample_comp)
        if check_url_status(test_url, session=session, timeout=3) == 200:
            return pat
    return None


# -------------------------------
# Core Registry Scraper
# -------------------------------

def scrape_registry(registry: dict, session: requests.Session = SESSION) -> dict:
    """Scrapes, extracts, and validates all components for a single registry."""
    name = registry["name"]
    url_pattern = registry["url"]
    homepage = (registry.get("homepage") or "").strip()

    if not homepage:
        parsed = urlparse(url_pattern)
        homepage = f"{parsed.scheme}://{parsed.netloc}"

    clean_home = homepage.rstrip("/")

    # 1. Check sitemap
    sitemap_url = f"{clean_home}/sitemap.xml"
    sitemap_links = parse_sitemap(sitemap_url, session=session)
    sitemap_slug_map = build_sitemap_slug_index(sitemap_links)

    candidates = get_registry_index_candidates(name, url_pattern)
    component_links = []
    resolved_via_json = False
    source_used = ""

    # Strategy 1: JSON Index
    for candidate in candidates:
        try:
            res = session.get(candidate, timeout=6)
            if res.status_code == 200:
                data = res.json()
                items = data.get("items", []) if isinstance(data, dict) else data
                if isinstance(items, list) and len(items) > 0:
                    for item in items:
                        if isinstance(item, dict):
                            comp_name = item.get("name", "").strip()
                            if not comp_name:
                                continue

                            comp_type = item.get("type", "component")
                            comp_title = item.get("title", "") or comp_name.replace("-", " ").title()
                            comp_desc = item.get("description", "")

                            install_url = resolve_install_url(url_pattern, comp_name)
                            install_cmd = f"npx shadcn@latest add {name}/{comp_name}"

                            # Documentation resolution
                            raw_doc = item.get("docs")
                            explicit_doc = None
                            if isinstance(raw_doc, dict):
                                candidate_doc = raw_doc.get("url") or raw_doc.get("docs")
                                if isinstance(candidate_doc, str) and candidate_doc.startswith(("http://", "https://")):
                                    explicit_doc = candidate_doc
                            elif isinstance(raw_doc, str) and raw_doc.startswith(("http://", "https://")):
                                explicit_doc = raw_doc

                            if not explicit_doc:
                                for cand in [
                                    item.get("docUrl"),
                                    item.get("homepage"),
                                    (item.get("meta") or {}).get("docs"),
                                    (item.get("meta") or {}).get("url"),
                                ]:
                                    if isinstance(cand, str) and cand.startswith(("http://", "https://")):
                                        explicit_doc = cand
                                        break

                            slug_key = comp_name.lower()
                            if explicit_doc:
                                doc_url = explicit_doc
                            elif slug_key in sitemap_slug_map and sitemap_slug_map[slug_key].startswith(("http://", "https://")):
                                doc_url = sitemap_slug_map[slug_key]
                            elif homepage and homepage.startswith(("http://", "https://")):
                                doc_url = homepage
                            elif install_url and install_url.startswith(("http://", "https://")):
                                doc_url = install_url
                            else:
                                doc_url = homepage or ""

                            component_links.append({
                                "name": comp_name,
                                "type": comp_type,
                                "title": comp_title,
                                "description": comp_desc,
                                "install_url": install_url,
                                "install_cmd": install_cmd,
                                "doc_url": doc_url,
                            })

                    resolved_via_json = True
                    source_used = candidate
                    break
        except Exception:
            continue

    # Strategy 2: Sitemap Fallback
    if not resolved_via_json and sitemap_links:
        source_used = sitemap_url
        for link in sitemap_links:
            normalized = link.rstrip("/")
            slug = normalized.split("/")[-1].strip()
            if not slug or slug in IGNORE_SLUGS:
                continue

            if any(p in link for p in ["/docs/components/", "/components/", "/blocks/", "/block/", "/ui/"]):
                comp_name = slug
                install_url = resolve_install_url(url_pattern, comp_name)
                install_cmd = f"npx shadcn@latest add {name}/{comp_name}"

                component_links.append({
                    "name": comp_name,
                    "type": "component",
                    "title": comp_name.replace("-", " ").title(),
                    "description": "",
                    "install_url": install_url,
                    "install_cmd": install_cmd,
                    "doc_url": link,
                })

    # Strategy 3: Subpage Pattern Probe if sitemap was missing
    if component_links and not sitemap_links and homepage:
        first_comp = component_links[0]["name"]
        verified_pat = probe_registry_doc_pattern(homepage, first_comp, session=session)
        if verified_pat:
            for c in component_links:
                c["doc_url"] = verified_pat.format(base=clean_home, name=c["name"])

    # 4. Live HTTP 200 Verification for components
    method = "JSON Index" if resolved_via_json else ("Sitemap" if component_links else "Unresolved")

    # Sample circuit breaker for auth-gated registries
    if len(component_links) >= 5:
        sample_checks = [check_url_status(c["install_url"], session=session) for c in component_links[:5]]
        if all(s in (401, 403, 0) and s == sample_checks[0] for s in sample_checks):
            uniform_status = sample_checks[0]
            for c in component_links:
                c["install_status"] = uniform_status
                c["doc_status"] = 200 if check_url_status(c["doc_url"], session=session) == 200 else 0
                c["is_installable"] = False
        else:
            for c in component_links:
                c["install_status"] = check_url_status(c["install_url"], session=session)
                c["doc_status"] = check_url_status(c["doc_url"], session=session)
                c["is_installable"] = (c["install_status"] == 200)
    else:
        for c in component_links:
            c["install_status"] = check_url_status(c["install_url"], session=session)
            c["doc_status"] = check_url_status(c["doc_url"], session=session)
            c["is_installable"] = (c["install_status"] == 200)

    valid_200_count = sum(1 for c in component_links if c.get("install_status") == 200)

    return {
        "registry": name,
        "homepage": homepage,
        "method": method,
        "source": source_used,
        "total_components": len(component_links),
        "valid_200_count": valid_200_count,
        "components": component_links,
    }


# -------------------------------
# Exporter & Data Generator
# -------------------------------

def export_all_artifacts(results: List[dict], target_dir: str):
    """Exports full database JSON, components-by-name mapping, and markdown reports."""
    os.makedirs(target_dir, exist_ok=True)
    sorted_results = sorted(results, key=lambda x: x["registry"])

    # 1. Full Database
    db = {}
    for r in sorted_results:
        db[r["registry"]] = {
            "homepage": r["homepage"],
            "retrieval_method": r["method"],
            "retrieval_source": r["source"],
            "total_components": r["total_components"],
            "valid_200_count": r["valid_200_count"],
            "components": r["components"],
        }
    db_path = os.path.join(target_dir, "all_components_database.json")
    with open(db_path, "w") as f:
        json.dump(db, f, indent=2)
    print(f"-> Full database written to: {db_path}")

    # 2. Resolution Summary Report
    summary_path = os.path.join(target_dir, "registry_resolution_summary.md")
    total_comps = sum(r["total_components"] for r in sorted_results)
    total_200 = sum(r["valid_200_count"] for r in sorted_results)

    with open(summary_path, "w") as f:
        f.write("# Registry Resolution & HTTP Verification Summary\n\n")
        f.write(f"- **Total Registries:** {len(sorted_results)}\n")
        f.write(f"- **Total Components Scraped:** {total_comps}\n")
        f.write(f"- **Install URLs Returning 200 OK:** {total_200} ({round(total_200/(total_comps or 1)*100, 1)}%)\n\n")
        f.write("| Registry | Homepage | Method | Total Components | 200 OK Status |\n")
        f.write("| --- | --- | --- | --- | --- |\n")
        for r in sorted_results:
            c_cnt = r["total_components"]
            v_cnt = r["valid_200_count"]
            pct = f"{v_cnt}/{c_cnt} ({round(v_cnt/(c_cnt or 1)*100)}%)" if c_cnt else "0/0"
            f.write(f"| `{r['registry']}` | [{r['homepage']}]({r['homepage']}) | **{r['method']}** | {c_cnt} | {pct} |\n")
    print(f"-> Summary report written to: {summary_path}")

    # 3. Components By Name Mapping
    by_name = defaultdict(list)
    for r in sorted_results:
        for c in r["components"]:
            cname = c["name"].strip()
            if cname:
                by_name[cname.lower()].append({
                    "registry": r["registry"],
                    "title": c.get("title"),
                    "type": c.get("type"),
                    "description": c.get("description"),
                    "install_cmd": c.get("install_cmd"),
                    "install_url": c.get("install_url"),
                    "install_status": c.get("install_status", 0),
                    "doc_url": c.get("doc_url"),
                    "doc_status": c.get("doc_status", 0),
                    "is_installable": c.get("is_installable", False),
                })
    sorted_by_name = dict(sorted(by_name.items()))
    by_name_path = os.path.join(target_dir, "components_by_name.json")
    with open(by_name_path, "w") as f:
        json.dump(sorted_by_name, f, indent=2)
    print(f"-> Components mapping written to: {by_name_path}")

    # 4. Frontend Sync (if frontend directory exists)
    frontend_public = os.path.join(target_dir, "frontend", "public")
    if os.path.exists(frontend_public):
        # Generate flattened catalog for UI
        catalog = []
        featured = []
        by_reg = defaultdict(list)

        for r in sorted_results:
            for c in r["components"]:
                c_item = {
                    "id": f"{r['registry']}/{c['name']}",
                    "name": c["name"],
                    "title": c.get("title") or c["name"].replace("-", " ").title(),
                    "description": c.get("description", ""),
                    "registry": r["registry"],
                    "homepage": r["homepage"],
                    "type": c.get("type", "component"),
                    "install_url": c.get("install_url", ""),
                    "install_cmd": c.get("install_cmd", ""),
                    "doc_url": c.get("doc_url", r["homepage"]),
                    "install_status": c.get("install_status", 200),
                    "doc_status": c.get("doc_status", 200),
                    "is_installable": c.get("is_installable", True),
                }
                catalog.append(c_item)
                by_reg[r["registry"]].append(c_item)

        for reg, items in by_reg.items():
            featured.extend(items[:20])

        with open(os.path.join(frontend_public, "catalog.json"), "w") as f:
            json.dump(catalog, f)
        with open(os.path.join(frontend_public, "featured.json"), "w") as f:
            json.dump(featured, f)
        print(f"-> Synced catalog.json ({len(catalog)} items) and featured.json ({len(featured)} items) to frontend/public")


# -------------------------------
# Main Runner
# -------------------------------

def main():
    start_time = time.time()
    print("=========================================================")
    print("Unified Shadcn Registry Scraper (Pure Python Concurrent)")
    print("=========================================================\n")

    registries = fetch_registries()
    total_reg = len(registries)
    print(f"-> Fetched {total_reg} registries from ui.shadcn.com/r/registries.json")
    print(f"-> Launching parallel scraping with 30 concurrent workers...\n")

    results = []
    completed = 0

    with ThreadPoolExecutor(max_workers=30) as executor:
        future_map = {executor.submit(scrape_registry, r): r["name"] for r in registries}

        for future in as_completed(future_map):
            completed += 1
            reg_name = future_map[future]
            try:
                data = future.result()
                results.append(data)
                valid_str = f"{data['valid_200_count']}/{data['total_components']} 200 OK" if data['total_components'] else "0 comps"
                print(f"[{completed:3d}/{total_reg}] {reg_name:25s} -> {data['total_components']:4d} components ({data['method']}) | {valid_str}")
            except Exception as exc:
                print(f"[{completed:3d}/{total_reg}] {reg_name:25s} -> FAILED: {exc}")

    elapsed = time.time() - start_time
    print(f"\nScraping complete in {elapsed:.1f} seconds! Exporting artifacts...\n")

    current_dir = os.path.dirname(os.path.abspath(__file__))
    export_all_artifacts(results, current_dir)
    print("\nAll database tables and frontend artifacts are fully updated!")


if __name__ == "__main__":
    main()