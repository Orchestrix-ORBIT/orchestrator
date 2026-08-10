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

    public TeamController(TeamService teamService) {
        this.teamService = teamService;
    }

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
        return teamService.updateMemberRole(id, request.getRole());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeMember(@PathVariable UUID id) {
        teamService.removeMember(id);
    }
}
