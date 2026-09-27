package com.example.core_api.researchteam;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateResearchTeamRequest {
    @NotBlank(message = "Team name is required")
    private String name;
    
    private String description;
}
