package com.example.core_api.multitenancy;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

// This filter intercepts EVERY incoming HTTP request before it reaches the controller.
// It reads the X-Tenant-ID header, and stores the corresponding schema name
// in TenantContext so Hibernate knows which schema to use for this request.
@Component
@Order(1) // Runs first among all filters — tenant must be set before any DB access
public class TenantFilter extends OncePerRequestFilter {
    // this onceperrequestfilter is a class of spring which extends httpservletfilter abstract class
    // it is used to intercept every incoming http request before it reaches the controller.

    private static final String TENANT_HEADER = "X-Tenant-ID";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String tenantId = request.getHeader(TENANT_HEADER);

            if (tenantId != null && !tenantId.isBlank()) {
                // Convert slug "acme" → schema "org_acme" slug means unique identifier of the tenant
                TenantContext.setCurrentTenant("org_" + tenantId.toLowerCase());
            }

            // Pass the request along the filter chain to the next filter / controller
            filterChain.doFilter(request, response);

        } finally {
            // CRITICAL: Always clear after the request finishes.
            // Thread pool threads are reused — not clearing here would leak
            // one tenant's context into the next request on the same thread.
            TenantContext.clear();
        }
    }
}
