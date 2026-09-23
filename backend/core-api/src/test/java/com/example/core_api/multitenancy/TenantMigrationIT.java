package com.example.core_api.multitenancy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;

/** Runs only against the isolated local PostgreSQL integration database. */
@SpringBootTest
@EnabledIfEnvironmentVariable(
        named = "SPRING_DATASOURCE_URL",
        matches = "jdbc:postgresql://(127\\.0\\.0\\.1|localhost):55432/orchestrix_test.*")
class TenantMigrationIT {

    static final String SCHEMA = "org_integration_lab";

    @Autowired private TenantMigrationService migrationService;
    @Autowired private JdbcTemplate jdbc;

    @Test
    void createsTenantSchemaAndAppliesChatMigrations() {
        migrationService.provisionTenantSchema(SCHEMA);

        Integer tableCount = jdbc.queryForObject("""
                SELECT count(*) FROM information_schema.tables
                WHERE table_schema = ? AND table_name IN ('users', 'projects', 'chat_messages')
                """, Integer.class, SCHEMA);
        Integer migrationCount = jdbc.queryForObject(
                "SELECT count(*) FROM org_integration_lab.flyway_schema_history", Integer.class);

        assertThat(tableCount).isEqualTo(3);
        assertThat(migrationCount).isGreaterThanOrEqualTo(8);
    }
}
