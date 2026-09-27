# Core API container

Build the Java 21 Spring Boot service from this directory:

```bash
docker build -t orchestrix-core-api:local .
```

The image contains only the application. It connects to your existing PostgreSQL database and requires these runtime environment variables:

| Variable | Purpose |
| --- | --- |
| `SPRING_DATASOURCE_URL` | JDBC URL for the database reachable from the container |
| `SPRING_DATASOURCE_USERNAME` | Database user |
| `SPRING_DATASOURCE_PASSWORD` | Database password |
| `JWT_SECRET` | JWT signing secret shared with Realtime |
| `ENCRYPTION_SECRET_KEY` | Core API document encryption key |
| `TENANT_BOOTSTRAP_KEY` | Key for first tenant provisioning |
| `CONTEXT_ENGINE_URL` | Private Context Engine base URL, for example `http://context-engine:8083` |

Put these values in a local, untracked environment file or inject them through your deployment platform. For example:

```bash
docker run --rm --env-file /path/to/core-api.env -p 8080:8080 orchestrix-core-api:local
```

Use hostnames reachable from inside Docker; `localhost` refers to the Core API container itself. The image does not include the local `.env` file or PostgreSQL. `GET /health` is available for load balancer checks. `POST /api/ai/summarize` requires a JWT, tenant header, and access to the requested project; it forwards requests to the private Context Engine. Core API runs Flyway migrations when it starts, so use a disposable database for local smoke tests and review migrations before connecting a new release to production. Failed migrations now require explicit repair rather than automatic startup repair.
