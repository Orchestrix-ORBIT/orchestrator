package com.example.core_api.team;

import com.example.core_api.auth.User;
import com.example.core_api.auth.UserRepository;
import com.example.core_api.auth.UserRole;
import com.example.core_api.auth.UserStatus;
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
class TeamServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private TeamService teamService;

    private User sampleUser;
    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        sampleUser = User.builder()
                .id(userId)
                .email("user@example.com")
                .displayName("Test User")
                .role(UserRole.MEMBER)
                .status(UserStatus.ACTIVE)
                .build();
    }

    @Test
    void getAllMembers_returnsListOfMembers() {
        when(userRepository.findAll()).thenReturn(List.of(sampleUser));

        List<TeamMemberResponse> result = teamService.getAllMembers();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getEmail()).isEqualTo("user@example.com");
    }

    @Test
    void getMemberById_whenFound_returnsMember() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(sampleUser));

        TeamMemberResponse result = teamService.getMemberById(userId);

        assertThat(result.getId()).isEqualTo(userId);
        assertThat(result.getRole()).isEqualTo(UserRole.MEMBER);
    }

    @Test
    void getMemberById_whenNotFound_throwsResourceNotFoundException() {
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> teamService.getMemberById(userId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void updateMemberRole_updatesRoleAndReturnsMember() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(sampleUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TeamMemberResponse result = teamService.updateMemberRole(userId, UserRole.ADMIN);

        assertThat(result.getRole()).isEqualTo(UserRole.ADMIN);
        verify(userRepository).save(sampleUser);
    }

    @Test
    void removeMember_setsStatusToSuspended() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(sampleUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        teamService.removeMember(userId);

        assertThat(sampleUser.getStatus()).isEqualTo(UserStatus.SUSPENDED);
        verify(userRepository).save(sampleUser);
    }
}
