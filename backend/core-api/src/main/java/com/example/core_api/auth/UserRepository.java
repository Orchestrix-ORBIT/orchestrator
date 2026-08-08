package com.example.core_api.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

// @Repository → marks this as a Spring-managed data access component.
// Spring will automatically create an implementation of this interface at startup.
// You never write the implementation yourself — Spring Data JPA generates it.
//
// JpaRepository<User, UUID> means:
//   - User     → the Entity class this repository manages
//   - UUID     → the type of the primary key (matches User.id)
//
// By extending JpaRepository, you get these methods for FREE:
//   save(user)        → INSERT or UPDATE
//   findById(uuid)    → SELECT WHERE id = ?
//   findAll()         → SELECT all rows
//   delete(user)      → DELETE
//   existsById(uuid)  → SELECT count(*) WHERE id = ?
@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    // Spring reads "findByEmail" → auto-generates:
    //   SELECT * FROM users WHERE email = ?
    //
    // Returns Optional<User> instead of User because:
    //   - If a user with that email doesn't exist → Optional.empty() (no NullPointerException)
    //   - If found → Optional.of(user)
    // This forces the caller to handle both cases safely.
    //
    // Used in:
    //   - AuthService.login()    → find user by email to verify password
    //   - AuthService.register() → check if email is already taken
    //   - JwtAuthFilter          → load user from DB when validating a token
    Optional<User> findByEmail(String email);

    // Spring auto-generates:
    //   SELECT count(*) > 0 FROM users WHERE email = ?
    //
    // Used in AuthService.register() to quickly check if an email is taken
    // without loading the full User object from DB.
    boolean existsByEmail(String email);
}