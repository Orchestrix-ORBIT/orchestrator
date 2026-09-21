package com.example.core_api.researchteam;

import com.example.core_api.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ResearchTeamServiceTest {

    @Mock private ResearchTeamRepository teamRepository;
    @Mock private TeamMemberRepository   memberRepository;
    @InjectMocks private ResearchTeamService researchTeamService;

    private UUID teamId, leaderId, memberId;
    private ResearchTeam sampleTeam;

    @BeforeEach
    void setUp() {
        teamId   = UUID.randomUUID();
        leaderId = UUID.randomUUID();
        memberId = UUID.randomUUID();
        sampleTeam = ResearchTeam.builder().id(teamId).name("Quantum Computing Team")
                .description("Researching quantum algorithms").leaderId(leaderId).build();
    }

    @Test
    void createTeam_savesTeamAndAutoAddsLeaderAsMember() {
        when(teamRepository.save(any(ResearchTeam.class))).thenReturn(sampleTeam);
        when(memberRepository.save(any(TeamMember.class))).thenReturn(mock(TeamMember.class));
        CreateResearchTeamRequest req = new CreateResearchTeamRequest();
        req.setName("Quantum Computing Team"); req.setDescription("Researching quantum algorithms");
        ResearchTeamResponse response = researchTeamService.createTeam(req, leaderId);
        assertThat(response.getId()).isEqualTo(teamId);
        assertThat(response.getName()).isEqualTo("Quantum Computing Team");
        assertThat(response.getLeaderId()).isEqualTo(leaderId);
        verify(teamRepository).save(any(ResearchTeam.class));
        verify(memberRepository).save(any(TeamMember.class));
    }

    @Test
    void createTeam_withDescriptionNull_stillSavesSuccessfully() {
        ResearchTeam minimal = ResearchTeam.builder().id(teamId).name("Minimal Team").leaderId(leaderId).build();
        when(teamRepository.save(any())).thenReturn(minimal);
        when(memberRepository.save(any())).thenReturn(mock(TeamMember.class));
        CreateResearchTeamRequest req = new CreateResearchTeamRequest();
        req.setName("Minimal Team");
        ResearchTeamResponse response = researchTeamService.createTeam(req, leaderId);
        assertThat(response.getName()).isEqualTo("Minimal Team");
        assertThat(response.getDescription()).isNull();
    }

    @Test
    void addMemberToTeam_whenTeamExists_savesMember() {
        when(teamRepository.existsById(teamId)).thenReturn(true);
        when(memberRepository.save(any())).thenReturn(mock(TeamMember.class));
        AddTeamMemberRequest req = new AddTeamMemberRequest();
        req.setUserId(memberId); req.setRoleInTeam(TeamRole.MEMBER);
        researchTeamService.addMemberToTeam(teamId, req);
        verify(memberRepository).save(any(TeamMember.class));
    }

    @Test
    void addMemberToTeam_whenTeamNotFound_throwsResourceNotFoundException() {
        when(teamRepository.existsById(teamId)).thenReturn(false);
        AddTeamMemberRequest req = new AddTeamMemberRequest();
        req.setUserId(memberId); req.setRoleInTeam(TeamRole.MEMBER);
        assertThatThrownBy(() -> researchTeamService.addMemberToTeam(teamId, req))
                .isInstanceOf(ResourceNotFoundException.class).hasMessageContaining(teamId.toString());
        verify(memberRepository, never()).save(any());
    }

    @Test
    void removeMemberFromTeam_whenMemberExists_deletesSuccessfully() {
        TeamMemberId pk = new TeamMemberId(teamId, memberId);
        when(memberRepository.existsById(pk)).thenReturn(true);
        researchTeamService.removeMemberFromTeam(teamId, memberId);
        verify(memberRepository).deleteById(pk);
    }

    @Test
    void removeMemberFromTeam_whenMemberNotFound_throwsResourceNotFoundException() {
        TeamMemberId pk = new TeamMemberId(teamId, memberId);
        when(memberRepository.existsById(pk)).thenReturn(false);
        assertThatThrownBy(() -> researchTeamService.removeMemberFromTeam(teamId, memberId))
                .isInstanceOf(ResourceNotFoundException.class).hasMessageContaining("Member not found in team");
        verify(memberRepository, never()).deleteById(any());
    }

    @Test
    void getUserTeams_returnsMappedTeamsForUser() {
        TeamMember membership = TeamMember.builder().teamId(teamId).userId(leaderId).roleInTeam(TeamRole.LEADER).build();
        when(memberRepository.findAllByUserId(leaderId)).thenReturn(List.of(membership));
        when(teamRepository.findById(teamId)).thenReturn(Optional.of(sampleTeam));
        List<ResearchTeamResponse> results = researchTeamService.getUserTeams(leaderId);
        assertThat(results).hasSize(1);
        assertThat(results.get(0).getName()).isEqualTo("Quantum Computing Team");
    }

    @Test
    void getUserTeams_whenUserHasNoTeams_returnsEmptyList() {
        when(memberRepository.findAllByUserId(leaderId)).thenReturn(List.of());
        assertThat(researchTeamService.getUserTeams(leaderId)).isEmpty();
        verify(teamRepository, never()).findById(any());
    }

    @Test
    void getUserTeams_whenTeamDeletedButMembershipOrphaned_filtersOutNullTeams() {
        UUID ghostId = UUID.randomUUID();
        TeamMember orphan = TeamMember.builder().teamId(ghostId).userId(leaderId).roleInTeam(TeamRole.MEMBER).build();
        when(memberRepository.findAllByUserId(leaderId)).thenReturn(List.of(orphan));
        when(teamRepository.findById(ghostId)).thenReturn(Optional.empty());
        assertThat(researchTeamService.getUserTeams(leaderId)).isEmpty();
    }
}
