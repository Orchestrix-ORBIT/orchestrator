package com.example.core_api.team;

import com.example.core_api.auth.User;
import com.example.core_api.auth.UserRepository;
import com.example.core_api.auth.UserRole;
import com.example.core_api.exception.ResourceNotFoundException;
import com.example.core_api.multitenancy.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

// Permanently deletes a user of the current organization (organization admin action).
// The database removes their chat messages, notifications, bookings, team memberships and
// student profile (ON DELETE CASCADE). Tasks assigned to them become unassigned. Users who
// still own projects, documents, research teams or resources cannot be deleted — that would
// destroy other people's work — so the admin must reassign those or suspend the account.
@Service
@RequiredArgsConstructor
public class UserDeletionService {

    private final UserRepository userRepository;
    private final JdbcTemplate jdbc;

    private record Ownership(String table, String column, String label) {}

    private static final List<Ownership> BLOCKING = List.of(
            new Ownership("projects", "owner_id", "project"),
            new Ownership("documents", "author_id", "document"),
            new Ownership("research_teams", "leader_id", "research team"),
            new Ownership("resources", "owner_id", "resource"),
            new Ownership("resource_allocations", "allocated_by", "resource allocation"));

    private String schema() {
        String schema = TenantContext.getCurrentTenant();
        if (schema == null || !schema.matches("[a-z0-9_]+")) {
            throw new IllegalArgumentException("Unknown organization.");
        }
        return schema;
    }

    private boolean tableExists(String schema, String table) {
        Integer n = jdbc.queryForObject("SELECT count(*) FROM information_schema.tables WHERE table_schema = ? AND table_name = ?",
                Integer.class, schema, table);
        return n != null && n > 0;
    }

    @Transactional
    public void deleteUser(UUID id, UUID currentUserId) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found with id: " + id));
        if (id.equals(currentUserId)) {
            throw new IllegalArgumentException("You cannot delete your own account.");
        }
        if (user.getRole() == UserRole.ADMIN || user.getRole() == UserRole.OWNER || user.getRole() == UserRole.ROLE_ADMIN) {
            throw new IllegalArgumentException("Administrator accounts are managed by the platform administrator.");
        }
        String schema = schema();
        List<String> owned = new ArrayList<>();
        for (Ownership o : BLOCKING) {
            if (!tableExists(schema, o.table())) continue;
            Integer n = jdbc.queryForObject("SELECT count(*) FROM \"" + schema + "\"." + o.table() + " WHERE " + o.column() + " = ?",
                    Integer.class, id);
            if (n != null && n > 0) owned.add(n + " " + o.label() + (n == 1 ? "" : "s"));
        }
        if (!owned.isEmpty()) {
            throw new IllegalArgumentException("This user still owns " + String.join(", ", owned)
                    + ". Reassign them first, or suspend the account instead.");
        }
        if (tableExists(schema, "tasks")) {
            jdbc.update("UPDATE \"" + schema + "\".tasks SET assignee_id = NULL WHERE assignee_id = ?", id);
        }
        userRepository.delete(user);
        userRepository.flush();
    }
}
