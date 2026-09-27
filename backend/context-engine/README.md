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

`/summarize` currently has no authentication. Place this container on a private network and route requests through an authenticated application endpoint before production use. The frontend currently calls the context engine directly, so that request path must be changed as part of the production deployment.
