package com.example.core_api.tenant;

import com.example.core_api.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

// The platform administrator assigns each organization's administrators.
// Works directly on the target organization's schema because the platform admin's own
// requests run in the platform schema. Only the users table is touched (names, emails,
// roles); no research data is read.
@Service
@RequiredArgsConstructor
public class OrganizationAdminService {

    private final TenantRepository tenantRepository;
    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;

    public record OrgAdmin(UUID id, String email, String displayName, String status) {}

    private String schemaOf(UUID tenantId) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + tenantId));
        String schema = tenant.getSchemaName();
        if (schema == null || !schema.matches("[a-z0-9_]+")) {
            throw new IllegalArgumentException("Invalid organization schema.");
        }
        return "\"" + schema + "\"";
    }

    public List<OrgAdmin> listAdmins(UUID tenantId) {
        String schema = schemaOf(tenantId);
        return jdbc.query("SELECT id, email, display_name, status FROM " + schema + ".users "
                        + "WHERE role IN ('ADMIN', 'OWNER') ORDER BY email",
                (rs, i) -> new OrgAdmin(rs.getObject("id", UUID.class), rs.getString("email"),
                        rs.getString("display_name"), rs.getString("status")));
    }

    /**
     * Makes {@code email} an administrator of the organization. An existing user is promoted
     * (and activated); otherwise a new ACTIVE admin account is created with {@code password}.
     */
    public OrgAdmin assignAdmin(UUID tenantId, String email, String displayName, String password) {
        String schema = schemaOf(tenantId);
        if (email == null || !email.trim().matches("[^@\\s]+@[^@\\s]+\\.[^@\\s]+")) {
            throw new IllegalArgumentException("A valid email address is required.");
        }
        String normalized = email.trim().toLowerCase();
        List<Map<String, Object>> existing = jdbc.queryForList(
                "SELECT id FROM " + schema + ".users WHERE email = ?", normalized);
        if (existing.isEmpty()) {
            if (password == null || password.length() < 8) {
                throw new IllegalArgumentException("This person has no account yet: set an initial password of at least 8 characters.");
            }
            String name = displayName == null || displayName.isBlank() ? normalized : displayName.trim();
            jdbc.update("INSERT INTO " + schema + ".users (email, display_name, password_hash, role, status) "
                    + "VALUES (?, ?, ?, 'ADMIN', 'ACTIVE')", normalized, name, passwordEncoder.encode(password));
        } else {
            jdbc.update("UPDATE " + schema + ".users SET role = 'ADMIN', status = 'ACTIVE', updated_at = now() "
                    + "WHERE email = ?", normalized);
        }
        return jdbc.queryForObject("SELECT id, email, display_name, status FROM " + schema + ".users WHERE email = ?",
                (rs, i) -> new OrgAdmin(rs.getObject("id", UUID.class), rs.getString("email"),
                        rs.getString("display_name"), rs.getString("status")), normalized);
    }

    /** Demotes an administrator to MEMBER. An organization always keeps at least one admin. */
    public void removeAdmin(UUID tenantId, UUID userId) {
        String schema = schemaOf(tenantId);
        Integer admins = jdbc.queryForObject(
                "SELECT count(*) FROM " + schema + ".users WHERE role IN ('ADMIN', 'OWNER')", Integer.class);
        Integer isAdmin = jdbc.queryForObject(
                "SELECT count(*) FROM " + schema + ".users WHERE id = ? AND role IN ('ADMIN', 'OWNER')", Integer.class, userId);
        if (isAdmin == null || isAdmin == 0) {
            throw new ResourceNotFoundException("Administrator not found in this organization.");
        }
        if (admins != null && admins <= 1) {
            throw new IllegalArgumentException("An organization must keep at least one administrator. Add another admin first.");
        }
        jdbc.update("UPDATE " + schema + ".users SET role = 'MEMBER', updated_at = now() WHERE id = ?", userId);
    }
}
