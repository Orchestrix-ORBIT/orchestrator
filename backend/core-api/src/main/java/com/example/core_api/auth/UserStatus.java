package com.example.core_api.auth;

// Represents whether a user account is active or not.
// Stored as a string in the users.status column (VARCHAR).
public enum UserStatus {

    ACTIVE,     // Normal — user can log in
    INACTIVE,   // Account deactivated by admin
    SUSPENDED,  // Account suspended (soft-deleted from team)
    BANNED      // Permanently blocked
}
