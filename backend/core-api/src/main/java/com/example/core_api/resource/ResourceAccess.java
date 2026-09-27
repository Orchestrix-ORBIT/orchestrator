package com.example.core_api.resource;

import com.example.core_api.auth.User;
import com.example.core_api.auth.UserRole;
import org.springframework.security.access.AccessDeniedException;

final class ResourceAccess {
    private ResourceAccess() {}

    static void requireManager(User user) {
        if (user == null || !(user.getRole() == UserRole.ADMIN || user.getRole() == UserRole.OWNER
                || user.getRole() == UserRole.ROLE_ADMIN || user.getRole() == UserRole.RESOURCE_MANAGER)) {
            throw new AccessDeniedException("Resource management requires an administrator or resource manager.");
        }
    }
}
