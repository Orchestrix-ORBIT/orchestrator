package com.example.core_api.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

// This is the body of:  POST /api/auth/login
//
// Simpler than RegisterRequest — login only needs email + password.
// No display name, no password length check (that was enforced on registration).
public record LoginRequest(

        @NotBlank(message = "Email is required")
        @Email(message = "Must be a valid email address")
        String email,

        @NotBlank(message = "Password is required")
        String password
) {}
