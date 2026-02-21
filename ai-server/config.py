"""
Centralized configuration — environment variables, constants, LLM factory.

All magic numbers and external service URLs live here.
"""

import os

from langchain_ollama import ChatOllama


# ═══════════════════════════════════════════
# External services
# ═══════════════════════════════════════════

OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://192.168.1.6:11434")
OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "qwen3:4b-instruct-2507-q4_K_M")

DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///flow_records.db")

CORS_ORIGINS: list[str] = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
]


# ═══════════════════════════════════════════
# Pipeline tuning
# ═══════════════════════════════════════════

MAX_RETRIES: int = 2  # evaluator retry limit before force-accepting output
LLM_CONTEXT_SIZE: int = 8192

# Edge colors palette for auto-generated / fallback edges
EDGE_COLORS: list[str] = [
    "#f97316",
    "#8b5cf6",
    "#06b6d4",
    "#10b981",
    "#ec4899",
    "#a855f7",
    "#eab308",
]

# Default icons when LLM forgets to assign one
DEFAULT_ICONS: list[str] = ["🔧", "📦", "⚙️", "🔗", "📊", "🛠️", "💡", "🔄"]


# ═══════════════════════════════════════════
# Validation thresholds
# ═══════════════════════════════════════════

MIN_UNIVERSAL_NODES: int = 3
MIN_EDGES: int = 2
MAX_CHILDREN_PER_GROUP: int = 4
MIN_CHILDREN_PER_GROUP: int = 2
MAX_TITLE_LENGTH: int = 40
MAX_SUBTITLE_LENGTH: int = 60


# ═══════════════════════════════════════════
# LLM factory
# ═══════════════════════════════════════════


def get_llm(temperature: float = 0.7, json_mode: bool = False) -> ChatOllama:
    """Create a configured ChatOllama instance."""
    kwargs = dict(
        model=OLLAMA_MODEL,
        base_url=OLLAMA_BASE_URL,
        temperature=temperature,
        num_ctx=LLM_CONTEXT_SIZE,
    )
    if json_mode:
        kwargs["format"] = "json"
    return ChatOllama(**kwargs)
