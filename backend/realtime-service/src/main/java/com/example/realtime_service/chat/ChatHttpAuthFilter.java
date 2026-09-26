package com.example.realtime_service.chat;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(2)
public class ChatHttpAuthFilter extends OncePerRequestFilter {
    private final ChatTokenVerifier verifier;

    public ChatHttpAuthFilter(ChatTokenVerifier verifier) {
        this.verifier = verifier;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/chat/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String tenant;
        try {
            tenant = verifier.verifyBearer(request.getHeader("Authorization"))
                    .get("tenant", String.class);
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
        chain.doFilter(request, response);
    }
}
