package com.example.core_api.team;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/team")
public class TeamController {

    private final TeamService teamService;
    private final UserDeletionService userDeletionService;

    public TeamController(TeamService teamService, UserDeletionService userDeletionService) {
        this.teamService = teamService;
        this.userDeletionService = userDeletionService;
    }

    // TenantFilter (Order=1) sets TenantContext for the full request lifecycle.
    // No manual TenantContext management needed in any controller method.

    @GetMapping
    public List<TeamMemberResponse> getAllMembers() {
        return teamService.getAllMembers();
    }

    @GetMapping("/{id}")
    public TeamMemberResponse getMemberById(@PathVariable UUID id) {
        return teamService.getMemberById(id);
    }

    @PatchMapping("/{id}/role")
    public TeamMemberResponse updateMemberRole(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateMemberRoleRequest request) {
        // Organization admins are assigned only by the platform administrator
        // (POST /api/admin/tenants/{id}/admins), never through the organization's own roster.
        var role = request.getRole();
        if (role == com.example.core_api.auth.UserRole.ADMIN || role == com.example.core_api.auth.UserRole.OWNER
                || role == com.example.core_api.auth.UserRole.ROLE_ADMIN) {
            throw new IllegalArgumentException("Organization administrators are assigned by the platform administrator.");
        }
        return teamService.updateMemberRole(id, role);
    }

    // Admin only (SecurityConfig restricts PATCH /api/team/** to ADMIN)
    @PatchMapping("/{id}/reactivate")
    public TeamMemberResponse reactivateMember(@PathVariable UUID id) {
        return teamService.reactivateMember(id);
    }

    // Admin only (SecurityConfig restricts DELETE /api/team/** to ADMIN)
    @DeleteMapping("/{id}/signup")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void rejectSignup(@PathVariable UUID id) {
        teamService.rejectSignup(id);
    }

    // Permanent delete (admin only via SecurityConfig DELETE /api/team/**); see UserDeletionService rules.
    @DeleteMapping("/{id}/permanent")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMemberPermanently(@PathVariable UUID id,
                                        @org.springframework.security.core.annotation.AuthenticationPrincipal com.example.core_api.auth.User currentUser) {
        userDeletionService.deleteUser(id, currentUser == null ? null : currentUser.getId());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeMember(@PathVariable UUID id,
                             @org.springframework.security.core.annotation.AuthenticationPrincipal com.example.core_api.auth.User currentUser) {
        // Suspend (reversible). Admin accounts are managed by the platform administrator.
        if (currentUser != null && id.equals(currentUser.getId())) {
            throw new IllegalArgumentException("You cannot suspend your own account.");
        }
        var role = teamService.getMemberById(id).getRole();
        if (role == com.example.core_api.auth.UserRole.ADMIN || role == com.example.core_api.auth.UserRole.OWNER
                || role == com.example.core_api.auth.UserRole.ROLE_ADMIN) {
            throw new IllegalArgumentException("Administrator accounts are managed by the platform administrator.");
        }
        teamService.removeMember(id);
    }
}
