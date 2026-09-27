package com.example.core_api.tenant;

// Enum representing the lifecycle state of a tenant (org / team).
// Stored as a string in the public.tenants table (status column).
public enum TenantStatus {

    PROVISIONING, // Schema is being created — tenant is not ready yet
    ACTIVE,       
    SUSPENDED,    // Tenant account is temporarily disabled (e.g., payment issue)
    DELETED       // Tenant is soft-deleted — data retained but inaccessible
}
