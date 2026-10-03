package com.example.core_api.researchteam;

import com.example.core_api.auth.User;
import com.example.core_api.auth.UserRole;
import org.springframework.security.access.AccessDeniedException;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/research-teams")
public class ResearchTeamController {

    private final ResearchTeamService teamService;

    public ResearchTeamController(ResearchTeamService teamService) {
        this.teamService = teamService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ResearchTeamResponse createTeam(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody CreateResearchTeamRequest request) {
        return teamService.createTeam(request, currentUser.getId());
    }

    @GetMapping
    public List<ResearchTeamResponse> getUserTeams(@AuthenticationPrincipal User currentUser) {
        return teamService.getUserTeams(currentUser.getId());
    }

    @PostMapping("/{teamId}/members")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void addMemberToTeam(
            @PathVariable UUID teamId,
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody AddTeamMemberRequest request) {
        requireManager(teamId, currentUser);
        teamService.addMemberToTeam(teamId, request);
    }

    @GetMapping("/{teamId}/members")
    public List<TeamMemberDetailResponse> getTeamMembers(
            @PathVariable UUID teamId,
            @AuthenticationPrincipal User currentUser) {
        // Any authenticated user can view team members (needed by researcher project page)
        return teamService.getTeamMembers(teamId);
    }

    @DeleteMapping("/{teamId}/members/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeMemberFromTeam(
            @PathVariable UUID teamId,
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID userId) {
        requireManager(teamId, currentUser);
        teamService.removeMemberFromTeam(teamId, userId);
    }

    private void requireManager(UUID teamId, User user) {
        if (user == null || (!(user.getRole() == UserRole.ADMIN || user.getRole() == UserRole.OWNER
                || user.getRole() == UserRole.ROLE_ADMIN) && !teamService.isLeader(teamId, user.getId()))) {
            throw new AccessDeniedException("Only a team leader or administrator can change membership.");
        }
    }
}
