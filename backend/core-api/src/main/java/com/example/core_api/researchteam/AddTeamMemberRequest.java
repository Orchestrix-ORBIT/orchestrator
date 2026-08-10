package com.example.core_api.researchteam;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.UUID;

@Data
public class AddTeamMemberRequest {
    @NotNull(message = "User ID is required")
    private UUID userId;
    
    @NotNull(message = "Role in team is required")
    private TeamRole roleInTeam;
}
