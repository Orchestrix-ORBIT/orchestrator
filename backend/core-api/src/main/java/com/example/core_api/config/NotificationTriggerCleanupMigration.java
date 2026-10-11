package com.example.core_api.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

// Existing tenant schemas do not pick up new tenant migrations, so V20 (drop the V18
// notification triggers that duplicated the application's notifications) is applied here too.
@Component
public class NotificationTriggerCleanupMigration implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(NotificationTriggerCleanupMigration.class);
    private final JdbcTemplate jdbcTemplate;

    public NotificationTriggerCleanupMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        List<String> schemas = jdbcTemplate.queryForList(
            "SELECT table_schema FROM information_schema.tables " +
            "WHERE table_name = 'notifications' " +
            "AND table_schema NOT IN ('public', 'pg_catalog', 'information_schema')",
            String.class
        );
        for (String schema : schemas) {
            try {
                jdbcTemplate.execute("DROP TRIGGER IF EXISTS trigger_task_assignment ON \"" + schema + "\".tasks");
                jdbcTemplate.execute("DROP TRIGGER IF EXISTS trigger_booking_status ON \"" + schema + "\".resource_bookings");
                jdbcTemplate.execute("DROP FUNCTION IF EXISTS \"" + schema + "\".notify_task_assignment()");
                jdbcTemplate.execute("DROP FUNCTION IF EXISTS \"" + schema + "\".notify_booking_status()");
                log.info("NotificationTriggerCleanupMigration: duplicate notification triggers removed in schema '{}'.", schema);
            } catch (Exception e) {
                log.warn("NotificationTriggerCleanupMigration: schema '{}' — {}", schema, e.getMessage());
            }
        }
    }
}
