package com.example.core_api.project;

import com.example.core_api.auth.User;
import com.example.core_api.auth.UserRole;
import com.example.core_api.researchteam.TeamMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ProjectAccess {
    private final ProjectRepository projects;
    private final TeamMemberRepository members;

    public boolean canAccess(User user, UUID projectId) {
        if (user == null || projectId == null) return false;
        return projects.findById(projectId).map(project -> canAccess(user, project)).orElse(false);
    }

    public boolean canAccess(User user, Project project) {
        if (user == null || project == null) return false;
        UserRole role = user.getRole();

        // Admins and Owners always see everything
        if (role == UserRole.ADMIN || role == UserRole.OWNER ||
            role == UserRole.ROLE_ADMIN) return true;

        // Leads see projects they own (or all, depending on policy — here: all)
        if (role == UserRole.LEAD || role == UserRole.ROLE_LEAD) return true;

        // Members/Researchers see only projects they own OR are a team member of
        boolean isOwner = user.getId().equals(project.getOwnerId());
        boolean isTeamMember = project.getTeamId() != null
                && members.existsByTeamIdAndUserId(project.getTeamId(), user.getId());
        return isOwner || isTeamMember;
    }
}
