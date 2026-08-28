import os
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
CONTEXT_ENGINE_PORT: int = int(os.getenv("CONTEXT_ENGINE_PORT", "8083"))

if not GOOGLE_API_KEY:
    raise ValueError(
        "GOOGLE_API_KEY is not set. "
        "Copy .env.example to .env and add your Gemini API key from "
        "https://aistudio.google.com/app/apikey"
    )
