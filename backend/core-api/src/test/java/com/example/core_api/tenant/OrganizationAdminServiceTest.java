package com.example.core_api.tenant;

import com.example.core_api.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrganizationAdminServiceTest {

    @Mock private TenantRepository tenantRepository;
    @Mock private JdbcTemplate jdbc;
    @Mock private PasswordEncoder passwordEncoder;
    @InjectMocks private OrganizationAdminService service;

    private final UUID tenantId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        Tenant t = new Tenant();
        t.setSchemaName("org_acme");
        lenient().when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(t));
    }

    @Test
    void existing_user_is_promoted_to_active_admin() {
        when(jdbc.queryForList(contains("SELECT id FROM \"org_acme\".users"), eq("ann@acme.org"))).thenReturn(List.of(Map.of("id", UUID.randomUUID())));
        service.assignAdmin(tenantId, " Ann@Acme.org ", null, null);
        verify(jdbc).update(contains("SET role = 'ADMIN', status = 'ACTIVE'"), eq("ann@acme.org"));
        verify(passwordEncoder, never()).encode(any());
    }

    @Test
    void new_person_gets_an_admin_account_with_hashed_password() {
        when(jdbc.queryForList(anyString(), eq("new@acme.org"))).thenReturn(List.of());
        when(passwordEncoder.encode("Initial123!")).thenReturn("hash");
        service.assignAdmin(tenantId, "new@acme.org", "New Admin", "Initial123!");
        verify(jdbc).update(contains("INSERT INTO \"org_acme\".users"), eq("new@acme.org"), eq("New Admin"), eq("hash"));
    }

    @Test
    void new_person_without_password_is_rejected() {
        when(jdbc.queryForList(anyString(), eq("new@acme.org"))).thenReturn(List.of());
        assertThatThrownBy(() -> service.assignAdmin(tenantId, "new@acme.org", null, "short"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("initial password");
    }

    @Test
    void invalid_email_is_rejected() {
        assertThatThrownBy(() -> service.assignAdmin(tenantId, "not-an-email", null, "Initial123!"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void last_admin_cannot_be_removed() {
        UUID admin = UUID.randomUUID();
        when(jdbc.queryForObject(contains("WHERE role IN"), eq(Integer.class))).thenReturn(1);
        when(jdbc.queryForObject(contains("WHERE id = ?"), eq(Integer.class), eq(admin))).thenReturn(1);
        assertThatThrownBy(() -> service.removeAdmin(tenantId, admin))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("at least one administrator");
        verify(jdbc, never()).update(anyString(), any(UUID.class));
    }

    @Test
    void admin_is_demoted_to_member_when_another_admin_remains() {
        UUID admin = UUID.randomUUID();
        when(jdbc.queryForObject(contains("WHERE role IN"), eq(Integer.class))).thenReturn(2);
        when(jdbc.queryForObject(contains("WHERE id = ?"), eq(Integer.class), eq(admin))).thenReturn(1);
        service.removeAdmin(tenantId, admin);
        verify(jdbc).update(contains("SET role = 'MEMBER'"), eq(admin));
    }

    @Test
    void unknown_organization_is_not_found() {
        UUID other = UUID.randomUUID();
        when(tenantRepository.findById(other)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.listAdmins(other)).isInstanceOf(ResourceNotFoundException.class);
    }
}
