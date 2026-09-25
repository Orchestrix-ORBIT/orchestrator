# Integration testing

## Current evidence

| Check | Status | What it establishes |
| --- | --- | --- |
| `TenantMigrationIT` on isolated PostgreSQL | Passed on 25 September 2026 | Tenant schema and migrations are created. |
| `ChatDatabaseIT` on isolated PostgreSQL | Passed on 25 September 2026 | Chat controller and repository store and read a message. |
| Supabase Data API smoke check | Passed on 25 September 2026 | One unique `resource_maintenance` record was created, read, deleted, and confirmed absent. This bypassed the Java services. |
| `CoreApiHttpIT` on isolated PostgreSQL | Passed on 25 September 2026 | Real HTTP requests covered registration/login, role denial, project and task create/read/delete, database rows, and tenant isolation. Its temporary tenant schemas were removed. |
| `ChatStompIT` on isolated PostgreSQL | Passed locally on 25 September 2026 | Two live SockJS/STOMP clients receive messages only on their own tenant topics with the same project ID; HTTP history and database rows remain separated. |
| Frontend API and chat-to-context-engine flow | Passed locally on 25 September 2026 | Frontend service modules call running Core API, realtime, and context-engine HTTP services. A new tenant and admin are provisioned, a project is created/read, a chat message is sent over STOMP and read from HTTP history, then that exact message is summarized. The Gemini model call is replaced with a deterministic stub. |
| CI integration job | [Four-test run passed on `integration_testing`](https://github.com/Orchestrix-ORBIT/orchestrator/actions/runs/36124321976); new cross-service job change awaiting a GitHub run | `.github/workflows/integration-tests.yml` now builds the Java services, starts them and a deterministic context engine against the isolated database, then runs the frontend flow test. |

## Next work

1. Push the expanded [CI workflow](.github/workflows/integration-tests.yml), confirm its cross-service run passes on `integration_testing`, then merge it into `dev` and confirm the `dev` run passes.
2. Authenticate STOMP clients and authorize subscriptions to tenant topics. The current test checks routing isolation for correctly scoped subscriptions, not protection from a client deliberately subscribing to another tenant's topic.
3. Add a browser journey that checks real page interactions across services. The current cross-service test exercises frontend service modules and network protocols, not a running Next.js page.
4. Run an authorized live smoke check through the Java services against Supabase, using test-owned data and explicit cleanup.

## Safety and scope

The automated integration suite must use the isolated `orchestrix_test` database on `127.0.0.1:55432`. Its opt-in tests reject other `SPRING_DATASOURCE_URL` values. The live Supabase smoke check used one temporary record and verified deletion. A passing Data API request does not prove that the Core API or realtime service is connected to Supabase.

The cross-service runner also checks the exact isolated JDBC URL. It provisions a unique tenant for each run; that tenant remains in the disposable PostgreSQL container until the container is stopped. The context-engine route runs over HTTP, but the Gemini call is replaced with a deterministic function, so this check does not verify a live model response.

See [LOCAL_INTEGRATION_TESTING.md](backend/LOCAL_INTEGRATION_TESTING.md) for the container setup and earlier local results.

## Local run

Start the PostgreSQL container using the commands in [LOCAL_INTEGRATION_TESTING.md](backend/LOCAL_INTEGRATION_TESTING.md). Then, from `backend`, export the local test database values and run the Core API checks before the realtime check:

```bash
export JAVA_HOME=/path/to/jdk-21
export SPRING_DATASOURCE_URL='jdbc:postgresql://127.0.0.1:55432/orchestrix_test?sslmode=disable'
export SPRING_DATASOURCE_USERNAME=orchestrix_test
export SPRING_DATASOURCE_PASSWORD=orchestrix_test_only
export SPRING_DATASOURCE_HIKARI_DATA_SOURCE_PROPERTIES_SSLMODE=disable
(cd core-api && ./mvnw -Dtest=TenantMigrationIT,CoreApiHttpIT test)
(cd realtime-service && ./mvnw -Dtest=ChatDatabaseIT,ChatStompIT test)
(cd core-api && ./mvnw -DskipTests package)
(cd realtime-service && ./mvnw -DskipTests package)
cd ..
CONTEXT_PYTHON="$PWD/backend/context-engine/venv/bin/python" bash backend/run_cross_service_integration.sh
```

The Core API HTTP test creates two uniquely named tenant schemas and drops them after the test. `ChatDatabaseIT` and `ChatStompIT` use the `org_integration_lab` schema created by `TenantMigrationIT`; `ChatStompIT` also uses `org_integration_other`. Run the tests in the order above. The opt-in environment guard prevents these tests from running against the Supabase JDBC URL.
