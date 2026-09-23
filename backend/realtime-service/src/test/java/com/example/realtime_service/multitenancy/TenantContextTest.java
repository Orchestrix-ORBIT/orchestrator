package com.example.realtime_service.multitenancy;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TenantContextTest {

    @BeforeEach
    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void setCurrentTenant_and_getCurrentTenant_returnsSetTenant() {
        TenantContext.setCurrentTenant("org_testlab");

        assertThat(TenantContext.getCurrentTenant()).isEqualTo("org_testlab");
    }

    @Test
    void clear_resetsCurrentTenantToNull() {
        TenantContext.setCurrentTenant("org_testlab");
        assertThat(TenantContext.getCurrentTenant()).isEqualTo("org_testlab");

        TenantContext.clear();

        assertThat(TenantContext.getCurrentTenant()).isNull();
    }
}
