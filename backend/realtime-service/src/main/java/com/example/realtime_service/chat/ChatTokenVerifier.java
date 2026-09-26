package com.example.realtime_service.chat;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

@Component
public class ChatTokenVerifier {
    private final SecretKey signingKey;

    public ChatTokenVerifier(@Value("${jwt.secret}") String secret) {
        signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public Claims verifyBearer(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new IllegalArgumentException("Bearer token required");
        }
        Claims claims = Jwts.parser().verifyWith(signingKey).build()
                .parseSignedClaims(authorization.substring(7)).getPayload();
        String tenant = claims.get("tenant", String.class);
        if (claims.getSubject() == null || claims.getSubject().isBlank() || claims.getExpiration() == null
                || tenant == null || !tenant.matches("org_[a-z0-9_]+")) {
            throw new JwtException("Token is missing a valid subject or tenant");
        }
        return claims;
    }

    public String schemaFor(String tenantSlug) {
        if (tenantSlug == null || !tenantSlug.matches("[A-Za-z0-9_-]+")) {
            throw new IllegalArgumentException("Invalid tenant");
        }
        return "org_" + tenantSlug.toLowerCase(Locale.ROOT).replace('-', '_');
    }
}
