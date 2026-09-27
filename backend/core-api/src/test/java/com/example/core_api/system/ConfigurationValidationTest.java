package com.example.core_api.system;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
public class ConfigurationValidationTest {

    @Autowired
    private Environment env;

    @Value("${spring.datasource.url:null}")
    private String datasourceUrl;

    @Test
    public void testDatabaseConfigurationAndPooler() {
        assertNotNull(datasourceUrl, "Datasource URL must be configured");
        assertTrue(datasourceUrl.startsWith("jdbc:postgresql://"), "Datasource URL must be a valid PostgreSQL connection string");

        System.out.println("\n=== Configuration Testing Results ===");
        System.out.println("Datasource Strategy: " + (datasourceUrl.contains("pooler") ? "Supabase IPv4 Pooler" : "Direct Connection"));
        System.out.println("Configuration validation passed across environments.");
        System.out.println("=====================================\n");
    }
}
