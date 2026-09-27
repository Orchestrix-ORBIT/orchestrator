# Realtime service container

Build the Java 21 Spring Boot service from this directory:

```bash
docker build -t orchestrix-realtime:local .
```

The image contains only the Realtime application. It uses the same existing PostgreSQL database as Core API. Supply these runtime environment variables:

| Variable | Purpose |
| --- | --- |
| `SPRING_DATASOURCE_URL` | JDBC URL for the database reachable from the container |
| `SPRING_DATASOURCE_USERNAME` | Database user |
| `SPRING_DATASOURCE_PASSWORD` | Database password |
| `JWT_SECRET` | The same JWT signing secret used by Core API |

Inject these through your deployment platform or a local, untracked environment file. For example:

```bash
docker run --rm --env-file /path/to/realtime.env -p 8082:8082 orchestrix-realtime:local
```

The SockJS/WebSocket endpoint is `/ws`; the chat history API is under `/api/chat`. Use a database hostname reachable from inside Docker because `localhost` in the JDBC URL refers to this container. Core API owns the database migrations, so start it against the shared database before Realtime when setting up a new environment. Realtime currently uses Spring's in-memory simple message broker; run one Realtime replica until cross-instance message delivery is implemented.
