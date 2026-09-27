package com.example.core_api.tenant;

import java.time.OffsetDateTime;
import java.util.UUID;

// DTO returned to the caller after creating or fetching a tenant.
// We never return the raw Tenant entity directly because:
//   1. It can expose internal fields we don't want public (e.g. schema_name internals)
//   2. It decouples the API contract from the DB model — we can change the entity without breaking the API
public class TenantResponse {

    private UUID id;
    private String slug;
    private String name;
    private String schemaName;      // The PostgreSQL schema that holds this tenant's tables
    private TenantStatus status;    // ACTIVE | SUSPENDED | DELETED
    private OffsetDateTime createdAt;

    // Private constructor — callers must use the static factory method below
    private TenantResponse() {}

    // Static factory: converts a Tenant entity into a TenantResponse DTO.
    // Keeps the mapping logic here, close to the DTO itself.
    public static TenantResponse from(Tenant tenant) {
        TenantResponse response = new TenantResponse();
        response.id        = tenant.getId();
        response.slug      = tenant.getSlug();
        response.name      = tenant.getName();
        response.schemaName = tenant.getSchemaName();
        response.status    = tenant.getStatus();
        response.createdAt = tenant.getCreatedAt();
        return response;
    }

    // --- Getters (read-only response, no setters needed) ---

    public UUID getId() { return id; }
    public String getSlug() { return slug; }
    public String getName() { return name; }
    public String getSchemaName() { return schemaName; }
    public TenantStatus getStatus() { return status; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
}
