# Integration testing

## Current evidence

| Check | Status | What it establishes |
| --- | --- | --- |
| `TenantMigrationIT` on isolated PostgreSQL | Passed on 25 September 2026 | Tenant schema and migrations are created. |
| `ChatDatabaseIT` on isolated PostgreSQL | Passed on 25 September 2026 | Chat controller and repository store and read a message. |
| Supabase Data API smoke check | Passed on 25 September 2026 | One unique `resource_maintenance` record was created, read, deleted, and confirmed absent. This bypassed the Java services. |
| `CoreApiHttpIT` on isolated PostgreSQL | Passed on 25 September 2026 | Real HTTP requests covered registration/login, role denial, project and task create/read/delete, database rows, and tenant isolation. Its temporary tenant schemas were removed. |
| `ChatStompIT` on isolated PostgreSQL | Passed locally on 25 September 2026 | Two live SockJS/STOMP clients receive messages only on their own tenant topics with the same project ID; HTTP history and database rows remain separated. |
| Frontend and context-engine cross-service flows | Pending | Network requests need checking without mocked service boundaries. |
| CI integration job | [Four-test run passed on `integration_testing`](https://github.com/Orchestrix-ORBIT/orchestrator/actions/runs/36123591800); `dev` merge pending | `.github/workflows/integration-tests.yml` runs `ChatStompIT` alongside the previous three tests. |

## Next work

1. Merge the expanded [CI workflow](.github/workflows/integration-tests.yml) into `dev` and confirm the `dev` run passes. The four tests passed locally and on the `integration_testing` branch.
2. Authenticate STOMP clients and authorize subscriptions to tenant topics. The current test checks routing isolation for correctly scoped subscriptions, not protection from a client deliberately subscribing to another tenant's topic.
3. Add cross-service checks for frontend-to-Core API and chat-to-context-engine requests.
4. Run an authorized live smoke check through the Java services against Supabase, using test-owned data and explicit cleanup.

## Safety and scope

The automated integration suite must use the isolated `orchestrix_test` database on `127.0.0.1:55432`. Its opt-in tests reject other `SPRING_DATASOURCE_URL` values. The live Supabase smoke check used one temporary record and verified deletion. A passing Data API request does not prove that the Core API or realtime service is connected to Supabase.

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
```

The Core API HTTP test creates two uniquely named tenant schemas and drops them after the test. `ChatDatabaseIT` and `ChatStompIT` use the `org_integration_lab` schema created by `TenantMigrationIT`; `ChatStompIT` also uses `org_integration_other`. Run the tests in the order above. The opt-in environment guard prevents these tests from running against the Supabase JDBC URL.
