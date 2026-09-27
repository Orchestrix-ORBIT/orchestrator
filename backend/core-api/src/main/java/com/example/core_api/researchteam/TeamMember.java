package com.example.core_api.researchteam;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "team_members")
@IdClass(TeamMemberId.class)
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TeamMember {

    @Id
    @Column(name = "team_id", nullable = false)
    private UUID teamId;

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "role_in_team", nullable = false)
    @Builder.Default
    private TeamRole roleInTeam = TeamRole.MEMBER;

    @Column(name = "joined_at", nullable = false, updatable = false)
    private OffsetDateTime joinedAt;

    @PrePersist
    protected void onCreate() {
        joinedAt = OffsetDateTime.now();
    }
}
