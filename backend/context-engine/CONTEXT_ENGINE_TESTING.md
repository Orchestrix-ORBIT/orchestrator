# Context engine testing

The context engine has 17 automated tests. They cover request handling, in-process HTTP routing, and summarization logic without making a Gemini API call. Run them from `backend/context-engine` with:

```bash
venv/bin/python -m unittest discover -s tests -v
```

If the virtual environment has not been created, create it and install the application dependencies first:

```bash
python3 -m venv venv
venv/bin/python -m pip install -r requirements-test.txt
```

`unittest` is part of Python. `requirements-test.txt` adds `httpx` for in-process HTTP requests. The suite uses `unittest.mock` to replace the Gemini model and to check that invalid requests never invoke it. It does not need `GOOGLE_API_KEY` or network access.

To repeat the optional live check, set `GOOGLE_API_KEY` in the ignored `.env` file and run this command with network access:

```bash
venv/bin/python tests/live_smoke.py
```

The live check sends one synthetic message through FastAPI's `/summarize` route to Gemini. It prints only the pass/fail status, not the key or summary text.

## Files and test process

| File | Role | Verification |
| --- | --- | --- |
| `main.py` | Defines the FastAPI app, request and response models, health route, `/summarize` route, validation, and error mapping. | `tests/test_main.py` checks the route functions and sends in-process HTTP requests for route selection, validation, serialization, and error mapping. |
| `summarizer.py` | Formats chat messages, splits large selections, calls Gemini, and parses model output. | `tests/test_summarizer.py` checks timestamps, chunk boundaries and order, missing API key behavior, the 80/81-message strategy boundary, fenced JSON, plain-text fallback, and model content blocks. Gemini calls are mocked. |
| `config.py` | Loads the API key and port from the environment. | Tests replace the imported key in `summarizer.py` so local `.env` values cannot change test behavior. Port loading itself is not tested. |
| `requirements.txt` | Lists runtime dependencies. | Supplies FastAPI, Pydantic, and LangChain to both the service and tests. |
| `requirements-test.txt` | Installs runtime dependencies and `httpx` for HTTP tests. | Keeps the test client's dependency explicit. |
| `run.sh` | Creates the virtual environment, installs dependencies, and starts Uvicorn. | Not exercised by the unit suite. |
| `tests/test_main.py` | API route and data model tests. | Six direct route tests and four in-process HTTP tests. HTTP tests run synchronous handlers inline because worker threads stalled in this environment; FastAPI routing, validation, and response serialization are still exercised. |
| `tests/test_summarizer.py` | Summarizer unit tests with a fake model. | Seven tests. |
| `tests/live_smoke.py` | Optional in-process HTTP and live Gemini check. | Sends a synthetic message, then verifies HTTP 200 and the response shape. Excluded from normal unit-test discovery. |

## Verification and limits

The suite was run with the context engine's virtual environment: **17 tests passed**. The live check passed with **HTTP 200**, `strategy=stuff`, and `message_count=1`. `git diff --check` also passed.

The live check verifies that the configured key and model can return a well-shaped response for one synthetic message. It does not judge summary quality or exercise a large `map_reduce` request against the live API. The standard 17-test suite remains deterministic and offline.
