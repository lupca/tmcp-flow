"""
SQLite database setup with SQLModel.
"""

import json
from sqlmodel import SQLModel, Session, create_engine

from models import FlowRecord, FlowNode, FlowEdge

# ── Engine ──
DATABASE_URL = "sqlite:///flow_records.db"
engine = create_engine(DATABASE_URL, echo=False)


def init_db():
    """Create all tables if they don't exist."""
    SQLModel.metadata.create_all(engine)


def save_flow_record(
    prompt: str,
    nodes: list[FlowNode],
    edges: list[FlowEdge],
) -> FlowRecord:
    """Persist a generation result and return the record."""
    record = FlowRecord(
        prompt=prompt,
        nodes_json=json.dumps([n.model_dump() for n in nodes]),
        edges_json=json.dumps([e.model_dump() for e in edges]),
    )
    with Session(engine) as session:
        session.add(record)
        session.commit()
        session.refresh(record)
    return record
