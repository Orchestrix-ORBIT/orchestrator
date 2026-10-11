package com.example.core_api.team;

import com.example.core_api.auth.User;
import com.example.core_api.auth.UserRepository;
import com.example.core_api.auth.UserRole;
import com.example.core_api.auth.UserStatus;
import com.example.core_api.exception.ResourceNotFoundException;
import com.example.core_api.multitenancy.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserDeletionServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private JdbcTemplate jdbc;
    @InjectMocks private UserDeletionService service;

    private final UUID adminId = UUID.randomUUID();
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        TenantContext.setCurrentTenant("org_test");
        // every table exists; ownership counts default to 0
        lenient().when(jdbc.queryForObject(startsWith("SELECT count(*) FROM information_schema"), eq(Integer.class), any(), any()))
                .thenReturn(1);
        lenient().when(jdbc.queryForObject(startsWith("SELECT count(*) FROM \"org_test\""), eq(Integer.class), any(UUID.class)))
                .thenReturn(0);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    private User user(UserRole role) {
        User u = User.builder().id(userId).email("u@lab.org").role(role).status(UserStatus.ACTIVE).build();
        when(userRepository.findById(userId)).thenReturn(Optional.of(u));
        return u;
    }

    @Test
    void deletes_a_user_who_owns_nothing_and_unassigns_their_tasks() {
        User u = user(UserRole.MEMBER);
        service.deleteUser(userId, adminId);
        verify(jdbc).update("UPDATE \"org_test\".tasks SET assignee_id = NULL WHERE assignee_id = ?", userId);
        verify(userRepository).delete(u);
    }

    @Test
    void refuses_a_user_who_still_owns_projects() {
        user(UserRole.LEAD);
        when(jdbc.queryForObject(startsWith("SELECT count(*) FROM \"org_test\".projects"), eq(Integer.class), any(UUID.class)))
                .thenReturn(2);
        assertThatThrownBy(() -> service.deleteUser(userId, adminId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("still owns 2 projects")
                .hasMessageContaining("suspend");
        verify(userRepository, never()).delete(any());
        verify(jdbc, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void refuses_admin_accounts() {
        user(UserRole.ADMIN);
        assertThatThrownBy(() -> service.deleteUser(userId, adminId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("platform administrator");
        verify(userRepository, never()).delete(any());
    }

    @Test
    void refuses_deleting_yourself() {
        user(UserRole.MEMBER);
        assertThatThrownBy(() -> service.deleteUser(userId, userId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("your own account");
        verify(userRepository, never()).delete(any());
    }

    @Test
    void unknown_user_is_not_found() {
        when(userRepository.findById(userId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.deleteUser(userId, adminId)).isInstanceOf(ResourceNotFoundException.class);
    }
}
