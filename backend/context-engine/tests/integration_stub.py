"""Run the real FastAPI route with a deterministic model boundary for cross-service tests."""

import main


def summarize_without_gemini(messages):
    return {
        "summary": " | ".join(message["content"] for message in messages),
        "key_points": [message["senderName"] for message in messages],
        "action_items": [],
        "message_count": len(messages),
        "strategy": "stuff",
    }


main.summarize_messages = summarize_without_gemini
app = main.app
