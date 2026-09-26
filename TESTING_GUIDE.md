# Testing levels and current project status

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
| **Core API** | **116/116 focused tests passed on 25 September** across 13 classes using JDK 21. They cover service behavior, JWTs, and encryption; most service dependencies are mocked. | `CoreApiApplicationTests` checks Spring startup. `TenantMigrationIT` and the new `CoreApiHttpIT` passed on 25 September against isolated PostgreSQL. The HTTP test covers registration/login, roles, projects, tasks, tenant separation, and persistence. It does not establish that the deployed API can use Supabase. |
| **Realtime service** | **21/21 focused tests passed on 25 September** across 6 classes using JDK 21. They cover chat service/controller logic and tenant context, filter, resolver, and connection provider behavior. The controller tests call methods directly with mocks. | `ChatDatabaseIT` and `ChatStompIT` passed against isolated PostgreSQL. On 26 September, expanded local checks confirmed token-authenticated delivery and HTTP history, plus rejection of cross-tenant history and subscriptions. Project membership is not checked. |
| **Context engine** | **17/17 passed on 25 September**: 7 summarizer tests and 10 API tests. The API tests include in-process HTTP requests to FastAPI, with the model call mocked. | The new cross-service test confirms a frontend service request reaches the running `/summarize` route with persisted chat content and receives a response. Gemini is stubbed. [`tests/live_smoke.py`](backend/context-engine/tests/live_smoke.py) is an optional live Gemini check excluded from normal test discovery. |

### What is still missing

**Unit testing**

1. Frontend route pages and their role-specific interactions have no direct tests; the 13 Vitest files focus on shared helpers, services, context, and a few components. Add focused tests for important form validation, loading and error states, and role-based controls on the project, task, resource, document, and chat pages.
2. Core API controllers, security filters, exception handling, and notification behavior have no direct focused tests in `src/test`; the existing tests concentrate on services and utilities. Prioritize authorization and tenant-scoping decisions at those boundaries.
3. Realtime `WebSocketConfig` has no focused unit test. The live STOMP path is now covered by `ChatStompIT` against an isolated database.
4. Context-engine `config.py` and `run.sh` are not covered by the 17-test suite. Add tests if configuration fallback and startup behavior are important to your deployment.

**Integration testing**

The six requested integration boundaries, with completed and partial status, are marked in [INTEGRATION_TESTING.md](INTEGRATION_TESTING.md#coverage-checklist). The expanded workflow [passed on `integration_testing`](https://github.com/Orchestrix-ORBIT/orchestrator/actions/runs/36126926764) and [passed on `dev`](https://github.com/Orchestrix-ORBIT/orchestrator/actions/runs/36128220876) after merge. Normal Maven `*Test` selection still excludes the opt-in `*IT` tests.

1. Extend `CoreApiHttpIT` beyond registration/login, project, task, role, and tenant-isolation paths to cover additional Core API boundaries and frontend response contracts, including tenant provisioning and resource operations.
2. Add project-level chat authorization if users should only access projects they belong to. Tenant-bound tokens now protect HTTP history and STOMP traffic; the expanded local tests reject cross-tenant access. The updated workflow still needs a CI run.
3. Add a browser page journey that verifies chat selection and summary display. The cross-service test checks frontend service modules and network boundaries, with the Gemini call stubbed.
4. Run a live write/read/cleanup smoke check through the Java services against Supabase. The Data API create/read/delete check passed, and both Java services connected to Supabase on 26 September; Core API also returned tenant records. A Java-service write path remains unverified.

**System testing:** All four services returned HTTP 200 on 26 September 2026, but no browser user journey was exercised. An automated browser-to-services journey is still needed.

## Next phase: integration testing

The active work and results are tracked in [INTEGRATION_TESTING.md](INTEGRATION_TESTING.md). Core API HTTP, realtime persistence, live STOMP delivery, and the frontend API/chat-to-context-engine service flow passed against isolated PostgreSQL in CI; the new chat authorization checks and authenticated flow passed locally and await a CI run. Remaining work includes broader HTTP and response-contract coverage, project-level chat authorization where required, a browser journey, and a live Java-service write/read/cleanup check against Supabase.

## Verification notes (25 September 2026)

- Frontend: `npm run test:run` → **13 files, 118 tests passed**.
- Context engine: `venv/bin/python -m unittest discover -s tests -p 'test_*.py' -v` → **17 passed**.
- Core API: `JAVA_HOME=/home/sheharak/.jdks/jdk-21.0.6+7 ./mvnw -q -Dtest='*Test,!CoreApiApplicationTests' test` → **116 passed**.
- Realtime service: `JAVA_HOME=/home/sheharak/.jdks/jdk-21.0.6+7 ./mvnw -q -Dtest='*Test,!RealtimeServiceApplicationTests' test` → **21 passed**.
- The Java context and database integration tests require a database. See [LOCAL_INTEGRATION_TESTING.md](backend/LOCAL_INTEGRATION_TESTING.md) for the isolated PostgreSQL setup. The context startup tests were not rerun in this review.
- Isolated PostgreSQL integration tests rerun on 25 September: `TenantMigrationIT`, `CoreApiHttpIT`, `ChatDatabaseIT`, and `ChatStompIT` passed with no failures locally and on the `integration_testing` GitHub Actions run.
- Cross-service flow on 25 September: `crossServices.it.test.ts` passed locally and in the expanded GitHub Actions workflow against isolated PostgreSQL and running Core API, realtime, and context-engine HTTP services. Frontend `npm run test:run` then passed 118 regular tests and skipped the one opt-in cross-service test; TypeScript `tsc --noEmit` and the context-engine 17-test suite passed.

Test locations: [frontend tests](frontend/orchestrix_orbit_frontend/FRONTEND_TESTING.md), [Core API tests](backend/core-api/src/test/java), [realtime tests](backend/realtime-service/src/test/java), [context-engine tests](backend/context-engine/tests).
