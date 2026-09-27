package com.example.core_api.team;

import com.example.core_api.auth.UserRole;
import com.example.core_api.auth.UserStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamMemberResponse {
    private UUID id;
    private String email;
    private String displayName;
    private UserRole role;
    private UserStatus status;
    private OffsetDateTime createdAt;
}
