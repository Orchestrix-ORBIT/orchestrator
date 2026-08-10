package com.example.core_api.researchteam;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.io.Serializable;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TeamMemberId implements Serializable {
    private UUID teamId;
    private UUID userId;
}
