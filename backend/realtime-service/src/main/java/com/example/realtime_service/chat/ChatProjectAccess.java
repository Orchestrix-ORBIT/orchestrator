package com.example.realtime_service.chat;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class ChatProjectAccess {
    private final JdbcTemplate jdbc;

    public ChatProjectAccess(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public boolean canAccess(String schema, String email, UUID projectId) {
        if (schema == null || !schema.matches("org_[a-z0-9_]+") || email == null || projectId == null) {
            return false;
        }
        String sql = "SELECT EXISTS (SELECT 1 FROM " + schema + ".projects p "
                + "JOIN " + schema + ".users u ON lower(u.email) = lower(?) "
                + "WHERE p.id = ? AND u.status = 'ACTIVE' AND (p.owner_id = u.id "
                + "OR u.role IN ('ADMIN', 'OWNER') "
                + "OR (p.team_id IS NOT NULL AND EXISTS (SELECT 1 FROM " + schema
                + ".team_members tm WHERE tm.team_id = p.team_id AND tm.user_id = u.id))))";
        return Boolean.TRUE.equals(jdbc.queryForObject(sql, Boolean.class, email, projectId));
    }
}
