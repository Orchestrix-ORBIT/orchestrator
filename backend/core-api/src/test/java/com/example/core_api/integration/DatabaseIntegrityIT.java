package com.example.core_api.integration;

import com.example.core_api.multitenancy.TenantMigrationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Checks actual PostgreSQL constraints and transaction behavior in an isolated tenant schema. */
@SpringBootTest
@EnabledIfEnvironmentVariable(
        named = "SPRING_DATASOURCE_URL",
        matches = "jdbc:postgresql://(127\\.0\\.0\\.1|localhost):55432/orchestrix_test.*")
class DatabaseIntegrityIT {
    @Autowired private TenantMigrationService migrations;
    @Autowired private JdbcTemplate jdbc;

    @Test
    void schemaHasExpectedTablesColumnsAndRelationships() {
        String schema = newSchema();
        try {
            for (String table : new String[]{"users", "projects", "tasks", "resources", "resource_allocations",
                    "resource_bookings", "resource_maintenance", "research_teams", "team_members",
                    "student_profiles", "chat_messages", "documents", "ai_summaries", "notifications", "audit_logs"}) {
                assertThat(jdbc.queryForObject("SELECT count(*) FROM information_schema.tables "
                        + "WHERE table_schema = ? AND table_name = ?", Integer.class, schema, table))
                        .as(table).isEqualTo(1);
            }
            assertThat(jdbc.queryForObject("SELECT count(*) FROM information_schema.columns "
                    + "WHERE table_schema = ? AND table_name = 'tasks' AND column_name = 'project_id' "
                    + "AND is_nullable = 'NO' AND data_type = 'uuid'", Integer.class, schema)).isEqualTo(1);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM information_schema.table_constraints "
                    + "WHERE table_schema = ? AND table_name = 'tasks' AND constraint_type = 'FOREIGN KEY'",
                    Integer.class, schema)).isGreaterThanOrEqualTo(2);
            for (String table : new String[]{"documents", "notifications", "team_members", "resource_bookings"}) {
                assertThat(jdbc.queryForObject("SELECT count(*) FROM information_schema.table_constraints "
                        + "WHERE table_schema = ? AND table_name = ? AND constraint_type = 'FOREIGN KEY'",
                        Integer.class, schema, table)).as(table).isGreaterThanOrEqualTo(1);
            }
        } finally {
            drop(schema);
        }
    }

    @Test
    void uniqueKeysForeignKeysChecksAndCascadeAreEnforced() {
        String schema = newSchema();
        try {
            UUID user = UUID.randomUUID();
            UUID project = UUID.randomUUID();
            UUID task = UUID.randomUUID();
            UUID resource = UUID.randomUUID();
            jdbc.update("INSERT INTO " + schema + ".users(id,email,password_hash) VALUES (?,?,?)",
                    user, "integrity@example.test", "test-hash");
            assertThatThrownBy(() -> jdbc.update("INSERT INTO " + schema
                    + ".users(id,email,password_hash) VALUES (?,?,?)", UUID.randomUUID(),
                    "integrity@example.test", "test-hash")).isInstanceOf(DataAccessException.class);
            assertThatThrownBy(() -> jdbc.update("INSERT INTO " + schema
                    + ".projects(id,name,owner_id) VALUES (?,?,?)", UUID.randomUUID(), "Orphan",
                    UUID.randomUUID())).isInstanceOf(DataAccessException.class);

            jdbc.update("INSERT INTO " + schema + ".projects(id,name,owner_id) VALUES (?,?,?)",
                    project, "Integrity project", user);
            assertThatThrownBy(() -> jdbc.update("INSERT INTO " + schema
                    + ".documents(project_id,author_id,title) VALUES (?,?,?)",
                    UUID.randomUUID(), user, "Orphan document")).isInstanceOf(DataAccessException.class);
            assertThatThrownBy(() -> jdbc.update("INSERT INTO " + schema
                    + ".notifications(user_id,type,title) VALUES (?,?,?)",
                    UUID.randomUUID(), "INFO", "Orphan notification")).isInstanceOf(DataAccessException.class);
            UUID team = UUID.randomUUID();
            jdbc.update("INSERT INTO " + schema + ".research_teams(id,name,leader_id) VALUES (?,?,?)",
                    team, "Integrity team", user);
            jdbc.update("INSERT INTO " + schema + ".team_members(team_id,user_id) VALUES (?,?)", team, user);
            assertThatThrownBy(() -> jdbc.update("INSERT INTO " + schema
                    + ".team_members(team_id,user_id) VALUES (?,?)", team, user))
                    .isInstanceOf(DataAccessException.class);
            jdbc.update("INSERT INTO " + schema + ".tasks(id,title,project_id) VALUES (?,?,?)",
                    task, "Integrity task", project);
            jdbc.update("INSERT INTO " + schema
                    + ".chat_messages(project_id,sender_id,content_encrypted) VALUES (?,?,?)",
                    project, user, "encrypted-test-value");
            jdbc.update("INSERT INTO " + schema + ".resources(id,name,type,owner_id) VALUES (?,?,?,?)",
                    resource, "Test GPU", "GPU", user);
            assertThatThrownBy(() -> jdbc.update("INSERT INTO " + schema
                    + ".resource_bookings(resource_id,user_id,start_time,end_time) "
                    + "VALUES (?,?,now(),now() - interval '1 hour')", resource, user))
                    .isInstanceOf(DataAccessException.class);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM " + schema
                    + ".resource_bookings", Integer.class)).isZero();

            jdbc.update("DELETE FROM " + schema + ".projects WHERE id = ?", project);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM " + schema + ".tasks WHERE id = ?",
                    Integer.class, task)).isZero();
            assertThat(jdbc.queryForObject("SELECT count(*) FROM " + schema
                    + ".chat_messages WHERE project_id = ?", Integer.class, project)).isZero();
            assertThat(jdbc.queryForObject("SELECT count(*) FROM " + schema + ".resources WHERE id = ?",
                    Integer.class, resource)).isEqualTo(1);
        } finally {
            drop(schema);
        }
    }

    @Test
    void failedMultiStatementTransactionRollsBackItsEarlierInsert() {
        String schema = newSchema();
        try {
            String email = "rollback@example.test";
            assertThatThrownBy(() -> jdbc.execute((ConnectionCallback<Void>) connection -> {
                boolean originalAutoCommit = connection.getAutoCommit();
                connection.setAutoCommit(false);
                try (PreparedStatement statement = connection.prepareStatement(
                        "INSERT INTO " + schema + ".users(id,email,password_hash) VALUES (?,?,?)")) {
                    statement.setObject(1, UUID.randomUUID());
                    statement.setString(2, email);
                    statement.setString(3, "test-hash");
                    statement.executeUpdate();
                    statement.setObject(1, UUID.randomUUID());
                    statement.executeUpdate();
                    connection.commit();
                } catch (SQLException failure) {
                    connection.rollback();
                    throw failure;
                } finally {
                    connection.setAutoCommit(originalAutoCommit);
                }
                return null;
            })).isInstanceOf(DataAccessException.class);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM " + schema + ".users WHERE email = ?",
                    Integer.class, email)).isZero();
        } finally {
            drop(schema);
        }
    }

    private String newSchema() {
        String schema = "org_integrity_" + UUID.randomUUID().toString().substring(0, 8);
        migrations.provisionTenantSchema(schema);
        return schema;
    }

    private void drop(String schema) {
        jdbc.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
    }
}
