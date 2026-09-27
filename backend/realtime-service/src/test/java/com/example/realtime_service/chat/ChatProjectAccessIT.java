package com.example.realtime_service.chat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@EnabledIfEnvironmentVariable(
        named = "SPRING_DATASOURCE_URL",
        matches = "jdbc:postgresql://(127\\.0\\.0\\.1|localhost):55432/orchestrix_test.*")
class ChatProjectAccessIT {
    @Autowired private ChatProjectAccess access;
    @Autowired private JdbcTemplate jdbc;

    @Test
    void permitsOwnerAndTeamMemberButDeniesOtherUsers() {
        String schema = "org_integration_lab";
        UUID owner = UUID.randomUUID();
        UUID member = UUID.randomUUID();
        UUID outsider = UUID.randomUUID();
        UUID team = UUID.randomUUID();
        UUID project = UUID.randomUUID();
        String ownerEmail = owner + "@example.test";
        String memberEmail = member + "@example.test";
        String outsiderEmail = outsider + "@example.test";
        try {
            for (UUID id : new UUID[] {owner, member, outsider}) {
                jdbc.update("INSERT INTO " + schema + ".users (id, email, password_hash, role, status) "
                        + "VALUES (?, ?, 'test-only', 'MEMBER', 'ACTIVE')", id, id + "@example.test");
            }
            jdbc.update("INSERT INTO " + schema + ".research_teams (id, name, leader_id) "
                    + "VALUES (?, 'Chat access test team', ?)", team, owner);
            jdbc.update("INSERT INTO " + schema + ".team_members (team_id, user_id, role_in_team) "
                    + "VALUES (?, ?, 'LEADER'), (?, ?, 'MEMBER')", team, owner, team, member);
            jdbc.update("INSERT INTO " + schema + ".projects (id, name, owner_id, team_id) "
                    + "VALUES (?, 'Chat access test project', ?, ?)", project, owner, team);

            assertThat(access.canAccess(schema, ownerEmail, project)).isTrue();
            assertThat(access.canAccess(schema, memberEmail, project)).isTrue();
            assertThat(access.canAccess(schema, outsiderEmail, project)).isFalse();
            assertThat(access.canAccess(schema, ownerEmail, UUID.randomUUID())).isFalse();
            assertThat(access.canAccess("org_invalid;drop", ownerEmail, project)).isFalse();
        } finally {
            jdbc.update("DELETE FROM " + schema + ".projects WHERE id = ?", project);
            jdbc.update("DELETE FROM " + schema + ".team_members WHERE team_id = ?", team);
            jdbc.update("DELETE FROM " + schema + ".research_teams WHERE id = ?", team);
            jdbc.update("DELETE FROM " + schema + ".users WHERE id IN (?, ?, ?)", owner, member, outsider);
        }
    }
}
