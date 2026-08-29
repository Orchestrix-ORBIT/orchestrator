package com.example.core_api.auth;

// Represents the role of a user within a tenant.
// These values are stored as plain strings in the users.role column (VARCHAR).
// Matches the comment in V1__create_users.sql: OWNER | ADMIN | MEMBER | GUEST
public enum UserRole {

    OWNER,             // The person who created the tenant — full control
    ADMIN,             // Institute/Lab admin — manages tenants and roles
    LEAD,              // Research Lead / Team Supervisor — manages projects, tasks, chat
    MEMBER,            // Regular researcher/team member — default role on registration
    RESOURCE_MANAGER,  // Resource & equipment allocation manager
    GUEST              // Read-only access, e.g. an external collaborator
}
