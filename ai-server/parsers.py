"""
JSON extraction utilities for parsing LLM responses.

The LLM may return JSON wrapped in markdown fences, <think> tags,
or mixed with prose. This module robustly extracts the first valid
JSON object from any of those formats.
"""

import json
import re


def extract_json(text: str) -> dict:
    """
    Extract the first JSON object from an LLM response.

    Attempts (in order):
      1. Strip ``<think>`` blocks, try direct ``json.loads``.
      2. Extract from markdown code fences (```json ... ```).
      3. Brace-matching scan for the first balanced ``{ ... }``.

    Raises ``ValueError`` if no valid JSON found.
    """
    text = _strip_think_tags(text).strip()

    # Fast path: response is already raw JSON
    if text.startswith("{"):
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

    # Markdown code fence
    result = _try_code_fence(text)
    if result is not None:
        return result

    # Brute-force brace matching
    result = _try_brace_match(text)
    if result is not None:
        return result

    raise ValueError(
        f"Could not extract valid JSON from LLM response:\n{text[:500]}"
    )


# ── Internal helpers ──────────────────────

def _strip_think_tags(text: str) -> str:
    """Remove ``<think>...</think>`` blocks (some models emit internal reasoning)."""
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)


def _try_code_fence(text: str) -> dict | None:
    """Try to extract JSON from a markdown code fence."""
    match = re.search(r"```(?:json)?\s*\n?(.*?)```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except json.JSONDecodeError:
            return None
    return None


def _try_brace_match(text: str) -> dict | None:
    """Scan for the first balanced ``{ ... }`` and parse it."""
    depth = 0
    start = None
    for i, ch in enumerate(text):
        if ch == "{":
            if depth == 0:
                start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start is not None:
                try:
                    return json.loads(text[start : i + 1])
                except json.JSONDecodeError:
                    start = None
    return None
