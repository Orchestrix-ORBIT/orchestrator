"""Optional live Gemini check. Run only with a configured key and network access."""

import asyncio
import sys
from pathlib import Path
from unittest.mock import patch

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from main import app
from summarizer import GOOGLE_API_KEY


async def run_inline(function, *args, **kwargs):
    return function(*args, **kwargs)


async def main():
    if not GOOGLE_API_KEY or GOOGLE_API_KEY.startswith("YOUR_"):
        raise SystemExit("Set GOOGLE_API_KEY in .env before the live check")

    # Running sync route handlers inline avoids worker-thread stalls in restricted environments.
    with patch("fastapi.routing.run_in_threadpool", run_inline):
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://testserver", timeout=30
        ) as client:
            response = await client.post("/summarize", json={
                "messages": [{
                    "senderName": "Researcher",
                    "content": "We agreed to review the prototype on Friday and send notes afterward.",
                }],
            })

    if response.status_code != 200:
        raise SystemExit(f"Live /summarize check failed with HTTP {response.status_code}")

    result = response.json()
    if not (
        result.get("strategy") == "stuff"
        and result.get("message_count") == 1
        and isinstance(result.get("summary"), str)
        and bool(result["summary"])
        and isinstance(result.get("key_points"), list)
        and isinstance(result.get("action_items"), list)
    ):
        raise SystemExit("Live /summarize response did not match the expected shape")

    print("Live /summarize check passed (HTTP 200, one message, summary present)")


if __name__ == "__main__":
    asyncio.run(main())
