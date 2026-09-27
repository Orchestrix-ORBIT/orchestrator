package com.example.core_api.tenant;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.example.core_api.auth.User;
import com.example.core_api.multitenancy.TenantContext;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

import java.util.List;
import java.util.UUID;

// @RestController = @Controller + @ResponseBody
// Every method automatically serializes the return value to JSON
// @RequestMapping sets the base URL path for all endpoints in this controller
@RestController
@RequestMapping("/api/admin/tenants")
@RequiredArgsConstructor // Lombok: injects TenantService via constructor
public class TenantController {

    private final TenantService tenantService;

    @Value("${tenant.bootstrap-key:}")
    private String bootstrapKey;

    // -------------------------------------------------------------------------
    // POST /api/admin/tenants
    // Purpose: Provision a new tenant (create its DB row + PostgreSQL schema)
    //
    // Request body (JSON):
    //   { "slug": "acme", "name": "ACME Corp" }
    //
    // Response (201 Created):
    //   { "id": "...", "slug": "acme", "name": "ACME Corp", "schemaName": "org_acme", ... }
    // -------------------------------------------------------------------------
    @PostMapping
    public ResponseEntity<TenantResponse> createTenant(@Valid @RequestBody TenantProvisionRequest request,
                                                       @AuthenticationPrincipal User currentUser,
                                                       HttpServletRequest httpRequest) {
        boolean admin = isAdmin(currentUser);
        String supplied = httpRequest.getHeader("X-Bootstrap-Key");
        boolean bootstrap = bootstrapKey != null && !bootstrapKey.isBlank() && supplied != null
                && MessageDigest.isEqual(bootstrapKey.getBytes(StandardCharsets.UTF_8),
                        supplied.getBytes(StandardCharsets.UTF_8));
        if (!admin && !bootstrap) throw new AccessDeniedException("Tenant provisioning requires an administrator.");
        TenantResponse response = tenantService.provisionTenant(request);
        // Return 201 Created (not 200 OK) because we created a new resource
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // -------------------------------------------------------------------------
    // GET /api/admin/tenants
    // Purpose: List all tenants (for admin dashboards)
    //
    // Response (200 OK):
    //   [ { "id": "...", "slug": "acme", ... }, { "id": "...", "slug": "research-lab", ... } ]
    // -------------------------------------------------------------------------
    @GetMapping
    public ResponseEntity<List<TenantResponse>> getAllTenants() {
        return ResponseEntity.ok(tenantService.getAllTenants());
    }

    // -------------------------------------------------------------------------
    // GET /api/admin/tenants/{slug}
    // Purpose: Fetch a single tenant by slug
    // {slug} is a path variable, e.g. GET /api/admin/tenants/acme
    //
    // Response (200 OK):
    //   { "id": "...", "slug": "acme", "name": "ACME Corp", ... }
    // -------------------------------------------------------------------------
    @GetMapping("/{slug}")
    public ResponseEntity<TenantResponse> getTenant(@PathVariable String slug,
                                                    @AuthenticationPrincipal User currentUser) {
        String requestedSchema = "org_" + slug.toLowerCase().replace('-', '_');
        if (!isAdmin(currentUser) && !requestedSchema.equals(TenantContext.getCurrentTenant())) {
            throw new AccessDeniedException("Another tenant's details are not available.");
        }
        return ResponseEntity.ok(tenantService.getTenantBySlug(slug));
    }

    // -------------------------------------------------------------------------
    // PATCH /api/admin/tenants/{id}/status?status=SUSPENDED
    // Purpose: Suspend or reactivate a tenant without deleting its data
    // Uses PATCH (partial update) not PUT (full replacement) since only status changes
    //
    // Example: PATCH /api/admin/tenants/9b1deb4d-3b7d.../status?status=SUSPENDED
    // -------------------------------------------------------------------------
    @PatchMapping("/{id}/status")
    public ResponseEntity<TenantResponse> updateStatus(
            @PathVariable UUID id,
            @RequestParam TenantStatus status) {  // e.g. ?status=SUSPENDED
        return ResponseEntity.ok(tenantService.updateStatus(id, status));
    }

    private boolean isAdmin(User user) {
        return user != null && user.getAuthorities().stream().anyMatch(authority ->
                authority.getAuthority().equals("ROLE_ADMIN") || authority.getAuthority().equals("ROLE_OWNER"));
    }
}
