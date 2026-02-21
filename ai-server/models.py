"""
Pydantic schemas + SQLModel ORM for Flow generation.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field
from sqlmodel import SQLModel, Field as SQLField, Column
from sqlalchemy import Text


# ═══════════════════════════════════════════
# Pydantic schemas (API request / response)
# ═══════════════════════════════════════════

class FlowNodeData(BaseModel):
    """Data payload for a universal node."""
    title: str = "Node"
    subtitle: Optional[str] = None
    icon: Optional[str] = None
    label: Optional[str] = None  # used for group nodes


class FlowNodeStyle(BaseModel):
    """Inline style for group nodes."""
    width: Optional[int] = None
    height: Optional[int] = None
    backgroundColor: Optional[str] = None
    border: Optional[str] = None
    borderRadius: Optional[str] = None
    color: Optional[str] = None
    fontWeight: Optional[str] = None
    padding: Optional[str] = None


class FlowNode(BaseModel):
    """A single React Flow node (no position — layout computed on frontend)."""
    id: str
    type: str = "universal"  # "universal" | "group"
    data: FlowNodeData
    parentId: Optional[str] = None
    extent: Optional[str] = None  # "parent" for child nodes
    style: Optional[FlowNodeStyle] = None  # only for group nodes


class FlowEdgeStyle(BaseModel):
    stroke: Optional[str] = None


class FlowEdge(BaseModel):
    """A single React Flow edge."""
    id: str
    source: str
    target: str
    type: str = "viral"
    label: Optional[str] = None
    style: Optional[FlowEdgeStyle] = None


class GenerateRequest(BaseModel):
    """Incoming request from the frontend."""
    prompt: str = Field(..., min_length=1, max_length=4000)


class GenerateResult(BaseModel):
    """Final result returned to the frontend."""
    nodes: list[FlowNode]
    edges: list[FlowEdge]


# ═══════════════════════════════════════════
# SSE event types
# ═══════════════════════════════════════════

class SSEStatusEvent(BaseModel):
    type: str = "status"
    step: str
    message: str


class SSEResultEvent(BaseModel):
    type: str = "result"
    nodes: list[FlowNode]
    edges: list[FlowEdge]


class SSEErrorEvent(BaseModel):
    type: str = "error"
    message: str


# ═══════════════════════════════════════════
# SQLModel ORM — FlowRecord (SQLite)
# ═══════════════════════════════════════════

class FlowRecord(SQLModel, table=True):
    """Persisted flow generation record."""
    __tablename__ = "flow_records"

    id: str = SQLField(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
    )
    prompt: str
    nodes_json: str = SQLField(sa_column=Column(Text))
    edges_json: str = SQLField(sa_column=Column(Text))
    created_at: datetime = SQLField(
        default_factory=lambda: datetime.now(timezone.utc),
    )
