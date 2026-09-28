# Data and Database Integrity and Function Testing Report

**Project:** Orchestrix ORBIT  
**Test date:** 26 September 2026  
**Scope:** Core API, tenant PostgreSQL schemas, selected realtime and context-engine functions  
**Status:** The test cases in this report passed locally. The current working-tree changes have not yet run in GitHub Actions.

## 1. Purpose and test approach

This report documents two testing methods required for the project: data and database integrity testing, and function testing. Database integrity testing asks whether the application can connect to the database, whether migrations produce the expected structure, whether records can be inserted and retrieved, whether relationships are enforced, and whether failed work leaves the database consistent. Function testing asks whether application operations implement their business rules for valid and invalid input, including validation, conflict handling, and authorization.

The application uses Spring Boot and JUnit 5 for the Java services, PostgreSQL for persistence, Vitest for frontend service checks, and Python `unittest` for the context engine. PHPUnit appears in the example test plan provided for the course, but this project is not a PHP application. The equivalent function checks here use JUnit 5, real HTTP requests, and Python `unittest` where appropriate. These are automated tests with assertions, not observations made by clicking through the UI.

The database tests use a disposable PostgreSQL 16 container with a database named `orchestrix_test`, exposed only on `127.0.0.1:55432`. Each new integrity test creates a uniquely named tenant schema and drops it in a `finally` block. The tests refuse to run unless the JDBC URL points to that isolated local database. The normal CI integration job uses the same disposable PostgreSQL setup. A separate opt-in smoke test previously passed against the project's live Supabase database using one uniquely named tenant and verified cleanup; it does not replace the isolated integrity tests.

## 2. Test environment and evidence

| Item | Test configuration |
| --- | --- |
| Database | PostgreSQL 16 in `orchestrix-integration-pg`; local port `55432`; `orchestrix_test` database |
| Core API | Spring Boot test context; random HTTP port for `CoreApiHttpIT` |
| Java runtime | JDK 21 |
| Test framework | JUnit 5, AssertJ, Spring Boot Test, JDBC, Maven Surefire |
| Isolation | Unique `org_integrity_*` and `org_integration_*` schemas; cleanup in `finally` |
| Source tests | `TenantMigrationIT`, `DatabaseIntegrityIT`, `CoreApiHttpIT`, and existing service tests |
| Machine-readable results | Maven Surefire XML files under `backend/core-api/target/surefire-reports/` |

On 26 September 2026, the final local run reported **1/1 `TenantMigrationIT`, 3/3 `DatabaseIntegrityIT`, and 5/5 `CoreApiHttpIT` passing**, with zero failures or errors in those suites. The Core API focused unit-test run reported **121/121 tests passing across 14 classes**. The expanded HTTP and database classes were run against the isolated PostgreSQL container. These counts describe the tested cases; they are not a percentage of all possible behavior.

## 3. Data and Database Integrity Testing

### Objectives

The tests check the connection between the Java service and PostgreSQL, tenant schema migration, required tables and columns, foreign-key relationships, unique and check constraints, actual record persistence, delete behavior, and transaction rollback. The combination of metadata checks and attempted invalid writes matters: metadata alone would show that a constraint exists, while rejected writes show that PostgreSQL enforces it.

### Test cases and results

| ID | Test action | Expected result | Observed result |
| --- | --- | --- | --- |
| DB-01 | Start the Spring context with the local JDBC URL and run tenant migrations. | Connect successfully; migration history and tenant tables exist. | Pass. `TenantMigrationIT` and the HTTP/integrity suites started against PostgreSQL and queried migrated schemas. |
| DB-02 | Inspect a newly provisioned tenant schema for users, projects, tasks, resources, bookings, teams, chat, documents, and summaries. | All listed tables exist. | Pass. `DatabaseIntegrityIT` found each table in `information_schema.tables`. |
| DB-03 | Inspect `tasks.project_id` and task foreign keys. | The project ID is a required UUID and task relationships are declared. | Pass. The column and at least two foreign-key constraints were found. |
| DB-04 | Insert a user, then insert another user with the same email. | The second insert is rejected; uniqueness is preserved. | Pass. PostgreSQL rejected the duplicate through the `users.email` unique constraint. |
| DB-05 | Insert a project whose owner ID is not a user in that schema. | The insert is rejected. | Pass. The project owner foreign key prevented the orphan. |
| DB-06 | Insert a resource booking whose end time precedes its start time. | The insert is rejected and no booking row remains. | Pass. The booking time check constraint rejected the row; the table count remained zero. |
| DB-07 | Insert a project with a task and chat message, then delete the project. | The task and chat message are deleted through their cascade relationships; unrelated resource data remains. | Pass. Both child-row counts became zero and the independent resource row remained. |
| DB-08 | Start one transaction, insert a user, then attempt a duplicate email insert in the same transaction. | The failed transaction rolls back its first insert. | Pass. After rollback, querying the email returned zero rows. |
| DB-09 | Provision a tenant, register a user, create/read a project, task, and resource through HTTP, then query PostgreSQL directly. | API responses correspond to persisted rows in the correct tenant schema. | Pass. `CoreApiHttpIT` checked IDs and rows; its temporary schemas were removed. |
| DB-10 | Run the separate live Supabase smoke test through Core API and Realtime. | A test tenant, project, and chat message can be written and read, then removed. | Passed in the earlier local integration run on 26 September; cleanup assertions verified that the tenant row and schema were absent. This is not part of the normal CI job. |
| DB-11 | Inspect additional migrated tables and foreign keys for documents, notifications, teams, and bookings. | All required tables and relationships exist. | Pass. The integrity test now checks 15 tenant tables and the listed foreign-key groups. |
| DB-12 | Insert orphan documents and notifications and duplicate team membership. | PostgreSQL rejects each invalid row. | Pass. Foreign keys and the team-membership primary key rejected the writes. |

The database tests use the actual migration files under `backend/core-api/src/main/resources/db/tenant/`. Foreign keys and checks are enforced by PostgreSQL, not mocked repositories. The rollback case uses one JDBC connection with auto-commit disabled; after the second insert fails, it explicitly rolls back and verifies the first insert did not survive. This verifies atomicity for that transaction pattern. It does not simulate a server crash or power loss.

The test only deletes records it creates in its disposable tenant schemas. It does not modify existing Supabase tenants. The live smoke test is guarded by an exact project pooler URL and username check before it can run.

## 4. Function Testing

### Objectives

The function tests exercise business operations at two levels. Existing service tests call individual Java services with mocked collaborators to check decisions and returned values. `CoreApiHttpIT` sends actual HTTP requests through request parsing, bean validation, controllers, security/filter handling, services, and PostgreSQL. This catches differences between a correct service method and an incorrectly wired route or exception handler.

### Test cases and results

| ID | Function and input | Expected behavior | Observed result |
| --- | --- | --- | --- |
| FN-01 | Register the first valid user in a tenant and log in. | Create an administrator and return a usable token. | Pass: registration returned 201 with `ROLE_ADMIN`; login returned 200 and a token. |
| FN-02 | Register with an invalid email and short password, then with malformed JSON. | Return 400 and create no user. | Pass. Both requests returned 400 and the user table remained empty. |
| FN-03 | Register the same valid email twice. | Reject the duplicate without creating another account. | Pass: second request returned 400; one user remained. |
| FN-04 | Log in with a wrong password. | Return 401 with no token. | Pass. The authentication exception now maps to 401. |
| FN-05 | Create a project with a blank name. | Return 400; do not create a project. | Pass. Bean-validation failure now maps to 400. |
| FN-06 | Create a project with no authenticated user, or as a member who lacks creation rights. | Deny the operation. | Pass: both requests returned 403. |
| FN-07 | Create a valid project, then read and delete it. | Return expected fields and persistence changes. | Pass: creation returned 201, read returned 200, and deleted project returned 404. |
| FN-08 | Create a task with a blank title or without authentication; try to update and delete a task without authentication. | Reject the invalid request or unauthorized writes. | Pass: blank title returned 400; the unauthenticated writes returned 403 and task data remained intact. |
| FN-09 | Use a real task ID under a different project ID in GET, PATCH, and DELETE routes. | Return 404 and leave the task unchanged. | Pass. This test exposed a project-scoping gap, which was fixed in `TaskController`. |
| FN-10 | Create a resource without a type or without authentication; try to change resource status or create maintenance without authentication. | Return 400 or 403 and do not perform unauthorized writes. | Pass. A valid resource request returned 201 and expected response fields; unauthenticated mutations returned 403. |
| FN-11 | Book a resource with end time before start time. | Return 400 and store no booking. | Pass. The service rejected the invalid time range. |
| FN-12 | Book a resource or change booking status without authentication. | Deny the booking writes. | Pass: both returned 403. |
| FN-13 | Submit the same valid resource booking twice. | First request succeeds; overlapping request returns a conflict and only one booking exists. | Pass: responses were 201 and 409; one booking row remained. |
| FN-14 | Try to read another tenant's project or access chat as an outsider. | Do not return another tenant's/project's data. | Pass in the existing Core API and Realtime integration tests. |
| FN-15 | Exercise individual service rules for tasks, projects, users, documents, resources, teams, and tenant management. | Expected values, errors, and collaborator calls match each service rule. | Pass: the focused Core API unit suite reported 121/121; these service tests use mocks and complement the HTTP cases above. |
| FN-16 | Create documents with a blank title or no token, then create a valid document and read it through both the right and wrong project URL. | Invalid writes return 400/403; a valid document returns 201; a mismatched project URL returns 404. | Pass. The wrong-project read case exposed and verified a project-scoping fix. |
| FN-17 | Create a student profile with missing required fields, then create and read a valid profile. | Invalid input returns 400; valid create and read return 200. | Pass. |
| FN-18 | Create a research team with a blank name, then create and list a valid team. | Blank name returns 400; valid team returns 201, its leader membership is stored, and list returns 200. | Pass. |
| FN-19 | Provision a tenant with a blank slug. | Return 400 without creating a tenant. | Pass. |
| FN-20 | Provision a tenant with no key, a wrong key, and a valid bootstrap key; read tenant registry as admin and member. | Unauthorized requests return 403; valid bootstrap returns 201; admin list succeeds. | Pass. |
| FN-21 | Read a private project as a same-tenant outsider, then add and remove that user from its team. | Outsider is denied, membership grants access, removal revokes it. | Pass for project and chat-history HTTP reads. |
| FN-22 | List and mark notifications read as two users. | Each user sees and changes only their own notifications. | Pass. A member's attempt to change an admin notification returned 404. |
| FN-23 | Create or change assets and maintenance as a member; create valid active maintenance as an admin. | Member writes return 403; valid admin maintenance persists and updates resource status. | Pass. Blank asset name returned 400. |

### Defects found and changes made

1. **Validation errors were reported as server errors.** The generic exception handler was catching request validation and malformed JSON exceptions, so these client errors could become HTTP 500. `GlobalExceptionHandler` now returns 400 for invalid fields and unreadable request bodies. The HTTP test verifies invalid registration, blank names/titles, and missing resource type.
2. **Bad credentials were reported as server errors.** Authentication exceptions now return 401. A wrong-password login is tested over HTTP.
3. **Some write routes accepted a missing principal or failed with a server error.** Task create/update/delete and resource or booking mutation entry points now require an authenticated user before invoking their services. The HTTP tests cover unauthenticated task, resource, booking, resource status, booking status, and maintenance writes.
4. **A task could be addressed through a different project's URL.** Task read/update/delete now check that the task's stored `projectId` matches the route's `projectId`. The regression test checks 404 for all three methods and verifies the task title did not change.
5. **A document could be read through a different project's URL, and document writes could lack a principal.** Document read now verifies the stored project ID; create/update/delete require an authenticated user. The HTTP test checks valid/invalid document creation, project mismatch, and unauthorized updates/deletes.

## 5. Reproduction commands

From the repository root, start the isolated database with the command in [backend/LOCAL_INTEGRATION_TESTING.md](backend/LOCAL_INTEGRATION_TESTING.md), then run:

```bash
cd backend/core-api
export JAVA_HOME=/path/to/jdk-21
export SPRING_DATASOURCE_URL='jdbc:postgresql://127.0.0.1:55432/orchestrix_test?sslmode=disable'
export SPRING_DATASOURCE_USERNAME=orchestrix_test
export SPRING_DATASOURCE_PASSWORD=orchestrix_test_only
export SPRING_DATASOURCE_HIKARI_DATA_SOURCE_PROPERTIES_SSLMODE=disable
export JWT_SECRET='integration-test-only-shared-jwt-secret-2026'
./mvnw -Dtest=TenantMigrationIT,DatabaseIntegrityIT,CoreApiHttpIT test
./mvnw -Dtest='*Test,!CoreApiApplicationTests' test
```

The opt-in integration tests require the exact local JDBC target above. They are also included in `.github/workflows/integration-tests.yml`; the added cases will run in GitHub Actions after these working-tree changes are pushed. Stop the disposable container when testing is complete.

## 6. Interpretation and remaining limits

These results provide direct evidence for the named database constraints and critical function paths. They establish that the tested writes persisted, invalid data was rejected, and one failed multi-statement transaction rolled back. They also establish the tested HTTP status codes and the project/task relationship rule. A passing result does **not** imply every database field, every controller branch, or every user journey has been exercised.

The current function suite covers authentication, tenant isolation, projects, tasks, resources, bookings, documents, student profiles, research teams, notifications, tenant administration, and chat access. Schema checks cover the migrated tables and important relationships; they do not assert every column of every migration. Concurrent-user booking behavior belongs to load testing. Failover, corruption, recovery, and performance are separate testing methods and are not claimed here. Browser UI evidence is in [UI_AND_SECURITY_TESTING.md](UI_AND_SECURITY_TESTING.md).

For a formal submission, attach the Surefire XML or a test-run screenshot showing the passing suites, the relevant source/test file references, the test date, and the local environment above. Record the CI run link after the new code is pushed and CI completes. This report deliberately distinguishes local results from CI results.
