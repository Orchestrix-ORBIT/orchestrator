package com.example.core_api.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

// @Service → tells Spring this is a business-logic component.
// Spring creates one instance of this and shares it across the app (singleton).
@Service
public class JwtService {

    // @Value → Spring reads this from application.yml → jwt.secret
    // which itself reads from the .env → JWT_SECRET
    // So the actual secret key never lives in source code.
    @Value("${jwt.secret}")
    private String secretKey;

    // How long the token lives, in milliseconds.
    // Default: 86400000ms = 24 hours (set in application.yml)
    @Value("${jwt.expiration-ms}")
    private long expirationMs;


    // ═══════════════════════════════════════════════════════════
    // PUBLIC API — these 3 methods are what other classes call
    // ═══════════════════════════════════════════════════════════

    // Called by AuthService after a successful login or register.
    // Builds and returns a signed JWT string for the given user.
    public String generateToken(UserDetails userDetails) {
        // Extra claims to embed in the payload beyond the standard ones.
        // We add the user's role so the frontend can use it (e.g., show/hide admin UI).
        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("role", userDetails.getAuthorities()
                .iterator().next().getAuthority()); // e.g. "ROLE_MEMBER"

        return buildToken(extraClaims, userDetails);
    }

    // Called by JwtAuthFilter on every incoming request.
    // Extracts the email (subject) from the token so we can load the user from DB.
    public String extractEmail(String token) {
        // Claims::getSubject is a method reference — it's equivalent to: claims -> claims.getSubject()
        // getSubject() returns the "sub" field we set when building the token.
        return extractClaim(token, Claims::getSubject);
    }

    // Called by JwtAuthFilter after loading the user from DB.
    // Returns true only if:
    //   1. The token's subject (email) matches this user's email, AND
    //   2. The token is not expired
    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String emailInToken = extractEmail(token);
        return emailInToken.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }


    // ═══════════════════════════════════════════════════════════
    // PRIVATE HELPERS — internal implementation details
    // ═══════════════════════════════════════════════════════════

    // Builds the actual JWT string.
    // This is where the token structure is assembled and signed.
    private String buildToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        long now = System.currentTimeMillis();

        return Jwts.builder()
                // Embed any extra claims (e.g., role) in the payload
                .claims(extraClaims)
                // "sub" claim — the subject (who this token identifies)
                .subject(userDetails.getUsername())         // stores the email
                // "iat" claim — issued at (when the token was created)
                .issuedAt(new Date(now))
                // "exp" claim — expiration (when the token stops being valid)
                .expiration(new Date(now + expirationMs))
                // Sign the token with our secret key using HMAC-SHA256
                // Without this signature, anyone could forge a token
                .signWith(getSigningKey())
                // Assemble everything into the final "xxxxx.yyyyy.zzzzz" string
                .compact();
    }

    // Generic helper to extract ANY single claim from a token.
    // Uses a Function<Claims, T> so callers can pick which claim they want.
    //
    // Example:  extractClaim(token, Claims::getSubject)  → returns the email
    // Example:  extractClaim(token, Claims::getExpiration) → returns the expiry Date
    private <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    // Parses and verifies the JWT, then returns all its claims (payload).
    // If the signature is invalid or the token is malformed → jjwt throws an exception.
    // That exception bubbles up to JwtAuthFilter which then rejects the request.
    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                // Tell the parser which key to use for signature verification
                .verifyWith(getSigningKey())
                .build()
                // Parse the token — this is where signature validation happens
                .parseSignedClaims(token)
                // Get the payload (the claims object)
                .getPayload();
    }

    // Checks if the token's "exp" claim is before the current time.
    private boolean isTokenExpired(String token) {
        return extractClaim(token, Claims::getExpiration).before(new Date());
    }

    // Converts the raw secret string from .env into a cryptographic SecretKey object.
    // HMAC-SHA256 requires the key to be at least 256 bits (32 bytes).
    // Keys.hmacShaKeyFor() handles this conversion safely.
    private SecretKey getSigningKey() {
        byte[] keyBytes = secretKey.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
