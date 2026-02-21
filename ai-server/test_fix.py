"""Quick test for fix_parent_child — all 3 layers."""
from postprocessors import fix_parent_child


def _show(label, nodes, edges):
    print(f"\n=== {label} ===")
    for n in nodes:
        pid = n.get("parentId")
        t = n.get("type")
        name = n.get("data", {}).get("title") or n.get("data", {}).get("label") or n["id"]
        if t == "group":
            children = [m["id"] for m in nodes if m.get("parentId") == n["id"]]
            print(f"  GROUP '{name}' -> children: {children}")
        else:
            print(f"  NODE  '{name}' -> parentId={pid}")
    print(f"  Edges kept: {len(edges)}")
    has_children = any(n.get("parentId") for n in nodes if n.get("type") != "group")
    print("  RESULT:", "PASS" if has_children else "FAIL")


# ── Test 1: User's bug (parentId=null everywhere, no group edges) ──
n1 = [
    {"id": "data-ingestion", "type": "universal", "data": {"title": "Data Ingestion"}, "parentId": None},
    {"id": "feature-engineering", "type": "universal", "data": {"title": "Feature Engineering"}, "parentId": None},
    {"id": "model-training", "type": "universal", "data": {"title": "Model Training"}, "parentId": None},
    {"id": "model-registry", "type": "universal", "data": {"title": "Model Registry"}, "parentId": None},
    {"id": "ab-testing", "type": "universal", "data": {"title": "A/B Testing", "subtitle": "experimentation"}, "parentId": None},
    {"id": "model-serving", "type": "universal", "data": {"title": "Model Serving", "subtitle": "deployment"}, "parentId": None},
    {"id": "data-pipeline-cluster", "type": "group", "data": {"label": "Data Pipeline Cluster"}, "parentId": None},
    {"id": "model-development-cluster", "type": "group", "data": {"label": "Model Development Cluster"}, "parentId": None},
    {"id": "deployment-experimentation-cluster", "type": "group", "data": {"label": "Deployment & Experimentation Cluster"}, "parentId": None},
]
e1 = [
    {"id": "e1", "source": "data-ingestion", "target": "feature-engineering", "type": "viral"},
    {"id": "e2", "source": "feature-engineering", "target": "model-training", "type": "viral"},
    {"id": "e3", "source": "model-training", "target": "model-registry", "type": "viral"},
    {"id": "e4", "source": "model-registry", "target": "ab-testing", "type": "viral"},
    {"id": "e5", "source": "ab-testing", "target": "model-serving", "type": "viral"},
    {"id": "e6", "source": "model-registry", "target": "model-serving", "type": "viral"},
    {"id": "e7", "source": "ab-testing", "target": "model-training", "type": "viral"},
]
fn1, fe1 = fix_parent_child(n1, e1)
_show("Test 1: Orphan groups (user bug)", fn1, fe1)

# ── Test 2: LLM uses children array (ideal new-format response) ──
n2 = [
    {"id": "src", "type": "universal", "data": {"title": "Source Code"}},
    {"id": "k8s", "type": "group", "data": {"label": "K8s Cluster"}, "children": ["pod", "svc"]},
    {"id": "pod", "type": "universal", "data": {"title": "Pod"}},
    {"id": "svc", "type": "universal", "data": {"title": "Service"}},
]
e2 = [{"id": "e1", "source": "src", "target": "pod", "type": "viral"}]
fn2, fe2 = fix_parent_child(n2, e2)
_show("Test 2: children array (new format)", fn2, fe2)

# ── Test 3: LLM uses edges to groups (old bug) ──
n3 = [
    {"id": "g1", "type": "group", "data": {"label": "Cluster"}},
    {"id": "n1", "type": "universal", "data": {"title": "Pod"}},
    {"id": "n2", "type": "universal", "data": {"title": "Svc"}},
    {"id": "n3", "type": "universal", "data": {"title": "External"}},
]
e3 = [
    {"id": "e1", "source": "n1", "target": "g1", "label": "belongs to"},
    {"id": "e2", "source": "g1", "target": "n2", "label": "contains"},
    {"id": "e3", "source": "n3", "target": "n1", "label": "calls"},
]
fn3, fe3 = fix_parent_child(n3, e3)
_show("Test 3: Edges to groups (old bug)", fn3, fe3)
