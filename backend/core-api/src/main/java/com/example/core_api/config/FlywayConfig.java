package com.example.core_api.config;

import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;

// Because HibernateConfig defines a custom LocalContainerEntityManagerFactoryBean,
// Spring Boot's JPA auto-configuration backs off — and with it, the Flyway auto-configuration
// also stops running automatically. We define Flyway explicitly here so that:
//   1. We have a Flyway bean available in the Spring context
//   2. HibernateConfig can inject it as a dependency to guarantee ordering
//   3. Migrations run BEFORE Hibernate validates the schema
@Configuration
public class FlywayConfig {

    // These read from application.yml → spring.flyway.*
    @Value("${spring.flyway.locations}")
    private String locations;

    @Value("${spring.flyway.schemas}")
    private String schemas;

    @Bean
    public Flyway flyway(DataSource dataSource) {
        Flyway flyway = Flyway.configure()
                .dataSource(dataSource)
                .locations(locations)           // classpath:db/migration/public
                .schemas(schemas)               // public
                .baselineOnMigrate(true)        // safe for existing databases
                .load();

        // Run migrations now — this creates public.tenants before Hibernate validates
        flyway.migrate();

        return flyway;
    }
}
