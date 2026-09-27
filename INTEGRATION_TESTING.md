# Integration testing

For the separate database integrity and function testing methods, see [DATA_AND_FUNCTION_TESTING_REPORT.md](DATA_AND_FUNCTION_TESTING_REPORT.md).

## Coverage checklist

| Integration boundary | Status | Evidence and limit |
| --- | --- | --- |
| API endpoint + service layer | **Done for tested routes** | `CoreApiHttpIT` sends real HTTP requests through tenant provisioning, auth, project, task, and resource endpoints; `ChatStompIT` checks the realtime HTTP history endpoint. Other Core API routes still need coverage. |
| Service layer + database/repository | **Done for tested operations** | `CoreApiHttpIT` checks tenant, project, task, and resource rows in PostgreSQL; `ChatDatabaseIT` and `ChatStompIT` check persisted chat rows; `TenantMigrationIT` checks tenant schemas. |
| Authentication + protected endpoints | **Done for tested rules** | `CoreApiHttpIT` checks registration, login, and role denial. `ChatStompIT` and `ChatProjectAccessIT` check tenant and project access: active owners and team members may chat, while outsiders cannot read history or subscribe. Other route rules still need coverage. |
| Multiple backend modules interacting | **Done for one cross-service flow** | `crossServices.it.test.ts` calls running Core API, realtime, and context-engine services: project creation, STOMP chat, HTTP history, then summary. The frontend test coordinates these calls; direct server-to-server calls are not tested. |
| Backend returning the expected data structure to the frontend | **Done for tested responses** | `CoreApiHttpIT` checks tenant and resource response fields as well as auth and project fields. `crossServices.it.test.ts` checks project, chat, and summary fields consumed by frontend service modules. A browser page journey remains untested. |
| External services/APIs | **Done for tested integrations** | On 26 September 2026 the live Java-service smoke test wrote/read a project and chat message in Supabase, then verified tenant/schema cleanup. A separate live Gemini `/summarize` call returned HTTP 200 with a summary. The repeatable CI suite still uses isolated PostgreSQL and a deterministic Gemini substitute. |

## Current evidence

| Check | Status | What it establishes |
| --- | --- | --- |
| `TenantMigrationIT` on isolated PostgreSQL | Passed on 25 September 2026 | Tenant schema and migrations are created. |
| `ChatDatabaseIT` on isolated PostgreSQL | Passed on 25 September 2026 | Chat controller and repository store and read a message. |
| Supabase Data API smoke check | Passed on 25 September 2026 | One unique `resource_maintenance` record was created, read, deleted, and confirmed absent. This bypassed the Java services. |
| `CoreApiHttpIT` on isolated PostgreSQL | Expanded checks passed locally on 26 September 2026 | Real HTTP requests covered tenant provisioning, registration/login, role denial, project, task, and resource create/read, database rows, response fields, and tenant isolation. Its temporary tenant schemas were removed. |
| `ChatStompIT` and `ChatProjectAccessIT` on isolated PostgreSQL | Expanded checks passed locally on 26 September 2026; prior routing check passed in CI on 25 September | Live STOMP and HTTP tests deny cross-tenant and same-tenant outsider access; owner and team member access is verified against database rows. |
| Frontend API and chat-to-context-engine flow | Authenticated flow passed locally on 26 September 2026; prior flow passed in CI on 25 September | Frontend service modules call running Core API, realtime, and context-engine HTTP services. A new tenant and admin are provisioned, a project is created/read, a token-authenticated chat message is sent over STOMP and read from HTTP history, then that exact message is summarized. The Gemini model call is replaced with a deterministic stub. |
| CI integration job | [Latest pushed run passed on `integration_testing`](https://github.com/Orchestrix-ORBIT/orchestrator/actions/runs/36229538044) on 26 September 2026 | The new checks in this working tree passed locally and await a pushed CI run. |
| Live Supabase Java-service smoke | Passed on 26 September 2026 | Core API provisioned a unique tenant and created/read a project; Realtime sent/read a persisted chat message; the test removed the project, tenant row, and schema and verified their absence. |
| Live Gemini response | Passed on 26 September 2026 | `backend/context-engine/tests/live_smoke.py` called the real `/summarize` route with Gemini and received HTTP 200 with a summary. |

## Next work

1. The Chrome browser journey now checks real sign-in, project creation, team assignment, redirects, and Core API access. Extend it to chat selection and summary display when those browser flows are included in this test matrix.
2. Extend route and response coverage as new frontend flows are developed. The four requested integration checks above passed locally and await a CI run after these changes are pushed.

## Safety and scope

The automated integration suite uses the isolated `orchestrix_test` database on `127.0.0.1:55432`; its opt-in tests reject other `SPRING_DATASOURCE_URL` values. The separate live smoke test requires the exact project Supabase pooler configuration, uses a uniquely named tenant, and verifies cleanup before passing.

The cross-service runner also checks the exact isolated JDBC URL. It provisions a unique tenant for each run; that tenant remains in the disposable PostgreSQL container until the container is stopped. Its context-engine route uses a deterministic model substitute; the separate live Gemini smoke test checks the real model response.

See [LOCAL_INTEGRATION_TESTING.md](backend/LOCAL_INTEGRATION_TESTING.md) for the container setup and earlier local results.

## Local run

Start the PostgreSQL container using the commands in [LOCAL_INTEGRATION_TESTING.md](backend/LOCAL_INTEGRATION_TESTING.md). Then, from `backend`, export the local test database values and run the Core API checks before the realtime check:

```bash
export JAVA_HOME=/path/to/jdk-21
export SPRING_DATASOURCE_URL='jdbc:postgresql://127.0.0.1:55432/orchestrix_test?sslmode=disable'
export SPRING_DATASOURCE_USERNAME=orchestrix_test
export SPRING_DATASOURCE_PASSWORD=orchestrix_test_only
export SPRING_DATASOURCE_HIKARI_DATA_SOURCE_PROPERTIES_SSLMODE=disable
(cd core-api && ./mvnw -Dtest=TenantMigrationIT,DatabaseIntegrityIT,CoreApiHttpIT test)
(cd realtime-service && ./mvnw -Dtest=ChatDatabaseIT,ChatStompIT,ChatProjectAccessIT test)
(cd core-api && ./mvnw -DskipTests package)
(cd realtime-service && ./mvnw -DskipTests package)
cd ..
CONTEXT_PYTHON="$PWD/backend/context-engine/venv/bin/python" bash backend/run_cross_service_integration.sh
```

The Core API HTTP test creates two uniquely named tenant schemas and drops them after the test. `ChatDatabaseIT` and `ChatStompIT` use the `org_integration_lab` schema created by `TenantMigrationIT`; `ChatStompIT` also uses `org_integration_other`. Run the tests in the order above. The opt-in environment guard prevents these tests from running against the Supabase JDBC URL.
