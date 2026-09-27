package com.example.realtime_service.chat;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@Order(2)
public class ChatHttpAuthFilter extends OncePerRequestFilter {
    private static final Pattern HISTORY_PATH = Pattern.compile("^/api/chat/projects/([^/]+)/messages$");
    private final ChatTokenVerifier verifier;
    private final ChatProjectAccess projectAccess;

    public ChatHttpAuthFilter(ChatTokenVerifier verifier, ChatProjectAccess projectAccess) {
        this.verifier = verifier;
        this.projectAccess = projectAccess;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/chat/") || "OPTIONS".equalsIgnoreCase(request.getMethod());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String tenant;
        String email;
        try {
            var claims = verifier.verifyBearer(request.getHeader("Authorization"));
            tenant = claims.get("tenant", String.class);
            email = claims.getSubject();
        } catch (RuntimeException e) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        try {
            if (!tenant.equals(verifier.schemaFor(request.getHeader("X-Tenant-ID")))) {
                response.sendError(HttpServletResponse.SC_FORBIDDEN);
                return;
            }
        } catch (IllegalArgumentException e) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN);
            return;
        }
        Matcher path = HISTORY_PATH.matcher(request.getRequestURI());
        if (!path.matches()) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND);
            return;
        }
        UUID projectId;
        try {
            projectId = UUID.fromString(path.group(1));
        } catch (IllegalArgumentException e) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST);
            return;
        }
        if (!projectAccess.canAccess(tenant, email, projectId)) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN);
            return;
        }
        chain.doFilter(request, response);
    }
}
