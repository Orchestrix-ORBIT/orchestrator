package com.example.core_api.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class BookingProjectMigration implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(BookingProjectMigration.class);
    private final JdbcTemplate jdbcTemplate;

    public BookingProjectMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        List<String> schemas = jdbcTemplate.queryForList(
            "SELECT table_schema FROM information_schema.tables " +
            "WHERE table_name = 'resource_bookings' " +
            "AND table_schema NOT IN ('public', 'pg_catalog', 'information_schema')",
            String.class
        );

        if (schemas.isEmpty()) {
            schemas = List.of("org_myorg");
        }

        for (String schema : schemas) {
            String sql = "ALTER TABLE \"" + schema + "\".resource_bookings " +
                         "ADD COLUMN IF NOT EXISTS project_id UUID";
            try {
                jdbcTemplate.execute(sql);
                log.info("BookingProjectMigration: project_id column ensured in schema '{}'.", schema);
            } catch (Exception e) {
                log.warn("BookingProjectMigration: schema '{}' — {}", schema, e.getMessage());
            }
        }
    }
}
