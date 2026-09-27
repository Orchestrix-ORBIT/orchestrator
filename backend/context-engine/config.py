import os
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
CONTEXT_ENGINE_PORT: int = int(os.getenv("CONTEXT_ENGINE_PORT", "8083"))

if not GOOGLE_API_KEY:
    print("[WARNING] GOOGLE_API_KEY is not set in backend/context-engine/.env! Summarization will require a Gemini API Key.")
