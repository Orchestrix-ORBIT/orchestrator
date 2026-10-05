package com.example.core_api.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * One-shot migration runner that adds the 'allowed_editors' column to the documents
 * table in EVERY tenant schema that contains a documents table.
 *
 * Uses information_schema.tables to discover all schemas dynamically.
 * ADD COLUMN IF NOT EXISTS is idempotent — safe to re-run on every startup.
 */
@Component
public class DocumentAllowedEditorsMigration implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DocumentAllowedEditorsMigration.class);

    private final JdbcTemplate jdbcTemplate;

    public DocumentAllowedEditorsMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        // 1. Find all schemas that have a 'documents' table
        List<String> schemas = jdbcTemplate.queryForList(
            "SELECT table_schema FROM information_schema.tables " +
            "WHERE table_name = 'documents' " +
            "AND table_schema NOT IN ('public', 'pg_catalog', 'information_schema')",
            String.class
        );

        if (schemas.isEmpty()) {
            // Fallback: try the default tenant schema in case information_schema query failed
            schemas = List.of("org_myorg");
            log.warn("DocumentAllowedEditorsMigration: no tenant schemas found via information_schema; " +
                     "falling back to default schema 'org_myorg'.");
        }

        // 2. Add allowed_editors column in each schema that has a documents table
        for (String schema : schemas) {
            String sql = "ALTER TABLE \"" + schema + "\".documents " +
                         "ADD COLUMN IF NOT EXISTS allowed_editors TEXT";
            try {
                jdbcTemplate.execute(sql);
                log.info("DocumentAllowedEditorsMigration: allowed_editors column ensured in schema '{}'.", schema);
            } catch (Exception e) {
                log.warn("DocumentAllowedEditorsMigration: schema '{}' — {}", schema, e.getMessage());
            }
        }
    }
}
