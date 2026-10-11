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
    private final PlatformAccess platformAccess;
    private final OrganizationAdminService organizationAdmins;

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
        boolean admin = platformAccess.isPlatformAdmin(currentUser); // organization admins cannot create organizations
        String supplied = httpRequest.getHeader("X-Bootstrap-Key");
        boolean bootstrap = bootstrapKey != null && !bootstrapKey.isBlank() && supplied != null
                && MessageDigest.isEqual(bootstrapKey.getBytes(StandardCharsets.UTF_8),
                        supplied.getBytes(StandardCharsets.UTF_8));
        if (!admin && !bootstrap) throw new AccessDeniedException("Only the platform administrator can create organizations.");
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
    // Platform admin only: every organization with its user count.
    @GetMapping
    public ResponseEntity<List<TenantResponse>> getAllTenants(@AuthenticationPrincipal User currentUser) {
        platformAccess.requirePlatformAdmin(currentUser);
        return ResponseEntity.ok(tenantService.getAllTenantsWithUserCounts());
    }

    // Which organization is the caller administering? Lets the UI choose the platform or organization view.
    @GetMapping("/context")
    public ResponseEntity<java.util.Map<String, Object>> context(@AuthenticationPrincipal User currentUser) {
        String schema = TenantContext.getCurrentTenant();
        String slug = schema != null && schema.startsWith("org_") ? schema.substring(4) : schema;
        TenantResponse own = tenantService.getAllTenants().stream()
                .filter(t -> schema != null && schema.equals(t.getSchemaName())).findFirst().orElse(null);
        java.util.Map<String, Object> body = new java.util.LinkedHashMap<>();
        body.put("platformAdmin", platformAccess.isPlatformAdmin(currentUser));
        body.put("organizationAdmin", PlatformAccess.isAdmin(currentUser));
        body.put("slug", own != null ? own.getSlug() : slug);
        body.put("name", own != null ? own.getName() : slug);
        body.put("schemaName", schema);
        return ResponseEntity.ok(body);
    }

    @GetMapping("/{slug}")
    public ResponseEntity<TenantResponse> getTenant(@PathVariable String slug,
                                                    @AuthenticationPrincipal User currentUser) {
        String requestedSchema = "org_" + slug.toLowerCase().replace('-', '_');
        // Your own organization, or any organization for the platform admin
        if (!platformAccess.isPlatformAdmin(currentUser) && !requestedSchema.equals(TenantContext.getCurrentTenant())) {
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
            @RequestParam TenantStatus status,   // e.g. ?status=SUSPENDED
            @AuthenticationPrincipal User currentUser) {
        platformAccess.requirePlatformAdmin(currentUser);
        return ResponseEntity.ok(tenantService.updateStatus(id, status));
    }

    // ── Organization administrators (platform admin only) ───────────────────
    public record AssignAdminRequest(String email, String displayName, String password) {}

    @GetMapping("/{id}/admins")
    public List<OrganizationAdminService.OrgAdmin> listAdmins(@PathVariable UUID id, @AuthenticationPrincipal User currentUser) {
        platformAccess.requirePlatformAdmin(currentUser);
        return organizationAdmins.listAdmins(id);
    }

    @PostMapping("/{id}/admins")
    public ResponseEntity<OrganizationAdminService.OrgAdmin> assignAdmin(@PathVariable UUID id,
                                                                         @RequestBody AssignAdminRequest request,
                                                                         @AuthenticationPrincipal User currentUser) {
        platformAccess.requirePlatformAdmin(currentUser);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(organizationAdmins.assignAdmin(id, request.email(), request.displayName(), request.password()));
    }

    @DeleteMapping("/{id}/admins/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeAdmin(@PathVariable UUID id, @PathVariable UUID userId, @AuthenticationPrincipal User currentUser) {
        platformAccess.requirePlatformAdmin(currentUser);
        organizationAdmins.removeAdmin(id, userId);
    }

    private boolean isAdmin(User user) {
        return user != null && user.getAuthorities().stream().anyMatch(authority ->
                authority.getAuthority().equals("ROLE_ADMIN") || authority.getAuthority().equals("ROLE_OWNER"));
    }
}
