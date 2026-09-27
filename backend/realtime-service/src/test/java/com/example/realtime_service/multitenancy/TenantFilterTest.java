package com.example.realtime_service.multitenancy;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TenantFilterTest {

    private TenantFilter tenantFilter;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private FilterChain filterChain;

    @BeforeEach
    void setUp() {
        tenantFilter = new TenantFilter();
        TenantContext.clear();
    }

    @Test
    void doFilterInternal_withHeader_setsSchemaAndChainsRequest() throws Exception {
        when(request.getHeader("X-Tenant-ID")).thenReturn("mit-lab");

        doAnswer(invocation -> {
            assertThat(TenantContext.getCurrentTenant()).isEqualTo("org_mit_lab");
            return null;
        }).when(filterChain).doFilter(request, response);

        tenantFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain, times(1)).doFilter(request, response);
        assertThat(TenantContext.getCurrentTenant()).isNull(); // cleared in finally
    }

    @Test
    void doFilterInternal_withoutHeader_defaultsToOrgMyorg() throws Exception {
        when(request.getHeader("X-Tenant-ID")).thenReturn(null);

        doAnswer(invocation -> {
            assertThat(TenantContext.getCurrentTenant()).isEqualTo("org_myorg");
            return null;
        }).when(filterChain).doFilter(request, response);

        tenantFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain, times(1)).doFilter(request, response);
        assertThat(TenantContext.getCurrentTenant()).isNull();
    }

    @Test
    void doFilterInternal_withBlankHeader_defaultsToOrgMyorg() throws Exception {
        when(request.getHeader("X-Tenant-ID")).thenReturn("   ");

        doAnswer(invocation -> {
            assertThat(TenantContext.getCurrentTenant()).isEqualTo("org_myorg");
            return null;
        }).when(filterChain).doFilter(request, response);

        tenantFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain, times(1)).doFilter(request, response);
        assertThat(TenantContext.getCurrentTenant()).isNull();
    }

    @Test
    void doFilterInternal_whenChainThrows_clearsTenantContext() throws Exception {
        when(request.getHeader("X-Tenant-ID")).thenReturn("mit-lab");
        doAnswer(invocation -> {
            assertThat(TenantContext.getCurrentTenant()).isEqualTo("org_mit_lab");
            throw new jakarta.servlet.ServletException("downstream failed");
        }).when(filterChain).doFilter(request, response);

        assertThatThrownBy(() -> tenantFilter.doFilterInternal(request, response, filterChain))
                .isInstanceOf(jakarta.servlet.ServletException.class)
                .hasMessage("downstream failed");
        assertThat(TenantContext.getCurrentTenant()).isNull();
    }
}
