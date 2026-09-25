# Integration testing

## Current evidence

| Check | Status | What it establishes |
| --- | --- | --- |
| `TenantMigrationIT` on isolated PostgreSQL | Passed on 25 September 2026 | Tenant schema and migrations are created. |
| `ChatDatabaseIT` on isolated PostgreSQL | Passed on 25 September 2026 | Chat controller and repository store and read a message. |
| Supabase Data API smoke check | Passed on 25 September 2026 | One unique `resource_maintenance` record was created, read, deleted, and confirmed absent. This bypassed the Java services. |
| `CoreApiHttpIT` on isolated PostgreSQL | Passed on 25 September 2026 | Real HTTP requests covered registration/login, role denial, project and task create/read/delete, database rows, and tenant isolation. Its temporary tenant schemas were removed. |
| Realtime HTTP and STOMP backed by PostgreSQL | Pending | Chat storage, subscriber delivery, and tenant separation need verification through a running service. |
| Frontend and context-engine cross-service flows | Pending | Network requests need checking without mocked service boundaries. |
| CI integration job | [Passed on `integration_testing` on 25 September 2026](https://github.com/Orchestrix-ORBIT/orchestrator/actions/runs/36119821788); `dev` merge pending | `.github/workflows/integration-tests.yml` starts PostgreSQL and runs the three opt-in tests. |

## Next work

1. Merge the [CI workflow](.github/workflows/integration-tests.yml) into `dev` and confirm the `dev` run passes. The branch run and local runs of its three tests passed.
2. Add realtime tests that connect a STOMP client, send a message, receive it on a subscriber, and confirm tenant separation and persistence.
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
(cd realtime-service && ./mvnw -Dtest=ChatDatabaseIT test)
```

The Core API HTTP test creates two uniquely named tenant schemas and drops them after the test. `ChatDatabaseIT` uses the `org_integration_lab` schema created by `TenantMigrationIT`; run them in the order above. The opt-in environment guard prevents these tests from running against the Supabase JDBC URL.
