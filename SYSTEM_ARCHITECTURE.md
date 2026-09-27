# Orchestrix — System Architecture & Database Design

## Overview

Orchestrix is a **multi-tenant project management backend** built with Spring Boot and PostgreSQL.
"Multi-tenant" means multiple companies (tenants) share the same application and database server,
but each company's data is **completely isolated** from others.

---

## How Multi-Tenancy Works Here

The isolation strategy used is **Schema-per-Tenant**.

Every company gets its own PostgreSQL *schema* (think of a schema as a folder inside the database).
All tables inside that schema belong only to that company.

```
orchestrator_db (one database)
│
├── public                          ← Shared global schema
│   └── tenants                     ← Registry of all companies
│
├── org_acme                        ← Schema for "ACME Corp"
│   ├── users
│   ├── projects
│   ├── tasks
│   ├── resources
│   ├── student_profiles
│   ├── research_teams
│   ├── team_members
│   ├── resource_bookings
│   ├── chat_messages
│   ├── documents
│   ├── ai_summaries
│   ├── notifications
│   └── audit_logs
│
└── org_research_lab                ← Schema for "Research Lab"  (same 13 tables)
    └── ...
```

When a request comes in with header `X-Tenant-ID: acme`, the system automatically
routes all database queries to the `org_acme` schema.

---

## Request Lifecycle

```
HTTP Request (X-Tenant-ID: acme)
        │
        ▼
┌─────────────────┐
│  TenantFilter   │  → Reads header, sets "org_acme" into TenantContext (thread-local)
└─────────────────┘
        │
        ▼
┌─────────────────┐
│   Controller    │  → Receives the request, calls Service
└─────────────────┘
        │
        ▼
┌─────────────────┐
│    Service      │  → Business logic
└─────────────────┘
        │
        ▼
┌──────────────────────────────────────┐
│  Hibernate (via HibernateConfig)     │
│  asks: "which schema for this query?"│
└──────────────────────────────────────┘
        │
        ▼
┌────────────────────────────┐
│  TenantIdentifierResolver  │  → Returns "org_acme" from TenantContext
└────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────┐
│  SchemaMultiTenantConnectionProvider   │  → Runs: SET search_path TO org_acme, public
└────────────────────────────────────────┘
        │
        ▼
┌──────────────┐
│  PostgreSQL  │  → Executes query inside org_acme schema
└──────────────┘
```

---

## Infrastructure (Docker Compose)

The `backend/docker-compose.yml` spins up three services for the full infrastructure:

| Service | Image | Port | Purpose |
|---|---|---|---|
| `postgres` | `postgres:15-alpine` | `5432` | Main database — stores all tenant and app data |
| `redis` | `redis:7-alpine` | `6379` | Caching / session storage (planned) |
| `minio` | `minio/minio` | `9000 / 9001` | Object storage for file uploads (planned) |

Credentials are read from the `backend/.env` file:
```
POSTGRES_USER=orchestrix_app
POSTGRES_PASSWORD=app_secret_password
POSTGRES_DB=orchestrator_db
```

---

## Database Initialization

#### `backend/init-db/01_init.sql`
**Runs: once, only when the Docker PostgreSQL container starts for the first time**

This script bootstraps the database with the correct user and permissions:
1. Creates the `public` schema
2. Creates the `orchestrix_app` role (the Spring Boot app's DB user)
3. Grants it `CONNECT`, `USAGE`, `CREATE` on the database and public schema
4. Grants all privileges on existing and future tables/sequences

This is the script you manually ran when setting up PostgreSQL locally.
With Docker Compose, it runs automatically on `docker-compose up`.

---

## File-by-File Breakdown

### Configuration Files

---

#### `application.yml`
The master configuration file. Tells Spring Boot:
- Which PostgreSQL database to connect to (`orchestrator_db` at `localhost:5432`)
- Which user/password to use (`orchestrix_app` / `app_secret_password`)
- Where Flyway migration scripts live (`classpath:db/migration/public`)
- That Hibernate should `validate` (never auto-create or modify tables)

---

#### `pom.xml`
Maven build file. Lists all external libraries:
- `spring-boot-starter-data-jpa` — database access via Hibernate
- `spring-boot-starter-webmvc` — HTTP server (Tomcat)
- `spring-boot-starter-security` — authentication layer
- `spring-boot-starter-validation` — request body validation (`@NotBlank` etc.)
- `postgresql` — JDBC driver to talk to PostgreSQL
- `flyway-core` + `flyway-database-postgresql` — database migration tool
- `lombok` — code generator (removes boilerplate like getters/setters)

---

### `config/` Package

---

#### `FlywayConfig.java`
Creates the Flyway bean manually (instead of relying on Spring Boot auto-configuration,
which stops working when you provide a custom `EntityManagerFactory`).

**What it does:**
1. Connects Flyway to the DataSource (the PostgreSQL connection pool)
2. Points it at `classpath:db/migration/public` (the public schema scripts)
3. Calls `flyway.migrate()` on startup — creates `public.tenants` if it doesn't exist

**When it runs:** Every app startup. Flyway tracks which scripts already ran in its
internal `flyway_schema_history` table and skips them.

---

#### `HibernateConfig.java`
Wires multi-tenancy into Spring's JPA layer.

Without this class, Hibernate would always query the `public` schema regardless
of which tenant is making the request. This class tells Hibernate:
- Use `SchemaMultiTenantConnectionProvider` to get DB connections
- Use `TenantIdentifierResolver` to know which tenant schema to switch to
- Validate schema on startup (`ddl-auto: validate`) — never auto-create tables

The `Flyway flyway` parameter in `entityManagerFactory(DataSource, Flyway)` forces
Spring to create and run Flyway **before** Hibernate tries to validate the schema.

---

#### `SecurityConfig.java`
> ⚠️ **Development only** — currently disables all authentication.

Permits all HTTP requests without any username/password.
Replace with JWT or OAuth2 before going to production.

---

### `multitenancy/` Package

---

#### `TenantContext.java`
A **ThreadLocal** storage container.

Since each HTTP request runs on its own thread, storing the tenant schema name here
means it is automatically isolated between concurrent requests.

```
Request A (thread 1) → TenantContext holds "org_acme"
Request B (thread 2) → TenantContext holds "org_research_lab"
```

---

#### `TenantFilter.java`
A **Servlet Filter** — intercepts every single incoming HTTP request.

1. Reads the `X-Tenant-ID` header (e.g. `"acme"`)
2. Converts it to a schema name: `"acme"` → `"org_acme"`
3. Stores it in `TenantContext`
4. After the request finishes, calls `TenantContext.clear()` in a `finally` block

The `finally` block is critical — threads are reused from a pool. Not clearing
would leak one tenant's context into the next request on the same thread.

---

#### `TenantIdentifierResolver.java`
Implements Hibernate's `CurrentTenantIdentifierResolver`.

Called before every Hibernate query to ask: *"which tenant schema should I use?"*
Returns the value from `TenantContext`, or `"public"` as default.

---

#### `SchemaMultiTenantConnectionProvider.java`
Implements Hibernate's `MultiTenantConnectionProvider`.

When Hibernate needs a connection for a tenant:
1. Gets a connection from the HikariCP pool
2. Runs `SET search_path TO org_acme, public`
3. Returns connection to Hibernate

When done:
1. Resets: `SET search_path TO public`
2. Returns connection to pool

---

#### `TenantMigrationService.java`
Called once when a new tenant is provisioned.

1. `CREATE SCHEMA IF NOT EXISTS org_acme`
2. `GRANT ALL ON SCHEMA org_acme TO orchestrix_app`
3. Runs a second Flyway instance on `classpath:db/tenant` inside that schema
   — creates all 13 tables (V1 through V10)

---

### `tenant/` Package

---

#### `Tenant.java`
JPA entity mapped to `public.tenants`.

| Java field | DB column | Purpose |
|---|---|---|
| `id` | `id UUID` | Auto-generated primary key |
| `slug` | `slug VARCHAR(63)` | Short URL-safe name: `"acme"` |
| `name` | `name VARCHAR(255)` | Display name: `"ACME Corp"` |
| `schemaName` | `schema_name VARCHAR(63)` | PostgreSQL schema: `"org_acme"` |
| `status` | `status VARCHAR(50)` | `ACTIVE` / `SUSPENDED` / `DELETED` |
| `createdAt` | `created_at TIMESTAMPTZ` | Auto-set on insert |
| `updatedAt` | `updated_at TIMESTAMPTZ` | Auto-updated on every save |

---

#### `TenantStatus.java`
Enum: `ACTIVE`, `SUSPENDED`, `DELETED`. Stored as a string in the DB.

---

#### `TenantRepository.java`
JPA repository for `Tenant`. Spring auto-generates SQL from method names:
- `findBySlug(slug)` — used in most lookups
- `existsBySlug(slug)` — used in duplicate check before creating
- `findBySlugAndStatus(slug, status)` — used by TenantFilter to verify ACTIVE status

---

#### `TenantProvisionRequest.java`
Request DTO — the JSON body sent when creating a tenant:
```json
{ "slug": "acme", "name": "ACME Corp" }
```
Both fields have `@NotBlank` validation. `@Valid` in the controller triggers it.

---

#### `TenantResponse.java`
Response DTO returned after create/fetch. Converts a `Tenant` entity via
`TenantResponse.from(tenant)` static factory. Decouples the API contract from DB model.

---

#### `TenantService.java`
Business logic layer:
- `provisionTenant()` — validates slug uniqueness, derives schema name, saves tenant, calls `TenantMigrationService`
- `getTenantBySlug()` — fetch one tenant
- `getAllTenants()` — fetch all
- `updateStatus()` — suspend / reactivate

---

#### `TenantController.java`
HTTP endpoints:

| Method | URL | Purpose |
|---|---|---|
| `POST` | `/api/admin/tenants` | Create + provision new tenant |
| `GET` | `/api/admin/tenants` | List all tenants |
| `GET` | `/api/admin/tenants/{slug}` | Get one tenant |
| `PATCH` | `/api/admin/tenants/{id}/status?status=SUSPENDED` | Change status |

---

#### `CoreApiApplication.java`
Entry point. `@SpringBootApplication` triggers component scanning and auto-configuration.

---

## Database Migration Files

### Public Schema (runs on app startup)

#### `db/migration/public/V1__create_tenants.sql`
Creates `public.tenants` table with indexes on `slug` and `status`.

---

### Tenant Schema Template (runs once per tenant on provisioning)

All scripts below run inside the tenant's own schema (e.g. `org_acme`).

| File | Tables Created | Key Relationships |
|---|---|---|
| `V1__create_users.sql` | `users` | Base table — all others reference this |
| `V2__create_projects.sql` | `projects` | Has `owner_id → users` |
| `V3__create_tasks.sql` | `tasks` | Has `project_id → projects`, `assignee_id → users` |
| `V4__create_resources.sql` | `resources` | Standalone equipment/room registry |
| `V5__create_student_profiles.sql` | `student_profiles` | `user_id → users` (1:1), adds academic info |
| `V6__create_research_teams.sql` | `research_teams`, `team_members` | `leader_id → users`; junction table for members |
| `V7__create_resource_bookings.sql` | `resource_bookings` | `resource_id → resources`, `user_id → users`, time-slot booking with constraint `end_time > start_time` |
| `V8__create_chat_messages.sql` | `chat_messages` | `project_id → projects`, `sender_id → users`, `content_encrypted` (end-to-end encrypted) |
| `V9__create_documents_and_ai_summaries.sql` | `documents`, `ai_summaries` | Documents linked to projects; AI summaries store `action_items` and `deadline_suggestions` as JSONB |
| `V10__create_notifications_and_audit_logs.sql` | `notifications`, `audit_logs` | User notifications + full activity audit trail with `ip_address` |

---

## What Happens When You Create a Tenant

```
POST /api/admin/tenants
Body: { "slug": "acme", "name": "ACME Corp" }

1. TenantController receives request
2. @Valid triggers @NotBlank validation on slug and name
3. TenantService.provisionTenant() is called:
   a. Slug uniqueness check
   b. Derives schema name: "acme" → "org_acme"
   c. Saves row to public.tenants
   d. TenantMigrationService.provisionTenantSchema("org_acme"):
      i.  CREATE SCHEMA IF NOT EXISTS org_acme
      ii. GRANT ALL ON SCHEMA org_acme TO orchestrix_app
      iii.Flyway runs V1-V10 creating 13 tables inside org_acme
4. Returns 201 Created with TenantResponse JSON
```

---

## What's Not Built Yet

| Feature | Status |
|---|---|
| User login / JWT authentication | ❌ |
| Project CRUD endpoints | ❌ |
| Task CRUD endpoints | ❌ |
| Resource management endpoints | ❌ |
| Chat / messaging endpoints | ❌ |
| Document management endpoints | ❌ |
| AI summary integration | ❌ |
| Redis usage (caching/sessions) | ❌ |
| MinIO usage (file storage) | ❌ |
| Frontend UI | ❌ |
| Production security (real auth) | ❌ |
