# Context Engine container

Build from this directory:

```bash
docker build -t orchestrix-context-engine:local .
```

Run it with the Gemini key supplied at runtime:

```bash
docker run --rm --env-file /path/to/context-engine.env -p 8083:8083 orchestrix-context-engine:local
```

The environment file needs `GOOGLE_API_KEY=...`. Keep it outside the image and out of version control. On AWS, inject the key through Secrets Manager. The service listens on port 8083; `GET /` is the container health check and `POST /summarize` provides summaries. The health check tests that the HTTP server responds, not that Gemini is available.

`/summarize` has no authentication of its own. Keep this container on a private network and allow Core API to call it through the authenticated `/api/ai/summarize` endpoint. Do not publish port 8083 publicly in production.
