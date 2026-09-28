package com.example.core_api.ai;

import com.example.core_api.auth.User;
import com.example.core_api.project.ProjectAccess;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class SummaryController {
    private final ProjectAccess projectAccess;
    private final SummaryProxy summaryProxy;

    @PostMapping("/summarize")
    public ResponseEntity<String> summarize(
            @AuthenticationPrincipal User currentUser,
            @RequestHeader("X-Tenant-ID") String tenantId,
            @Valid @RequestBody SummarizeRequest request) {
        if (!projectAccess.canAccess(currentUser, request.projectId())) {
            throw new AccessDeniedException("Project access required");
        }
        return summaryProxy.summarize(request, tenantId);
    }
}
