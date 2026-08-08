package com.example.core_api.config;

import com.example.core_api.auth.AuthService;
import com.example.core_api.auth.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

// OncePerRequestFilter → Spring guarantees doFilterInternal() runs exactly once per request.
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final AuthService authService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        // 1. Read the Authorization header. Skip filter if missing or not a Bearer token.
        final String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        // 2. Strip "Bearer " prefix to get the raw JWT string.
        final String token = authHeader.substring(7);

        // 3. Extract the user's email from the token payload (no DB call yet).
        final String email = jwtService.extractEmail(token);

        // 4. Only proceed if we have an email AND the request isn't already authenticated.
        if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {

            // 5. Load the User from DB — needed to verify the token against a real user.
            UserDetails userDetails = authService.loadUserByUsername(email);

            // 6. Validate: check signature, expiry, and that email matches the loaded user.
            if (jwtService.isTokenValid(token, userDetails)) {

                // 7. Build the authentication object with the user's authorities (roles).
                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(
                                userDetails,
                                null,                          // credentials null — already verified
                                userDetails.getAuthorities()
                        );

                // 8. Attach request details (IP, session) to the authentication object.
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                // 9. Place the authenticated user into SecurityContext.
                //    From this point, Spring Security considers this request authenticated.
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }

        // 10. Pass the request to the next filter in the chain.
        filterChain.doFilter(request, response);
    }
}
