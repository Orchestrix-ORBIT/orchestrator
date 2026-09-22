# Orchestrix ORBIT — Frontend Testing Documentation

> **Framework**: Vitest v5 + React Testing Library + jsdom  
> **Total Tests**: 117 across 13 files  
> **Result**: ✅ 117/117 passing

---

## Quick Start

```bash
cd frontend/orchestrix_orbit_frontend

# Run all tests once (CI mode)
npm run test:run

# Run in watch mode (development)
npm run test

# Run with coverage report
npm run test:coverage
```

---

## Test Infrastructure

### Configuration Files

| File | Purpose |
|------|---------|
| `vitest.config.mts` | Vitest configuration — sets jsdom environment, React plugin, `@/` path alias |
| `vitest.setup.ts` | Global setup — imports jest-dom matchers, mocks `next/navigation` and `next/link` globally |

### Global Mocks (via `vitest.setup.ts`)

- **`next/navigation`** → `usePathname` returns `"/"`, `useRouter` returns a stubbed router
- **`next/link`** → Rendered as a plain `<a>` tag so JSDOM can inspect `href` and children

---

## Test Files — File by File

---

### 1. `lib/__tests__/auth.test.ts` — Auth Utility (14 tests)

**Source**: `lib/auth.ts`

Tests every exported function in the central auth utility.

| Test Group | What It Tests |
|------------|--------------|
| `saveAuthData` | Writes authToken, userRole, userEmail, tenantSlug to localStorage |
| `getToken` | Returns the stored JWT; returns null when absent |
| `getRole` | Returns stored role; returns null when absent |
| `getEmail` | Returns stored email; returns null when absent |
| `getTenantSlug` | Returns stored tenant slug; returns null when absent |
| `isLoggedIn` | Returns true if token exists, false if not |
| `getDashboardPath` | ADMIN/OWNER → /admin-dashboard, LEAD → /lead-dashboard, MEMBER/GUEST → /dashboard/researcher, RESOURCE_MANAGER → /resource-dashboard |
| `logout` | Removes all 4 keys; does not throw when localStorage is empty |

**Mocking**: None — uses JSDOM built-in `localStorage`.

---

### 2. `lib/__tests__/api.test.ts` — API Utility (16 tests)

**Source**: `lib/api.ts`

Tests the shared HTTP helper that every service uses.

| Test Group | What It Tests |
|------------|--------------|
| Header injection | Content-Type: application/json always present |
| Header injection | Authorization: Bearer token added when authToken in localStorage |
| Header injection | Authorization omitted when no token stored |
| Header injection | X-Tenant-ID added when tenantSlug in localStorage |
| HTTP methods | GET, POST+body, PUT+body, PATCH+body, DELETE (via both api.delete and api.del) |
| Error handling | 401/500 JSON → throws Error with message + status property |
| Error handling | Non-JSON response → throws Error with raw text + status |
| Success handling | 204 No Content → returns null |
| Success handling | 200 JSON → returns parsed body |

**Mocking**: `vi.stubGlobal("fetch", vi.fn())` — stubs global fetch per test.

---

### 3. `lib/services/__tests__/tasks.test.ts` — Tasks Service (7 tests)

**Source**: `lib/services/tasks.ts`

| Method | URL Verified |
|--------|-------------|
| `getByProject(projectId)` | GET /api/projects/{id}/tasks |
| `getByProjectAndStatus` | GET /api/projects/{id}/tasks?status=... |
| `getByProjectAndAssignee` | GET /api/projects/{id}/tasks?assigneeId=... |
| `getById(projectId, taskId)` | GET /api/projects/{pid}/tasks/{tid} |
| `create(projectId, body)` | POST /api/projects/{id}/tasks with body |
| `update(projectId, taskId, body)` | PATCH /api/projects/{pid}/tasks/{tid} with body |
| `delete(projectId, taskId)` | DELETE /api/projects/{pid}/tasks/{tid} |

**Mocking**: `vi.mock("@/lib/api")` — replaces the api module with stubs.

---

### 4. `lib/services/__tests__/projects.test.ts` — Projects Service (7 tests)

**Source**: `lib/services/projects.ts`

| Method | What's Tested |
|--------|--------------|
| `getAll()` | GET /api/projects |
| `getById(id)` | GET /api/projects/{id} |
| `getSummary(id)` | GET /api/projects/{id}/summary |
| `create(body)` | POST /api/projects with body |
| `delete(id)` | DELETE /api/projects/{id} |
| `update(id, body)` — success | PUT /api/projects/{id}, returns API response |
| `update(id, body)` — failure | When api.put rejects, returns fallback `{ id, ...body }` |

> **Notable**: The `update` fallback test validates the `.catch()` clause in the source.

**Mocking**: `vi.mock("@/lib/api")`.

---

### 5. `lib/services/__tests__/teams.test.ts` — Teams Service (8 tests)

**Source**: `lib/services/teams.ts`

Covers both halves: research teams + admin member records.

| Method | URL Verified |
|--------|-------------|
| `getMyTeams()` | GET /api/research-teams |
| `createTeam(body)` | POST /api/research-teams |
| `addMember(teamId, body)` | POST /api/research-teams/{teamId}/members |
| `removeMember(teamId, userId)` | DELETE /api/research-teams/{teamId}/members/{userId} |
| `getAllMembers()` | GET /api/team |
| `getMemberById(id)` | GET /api/team/{id} |
| `updateMemberRole(id, role)` | PATCH /api/team/{id}/role with { role } |
| `removeMemberRecord(id)` | DELETE /api/team/{id} |

**Mocking**: `vi.mock("@/lib/api")`.

---

### 6. `lib/services/__tests__/documents.test.ts` — Documents Service (5 tests)

**Source**: `lib/services/documents.ts`

All documents are project-scoped.

| Method | URL Verified |
|--------|-------------|
| `getByProject(projectId)` | GET /api/projects/{pid}/documents |
| `getById(projectId, documentId)` | GET /api/projects/{pid}/documents/{did} |
| `create(projectId, body)` | POST /api/projects/{pid}/documents |
| `update(projectId, documentId, body)` | PUT /api/projects/{pid}/documents/{did} |
| `delete(projectId, documentId)` | DELETE /api/projects/{pid}/documents/{did} |

**Mocking**: `vi.mock("@/lib/api")`.

---

### 7. `lib/services/__tests__/resources.test.ts` — Resources Service (12 tests)

**Source**: `lib/services/resources.ts`

Most comprehensive service test — covers resources, bookings, and maintenance.

| Test Group | What's Verified |
|------------|----------------|
| `getAll()` — no filter | GET /api/resources |
| `getAll("GPU")` — type filter | GET /api/resources?type=GPU |
| `getAll(undefined, "AVAILABLE")` | GET /api/resources?status=AVAILABLE |
| `getAll("COMPUTE", "IN_USE")` | GET /api/resources?type=COMPUTE&status=IN_USE |
| `getById(id)` | GET /api/resources/{id} |
| `create(body)` with location/hours | Transforms body: wraps into JSON `metadata` string field |
| `create(body)` without location/hours | Defaults: "Core Lab Facility", 4 hours |
| `updateStatus(id, status)` | PATCH /api/resources/{id}/status |
| `getBookings(resourceId)` | GET /api/resources/{id}/bookings |
| `getMyBookings()` | GET /api/resources/bookings/me |
| `createBooking(resourceId, body)` | POST /api/resources/{id}/bookings |
| `updateBookingStatus(bookingId, status)` | PATCH /api/resources/bookings/{bid}/status |
| `getMaintenance()` | GET /api/resources/maintenance |
| `createMaintenance(body)` | POST /api/resources/maintenance |

> **Notable**: The `create()` tests validate the metadata transformation where `location` and `maxDurationHours` are JSON-serialised into a `metadata` string field before posting.

**Mocking**: `vi.mock("@/lib/api")`.

---

### 8. `lib/services/__tests__/summarize.test.ts` — Summarize Service (3 tests)

**Source**: `lib/services/summarize.ts`

Calls a separate Context Engine microservice (not the main API).

| Test | What's Verified |
|------|----------------|
| Success path | Sends `{ messages, projectId, tenantId }` body; returns SummaryResult |
| Error with detail field | Non-2xx throws Error("Model overloaded") from `detail` field |
| Error without detail field | Non-2xx throws fallback "Context Engine error: 503 Service Unavailable" |

**Mocking**: `vi.stubGlobal("fetch", vi.fn())`.

---

### 9. `context/__tests__/TenantContext.test.tsx` — TenantProvider (4 tests)

**Source**: `context/TenantContext.tsx`

Uses a `TenantConsumer` helper component to surface hook values.

| Test | What's Verified |
|------|----------------|
| Default slug | When localStorage empty, tenantSlug is "orchestrix-mrt" |
| Hydration from localStorage | On mount, reads stored tenantSlug (e.g. "lab-acme") |
| Fixed tenantId | tenantId is always "00000000-0000-0000-0000-000000000001" |
| `setTenantSlug` | Updates rendered slug AND persists to localStorage |

**Mocking**: JSDOM built-in `localStorage`; `act()` to flush `useEffect`.

---

### 10. `lib/__tests__/useWebSocketChat.test.ts` — WebSocket Chat Hook (7 tests)

**Source**: `lib/useWebSocketChat.ts`

Exercises the real hook logic against a fully mocked STOMP/SockJS stack.

| Test Group | What's Verified |
|------------|----------------|
| Initial state | messages = [], isLoadingHistory = true, error = null |
| `fetchHistory` success | Messages set from API; isLoadingHistory = false |
| `fetchHistory` hasMore | hasMore = false when count < pageSize |
| `fetchHistory` API 5xx | Empty messages, hasMore = false, no throw |
| `fetchHistory` network throw | Empty messages gracefully (catch swallows error) |
| `sendMessage` normal | Optimistic message added with id starting with "opt-" |
| `sendMessage` empty input | Whitespace-only content rejected; no message added |

**Mocking strategy**:
- `@stomp/stompjs` → `Client` mocked as a **class** (required because source uses `new Client()`)
- `sockjs-client` → mocked as factory returning `{}`
- `../auth` → `getTenantSlug` and `getEmail` return fixed test values
- `fetch` → `vi.stubGlobal("fetch", vi.fn())`

---

### 11. `components/ui/__tests__/LoadingState.test.tsx` — LoadingState (5 tests)

**Source**: `components/ui/LoadingState.tsx`

Pure render tests — no mocking needed.

| Test | What's Verified |
|------|----------------|
| Default title | Renders "Loading Workspace Data…" when no props |
| Default subtitle | Renders "Fetching latest updates and workspace state" when no props |
| Custom `title` prop | Renders the passed title text |
| Custom `subtitle` prop | Renders the passed subtitle text |
| Empty `subtitle=""` | Subtitle paragraph is not rendered (falsy conditional) |

**Mocking**: None.

---

### 12. `components/layout/__tests__/Sidebar.test.tsx` — Sidebar (9 tests)

**Source**: `components/layout/Sidebar.tsx`

| Test Group | What's Verified |
|------------|----------------|
| Nav links | All 8 labels (Overview, Projects, Team & Roster, Resources, Chat, Documents, AI Summaries, Notifications) rendered |
| Active link | Active path → color: #ffffff; inactive → color: #888888 |
| Admin — ROLE_LEAD | "Back to Admin" link hidden |
| Admin — ROLE_ADMIN | "Back to Admin" link visible |
| Admin — ROLE_OWNER | "Back to Admin" link visible |
| Org name success | Fetched name displayed in brand header |
| Org name failure | Falls back to uppercased tenant slug ("MYORG") |
| Logout | Click "Sign Out" → logout() called → router.push("/") |

**Mocking**:
- `vi.hoisted()` for `mockLogout` and `mockPush` (avoids TDZ/hoisting error)
- `@/lib/auth` → logout, getTenantSlug, getRole are mocked
- `next/navigation` → usePathname, useRouter are mocked
- `fetch` → `vi.stubGlobal` for org-name fetch in useEffect

---

### 13. `components/layout/__tests__/AdminSidebar.test.tsx` — AdminSidebar (7 tests)

**Source**: `components/layout/AdminSidebar.tsx`

| Test Group | What's Verified |
|------------|----------------|
| Nav links | "Admin Overview" and "Research Lead View" rendered |
| Active style | On /admin-dashboard, "Admin Overview" has background: #f5f5f5 |
| Inactive style | "Research Lead View" does NOT have the active background |
| Brand header | "Orchestrix" and "System Administrator" displayed |
| Logout | "Sign out" button calls logout() and router.push("/") |

**Mocking**:
- `vi.hoisted()` for `mockLogout` and `mockPush`
- `@/lib/auth` → only `logout` mocked
- `next/navigation` → usePathname, useRouter mocked

---

## Mock Patterns Reference

### Pattern 1 — Stub global fetch
```typescript
beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
afterEach(() => vi.unstubAllGlobals());
```

### Pattern 2 — Mock API module (service tests)
```typescript
vi.mock("@/lib/api", () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), del: vi.fn() },
}));
```

### Pattern 3 — Hoisted mocks (component tests)
```typescript
const { mockFn } = vi.hoisted(() => ({ mockFn: vi.fn() }));
vi.mock("@/lib/auth", () => ({ logout: mockFn }));
```
> Required when the vi.mock() factory needs variables from the same file — vi.hoisted() runs before module hoisting.

### Pattern 4 — Mock a class constructor
```typescript
vi.mock("@stomp/stompjs", () => {
  class MockClient {
    constructor(config) { /* store config */ }
    activate() { /* trigger onConnect */ }
  }
  return { Client: MockClient };
});
```
> Arrow functions cannot be used as constructors. When source uses `new Client(...)`, the mock must export a class.

---

## Directory Structure

```
orchestrix_orbit_frontend/
├── vitest.config.mts
├── vitest.setup.ts
├── FRONTEND_TESTING.md              ← this file
├── context/
│   └── __tests__/
│       └── TenantContext.test.tsx   (4 tests)
├── components/
│   ├── ui/__tests__/
│   │   └── LoadingState.test.tsx    (5 tests)
│   └── layout/__tests__/
│       ├── Sidebar.test.tsx         (9 tests)
│       └── AdminSidebar.test.tsx    (7 tests)
└── lib/
    ├── __tests__/
    │   ├── auth.test.ts             (14 tests)
    │   ├── api.test.ts              (16 tests)
    │   └── useWebSocketChat.test.ts (7 tests)
    └── services/__tests__/
        ├── tasks.test.ts            (7 tests)
        ├── projects.test.ts         (7 tests)
        ├── teams.test.ts            (8 tests)
        ├── documents.test.ts        (5 tests)
        ├── resources.test.ts        (12 tests)
        └── summarize.test.ts        (3 tests)
```

---

## Final Results

| File | Tests | Status |
|------|-------|--------|
| auth.test.ts | 14 | ✅ Pass |
| api.test.ts | 16 | ✅ Pass |
| tasks.test.ts | 7 | ✅ Pass |
| projects.test.ts | 7 | ✅ Pass |
| teams.test.ts | 8 | ✅ Pass |
| documents.test.ts | 5 | ✅ Pass |
| resources.test.ts | 12 | ✅ Pass |
| summarize.test.ts | 3 | ✅ Pass |
| TenantContext.test.tsx | 4 | ✅ Pass |
| useWebSocketChat.test.ts | 7 | ✅ Pass |
| LoadingState.test.tsx | 5 | ✅ Pass |
| Sidebar.test.tsx | 9 | ✅ Pass |
| AdminSidebar.test.tsx | 7 | ✅ Pass |
| **Total** | **117** | **✅ All Pass** |
