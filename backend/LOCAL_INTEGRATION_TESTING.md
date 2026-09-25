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
(cd realtime-service && ./mvnw test && ./mvnw -Dtest=ChatDatabaseIT test)
```

When finished:

```bash
docker stop orchestrix-integration-pg
```

`TenantMigrationIT`, `CoreApiHttpIT`, and `ChatDatabaseIT` are opt-in tests. They run only when `SPRING_DATASOURCE_URL` points at `127.0.0.1` or `localhost` on port `55432` with database `orchestrix_test`. They are excluded from the regular Maven test naming pattern, and the test data is isolated from Supabase.

## What the checks establish

- `CoreApiApplicationTests` starts Core API and applies its public Flyway migrations to PostgreSQL.
- `TenantMigrationIT` calls `TenantMigrationService`, checks that `users`, `projects`, and `chat_messages` exist in a tenant schema, and checks that tenant migrations were recorded. The run applied 13 migrations.
- `CoreApiHttpIT` starts the Core API on a random local port, sends real HTTP requests for registration/login, project and task creation, reads and deletion, verifies role and tenant boundaries, checks database rows, and drops its temporary tenant schemas.
- `ChatDatabaseIT` creates a tenant user and project, sends a message through the realtime controller, reads it back through the controller, checks the tenant table, and removes its fixtures.

On 25 September 2026, `TenantMigrationIT`, `CoreApiHttpIT`, and `ChatDatabaseIT` each passed against a temporary PostgreSQL 16 container, which was then stopped and removed. Earlier local runs also passed the complete Core API suite (117 tests) and realtime suite (22 tests). These checks do not prove live STOMP delivery to a subscribed client or complete browser-to-backend workflows.
