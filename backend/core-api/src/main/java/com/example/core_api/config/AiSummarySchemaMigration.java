package com.example.core_api.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Migration runner to ensure the ai_summaries table has all necessary fields
 * across all tenant schemas.
 */
@Component
public class AiSummarySchemaMigration implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AiSummarySchemaMigration.class);
    private final JdbcTemplate jdbcTemplate;

    public AiSummarySchemaMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        List<String> schemas = jdbcTemplate.queryForList(
            "SELECT table_schema FROM information_schema.tables " +
            "WHERE table_name = 'ai_summaries' " +
            "AND table_schema NOT IN ('public', 'pg_catalog', 'information_schema')",
            String.class
        );

        if (schemas.isEmpty()) {
            schemas = List.of("org_myorg");
        }

        for (String schema : schemas) {
            try {
                jdbcTemplate.execute("ALTER TABLE \"" + schema + "\".ai_summaries ADD COLUMN IF NOT EXISTS topic VARCHAR(255)");
                jdbcTemplate.execute("ALTER TABLE \"" + schema + "\".ai_summaries ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'Pending Approval'");
                jdbcTemplate.execute("ALTER TABLE \"" + schema + "\".ai_summaries ADD COLUMN IF NOT EXISTS key_findings JSONB DEFAULT '[]'");
                jdbcTemplate.execute("ALTER TABLE \"" + schema + "\".ai_summaries ADD COLUMN IF NOT EXISTS confidence INT DEFAULT 100");
                jdbcTemplate.execute("ALTER TABLE \"" + schema + "\".ai_summaries ADD COLUMN IF NOT EXISTS model VARCHAR(100) DEFAULT 'LangChain Context Engine'");
                log.info("AiSummarySchemaMigration: ensured columns in schema '{}'.", schema);
            } catch (Exception e) {
                log.warn("AiSummarySchemaMigration: schema '{}' — {}", schema, e.getMessage());
            }
        }
    }
}
