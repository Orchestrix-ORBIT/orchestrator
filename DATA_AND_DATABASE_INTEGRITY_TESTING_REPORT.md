# Data and Database Integrity Testing Report

**Project:** Orchestrix ORBIT  
**Run date:** 27 September 2026  
**Result:** **PASS — 4 tests passed, 0 failures, 0 errors, 0 skipped**  
**Scope:** Core API tenant migrations and PostgreSQL data integrity

## Test environment

The tests ran with JDK 21, Spring Boot, JUnit 5, JDBC, and PostgreSQL 16.14 in a disposable `postgres:16-alpine` container. The database was `orchestrix_test` at `127.0.0.1:55432`. Both test classes require that isolated local database URL; they do not run against Supabase. Spring applied four public migrations, and tenant provisioning applied 13 tenant migrations to each new schema.

`DatabaseIntegrityIT` created a unique `org_integrity_*` schema for each test and dropped it in a `finally` block. After the run, a database query found **zero** remaining `org_integrity_*` schemas. The disposable container was then stopped.

## Results

| Suite | Tests | Failures | Errors | Skipped |
| --- | ---: | ---: | ---: | ---: |
| `DatabaseIntegrityIT` | 3 | 0 | 0 | 0 |
| `TenantMigrationIT` | 1 | 0 | 0 | 0 |
| **Total** | **4** | **0** | **0** | **0** |

| Test | Verified behavior |
| --- | --- |
| `schemaHasExpectedTablesColumnsAndRelationships` | A new tenant schema contains 15 expected tables. `tasks.project_id` is a required UUID; tasks have at least two foreign keys; documents, notifications, team members, and resource bookings have foreign keys. |
| `uniqueKeysForeignKeysChecksAndCascadeAreEnforced` | PostgreSQL rejects a duplicate user email, a project with a nonexistent owner, orphan documents and notifications, duplicate team membership, and a booking whose end precedes its start. Deleting a project cascades to its task and chat message while an unrelated resource remains. |
| `failedMultiStatementTransactionRollsBackItsEarlierInsert` | A duplicate email on the second statement causes an explicit rollback; the first user insert is absent afterward. |
| `createsTenantSchemaAndAppliesChatMigrations` | Provisioning creates two tenant schemas. Both contain users, projects, and chat messages; the first schema records at least eight migrations. |

## Evidence and reproduction

The current machine-readable results are [DatabaseIntegrityIT.xml](backend/core-api/target/surefire-reports/TEST-com.example.core_api.integration.DatabaseIntegrityIT.xml) and [TenantMigrationIT.xml](backend/core-api/target/surefire-reports/TEST-com.example.core_api.multitenancy.TenantMigrationIT.xml). Test source is in [DatabaseIntegrityIT.java](backend/core-api/src/test/java/com/example/core_api/integration/DatabaseIntegrityIT.java) and [TenantMigrationIT.java](backend/core-api/src/test/java/com/example/core_api/multitenancy/TenantMigrationIT.java).

To repeat the run, start the isolated PostgreSQL container using [backend/LOCAL_INTEGRATION_TESTING.md](backend/LOCAL_INTEGRATION_TESTING.md), set the documented local database variables plus the required test-only `JWT_SECRET` and `ENCRYPTION_SECRET_KEY`, then run from `backend/core-api`:

```bash
./mvnw -Dtest=TenantMigrationIT,DatabaseIntegrityIT test
```

The first attempts in this session stopped during Spring startup: the sandbox could not reach the local Docker port, then the shell lacked `ENCRYPTION_SECRET_KEY`. Neither attempt reached the integrity assertions. After local database access and the required test-only key were supplied, the final run passed all four tests.

## Interpretation and limits

This run confirms the listed migration, schema, constraint, cascade, and rollback behaviors on an isolated PostgreSQL instance. It does not verify every column or constraint, concurrent writes, backup restoration, server-crash recovery, or production Supabase state. HTTP function checks are covered separately in [DATA_AND_FUNCTION_TESTING_REPORT.md](DATA_AND_FUNCTION_TESTING_REPORT.md).
