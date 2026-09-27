# Testing levels and current project status

The detailed data integrity and function test plan, cases, results, and limitations are in [DATA_AND_FUNCTION_TESTING_REPORT.md](DATA_AND_FUNCTION_TESTING_REPORT.md).

The UI and access control test cases, results, and outstanding risks are in [UI_AND_SECURITY_TESTING.md](UI_AND_SECURITY_TESTING.md).

Unit and small component test counts below were checked on **25 September 2026** on the `integration_testing` branch: **272/272 tests** passed across the four components. Integration CI and live connection status were updated on 26 September 2026. Coverage is not complete; the missing focused tests are listed under “What is still missing.” A passing test establishes only the behavior that the test actually exercises.

## What the three levels mean

| Level | Question it answers | Example in this project |
| --- | --- | --- |
| **Unit testing** | Does one function, component, or class behave correctly for normal and error inputs? Other parts are usually mocked. | Call `TaskService.createTask()` with a mocked repository and check its result. |
| **Integration testing** | Do real parts work together across a boundary? | Call the chat controller with a real PostgreSQL test database and check that a message was stored in the tenant schema. |
| **System testing** | Does the running product complete a user journey across its services? | Sign in through the browser, create a project, send a chat message, and see it in another user's session. |

The test name or framework does not decide the level. A controller called directly with a mocked service is mainly a unit test; an HTTP route exercised in-process with its model mocked checks routing and request handling but not the external model; a real database test checks persistence but not necessarily the browser or network transport.

## Current status by component

| Component | Unit and small component tests | Integration tests and limits |
| --- | --- | --- |
| **Frontend** | **118/118 passed on 25 September** across 13 Vitest files. They cover auth helpers, the API helper, service request construction, the tenant context, the chat hook (including its tenant-specific STOMP topic), sidebars, and a loading component. `fetch`, the API module, STOMP/SockJS, and navigation are mocked where relevant. | The new opt-in cross-service test passed locally with real HTTP and STOMP calls to Core API, realtime, and context engine. It exercises service modules, not a browser page. |
| **Core API** | **116/116 focused tests passed on 25 September** across 13 classes using JDK 21. They cover service behavior, JWTs, and encryption; most service dependencies are mocked. | `CoreApiHttpIT` passed locally on 26 September against isolated PostgreSQL, covering tenant provisioning, auth, projects, tasks, resources, response fields, and persistence. The separate live Supabase smoke check exercised a Java-service project write/read path. |
| **Realtime service** | **21/21 focused tests passed on 25 September** across 6 classes using JDK 21. They cover chat service/controller logic and tenant context, filter, resolver, and connection provider behavior. The controller tests call methods directly with mocks. | `ChatDatabaseIT`, `ChatStompIT`, and `ChatProjectAccessIT` passed locally against isolated PostgreSQL. They check authenticated delivery and history, owner/team member access, and denial for other tenants and same-tenant outsiders. |
| **Context engine** | **17/17 passed on 25 September**: 7 summarizer tests and 10 API tests. The API tests include in-process HTTP requests to FastAPI, with the model call mocked. | The cross-service test checks `/summarize` with persisted chat and a deterministic model substitute. A separate live Gemini `/summarize` smoke check returned HTTP 200 and a summary on 26 September. |

### What is still missing

**Unit testing**

1. Focused page tests cover sign-in, registration validation, project creation and filtering, task updates, asset and document creation, and the admin layout gate. A real Chrome journey covers sign-in, project creation, team assignment, redirects, and project access. Chat selection, summary display, and other role-specific controls can be added to browser coverage. See [UI_AND_SECURITY_TESTING.md](UI_AND_SECURITY_TESTING.md).
2. `JwtAuthFilterTest` and the Core API HTTP suite now cover malformed tokens, tenant provisioning, project/team membership, notifications, and resource-management role denial. Other controller branches can still be added as features change.
3. Realtime `WebSocketConfig` has no focused unit test. The live STOMP path is now covered by `ChatStompIT` against an isolated database.
4. Context-engine `config.py` and `run.sh` are not covered by the 17-test suite. Add tests if configuration fallback and startup behavior are important to your deployment.

**Integration testing**

The six requested integration boundaries, with completed and partial status, are marked in [INTEGRATION_TESTING.md](INTEGRATION_TESTING.md#coverage-checklist). The expanded workflow [passed on `integration_testing`](https://github.com/Orchestrix-ORBIT/orchestrator/actions/runs/36126926764) and [passed on `dev`](https://github.com/Orchestrix-ORBIT/orchestrator/actions/runs/36128220876) after merge. Normal Maven `*Test` selection still excludes the opt-in `*IT` tests.

1. The Chrome journey now verifies sign-in, project creation, team assignment, redirects, and member access with running Next.js and Core API. Chat selection and summary display remain outside that browser case; the cross-service test checks their service modules and network boundaries.
2. Expand route and response coverage as new frontend flows are added. The four requested integration checks passed locally; the new changes await a pushed CI run.

**System testing:** A Chrome-to-Next.js-to-Core-API-to-PostgreSQL journey passed locally on 26 September 2026. It does not include realtime chat or Gemini in the same browser path.

## Next phase: integration testing

The active work and results are tracked in [INTEGRATION_TESTING.md](INTEGRATION_TESTING.md). The expanded Core API and chat authorization checks, live Supabase Java-service smoke, and live Gemini response passed locally on 26 September. A browser page journey remains for the next testing phase; the new changes await a pushed CI run.

## Verification notes (25 September 2026)

- Frontend: `npm run test:run` → **13 files, 118 tests passed**.
- Context engine: `venv/bin/python -m unittest discover -s tests -p 'test_*.py' -v` → **17 passed**.
- Core API: `JAVA_HOME=/home/sheharak/.jdks/jdk-21.0.6+7 ./mvnw -q -Dtest='*Test,!CoreApiApplicationTests' test` → **116 passed**.
- Core API rerun on 26 September: the focused suite passed **117/117** across 13 classes; `TenantMigrationIT`, `DatabaseIntegrityIT`, and `CoreApiHttpIT` passed **9/9** against isolated PostgreSQL. See the [detailed report](DATA_AND_FUNCTION_TESTING_REPORT.md).
- Realtime service: `JAVA_HOME=/home/sheharak/.jdks/jdk-21.0.6+7 ./mvnw -q -Dtest='*Test,!RealtimeServiceApplicationTests' test` → **21 passed**.
- The Java context and database integration tests require a database. See [LOCAL_INTEGRATION_TESTING.md](backend/LOCAL_INTEGRATION_TESTING.md) for the isolated PostgreSQL setup. The context startup tests were not rerun in this review.
- Isolated PostgreSQL integration tests rerun on 25 September: `TenantMigrationIT`, `CoreApiHttpIT`, `ChatDatabaseIT`, and `ChatStompIT` passed with no failures locally and on the `integration_testing` GitHub Actions run.
- Cross-service flow on 25 September: `crossServices.it.test.ts` passed locally and in the expanded GitHub Actions workflow against isolated PostgreSQL and running Core API, realtime, and context-engine HTTP services. Frontend `npm run test:run` then passed 118 regular tests and skipped the one opt-in cross-service test; TypeScript `tsc --noEmit` and the context-engine 17-test suite passed.

Test locations: [frontend tests](frontend/orchestrix_orbit_frontend/FRONTEND_TESTING.md), [Core API tests](backend/core-api/src/test/java), [realtime tests](backend/realtime-service/src/test/java), [context-engine tests](backend/context-engine/tests).
