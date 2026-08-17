package com.example.core_api.researchteam;

import com.example.core_api.auth.User;
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
    public void addMemberToTeam(
            @PathVariable UUID teamId,
            @Valid @RequestBody AddTeamMemberRequest request) {
        teamService.addMemberToTeam(teamId, request);
    }

    @DeleteMapping("/{teamId}/members/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeMemberFromTeam(
            @PathVariable UUID teamId,
            @PathVariable UUID userId) {
        teamService.removeMemberFromTeam(teamId, userId);
    }
}
