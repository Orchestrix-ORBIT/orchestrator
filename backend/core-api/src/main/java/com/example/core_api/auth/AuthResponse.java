package com.example.core_api.auth;

// This is what the server sends BACK after a successful register or login.
//
// Response body example:
// {
//   "token": "eyJhbGciOiJIUzI1NiJ9...",
//   "email": "john@lab.com",
//   "role":  "ROLE_MEMBER"
// }
//
// Notice: NO password hash, NO internal IDs, NO timestamps.
// We only expose what the frontend actually needs:
//   - token  → stored by the client, sent on every future request
//   - email  → so the frontend can display "Logged in as john@lab.com"
//   - role   → so the frontend can show/hide admin features
public record AuthResponse(
        String token,
        String email,
        String role
) {}
