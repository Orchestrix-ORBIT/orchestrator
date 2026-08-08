package com.example.core_api.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// Java Record — an immutable data carrier introduced in Java 16.
// The compiler auto-generates: constructor, getters, equals, hashCode, toString.
// Perfect for DTOs since they're just data containers — no behavior needed.
//
// This is the body of:  POST /api/auth/register
public record RegisterRequest(

        // @Email     → rejects strings that aren't valid email format (e.g. "notanemail")
        // @NotBlank  → rejects null or empty/whitespace-only strings
        // These run BEFORE your controller code executes.
        // If validation fails → Spring returns 400 Bad Request automatically.
        @NotBlank(message = "Email is required")
        @Email(message = "Must be a valid email address")
        String email,

        // @Size → enforces minimum password length at the API layer
        // The actual password is hashed before it ever touches the DB.
        @NotBlank(message = "Password is required")
        @Size(min = 8, message = "Password must be at least 8 characters")
        String password,

        // Display name is optional — users can set it later.
        String displayName
) {}
