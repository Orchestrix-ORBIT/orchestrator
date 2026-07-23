package com.example.core_api.multitenancy;
// Thread assigning class to a tenant 
public class TenantContext {

    private static final ThreadLocal<String> CURRENT_TENANT = new InheritableThreadLocal<>(); //A threadlocal variable that stores the current tenant id for the current thread. This is used to switch between different tenants

    public static String getCurrentTenant() {
        return CURRENT_TENANT.get();
    }

    public static void setCurrentTenant(String tenantId) {
        CURRENT_TENANT.set(tenantId);
    }

    public static void clear() {
        CURRENT_TENANT.remove();
    }
}

