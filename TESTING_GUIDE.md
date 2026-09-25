# Testing levels and current project status

Checked on **25 September 2026** on the `dev` branch (`c40308a`). The existing unit and small component test suites are implemented and passing: **271/271 tests** across the four components. Unit testing is therefore done for the behavior listed below, but coverage is not complete; the missing focused tests are listed under “What is still missing.” A passing test establishes only the behavior that the test actually exercises.

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
| **Frontend** | **117/117 passed on 25 September** across 13 Vitest files. They cover auth helpers, the API helper, service request construction, the tenant context, the chat hook, sidebars, and a loading component. `fetch`, the API module, STOMP/SockJS, and navigation are mocked where relevant. | No test connects the frontend to a running Core API, realtime service, or context engine. No browser journey test was found. |
| **Core API** | **116/116 focused tests passed on 25 September** across 13 classes using JDK 21. They cover service behavior, JWTs, and encryption; most service dependencies are mocked. | `CoreApiApplicationTests` checks Spring startup. `TenantMigrationIT` uses an isolated PostgreSQL database to check tenant schema creation and migrations. The repository's [local integration record](backend/LOCAL_INTEGRATION_TESTING.md) reports both passed with its test database, but these were not rerun on 25 September. No tracked test sends a real HTTP request through authentication, tenant routing, and persistence. |
| **Realtime service** | **21/21 focused tests passed on 25 September** across 6 classes using JDK 21. They cover chat service/controller logic and tenant context, filter, resolver, and connection provider behavior. The controller tests call methods directly with mocks. | `RealtimeServiceApplicationTests` checks Spring startup. `ChatDatabaseIT` sends and reads chat through the controller and checks a real tenant table; the [local integration record](backend/LOCAL_INTEGRATION_TESTING.md) reports it passed with a test database. It does not connect a STOMP client or assert delivery to a subscriber. These database tests were not rerun on 25 September. |
| **Context engine** | **17/17 passed on 25 September**: 7 summarizer tests and 10 API tests. The API tests include in-process HTTP requests to FastAPI, with the model call mocked. | [`tests/live_smoke.py`](backend/context-engine/tests/live_smoke.py) is an optional live Gemini check excluded from normal test discovery; the [context-engine testing record](backend/context-engine/CONTEXT_ENGINE_TESTING.md) reports one pass. It was not rerun on 25 September. There is no automated test of a frontend or Core API request reaching the context engine and returning a summary. |

### What is still missing

**Unit testing**

1. Frontend route pages and their role-specific interactions have no direct tests; the 13 Vitest files focus on shared helpers, services, context, and a few components. Add focused tests for important form validation, loading and error states, and role-based controls on the project, task, resource, document, and chat pages.
2. Core API controllers, security filters, exception handling, and notification behavior have no direct focused tests in `src/test`; the existing tests concentrate on services and utilities. Prioritize authorization and tenant-scoping decisions at those boundaries.
3. Realtime `WebSocketConfig` and STOMP connection behavior have no focused tests. The current chat controller unit test only verifies that a mocked messaging template was called.
4. Context-engine `config.py` and `run.sh` are not covered by the 17-test suite. Add tests if configuration fallback and startup behavior are important to your deployment.

**Integration testing**

1. Make the existing PostgreSQL tests repeatable in CI with an isolated database. Both `*IT` classes require `SPRING_DATASOURCE_URL` to point to the local test database and are excluded from the regular Maven `*Test` selection. A normal unit-test run does not exercise them.
2. Add real HTTP tests for Core API flows such as registration/login, authorized project and task operations, tenant isolation, and database reads/writes. The current `TenantMigrationIT` checks schema creation, not those user-facing API paths.
3. Add a realtime test using a connected STOMP client and subscriber, including tenant separation. The current `ChatDatabaseIT` checks controller-to-database behavior without the WebSocket transport.
4. Add cross-service checks for frontend API calls and chat-to-summary flow. The frontend tests mock network calls, while the context-engine HTTP tests mock Gemini. The optional live smoke check validates one model response but does not cover the full application path.

**System testing:** No automated full-product journey or recorded current system run was found. A browser-to-services test environment and a small set of user journeys are still needed.

## Verification notes (25 September 2026)

- Frontend: `npm run test:run` → **13 files, 117 tests passed**.
- Context engine: `venv/bin/python -m unittest discover -s tests -p 'test_*.py' -v` → **17 passed**.
- Core API: `JAVA_HOME=/home/sheharak/.jdks/jdk-21.0.6+7 ./mvnw -q -Dtest='*Test,!CoreApiApplicationTests' test` → **116 passed**.
- Realtime service: `JAVA_HOME=/home/sheharak/.jdks/jdk-21.0.6+7 ./mvnw -q -Dtest='*Test,!RealtimeServiceApplicationTests' test` → **21 passed**.
- The Java context and database integration tests require a database. See [LOCAL_INTEGRATION_TESTING.md](backend/LOCAL_INTEGRATION_TESTING.md) for the isolated PostgreSQL setup and the earlier recorded results. Those results are historical evidence, not a fresh run against today's checkout.

Test locations: [frontend tests](frontend/orchestrix_orbit_frontend/FRONTEND_TESTING.md), [Core API tests](backend/core-api/src/test/java), [realtime tests](backend/realtime-service/src/test/java), [context-engine tests](backend/context-engine/tests).
