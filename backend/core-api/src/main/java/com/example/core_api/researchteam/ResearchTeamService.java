package com.example.core_api.researchteam;

import com.example.core_api.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class ResearchTeamService {

    private final ResearchTeamRepository teamRepository;
    private final TeamMemberRepository memberRepository;

    public ResearchTeamService(ResearchTeamRepository teamRepository, TeamMemberRepository memberRepository) {
        this.teamRepository = teamRepository;
        this.memberRepository = memberRepository;
    }

    public ResearchTeamResponse createTeam(CreateResearchTeamRequest request, UUID leaderId) {
        ResearchTeam team = ResearchTeam.builder()
                .name(request.getName())
                .description(request.getDescription())
                .leaderId(leaderId)
                .build();
                
        team = teamRepository.save(team);
        
        // Add creator as LEADER
        TeamMember leaderMember = TeamMember.builder()
                .teamId(team.getId())
                .userId(leaderId)
                .roleInTeam(TeamRole.LEADER)
                .build();
        memberRepository.save(leaderMember);
        
        return mapToResponse(team);
    }

    public void addMemberToTeam(UUID teamId, AddTeamMemberRequest request) {
        if (!teamRepository.existsById(teamId)) {
            throw new ResourceNotFoundException("Team not found: " + teamId);
        }
        
        TeamMember member = TeamMember.builder()
                .teamId(teamId)
                .userId(request.getUserId())
                .roleInTeam(request.getRoleInTeam())
                .build();
                
        memberRepository.save(member);
    }

    public void removeMemberFromTeam(UUID teamId, UUID userId) {
        TeamMemberId id = new TeamMemberId(teamId, userId);
        if (!memberRepository.existsById(id)) {
            throw new ResourceNotFoundException("Member not found in team");
        }
        memberRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<ResearchTeamResponse> getUserTeams(UUID userId) {
        List<TeamMember> memberships = memberRepository.findAllByUserId(userId);
        return memberships.stream()
                .map(m -> teamRepository.findById(m.getTeamId()).orElse(null))
                .filter(t -> t != null)
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private ResearchTeamResponse mapToResponse(ResearchTeam team) {
        return ResearchTeamResponse.builder()
                .id(team.getId())
                .name(team.getName())
                .description(team.getDescription())
                .leaderId(team.getLeaderId())
                .createdAt(team.getCreatedAt())
                .build();
    }
}
