package com.example.core_api.tenant;

import jakarta.validation.constraints.NotBlank;

// DTO = Data Transfer Object
// This is the shape of JSON that the caller sends in the request body when creating a tenant.
// It is NOT the Tenant entity — it only holds the fields we allow the caller to supply.
// Hibernate never sees this object; it stays in the controller/service layer only.
public class TenantProvisionRequest {

    // The short URL-safe identifier the caller wants, e.g. "acme" or "research-lab"
    // We derive the PostgreSQL schema name from this: "acme" → "org_acme"
    @NotBlank(message = "slug is required")
    private String slug;

    // Human-readable display name shown in the UI, e.g. "ACME Corp"
    @NotBlank(message = "name is required")
    private String name;

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
