package com.example.core_api.aisummary;

import com.example.core_api.auth.User;
import com.example.core_api.multitenancy.TenantContext;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/ai-summaries")
public class AiSummaryController {

    private final AiSummaryService service;

    public AiSummaryController(AiSummaryService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AiSummaryResponse createSummary(
            @AuthenticationPrincipal User currentUser,
            @RequestHeader(value = "X-Tenant-ID", required = false, defaultValue = "myorg") String tenantId,
            @Valid @RequestBody CreateAiSummaryRequest request) {
        requireAuthenticated(currentUser);
        String schemaName = resolveSchema(tenantId);
        TenantContext.setCurrentTenant(schemaName);
        try {
            return service.createSummary(request, currentUser.getId());
        } finally {
            TenantContext.clear();
        }
    }

    @GetMapping
    public List<AiSummaryResponse> getSummaries(
            @AuthenticationPrincipal User currentUser,
            @RequestHeader(value = "X-Tenant-ID", required = false, defaultValue = "myorg") String tenantId,
            @RequestParam(required = false) UUID projectId) {
        requireAuthenticated(currentUser);
        String schemaName = resolveSchema(tenantId);
        TenantContext.setCurrentTenant(schemaName);
        try {
            // Always filter by the authenticated user's ID — no cross-user leakage
            if (projectId != null) {
                return service.getSummariesByUserAndProject(currentUser.getId(), projectId);
            }
            return service.getSummariesByUser(currentUser.getId());
        } finally {
            TenantContext.clear();
        }
    }

    @GetMapping("/{id}")
    public AiSummaryResponse getSummaryById(
            @AuthenticationPrincipal User currentUser,
            @RequestHeader(value = "X-Tenant-ID", required = false, defaultValue = "myorg") String tenantId,
            @PathVariable UUID id) {
        requireAuthenticated(currentUser);
        String schemaName = resolveSchema(tenantId);
        TenantContext.setCurrentTenant(schemaName);
        try {
            return service.getSummaryById(id);
        } finally {
            TenantContext.clear();
        }
    }

    @PatchMapping("/{id}/status")
    public AiSummaryResponse updateStatus(
            @AuthenticationPrincipal User currentUser,
            @RequestHeader(value = "X-Tenant-ID", required = false, defaultValue = "myorg") String tenantId,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateAiSummaryStatusRequest request) {
        requireAuthenticated(currentUser);
        String schemaName = resolveSchema(tenantId);
        TenantContext.setCurrentTenant(schemaName);
        try {
            return service.updateStatus(id, request.getStatus());
        } finally {
            TenantContext.clear();
        }
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSummary(
            @AuthenticationPrincipal User currentUser,
            @RequestHeader(value = "X-Tenant-ID", required = false, defaultValue = "myorg") String tenantId,
            @PathVariable UUID id) {
        requireAuthenticated(currentUser);
        String schemaName = resolveSchema(tenantId);
        TenantContext.setCurrentTenant(schemaName);
        try {
            service.deleteSummary(id);
        } finally {
            TenantContext.clear();
        }
    }

    private String resolveSchema(String tenantId) {
        return "org_" + (tenantId != null ? tenantId : "myorg").toLowerCase().replace("-", "_");
    }

    private void requireAuthenticated(User currentUser) {
        if (currentUser == null) {
            throw new AccessDeniedException("Full authentication is required to access this resource");
        }
    }
}
