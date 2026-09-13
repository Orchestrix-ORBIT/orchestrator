package com.example.core_api.resource;

import com.example.core_api.exception.ResourceNotFoundException;
import com.example.core_api.exception.ResourceBookingConflictException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import com.example.core_api.auth.UserRepository;
import com.example.core_api.auth.User;

@Service
@Transactional
public class ResourceService {

    private final ResourceRepository resourceRepository;
    private final ResourceBookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final ResourceMaintenanceRepository maintenanceRepository;

    public ResourceService(ResourceRepository resourceRepository, 
                           ResourceBookingRepository bookingRepository, 
                           UserRepository userRepository,
                           ResourceMaintenanceRepository maintenanceRepository) {
        this.resourceRepository = resourceRepository;
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
        this.maintenanceRepository = maintenanceRepository;
    }

    @Transactional(readOnly = true)
    public List<ResourceMaintenance> getAllMaintenance() {
        return maintenanceRepository.findAll();
    }

    public ResourceMaintenance createMaintenance(ResourceMaintenance maintenance) {
        ResourceMaintenance saved = maintenanceRepository.save(maintenance);
        // Automatically set resource status to MAINTENANCE ONLY if maintenance is active ("In Progress")
        if (maintenance.getResourceId() != null && "In Progress".equalsIgnoreCase(maintenance.getStatus())) {
            resourceRepository.findById(maintenance.getResourceId()).ifPresent(res -> {
                res.setStatus(ResourceStatus.MAINTENANCE);
                resourceRepository.save(res);
            });
        }
        return saved;
    }

    public ResourceResponse createResource(CreateResourceRequest request, UUID ownerId) {
        Resource resource = Resource.builder()
                .name(request.getName())
                .type(request.getType())
                .description(request.getDescription())
                .ownerId(ownerId)
                .status(ResourceStatus.AVAILABLE)
                .metadata(request.getMetadata())
                .build();
                
        resource = resourceRepository.save(resource);
        return mapToResourceResponse(resource);
    }

    @Transactional(readOnly = true)
    public List<ResourceResponse> getAllResources(ResourceType type, ResourceStatus status) {
        List<Resource> resources;
        if (type != null) {
            resources = resourceRepository.findAllByType(type);
        } else if (status != null) {
            resources = resourceRepository.findAllByStatus(status);
        } else {
            resources = resourceRepository.findAll();
        }
        
        return resources.stream().map(this::mapToResourceResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ResourceResponse getResourceById(UUID id) {
        Resource resource = resourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + id));
        return mapToResourceResponse(resource);
    }

    public ResourceResponse updateResourceStatus(UUID id, ResourceStatus status) {
        Resource resource = resourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + id));
        resource.setStatus(status);
        resource = resourceRepository.save(resource);
        return mapToResourceResponse(resource);
    }

    public BookingResponse createBooking(UUID resourceId, CreateBookingRequest request, UUID userId) {
        if (request.getEndTime().isBefore(request.getStartTime()) || request.getEndTime().isEqual(request.getStartTime())) {
            throw new IllegalArgumentException("End time must be after start time.");
        }

        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + resourceId));

        // ── Layer 1: Advisory lock (transaction-scoped) ───────────────────────
        // pg_advisory_xact_lock acquires a database-level exclusive lock keyed on
        // this resource's UUID. It blocks ANY concurrent transaction that calls this
        // for the same resource until the first one commits or rolls back.
        //
        // Unlike SELECT FOR UPDATE, this works even when the booking table has ZERO
        // rows for this resource — which is the exact gap that caused the race condition.
        // The lock is automatically released when the @Transactional method ends.
        bookingRepository.acquireResourceAdvisoryLock(resourceId.toString());

        // ── Layer 2: Application-level conflict check ─────────────────────────
        // After acquiring the lock we can safely read — the advisory lock guarantees
        // no concurrent insert can slip in between this check and our own insert.
        List<ResourceBooking> conflicts = bookingRepository.findOverlappingBookings(
                resourceId, request.getStartTime(), request.getEndTime());

        if (!conflicts.isEmpty()) {
            ResourceBooking first = conflicts.get(0);
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MMM d, yyyy 'at' h:mm a")
                    .withZone(ZoneId.of("UTC"));
            String bookedFrom  = fmt.format(first.getStartTime());
            String bookedUntil = fmt.format(first.getEndTime());
            throw new ResourceBookingConflictException(
                    "\"" + resource.getName() + "\" is already booked from " + bookedFrom +
                    " to " + bookedUntil + " (UTC). Please choose a different time slot.");
        }

        ResourceBooking booking = ResourceBooking.builder()
                .resourceId(resourceId)
                .userId(userId)
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .status(BookingStatus.PENDING_APPROVAL)
                .purpose(request.getPurpose())
                .build();

        try {
            booking = bookingRepository.save(booking);
        } catch (DataIntegrityViolationException ex) {
            // ── Layer 3: Database EXCLUDE constraint ─────────────────────────
            // The btree_gist EXCLUDE constraint fired — a concurrent transaction
            // beat us to it between our check and our insert.
            throw new ResourceBookingConflictException(
                    "\"" + resource.getName() + "\" was just booked by another user for that time slot. " +
                    "Please refresh and choose a different time.");
        }
        return mapToBookingResponse(booking);
    }

    public BookingResponse updateBookingStatus(UUID bookingId, BookingStatus newStatus) {
        ResourceBooking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with id: " + bookingId));
                
        booking.setStatus(newStatus);
        booking = bookingRepository.save(booking);
        return mapToBookingResponse(booking);
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> getUserBookings(UUID userId) {
        return bookingRepository.findAllByUserId(userId).stream()
                .map(this::mapToBookingResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> getBookingsForResource(UUID resourceId) {
        return bookingRepository.findAllByResourceId(resourceId).stream()
                .map(this::mapToBookingResponse)
                .collect(Collectors.toList());
    }

    private ResourceResponse mapToResourceResponse(Resource resource) {
        String loc = null;
        Integer maxHours = null;
        String meta = resource.getMetadata();
        if (meta != null) {
            java.util.regex.Matcher locMatcher = java.util.regex.Pattern.compile("\"location\"\\s*:\\s*\"([^\"]+)\"").matcher(meta);
            if (locMatcher.find()) {
                loc = locMatcher.group(1);
            }
            java.util.regex.Matcher hoursMatcher = java.util.regex.Pattern.compile("\"maxDurationHours\"\\s*:\\s*(\\d+)").matcher(meta);
            if (hoursMatcher.find()) {
                try {
                    maxHours = Integer.parseInt(hoursMatcher.group(1));
                } catch (Exception ignored) {}
            }
        }

        return ResourceResponse.builder()
                .id(resource.getId())
                .name(resource.getName())
                .type(resource.getType())
                .description(resource.getDescription())
                .ownerId(resource.getOwnerId())
                .status(resource.getStatus())
                .location(loc)
                .maxDurationHours(maxHours)
                .metadata(resource.getMetadata())
                .createdAt(resource.getCreatedAt())
                .build();
    }
    
    private BookingResponse mapToBookingResponse(ResourceBooking booking) {
        String resName = resourceRepository.findById(booking.getResourceId()).map(Resource::getName).orElse("Lab Asset");
        String email = userRepository.findById(booking.getUserId()).map(User::getEmail).orElse(booking.getUserId().toString());

        return BookingResponse.builder()
                .id(booking.getId())
                .resourceId(booking.getResourceId())
                .resourceName(resName)
                .userId(booking.getUserId())
                .userEmail(email)
                .startTime(booking.getStartTime())
                .endTime(booking.getEndTime())
                .status(booking.getStatus())
                .purpose(booking.getPurpose())
                .createdAt(booking.getCreatedAt())
                .build();
    }
}
