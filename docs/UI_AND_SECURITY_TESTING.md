# User interface and security testing

Checked on 26 September 2026. The defined UI and access-control test cases below were run locally. Like any test suite, they establish the listed behaviors rather than every possible interaction or attack.

## User interface tests

The frontend uses Vitest, React Testing Library, and jsdom. The new tests render real page and layout components while replacing network and navigation dependencies.

| Test file | Behavior checked |
| --- | --- |
| `app/__tests__/Home.test.tsx` | Sign in sends the chosen tenant and credentials, stores the returned token, and routes by role; an API rejection displays an error without storing credentials; mismatched registration passwords stop submission. |
| `app/lead-dashboard/projects/__tests__/page.test.tsx` | The page shows a loading state, filters loaded projects, displays a load error, and lets a user retry a failed create operation. |
| `app/admin-dashboard/__tests__/layout.test.tsx` | Members and leads are redirected away from admin content; an admin sees it. This is a UI gate only, since browser storage is user controlled. |
| `app/dashboard/researcher/tasks/__tests__/page.test.tsx` | Task status changes call the API and roll back when it rejects an update; task creation uses the selected project. |
| `app/resource-dashboard/assets/__tests__/page.test.tsx` | Empty asset state, creation with selected options, and a failed submission that preserves form input. |
| `app/dashboard/researcher/documents/__tests__/page.test.tsx` | Creating a private document sends its access level and content; canceling deletion leaves the document intact. |

Run the full frontend suite:

```bash
cd frontend/orchestrix_orbit_frontend
npm run test:run
npx tsc --noEmit
```

Result in this workspace: **134 passed, 2 opt-in integration tests skipped** across 21 files; TypeScript passed. Sixteen of the passing UI tests above are new.

The Chrome test at `e2e/workspace.spec.ts` runs with a real Next.js page, Core API, and disposable PostgreSQL. It signs in as an administrator, creates a private and a team-linked project, signs in as a member, verifies the admin-page redirect, and checks both denied and allowed project reads. Run it with `bash backend/run_browser_e2e.sh` after building the Core API jar and starting the isolated database. The runner starts and stops the application services.

## Security and access control tests

| Boundary | Test and expected result |
| --- | --- |
| JWT authentication filter | `JwtAuthFilterTest` checks absent, malformed, rejected, and valid bearer tokens. A malformed token leaves the request unauthenticated; a valid token supplies its role. Four tests passed locally. |
| Anonymous Core API reads | `CoreApiHttpIT` expects 403 for unauthenticated project, resource, team, and chat-history reads. Security rules now require a JWT for these routes. |
| Role restrictions | `CoreApiHttpIT` checks that a member cannot create a project or patch/delete a team member. Existing checks cover other unauthorized writes. |
| Tenant isolation | Existing `CoreApiHttpIT`, `ChatStompIT`, and `ChatProjectAccessIT` exercise selected tenant and chat project boundaries against isolated PostgreSQL. See [INTEGRATION_TESTING.md](INTEGRATION_TESTING.md). |
| Tenant administration | Provisioning requires an administrator JWT or a configured `TENANT_BOOTSTRAP_KEY`; tenant listing and status changes require an administrator. The HTTP test rejects absent/wrong keys and member access. |
| Project membership | Core API project URLs, nested task/document URLs, and chat history check owner or research-team membership. Project lists are filtered; HTTP tests check outsiders, members, and revoked membership. |
| Notifications and resources | HTTP tests check user-scoped notification reads/updates and deny resource-management writes by members. |

Run the Core API unit tests and the isolated database HTTP tests:

```bash
cd backend/core-api
JAVA_HOME=/home/sheharak/.jdks/jdk-21.0.6+7 ./mvnw -q -Dtest='*Test,!CoreApiApplicationTests' test
# After configuring the isolated PostgreSQL database described below:
JAVA_HOME=/home/sheharak/.jdks/jdk-21.0.6+7 ./mvnw -q -Dtest=CoreApiHttpIT test
```

`CoreApiHttpIT` runs only when `SPRING_DATASOURCE_URL` targets `jdbc:postgresql://127.0.0.1:55432/orchestrix_test...` or the equivalent `localhost` address. Follow [backend/LOCAL_INTEGRATION_TESTING.md](backend/LOCAL_INTEGRATION_TESTING.md) to configure it. It passed **5/5 tests** against a disposable PostgreSQL 16 container in this run, including the new anonymous-read, role-denial, and cross-tenant assertions. The container was stopped afterward.

The focused Core API unit suite passed **121/121 tests** across 14 classes locally.

## Scope boundary

The browser journey covers authentication and project authorization. Chat selection and AI summary display have service and protocol tests, but are not part of this browser case. The bootstrap key must be supplied as a deployment secret; the application has no built-in JWT or encryption secret. Broader penetration testing and every UI branch are outside this test matrix.
