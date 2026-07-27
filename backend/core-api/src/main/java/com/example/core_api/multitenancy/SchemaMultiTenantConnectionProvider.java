package com.example.core_api.multitenancy;

import org.hibernate.engine.jdbc.connections.spi.MultiTenantConnectionProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

// This class is responsible for giving Hibernate the correct database connection
// for each request. It switches the PostgreSQL schema using SET search_path
// so Hibernate queries run against the correct tenant's tables.
@Component
public class SchemaMultiTenantConnectionProvider implements MultiTenantConnectionProvider<String> {

    @Autowired //AUtowired annotation does dependency injection meaning it injects the DataSource object into this class
    private DataSource dataSource; // The shared Hikari connection pool managed by Spring

    // Called when Hibernate needs any connection (not tenant-specific, e.g., startup validation)
    @Override
    public Connection getAnyConnection() throws SQLException {
        return dataSource.getConnection();
    }

    // Returns a non-tenant connection back to the pool
    @Override
    public void releaseAnyConnection(Connection connection) throws SQLException {
        connection.close();
    }

    // Called before every Hibernate query — switches schema to the current tenant's schema
    @Override
    public Connection getConnection(String tenantIdentifier) throws SQLException {
        Connection connection = dataSource.getConnection();
        // SET search_path tells PostgreSQL: "look for tables in org_acme first, then public"
        connection.createStatement()
                .execute("SET search_path TO " + tenantIdentifier + ", public");
        return connection;
    }

    // Called after Hibernate finishes the query — resets schema to public before returning to pool
    // IMPORTANT: without this reset, the next request borrowing this connection from the pool
    // could accidentally inherit the previous tenant's schema
    @Override
    public void releaseConnection(String tenantIdentifier, Connection connection) throws SQLException {
        connection.createStatement().execute("SET search_path TO public");
        connection.close();
    }

    @Override
    public boolean supportsAggressiveRelease() {
        return false;
    }

    @Override
    public boolean isUnwrappableAs(Class<?> unwrapType) {
        return false;
    }

    @Override
    public <T> T unwrap(Class<T> unwrapType) {
        throw new UnsupportedOperationException();
    }
}
