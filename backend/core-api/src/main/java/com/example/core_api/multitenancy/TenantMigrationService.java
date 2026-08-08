package com.example.core_api.multitenancy;

import lombok.RequiredArgsConstructor;
import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

//here the ultimate goal is to create a new schema when a new team comes up and run all the migration files inside the tenant folder


@Service //service annotation is used to mark this class as a service and should be managed by the spring container
@RequiredArgsConstructor //This annotation is used to create a constructor with all the final variables. final variables mean objects who are initialised once and cannot be changed
public class TenantMigrationService {

    @Value("${spring.datasource.url}") //This annotation is used to get the value from the application.properties file
    private String datasourceUrl;

    @Value("${spring.datasource.username}")
    private String datasourceUsername;

    @Value("${spring.datasource.password}")
    private String datasourcePassword;

    /**
     * Creates a new PostgreSQL schema and applies all tenant migrations.
     * Called once during tenant provisioning.
     */
    public void provisionTenantSchema(String schemaName) {
        try (Connection conn = DriverManager.getConnection(
                datasourceUrl, datasourceUsername, datasourcePassword)) {

            // 1. Create the schema
            conn.createStatement()
                .execute("CREATE SCHEMA IF NOT EXISTS " + schemaName);

            // Note: On Supabase, the 'postgres' role owns the schema and has full access.
            // A separate GRANT is not required.

        } catch (SQLException e) {
            throw new RuntimeException("Failed to create schema: " + schemaName, e);
        }

        // 3. Run Flyway migrations against the new schema
        Flyway flyway = Flyway.configure()
            .dataSource(datasourceUrl, datasourceUsername, datasourcePassword)
            .schemas(schemaName)
            .locations("classpath:db/tenant")   // ← Uses tenant template migrations
            .baselineOnMigrate(true)
            .load();

        flyway.migrate();
    }
}

// where these functions are called in core-api/src/main/java/com/example/core_api/service/TenantProvisionService.java
