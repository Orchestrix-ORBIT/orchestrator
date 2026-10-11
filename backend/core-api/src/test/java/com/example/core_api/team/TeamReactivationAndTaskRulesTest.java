package com.example.core_api.team;

import com.example.core_api.auth.User;
import com.example.core_api.auth.UserRepository;
import com.example.core_api.auth.UserRole;
import com.example.core_api.auth.UserStatus;
import com.example.core_api.exception.ResourceNotFoundException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

// Admin can undo a removal: SUSPENDED -> ACTIVE.
@ExtendWith(MockitoExtension.class)
class TeamReactivationAndTaskRulesTest {

    @Mock private UserRepository userRepository;
    @InjectMocks private TeamService teamService;

    @Test
    void removeMember_then_reactivateMember_restores_active_status() {
        UUID id = UUID.randomUUID();
        User user = User.builder().id(id).email("guest@lab.com").role(UserRole.MEMBER).status(UserStatus.ACTIVE).build();
        when(userRepository.findById(id)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        teamService.removeMember(id);
        assertThat(user.getStatus()).isEqualTo(UserStatus.SUSPENDED);

        TeamMemberResponse response = teamService.reactivateMember(id);
        assertThat(user.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(response.getStatus()).isEqualTo(UserStatus.ACTIVE);
    }

    @Test
    void reactivateMember_unknown_user_throws_not_found() {
        UUID id = UUID.randomUUID();
        when(userRepository.findById(id)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> teamService.reactivateMember(id)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void rejectSignup_deletes_a_pending_request() {
        UUID id = UUID.randomUUID();
        User pending = User.builder().id(id).email("p@lab.com").role(UserRole.MEMBER).status(UserStatus.INACTIVE).build();
        when(userRepository.findById(id)).thenReturn(Optional.of(pending));
        teamService.rejectSignup(id);
        org.mockito.Mockito.verify(userRepository).delete(pending);
    }

    @Test
    void rejectSignup_refuses_active_or_suspended_accounts() {
        UUID id = UUID.randomUUID();
        User active = User.builder().id(id).email("a@lab.com").role(UserRole.MEMBER).status(UserStatus.ACTIVE).build();
        when(userRepository.findById(id)).thenReturn(Optional.of(active));
        assertThatThrownBy(() -> teamService.rejectSignup(id))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Only pending");
        org.mockito.Mockito.verify(userRepository, org.mockito.Mockito.never()).delete(any());
    }
}
