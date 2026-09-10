from __future__ import annotations

import xml.etree.ElementTree as ET
from typing import TypedDict, Annotated, List
from urllib.parse import urlparse

import operator
import requests

from langgraph.graph import StateGraph, START, END
from langgraph.types import Send
from langgraph.checkpoint.memory import MemorySaver


# -------------------------------
# State
# -------------------------------

class InitialState(TypedDict):
    registries: list
    results: Annotated[list, operator.add]


class WorkerState(TypedDict):
    registry: dict


# -------------------------------
# API
# -------------------------------

def get_repositories():
    response = requests.get(
        "https://ui.shadcn.com/r/registries.json",
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


# -------------------------------
# Sitemap helpers
# -------------------------------

NAMESPACE = {
    "sm": "http://www.sitemaps.org/schemas/sitemap/0.9"
}


def parse_sitemap(url: str) -> List[str]:
    """
    Parses both sitemap.xml and sitemap indexes recursively.
    """
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()

        root = ET.fromstring(response.content)

        # sitemap index
        if root.tag.endswith("sitemapindex"):
            urls = []

            for loc in root.findall(".//sm:loc", NAMESPACE):
                urls.extend(parse_sitemap(loc.text))

            return urls

        # normal sitemap
        return [
            loc.text
            for loc in root.findall(".//sm:loc", NAMESPACE)
        ]

    except Exception as e:
        return []


# -------------------------------
# Nodes
# -------------------------------

def get_repositories_node(state: InitialState):
    registries = get_repositories()

    return {
        "registries": registries
    }


def create_workers(state: InitialState):
    return [
        Send(
            "worker",
            {
                "registry": registry
            },
        )
        for registry in state["registries"]
    ]


def worker_node(state: WorkerState):
    registry = state["registry"]
    name = registry["name"]
    url_pattern = registry["url"]
    homepage = registry.get("homepage") or ""
    
    if not homepage:
        parsed = urlparse(url_pattern)
        homepage = f"{parsed.scheme}://{parsed.netloc}"
        
    clean_home = homepage.rstrip("/")
    
    # Strategy 1: Registry JSON Index check
    candidates = []
    
    # Specific overrides for known registries with unique index URLs
    if name == "@react-easy-modals":
        candidates.append("https://react-easy-modals-docs.vercel.app/r/registry.json")
    elif name == "@saaskit":
        candidates.append("https://saaskit-theta.vercel.app/registry.json")
    elif name == "@motion-primitives":
        candidates.append("https://motion-primitives.com/c/registry.json")
    elif name == "@optics":
        candidates.append("https://optics.agusmayol.com.ar/r/registry.json")
        
    candidates.extend([
        url_pattern.replace("{name}.json", "registry.json"),
        url_pattern.replace("{name}.json", "index.json"),
    ])
    
    if "{name}" in url_pattern:
        candidates.extend([
            url_pattern.replace("{name}", "registry"),
            url_pattern.replace("{name}", "index"),
        ])
        
    if "/" in url_pattern:
        base_folder = url_pattern.rsplit("/", 1)[0]
        candidates.extend([
            f"{base_folder}/registry.json",
            f"{base_folder}/index.json"
        ])
        
    component_links = []
    resolved_via_json = False
    source_used = ""
    
    # Try candidates
    for candidate in candidates:
        try:
            res = requests.get(candidate, timeout=8)
            if res.status_code == 200:
                data = res.json()
                items = data.get("items", []) if isinstance(data, dict) else data
                if isinstance(items, list) and len(items) > 0:
                    for item in items:
                        if isinstance(item, dict):
                            comp_name = item.get("name", "")
                            comp_type = item.get("type", "component")
                            comp_title = item.get("title", "")
                            comp_desc = item.get("description", "")
                            
                            # Construct registry installation URL
                            install_url = url_pattern.replace("{name}", comp_name)
                            
                            # Guess the component documentation URL
                            if homepage:
                                if "block" in str(comp_type):
                                    doc_url = f"{clean_home}/blocks/{comp_name}"
                                else:
                                    doc_url = f"{clean_home}/components/{comp_name}"
                            else:
                                doc_url = install_url
                                
                            component_links.append({
                                "name": comp_name,
                                "type": comp_type,
                                "title": comp_title,
                                "description": comp_desc,
                                "install_url": install_url,
                                "doc_url": doc_url
                            })
                    resolved_via_json = True
                    source_used = candidate
                    break
        except Exception:
            continue
            
    # Strategy 2: Sitemap parser fallback
    if not resolved_via_json:
        sitemap = f"{clean_home}/sitemap.xml"
        source_used = sitemap
        links = parse_sitemap(sitemap)
        domain = urlparse(homepage).netloc.lower()
        
        extracted_urls = []
        for link in links:
            normalized = link.rstrip("/")
            
            # Domain-specific path matching overrides
            if "neobrutalism.dev" in domain:
                if link.startswith("https://www.neobrutalism.dev/docs/"):
                    page = link.replace("https://www.neobrutalism.dev/docs/", "")
                    if page not in ["", "installation", "figma", "migrating-from-v3", "changelog", "resources", "styling", "introduction"]:
                        extracted_urls.append(link)
            elif "shieldcn.dev" in domain:
                if "/docs/badges/" in link or "/docs/registry/" in link:
                    extracted_urls.append(link)
            elif "tailwindbuilder.ai" in domain:
                if "/ui-blocks/" in link or "/registry/" in link:
                    if not normalized.endswith(("/ui-blocks", "/blocks")):
                        extracted_urls.append(link)
            else:
                # Standard pattern matching
                if normalized.endswith(("/components", "/docs/components", "/blocks", "/block")):
                    continue
                if any(path in link for path in ["/docs/components/", "/components/", "/blocks/", "/block/"]):
                    extracted_urls.append(link)
                    
        for link in extracted_urls:
            parsed_link = urlparse(link)
            comp_name = parsed_link.path.split("/")[-1] or "component"
            component_links.append({
                "name": comp_name,
                "type": "component",
                "title": comp_name.replace("-", " ").title(),
                "description": "",
                "install_url": url_pattern.replace("{name}", comp_name),
                "doc_url": link
            })

    method = "JSON Index" if resolved_via_json else ("Sitemap" if component_links else "Unresolved")
    print(f"{name} -> {len(component_links)} components (via {method})")

    return {
        "results": [
            {
                "registry": name,
                "homepage": homepage,
                "method": method,
                "source": source_used,
                "components": component_links,
            }
        ]
    }


# -------------------------------
# Build graph
# -------------------------------

builder = StateGraph(InitialState)

builder.add_node("get_repositories", get_repositories_node)
builder.add_node("worker", worker_node)

builder.add_edge(START, "get_repositories")

builder.add_conditional_edges(
    "get_repositories",
    create_workers,
)

builder.add_edge("worker", END)

graph = builder.compile(
    checkpointer=MemorySaver()
)

# -------------------------------
# Run & Database Exporters
# -------------------------------

if __name__ == "__main__":
    import json
    from collections import defaultdict
    
    print("Starting LangGraph Scraper Execution...")
    
    result = graph.invoke(
        {
            "registries": [],
            "results": [],
        },
        config={
            "configurable": {
                "thread_id": "1"
            }
        },
    )
    
    print("\nProcessing results and generating databases...")
    
    # 1. Generate all_components_database.json
    database = {}
    for r in result["results"]:
        database[r["registry"]] = {
            "homepage": r["homepage"],
            "retrieval_method": r["method"],
            "retrieval_source": r["source"],
            "components_count": len(r["components"]),
            "components": r["components"]
        }
        
    db_path = "/Users/abhinaveluri/CourseraCourses/langgraph-course/all_components_database.json"
    with open(db_path, "w") as f:
        json.dump(database, f, indent=2)
    print(f"-> Successfully saved full database to: {db_path}")
    
    # 2. Generate registry_resolution_summary.md
    summary_path = "/Users/abhinaveluri/CourseraCourses/langgraph-course/registry_resolution_summary.md"
    sorted_results = sorted(result["results"], key=lambda x: x["registry"])
    
    with open(summary_path, "w") as f:
        f.write("# Registry Resolution Summary Mapping\n\n")
        f.write("This file documents every registry registered in the central shadcn database, specifying how its components are retrieved (JSON Index, Sitemap, or Unresolved with alternative retrieval strategies).\n\n")
        
        json_count = sum(1 for r in sorted_results if r["method"] == "JSON Index")
        sitemap_count = sum(1 for r in sorted_results if r["method"] == "Sitemap")
        unresolved_count = sum(1 for r in sorted_results if r["method"] == "Unresolved")
        total_components = sum(len(r["components"]) for r in sorted_results)
        
        f.write("## Execution Stats\n")
        f.write(f"- **Total Registries:** {len(sorted_results)}\n")
        f.write(f"- **Resolved via JSON Index:** {json_count}\n")
        f.write(f"- **Resolved via Sitemap:** {sitemap_count}\n")
        f.write(f"- **Unresolved:** {unresolved_count}\n")
        f.write(f"- **Total Components Scraped:** {total_components}\n\n")
        
        f.write("## Registry Resolution Details\n\n")
        f.write("| Registry Name | Homepage | Retrieval Method | Source/Status | Component Count |\n")
        f.write("| --- | --- | --- | --- | --- |\n")
        for r in sorted_results:
            f.write(f"| `{r['registry']}` | [{r['homepage']}]({r['homepage']}) | **{r['method']}** | `{r['source']}` | {len(r['components'])} |\n")
            
    print(f"-> Successfully saved resolution summary report to: {summary_path}")
    
    # 3. Generate components_by_name.json & components_by_name_report.md
    by_name = defaultdict(list)
    for r in sorted_results:
        for comp in r["components"]:
            comp_name = comp["name"].strip()
            if comp_name:
                key = comp_name.lower()
                by_name[key].append({
                    "registry": r["registry"],
                    "type": comp.get("type"),
                    "title": comp.get("title"),
                    "description": comp.get("description"),
                    "install_url": comp.get("install_url"),
                    "doc_url": comp.get("doc_url")
                })
                
    sorted_by_name = dict(sorted(by_name.items()))
    by_name_path = "/Users/abhinaveluri/CourseraCourses/langgraph-course/components_by_name.json"
    with open(by_name_path, "w") as f:
        json.dump(sorted_by_name, f, indent=2)
    print(f"-> Successfully saved components-by-name mapping to: {by_name_path}")
    
    popularity = []
    for name, entries in sorted_by_name.items():
        popularity.append((name, len(entries), entries))
    popularity.sort(key=lambda x: x[1], reverse=True)
    
    report_path = "/Users/abhinaveluri/CourseraCourses/langgraph-course/components_by_name_report.md"
    with open(report_path, "w") as f:
        f.write("# Component Popularity & Registry Mapping Report\n\n")
        f.write("This report groups components across all resolved shadcn registries by their component name to help discover alternative styles and implementations.\n\n")
        
        f.write("## Top 15 Most Common Components\n\n")
        f.write("| Rank | Component Name | Registry Count | Sample Registries |\n")
        f.write("| --- | --- | --- | --- |\n")
        for idx, (name, count, entries) in enumerate(popularity[:15]):
            sample_regs = ", ".join([f"`{e['registry']}`" for e in entries[:5]])
            if len(entries) > 5:
                sample_regs += f" (+{len(entries)-5} more)"
            f.write(f"| {idx+1} | **`{name}`** | {count} | {sample_regs} |\n")
            
        f.write("\n---\n\n")
        f.write("## Popular Component Details & Registry Sources\n\n")
        
        for name, count, entries in popularity[:10]:
            f.write(f"### `{name}` (Implemented in {count} registries)\n\n")
            f.write("| Registry | Component Title | Description | Installation / Documentation |\n")
            f.write("| --- | --- | --- | --- |\n")
            for e in entries[:15]:
                desc = e["description"] or "*No description*"
                if len(desc) > 80:
                    desc = desc[:77] + "..."
                f.write(f"| `{e['registry']}` | {e['title'] or '*None*'} | {desc} | [Install]({e['install_url']}) / [Docs]({e['doc_url']}) |\n")
            if len(entries) > 15:
                f.write(f"| ... and {len(entries)-15} more registries | | | |\n")
            f.write("\n---\n\n")
            
    print(f"-> Successfully saved components popularity report to: {report_path}")
    print("\nAll database tables and report artifacts are fully updated!")