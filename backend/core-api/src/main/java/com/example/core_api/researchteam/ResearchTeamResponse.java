package com.example.core_api.researchteam;

import lombok.Builder;
import lombok.Data;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
public class ResearchTeamResponse {
    private UUID id;
    private String name;
    private String description;
    private UUID leaderId;
    private OffsetDateTime createdAt;
}
