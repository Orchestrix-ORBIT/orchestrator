package com.example.core_api.multitenancy;

import org.hibernate.context.spi.CurrentTenantIdentifierResolver;
import org.springframework.stereotype.Component;


@Component //This annotation tells spring that this class is a component and should be managed by the spring container
public class TenantIdentifierResolver implements CurrentTenantIdentifierResolver<String> {

    private static final String DEFAULT_SCHEMA = "public"; //The default schema to use when no tenant is found

    @Override
    public String resolveCurrentTenantIdentifier() {
        String tenant = TenantContext.getCurrentTenant();
        return (tenant != null && !tenant.isBlank()) ? tenant : DEFAULT_SCHEMA;
    }
    // Used to say what tenant is running now to hibernation session for optimization
    @Override
    public boolean validateExistingCurrentSessions() {
        return true;
    }
}
