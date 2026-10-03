package com.example.core_api.resource;

import com.example.core_api.exception.ResourceNotFoundException;
import com.example.core_api.exception.ResourceBookingConflictException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.core_api.notification.NotificationService;

import java.time.format.DateTimeFormatter;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import com.example.core_api.auth.UserRepository;
import com.example.core_api.auth.User;
import com.example.core_api.project.ProjectRepository;
import com.example.core_api.project.Project;

@Service
@Transactional
public class ResourceService {

    private static final Logger log = LoggerFactory.getLogger(ResourceService.class);

    private final ResourceRepository resourceRepository;
    private final ResourceBookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final ResourceMaintenanceRepository maintenanceRepository;
    private final ProjectRepository projectRepository;
    private final NotificationService notificationService;

    public ResourceService(ResourceRepository resourceRepository,
                           ResourceBookingRepository bookingRepository,
                           UserRepository userRepository,
                           ResourceMaintenanceRepository maintenanceRepository,
                           ProjectRepository projectRepository,
                           NotificationService notificationService) {
        this.resourceRepository = resourceRepository;
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
        this.maintenanceRepository = maintenanceRepository;
        this.projectRepository = projectRepository;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public List<ResourceMaintenance> getAllMaintenance() {
        return maintenanceRepository.findAll();
    }

    public ResourceMaintenance createMaintenance(ResourceMaintenance maintenance) {
        validateNoMaintenanceConflict(maintenance, null);
        ResourceMaintenance saved = maintenanceRepository.save(maintenance);
        if (maintenance.getResourceId() != null && "In Progress".equalsIgnoreCase(maintenance.getStatus())) {
            resourceRepository.findById(maintenance.getResourceId()).ifPresent(res -> {
                res.setStatus(ResourceStatus.MAINTENANCE);
                resourceRepository.save(res);
            });
        }
        cancelConflictingBookingsForMaintenance(saved);
        return saved;
    }

    public ResourceMaintenance updateMaintenance(UUID id, ResourceMaintenance updates) {
        ResourceMaintenance maintenance = maintenanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Maintenance log not found with id: " + id));
        if (updates.getAssetName() != null) maintenance.setAssetName(updates.getAssetName());
        if (updates.getResourceId() != null) maintenance.setResourceId(updates.getResourceId());
        if (updates.getCategory() != null) maintenance.setCategory(updates.getCategory());
        if (updates.getStartDate() != null) maintenance.setStartDate(updates.getStartDate());
        if (updates.getEndDate() != null) maintenance.setEndDate(updates.getEndDate());
        if (updates.getDowntimeType() != null) maintenance.setDowntimeType(updates.getDowntimeType());
        if (updates.getTechnician() != null) maintenance.setTechnician(updates.getTechnician());
        if (updates.getNotes() != null) maintenance.setNotes(updates.getNotes());
        String oldStatus = maintenance.getStatus();
        if (updates.getStatus() != null) maintenance.setStatus(updates.getStatus());
        validateNoMaintenanceConflict(maintenance, id);
        ResourceMaintenance saved = maintenanceRepository.save(maintenance);
        if (saved.getResourceId() != null) {
            if ("In Progress".equalsIgnoreCase(saved.getStatus())) {
                resourceRepository.findById(saved.getResourceId()).ifPresent(res -> {
                    res.setStatus(ResourceStatus.MAINTENANCE);
                    resourceRepository.save(res);
                });
            } else if ("Completed".equalsIgnoreCase(saved.getStatus()) || "Scheduled".equalsIgnoreCase(saved.getStatus())) {
                if ("In Progress".equalsIgnoreCase(oldStatus)) {
                    boolean hasOtherInProgress = maintenanceRepository.findAll().stream()
                            .anyMatch(m -> !m.getId().equals(saved.getId()) && saved.getResourceId().equals(m.getResourceId()) && "In Progress".equalsIgnoreCase(m.getStatus()));
                    if (!hasOtherInProgress) {
                        resourceRepository.findById(saved.getResourceId()).ifPresent(res -> {
                            if (res.getStatus() == ResourceStatus.MAINTENANCE) {
                                res.setStatus(ResourceStatus.AVAILABLE);
                                resourceRepository.save(res);
                            }
                        });
                    }
                }
            }
        }
        cancelConflictingBookingsForMaintenance(saved);
        return saved;
    }

    public ResourceMaintenance updateMaintenance(UUID id, String endDate, String status) {
        ResourceMaintenance updates = new ResourceMaintenance();
        updates.setEndDate(endDate);
        updates.setStatus(status);
        return updateMaintenance(id, updates);
    }

    public void deleteMaintenance(UUID id) {
        ResourceMaintenance maintenance = maintenanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Maintenance log not found with id: " + id));
        UUID resourceId = maintenance.getResourceId();
        String status = maintenance.getStatus();
        maintenanceRepository.delete(maintenance);
        if (resourceId != null && "In Progress".equalsIgnoreCase(status)) {
            boolean hasOtherInProgress = maintenanceRepository.findAll().stream()
                    .anyMatch(m -> resourceId.equals(m.getResourceId()) && "In Progress".equalsIgnoreCase(m.getStatus()));
            if (!hasOtherInProgress) {
                resourceRepository.findById(resourceId).ifPresent(res -> {
                    if (res.getStatus() == ResourceStatus.MAINTENANCE) {
                        res.setStatus(ResourceStatus.AVAILABLE);
                        resourceRepository.save(res);
                    }
                });
            }
        }
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

    /**
     * Creates a booking with role-based initial status.
     * LEAD / ADMIN / OWNER / RESOURCE_MANAGER  -> APPROVED immediately.
     * MEMBER / GUEST / RESEARCHER / ROLE_RESEARCHER -> PENDING (requires Lead approval).
     */
    public BookingResponse createBooking(UUID resourceId, CreateBookingRequest request, User currentUser) {
        if (request.getEndTime().isBefore(request.getStartTime()) || request.getEndTime().isEqual(request.getStartTime())) {
            throw new IllegalArgumentException("End time must be after start time.");
        }

        UUID userId = currentUser.getId();
        com.example.core_api.auth.UserRole userRole = currentUser.getRole();

        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + resourceId));

        // Layer 1: Advisory lock
        bookingRepository.acquireResourceAdvisoryLock(resourceId.toString());

        // Layer 2: Overlap check
        List<ResourceBooking> conflicts = bookingRepository.findOverlappingBookings(
                resourceId, request.getStartTime(), request.getEndTime());

        if (!conflicts.isEmpty()) {
            ResourceBooking first = conflicts.get(0);
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MMM d, yyyy 'at' h:mm a").withZone(ZoneId.of("UTC"));
            String bookedFrom  = fmt.format(first.getStartTime());
            String bookedUntil = fmt.format(first.getEndTime());
            throw new ResourceBookingConflictException(
                    "\"" + resource.getName() + "\" is already booked from " + bookedFrom +
                    " to " + bookedUntil + " (UTC). Please choose a different time slot.");
        }

        // DEBUG: log the actual role so we can see what value the DB returned
        log.warn("[BOOKING-ROLE-DEBUG] user={} role={} roleClass={}", currentUser.getEmail(), userRole, userRole == null ? "null" : userRole.getClass().getName());

        // EXPLICIT allow-list: only these roles get auto-approved.
        // Every other role (MEMBER, RESEARCHER, ROLE_RESEARCHER, GUEST, null, unknown) -> PENDING.
        boolean isPrivileged = userRole == com.example.core_api.auth.UserRole.LEAD
                || userRole == com.example.core_api.auth.UserRole.ADMIN
                || userRole == com.example.core_api.auth.UserRole.OWNER
                || userRole == com.example.core_api.auth.UserRole.RESOURCE_MANAGER;

        BookingStatus initialStatus = isPrivileged ? BookingStatus.APPROVED : BookingStatus.PENDING;

        ResourceBooking booking = ResourceBooking.builder()
                .resourceId(resourceId)
                .userId(userId)
                .projectId(request.getProjectId())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .status(initialStatus)
                .purpose(request.getPurpose())
                .build();

        try {
            booking = bookingRepository.save(booking);
        } catch (DataIntegrityViolationException ex) {
            // Layer 3: DB EXCLUDE constraint
            throw new ResourceBookingConflictException(
                    "\"" + resource.getName() + "\" was just booked by another user for that time slot. " +
                    "Please refresh and choose a different time.");
        }

        if (isPrivileged) {
            log.info("[BOOKING] Privileged booking auto-approved: resource={}, user={}", resource.getName(), currentUser.getEmail());
        } else {
            String title = "New Booking Request - Pending Approval";
            String message = "A booking request for \"" + resource.getName() + "\" was submitted by "
                    + currentUser.getEmail() + " and is awaiting your approval.";
            List<User> leads = userRepository.findByRoleIn(java.util.List.of(
                com.example.core_api.auth.UserRole.ADMIN,
                com.example.core_api.auth.UserRole.OWNER,
                com.example.core_api.auth.UserRole.ROLE_ADMIN,
                com.example.core_api.auth.UserRole.LEAD,
                com.example.core_api.auth.UserRole.ROLE_LEAD
            ));
            log.info("[NOTIFY] Notifying {} leads about pending booking for resource={}", leads.size(), resource.getName());
            for (User lead : leads) {
                notificationService.notify(lead.getId(), "BOOKING", title, message);
            }
        }

        return mapToBookingResponse(booking);
    }

    public BookingResponse updateBookingStatus(UUID bookingId, BookingStatus newStatus, String reason) {
        ResourceBooking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with id: " + bookingId));
        BookingStatus oldStatus = booking.getStatus();
        booking.setStatus(newStatus);
        booking = bookingRepository.save(booking);
        if (oldStatus != newStatus) {
            Resource resource = resourceRepository.findById(booking.getResourceId()).orElse(null);
            String resName = resource != null ? resource.getName() : "Resource";
            String title = "Booking " + newStatus;
            String message = "Your booking for " + resName + " has been " + newStatus.toString().toLowerCase() + ".";
            if (reason != null && !reason.trim().isEmpty()) {
                message += " Reason: " + reason.trim();
            }
            notificationService.notify(booking.getUserId(), "BOOKING_UPDATE", title, message);
        }
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
            if (locMatcher.find()) loc = locMatcher.group(1);
            java.util.regex.Matcher hoursMatcher = java.util.regex.Pattern.compile("\"maxDurationHours\"\\s*:\\s*(\\d+)").matcher(meta);
            if (hoursMatcher.find()) {
                try { maxHours = Integer.parseInt(hoursMatcher.group(1)); } catch (Exception ignored) {}
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
        String projName = null;
        if (booking.getProjectId() != null) {
            projName = projectRepository.findById(booking.getProjectId()).map(Project::getName).orElse("Unknown Project");
        }
        return BookingResponse.builder()
                .id(booking.getId())
                .resourceId(booking.getResourceId())
                .resourceName(resName)
                .userId(booking.getUserId())
                .projectId(booking.getProjectId())
                .projectName(projName)
                .userEmail(email)
                .startTime(booking.getStartTime())
                .endTime(booking.getEndTime())
                .status(booking.getStatus())
                .purpose(booking.getPurpose())
                .createdAt(booking.getCreatedAt())
                .build();
    }

    private void validateNoMaintenanceConflict(ResourceMaintenance target, UUID excludeId) {
        if (target.getResourceId() == null && target.getAssetName() == null) return;
        List<ResourceMaintenance> existing = maintenanceRepository.findAll();
        for (ResourceMaintenance em : existing) {
            if (excludeId != null && em.getId() != null && em.getId().equals(excludeId)) continue;
            if ("Completed".equalsIgnoreCase(em.getStatus())) continue;
            boolean sameAsset = (target.getResourceId() != null && target.getResourceId().equals(em.getResourceId()))
                    || (target.getAssetName() != null && target.getAssetName().trim().equalsIgnoreCase(em.getAssetName().trim()));
            if (sameAsset) {
                if ("In Progress".equalsIgnoreCase(em.getStatus()) && "In Progress".equalsIgnoreCase(target.getStatus())) {
                    throw new IllegalArgumentException("Asset '" + em.getAssetName() + "' already has an active maintenance window in progress.");
                }
                if (target.getStartDate() != null && target.getEndDate() != null && em.getStartDate() != null && em.getEndDate() != null) {
                    if (datesOverlap(target.getStartDate(), target.getEndDate(), em.getStartDate(), em.getEndDate())) {
                        throw new IllegalArgumentException("Asset '" + em.getAssetName() + "' already has a conflicting maintenance schedule during that timeframe (" + em.getStartDate() + " to " + em.getEndDate() + ").");
                    }
                }
            }
        }
    }

    private boolean datesOverlap(String start1, String end1, String start2, String end2) {
        if (start1 == null || end1 == null || start2 == null || end2 == null) return false;
        try {
            java.time.Instant s1 = parseToInstant(start1);
            java.time.Instant e1 = parseToInstant(end1);
            java.time.Instant s2 = parseToInstant(start2);
            java.time.Instant e2 = parseToInstant(end2);
            if (s1 != null && e1 != null && s2 != null && e2 != null) return s1.isBefore(e2) && e1.isAfter(s2);
        } catch (Exception ignored) {}
        return false;
    }

    private java.time.Instant parseToInstant(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) return null;
        try {
            String clean = dateStr.trim();
            if (clean.length() == 16) return java.time.LocalDateTime.parse(clean).toInstant(java.time.ZoneOffset.UTC);
            if (clean.length() == 10) return java.time.LocalDate.parse(clean).atStartOfDay().toInstant(java.time.ZoneOffset.UTC);
            return java.time.OffsetDateTime.parse(clean).toInstant();
        } catch (Exception ignored) {}
        return null;
    }

    private void cancelConflictingBookingsForMaintenance(ResourceMaintenance maintenance) {
        if (!"Scheduled".equalsIgnoreCase(maintenance.getStatus()) && !"In Progress".equalsIgnoreCase(maintenance.getStatus())) return;
        try {
            java.time.Instant startInstant = parseToInstant(maintenance.getStartDate());
            java.time.Instant endInstant = parseToInstant(maintenance.getEndDate());
            if (startInstant == null || endInstant == null) return;
            java.time.OffsetDateTime startTime = java.time.OffsetDateTime.ofInstant(startInstant, java.time.ZoneOffset.UTC);
            java.time.OffsetDateTime endTime = java.time.OffsetDateTime.ofInstant(endInstant, java.time.ZoneOffset.UTC);
            List<ResourceBooking> conflicting = bookingRepository.findOverlappingBookings(maintenance.getResourceId(), startTime, endTime);
            for (ResourceBooking booking : conflicting) {
                booking.setStatus(BookingStatus.CANCELLED);
                bookingRepository.save(booking);
                String title = "Booking Cancelled - Priority Maintenance";
                String message = "Your booking for asset '" + maintenance.getAssetName() + "' from " + booking.getStartTime() + " to " + booking.getEndTime() + " has been cancelled due to priority lab maintenance.";
                notificationService.notify(booking.getUserId(), "BOOKING_UPDATE", title, message);
                log.info("[NOTIFY] Cancelled overlapping booking id={} and notified user id={}", booking.getId(), booking.getUserId());
            }
        } catch (Exception e) {
            log.error("Failed to process maintenance overlaps for maintenance id={}", maintenance.getId(), e);
        }
    }
}