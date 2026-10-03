package com.example.core_api.researchteam;

import lombok.Builder;
import lombok.Data;
import java.util.UUID;

/**
 * Response DTO returned when listing members of a specific ResearchTeam.
 * Includes user-facing fields (email, displayName) alongside the team membership data.
 */
@Data
@Builder
public class TeamMemberDetailResponse {
    private UUID userId;
    private UUID teamId;
    private TeamRole roleInTeam;
    private String displayName;
    private String email;
}
