package com.example.core_api.resource;

import com.example.core_api.auth.User;
import com.example.core_api.auth.UserRepository;
import com.example.core_api.auth.UserRole;
import com.example.core_api.exception.ResourceBookingConflictException;
import com.example.core_api.notification.NotificationService;
import com.example.core_api.project.ProjectRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

// Rules added for the evaluation build: maintenance windows block bookings (FR-RES-08),
// owners can be identified for self-cancellation (FR-RES-02), and assets can be edited (FR-RES-05).
@ExtendWith(MockitoExtension.class)
class ResourceServiceNewRulesTest {

    @Mock private ResourceRepository resourceRepository;
    @Mock private ResourceBookingRepository bookingRepository;
    @Mock private UserRepository userRepository;
    @Mock private ResourceMaintenanceRepository maintenanceRepository;
    @Mock private ProjectRepository projectRepository;
    @Mock private NotificationService notificationService;
    @InjectMocks private ResourceService resourceService;

    private UUID resourceId;
    private Resource resource;
    private User researcher;

    @BeforeEach
    void setUp() {
        resourceId = UUID.randomUUID();
        resource = Resource.builder().id(resourceId).name("TEM Microscope").type(ResourceType.EQUIPMENT)
                .status(ResourceStatus.AVAILABLE).metadata("{\"location\":\"Lab 1\",\"maxDurationHours\":4}").build();
        researcher = User.builder().id(UUID.randomUUID()).email("r@lab.com").role(UserRole.RESEARCHER).build();
    }

    private CreateBookingRequest slot(OffsetDateTime start, int hours) {
        CreateBookingRequest req = new CreateBookingRequest();
        req.setStartTime(start);
        req.setEndTime(start.plusHours(hours));
        req.setPurpose("test");
        return req;
    }

    private ResourceMaintenance window(OffsetDateTime start, OffsetDateTime end, String status) {
        ResourceMaintenance m = new ResourceMaintenance();
        m.setResourceId(resourceId);
        m.setAssetName("TEM Microscope");
        m.setStartDate(start.toInstant().toString());
        m.setEndDate(end.toInstant().toString());
        m.setStatus(status);
        return m;
    }

    @Test
    void booking_overlapping_scheduled_maintenance_is_rejected() {
        OffsetDateTime start = OffsetDateTime.now().plusDays(2);
        when(resourceRepository.findById(resourceId)).thenReturn(Optional.of(resource));
        when(maintenanceRepository.findAllByResourceId(resourceId))
                .thenReturn(List.of(window(start.minusHours(1), start.plusHours(3), "Scheduled")));

        assertThatThrownBy(() -> resourceService.createBooking(resourceId, slot(start, 1), researcher))
                .isInstanceOf(ResourceBookingConflictException.class)
                .hasMessageContaining("scheduled maintenance");
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void completed_or_cancelled_maintenance_does_not_block_bookings() {
        OffsetDateTime start = OffsetDateTime.now().plusDays(2);
        when(resourceRepository.findById(resourceId)).thenReturn(Optional.of(resource));
        when(maintenanceRepository.findAllByResourceId(resourceId))
                .thenReturn(List.of(window(start.minusHours(1), start.plusHours(3), "Completed")));
        when(bookingRepository.save(any())).thenAnswer(inv -> {
            ResourceBooking b = inv.getArgument(0);
            b.setId(UUID.randomUUID());
            return b;
        });
        when(userRepository.findById(any())).thenReturn(Optional.of(researcher));
        lenient().when(userRepository.findByRoleIn(any())).thenReturn(List.of());

        BookingResponse response = resourceService.createBooking(resourceId, slot(start, 1), researcher);
        assertThat(response.getStatus()).isEqualTo(BookingStatus.PENDING);
    }

    @Test
    void booking_outside_the_maintenance_window_is_allowed() {
        OffsetDateTime start = OffsetDateTime.now().plusDays(2);
        when(resourceRepository.findById(resourceId)).thenReturn(Optional.of(resource));
        when(maintenanceRepository.findAllByResourceId(resourceId))
                .thenReturn(List.of(window(start.plusHours(5), start.plusHours(8), "Scheduled")));
        when(bookingRepository.save(any())).thenAnswer(inv -> {
            ResourceBooking b = inv.getArgument(0);
            b.setId(UUID.randomUUID());
            return b;
        });
        when(userRepository.findById(any())).thenReturn(Optional.of(researcher));
        lenient().when(userRepository.findByRoleIn(any())).thenReturn(List.of());

        assertThat(resourceService.createBooking(resourceId, slot(start, 1), researcher).getId()).isNotNull();
    }

    @Test
    void isBookingOwner_matches_only_the_booking_user() {
        UUID bookingId = UUID.randomUUID();
        when(bookingRepository.findById(bookingId))
                .thenReturn(Optional.of(ResourceBooking.builder().id(bookingId).userId(researcher.getId()).build()));
        assertThat(resourceService.isBookingOwner(bookingId, researcher.getId())).isTrue();
        assertThat(resourceService.isBookingOwner(bookingId, UUID.randomUUID())).isFalse();
    }

    @Test
    void updateResource_changes_catalog_details() {
        when(resourceRepository.findById(resourceId)).thenReturn(Optional.of(resource));
        when(resourceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        CreateResourceRequest req = new CreateResourceRequest();
        req.setName("TEM Microscope v2");
        req.setType(ResourceType.EQUIPMENT);
        req.setDescription("edited");
        req.setMetadata("{\"location\":\"Lab 2\",\"maxDurationHours\":6}");

        ResourceResponse updated = resourceService.updateResource(resourceId, req);
        assertThat(updated.getName()).isEqualTo("TEM Microscope v2");
        assertThat(updated.getLocation()).isEqualTo("Lab 2");
        assertThat(updated.getMaxDurationHours()).isEqualTo(6);
    }
}
