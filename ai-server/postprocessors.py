"""
Post-processors for LLM-generated flow data.

Each function takes raw nodes/edges and fixes a specific class of issues.
They run in sequence after the LLM generates output, before the evaluator.
"""

import re

from config import EDGE_COLORS, MAX_CHILDREN_PER_GROUP


# ═══════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════

def _get_children_of(group_id: str, nodes: list[dict]) -> set[str]:
    """Return IDs of nodes whose parentId matches the given group."""
    return {n["id"] for n in nodes if n.get("parentId") == group_id}


def _extract_keywords(text: str) -> set[str]:
    """Extract meaningful lowercase keywords, filtering out noise words."""
    words = set(re.findall(r"[a-z]+", text.lower()))
    words -= {"cluster", "group", "the", "and", "of", "a", "an", "node"}
    return words


def _build_adjacency(edges: list[dict]) -> dict[str, list[str]]:
    """Build bidirectional adjacency list from edges."""
    adj: dict[str, list[str]] = {}
    for e in edges:
        adj.setdefault(e["source"], []).append(e["target"])
        adj.setdefault(e["target"], []).append(e["source"])
    return adj


# ═══════════════════════════════════════════
# Fix 1: Parent-Child Relationships
# ═══════════════════════════════════════════

def fix_parent_child(
    nodes: list[dict], edges: list[dict]
) -> tuple[list[dict], list[dict]]:
    """
    Fix parent-child relationships between group and universal nodes.

    Three layers of defense:
      1. Convert group "children" arrays → parentId on child nodes.
      2. Convert edges to/from groups → parentId (and drop those edges).
      3. Auto-assign unassigned nodes to groups via keyword + adjacency matching.

    Also cleans up weak groups (< 2 children) by dissolving them.
    """
    group_ids = {n["id"] for n in nodes if n.get("type") == "group"}
    node_map = {n["id"]: n for n in nodes}

    # ── Layer 1: "children" arrays → parentId ──
    for n in nodes:
        if n.get("type") == "group":
            for child_id in n.pop("children", None) or []:
                if child_id in node_map and child_id not in group_ids:
                    node_map[child_id]["parentId"] = n["id"]
                    node_map[child_id]["extent"] = "parent"

    # ── Layer 2: Edges to/from groups → parentId ──
    clean_edges = []
    for e in edges:
        src, tgt = e.get("source"), e.get("target")

        if tgt in group_ids and src not in group_ids:
            node_map[src]["parentId"] = tgt
            node_map[src]["extent"] = "parent"
            continue

        if src in group_ids and tgt not in group_ids:
            node_map[tgt]["parentId"] = src
            node_map[tgt]["extent"] = "parent"
            continue

        if src in group_ids and tgt in group_ids:
            continue  # drop group-to-group edges

        clean_edges.append(e)

    # ── Layer 3: Auto-assign via keyword + adjacency matching ──
    adjacency = _build_adjacency(clean_edges)
    all_groups = [n for n in nodes if n.get("type") == "group"]
    unassigned = [
        n for n in nodes
        if n.get("type") != "group" and not n.get("parentId")
    ]

    if all_groups and unassigned:
        _assign_by_keywords(unassigned, all_groups, nodes, adjacency)
        _assign_by_adjacency(all_groups, nodes, adjacency)

    # ── Cleanup ──
    _validate_parent_refs(nodes, group_ids)
    nodes = _dissolve_weak_groups(nodes)

    return nodes, clean_edges


def _assign_by_keywords(
    unassigned: list[dict],
    groups: list[dict],
    all_nodes: list[dict],
    adjacency: dict[str, list[str]],
) -> None:
    """Assign unassigned nodes to groups based on keyword overlap and adjacency."""
    for n in list(unassigned):
        n_title = n.get("data", {}).get("title", "") or ""
        n_sub = n.get("data", {}).get("subtitle", "") or ""
        n_kw = _extract_keywords(f"{n['id']} {n_title} {n_sub}")

        best_score, best_group = 0, None

        for group in groups:
            g_label = group.get("data", {}).get("label", "") or ""
            g_kw = _extract_keywords(f"{group['id']} {g_label}")
            g_children = _get_children_of(group["id"], all_nodes)

            kw_score = len(n_kw & g_kw)
            if kw_score == 0 or len(g_children) >= MAX_CHILDREN_PER_GROUP:
                continue

            neighbors = adjacency.get(n["id"], [])
            adj_score = sum(1 for nb in neighbors if nb in g_children)
            total = kw_score * 2 + adj_score * 3

            if total > best_score:
                best_score = total
                best_group = group

        if best_group and best_score > 0:
            n["parentId"] = best_group["id"]
            n["extent"] = "parent"


def _assign_by_adjacency(
    groups: list[dict],
    all_nodes: list[dict],
    adjacency: dict[str, list[str]],
) -> None:
    """For groups that still have < 2 children, pull in adjacent unassigned nodes."""
    for group in groups:
        if len(_get_children_of(group["id"], all_nodes)) >= 2:
            continue

        still_free = [
            n for n in all_nodes
            if n.get("type") != "group" and not n.get("parentId")
        ]
        for n in still_free:
            if len(_get_children_of(group["id"], all_nodes)) >= MAX_CHILDREN_PER_GROUP:
                break
            neighbors = adjacency.get(n["id"], [])
            if any(nb in _get_children_of(group["id"], all_nodes) for nb in neighbors):
                n["parentId"] = group["id"]
                n["extent"] = "parent"


def _validate_parent_refs(nodes: list[dict], group_ids: set[str]) -> None:
    """Remove parentId references that point to non-existent groups."""
    for n in nodes:
        pid = n.get("parentId")
        if pid:
            if pid not in group_ids:
                n.pop("parentId", None)
                n.pop("extent", None)
            else:
                n["extent"] = "parent"


def _dissolve_weak_groups(nodes: list[dict]) -> list[dict]:
    """Remove groups with fewer than 2 children, freeing their children."""
    children_per_group: dict[str, int] = {}
    for n in nodes:
        if n.get("type") == "group":
            children_per_group[n["id"]] = 0
    for n in nodes:
        pid = n.get("parentId")
        if pid and pid in children_per_group:
            children_per_group[pid] += 1

    weak = {gid for gid, cnt in children_per_group.items() if cnt < 2}

    for n in nodes:
        if n.get("parentId") in weak:
            n.pop("parentId", None)
            n.pop("extent", None)

    return [n for n in nodes if not (n.get("type") == "group" and n["id"] in weak)]


# ═══════════════════════════════════════════
# Fix 2: Orphan Nodes (zero edges)
# ═══════════════════════════════════════════

def fix_orphan_nodes(nodes: list[dict], edges: list[dict]) -> list[dict]:
    """
    Ensure every universal node appears in at least one edge.

    Connection strategy (in priority order):
      1. Sibling in the same group
      2. Any already-connected node (via adjacency)
      3. Nearest neighbour in the node list
    """
    universal_ids = {n["id"] for n in nodes if n.get("type") != "group"}
    if not universal_ids:
        return edges

    connected = {
        nid for e in edges
        for nid in (e.get("source"), e.get("target"))
        if nid in universal_ids
    }
    orphans = universal_ids - connected
    if not orphans:
        return edges

    parent_map = {n["id"]: n["parentId"] for n in nodes if n.get("parentId")}
    group_children: dict[str, list[str]] = {}
    for n in nodes:
        pid = n.get("parentId")
        if pid:
            group_children.setdefault(pid, []).append(n["id"])

    adjacency = _build_adjacency(edges)
    ordered = [n["id"] for n in nodes if n.get("type") != "group"]

    new_edges = list(edges)
    counter = len(edges)

    for orphan_id in orphans:
        target_id = _find_connection_target(
            orphan_id, parent_map, group_children, adjacency, ordered, connected
        )
        if target_id and target_id != orphan_id:
            counter += 1
            new_edges.append({
                "id": f"e-auto-{counter}",
                "source": orphan_id,
                "target": target_id,
                "type": "viral",
                "label": "connects to",
                "style": {"stroke": EDGE_COLORS[counter % len(EDGE_COLORS)]},
            })
            connected.add(orphan_id)

    return new_edges


def _find_connection_target(
    orphan_id: str,
    parent_map: dict[str, str],
    group_children: dict[str, list[str]],
    adjacency: dict[str, list[str]],
    ordered: list[str],
    connected: set[str],
) -> str | None:
    """Find the best node to connect an orphan to."""
    # Strategy 1: sibling in same group
    orphan_parent = parent_map.get(orphan_id)
    if orphan_parent:
        siblings = [
            cid for cid in group_children.get(orphan_parent, [])
            if cid != orphan_id and cid in connected
        ]
        if siblings:
            return siblings[0]

    # Strategy 2: any connected node (prefer adjacency)
    for nid in adjacency:
        if nid in connected and nid != orphan_id:
            return nid

    # Strategy 3: nearest in ordered list
    idx = ordered.index(orphan_id) if orphan_id in ordered else -1
    if idx > 0:
        return ordered[idx - 1]
    if idx == 0 and len(ordered) > 1:
        return ordered[1]

    return None
