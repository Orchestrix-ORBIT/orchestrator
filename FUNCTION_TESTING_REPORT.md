# Function Testing Report

**Project:** Orchestrix ORBIT  
**Run date:** 27 September 2026  
**Result:** **PASS — 312 locally executed tests passed, 0 failures**  
**Scope:** Core API, realtime service, context engine, frontend components and services, cross-service flow, and one browser workflow

## Test environment and method

The Java tests used JDK 21, Spring Boot, JUnit 5, and PostgreSQL 16.14 in a disposable `postgres:16-alpine` container at `127.0.0.1:55432/orchestrix_test`. The context engine used its Python virtual environment and `unittest`. The frontend used Vitest, React Testing Library, and Playwright Chromium. The cross-service run started freshly built Core API and realtime jars plus the context-engine HTTP app with a deterministic model substitute. It did not call live Gemini or Supabase.

Service tests use mocks to check individual decisions. The HTTP, database, STOMP, cross-service, and browser tests exercise progressively more of the running application. The counts below describe executed assertions and test cases, not a percentage of all possible functions.

## Results

| Suite | Tests passed | Failures | Notes |
| --- | ---: | ---: | --- |
| Core API JUnit, including HTTP, database, migration, and application startup tests | 131 | 0 | 18 classes; 121 focused unit tests, 5 Core API HTTP tests, and 5 supporting database/startup tests. |
| Realtime JUnit, including database, STOMP, access, and application startup tests | 28 | 0 | 11 classes; 24 focused unit tests, 3 integration tests, and 1 startup test. |
| Context engine Python `unittest` | 17 | 0 | API validation, response handling, summarizer chunking, and model-output parsing. |
| Frontend Vitest regular suite | 134 | 0 | 19 files passed; 2 opt-in tests were skipped by design. |
| Authenticated cross-service Vitest flow | 1 | 0 | Run separately with Core API, realtime, and context engine listening. |
| Playwright Chromium browser workflow | 1 | 0 | Real sign-in, project creation, team-linked access, and role redirect. |
| **Total executed** | **312** | **0** | The separately run cross-service test is counted once. |

The two regular frontend skips were the cross-service test, which passed in its separate opt-in run, and the live Supabase smoke test, which was not run in this local test session.

## Functional behavior checked

| Area | Tested outcomes |
| --- | --- |
| Authentication and tenant management | Registration and login, invalid input, duplicate email, wrong password, first-user administrator role, tenant provisioning, bootstrap-key denial, and tenant isolation. |
| Projects and teams | Create/read/delete, member visibility, owner/team access, same-tenant outsider denial, and revoked membership. |
| Tasks and documents | Creation and validation, project-scoped reads and writes, unauthorized mutation denial, document access level and content, and task update rollback in the UI after an API rejection. |
| Resources and bookings | Resource creation and response fields, invalid booking times, overlapping-booking conflict, resource-management role checks, and maintenance status behavior. |
| Profiles and notifications | Student profile validation, research team creation and listing, and user-scoped notification reads and updates. |
| Chat | Persistence and history, STOMP delivery to the matching tenant/project, and owner/team-member access with outsider denial. |
| Summarization | Request validation, HTTP error mapping, message ordering and chunking, model-output parsing, and the cross-service summary of a stored chat message. |
| Browser workflow | Administrator creates private and shared projects; a member is redirected away from admin content, denied the private project, and allowed the shared project. |

The five `CoreApiHttpIT` cases are in [CoreApiHttpIT.java](backend/core-api/src/test/java/com/example/core_api/integration/CoreApiHttpIT.java). Their detailed inputs and expected responses are also listed in [DATA_AND_FUNCTION_TESTING_REPORT.md](DATA_AND_FUNCTION_TESTING_REPORT.md).

## Evidence

- Core API JUnit results: [Surefire reports](backend/core-api/target/surefire-reports/), including [CoreApiHttpIT.xml](backend/core-api/target/surefire-reports/TEST-com.example.core_api.integration.CoreApiHttpIT.xml).
- Realtime JUnit results: [Surefire reports](backend/realtime-service/target/surefire-reports/), including [ChatStompIT.xml](backend/realtime-service/target/surefire-reports/TEST-com.example.realtime_service.chat.ChatStompIT.xml).
- The context-engine console run ended `Ran 17 tests ... OK`.
- The regular Vitest run ended `134 passed | 2 skipped`; the separate cross-service run ended `1 passed`.
- Playwright ended `1 passed`, and its [last-run marker](frontend/orchestrix_orbit_frontend/test-results/.last-run.json) records a passed run.

## Reproduction

Start the isolated PostgreSQL container and set the local database variables described in [backend/LOCAL_INTEGRATION_TESTING.md](backend/LOCAL_INTEGRATION_TESTING.md). Supply test-only `JWT_SECRET`, `ENCRYPTION_SECRET_KEY`, and `TENANT_BOOTSTRAP_KEY` values. Then run the Java suites in this order so Core API creates the tenant fixtures used by realtime:

```bash
(cd backend/core-api && ./mvnw -Dtest='*Test,*IT' test && ./mvnw -Dtest=CoreApiApplicationTests test)
(cd backend/realtime-service && ./mvnw -Dtest='*Test,*IT' test && ./mvnw -Dtest=RealtimeServiceApplicationTests test)
(cd backend/context-engine && venv/bin/python -m unittest discover -s tests -p 'test_*.py' -v)
(cd frontend/orchestrix_orbit_frontend && npm run test:run)
```

Build both Java jars with `./mvnw -DskipTests package`, then run `bash backend/run_cross_service_integration.sh` and `bash backend/run_browser_e2e.sh` with the same isolated database variables. The runners start and stop their application processes. Stop the disposable database container after testing.

## Run notes and limits

The first cross-service attempt stopped at the runner's Core API readiness check before executing its test. The runner was updated to probe the protected tenant endpoint and use the configured JDK; the rerun passed. This was a test-runner setup issue, not a failed function assertion.

The live Supabase smoke test and live Gemini call were outside this local run because they require external services and credentials. The browser case covers one end-to-end journey; it does not cover every page or chat/summary UI control. Concurrent load, performance limits, and failover/recovery are separate testing categories.
