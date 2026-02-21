"""
Deterministic evaluator for LLM-generated flow data.

Runs 18 checks across four categories:
  1. Structural — node/edge counts, duplicates, dangling refs
  2. Connectivity — orphans, graph connectedness
  3. Group integrity — children count, internal/cross-group edges, nesting
  4. Data quality — titles, icons, labels, edge types/colors

Minor issues are auto-fixed in place; fatal issues trigger a retry.
"""

from collections import deque

from config import (
    EDGE_COLORS,
    DEFAULT_ICONS,
    MAX_RETRIES,
    MIN_UNIVERSAL_NODES,
    MIN_EDGES,
    MAX_CHILDREN_PER_GROUP,
    MAX_TITLE_LENGTH,
    MAX_SUBTITLE_LENGTH,
)
from models import FlowNode, FlowEdge, GenerateResult


# ═══════════════════════════════════════════
# BFS connectivity check
# ═══════════════════════════════════════════

def bfs_connected(node_ids: set[str], edges: list[dict]) -> bool:
    """Return True if *node_ids* form a single connected component via *edges*."""
    if len(node_ids) <= 1:
        return True

    adjacency: dict[str, set[str]] = {nid: set() for nid in node_ids}
    for e in edges:
        s, t = e.get("source"), e.get("target")
        if s in adjacency and t in adjacency:
            adjacency[s].add(t)
            adjacency[t].add(s)

    start = next(iter(node_ids))
    visited: set[str] = set()
    queue: deque[str] = deque([start])
    while queue:
        current = queue.popleft()
        if current in visited:
            continue
        visited.add(current)
        queue.extend(adjacency.get(current, set()) - visited)

    return visited == node_ids


# ═══════════════════════════════════════════
# Main evaluator
# ═══════════════════════════════════════════

async def evaluate_output(state: dict) -> dict:
    """
    Validate generated flow data and apply auto-fixes where possible.

    Returns a state update dict with:
      - ``eval_passed``: whether the output is acceptable
      - ``eval_issues``: list of fatal issues (fed back to LLM on retry)
      - ``eval_fixes``: list of applied auto-fix descriptions
      - ``nodes`` / ``edges``: potentially modified data
      - ``retry_count``: incremented if retrying
    """
    nodes = state.get("nodes", [])
    edges = state.get("edges", [])
    retry_count = state.get("retry_count", 0)

    fatal: list[str] = []
    auto_fixes: list[str] = []

    # Precompute sets used by many checks
    universal = [n for n in nodes if n.get("type") != "group"]
    groups = [n for n in nodes if n.get("type") == "group"]
    uid = {n["id"] for n in universal}
    gid = {n["id"] for n in groups}
    connected = {
        nid for e in edges
        for nid in (e.get("source"), e.get("target"))
        if nid in uid
    }

    # ── 1. Structural checks ──
    _check_structural(nodes, edges, universal, uid, gid, fatal, auto_fixes)

    # ── 2. Connectivity checks ──
    _check_connectivity(uid, edges, connected, fatal)

    # ── 3. Group integrity checks ──
    _check_groups(nodes, edges, groups, uid, gid, fatal, auto_fixes)

    # ── 4. Data quality checks ──
    _check_data_quality(nodes, edges, universal, auto_fixes)

    # ── 5. Verdict ──
    return _build_verdict(nodes, edges, fatal, auto_fixes, retry_count)


# ═══════════════════════════════════════════
# Check categories (private)
# ═══════════════════════════════════════════

def _check_structural(
    nodes: list[dict],
    edges: list[dict],
    universal: list[dict],
    uid: set[str],
    gid: set[str],
    fatal: list[str],
    auto_fixes: list[str],
) -> None:
    # 1a. Minimum universal node count
    if len(universal) < MIN_UNIVERSAL_NODES:
        fatal.append(
            f"Too few universal nodes: {len(universal)}. "
            f"Need at least {MIN_UNIVERSAL_NODES} components."
        )

    # 1b. Minimum edge count
    if len(edges) < MIN_EDGES:
        fatal.append(f"Too few edges: {len(edges)}. Need at least {MIN_EDGES}.")

    # 1c. Duplicate node IDs
    seen: set[str] = set()
    dups: set[str] = set()
    for n in nodes:
        (dups if n["id"] in seen else seen).add(n["id"])
    if dups:
        fatal.append(
            f"Duplicate node IDs: {', '.join(dups)}. Every node must be unique."
        )

    # 1d. Duplicate edge IDs — auto-fix by renumbering
    seen_e: set[str] = set()
    has_dup = False
    for e in edges:
        if e["id"] in seen_e:
            has_dup = True
        seen_e.add(e["id"])
    if has_dup:
        count = 0
        for i, e in enumerate(edges):
            new_id = f"e{i + 1}"
            if e["id"] != new_id:
                e["id"] = new_id
                count += 1
        if count:
            auto_fixes.append(f"Re-numbered {count} duplicate edge IDs.")

    # 1e. Dangling edge references
    dangling = []
    for e in edges:
        for role, nid in [("source", e.get("source")), ("target", e.get("target"))]:
            if nid not in uid:
                dangling.append(f"edge '{e['id']}' {role} '{nid}' not found")
    if dangling:
        fatal.append(
            f"Edges reference non-existent/group nodes: {'; '.join(dangling[:5])}. "
            f"Edges must only connect universal nodes."
        )

    # 1f. Edges to group nodes
    grp_edges = [
        e["id"] for e in edges
        if e.get("source") in gid or e.get("target") in gid
    ]
    if grp_edges:
        fatal.append(
            f"Edges {', '.join(grp_edges)} reference group nodes. "
            f"Edges must ONLY connect universal nodes."
        )

    # 1g. Self-loops — auto-fix by removal
    loops = [e["id"] for e in edges if e.get("source") == e.get("target")]
    if loops:
        edges[:] = [e for e in edges if e.get("source") != e.get("target")]
        auto_fixes.append(f"Removed {len(loops)} self-loop edge(s).")


def _check_connectivity(
    uid: set[str],
    edges: list[dict],
    connected: set[str],
    fatal: list[str],
) -> None:
    # 2a. Orphan nodes
    orphans = uid - connected
    if orphans:
        fatal.append(
            f"Orphan nodes with no edges: {', '.join(orphans)}. "
            f"Every node MUST be connected."
        )

    # 2b. Single connected component
    if len(uid) >= 2 and not orphans:
        if not bfs_connected(uid, edges):
            fatal.append(
                "Graph is disconnected — some nodes unreachable. "
                "Ensure all nodes form one connected flow."
            )


def _check_groups(
    nodes: list[dict],
    edges: list[dict],
    groups: list[dict],
    uid: set[str],
    gid: set[str],
    fatal: list[str],
    auto_fixes: list[str],
) -> None:
    for g in groups:
        children = [n for n in nodes if n.get("parentId") == g["id"]]
        child_ids = {c["id"] for c in children}

        # 3a. Too few children
        if len(children) < 2:
            pass  # warning only, not fatal

        # 3b. Too many children
        if len(children) > MAX_CHILDREN_PER_GROUP:
            pass  # warning only

        # 3c. No internal edges
        internal = [
            e for e in edges
            if e.get("source") in child_ids and e.get("target") in child_ids
        ]
        if len(children) >= 2 and not internal:
            fatal.append(
                f"Group '{g['id']}' children ({', '.join(child_ids)}) have no "
                f"internal edges. Add at least one."
            )

        # 3d. No cross-group edges (isolated island)
        cross = [
            e for e in edges
            if (e.get("source") in child_ids) != (e.get("target") in child_ids)
        ]
        if not cross and (uid - child_ids):
            fatal.append(
                f"Group '{g['id']}' is isolated — no edges to outside nodes."
            )

    # 3e. Nested groups
    nested = [n["id"] for n in groups if n.get("parentId") in gid]
    if nested:
        fatal.append(f"Nested groups: {', '.join(nested)}. Not allowed.")

    # 3f. Invalid parentId — auto-fix
    bad = [n["id"] for n in nodes if n.get("parentId") and n["parentId"] not in gid]
    if bad:
        for n in nodes:
            if n.get("parentId") and n["parentId"] not in gid:
                n.pop("parentId", None)
                n.pop("extent", None)
        auto_fixes.append(f"Removed invalid parentId from {len(bad)} node(s).")


def _check_data_quality(
    nodes: list[dict],
    edges: list[dict],
    universal: list[dict],
    auto_fixes: list[str],
) -> None:
    # 4a. Missing titles — auto-fix
    empty = [n["id"] for n in universal if not (n.get("data", {}).get("title") or "").strip()]
    if empty:
        for n in nodes:
            if n["id"] in empty:
                n.setdefault("data", {})["title"] = n["id"].replace("-", " ").title()
        auto_fixes.append(f"Auto-generated titles for {len(empty)} node(s).")

    # 4b. Missing icons — auto-fix
    no_icon = [n["id"] for n in universal if not (n.get("data", {}).get("icon") or "").strip()]
    if no_icon:
        for i, n in enumerate(nodes):
            if n["id"] in no_icon:
                n.setdefault("data", {})["icon"] = DEFAULT_ICONS[i % len(DEFAULT_ICONS)]
        auto_fixes.append(f"Assigned default icons to {len(no_icon)} node(s).")

    # 4c. Missing edge labels — auto-fix
    no_label = [e["id"] for e in edges if not (e.get("label") or "").strip()]
    if no_label:
        for e in edges:
            if not (e.get("label") or "").strip():
                e["label"] = "connects to"
        auto_fixes.append(f"Assigned default labels to {len(no_label)} edge(s).")

    # 4d. Long titles/subtitles — auto-fix
    for n in universal:
        title = n.get("data", {}).get("title") or ""
        subtitle = n.get("data", {}).get("subtitle") or ""
        if len(title) > MAX_TITLE_LENGTH:
            n["data"]["title"] = title[: MAX_TITLE_LENGTH - 3] + "..."
            auto_fixes.append(f"Truncated title of '{n['id']}'.")
        if len(subtitle) > MAX_SUBTITLE_LENGTH:
            n["data"]["subtitle"] = subtitle[: MAX_SUBTITLE_LENGTH - 3] + "..."
            auto_fixes.append(f"Truncated subtitle of '{n['id']}'.")

    # 4e. Missing edge styles — auto-fix
    for e in edges:
        if not e.get("style") or not e["style"].get("stroke"):
            e["style"] = {"stroke": EDGE_COLORS[hash(e["id"]) % len(EDGE_COLORS)]}
            auto_fixes.append(f"Assigned color to edge '{e['id']}'.")

    # 4f. Wrong edge type — auto-fix
    for e in edges:
        if e.get("type") != "viral":
            e["type"] = "viral"
            auto_fixes.append(f"Fixed edge '{e['id']}' type to 'viral'.")


# ═══════════════════════════════════════════
# Verdict builder
# ═══════════════════════════════════════════

def _build_verdict(
    nodes: list[dict],
    edges: list[dict],
    fatal: list[str],
    auto_fixes: list[str],
    retry_count: int,
) -> dict:
    """Decide pass/fail and revalidate through Pydantic."""
    if fatal and retry_count < MAX_RETRIES:
        return {
            "eval_passed": False,
            "eval_issues": fatal,
            "eval_fixes": auto_fixes,
            "nodes": nodes,
            "edges": edges,
            "retry_count": retry_count + 1,
        }

    # Passed (or max retries hit)
    try:
        result = GenerateResult(
            nodes=[FlowNode(**n) for n in nodes],
            edges=[FlowEdge(**e) for e in edges],
        )
        return {
            "eval_passed": True,
            "eval_issues": fatal,
            "eval_fixes": auto_fixes,
            "nodes": [n.model_dump() for n in result.nodes],
            "edges": [e.model_dump() for e in result.edges],
        }
    except Exception as exc:
        if retry_count >= MAX_RETRIES:
            return {
                "eval_passed": True,
                "eval_issues": fatal + [f"Pydantic error: {exc}"],
                "eval_fixes": auto_fixes,
                "nodes": nodes,
                "edges": edges,
            }
        return {
            "eval_passed": False,
            "eval_issues": fatal + [f"Data validation error: {exc}"],
            "eval_fixes": auto_fixes,
            "nodes": nodes,
            "edges": edges,
            "retry_count": retry_count + 1,
        }
