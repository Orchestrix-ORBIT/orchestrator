package com.example.core_api.multitenancy;

import org.hibernate.engine.jdbc.connections.spi.MultiTenantConnectionProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.Collections;
import java.util.Map;
import java.util.WeakHashMap;

// This class is responsible for giving Hibernate the correct database connection
// for each request. It switches the PostgreSQL schema using SET search_path
// so Hibernate queries run against the correct tenant's tables.
@Component
public class SchemaMultiTenantConnectionProvider implements MultiTenantConnectionProvider<String> {

    @Autowired //AUtowired annotation does dependency injection meaning it injects the DataSource object into this class
    private DataSource dataSource; // The shared Hikari connection pool managed by Spring

    // Called when Hibernate needs any connection (not tenant-specific, e.g., startup validation)
    // Last search_path set on each physical connection. Pooled connections are reused, so we
    // only send SET search_path when a borrow needs a different schema than the connection
    // already has. Every borrow still gets the correct path; this just skips redundant
    // round trips, which cost ~0.3-1s each against a remote database.
    private final Map<Object, String> currentPath = Collections.synchronizedMap(new WeakHashMap<>());

    private Connection withSearchPath(Connection connection, String path) throws SQLException {
        Object physical;
        try {
            physical = connection.unwrap(Connection.class); // Hikari returns the physical connection
        } catch (SQLException notPostgres) {
            physical = null;
        }
        if (physical == null || !path.equals(currentPath.get(physical))) {
            try (var statement = connection.createStatement()) {
                statement.execute("SET search_path TO " + path);
            }
            if (physical != null) currentPath.put(physical, path);
        }
        return connection;
    }

    @Override
    public Connection getAnyConnection() throws SQLException {
        return withSearchPath(dataSource.getConnection(), "public");
    }

    // Returns a non-tenant connection back to the pool
    @Override
    public void releaseAnyConnection(Connection connection) throws SQLException {
        connection.close();
    }

    // Called before every Hibernate query — switches schema to the current tenant's schema
    @Override
    public Connection getConnection(String tenantIdentifier) throws SQLException {
        // SET search_path tells PostgreSQL: "look for tables in org_acme first, then public"
        // IMPORTANT: The schema name MUST be double-quoted (\"...\") when passed as a SQL identifier.
        // Without quotes, names like org_test-org fail with: syntax error at or near "-"
        // Double-quoting makes any character safe as an identifier in PostgreSQL.
        return withSearchPath(dataSource.getConnection(), "\"" + tenantIdentifier + "\", public");
    }

    // Called after Hibernate finishes the query. Tenant isolation does not depend on a reset here:
    // every getConnection/getAnyConnection call makes sure the borrowed connection has the
    // requested search_path before returning it.
    @Override
    public void releaseConnection(String tenantIdentifier, Connection connection) throws SQLException {
        // No reset here: the next borrow sets whatever path it needs (see withSearchPath).
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
