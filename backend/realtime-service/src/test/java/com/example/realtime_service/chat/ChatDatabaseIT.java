package com.example.realtime_service.chat;

import com.example.realtime_service.multitenancy.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** Run after core-api's TenantMigrationIT against the same isolated database. */
@SpringBootTest
@EnabledIfEnvironmentVariable(
        named = "SPRING_DATASOURCE_URL",
        matches = "jdbc:postgresql://(127\\.0\\.0\\.1|localhost):55432/orchestrix_test.*")
class ChatDatabaseIT {

    @Autowired private ChatController chatController;
    @Autowired private JdbcTemplate jdbc;

    private UUID senderId;
    private UUID projectId;

    @BeforeEach
    void createFixtures() {
        senderId = UUID.randomUUID();
        projectId = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO org_integration_lab.users (id, email, password_hash, role, status)
                VALUES (?, ?, 'test-only', 'MEMBER', 'ACTIVE')
                """, senderId, senderId + "@example.test");
        jdbc.update("""
                INSERT INTO org_integration_lab.projects (id, name, owner_id)
                VALUES (?, 'Integration project', ?)
                """, projectId, senderId);
    }

    @AfterEach
    void removeFixtures() {
        TenantContext.clear();
        jdbc.update("DELETE FROM org_integration_lab.projects WHERE id = ?", projectId);
        jdbc.update("DELETE FROM org_integration_lab.users WHERE id = ?", senderId);
    }

    @Test
    void savesAndReadsChatInTenantSchema() {
        SendChatMessageRequest request = new SendChatMessageRequest(
                projectId, null, "A local integration message", "Researcher",
                "integration_lab", null, null, null);

        chatController.sendMessage(request);

        assertThat(chatController.getMessages(projectId.toString(), 0, 20, "integration_lab").getBody())
                .extracting(ChatMessageResponse::content)
                .containsExactly("A local integration message");
        assertThat(jdbc.queryForObject(
                "SELECT count(*) FROM org_integration_lab.chat_messages WHERE project_id = ?",
                Integer.class, projectId)).isEqualTo(1);
    }
}
