package com.example.core_api.auth;

import com.example.core_api.multitenancy.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

// Account creation + admin approval rules:
//  - the first account of an organization becomes its ACTIVE admin (gets a token)
//  - later sign-ups are INACTIVE MEMBERs with no token until an admin approves them
//  - approval can be switched off (CI), emails are case-insensitive
@ExtendWith(MockitoExtension.class)
class AuthRegistrationApprovalTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;
    @Mock private AuthenticationManager authenticationManager;
    @InjectMocks private AuthService authService;

    @BeforeEach
    void setUp() {
        TenantContext.setCurrentTenant("org_test");
        ReflectionTestUtils.setField(authService, "requireSignupApproval", true);
        lenient().when(passwordEncoder.encode(any())).thenReturn("hashed");
        lenient().when(userRepository.save(any())).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });
        lenient().when(jwtService.generateToken(any())).thenReturn("jwt-token");
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    private User saved() {
        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        return captor.getValue();
    }

    @Test
    void first_user_of_the_platform_organization_becomes_active_admin_with_token() {
        TenantContext.setCurrentTenant("org_platform");
        when(userRepository.count()).thenReturn(0L);
        AuthResponse r = authService.register(new RegisterRequest("founder@lab.org", "Password123!", "Founder"));
        assertThat(r.token()).isEqualTo("jwt-token");
        assertThat(r.role()).isEqualTo("ROLE_ADMIN");
        assertThat(saved().getStatus()).isEqualTo(UserStatus.ACTIVE);
    }

    @Test
    void first_user_of_a_normal_organization_waits_for_the_platform_admin() {
        when(userRepository.count()).thenReturn(0L);           // tenant is org_test (not the platform org)
        AuthResponse r = authService.register(new RegisterRequest("first@lab.org", "Password123!", "First"));
        assertThat(r.token()).isNull();
        assertThat(r.role()).isEqualTo("ROLE_MEMBER");
        assertThat(saved().getStatus()).isEqualTo(UserStatus.INACTIVE);
    }

    @Test
    void later_signup_is_inactive_member_without_token() {
        when(userRepository.count()).thenReturn(5L);
        AuthResponse r = authService.register(new RegisterRequest("new.person@lab.org", "Password123!", "New"));
        assertThat(r.token()).isNull();
        assertThat(r.role()).isEqualTo("ROLE_MEMBER");
        User u = saved();
        assertThat(u.getStatus()).isEqualTo(UserStatus.INACTIVE);
        assertThat(u.isEnabled()).isFalse();           // Spring Security refuses login until approved
        verify(jwtService, never()).generateToken(any());
    }

    @Test
    void approval_can_be_disabled_for_ci() {
        ReflectionTestUtils.setField(authService, "requireSignupApproval", false);
        when(userRepository.count()).thenReturn(5L);
        AuthResponse r = authService.register(new RegisterRequest("ci.user@lab.org", "Password123!", "CI"));
        assertThat(r.token()).isEqualTo("jwt-token");
        assertThat(saved().getStatus()).isEqualTo(UserStatus.ACTIVE);
    }

    @Test
    void email_is_stored_lowercase_and_trimmed() {
        when(userRepository.count()).thenReturn(5L);
        authService.register(new RegisterRequest("  Mixed.Case@Lab.ORG ", "Password123!", "M"));
        verify(userRepository).existsByEmail("mixed.case@lab.org");
        assertThat(saved().getEmail()).isEqualTo("mixed.case@lab.org");
    }

    @Test
    void duplicate_email_with_different_case_is_rejected() {
        when(userRepository.existsByEmail("taken@lab.org")).thenReturn(true);
        assertThatThrownBy(() -> authService.register(new RegisterRequest("TAKEN@lab.org", "Password123!", "T")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already registered");
        verify(userRepository, never()).save(any());
    }

    @Test
    void login_lookup_is_case_insensitive() {
        User u = User.builder().id(UUID.randomUUID()).email("lead@lab.org").role(UserRole.LEAD).status(UserStatus.ACTIVE).build();
        when(userRepository.findByEmail("lead@lab.org")).thenReturn(Optional.of(u));
        assertThat(authService.loadUserByUsername("LEAD@Lab.org ")).isSameAs(u);
    }

    @Test
    void unknown_email_is_not_found() {
        when(userRepository.findByEmail("nobody@lab.org")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> authService.loadUserByUsername("nobody@lab.org")).isInstanceOf(UsernameNotFoundException.class);
    }

    @Test
    void approved_user_becomes_enabled() {
        User u = User.builder().id(UUID.randomUUID()).email("p@lab.org").role(UserRole.MEMBER).status(UserStatus.INACTIVE).build();
        assertThat(u.isEnabled()).isFalse();
        u.setStatus(UserStatus.ACTIVE);                 // what TeamService.reactivateMember does
        assertThat(u.isEnabled()).isTrue();
    }
}
