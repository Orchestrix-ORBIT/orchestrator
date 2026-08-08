package com.example.core_api.auth;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

// ─────────────────────────────────────────────────────────────────────────────
// @Entity → Tells Hibernate: "Each instance of this class = one row in a table"
// @Table  → Specifies which table. NO schema= here intentionally —
//           our multi-tenant infrastructure (SchemaMultiTenantConnectionProvider)
//           dynamically switches the schema per request using the X-Tenant-ID header.
//           So Hibernate will query whichever schema is active on the current thread.
// ─────────────────────────────────────────────────────────────────────────────
@Entity
@Table(name = "users")
@Data               // Lombok: generates getters, setters, equals, hashCode, toString
@Builder            // Lombok: enables User.builder().email("x@y.com").build()
@NoArgsConstructor  // Lombok: required by JPA — JPA needs a no-arg constructor to create instances via reflection
@AllArgsConstructor // Lombok: needed by @Builder to set all fields
public class User implements UserDetails {
    // ─────────────────────────────────────────────────────────────────────────
    // Why implements UserDetails?
    // Spring Security doesn't know what a "User" is in our app.
    // UserDetails is the contract/interface it understands.
    // By implementing it, we're telling Spring Security:
    //   "Here's how to get the username, password, roles, and status from our User."
    // ─────────────────────────────────────────────────────────────────────────

    @Id
    @GeneratedValue(strategy = GenerationType.UUID) // PostgreSQL generates a UUID automatically
    private UUID id;

    // Maps to: email VARCHAR(320) NOT NULL UNIQUE
    @Column(nullable = false, unique = true, length = 320)
    private String email;

    // Maps to: display_name VARCHAR(255)
    @Column(name = "display_name", length = 255)
    private String displayName;

    // Maps to: password_hash VARCHAR(255) NOT NULL
    // IMPORTANT: This NEVER stores a plain-text password.
    // AuthService will always BCrypt-hash the password before saving.
    // Column is named "password_hash" in the DB, "passwordHash" in Java — @Column bridges the gap.
    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    // Maps to: role VARCHAR(50)
    // @Enumerated(EnumType.STRING) → stores "MEMBER", "ADMIN" etc. as strings, NOT as 0,1,2 numbers.
    // EnumType.STRING is safer — if you reorder the enum, the DB values stay correct.
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    @Builder.Default
    private UserRole role = UserRole.MEMBER; // Default role for new sign-ups

    // Maps to: status VARCHAR(50)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    @Builder.Default
    private UserStatus status = UserStatus.ACTIVE;

    // Maps to: email_verified BOOLEAN
    @Column(name = "email_verified", nullable = false)
    @Builder.Default
    private boolean emailVerified = false;

    // Maps to: last_login_at TIMESTAMPTZ
    @Column(name = "last_login_at")
    private OffsetDateTime lastLoginAt;

    // @CreationTimestamp → Hibernate sets this automatically when the row is first inserted
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    // @UpdateTimestamp → Hibernate updates this automatically on every save()
    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;


    // ═════════════════════════════════════════════════════════════════════════
    // UserDetails interface methods — Spring Security calls these
    // ═════════════════════════════════════════════════════════════════════════

    // getAuthorities() → returns the roles/permissions of this user.
    // Spring Security uses this to check @PreAuthorize("hasRole('ADMIN')") etc.
    // "ROLE_" prefix is a Spring Security convention for role-based authorities.
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    // getPassword() → Spring Security calls this to compare against the submitted password.
    // We return passwordHash — BCrypt will handle the comparison, not plain-text equality.
    @Override
    public String getPassword() {
        return passwordHash;
    }

    // getUsername() → Spring Security's concept of "username" is our email address.
    @Override
    public String getUsername() {
        return email;
    }

    // isAccountNonExpired() → is the account still valid (not expired)?
    // We don't implement expiry logic, so always true.
    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    // isAccountNonLocked() → is the account NOT locked/banned?
    // We check our status field — BANNED users cannot log in.
    @Override
    public boolean isAccountNonLocked() {
        return status != UserStatus.BANNED;
    }

    // isCredentialsNonExpired() → have the credentials (password) expired?
    // We don't implement password expiry, so always true.
    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    // isEnabled() → is the account allowed to authenticate at all?
    // Only ACTIVE users can log in — INACTIVE and BANNED are blocked here.
    @Override
    public boolean isEnabled() {
        return status == UserStatus.ACTIVE;
    }
}
