"""
summarizer.py — LangChain summarization chain using Google Gemini Flash.

Strategy:
  - <= 80 messages -> "stuff" (single prompt, fast)
  - >  80 messages -> "map_reduce" (chunk -> summarize each -> combine)
"""

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from config import GOOGLE_API_KEY


# ── LLM ──────────────────────────────────────────────────────────────────────

def _build_llm() -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(
        model="gemini-3.5-flash-lite",
        google_api_key=GOOGLE_API_KEY,
        temperature=0.3,
    )


# ── Prompt templates ──────────────────────────────────────────────────────────

# Used for "stuff" strategy (all messages in one prompt)
STUFF_PROMPT = PromptTemplate(
    input_variables=["text"],
    template="""You are an intelligent research assistant for the Orchestrix platform.
A research team has asked you to summarize a selected range of their chat messages.

Analyze the following chat messages and provide:
1. A concise summary of what was discussed.
2. The key points or decisions made.
3. Any action items or tasks mentioned.

Chat Messages:
{text}

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{{
  "summary": "A 2-4 sentence summary of what was discussed.",
  "key_points": ["key point 1", "key point 2", "key point 3"],
  "action_items": ["action item 1", "action item 2"]
}}"""
)

# Used for each chunk in "map_reduce" strategy
MAP_PROMPT = PromptTemplate(
    input_variables=["text"],
    template="""Summarize this portion of a research team chat conversation.
Focus on decisions, findings, and tasks mentioned.

Chat segment:
{text}

Write a concise paragraph summary:"""
)

# Used to combine chunk summaries in "map_reduce" strategy
COMBINE_PROMPT = PromptTemplate(
    input_variables=["text"],
    template="""You are an intelligent research assistant for the Orchestrix platform.
The following are summaries of different portions of a research team chat.
Combine them into a single cohesive analysis.

Summaries:
{text}

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{{
  "summary": "A 2-4 sentence summary of what was discussed.",
  "key_points": ["key point 1", "key point 2", "key point 3"],
  "action_items": ["action item 1", "action item 2"]
}}"""
)


# ── Main function ─────────────────────────────────────────────────────────────

def _format_messages(messages: list[dict]) -> str:
    """Convert list of message dicts to a readable chat transcript."""
    lines = []
    for msg in messages:
        sender = msg.get("senderName", "Unknown")
        content = msg.get("content", "")
        timestamp = msg.get("createdAt", "")
        time_label = ""
        if timestamp:
            try:
                from datetime import datetime
                dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                time_label = f" [{dt.strftime('%H:%M')}]"
            except Exception:
                pass
        lines.append(f"{sender}{time_label}: {content}")
    return "\n".join(lines)


def _chunk_messages(messages: list[dict], chunk_size: int = 40) -> list[list[dict]]:
    """Split large message lists into chunks for map_reduce."""
    return [messages[i : i + chunk_size] for i in range(0, len(messages), chunk_size)]


def _extract_text(res) -> str:
    if hasattr(res, "content"):
        content = res.content
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            texts = []
            for item in content:
                if isinstance(item, str):
                    texts.append(item)
                elif isinstance(item, dict) and "text" in item:
                    texts.append(item["text"])
            return "\n".join(texts)
    return str(res)


def summarize_messages(messages: list[dict]) -> dict:
    """
    Summarize a list of chat message dicts using LangChain & Gemini.
    Returns a dict with keys: summary, key_points, action_items, message_count, strategy.
    """
    import json

    message_count = len(messages)

    if not GOOGLE_API_KEY or GOOGLE_API_KEY.startswith("YOUR_"):
        return {
            "summary": "Google Gemini API Key is missing. Please set GOOGLE_API_KEY in backend/context-engine/.env to enable AI summarization.",
            "key_points": ["Set GOOGLE_API_KEY in backend/context-engine/.env"],
            "action_items": ["Get free Gemini API Key from https://aistudio.google.com/app/apikey"],
            "message_count": message_count,
            "strategy": "missing_api_key",
        }

    llm = _build_llm()

    if message_count == 0:
        return {
            "summary": "No messages selected.",
            "key_points": [],
            "action_items": [],
            "message_count": 0,
            "strategy": "none",
        }

    # ── Stuff strategy (<= 80 messages) ───────────────────────────────────────
    if message_count <= 80:
        chat_text = _format_messages(messages)
        formatted_prompt = STUFF_PROMPT.format(text=chat_text)
        res = llm.invoke(formatted_prompt)
        result_text = _extract_text(res)
        strategy = "stuff"

    # ── Map-Reduce strategy (> 80 messages) ──────────────────────────────────
    else:
        chunks = _chunk_messages(messages, chunk_size=40)
        chunk_summaries = []
        for chunk in chunks:
            chunk_text = _format_messages(chunk)
            formatted_map = MAP_PROMPT.format(text=chunk_text)
            res = llm.invoke(formatted_map)
            chunk_summaries.append(_extract_text(res))
        
        combined_text = "\n\n".join(chunk_summaries)
        formatted_combine = COMBINE_PROMPT.format(text=combined_text)
        res = llm.invoke(formatted_combine)
        result_text = _extract_text(res)
        strategy = "map_reduce"

    # ── Parse JSON output ────────────────────────────────────────────────────
    try:
        clean = result_text.strip()
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        parsed = json.loads(clean.strip())
    except json.JSONDecodeError:
        parsed = {
            "summary": result_text.strip(),
            "key_points": [],
            "action_items": [],
        }

    return {
        "summary": parsed.get("summary", ""),
        "key_points": parsed.get("key_points", []),
        "action_items": parsed.get("action_items", []),
        "message_count": message_count,
        "strategy": strategy,
    }
