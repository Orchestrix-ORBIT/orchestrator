package com.example.core_api.tenant;

import com.example.core_api.auth.User;
import com.example.core_api.multitenancy.TenantContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

// Two admin levels:
//  - Platform admin: an ADMIN/OWNER of the platform organization (platform.tenant-slug).
//    Manages organizations (create, list, suspend) but never reads another organization's
//    research data — every data endpoint stays scoped to the caller's own schema.
//  - Organization admin: an ADMIN/OWNER of any other organization. Manages only its own users.
@Component
public class PlatformAccess {

    @Value("${platform.tenant-slug:platform}")
    private String platformSlug;

    public String platformSchema() {
        return "org_" + platformSlug.toLowerCase().replace('-', '_');
    }

    public static boolean isAdmin(User user) {
        return user != null && user.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_OWNER"));
    }

    /** True when the caller is an admin signed in to the platform organization. */
    public boolean isPlatformAdmin(User user) {
        return isAdmin(user) && platformSchema().equals(TenantContext.getCurrentTenant());
    }

    public void requirePlatformAdmin(User user) {
        if (!isPlatformAdmin(user)) {
            throw new AccessDeniedException("Only the platform administrator can manage organizations.");
        }
    }
}
