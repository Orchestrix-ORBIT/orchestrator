package com.example.core_api.resource;

import com.example.core_api.auth.User;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/resources")
public class ResourceController {

    private final ResourceService resourceService;

    public ResourceController(ResourceService resourceService) {
        this.resourceService = resourceService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResourceResponse createResource(
            @RequestHeader(value = "X-Tenant-ID", required = false, defaultValue = "myorg") String tenantId,
            @Valid @RequestBody CreateResourceRequest request) {
        String schemaName = "org_" + (tenantId != null ? tenantId : "myorg").toLowerCase().replace("-", "_");
        com.example.core_api.multitenancy.TenantContext.setCurrentTenant(schemaName);
        try {
            UUID ownerId = getAuthenticatedUserId();
            return resourceService.createResource(request, ownerId);
        } finally {
            com.example.core_api.multitenancy.TenantContext.clear();
        }
    }

    @GetMapping
    public List<ResourceResponse> getAllResources(
            @RequestHeader(value = "X-Tenant-ID", required = false, defaultValue = "myorg") String tenantId,
            @RequestParam(required = false) ResourceType type,
            @RequestParam(required = false) ResourceStatus status) {
        String schemaName = "org_" + (tenantId != null ? tenantId : "myorg").toLowerCase().replace("-", "_");
        com.example.core_api.multitenancy.TenantContext.setCurrentTenant(schemaName);
        try {
            return resourceService.getAllResources(type, status);
        } finally {
            com.example.core_api.multitenancy.TenantContext.clear();
        }
    }

    @GetMapping("/{id}")
    public ResourceResponse getResourceById(
            @RequestHeader(value = "X-Tenant-ID", required = false, defaultValue = "myorg") String tenantId,
            @PathVariable UUID id) {
        String schemaName = "org_" + (tenantId != null ? tenantId : "myorg").toLowerCase().replace("-", "_");
        com.example.core_api.multitenancy.TenantContext.setCurrentTenant(schemaName);
        try {
            return resourceService.getResourceById(id);
        } finally {
            com.example.core_api.multitenancy.TenantContext.clear();
        }
    }

    @PatchMapping("/{id}/status")
    public ResourceResponse updateResourceStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateResourceStatusRequest request) {
        return resourceService.updateResourceStatus(id, request.getStatus());
    }

    @GetMapping("/maintenance")
    public List<ResourceMaintenance> getAllMaintenance() {
        return resourceService.getAllMaintenance();
    }

    @PostMapping("/maintenance")
    @ResponseStatus(HttpStatus.CREATED)
    public ResourceMaintenance createMaintenance(@RequestBody ResourceMaintenance maintenance) {
        return resourceService.createMaintenance(maintenance);
    }

    private UUID getAuthenticatedUserId() {
        User user = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return user.getId();
    }
}
