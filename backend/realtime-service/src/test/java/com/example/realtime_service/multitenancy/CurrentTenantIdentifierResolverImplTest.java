package com.example.realtime_service.multitenancy;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CurrentTenantIdentifierResolverImplTest {

    private final CurrentTenantIdentifierResolverImpl resolver = new CurrentTenantIdentifierResolverImpl();

    @AfterEach
    void clearTenant() {
        TenantContext.clear();
    }

    @Test
    void usesCurrentTenantWhenPresent() {
        TenantContext.setCurrentTenant("org_research_lab");

        assertThat(resolver.resolveCurrentTenantIdentifier()).isEqualTo("org_research_lab");
        assertThat(resolver.validateExistingCurrentSessions()).isTrue();
    }

    @Test
    void fallsBackToPublicWhenTenantIsMissingOrBlank() {
        assertThat(resolver.resolveCurrentTenantIdentifier()).isEqualTo("public");

        TenantContext.setCurrentTenant("   ");
        assertThat(resolver.resolveCurrentTenantIdentifier()).isEqualTo("public");
    }
}
