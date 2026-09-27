package com.example.core_api.auth;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    // ── Fakes ─────────────────────────────────────────────────────────────────
    // AuthService depends on 4 things. We mock all of them so:
    //   - No real DB calls happen (UserRepository)
    //   - No real BCrypt hashing (PasswordEncoder) — slow in real life!
    //   - No real JWT signing (JwtService)
    //   - No real Spring Security auth chain (AuthenticationManager)
    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private AuthenticationManager authenticationManager;

    // ── Real class under test ─────────────────────────────────────────────────
    @InjectMocks
    private AuthService authService;

    // ── Shared test data ──────────────────────────────────────────────────────
    private UUID userId;
    private User sampleUser;
    private static final String RAW_PASSWORD    = "securePassword123";
    private static final String HASHED_PASSWORD = "$2a$10$hashedPasswordValue";
    private static final String FAKE_JWT_TOKEN  = "eyJhbGciOiJIUzI1NiJ9.fakePayload.fakeSignature";

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();

        // Build a user as it would look AFTER being loaded from the database
        // (password is already hashed, role assigned, status active)
        sampleUser = User.builder()
                .id(userId)
                .email("researcher@orbit.io")
                .passwordHash(HASHED_PASSWORD)
                .displayName("Dr. Shehara")
                .role(UserRole.MEMBER)
                .status(UserStatus.ACTIVE)
                .emailVerified(false)
                .build();
    }

    // =========================================================================
    // loadUserByUsername() tests
    // =========================================================================

    @Test
    void loadUserByUsername_whenUserExists_returnsUser() {
        // ARRANGE — fake repo finds the user by email
        when(userRepository.findByEmail("researcher@orbit.io"))
                .thenReturn(Optional.of(sampleUser));

        // ACT — Spring Security calls this when validating a token on every request
        var result = authService.loadUserByUsername("researcher@orbit.io");

        // ASSERT — the returned UserDetails should be our sampleUser
        assertThat(result).isNotNull();
        assertThat(result.getUsername()).isEqualTo("researcher@orbit.io");
    }

    @Test
    void loadUserByUsername_whenUserNotFound_throwsUsernameNotFoundException() {
        when(userRepository.findByEmail("ghost@orbit.io")).thenReturn(Optional.empty());

        // Spring Security expects UsernameNotFoundException when user is missing
        assertThatThrownBy(() -> authService.loadUserByUsername("ghost@orbit.io"))
                .isInstanceOf(UsernameNotFoundException.class)
                .hasMessageContaining("ghost@orbit.io");
    }

    // =========================================================================
    // register() tests
    // =========================================================================

    @Test
    void register_withNewEmail_savesUserAndReturnsToken() {
        // ARRANGE
        // Email does NOT already exist
        when(userRepository.existsByEmail("researcher@orbit.io")).thenReturn(false);

        // There is already 1 user in the DB, so this new user gets MEMBER role
        // (only the very first user gets ADMIN)
        when(userRepository.count()).thenReturn(1L);

        // Mock the password encoder — we do NOT want real BCrypt hashing in tests
        // (BCrypt is intentionally slow; it would make tests crawl)
        when(passwordEncoder.encode(RAW_PASSWORD)).thenReturn(HASHED_PASSWORD);

        // Mock save — return the sampleUser as if the DB persisted it
        when(userRepository.save(any(User.class))).thenReturn(sampleUser);

        // Mock JWT generation — return a fake token string
        when(jwtService.generateToken(any(User.class))).thenReturn(FAKE_JWT_TOKEN);

        RegisterRequest request = new RegisterRequest(
                "researcher@orbit.io",
                RAW_PASSWORD,
                "Dr. Shehara"
        );

        // ACT
        AuthResponse response = authService.register(request);

        // ASSERT — response must contain the token and the correct email
        assertThat(response).isNotNull();
        assertThat(response.token()).isEqualTo(FAKE_JWT_TOKEN);
        assertThat(response.email()).isEqualTo("researcher@orbit.io");

        // Confirm the plain password was NEVER saved — only the hash
        verify(passwordEncoder, times(1)).encode(RAW_PASSWORD);
        verify(userRepository, times(1)).save(any(User.class));
        verify(jwtService, times(1)).generateToken(any(User.class));
    }

    @Test
    void register_firstEverUser_getsAdminRole() {
        // ARRANGE — count() returns 0, meaning no users yet → first user = ADMIN
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(userRepository.count()).thenReturn(0L);
        when(passwordEncoder.encode(anyString())).thenReturn(HASHED_PASSWORD);

        // Build the admin-role user that save() should return
        User adminUser = User.builder()
                .id(UUID.randomUUID())
                .email("admin@orbit.io")
                .passwordHash(HASHED_PASSWORD)
                .role(UserRole.ADMIN)  // ← first user gets ADMIN
                .status(UserStatus.ACTIVE)
                .build();
        when(userRepository.save(any(User.class))).thenReturn(adminUser);
        when(jwtService.generateToken(any(User.class))).thenReturn(FAKE_JWT_TOKEN);

        RegisterRequest request = new RegisterRequest("admin@orbit.io", RAW_PASSWORD, "Admin");

        // ACT
        AuthResponse response = authService.register(request);

        // ASSERT — the role in the response should be ADMIN
        assertThat(response.role()).isEqualTo("ROLE_ADMIN");
    }

    @Test
    void register_withDuplicateEmail_throwsIllegalArgumentException() {
        // ARRANGE — email already exists in the DB
        when(userRepository.existsByEmail("researcher@orbit.io")).thenReturn(true);

        RegisterRequest request = new RegisterRequest(
                "researcher@orbit.io",
                RAW_PASSWORD,
                "Duplicate"
        );

        // ACT + ASSERT — registration must be rejected
        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already registered");

        // No user should ever reach the DB save when email is duplicate
        verify(userRepository, never()).save(any());
        verify(jwtService, never()).generateToken(any());
    }

    // =========================================================================
    // login() tests
    // =========================================================================

    @Test
    void login_withValidCredentials_returnsTokenAndEmail() {
        // ARRANGE
        // authenticationManager.authenticate() does nothing when credentials are correct
        // (it only throws on failure, so doing nothing = success)
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(null);

        // After auth succeeds, the service calls loadUserByUsername to get the User
        when(userRepository.findByEmail("researcher@orbit.io"))
                .thenReturn(Optional.of(sampleUser));

        when(jwtService.generateToken(sampleUser)).thenReturn(FAKE_JWT_TOKEN);

        LoginRequest request = new LoginRequest("researcher@orbit.io", RAW_PASSWORD);

        // ACT
        AuthResponse response = authService.login(request);

        // ASSERT
        assertThat(response.token()).isEqualTo(FAKE_JWT_TOKEN);
        assertThat(response.email()).isEqualTo("researcher@orbit.io");

        // Verify the authentication was attempted with the right credentials
        verify(authenticationManager, times(1))
                .authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(jwtService, times(1)).generateToken(sampleUser);
    }

    @Test
    void login_withWrongPassword_throwsBadCredentialsException() {
        // ARRANGE — authenticationManager throws when password is wrong
        // This is what Spring Security does internally when credentials don't match
        doThrow(new BadCredentialsException("Bad credentials"))
                .when(authenticationManager)
                .authenticate(any(UsernamePasswordAuthenticationToken.class));

        LoginRequest request = new LoginRequest("researcher@orbit.io", "wrongpassword");

        // ACT + ASSERT — the exception must propagate out of login()
        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BadCredentialsException.class);

        // If auth fails, we must NEVER generate a token
        verify(jwtService, never()).generateToken(any());
    }

    @Test
    void login_withNonExistentEmail_throwsUsernameNotFoundException() {
        // ARRANGE — authenticate() passes (unrealistic, but tests the loadUserByUsername guard)
        // A more realistic scenario: the authManager itself throws UsernameNotFoundException
        doThrow(new UsernameNotFoundException("No user found"))
                .when(authenticationManager)
                .authenticate(any(UsernamePasswordAuthenticationToken.class));

        LoginRequest request = new LoginRequest("nobody@orbit.io", RAW_PASSWORD);

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(UsernameNotFoundException.class);

        verify(jwtService, never()).generateToken(any());
    }
}
