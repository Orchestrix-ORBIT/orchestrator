package com.example.core_api.researchteam;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface TeamMemberRepository extends JpaRepository<TeamMember, TeamMemberId> {
    List<TeamMember> findAllByTeamId(UUID teamId);
    List<TeamMember> findAllByUserId(UUID userId);
    boolean existsByTeamIdAndUserId(UUID teamId, UUID userId);
}
