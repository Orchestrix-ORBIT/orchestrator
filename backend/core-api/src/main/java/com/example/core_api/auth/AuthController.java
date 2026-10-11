package com.example.core_api.auth;

import com.example.core_api.multitenancy.TenantContext;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final LoginAttemptService loginAttempts;
    private final JwtService jwtService;

    // TenantFilter (Order=1) sets TenantContext for the full request lifecycle.
    // No manual TenantContext management needed in any controller method.

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request
    ) {
        String tenant = TenantContext.getCurrentTenant();
        long minutes = loginAttempts.minutesLocked(tenant, request.email());
        if (minutes > 0) {
            throw new LockedException("Too many failed login attempts. This account is locked for "
                    + minutes + " more minute(s).");
        }
        try {
            AuthResponse response = authService.login(request);
            loginAttempts.recordSuccess(tenant, request.email());
            return ResponseEntity.ok(response);
        } catch (BadCredentialsException ex) {
            int remaining = loginAttempts.recordFailure(tenant, request.email());
            if (remaining == 0) {
                throw new LockedException("Too many failed login attempts. This account is locked for "
                        + LoginAttemptService.LOCK_DURATION.toMinutes() + " minutes.");
            }
            throw new BadCredentialsException("Invalid email or password. " + remaining
                    + " attempt(s) left before the account is locked.");
        }
    }

    // Revokes the caller's token so it can no longer be used, even before it expires.
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                jwtService.revoke(authHeader.substring(7));
            } catch (RuntimeException ignored) {
                // Malformed or expired tokens are already unusable.
            }
        }
        return ResponseEntity.noContent().build();
    }
}
