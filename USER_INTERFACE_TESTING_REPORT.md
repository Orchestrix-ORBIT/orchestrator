# User Interface Testing Report

**Project:** Orchestrix ORBIT  
**Run date:** 27 September 2026  
**Result:** **PASS — 37 focused UI tests and 1 browser workflow passed; 0 failures**  
**Scope:** Sign-in, page interactions, navigation/layout components, and a real project workflow

## Test environment and approach

The component tests used Vitest, React Testing Library, and jsdom with real React page and layout components. They replace API, browser navigation, or storage dependencies where needed, so they verify rendering and interaction decisions without requiring a running backend. The browser test used Playwright Chromium with a running Next.js frontend, Core API, and disposable PostgreSQL 16 database at `127.0.0.1:55432/orchestrix_test`.

## Results

| Check | Result | Meaning |
| --- | --- | --- |
| Focused UI page and component suite | **37/37 passed** across 9 files | Tested the interactions listed below. |
| Real Chromium workflow | **1/1 passed** | Sign-in, project creation, team-linked sharing, role redirect, and allowed/denied project reads. |
| Full frontend Vitest suite | **134 passed, 2 skipped, 0 failed** across 21 files | The 37 focused UI tests are included in these 134 passes; they are not additional tests. |
| TypeScript check, `npx tsc --noEmit` | **Passed** | Frontend type checking reported no errors. |

The two skipped cases in the regular Vitest run require opt-in live services: the cross-service integration test and the live Supabase smoke test. They are not counted as UI failures.

## Focused UI cases

| Test file | Cases | Behavior verified |
| --- | ---: | --- |
| `app/__tests__/Home.test.tsx` | 3 | Sign-in sends tenant and credentials, saves the returned session and routes by role; an API error displays without saving credentials; mismatched registration passwords block submission. |
| `app/lead-dashboard/projects/__tests__/page.test.tsx` | 4 | Loading, project filtering, load errors, failed-create retry, and linking selected researchers to a new project's team. |
| `app/admin-dashboard/__tests__/layout.test.tsx` | 3 | Members and leads are redirected from admin content; administrators see it. |
| `app/dashboard/researcher/tasks/__tests__/page.test.tsx` | 2 | Task creation uses the selected project; a failed status update restores the previous card state. |
| `app/resource-dashboard/assets/__tests__/page.test.tsx` | 2 | Empty state, asset creation with selected options, and an API error that keeps the form open. |
| `app/dashboard/researcher/documents/__tests__/page.test.tsx` | 2 | Private document creation sends its project/access fields; canceled deletion keeps the document. |
| `components/layout/__tests__/Sidebar.test.tsx` | 9 | Navigation labels and active state, role-dependent admin link, organization name fallback, and sign-out navigation. |
| `components/layout/__tests__/AdminSidebar.test.tsx` | 7 | Admin navigation, active styling, branding, and sign-out behavior. |
| `components/ui/__tests__/LoadingState.test.tsx` | 5 | Default/custom loading text and the empty-subtitle case. |
| **Total** | **37** | All passed. |

## Browser workflow

The [Playwright test](frontend/orchestrix_orbit_frontend/e2e/workspace.spec.ts) created a temporary tenant and two users through the Core API, then drove the real browser UI. An administrator signed in and created a private project and a project linked to the member's team. The member signed in and was redirected away from the admin dashboard. The test then confirmed the member received **403** for the private project and **200** for the shared project. Playwright reported **1 passed** in **12.7 seconds**.

The browser runner stopped its Core API and Next.js processes after the test. The disposable PostgreSQL container was stopped after reporting was complete.

## Evidence and reproduction

The focused test sources are under [frontend/orchestrix_orbit_frontend/app](frontend/orchestrix_orbit_frontend/app) and [frontend/orchestrix_orbit_frontend/components](frontend/orchestrix_orbit_frontend/components). The Playwright [last-run marker](frontend/orchestrix_orbit_frontend/test-results/.last-run.json) records a passed browser run. The console results for this run were `37 passed` for the focused UI suite, `134 passed | 2 skipped` for the full Vitest suite, `1 passed` for Playwright, and exit code 0 for TypeScript.

From `frontend/orchestrix_orbit_frontend`, repeat the regular suite and type check with:

```bash
npm run test:run
npx tsc --noEmit
```

The nine focused UI test files can be run with `npx vitest run` and their paths from the table above. For the browser workflow, build the current Core API jar, start the isolated database as described in [backend/LOCAL_INTEGRATION_TESTING.md](backend/LOCAL_INTEGRATION_TESTING.md), set its local database environment variables, then run from the repository root:

```bash
bash backend/run_browser_e2e.sh
```

## Limits

The component tests mock their network and navigation dependencies. The browser workflow covers one sign-in and project-sharing journey. It does not exercise chat selection, AI summary display, every dashboard path, responsive layouts, visual appearance, or accessibility checks. The UI redirect is a presentation guard; authorization is also checked by the Core API and has separate server-side tests.
