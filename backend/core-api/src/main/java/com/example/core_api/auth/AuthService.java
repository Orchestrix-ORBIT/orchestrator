package com.example.core_api.auth;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

// @RequiredArgsConstructor (Lombok) — generates a constructor for all 'final' fields.
// Spring sees that constructor and automatically injects the matching beans.
// This is called "Constructor Injection" — the recommended way in Spring.
@Service
public class AuthService implements UserDetailsService {
    // ─────────────────────────────────────────────────────────────────────────
    // Why implement UserDetailsService?
    // Spring Security needs to know HOW to load a user when verifying credentials.
    // UserDetailsService has one method: loadUserByUsername(String username).
    // We implement it so Spring Security can find our User from the DB by email.
    // ─────────────────────────────────────────────────────────────────────────

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;     // BCryptPasswordEncoder bean (defined in SecurityConfig)
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager; // Spring Security bean (defined in SecurityConfig)

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            @Lazy AuthenticationManager authenticationManager
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
    }


    // ═══════════════════════════════════════════════════════════
    // UserDetailsService — Spring Security calls this internally
    // ═══════════════════════════════════════════════════════════

    // Spring Security calls this when it needs to load a user by their "username".
    // In our app, "username" = email address.
    // This is also called by JwtAuthFilter when validating tokens.
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "No user found with email: " + email
                ));
        // Our User class already implements UserDetails, so we return it directly.
    }


    // ═══════════════════════════════════════════════════════════
    // REGISTER — creates a new user account
    // ═══════════════════════════════════════════════════════════

    public AuthResponse register(RegisterRequest request) {

        // Step 1: Guard — check if this email is already registered.
        // We use existsByEmail() (not findByEmail) because we only need a boolean,
        // not the full User object. It generates a cheaper COUNT query.
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email is already registered: " + request.email());
        }

        // Step 2: Hash the password before ANYTHING touches the database.
        // passwordEncoder.encode() uses BCrypt:
        //   - Generates a random salt
        //   - Hashes: salt + password together
        //   - Returns a 60-char string like "$2a$10$randomsalt...hashedvalue"
        // The original password is NEVER stored anywhere.
        String hashedPassword = passwordEncoder.encode(request.password());

        UserRole role = userRepository.count() == 0 ? UserRole.ADMIN : UserRole.MEMBER;

        // Step 3: Build the User entity using the builder pattern (from Lombok @Builder).
        // Notice we store 'hashedPassword', not 'request.password()'.
        User user = User.builder()
                .email(request.email())
                .passwordHash(hashedPassword)
                .displayName(request.displayName())
                .role(role)                   // First registered user gets ADMIN, subsequent get MEMBER
                .status(UserStatus.ACTIVE)    // Account is immediately active
                .emailVerified(false)         // Email verification can be added later
                .build();

        // Step 4: Persist the user to the current tenant's schema.
        // Hibernate knows which schema to use from TenantContext (set by TenantFilter).
        userRepository.save(user);

        // Step 5: Generate a JWT for the newly created user.
        String token = jwtService.generateToken(user);

        // Step 6: Return only the safe fields — never expose the entity directly.
        return new AuthResponse(
                token,
                user.getEmail(),
                user.getAuthorities().iterator().next().getAuthority() // e.g. "ROLE_MEMBER"
        );
    }


    // ═══════════════════════════════════════════════════════════
    // LOGIN — verifies credentials and returns a token
    // ═══════════════════════════════════════════════════════════

    public AuthResponse login(LoginRequest request) {

        // Step 1: Delegate credential verification to Spring Security's AuthenticationManager.
        // Internally it does ALL of this in sequence:
        //   a) calls loadUserByUsername(email) → loads User from DB
        //   b) calls passwordEncoder.matches(request.password(), user.passwordHash)
        //   c) calls user.isEnabled(), user.isAccountNonLocked(), user.isAccountNonExpired()
        //
        // If any check fails → throws BadCredentialsException (login denied).
        // If all pass → authentication succeeds silently.
        //
        // UsernamePasswordAuthenticationToken is just a container for the credentials.
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.email(),    // principal
                        request.password()  // credentials (plain text — AuthenticationManager hashes and compares)
                )
        );

        // Step 2: If we reached here, credentials are valid. Load the full user object.
        // We call loadUserByUsername again to get the User entity for token generation.
        User user = (User) loadUserByUsername(request.email());

        // Step 3: Generate and return the token.
        String token = jwtService.generateToken(user);

        return new AuthResponse(
                token,
                user.getEmail(),
                user.getAuthorities().iterator().next().getAuthority()
        );
    }
}
