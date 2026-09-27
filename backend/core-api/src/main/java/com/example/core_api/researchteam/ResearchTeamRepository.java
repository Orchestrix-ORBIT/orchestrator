package com.example.core_api.researchteam;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ResearchTeamRepository extends JpaRepository<ResearchTeam, UUID> {
    List<ResearchTeam> findAllByLeaderId(UUID leaderId);
}
