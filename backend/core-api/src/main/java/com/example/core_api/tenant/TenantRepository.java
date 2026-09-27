package com.example.core_api.tenant;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

// @Repository marks this as a Spring Data bean.
// JpaRepository<Tenant, UUID> gives us free CRUD methods:
//   save(), findById(), findAll(), delete(), count(), existsById(), etc.
// We only need to declare custom query methods here — Spring generates the SQL automatically.
@Repository
public interface TenantRepository extends JpaRepository<Tenant, UUID> {

    // Spring reads the method name and auto-generates:
    // SELECT * FROM public.tenants WHERE slug = ?
    Optional<Tenant> findBySlug(String slug);

    // SELECT COUNT(*) FROM public.tenants WHERE slug = ?  → returns true/false
    // Used in TenantService to check if a slug is already taken before creating a new tenant
    boolean existsBySlug(String slug);

    // SELECT * FROM public.tenants WHERE slug = ? AND status = ?
    // Used by TenantFilter to verify that the tenant exists AND is ACTIVE before routing requests
    Optional<Tenant> findBySlugAndStatus(String slug, TenantStatus status);
}
