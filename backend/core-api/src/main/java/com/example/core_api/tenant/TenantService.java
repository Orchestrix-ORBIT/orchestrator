package com.example.core_api.tenant;

import com.example.core_api.multitenancy.TenantMigrationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

// @Service marks this as a Spring-managed business logic bean.
// All database calls and schema provisioning happen here — never directly in the controller.
@Service
@RequiredArgsConstructor // Lombok: generates constructor for all final fields (used for dependency injection)
public class TenantService {

    // Spring injects these automatically because they are final + @RequiredArgsConstructor
    private final TenantRepository tenantRepository;
    private final TenantMigrationService tenantMigrationService;

    // -------------------------------------------------------------------------
    // CREATE — provisions a brand-new tenant with its own PostgreSQL schema
    // -------------------------------------------------------------------------

    // @Transactional means: if anything fails inside, the DB insert is rolled back automatically.
    // Note: the schema creation (DDL) cannot be rolled back by JPA — only the tenants row insert can.
    @Transactional
    public TenantResponse provisionTenant(TenantProvisionRequest request) {

        // 1. Validate that the slug is not already taken
        //    e.g. reject if someone tries to register "acme" twice
        if (tenantRepository.existsBySlug(request.getSlug())) {
            throw new IllegalArgumentException(
                "A tenant with slug '" + request.getSlug() + "' already exists."
            );
        }

        // 2. Derive the PostgreSQL schema name from the slug
        //    e.g. slug "research-lab" → schema "org_research_lab"
        //    Rules: lowercase, replace hyphens with underscores, prefix "org_"
        String schemaName = "org_" + request.getSlug()
                                            .toLowerCase()
                                            .replace("-", "_");

        // 3. Build the Tenant entity (no id yet — PostgreSQL will generate it on save)
        Tenant tenant = Tenant.builder()
                .slug(request.getSlug())
                .name(request.getName())
                .schemaName(schemaName)
                .status(TenantStatus.ACTIVE) // New tenants start as ACTIVE
                .build();

        // 4. Save the tenant row to public.tenants
        //    After this line, the tenant has an auto-generated UUID id
        Tenant saved = tenantRepository.save(tenant);

        // 5. Create the PostgreSQL schema and run all tenant Flyway migrations
        //    e.g. creates org_acme.users, org_acme.projects, org_acme.tasks, org_acme.resources
        tenantMigrationService.provisionTenantSchema(schemaName);

        // 6. Return a response DTO (not the raw entity) back to the controller
        return TenantResponse.from(saved);
    }

    // -------------------------------------------------------------------------
    // READ — fetch a single tenant by slug (used in admin lookups)
    // -------------------------------------------------------------------------
    public TenantResponse getTenantBySlug(String slug) {
        Tenant tenant = tenantRepository.findBySlug(slug)
                .orElseThrow(() -> new RuntimeException("Tenant not found: " + slug));
        return TenantResponse.from(tenant);
    }

    // READ — fetch all tenants (used in admin dashboards)
    public List<TenantResponse> getAllTenants() {
        return tenantRepository.findAll()
                .stream()
                .map(TenantResponse::from) // Convert each Tenant entity to a TenantResponse DTO
                .toList();
    }

    // -------------------------------------------------------------------------
    // UPDATE STATUS — suspend or re-activate a tenant
    // -------------------------------------------------------------------------

    // @Transactional ensures the status update is committed atomically
    @Transactional
    public TenantResponse updateStatus(UUID tenantId, TenantStatus newStatus) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new RuntimeException("Tenant not found: " + tenantId));

        tenant.setStatus(newStatus);
        // tenantRepository.save() is not strictly needed here because @Transactional
        // means Hibernate will detect the change ("dirty checking") and flush it.
        // We call save() explicitly for clarity.
        Tenant updated = tenantRepository.save(tenant);
        return TenantResponse.from(updated);
    }
}
