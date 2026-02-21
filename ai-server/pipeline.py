"""
LangGraph pipeline: analyse → generate → evaluate (with retry loop).

This module wires together the LLM calls, post-processors, and evaluator
into a single compiled StateGraph that streams SSE events.
"""

from typing import AsyncGenerator, TypedDict

from langgraph.graph import StateGraph, END

from config import get_llm
from evaluator import evaluate_output
from models import FlowNode, FlowEdge, GenerateResult
from parsers import extract_json
from postprocessors import fix_parent_child, fix_orphan_nodes
from prompts import ANALYZE_SYSTEM_PROMPT, GENERATE_SYSTEM_PROMPT


# ═══════════════════════════════════════════
# Pipeline state
# ═══════════════════════════════════════════

class PipelineState(TypedDict):
    user_prompt: str
    analysis: str
    nodes: list[dict]
    edges: list[dict]
    eval_passed: bool
    eval_issues: list[str]
    eval_fixes: list[str]
    retry_count: int


# ═══════════════════════════════════════════
# Graph nodes (LLM steps)
# ═══════════════════════════════════════════

async def analyze_prompt(state: PipelineState) -> dict:
    """Step 1: Analyse the user's prompt to identify components and relationships."""
    llm = get_llm(temperature=0.3, json_mode=False)
    response = await llm.ainvoke([
        {"role": "system", "content": ANALYZE_SYSTEM_PROMPT},
        {"role": "user", "content": state["user_prompt"]},
    ])
    return {"analysis": response.content}


async def generate_flow_data(state: PipelineState) -> dict:
    """Step 2: Generate React Flow JSON from the analysis, then post-process."""
    llm = get_llm(temperature=0.4, json_mode=True)

    # If retrying, include evaluator feedback
    feedback = ""
    if state.get("retry_count", 0) > 0 and state.get("eval_issues"):
        issues_text = "\n".join(f"- {i}" for i in state["eval_issues"])
        feedback = (
            f"\n\n⚠️ PREVIOUS ATTEMPT HAD THESE PROBLEMS — FIX THEM:\n{issues_text}\n"
            f"Please regenerate the JSON fixing ALL issues above."
        )

    response = await llm.ainvoke([
        {"role": "system", "content": GENERATE_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"Based on this analysis, generate the React Flow JSON:\n\n"
                f"{state['analysis']}\n\n"
                f"Original user request: {state['user_prompt']}"
                f"{feedback}"
            ),
        },
    ])

    data = extract_json(response.content)

    raw_nodes = data.get("nodes", [])
    raw_edges = data.get("edges", [])

    # Post-process: fix parent-child relationships, then orphan nodes
    fixed_nodes, fixed_edges = fix_parent_child(raw_nodes, raw_edges)
    fixed_edges = fix_orphan_nodes(fixed_nodes, fixed_edges)

    # Validate through Pydantic
    result = GenerateResult(
        nodes=[FlowNode(**n) for n in fixed_nodes],
        edges=[FlowEdge(**e) for e in fixed_edges],
    )

    return {
        "nodes": [n.model_dump() for n in result.nodes],
        "edges": [e.model_dump() for e in result.edges],
        "retry_count": state.get("retry_count", 0),
    }


# ═══════════════════════════════════════════
# Conditional edge
# ═══════════════════════════════════════════

def should_retry(state: PipelineState) -> str:
    """Route evaluator output: ``'retry'`` or ``'finish'``."""
    return "finish" if state.get("eval_passed", False) else "retry"


# ═══════════════════════════════════════════
# Graph builder
# ═══════════════════════════════════════════

def build_graph() -> StateGraph:
    """
    Build and compile the LangGraph pipeline::

        analyze_prompt → generate_flow_data → evaluate_output
                                ↑                    │
                                └── retry (if fail) ──┘
                                          │
                                          └── finish (if pass) → END
    """
    workflow = StateGraph(PipelineState)

    workflow.add_node("analyze_prompt", analyze_prompt)
    workflow.add_node("generate_flow_data", generate_flow_data)
    workflow.add_node("evaluate_output", evaluate_output)

    workflow.set_entry_point("analyze_prompt")
    workflow.add_edge("analyze_prompt", "generate_flow_data")
    workflow.add_edge("generate_flow_data", "evaluate_output")

    workflow.add_conditional_edges(
        "evaluate_output",
        should_retry,
        {"retry": "generate_flow_data", "finish": END},
    )

    return workflow.compile()


# Pre-compile (singleton)
agent_graph = build_graph()


# ═══════════════════════════════════════════
# SSE streaming runner
# ═══════════════════════════════════════════

STEP_MESSAGES = {
    "analyze_prompt": "🔍 Đang phân tích yêu cầu...",
    "generate_flow_data": "🧠 Đang sinh sơ đồ từ AI...",
    "evaluate_output": "✅ Đang kiểm tra chất lượng...",
}


async def run_agent_stream(prompt: str) -> AsyncGenerator[dict, None]:
    """
    Run the pipeline and yield SSE event dicts for each step.

    Yields dicts with ``type`` in ``{status, eval, result, error}``.
    """
    try:
        input_state: PipelineState = {
            "user_prompt": prompt,
            "analysis": "",
            "nodes": [],
            "edges": [],
            "eval_passed": False,
            "eval_issues": [],
            "eval_fixes": [],
            "retry_count": 0,
        }

        async for event in agent_graph.astream(input_state, stream_mode="updates"):
            for node_name, node_output in event.items():
                msg = _build_status_message(node_name, node_output)

                yield {"type": "status", "step": node_name, "message": msg}

                # Emit evaluator details
                if node_name == "evaluate_output":
                    yield {
                        "type": "eval",
                        "passed": node_output.get("eval_passed", False),
                        "issues": node_output.get("eval_issues", []),
                        "fixes": node_output.get("eval_fixes", []),
                        "retry": node_output.get("retry_count", 0),
                    }

                    if node_output.get("eval_passed", False):
                        yield {
                            "type": "result",
                            "nodes": node_output.get("nodes", []),
                            "edges": node_output.get("edges", []),
                        }

    except Exception as e:
        yield {"type": "error", "message": str(e)}


def _build_status_message(node_name: str, output: dict) -> str:
    """Build a human-readable SSE status message for a pipeline step."""
    if node_name == "generate_flow_data":
        retry = output.get("retry_count", 0)
        if retry > 0:
            return f"🔄 Đang sinh lại sơ đồ (lần {retry + 1})..."
        return STEP_MESSAGES.get(node_name, f"Completed: {node_name}")

    if node_name == "evaluate_output":
        passed = output.get("eval_passed", False)
        fixes = output.get("eval_fixes", [])
        issues = output.get("eval_issues", [])
        if passed:
            fix_note = f" ({len(fixes)} auto-fix)" if fixes else ""
            return f"✅ Kiểm tra OK!{fix_note}"
        return f"⚠️ Phát hiện {len(issues)} lỗi — đang thử lại..."

    return STEP_MESSAGES.get(node_name, f"Completed: {node_name}")
