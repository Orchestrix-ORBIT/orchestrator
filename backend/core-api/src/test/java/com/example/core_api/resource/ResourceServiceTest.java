package com.example.core_api.resource;

import com.example.core_api.auth.User;
import com.example.core_api.auth.UserRepository;
import com.example.core_api.exception.ResourceBookingConflictException;
import com.example.core_api.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for ResourceService.
 *
 * SRS Coverage: FR-RES-02 (Booking Management), FR-RES-07 (3-layer conflict prevention),
 *               FR-RES-08 (Automated Maintenance Status), NFR-REL-05 (100% booking accuracy)
 */
@ExtendWith(MockitoExtension.class)
class ResourceServiceTest {

    @Mock private ResourceRepository resourceRepository;
    @Mock private ResourceBookingRepository bookingRepository;
    @Mock private UserRepository userRepository;
    @Mock private ResourceMaintenanceRepository maintenanceRepository;
    @InjectMocks private ResourceService resourceService;

    private UUID resourceId, userId, bookingId;
    private Resource sampleResource;
    private User sampleUser;

    @BeforeEach
    void setUp() {
        resourceId = UUID.randomUUID();
        userId     = UUID.randomUUID();
        bookingId  = UUID.randomUUID();
        sampleResource = Resource.builder().id(resourceId).name("Electron Microscope A")
                .type(ResourceType.EQUIPMENT).description("High-res microscope")
                .ownerId(userId).status(ResourceStatus.AVAILABLE).build();
        sampleUser = new User();
        sampleUser.setId(userId);
        sampleUser.setEmail("researcher@lab.com");
    }

    // ── createResource ────────────────────────────────────────────────────────

    @Test
    void createResource_savesAndReturnsMappedResponse() {
        when(resourceRepository.save(any(Resource.class))).thenReturn(sampleResource);
        CreateResourceRequest req = new CreateResourceRequest();
        req.setName("Electron Microscope A");
        req.setType(ResourceType.EQUIPMENT);
        req.setDescription("High-res microscope");
        ResourceResponse response = resourceService.createResource(req, userId);
        assertThat(response.getId()).isEqualTo(resourceId);
        assertThat(response.getName()).isEqualTo("Electron Microscope A");
        assertThat(response.getStatus()).isEqualTo(ResourceStatus.AVAILABLE);
        verify(resourceRepository).save(any(Resource.class));
    }

    // ── getAllResources ───────────────────────────────────────────────────────

    @Test
    void getAllResources_withNoFilter_returnsAllResources() {
        when(resourceRepository.findAll()).thenReturn(List.of(sampleResource));
        assertThat(resourceService.getAllResources(null, null)).hasSize(1);
        verify(resourceRepository).findAll();
    }

    @Test
    void getAllResources_withTypeFilter_usesTypedQuery() {
        when(resourceRepository.findAllByType(ResourceType.EQUIPMENT)).thenReturn(List.of(sampleResource));
        assertThat(resourceService.getAllResources(ResourceType.EQUIPMENT, null)).hasSize(1);
        verify(resourceRepository, never()).findAll();
    }

    @Test
    void getAllResources_withStatusFilter_usesStatusQuery() {
        when(resourceRepository.findAllByStatus(ResourceStatus.AVAILABLE)).thenReturn(List.of(sampleResource));
        assertThat(resourceService.getAllResources(null, ResourceStatus.AVAILABLE)).hasSize(1);
    }

    @Test
    void getAllResources_whenNoneExist_returnsEmptyList() {
        when(resourceRepository.findAll()).thenReturn(List.of());
        assertThat(resourceService.getAllResources(null, null)).isEmpty();
    }

    // ── getResourceById ───────────────────────────────────────────────────────

    @Test
    void getResourceById_whenFound_returnsMappedResponse() {
        when(resourceRepository.findById(resourceId)).thenReturn(Optional.of(sampleResource));
        assertThat(resourceService.getResourceById(resourceId).getName()).isEqualTo("Electron Microscope A");
    }

    @Test
    void getResourceById_whenNotFound_throwsResourceNotFoundException() {
        when(resourceRepository.findById(resourceId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> resourceService.getResourceById(resourceId))
                .isInstanceOf(ResourceNotFoundException.class).hasMessageContaining(resourceId.toString());
    }

    // ── updateResourceStatus ──────────────────────────────────────────────────

    @Test
    void updateResourceStatus_whenFound_updatesAndReturnsResponse() {
        when(resourceRepository.findById(resourceId)).thenReturn(Optional.of(sampleResource));
        when(resourceRepository.save(any())).thenReturn(sampleResource);
        assertThat(resourceService.updateResourceStatus(resourceId, ResourceStatus.MAINTENANCE)).isNotNull();
    }

    @Test
    void updateResourceStatus_whenNotFound_throwsResourceNotFoundException() {
        when(resourceRepository.findById(resourceId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> resourceService.updateResourceStatus(resourceId, ResourceStatus.MAINTENANCE))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(resourceRepository, never()).save(any());
    }

    // ── createBooking — Layer 1+2 (SRS FR-RES-07) ────────────────────────────

    @Test
    void createBooking_withNoConflicts_savesAndReturnsBookingResponse() {
        OffsetDateTime start = OffsetDateTime.now().plusHours(1);
        OffsetDateTime end   = OffsetDateTime.now().plusHours(2);
        CreateBookingRequest req = new CreateBookingRequest();
        req.setStartTime(start); req.setEndTime(end); req.setPurpose("Imaging session");

        ResourceBooking saved = ResourceBooking.builder().id(bookingId).resourceId(resourceId)
                .userId(userId).startTime(start).endTime(end)
                .status(BookingStatus.PENDING_APPROVAL).purpose("Imaging session").build();

        when(resourceRepository.findById(resourceId)).thenReturn(Optional.of(sampleResource));
        when(bookingRepository.findOverlappingBookings(resourceId, start, end)).thenReturn(List.of());
        when(bookingRepository.save(any())).thenReturn(saved);
        when(userRepository.findById(userId)).thenReturn(Optional.of(sampleUser));

        BookingResponse response = resourceService.createBooking(resourceId, req, userId);
        assertThat(response.getId()).isEqualTo(bookingId);
        assertThat(response.getStatus()).isEqualTo(BookingStatus.PENDING_APPROVAL);
    }

    @Test
    void createBooking_withOverlappingBooking_throwsConflictException() {
        OffsetDateTime start = OffsetDateTime.now().plusHours(1);
        OffsetDateTime end   = OffsetDateTime.now().plusHours(2);
        CreateBookingRequest req = new CreateBookingRequest();
        req.setStartTime(start); req.setEndTime(end); req.setPurpose("Test");

        ResourceBooking conflict = ResourceBooking.builder().id(UUID.randomUUID()).resourceId(resourceId)
                .userId(UUID.randomUUID()).startTime(start.minusMinutes(30)).endTime(end.plusMinutes(30))
                .status(BookingStatus.PENDING_APPROVAL).build();

        when(resourceRepository.findById(resourceId)).thenReturn(Optional.of(sampleResource));
        when(bookingRepository.findOverlappingBookings(resourceId, start, end)).thenReturn(List.of(conflict));

        assertThatThrownBy(() -> resourceService.createBooking(resourceId, req, userId))
                .isInstanceOf(ResourceBookingConflictException.class).hasMessageContaining("Electron Microscope A");
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void createBooking_withEndBeforeStart_throwsIllegalArgumentException() {
        CreateBookingRequest req = new CreateBookingRequest();
        req.setStartTime(OffsetDateTime.now().plusHours(2));
        req.setEndTime(OffsetDateTime.now().plusHours(1));  // end before start
        req.setPurpose("Invalid");
        assertThatThrownBy(() -> resourceService.createBooking(resourceId, req, userId))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("End time must be after start time");
        verify(resourceRepository, never()).findById(any());
    }

    @Test
    void createBooking_whenResourceNotFound_throwsResourceNotFoundException() {
        CreateBookingRequest req = new CreateBookingRequest();
        req.setStartTime(OffsetDateTime.now().plusHours(1));
        req.setEndTime(OffsetDateTime.now().plusHours(2));
        when(resourceRepository.findById(resourceId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> resourceService.createBooking(resourceId, req, userId))
                .isInstanceOf(ResourceNotFoundException.class).hasMessageContaining(resourceId.toString());
    }

    @Test
    void createBooking_whenDbConstraintFires_throwsConflictException() {
        // Layer 3: DB EXCLUDE constraint catches race condition (SRS FR-RES-07)
        OffsetDateTime start = OffsetDateTime.now().plusHours(1);
        OffsetDateTime end   = OffsetDateTime.now().plusHours(2);
        CreateBookingRequest req = new CreateBookingRequest();
        req.setStartTime(start); req.setEndTime(end); req.setPurpose("Race test");
        when(resourceRepository.findById(resourceId)).thenReturn(Optional.of(sampleResource));
        when(bookingRepository.findOverlappingBookings(resourceId, start, end)).thenReturn(List.of());
        when(bookingRepository.save(any())).thenThrow(new DataIntegrityViolationException("EXCLUDE constraint"));
        assertThatThrownBy(() -> resourceService.createBooking(resourceId, req, userId))
                .isInstanceOf(ResourceBookingConflictException.class).hasMessageContaining("Electron Microscope A");
    }

    // ── updateBookingStatus ───────────────────────────────────────────────────

    @Test
    void updateBookingStatus_whenFound_updatesStatusAndReturnsResponse() {
        OffsetDateTime s = OffsetDateTime.now().plusHours(1), e = OffsetDateTime.now().plusHours(2);
        ResourceBooking existing = ResourceBooking.builder().id(bookingId).resourceId(resourceId)
                .userId(userId).startTime(s).endTime(e).status(BookingStatus.PENDING_APPROVAL).build();
        ResourceBooking approved = ResourceBooking.builder().id(bookingId).resourceId(resourceId)
                .userId(userId).startTime(s).endTime(e).status(BookingStatus.APPROVED).build();
        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(existing));
        when(bookingRepository.save(any())).thenReturn(approved);
        when(resourceRepository.findById(resourceId)).thenReturn(Optional.of(sampleResource));
        when(userRepository.findById(userId)).thenReturn(Optional.of(sampleUser));
        assertThat(resourceService.updateBookingStatus(bookingId, BookingStatus.APPROVED).getStatus())
                .isEqualTo(BookingStatus.APPROVED);
    }

    @Test
    void updateBookingStatus_whenNotFound_throwsResourceNotFoundException() {
        when(bookingRepository.findById(bookingId)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> resourceService.updateBookingStatus(bookingId, BookingStatus.APPROVED))
                .isInstanceOf(ResourceNotFoundException.class).hasMessageContaining(bookingId.toString());
        verify(bookingRepository, never()).save(any());
    }

    // ── createMaintenance — SRS FR-RES-08 ─────────────────────────────────────

    @Test
    void createMaintenance_whenStatusIsInProgress_setsResourceToMaintenance() {
        ResourceMaintenance m = new ResourceMaintenance();
        m.setResourceId(resourceId); m.setStatus("In Progress");
        when(maintenanceRepository.save(any())).thenReturn(m);
        when(resourceRepository.findById(resourceId)).thenReturn(Optional.of(sampleResource));
        when(resourceRepository.save(any())).thenReturn(sampleResource);
        resourceService.createMaintenance(m);
        verify(resourceRepository).save(any(Resource.class));
    }

    @Test
    void createMaintenance_whenStatusIsNotInProgress_doesNotChangeResourceStatus() {
        ResourceMaintenance m = new ResourceMaintenance();
        m.setResourceId(resourceId); m.setStatus("Completed");
        when(maintenanceRepository.save(any())).thenReturn(m);
        resourceService.createMaintenance(m);
        verify(resourceRepository, never()).save(any());
    }

    // ── getUserBookings / getBookingsForResource ───────────────────────────────

    @Test
    void getUserBookings_returnsMappedListForUser() {
        OffsetDateTime s = OffsetDateTime.now().plusHours(1), e = OffsetDateTime.now().plusHours(2);
        ResourceBooking b = ResourceBooking.builder().id(bookingId).resourceId(resourceId)
                .userId(userId).startTime(s).endTime(e).status(BookingStatus.PENDING_APPROVAL).build();
        when(bookingRepository.findAllByUserId(userId)).thenReturn(List.of(b));
        when(resourceRepository.findById(resourceId)).thenReturn(Optional.of(sampleResource));
        when(userRepository.findById(userId)).thenReturn(Optional.of(sampleUser));
        List<BookingResponse> results = resourceService.getUserBookings(userId);
        assertThat(results).hasSize(1);
        assertThat(results.get(0).getUserEmail()).isEqualTo("researcher@lab.com");
    }

    @Test
    void getBookingsForResource_returnsMappedListForResource() {
        OffsetDateTime s = OffsetDateTime.now().plusHours(1), e = OffsetDateTime.now().plusHours(2);
        ResourceBooking b = ResourceBooking.builder().id(bookingId).resourceId(resourceId)
                .userId(userId).startTime(s).endTime(e).status(BookingStatus.APPROVED).build();
        when(bookingRepository.findAllByResourceId(resourceId)).thenReturn(List.of(b));
        when(resourceRepository.findById(resourceId)).thenReturn(Optional.of(sampleResource));
        when(userRepository.findById(userId)).thenReturn(Optional.of(sampleUser));
        List<BookingResponse> results = resourceService.getBookingsForResource(resourceId);
        assertThat(results).hasSize(1);
        assertThat(results.get(0).getResourceName()).isEqualTo("Electron Microscope A");
    }
}
