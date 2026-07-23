# 🗄️ Multi-Tenant Multi-Schema Database Workflow
### Orchestrix — Privacy-Preserving Collaborative Resource & Task Orchestrator

> **Stack**: PostgreSQL 15 · Spring Boot 4.x (Core API) · Spring Data JPA / Hibernate · Flyway

---

## Table of Contents

1. [Tenancy Strategy Decision](#1-tenancy-strategy-decision)
2. [Database Architecture Overview](#2-database-architecture-overview)
3. [Phase 1 — PostgreSQL & Docker Setup](#phase-1--postgresql--docker-setup)
4. [Phase 2 — Add Required Dependencies (pom.xml)](#phase-2--add-required-dependencies-pomxml)
5. [Phase 3 — Public Schema (Shared / System Tables)](#phase-3--public-schema-shared--system-tables)
6. [Phase 4 — Tenant Schema Design (Per-Org Tables)](#phase-4--tenant-schema-design-per-org-tables)
7. [Phase 5 — Flyway Multi-Tenant Migrations](#phase-5--flyway-multi-tenant-migrations)
8. [Phase 6 — Spring Boot Tenant Routing Configuration](#phase-6--spring-boot-tenant-routing-configuration)
9. [Phase 7 — JPA / Hibernate Multi-Tenant Setup](#phase-7--jpa--hibernate-multi-tenant-setup)
10. [Phase 8 — Tenant Provisioning API](#phase-8--tenant-provisioning-api)
11. [Phase 9 — Security & Row-Level Isolation](#phase-9--security--row-level-isolation)
12. [Phase 10 — Verification & Testing](#phase-10--verification--testing)
13. [Summary Checklist](#summary-checklist)

---

## 1. Tenancy Strategy Decision

There are three common multi-tenancy patterns. We select **Strategy B** for Orchestrix.

| Strategy | Isolation | Resource Cost | Complexity | Best For |
|---|---|---|---|---|
| **A. Separate Database** | ★★★ Highest | ★★★ Highest | Medium | Max isolation, e.g., government |
| **B. Shared DB, Separate Schema** ✅ | ★★ High | ★★ Medium | Medium | SaaS with strong isolation needs |
| **C. Shared DB, Shared Schema** | ★ Low | ★ Low | Low | High-volume, low-isolation apps |

### Why Strategy B (Schema-per-Tenant)?

- Each **organization (tenant)** gets its own PostgreSQL **schema** (e.g., `org_acme`, `org_research_lab`) inside a single `orchestrator_db` database.
- A **shared `public` schema** holds global/system data (tenants registry, plans, audit logs).
- **Strong data isolation** — a bug in one tenant's query cannot accidentally leak another tenant's data.
- **Cost-effective** — a single PostgreSQL instance serves all tenants.
- **Easy backup per tenant** — `pg_dump -n org_acme orchestrator_db`.
- Aligns perfectly with your **privacy-preserving** system goals.

---

## 2. Database Architecture Overview

```
PostgreSQL: orchestrator_db
│
├── Schema: public                    ← Global / Shared System Schema
│   ├── tenants                       ← Registry of all orgs / tenants
│   ├── plans                         ← Subscription plans (Free, Pro, Enterprise)
│   └── audit_log                     ← Cross-tenant system events
│
├── Schema: org_{tenant_slug}         ← Auto-provisioned per Organization
│   ├── users                         ← Members of this org
│   ├── user_roles                    ← Roles within this org
│   ├── projects                      ← Research projects
│   ├── tasks                         ← Tasks within projects
│   ├── resources                     ← Compute/storage resources
│   ├── resource_allocations          ← Task ↔ Resource links
│   ├── messages                      ← Chat messages (if stored)
│   └── files                         ← File metadata (MinIO refs)
│
└── Schema: org_{another_slug}        ← Another tenant's isolated world
    └── (same tables, fully isolated)
```

### Tenant Identification Flow

```
HTTP Request
    │
    ├─► Header: X-Tenant-ID: acme         ← Option 1 (API-to-API, recommended)
    ├─► Subdomain: acme.orchestrix.app    ← Option 2 (Web clients)
    └─► JWT Claim: tenant_id: acme        ← Option 3 (After auth, most secure)
         │
         ▼
  TenantContext (ThreadLocal)
         │
         ▼
  DataSource → SET search_path = org_acme
         │
         ▼
  Hibernate executes queries in org_acme schema
```

---

## Phase 1 — PostgreSQL & Docker Setup

### Step 1.1 — Update `docker-compose.yml`

Add an **init script** mount so PostgreSQL runs setup SQL on first start.

```yaml
# backend/docker-compose.yml
postgres:
  image: postgres:15-alpine
  environment:
    POSTGRES_USER: orchestrator_user
    POSTGRES_PASSWORD: orchestrator_password
    POSTGRES_DB: orchestrator_db
  ports:
    - "5432:5432"
  volumes:
    - postgres_data:/var/lib/postgresql/data
    - ./init-db:/docker-entrypoint-initdb.d   # ← ADD THIS
  restart: unless-stopped
```

### Step 1.2 — Create `init-db/01_init.sql`

```sql
-- backend/init-db/01_init.sql
-- This runs once when the container is first created.

-- Ensure the public schema exists (it does by default, but be explicit)
CREATE SCHEMA IF NOT EXISTS public;

-- Create a dedicated role for the application (least-privilege principle)
-- The main POSTGRES_USER already has superuser; this app role is restricted.
CREATE ROLE orchestrix_app WITH LOGIN PASSWORD 'app_secret_password';

-- Grant privileges on the orchestrator_db database
GRANT CONNECT ON DATABASE orchestrator_db TO orchestrix_app;
GRANT USAGE ON SCHEMA public TO orchestrix_app;
GRANT CREATE ON SCHEMA public TO orchestrix_app;  -- Flyway needs this to create tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO orchestrix_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO orchestrix_app;

-- Allow the app role to create schemas (needed for tenant provisioning)
GRANT CREATE ON DATABASE orchestrator_db TO orchestrix_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON TABLES TO orchestrix_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL ON SEQUENCES TO orchestrix_app;
```

> [!NOTE]
> The `orchestrix_app` role is the role Spring Boot will use in `application.properties`. The superuser `orchestrator_user` is only for DBA tasks.

---

## Phase 2 — Add Required Dependencies (`pom.xml`)

Add the following to your `core-api/pom.xml`:

```xml
<!-- Flyway — Database Migration Tool -->
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-core</artifactId>
</dependency>
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-database-postgresql</artifactId>
</dependency>

<!-- Lombok — Reduces boilerplate (getters, setters, builders) -->
<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <optional>true</optional>
</dependency>
```

> [!IMPORTANT]
> Flyway is the **migration engine** that will manage both the public schema tables and auto-apply tenant schema migrations when a new tenant is provisioned.

---

## Phase 3 — Public Schema (Shared / System Tables)

Create Flyway migrations for the **global** tables that exist once in the `public` schema.

### Directory Structure

```
core-api/src/main/resources/
└── db/
    ├── migration/
    │   └── public/                    ← Migrations for the public schema
    │       ├── V1__create_tenants.sql
    │       └── V2__create_plans.sql
    └── tenant/                        ← Template migrations for each new tenant
        ├── V1__create_users.sql
        ├── V2__create_projects.sql
        ├── V3__create_tasks.sql
        └── V4__create_resources.sql
```

### `V1__create_tenants.sql`

```sql
-- db/migration/public/V1__create_tenants.sql

CREATE TABLE public.tenants (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug          VARCHAR(63) NOT NULL UNIQUE,   -- e.g. "acme", "research-lab"
    name          VARCHAR(255) NOT NULL,          -- Display name: "ACME Corp"
    schema_name   VARCHAR(63) NOT NULL UNIQUE,   -- PostgreSQL schema name: "org_acme"
    plan_id       UUID,
    status        VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE | SUSPENDED | DELETED
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenants_slug ON public.tenants(slug);
CREATE INDEX idx_tenants_status ON public.tenants(status);
```

### `V2__create_plans.sql`

```sql
-- db/migration/public/V2__create_plans.sql

CREATE TABLE public.plans (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(100) NOT NULL,         -- "Free", "Pro", "Enterprise"
    max_users     INT NOT NULL DEFAULT 5,
    max_projects  INT NOT NULL DEFAULT 3,
    max_storage_gb NUMERIC(10,2) NOT NULL DEFAULT 1.0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default plans
INSERT INTO public.plans (name, max_users, max_projects, max_storage_gb)
VALUES
    ('Free',       5,   3,   1.0),
    ('Pro',        50,  50,  100.0),
    ('Enterprise', -1,  -1,  -1);    -- -1 = unlimited
```

---

## Phase 4 — Tenant Schema Design (Per-Org Tables)

These are the **template migrations** that get applied to every `org_{slug}` schema.

### `V1__create_users.sql` (Tenant Schema)

```sql
-- db/tenant/V1__create_users.sql
-- Applied to: org_{slug} schema

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(320) NOT NULL UNIQUE,
    display_name    VARCHAR(255),
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(50) NOT NULL DEFAULT 'MEMBER',  -- OWNER | ADMIN | MEMBER | GUEST
    status          VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
```

### `V2__create_projects.sql` (Tenant Schema)

```sql
-- db/tenant/V2__create_projects.sql

CREATE TABLE projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    owner_id        UUID NOT NULL REFERENCES users(id),
    visibility      VARCHAR(50) NOT NULL DEFAULT 'PRIVATE',  -- PRIVATE | INTERNAL | PUBLIC
    status          VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE project_members (
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role        VARCHAR(50) NOT NULL DEFAULT 'VIEWER',  -- EDITOR | VIEWER | MANAGER
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (project_id, user_id)
);
```

### `V3__create_tasks.sql` (Tenant Schema)

```sql
-- db/tenant/V3__create_tasks.sql

CREATE TABLE tasks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title           VARCHAR(512) NOT NULL,
    description     TEXT,
    assignee_id     UUID REFERENCES users(id),
    status          VARCHAR(50) NOT NULL DEFAULT 'TODO',  -- TODO | IN_PROGRESS | DONE | BLOCKED
    priority        VARCHAR(50) NOT NULL DEFAULT 'MEDIUM', -- LOW | MEDIUM | HIGH | CRITICAL
    due_date        DATE,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
```

### `V4__create_resources.sql` (Tenant Schema)

```sql
-- db/tenant/V4__create_resources.sql

CREATE TABLE resources (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    type            VARCHAR(100) NOT NULL,  -- GPU | CPU | STORAGE | DATASET | API_KEY
    description     TEXT,
    owner_id        UUID NOT NULL REFERENCES users(id),
    status          VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
    metadata        JSONB DEFAULT '{}',     -- Flexible: GPU model, VRAM, etc.
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE resource_allocations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id     UUID NOT NULL REFERENCES resources(id),
    task_id         UUID NOT NULL REFERENCES tasks(id),
    allocated_by    UUID NOT NULL REFERENCES users(id),
    quantity        NUMERIC(10,4),
    allocated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    released_at     TIMESTAMPTZ,
    UNIQUE (resource_id, task_id)
);
```

---

## Phase 5 — Flyway Multi-Tenant Migrations

Flyway needs two separate configurations:
1. **Public schema migration** — runs on app startup, manages `public` schema.
2. **Tenant schema migration** — runs programmatically when a new tenant is provisioned.

### `application.yml` — Flyway for Public Schema

```yaml
# core-api/src/main/resources/application.yml
spring:
  application:
    name: core-api

  datasource:
    url: jdbc:postgresql://localhost:5432/orchestrator_db
    username: orchestrix_app
    password: app_secret_password
    driver-class-name: org.postgresql.Driver
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5

  flyway:
    enabled: true
    locations: classpath:db/migration/public   # ← Public schema migrations only
    schemas: public
    baseline-on-migrate: true

  jpa:
    hibernate:
      ddl-auto: validate        # ← NEVER use create/update in production
    show-sql: false
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        default_schema: public  # Overridden per-request by TenantSchemaResolver

multitenancy:
  tenant-migrations-path: classpath:db/tenant  # ← Path to tenant SQL templates
```

### `TenantMigrationService.java`

This service runs Flyway **programmatically** for each new tenant schema.

```java
// com.example.core_api.multitenancy.TenantMigrationService.java

@Service
@RequiredArgsConstructor
public class TenantMigrationService {

    @Value("${spring.datasource.url}")
    private String datasourceUrl;

    @Value("${spring.datasource.username}")
    private String datasourceUsername;

    @Value("${spring.datasource.password}")
    private String datasourcePassword;

    /**
     * Creates a new PostgreSQL schema and applies all tenant migrations.
     * Called once during tenant provisioning.
     */
    public void provisionTenantSchema(String schemaName) {
        try (Connection conn = DriverManager.getConnection(
                datasourceUrl, datasourceUsername, datasourcePassword)) {

            // 1. Create the schema
            conn.createStatement()
                .execute("CREATE SCHEMA IF NOT EXISTS " + schemaName);

            // 2. Grant app role access to new schema
            conn.createStatement()
                .execute("GRANT ALL ON SCHEMA " + schemaName + " TO orchestrix_app");

        } catch (SQLException e) {
            throw new RuntimeException("Failed to create schema: " + schemaName, e);
        }

        // 3. Run Flyway migrations against the new schema
        Flyway flyway = Flyway.configure()
            .dataSource(datasourceUrl, datasourceUsername, datasourcePassword)
            .schemas(schemaName)
            .locations("classpath:db/tenant")   // ← Uses tenant template migrations
            .baselineOnMigrate(true)
            .load();

        flyway.migrate();
    }
}
```

---

## Phase 6 — Spring Boot Tenant Routing Configuration

This is the **core** of multi-tenancy: identifying the current tenant from each HTTP request and storing it in a `ThreadLocal` context.

### `TenantContext.java` — ThreadLocal Holder

```java
// com.example.core_api.multitenancy.TenantContext.java

public class TenantContext {

    private static final ThreadLocal<String> CURRENT_TENANT =
        new InheritableThreadLocal<>();

    public static String getCurrentTenant() {
        return CURRENT_TENANT.get();
    }

    public static void setCurrentTenant(String tenantId) {
        CURRENT_TENANT.set(tenantId);
    }

    public static void clear() {
        CURRENT_TENANT.remove();
    }
}
```

### `TenantFilter.java` — HTTP Filter (Extracts Tenant from Request)

```java
// com.example.core_api.multitenancy.TenantFilter.java

@Component
@Order(1)
public class TenantFilter extends OncePerRequestFilter {

    private static final String TENANT_HEADER = "X-Tenant-ID";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String tenantId = request.getHeader(TENANT_HEADER);
            if (tenantId != null && !tenantId.isBlank()) {
                TenantContext.setCurrentTenant("org_" + tenantId.toLowerCase());
            }
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();  // ← CRITICAL: Always clear after request
        }
    }
}
```

> [!WARNING]
> **Always** call `TenantContext.clear()` in a `finally` block. Thread pools reuse threads — forgetting to clear will **leak** one tenant's context into another tenant's request.

---

## Phase 7 — JPA / Hibernate Multi-Tenant Setup

Hibernate's `MultiTenantConnectionProvider` intercepts every database call and sets the correct schema via `SET search_path`.

### `SchemaMultiTenantConnectionProvider.java`

```java
// com.example.core_api.multitenancy.SchemaMultiTenantConnectionProvider.java

@Component
public class SchemaMultiTenantConnectionProvider
        implements MultiTenantConnectionProvider<String> {

    @Autowired
    private DataSource dataSource;

    @Override
    public Connection getAnyConnection() throws SQLException {
        return dataSource.getConnection();
    }

    @Override
    public void releaseAnyConnection(Connection connection) throws SQLException {
        connection.close();
    }

    @Override
    public Connection getConnection(String tenantIdentifier) throws SQLException {
        Connection connection = dataSource.getConnection();
        // Set the PostgreSQL search_path to the tenant's schema
        connection.createStatement()
            .execute("SET search_path TO " + tenantIdentifier + ", public");
        return connection;
    }

    @Override
    public void releaseConnection(String tenantIdentifier, Connection connection)
            throws SQLException {
        // Reset to public schema before returning to pool
        connection.createStatement().execute("SET search_path TO public");
        connection.close();
    }

    @Override
    public boolean supportsAggressiveRelease() {
        return false;
    }

    @Override
    public boolean isUnwrappableAs(Class<?> unwrapType) {
        return false;
    }

    @Override
    public <T> T unwrap(Class<T> unwrapType) {
        throw new UnsupportedOperationException();
    }
}
```

### `TenantIdentifierResolver.java`

```java
// com.example.core_api.multitenancy.TenantIdentifierResolver.java

@Component
public class TenantIdentifierResolver
        implements CurrentTenantIdentifierResolver<String> {

    private static final String DEFAULT_SCHEMA = "public";

    @Override
    public String resolveCurrentTenantIdentifier() {
        String tenant = TenantContext.getCurrentTenant();
        return (tenant != null && !tenant.isBlank()) ? tenant : DEFAULT_SCHEMA;
    }

    @Override
    public boolean validateExistingCurrentSessions() {
        return true;
    }
}
```

### `HibernateConfig.java` — Wire it all together

```java
// com.example.core_api.config.HibernateConfig.java

@Configuration
@EnableJpaRepositories(basePackages = "com.example.core_api")
public class HibernateConfig {

    @Autowired
    private SchemaMultiTenantConnectionProvider connectionProvider;

    @Autowired
    private TenantIdentifierResolver tenantResolver;

    @Bean
    public LocalContainerEntityManagerFactoryBean entityManagerFactory(
            DataSource dataSource) {

        HibernateJpaVendorAdapter adapter = new HibernateJpaVendorAdapter();
        LocalContainerEntityManagerFactoryBean factory =
            new LocalContainerEntityManagerFactoryBean();

        factory.setDataSource(dataSource);
        factory.setJpaVendorAdapter(adapter);
        factory.setPackagesToScan("com.example.core_api");

        Properties props = new Properties();
        props.put(AvailableSettings.MULTI_TENANT_CONNECTION_PROVIDER, connectionProvider);
        props.put(AvailableSettings.MULTI_TENANT_IDENTIFIER_RESOLVER, tenantResolver);
        props.put(AvailableSettings.HBM2DDL_AUTO, "validate");
        props.put(AvailableSettings.DIALECT, "org.hibernate.dialect.PostgreSQLDialect");
        factory.setJpaProperties(props);

        return factory;
    }
}
```

---

## Phase 8 — Tenant Provisioning API

When a new organization signs up, this flow creates their isolated schema.

### Workflow Sequence

```
Client POST /api/v1/tenants/register
         │
         ▼
  TenantController
         │
         ▼
  TenantService
    ├─ Validate: slug is unique (check public.tenants)
    ├─ Generate schema_name: "org_" + slug
    ├─ INSERT into public.tenants
    ├─ Call TenantMigrationService.provisionTenantSchema("org_acme")
    │     ├─ CREATE SCHEMA org_acme
    │     ├─ GRANT privileges
    │     └─ Flyway: Apply db/tenant/V1..V4 migrations
    └─ Return TenantDTO (id, slug, status)
```

### `TenantService.java`

```java
// com.example.core_api.tenant.TenantService.java

@Service
@Transactional
@RequiredArgsConstructor
public class TenantService {

    private final TenantRepository tenantRepository;
    private final TenantMigrationService migrationService;

    public TenantDTO registerTenant(RegisterTenantRequest request) {
        String slug = request.getSlug().toLowerCase().replaceAll("[^a-z0-9-]", "-");
        String schemaName = "org_" + slug.replace("-", "_");

        // 1. Check uniqueness
        if (tenantRepository.existsBySlug(slug)) {
            throw new TenantAlreadyExistsException("Slug already taken: " + slug);
        }

        // 2. Persist tenant record in public.tenants
        Tenant tenant = Tenant.builder()
            .slug(slug)
            .name(request.getName())
            .schemaName(schemaName)
            .status(TenantStatus.PROVISIONING)
            .build();
        tenant = tenantRepository.save(tenant);

        // 3. Provision isolated schema (runs Flyway for this tenant)
        migrationService.provisionTenantSchema(schemaName);

        // 4. Mark tenant as ACTIVE
        tenant.setStatus(TenantStatus.ACTIVE);
        tenantRepository.save(tenant);

        return TenantDTO.from(tenant);
    }
}
```

---

## Phase 9 — Security & Row-Level Isolation

### 9.1 Validate Tenant Existence on Every Request

```java
// In TenantFilter.java — enhance the extraction logic

String tenantId = request.getHeader(TENANT_HEADER);
if (tenantId != null) {
    // Verify tenant exists and is ACTIVE before routing
    Tenant tenant = tenantRepository.findBySlugAndStatus(tenantId, TenantStatus.ACTIVE)
        .orElseThrow(() -> new TenantNotFoundException(tenantId));
    TenantContext.setCurrentTenant(tenant.getSchemaName());
}
```

### 9.2 JWT Integration (After Auth)

The recommended production approach is to embed `tenantId` inside the JWT:

```json
// JWT Claims Payload
{
  "sub": "user-uuid",
  "tenant_id": "acme",           ← Embedded at login time
  "role": "ADMIN",
  "iat": 1753192039,
  "exp": 1753278439
}
```

Extract from JWT in the security filter instead of a header — this prevents request forgery.

### 9.3 PostgreSQL Row-Level Security (Optional but Recommended)

For an extra layer of defense-in-depth within a schema:

```sql
-- Inside org_acme schema
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY task_isolation ON tasks
    USING (current_setting('app.current_user_id')::UUID = assignee_id
        OR current_setting('app.current_user_id')::UUID = created_by);
```

---

## Phase 10 — Verification & Testing

### 10.1 Manual Verification Steps

```bash
# 1. Start infrastructure
cd backend && docker-compose up -d

# 2. Start Core API (Flyway runs on public schema automatically)
cd core-api && ./mvnw spring-boot:run

# 3. Register a new tenant
curl -X POST http://localhost:8080/api/v1/tenants/register \
  -H "Content-Type: application/json" \
  -d '{"slug":"acme","name":"ACME Research Lab"}'

# 4. Verify schema was created in PostgreSQL
psql -h localhost -U orchestrator_user orchestrator_db \
  -c "\dn"  # List all schemas — should show org_acme

# 5. Verify tables were created
psql -h localhost -U orchestrator_user orchestrator_db \
  -c "\dt org_acme.*"  # Should show users, projects, tasks, resources

# 6. Make a tenant-scoped request
curl http://localhost:8080/api/v1/projects \
  -H "X-Tenant-ID: acme" \
  -H "Authorization: Bearer <token>"
```

### 10.2 Integration Test Skeleton

```java
@SpringBootTest
@Testcontainers
class MultiTenancyIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("orchestrator_db_test")
            .withUsername("test_user")
            .withPassword("test_password");

    @Test
    void givenTwoTenants_whenQueryingProjects_thenDataIsIsolated() {
        // Provision tenant A
        tenantService.registerTenant(new RegisterTenantRequest("alpha", "Alpha Corp"));

        // Provision tenant B
        tenantService.registerTenant(new RegisterTenantRequest("beta", "Beta Corp"));

        // Create a project for tenant Alpha
        TenantContext.setCurrentTenant("org_alpha");
        projectRepository.save(new Project("Alpha Secret Project"));

        // Switch to tenant Beta — should see ZERO projects
        TenantContext.setCurrentTenant("org_beta");
        List<Project> betaProjects = projectRepository.findAll();

        assertThat(betaProjects).isEmpty();  // ← Isolation confirmed
    }
}
```

---

## Summary Checklist

```
Database Workflow — Implementation Checklist
─────────────────────────────────────────────
Phase 1: Infrastructure
  [ ] Update docker-compose.yml with init-db volume mount
  [ ] Create backend/init-db/01_init.sql (app role, schema grants)
  [ ] Run: docker-compose down -v && docker-compose up -d

Phase 2: Dependencies
  [ ] Add flyway-core to pom.xml
  [ ] Add flyway-database-postgresql to pom.xml
  [ ] Add lombok to pom.xml

Phase 3: Public Schema Migrations
  [ ] Create db/migration/public/V1__create_tenants.sql
  [ ] Create db/migration/public/V2__create_plans.sql

Phase 4: Tenant Schema Migrations (Templates)
  [ ] Create db/tenant/V1__create_users.sql
  [ ] Create db/tenant/V2__create_projects.sql
  [ ] Create db/tenant/V3__create_tasks.sql
  [ ] Create db/tenant/V4__create_resources.sql

Phase 5: Flyway Config
  [ ] Convert application.properties → application.yml
  [ ] Configure flyway.locations = classpath:db/migration/public
  [ ] Create TenantMigrationService.java

Phase 6: Tenant Routing
  [ ] Create TenantContext.java (ThreadLocal)
  [ ] Create TenantFilter.java (HTTP Filter)

Phase 7: Hibernate Multi-Tenancy
  [ ] Create SchemaMultiTenantConnectionProvider.java
  [ ] Create TenantIdentifierResolver.java
  [ ] Create HibernateConfig.java

Phase 8: Provisioning API
  [ ] Create Tenant.java (JPA Entity)
  [ ] Create TenantRepository.java
  [ ] Create TenantService.java
  [ ] Create TenantController.java

Phase 9: Security
  [ ] Add tenant validation in TenantFilter
  [ ] Embed tenant_id in JWT claims
  [ ] (Optional) Add PostgreSQL RLS policies

Phase 10: Verification
  [ ] docker-compose up, app starts, public schema migrated
  [ ] POST /tenants/register → schema created
  [ ] Cross-tenant isolation test passes
```

---

> [!TIP]
> **Implementation Order matters!** Always do Phases 1→2→3→5→6→7→8. Never skip the `TenantContext.clear()` cleanup — it's the most common source of multi-tenancy bugs in production.
