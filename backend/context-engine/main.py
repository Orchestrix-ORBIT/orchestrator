"""
main.py — Orchestrix Context Engine
FastAPI microservice that exposes a /summarize endpoint powered by LangChain + Gemini Flash.

Port: 8083 (configured via .env)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import traceback

from summarizer import summarize_messages
from config import CONTEXT_ENGINE_PORT

# ── App setup ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Orchestrix Context Engine",
    description="LangChain-powered chat summarization microservice",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response models ─────────────────────────────────────────────────

class ChatMessageItem(BaseModel):
    senderName: str
    content: str
    createdAt: Optional[str] = None


class SummarizeRequest(BaseModel):
    messages: list[ChatMessageItem]
    projectId: Optional[str] = None
    tenantId: Optional[str] = None


class SummarizeResponse(BaseModel):
    summary: str
    key_points: list[str]
    action_items: list[str]
    message_count: int
    strategy: str


# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
def health_check():
    return {
        "status": "ok",
        "service": "context-engine",
        "version": "1.0.0",
        "llm": "gemini-1.5-flash",
    }


@app.post("/summarize", response_model=SummarizeResponse)
def summarize(request: SummarizeRequest):
    """
    Summarize a selected range of chat messages using LangChain + Gemini Flash.

    Body:
        messages  — list of { senderName, content, createdAt } objects
        projectId — optional project UUID (for logging)
        tenantId  — optional tenant slug (for logging)

    Returns:
        summary      — 2–4 sentence summary
        key_points   — list of key decisions / findings
        action_items — list of tasks / next steps
        message_count — number of messages processed
        strategy     — 'stuff' or 'map_reduce'
    """
    if not request.messages:
        raise HTTPException(status_code=400, detail="No messages provided.")

    if len(request.messages) > 500:
        raise HTTPException(
            status_code=400,
            detail="Too many messages. Please select 500 or fewer messages.",
        )

    try:
        messages_as_dicts = [
            {
                "senderName": m.senderName,
                "content": m.content,
                "createdAt": m.createdAt or "",
            }
            for m in request.messages
        ]

        result = summarize_messages(messages_as_dicts)
        return SummarizeResponse(**result)

    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"LLM summarization failed: {str(e)}",
        )


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=CONTEXT_ENGINE_PORT, reload=True)
