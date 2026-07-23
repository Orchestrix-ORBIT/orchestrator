# ✈️ Flyway Database Migration Naming Conventions & Discovery Guide

This document explains the mandatory naming conventions for Flyway migration files and how Flyway discovers, orders, and executes them.

---

## 1. Flyway Naming Conventions

Flyway requires a strict file naming format to distinguish versions, separators, and descriptions.

```
<Prefix><Version><Separator><Description>.<Extension>
```

### Breakdown of Components

| Component | Default | Rules & Examples |
|---|---|---|
| **Prefix** | `V` (Versioned)<br>`U` (Undo)<br>`R` (Repeatable) | • `V` for standard versioned schema changes.<br>• `U` for undo/rollback scripts.<br>• `R` for repeatable scripts (views, stored procedures). |
| **Version** | Numeric | • Dot `.` or underscore `_` separates version levels.<br>• Examples: `1`, `1.1`, `2.0`, `2026.07.23.1`<br>• Flyway orders scripts strictly by this version number. |
| **Separator** | `__` (**TWO Underscores**) | ⚠️ **CRITICAL**: Must be **two underscores** (`__`). A single underscore (`_`) will cause Flyway to fail to recognize or parse the file. |
| **Description** | Free text | • Underscores or spaces separating words.<br>• Example: `create_users_table` |
| **Extension** | `.sql` | Standard SQL script extension. |

---

## 2. Examples

### ✅ Valid Filenames
* `V1__create_tenants.sql` (Version 1, creates tenants)
* `V2__create_plans.sql` (Version 2, creates plans)
* `V1.1__add_phone_to_users.sql` (Version 1.1)
* `R__create_active_users_view.sql` (Repeatable migration)

### ❌ Common Mistakes & Invalid Filenames
* `V1_create_tenants.sql` ❌ *(Only one underscore! Flyway will ignore or fail to parse this)*
* `v1__create_tenants.sql` ❌ *(Lowercase `v` by default is not recognized unless configured)*
* `CREATE_USERS.sql` ❌ *(Missing prefix and double underscore separator)*

---

## 3. How Flyway Calls & Executes Migrations

### Step 1: Scanning / Discovery
When Flyway initializes, it scans the configured location(s) on the classpath:
- **Public Schema**: `classpath:db/migration/public`
- **Tenant Schema**: `classpath:db/tenant`

### Step 2: Parsing & Version Sorting
Flyway parses every `.sql` file in the location using regex:
1. Extracts the version number (`1`, `2`, `3`).
2. Sorts versioned scripts in **ascending order** (`V1` ➔ `V2` ➔ `V3`).

### Step 3: Schema History Table (`flyway_schema_history`)
Before running any script, Flyway inspects the target schema for a metadata table called `flyway_schema_history`:
- If missing, Flyway creates `flyway_schema_history`.
- It checks which migration versions have already been applied and compares script checksums.

### Step 4: Execution
1. Flyway executes any pending (unapplied) migrations sequentially in ascending order.
2. Each migration script runs within its own database transaction (where supported).
3. Upon success, Flyway logs a new row in `flyway_schema_history` containing:
   - Version number (`installed_rank`, `version`)
   - Description
   - Script name
   - Checksum
   - Execution duration & timestamp

---

## 4. Usage in Orchestrix

In this project, Flyway is executed in two ways:

1. **Automatic (Public Schema)**:
   - Triggered on Spring Boot startup.
   - Configured in `application.yml` pointing to `classpath:db/migration/public`.
   - Manages global/shared tables in `public` schema.

2. **Programmatic (Tenant Schemas)**:
   - Triggered via `TenantMigrationService.java` whenever a new team signs up.
   - Points dynamically to `classpath:db/tenant` and targets `org_{tenant_slug}` schema.
