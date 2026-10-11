package com.example.core_api.multitenancy;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import org.springframework.jdbc.core.JdbcTemplate;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

// This filter intercepts EVERY incoming HTTP request before it reaches the controller.
// It reads the X-Tenant-ID header, and stores the corresponding schema name
// in TenantContext so Hibernate knows which schema to use for this request.
@Component
@Order(1) // Runs first among all filters — tenant must be set before any DB access
public class TenantFilter extends OncePerRequestFilter {
    // this onceperrequestfilter is a class of spring which extends httpservletfilter abstract class
    // it is used to intercept every incoming http request before it reaches the controller.

    private static final String TENANT_HEADER = "X-Tenant-ID";
    private static final long CACHE_MS = 60_000;

    // Only registered, ACTIVE organizations may be used. Without this check an unknown
    // X-Tenant-ID made Postgres fall back to the public schema (search_path "org_x, public"),
    // so e.g. a registration for a non-existent org was written into public.users.
    private final JdbcTemplate jdbc;
    private record CachedStatus(String status, long expiresAt) {}
    private final Map<String, CachedStatus> statusCache = new ConcurrentHashMap<>();

    public TenantFilter(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Status of the tenant owning this schema ("ACTIVE", "SUSPENDED", ...) or null if the schema does not exist. */
    private String tenantStatus(String schemaName) {
        CachedStatus cached = statusCache.get(schemaName);
        if (cached != null && cached.expiresAt() > System.currentTimeMillis()) return cached.status();
        List<String> rows = jdbc.queryForList(
                "SELECT status FROM public.tenants WHERE schema_name = ?", String.class, schemaName);
        String status;
        if (!rows.isEmpty()) {
            status = rows.get(0);                       // registered organization: honour its status
        } else {
            // Not in the registry: allow only if the schema really exists (legacy / directly
            // provisioned schemas). A non-existent schema is what made queries fall back to public.
            Integer exists = jdbc.queryForObject(
                    "SELECT count(*) FROM information_schema.schemata WHERE schema_name = ?", Integer.class, schemaName);
            status = exists != null && exists > 0 ? "ACTIVE" : null;
        }
        statusCache.put(schemaName, new CachedStatus(status, System.currentTimeMillis() + CACHE_MS));
        return status;
    }

    /** Forget the cached status so a suspension/reactivation applies to the very next request. */
    public void evict(String schemaName) {
        statusCache.remove(schemaName);
    }

    private static boolean isExempt(HttpServletRequest request) {
        String path = request.getRequestURI();
        return "OPTIONS".equalsIgnoreCase(request.getMethod())           // CORS preflight
                || path.equals("/health") || path.equals("/error")
                // First-tenant bootstrap runs before any tenant exists (guarded by X-Bootstrap-Key / admin JWT)
                || ("POST".equalsIgnoreCase(request.getMethod()) && path.equals("/api/admin/tenants"));
    }

    private static void reject(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.getWriter().write("{\"status\":" + status + ",\"message\":\"" + message + "\"}");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String tenantId = request.getHeader(TENANT_HEADER);
            if (tenantId == null || tenantId.isBlank()) {
                tenantId = "myorg";
            }

            // Convert slug "acme" → schema "org_acme"
            String schemaName = "org_" + tenantId.toLowerCase().replace("-", "_");
            TenantContext.setCurrentTenant(schemaName);

            if (!isExempt(request)) {
                String status = tenantStatus(schemaName);
                if (status == null) {
                    reject(response, HttpServletResponse.SC_NOT_FOUND, "Unknown organization: " + tenantId.replaceAll("[^a-zA-Z0-9_-]", ""));
                    return;
                }
                if (!"ACTIVE".equalsIgnoreCase(status)) {
                    reject(response, HttpServletResponse.SC_FORBIDDEN, "This organization is " + status.toLowerCase() + ".");
                    return;
                }
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
