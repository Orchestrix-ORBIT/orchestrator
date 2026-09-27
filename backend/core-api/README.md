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

Put these values in a local, untracked environment file or inject them through your deployment platform. For example:

```bash
docker run --rm --env-file /path/to/core-api.env -p 8080:8080 orchestrix-core-api:local
```

Use a database hostname reachable from inside Docker; `localhost` in the JDBC URL refers to the container itself. The image does not include the local `.env` file or PostgreSQL. Core API runs Flyway migrations when it starts, so use a disposable database for local smoke tests and review migrations before connecting a new release to production.
