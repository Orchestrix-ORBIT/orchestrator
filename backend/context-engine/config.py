import os
from pathlib import Path
from dotenv import load_dotenv

# Search order: local .env -> backend/.env -> workspace root .env
current_dir = Path(__file__).resolve().parent
load_dotenv(current_dir / ".env")
load_dotenv(current_dir.parent / ".env")
load_dotenv(current_dir.parent.parent / ".env")

GOOGLE_API_KEY: str = (
    os.getenv("GOOGLE_API_KEY")
    or os.getenv("GEMINI_API_KEY")
    or ""
).strip()

CONTEXT_ENGINE_PORT: int = int(os.getenv("CONTEXT_ENGINE_PORT", "8083"))

if not GOOGLE_API_KEY:
    print("[WARNING] GOOGLE_API_KEY is not set in environment! Summarization will require a Gemini API Key.")
