package com.example.core_api.project;

import com.example.core_api.auth.User;
import com.example.core_api.auth.UserRole;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectService projectService;
    private final ProjectAccess projectAccess;

    public ProjectController(ProjectService projectService, ProjectAccess projectAccess) {
        this.projectService = projectService;
        this.projectAccess = projectAccess;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectResponse createProject(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody CreateProjectRequest request) {
        if (currentUser == null || currentUser.getRole() == UserRole.MEMBER || currentUser.getRole() == UserRole.GUEST) {
            throw new AccessDeniedException("Researchers are not allowed to create projects.");
        }
        return projectService.createProject(request, currentUser.getId());
    }

    @GetMapping
    public List<ProjectResponse> getAllProjects(@AuthenticationPrincipal User currentUser) {
        return projectService.getAllProjects().stream()
                .filter(project -> projectAccess.canAccess(currentUser, project.getId()))
                .toList();
    }

    @PutMapping("/{id}")
    public ProjectResponse updateProject(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id,
            @Valid @RequestBody CreateProjectRequest request) {
        // Only Leads, Admins, and Owners may update projects
        if (currentUser == null ||
                currentUser.getRole() == UserRole.MEMBER ||
                currentUser.getRole() == UserRole.GUEST ||
                currentUser.getRole() == UserRole.RESEARCHER) {
            throw new AccessDeniedException("Only Research Leads or Admins may update projects.");
        }
        return projectService.updateProject(id, request);
    }

    @GetMapping("/{id}")
    public ProjectResponse getProjectById(@PathVariable UUID id) {
        return projectService.getProjectById(id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteProject(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID id) {
        if (currentUser == null || currentUser.getRole() == UserRole.MEMBER || currentUser.getRole() == UserRole.GUEST) {
            throw new AccessDeniedException("Researchers are not allowed to delete projects.");
        }
        projectService.deleteProject(id);
    }

    @GetMapping("/{id}/summary")
    public ProjectSummaryResponse getProjectSummary(@PathVariable UUID id) {
        return projectService.getProjectSummary(id);
    }
}
