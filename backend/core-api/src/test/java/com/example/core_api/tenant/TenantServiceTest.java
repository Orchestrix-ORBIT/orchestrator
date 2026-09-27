package com.example.core_api.tenant;

import com.example.core_api.multitenancy.TenantMigrationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TenantServiceTest {

    @Mock private TenantRepository       tenantRepository;
    @Mock private TenantMigrationService tenantMigrationService;
    @InjectMocks private TenantService   tenantService;

    private UUID   tenantId;
    private Tenant sampleTenant;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        sampleTenant = Tenant.builder().id(tenantId).slug("research-lab").name("Research Lab Alpha")
                .schemaName("org_research_lab").status(TenantStatus.ACTIVE).build();
    }

    @Test
    void provisionTenant_withUniqueSlug_savesAndProvisionesSchema() {
        when(tenantRepository.existsBySlug("research-lab")).thenReturn(false);
        when(tenantRepository.save(any(Tenant.class))).thenReturn(sampleTenant);
        doNothing().when(tenantMigrationService).provisionTenantSchema(anyString());
        TenantProvisionRequest req = new TenantProvisionRequest();
        req.setSlug("research-lab"); req.setName("Research Lab Alpha");
        TenantResponse response = tenantService.provisionTenant(req);
        assertThat(response.getSlug()).isEqualTo("research-lab");
        assertThat(response.getStatus()).isEqualTo(TenantStatus.ACTIVE);
        verify(tenantRepository).save(any(Tenant.class));
        verify(tenantMigrationService).provisionTenantSchema("org_research_lab");
    }

    @Test
    void provisionTenant_withDuplicateSlug_throwsIllegalArgumentException() {
        when(tenantRepository.existsBySlug("research-lab")).thenReturn(true);
        TenantProvisionRequest req = new TenantProvisionRequest();
        req.setSlug("research-lab"); req.setName("Duplicate");
        assertThatThrownBy(() -> tenantService.provisionTenant(req))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("research-lab");
        verify(tenantRepository, never()).save(any());
        verify(tenantMigrationService, never()).provisionTenantSchema(anyString());
    }

    @Test
    void provisionTenant_derivesCorrectSchemaNameFromHyphenatedSlug() {
        Tenant t = Tenant.builder().id(UUID.randomUUID()).slug("my-lab-2").name("My Lab 2")
                .schemaName("org_my_lab_2").status(TenantStatus.ACTIVE).build();
        when(tenantRepository.existsBySlug("my-lab-2")).thenReturn(false);
        when(tenantRepository.save(any())).thenReturn(t);
        doNothing().when(tenantMigrationService).provisionTenantSchema(anyString());
        TenantProvisionRequest req = new TenantProvisionRequest();
        req.setSlug("my-lab-2"); req.setName("My Lab 2");
        tenantService.provisionTenant(req);
        verify(tenantMigrationService).provisionTenantSchema("org_my_lab_2");
    }

    @Test
    void getTenantBySlug_whenFound_returnsMappedResponse() {
        when(tenantRepository.findBySlug("research-lab")).thenReturn(Optional.of(sampleTenant));
        TenantResponse response = tenantService.getTenantBySlug("research-lab");
        assertThat(response.getSlug()).isEqualTo("research-lab");
        assertThat(response.getName()).isEqualTo("Research Lab Alpha");
    }

    @Test
    void getTenantBySlug_whenNotFound_throwsRuntimeException() {
        when(tenantRepository.findBySlug("unknown")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> tenantService.getTenantBySlug("unknown"))
                .isInstanceOf(RuntimeException.class).hasMessageContaining("unknown");
    }

    @Test
    void getAllTenants_returnsMappedList() {
        Tenant second = Tenant.builder().id(UUID.randomUUID()).slug("bio-lab")
                .name("Bio Lab").schemaName("org_bio_lab").status(TenantStatus.ACTIVE).build();
        when(tenantRepository.findAll()).thenReturn(List.of(sampleTenant, second));
        List<TenantResponse> results = tenantService.getAllTenants();
        assertThat(results).hasSize(2);
        assertThat(results.get(0).getSlug()).isEqualTo("research-lab");
    }

    @Test
    void getAllTenants_whenNoneExist_returnsEmptyList() {
        when(tenantRepository.findAll()).thenReturn(List.of());
        assertThat(tenantService.getAllTenants()).isEmpty();
    }

    @Test
    void updateStatus_toSuspended_updatesAndReturnsResponse() {
        when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(sampleTenant));
        Tenant susp = Tenant.builder().id(tenantId).slug("research-lab").name("Research Lab Alpha")
                .schemaName("org_research_lab").status(TenantStatus.SUSPENDED).build();
        when(tenantRepository.save(any())).thenReturn(susp);
        assertThat(tenantService.updateStatus(tenantId, TenantStatus.SUSPENDED).getStatus())
                .isEqualTo(TenantStatus.SUSPENDED);
    }

    @Test
    void updateStatus_toActive_reactivatesTenant() {
        Tenant susp = Tenant.builder().id(tenantId).slug("research-lab").name("Research Lab Alpha")
                .schemaName("org_research_lab").status(TenantStatus.SUSPENDED).build();
        when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(susp));
        Tenant active = Tenant.builder().id(tenantId).slug("research-lab").name("Research Lab Alpha")
                .schemaName("org_research_lab").status(TenantStatus.ACTIVE).build();
        when(tenantRepository.save(any())).thenReturn(active);
        assertThat(tenantService.updateStatus(tenantId, TenantStatus.ACTIVE).getStatus()).isEqualTo(TenantStatus.ACTIVE);
    }

    @Test
    void updateStatus_whenTenantNotFound_throwsRuntimeException() {
        when(tenantRepository.findById(tenantId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> tenantService.updateStatus(tenantId, TenantStatus.SUSPENDED))
                .isInstanceOf(RuntimeException.class).hasMessageContaining(tenantId.toString());
        verify(tenantRepository, never()).save(any());
    }
}
