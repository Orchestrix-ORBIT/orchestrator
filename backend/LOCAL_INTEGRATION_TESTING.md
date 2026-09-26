# Local PostgreSQL integration tests

These tests use a temporary PostgreSQL container on `127.0.0.1:55432`. They do not connect to Supabase. The container has no persistent volume; stopping it removes its test data.

## Run

Start a fresh database from the `backend` directory:

```bash
docker run --rm -d --name orchestrix-integration-pg \
  --publish 127.0.0.1:55432:5432 \
  --env POSTGRES_USER=orchestrix_test \
  --env POSTGRES_PASSWORD=orchestrix_test_only \
  --env POSTGRES_DB=orchestrix_test \
  postgres:16-alpine
docker exec orchestrix-integration-pg pg_isready -U orchestrix_test -d orchestrix_test
```

Set a JDK 21 `JAVA_HOME`, then point Spring explicitly at this local database:

```bash
export JAVA_HOME=/path/to/jdk-21
export SPRING_DATASOURCE_URL='jdbc:postgresql://127.0.0.1:55432/orchestrix_test?sslmode=disable'
export SPRING_DATASOURCE_USERNAME=orchestrix_test
export SPRING_DATASOURCE_PASSWORD=orchestrix_test_only
export SPRING_DATASOURCE_HIKARI_DATA_SOURCE_PROPERTIES_SSLMODE=disable
```

Run Core API first so Flyway creates public tables and the tenant schema, then run realtime:

```bash
(cd core-api && ./mvnw test && ./mvnw -Dtest=TenantMigrationIT,CoreApiHttpIT test)
(cd realtime-service && ./mvnw test && ./mvnw -Dtest=ChatDatabaseIT,ChatStompIT test)
```

To run the frontend and chat-to-context-engine flow, install the frontend npm dependencies and context-engine Python dependencies, build both service jars, then run the guarded script from the repository root:

```bash
(cd core-api && ./mvnw -DskipTests package)
(cd realtime-service && ./mvnw -DskipTests package)
cd ..
npm ci --prefix frontend/orchestrix_orbit_frontend
python3 -m venv backend/context-engine/venv
backend/context-engine/venv/bin/python -m pip install -r backend/context-engine/requirements-test.txt
CONTEXT_PYTHON="$PWD/backend/context-engine/venv/bin/python" bash backend/run_cross_service_integration.sh
```

The script requires the exact isolated JDBC URL, starts Core API, realtime, and the real context-engine HTTP route with a deterministic Gemini substitute, and stops the services afterward. Each run creates a unique tenant in the disposable database; stopping the container removes it.

When finished:

```bash
docker stop orchestrix-integration-pg
```

`TenantMigrationIT`, `CoreApiHttpIT`, `ChatDatabaseIT`, and `ChatStompIT` are opt-in tests. They run only when `SPRING_DATASOURCE_URL` points at `127.0.0.1` or `localhost` on port `55432` with database `orchestrix_test`. They are excluded from the regular Maven test naming pattern, and the test data is isolated from Supabase.

## What the checks establish

- `CoreApiApplicationTests` starts Core API and applies its public Flyway migrations to PostgreSQL.
- `TenantMigrationIT` calls `TenantMigrationService`, checks that `users`, `projects`, and `chat_messages` exist in two tenant schemas, and checks that tenant migrations were recorded. The run applied 13 migrations in each schema.
- `CoreApiHttpIT` starts the Core API on a random local port, sends real HTTP requests for registration/login, project and task creation, reads and deletion, verifies role and tenant boundaries, checks database rows, and drops its temporary tenant schemas.
- `ChatDatabaseIT` creates a tenant user and project, sends a message through the realtime controller, reads it back through the controller, checks the tenant table, and removes its fixtures.
- `ChatStompIT` connects two live SockJS/STOMP clients to the running realtime service, sends a message for each tenant using the same project ID, verifies delivery to the correct topic, checks HTTP history and database rows, and removes its fixtures.
- `crossServices.it.test.ts` uses frontend service modules over live HTTP to create and read a project, sends chat over live STOMP, reads it from realtime history, and sends that exact message to the context-engine route. The model call is deterministic; no Gemini key or Supabase connection is used.

On 25 September 2026, `TenantMigrationIT`, `CoreApiHttpIT`, `ChatDatabaseIT`, and `ChatStompIT` passed against a temporary PostgreSQL 16 container. On 26 September, the expanded `ChatStompIT` and authenticated cross-service flow passed locally, including cross-tenant HTTP and STOMP rejection checks. These checks do not prove project-level chat authorization or complete browser-to-backend workflows.
