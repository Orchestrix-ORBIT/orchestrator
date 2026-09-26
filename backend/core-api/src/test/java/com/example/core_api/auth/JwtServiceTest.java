package com.example.core_api.auth;

import com.example.core_api.multitenancy.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// ─────────────────────────────────────────────────────────────────────────────
// JwtService is DIFFERENT from the other service tests.
//
// JwtService has NO dependencies injected — it only uses:
//   - A secret key string (@Value from config)
//   - An expiration time (@Value from config)
//   - The jjwt library (a pure Java library, no DB, no Spring beans)
//
// So we do NOT need @ExtendWith(MockitoExtension.class) or any @Mock here.
// Instead, we create a REAL JwtService manually and set its fields directly.
// This makes it a pure, fast, self-contained unit test.
// ─────────────────────────────────────────────────────────────────────────────
class JwtServiceTest {

    // Real instance — no mocks needed because JwtService has no dependencies
    private JwtService jwtService;

    // The User object whose token we'll generate and validate
    private UserDetails sampleUser;

    @BeforeEach
    void setUp() throws Exception {
        TenantContext.setCurrentTenant("org_orbit_lab");
        jwtService = new JwtService();

        // Inject the secret key directly via reflection
        // (In production, Spring reads this from application.yml / .env)
        // The key must be at least 32 characters for HMAC-SHA256 (256 bits)
        var secretField = JwtService.class.getDeclaredField("secretKey");
        secretField.setAccessible(true);
        secretField.set(jwtService, "ThisIsASecretKeyForTestingPurposesOnly!!");

        // Set expiration to 1 hour (3,600,000 ms) — plenty of time for a test
        var expirationField = JwtService.class.getDeclaredField("expirationMs");
        expirationField.setAccessible(true);
        expirationField.set(jwtService, 3_600_000L);

        // Build a real User (implements UserDetails) to use in token generation
        sampleUser = User.builder()
                .id(UUID.randomUUID())
                .email("researcher@orbit.io")
                .passwordHash("hashed")
                .role(UserRole.MEMBER)
                .status(UserStatus.ACTIVE)
                .build();
    }

    @AfterEach
    void clearTenant() {
        TenantContext.clear();
    }

    // =========================================================================
    // generateToken() tests
    // =========================================================================

    @Test
    void generateToken_returnsNonNullToken() {
        // ACT — generate a real signed JWT string
        String token = jwtService.generateToken(sampleUser);

        // ASSERT — a JWT always has exactly 3 parts separated by '.'
        assertThat(token).isNotNull();
        assertThat(token.split("\\.")).hasSize(3); // header.payload.signature
    }

    @Test
    void generateToken_differentUsersGetDifferentTokens() {
        // Tokens are user-specific — two different users must get different tokens
        UserDetails anotherUser = User.builder()
                .id(UUID.randomUUID())
                .email("admin@orbit.io")
                .passwordHash("hashed")
                .role(UserRole.ADMIN)
                .status(UserStatus.ACTIVE)
                .build();

        String token1 = jwtService.generateToken(sampleUser);
        String token2 = jwtService.generateToken(anotherUser);

        assertThat(token1).isNotEqualTo(token2);
    }

    // =========================================================================
    // extractEmail() tests
    // =========================================================================

    @Test
    void extractEmail_returnsCorrectEmailFromToken() {
        // ARRANGE — generate a real token for our user
        String token = jwtService.generateToken(sampleUser);

        // ACT — extract the "sub" claim (which holds the email)
        String extractedEmail = jwtService.extractEmail(token);

        // ASSERT — must match the email used during generation
        assertThat(extractedEmail).isEqualTo("researcher@orbit.io");
    }

    // =========================================================================
    // isTokenValid() tests
    // =========================================================================

    @Test
    void isTokenValid_withCorrectUserAndFreshToken_returnsTrue() {
        // ARRANGE — generate a fresh token
        String token = jwtService.generateToken(sampleUser);

        // ACT + ASSERT — token is valid for the user it was created for
        assertThat(jwtService.isTokenValid(token, sampleUser)).isTrue();
    }

    @Test
    void isTokenValid_withDifferentUser_returnsFalse() {
        // ARRANGE — token generated for user1, but validated against user2
        String tokenForUser1 = jwtService.generateToken(sampleUser);

        UserDetails differentUser = User.builder()
                .id(UUID.randomUUID())
                .email("intruder@orbit.io") // different email
                .passwordHash("hashed")
                .role(UserRole.MEMBER)
                .status(UserStatus.ACTIVE)
                .build();

        // ACT + ASSERT — token should NOT be valid for a different user
        // (email in token != differentUser.getUsername())
        assertThat(jwtService.isTokenValid(tokenForUser1, differentUser)).isFalse();
    }

    @Test
    void isTokenValid_inDifferentTenant_returnsFalse() {
        String token = jwtService.generateToken(sampleUser);
        TenantContext.setCurrentTenant("org_other_lab");
        assertThat(jwtService.isTokenValid(token, sampleUser)).isFalse();
    }

    @Test
    void isTokenValid_withExpiredToken_returnsFalse() throws Exception {
        // ARRANGE — set expiration to 1ms (immediately expired)
        var expirationField = JwtService.class.getDeclaredField("expirationMs");
        expirationField.setAccessible(true);
        expirationField.set(jwtService, 1L); // 1 millisecond

        String token = jwtService.generateToken(sampleUser);

        // Give the token time to expire
        Thread.sleep(20);

        // ACT + ASSERT — isTokenExpired() check inside isTokenValid() must catch this
        // Note: jjwt will throw ExpiredJwtException when parsing an expired token,
        // which propagates through isTokenValid(), so we assert on the exception here.
        assertThatThrownBy(() -> jwtService.isTokenValid(token, sampleUser))
                .isInstanceOf(io.jsonwebtoken.ExpiredJwtException.class);
    }

    @Test
    void isTokenValid_withTamperedToken_throwsSecurityException() {
        // ARRANGE — generate a real token, then tamper with the signature
        String validToken = jwtService.generateToken(sampleUser);

        // Split into [header, payload, signature] and corrupt the signature
        String[] parts = validToken.split("\\.");
        String tamperedToken = parts[0] + "." + parts[1] + ".invalidsignature";

        // ACT + ASSERT — jjwt must reject any token with an invalid signature
        // This protects against attackers forging their own tokens
        assertThatThrownBy(() -> jwtService.isTokenValid(tamperedToken, sampleUser))
                .isInstanceOf(io.jsonwebtoken.security.SecurityException.class);
    }
}
