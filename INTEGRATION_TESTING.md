# Integration testing

## Coverage checklist

| Integration boundary | Status | Evidence and limit |
| --- | --- | --- |
| API endpoint + service layer | **Done for tested routes** | `CoreApiHttpIT` sends real HTTP requests through auth, project, and task endpoints; `ChatStompIT` checks the realtime HTTP history endpoint. Other Core API routes still need coverage. |
| Service layer + database/repository | **Done for tested operations** | `CoreApiHttpIT` checks project and task rows in PostgreSQL; `ChatDatabaseIT` and `ChatStompIT` check persisted chat rows; `TenantMigrationIT` checks tenant schemas. |
| Authentication + protected endpoints | **Done for tested rules** | `CoreApiHttpIT` registers and logs in users, uses the returned token, and verifies a member cannot create a project (403). Tokens now carry a tenant claim; `ChatStompIT` verifies a different tenant's HTTP history is denied, and the STOMP test verifies cross-tenant subscriptions are rejected. Other route and project-level authorization rules still need coverage. |
| Multiple backend modules interacting | **Done for one cross-service flow** | `crossServices.it.test.ts` calls running Core API, realtime, and context-engine services: project creation, STOMP chat, HTTP history, then summary. The frontend test coordinates these calls; direct server-to-server calls are not tested. |
| Backend returning the expected data structure to the frontend | **Partial** | `CoreApiHttpIT` checks selected auth and project response fields. `crossServices.it.test.ts` checks fields consumed by the frontend service modules, including project name, chat content, and summary fields. It does not validate every API response or render a browser page. |
| External services/APIs | **Partial** | The Supabase Data API smoke check passed, and on 26 September 2026 both Java services connected to Supabase through its session pooler; Core API read tenant records over HTTP. The automated suite uses isolated PostgreSQL and stubs Gemini. A live Java-service write/read/cleanup smoke check and live Gemini response are still unverified. |

## Current evidence

| Check | Status | What it establishes |
| --- | --- | --- |
| `TenantMigrationIT` on isolated PostgreSQL | Passed on 25 September 2026 | Tenant schema and migrations are created. |
| `ChatDatabaseIT` on isolated PostgreSQL | Passed on 25 September 2026 | Chat controller and repository store and read a message. |
| Supabase Data API smoke check | Passed on 25 September 2026 | One unique `resource_maintenance` record was created, read, deleted, and confirmed absent. This bypassed the Java services. |
| `CoreApiHttpIT` on isolated PostgreSQL | Passed on 25 September 2026 | Real HTTP requests covered registration/login, role denial, project and task create/read/delete, database rows, and tenant isolation. Its temporary tenant schemas were removed. |
| `ChatStompIT` on isolated PostgreSQL | Expanded auth checks passed locally on 26 September 2026; prior routing check passed in CI on 25 September | Two live SockJS/STOMP clients receive messages only on their own tenant topics with the same project ID. Missing or cross-tenant HTTP tokens are denied; a cross-tenant STOMP subscription receives no message. |
| Frontend API and chat-to-context-engine flow | Authenticated flow passed locally on 26 September 2026; prior flow passed in CI on 25 September | Frontend service modules call running Core API, realtime, and context-engine HTTP services. A new tenant and admin are provisioned, a project is created/read, a token-authenticated chat message is sent over STOMP and read from HTTP history, then that exact message is summarized. The Gemini model call is replaced with a deterministic stub. |
| CI integration job | [Expanded run passed on `integration_testing`](https://github.com/Orchestrix-ORBIT/orchestrator/actions/runs/36126926764) and [passed on `dev`](https://github.com/Orchestrix-ORBIT/orchestrator/actions/runs/36128220876) after [PR #37](https://github.com/Orchestrix-ORBIT/orchestrator/pull/37) merged on 25 September 2026 | `.github/workflows/integration-tests.yml` builds the Java services, starts them and a deterministic context engine against the isolated database, then runs the frontend flow test. |
| Live Supabase connection check | Passed on 26 September 2026 | Both Java services started with database connections through the IPv4 session pooler. A read-only Core API request returned tenant records; this did not test a live write path or a browser journey. |

## Next work

1. Extend `CoreApiHttpIT` to tenant provisioning, resource operations, and more response contracts consumed by the frontend.
2. Add project-level chat authorization if users should be limited to projects they belong to. The current check binds chat access to the signed tenant, but does not verify project membership.
3. Add a browser journey that checks real page interactions across services. The current cross-service test exercises frontend service modules and network protocols, not a running Next.js page.
4. Run a live write/read/cleanup smoke check through the Java services against Supabase using test-owned data. The current live check establishes connection and a Core API read path only. Verify a real Gemini call separately if that external integration is required.

## Safety and scope

The automated integration suite must use the isolated `orchestrix_test` database on `127.0.0.1:55432`. Its opt-in tests reject other `SPRING_DATASOURCE_URL` values. The earlier live Supabase Data API smoke check used one temporary record and verified deletion. The later Java service startup and Core API read check establish live connectivity, but do not cover live Java-service writes or cleanup.

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
