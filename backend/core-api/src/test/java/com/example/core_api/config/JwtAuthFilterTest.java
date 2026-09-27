package com.example.core_api.config;

import com.example.core_api.auth.AuthService;
import com.example.core_api.auth.JwtService;
import io.jsonwebtoken.MalformedJwtException;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;

import java.io.IOException;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class JwtAuthFilterTest {
    private final JwtService jwtService = mock(JwtService.class);
    private final AuthService authService = mock(AuthService.class);
    private final JwtAuthFilter filter = new JwtAuthFilter(jwtService, authService);

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void missingBearerHeaderLeavesRequestUnauthenticated() throws ServletException, IOException {
        run(null);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verifyNoInteractions(jwtService, authService);
    }

    @Test
    void malformedBearerTokenLeavesRequestUnauthenticated() throws ServletException, IOException {
        when(jwtService.extractEmail("bad-token")).thenThrow(new MalformedJwtException("invalid"));
        run("Bearer bad-token");
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verifyNoInteractions(authService);
    }

    @Test
    void rejectedBearerTokenLeavesRequestUnauthenticated() throws ServletException, IOException {
        var user = new User("lead@example.test", "unused", List.of(new SimpleGrantedAuthority("ROLE_LEAD")));
        when(jwtService.extractEmail("rejected")).thenReturn(user.getUsername());
        when(authService.loadUserByUsername(user.getUsername())).thenReturn(user);
        when(jwtService.isTokenValid("rejected", user)).thenReturn(false);
        run("Bearer rejected");
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void validBearerTokenProvidesItsRole() throws ServletException, IOException {
        var user = new User("lead@example.test", "unused", List.of(new SimpleGrantedAuthority("ROLE_LEAD")));
        when(jwtService.extractEmail("valid")).thenReturn(user.getUsername());
        when(authService.loadUserByUsername(user.getUsername())).thenReturn(user);
        when(jwtService.isTokenValid("valid", user)).thenReturn(true);
        run("Bearer valid");
        assertThat(SecurityContextHolder.getContext().getAuthentication().getAuthorities())
                .extracting("authority").containsExactly("ROLE_LEAD");
    }

    private void run(String authorization) throws ServletException, IOException {
        var request = new MockHttpServletRequest("GET", "/api/projects");
        if (authorization != null) request.addHeader("Authorization", authorization);
        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());
    }
}
