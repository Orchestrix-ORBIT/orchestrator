package com.example.core_api.config;

import com.example.core_api.multitenancy.SchemaMultiTenantConnectionProvider;
import com.example.core_api.multitenancy.TenantIdentifierResolver;
import org.hibernate.cfg.AvailableSettings;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;

import javax.sql.DataSource;
import java.util.Properties;

// This class wires multi-tenancy into Spring JPA / Hibernate.
// Without this, Hibernate would always query the default "public" schema
// and never switch to the correct tenant schema per request.
@Configuration
@EnableTransactionManagement // Enables @Transactional annotation support across the app
public class HibernateConfig {

    @Autowired
    private SchemaMultiTenantConnectionProvider connectionProvider; // Provides schema-switched DB connections

    @Autowired
    private TenantIdentifierResolver tenantResolver; // Resolves which tenant is active for Hibernate

    @Bean
    public LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource dataSource) {
        HibernateJpaVendorAdapter adapter = new HibernateJpaVendorAdapter();
        LocalContainerEntityManagerFactoryBean factory = new LocalContainerEntityManagerFactoryBean();

        factory.setDataSource(dataSource);
        factory.setJpaVendorAdapter(adapter);
        // Tell Spring where to find JPA @Entity classes
        factory.setPackagesToScan("com.example.core_api");

        Properties props = new Properties();
        // Register the two multi-tenancy components with Hibernate
        props.put(AvailableSettings.MULTI_TENANT_CONNECTION_PROVIDER, connectionProvider);
        props.put(AvailableSettings.MULTI_TENANT_IDENTIFIER_RESOLVER, tenantResolver);
        // validate: Hibernate checks that entity fields match DB columns — never auto-creates/drops
        props.put(AvailableSettings.HBM2DDL_AUTO, "validate");
        props.put(AvailableSettings.DIALECT, "org.hibernate.dialect.PostgreSQLDialect");

        factory.setJpaProperties(props);
        return factory;
    }

    // Standard Spring transaction manager needed for @Transactional to work
    @Bean
    public PlatformTransactionManager transactionManager(
            LocalContainerEntityManagerFactoryBean entityManagerFactory) {
        return new JpaTransactionManager(entityManagerFactory.getObject());
    }
}
