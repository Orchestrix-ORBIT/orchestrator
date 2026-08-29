package com.example.core_api.auth;

// Represents the role of a user within a tenant.
// These values are stored as plain strings in the users.role column (VARCHAR).
// Matches the comment in V1__create_users.sql: OWNER | ADMIN | MEMBER | GUEST
public enum UserRole {

    OWNER,   // The person who created the tenant — full control
    ADMIN,   // Institute/Lab admin — manages users and settings
    MEMBER,  // Regular researcher/team member — default role on registration
    GUEST,   // Read-only access, e.g. an external collaborator
    LEAD,    // Research Lead
    RESEARCHER, // Research Team Member
    ROLE_LEAD,
    ROLE_RESEARCHER,
    ROLE_ADMIN
}
