package com.example.realtime_service.multitenancy;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationContext;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MultiTenantConnectionProviderImplTest {

    @Mock private ApplicationContext applicationContext;
    @Mock private DataSource dataSource;
    @Mock private Connection connection;

    private MultiTenantConnectionProviderImpl provider;

    @BeforeEach
    void setUp() {
        provider = new MultiTenantConnectionProviderImpl();
        provider.setApplicationContext(applicationContext);
    }

    @Test
    void getConnectionSelectsTenantSchema() throws SQLException {
        when(applicationContext.getBean(DataSource.class)).thenReturn(dataSource);
        when(dataSource.getConnection()).thenReturn(connection);

        assertThat(provider.getConnection("org_research_lab")).isSameAs(connection);

        verify(connection).setSchema("org_research_lab");
    }

    @Test
    void releaseConnectionRestoresPublicSchemaAndClosesConnection() throws SQLException {
        provider.releaseConnection("org_research_lab", connection);

        verify(connection).setSchema("public");
        verify(connection).close();
    }

    @Test
    void releaseConnectionStillClosesWhenSchemaResetFails() throws SQLException {
        doThrow(new SQLException("reset failed")).when(connection).setSchema("public");

        provider.releaseConnection("org_research_lab", connection);

        verify(connection).close();
    }

    @Test
    void getAnyConnectionFailsClearlyWithoutDataSource() {
        assertThatThrownBy(() -> provider.getAnyConnection())
                .isInstanceOf(SQLException.class)
                .hasMessageContaining("DataSource not yet initialized");
    }

    @Test
    void releaseAnyConnectionClosesConnection() throws SQLException {
        provider.releaseAnyConnection(connection);

        verify(connection).close();
        assertThat(provider.supportsAggressiveRelease()).isFalse();
    }
}
