#!/usr/bin/env python3
"""
Shadcn Registry Directory - Model Context Protocol (MCP) Server
Exposes 41,700+ verified components across 294 registries as native tools for AI coding assistants.
"""

from __future__ import annotations

import json
import os
from typing import Dict, List, Optional
import requests
from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings

# -------------------------------
# In-Memory Database & Index
# -------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "all_components_database.json")
BY_NAME_PATH = os.path.join(BASE_DIR, "components_by_name.json")
META_PATH = os.path.join(BASE_DIR, "frontend", "public", "metadata.json")

REGISTRY_DB: Dict[str, dict] = {}
BY_NAME_DB: Dict[str, list] = {}
ALL_COMPONENTS: List[dict] = []
METADATA: dict = {}


def load_database():
    """Loads and indexes the local registry databases into memory."""
    global REGISTRY_DB, BY_NAME_DB, ALL_COMPONENTS, METADATA

    if os.path.exists(DB_PATH):
        try:
            with open(DB_PATH, "r", encoding="utf-8") as f:
                REGISTRY_DB = json.load(f)
                ALL_COMPONENTS = []
                for reg_name, reg_data in REGISTRY_DB.items():
                    for comp in reg_data.get("components", []):
                        ALL_COMPONENTS.append({
                            **comp,
                            "id": f"{reg_name}/{comp['name']}",
                            "registry": reg_name,
                            "homepage": reg_data.get("homepage", ""),
                        })
        except Exception as err:
            print(f"[Warning] Failed to load {DB_PATH}: {err}")

    if os.path.exists(BY_NAME_PATH):
        try:
            with open(BY_NAME_PATH, "r", encoding="utf-8") as f:
                BY_NAME_DB = json.load(f)
        except Exception as err:
            print(f"[Warning] Failed to load {BY_NAME_PATH}: {err}")

    if os.path.exists(META_PATH):
        try:
            with open(META_PATH, "r", encoding="utf-8") as f:
                METADATA = json.load(f)
        except Exception:
            pass


load_database()

# -------------------------------
# MCP Server Initialization
# -------------------------------

transport_security = TransportSecuritySettings(
    enable_dns_rebinding_protection=False,
    allowed_hosts=["*"],
    allowed_origins=["*"],
)

mcp = FastMCP(
    name="shadcn-directory",
    instructions="Search, compare, and install 41,700+ verified shadcn components from 294+ registries.",
    transport_security=transport_security,
)


# -------------------------------
# MCP Tools
# -------------------------------

@mcp.tool()
def search_components(
    query: str,
    registry: str = "",
    component_type: str = "",
    verified_only: bool = True,
    limit: int = 10
) -> str:
    """
    Searches across 41,700+ components from 294 shadcn registries.
    
    Args:
        query: Search keywords (e.g. 'rainbow button', 'pricing card', 'dialog modal', 'sidebar', 'auth form').
        registry: Optional filter for a specific registry (e.g. '@magicui', '@aceternity', '@shadcn', '@originui').
        component_type: Optional component type filter ('component', 'block', 'hook', 'page', 'theme').
        verified_only: When true, only returns components whose install URL verified HTTP 200 OK.
        limit: Maximum number of results to return (default 10, max 30).
    """
    q = query.lower().strip()
    terms = q.split()
    limit = min(max(1, limit), 30)

    matches = []
    for c in ALL_COMPONENTS:
        if registry and c["registry"].lower() != registry.lower():
            continue
        if component_type and c.get("type", "").replace("registry:", "") != component_type.lower():
            continue
        if verified_only and c.get("install_status") != 200:
            continue

        name_lower = c["name"].lower()
        title_lower = (c.get("title") or "").lower()
        desc_lower = (c.get("description") or "").lower()
        reg_lower = c["registry"].lower()

        # Score relevance
        score = 0
        if q == name_lower or q == title_lower:
            score += 100
        elif name_lower.startswith(q) or title_lower.startswith(q):
            score += 50
        elif all(term in name_lower or term in title_lower for term in terms):
            score += 30
        elif all(term in f"{name_lower} {title_lower} {reg_lower}" for term in terms):
            score += 20
        elif all(term in f"{name_lower} {title_lower} {desc_lower} {reg_lower}" for term in terms):
            score += 10

        if score > 0:
            matches.append((score, c))

    matches.sort(key=lambda x: x[0], reverse=True)
    results = [m[1] for m in matches[:limit]]

    if not results:
        return f"No components found matching query '{query}' (filters: registry={registry or 'all'}, verified_only={verified_only})."

    output = [f"### Found {len(matches)} components for '{query}' (showing top {len(results)}):\n"]
    for i, c in enumerate(results, 1):
        status_badge = "✅ 200 OK (Verified)" if c.get("install_status") == 200 else f"⚠️ Status: {c.get('install_status')}"
        output.append(
            f"**{i}. {c.get('title') or c['name']}** (`{c['name']}`)\n"
            f"- **Registry:** `{c['registry']}` ({status_badge})\n"
            f"- **Type:** `{c.get('type', 'component').replace('registry:', '')}`\n"
            f"- **Install Command:** `{c.get('install_cmd')}`\n"
            f"- **Docs:** {c.get('doc_url') or c.get('homepage')}\n"
            f"- **Description:** {c.get('description') or 'No description provided.'}\n"
        )

    return "\n".join(output)


@mcp.tool()
def get_component_by_name(canonical_name: str, limit: int = 15) -> str:
    """
    Compares all registry implementations for a canonical component name.
    
    Args:
        canonical_name: The base component slug (e.g. 'button', 'input', 'card', 'dialog', 'badge', 'accordion', 'tabs').
        limit: Maximum number of registry variants to display (default 15).
    """
    key = canonical_name.lower().strip()
    variants = BY_NAME_DB.get(key, [])

    if not variants:
        # Fuzzy fallback search
        matching_keys = [k for k in BY_NAME_DB.keys() if key in k][:5]
        if matching_keys:
            suggestions = ", ".join(f"'{k}'" for k in matching_keys)
            return f"No exact match for canonical component '{canonical_name}'. Did you mean: {suggestions}?"
        return f"No component implementations found for canonical name '{canonical_name}'."

    limit = min(max(1, limit), 50)
    displayed = variants[:limit]

    output = [
        f"### Canonical Component: '{canonical_name}' ({len(variants)} registry implementations)\n",
        "| Registry | Variant Title | Type | Status | Install Command |",
        "| :--- | :--- | :--- | :--- | :--- |",
    ]

    for item in displayed:
        status = "✅ 200 OK" if item.get("install_status") == 200 else f"⚠️ {item.get('install_status')}"
        reg = item.get("registry", "")
        title = item.get("title") or canonical_name
        ctype = (item.get("type") or "component").replace("registry:", "")
        cmd = item.get("install_cmd", f"npx shadcn@latest add {reg}/{canonical_name}")
        output.append(f"| `{reg}` | {title} | `{ctype}` | {status} | `{cmd}` |")

    if len(variants) > limit:
        output.append(f"\n*...and {len(variants) - limit} more registry implementations.*")

    return "\n".join(output)


@mcp.tool()
def get_install_command(component_id: str) -> str:
    """
    Generates the exact CLI install command for a component.
    
    Args:
        component_id: Full identifier (e.g. '@magicui/rainbow-button') or slug (e.g. 'rainbow-button').
    """
    comp_id = component_id.strip()

    # Direct match by full id (registry/name)
    found = None
    for c in ALL_COMPONENTS:
        if c["id"].lower() == comp_id.lower() or c["name"].lower() == comp_id.lower():
            found = c
            break

    if not found:
        return f"Component '{component_id}' not found. Use `search_components` to look up the exact name."

    status_str = "Verified 200 OK" if found.get("install_status") == 200 else f"HTTP Status: {found.get('install_status')}"
    return (
        f"### Install Command for {found.get('title') or found['name']}\n\n"
        f"```bash\n{found['install_cmd']}\n```\n\n"
        f"- **Registry:** `{found['registry']}`\n"
        f"- **Component Name:** `{found['name']}`\n"
        f"- **Verification:** {status_str}\n"
        f"- **Documentation:** {found.get('doc_url') or found.get('homepage')}\n"
        f"- **Install JSON URL:** {found.get('install_url')}\n"
    )


@mcp.tool()
def list_registries(limit: int = 50, search: str = "") -> str:
    """
    Lists indexed shadcn registries, their component counts, and homepages.
    
    Args:
        limit: Number of registries to return (default 50, max 100).
        search: Optional keyword to filter registry names or descriptions.
    """
    limit = min(max(1, limit), 100)
    registries = []

    for name, data in REGISTRY_DB.items():
        comp_count = len(data.get("components", []))
        home = data.get("homepage", "")
        method = data.get("method", "JSON Index")
        valid_200 = data.get("valid_200_count", 0)

        if search:
            s = search.lower()
            if s not in name.lower() and s not in home.lower():
                continue

        registries.append({
            "name": name,
            "components": comp_count,
            "valid_200": valid_200,
            "homepage": home,
            "method": method,
        })

    # Sort by number of components descending
    registries.sort(key=lambda x: x["components"], reverse=True)
    displayed = registries[:limit]

    output = [
        f"### Shadcn Registries ({len(registries)} total, showing top {len(displayed)}):\n",
        "| Registry | Components | Verified 200 | Homepage | Resolution |",
        "| :--- | :--- | :--- | :--- | :--- |",
    ]

    for r in displayed:
        output.append(
            f"| `{r['name']}` | {r['components']} | {r['valid_200']} | [{r['homepage']}]({r['homepage']}) | {r['method']} |"
        )

    return "\n".join(output)


@mcp.tool()
def inspect_component_schema(registry: str, component_name: str) -> str:
    """
    Downloads and inspects a component's raw registry JSON manifest to reveal its dependencies and files.
    
    Args:
        registry: The registry name (e.g. '@magicui', '@shadcn', '@aceternity', '@originui').
        component_name: The component slug (e.g. 'rainbow-button', 'bento-grid').
    """
    reg_clean = registry.strip()
    comp_clean = component_name.strip()

    # Find component to get install_url
    target = None
    for c in ALL_COMPONENTS:
        if c["registry"].lower() == reg_clean.lower() and c["name"].lower() == comp_clean.lower():
            target = c
            break

    if not target:
        return f"Component '{comp_clean}' not found in registry '{reg_clean}'."

    install_url = target.get("install_url")
    if not install_url:
        return f"No install URL found for '{reg_clean}/{comp_clean}'."

    try:
        res = requests.get(install_url, timeout=10)
        if res.status_code != 200:
            return f"Failed to fetch schema from {install_url} (HTTP {res.status_code})."

        schema = res.json()
        dependencies = schema.get("dependencies", [])
        devDependencies = schema.get("devDependencies", [])
        registryDependencies = schema.get("registryDependencies", [])
        files = schema.get("files", [])
        file_paths = [f.get("path") or f.get("name") for f in files if isinstance(f, dict)]

        tailwind_cfg = schema.get("tailwind", {})
        css_vars = schema.get("cssVars", {})

        return (
            f"### Manifest for `{reg_clean}/{comp_clean}`\n\n"
            f"- **Title:** {schema.get('title') or target.get('title')}\n"
            f"- **Type:** `{schema.get('type') or target.get('type')}`\n"
            f"- **Registry URL:** {install_url}\n"
            f"- **NPM Dependencies:** {', '.join(dependencies) if dependencies else 'None'}\n"
            f"- **NPM DevDependencies:** {', '.join(devDependencies) if devDependencies else 'None'}\n"
            f"- **Shadcn Registry Dependencies:** {', '.join(registryDependencies) if registryDependencies else 'None'}\n"
            f"- **Files Created ({len(files)}):** {', '.join(filter(None, file_paths)) if file_paths else 'Standard file structure'}\n"
            f"- **Tailwind Config Extensions:** {'Yes' if tailwind_cfg else 'None'}\n"
            f"- **CSS Variables:** {'Yes' if css_vars else 'None'}\n\n"
            f"**Install Command:**\n```bash\n{target.get('install_cmd')}\n```"
        )
    except Exception as exc:
        return f"Error fetching manifest from {install_url}: {exc}"


# -------------------------------
# CLI Runner for Local Stdio MCP
# -------------------------------

if __name__ == "__main__":
    # Runs the stdio MCP transport for Claude Desktop, Cursor, and IDEs
    mcp.run()
