"""
FastAPI application — AI Flow generator with SSE streaming.
Run: uvicorn main:app --reload --port 8000
"""

import json
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from config import CORS_ORIGINS
from models import GenerateRequest, FlowNode, FlowEdge
from database import init_db, save_flow_record
from pipeline import run_agent_stream


# ── Lifespan: initialize DB on startup ──
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    print("✅ Database initialized")
    yield


app = FastAPI(
    title="TikTok Flow Studio — AI Backend",
    version="1.0.0",
    lifespan=lifespan,
)


# ── CORS — allow frontend dev servers ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════
# Endpoints
# ═══════════════════════════════════════════

@app.get("/api/ai/health")
async def health():
    return {"status": "ok", "service": "ai-backend"}


@app.post("/api/ai/generate")
async def generate_flow(request: GenerateRequest):
    """
    Generate a React Flow diagram from a text prompt.
    Streams SSE events: status updates → final result.
    """

    async def event_stream():
        nodes_result = []
        edges_result = []

        async for event in run_agent_stream(request.prompt):
            # Forward event as SSE
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

            # Capture final result for DB persistence
            if event.get("type") == "result":
                nodes_result = event.get("nodes", [])
                edges_result = event.get("edges", [])

        # Persist to SQLite after streaming completes
        if nodes_result:
            try:
                save_flow_record(
                    prompt=request.prompt,
                    nodes=[FlowNode(**n) for n in nodes_result],
                    edges=[FlowEdge(**e) for e in edges_result],
                )
            except Exception as e:
                print(f"⚠️  Failed to save record: {e}")

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Run directly ──
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
