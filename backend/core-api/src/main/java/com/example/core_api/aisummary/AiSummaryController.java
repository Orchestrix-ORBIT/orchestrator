package com.example.core_api.aisummary;

import com.example.core_api.auth.User;
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

    // TenantFilter (Order=1) sets TenantContext for the full request lifecycle.
    // No manual TenantContext management needed in any controller method.

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AiSummaryResponse createSummary(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody CreateAiSummaryRequest request) {
        requireAuthenticated(currentUser);
        return service.createSummary(request, currentUser.getId());
    }

    @GetMapping
    public List<AiSummaryResponse> getSummaries(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(required = false) UUID projectId) {
        requireAuthenticated(currentUser);
        if (projectId != null) {
            return service.getSummariesByUserAndProject(currentUser.getId(), projectId);
        }
        return service.getSummariesByUser(currentUser.getId());
    }

    @GetMapping("/{id}")
    public AiSummaryResponse getSummaryById(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id) {
        requireAuthenticated(currentUser);
        return service.getSummaryById(id);
    }

    @PatchMapping("/{id}/status")
    public AiSummaryResponse updateStatus(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateAiSummaryStatusRequest request) {
        requireAuthenticated(currentUser);
        return service.updateStatus(id, request.getStatus());
    }

    @PatchMapping("/{id}/action-items")
    public AiSummaryResponse updateActionItems(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id,
            @RequestBody UpdateAiSummaryActionItemsRequest request) {
        requireAuthenticated(currentUser);
        return service.updateActionItems(id, request.getActionItems());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSummary(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id) {
        requireAuthenticated(currentUser);
        service.deleteSummary(id);
    }

    private void requireAuthenticated(User currentUser) {
        if (currentUser == null) {
            throw new AccessDeniedException("Full authentication is required to access this resource");
        }
    }
}
