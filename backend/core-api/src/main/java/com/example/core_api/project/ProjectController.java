package com.example.core_api.project;

import com.example.core_api.auth.User;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectResponse createProject(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody CreateProjectRequest request) {
        return projectService.createProject(request, currentUser.getId());
    }

    @GetMapping
    public List<ProjectResponse> getAllProjects(
            @RequestHeader(value = "X-Tenant-ID", required = false, defaultValue = "myorg") String tenantId
    ) {
        String schemaName = "org_" + (tenantId != null ? tenantId : "myorg").toLowerCase().replace("-", "_");
        com.example.core_api.multitenancy.TenantContext.setCurrentTenant(schemaName);
        try {
            return projectService.getAllProjects();
        } finally {
            com.example.core_api.multitenancy.TenantContext.clear();
        }
    }

    @GetMapping("/{id}")
    public ProjectResponse getProjectById(@PathVariable UUID id) {
        return projectService.getProjectById(id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteProject(@PathVariable UUID id) {
        projectService.deleteProject(id);
    }

    @GetMapping("/{id}/summary")
    public ProjectSummaryResponse getProjectSummary(@PathVariable UUID id) {
        return projectService.getProjectSummary(id);
    }
}
