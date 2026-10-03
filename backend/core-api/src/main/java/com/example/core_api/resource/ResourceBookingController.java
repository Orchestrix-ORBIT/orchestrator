package com.example.core_api.resource;

import com.example.core_api.auth.User;
import org.springframework.security.access.AccessDeniedException;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/resources")
public class ResourceBookingController {

    private final ResourceService resourceService;

    public ResourceBookingController(ResourceService resourceService) {
        this.resourceService = resourceService;
    }

    // TenantFilter (Order=1) sets TenantContext from X-Tenant-ID for the entire request.
    // Never call TenantContext.clear() inside a controller method — it wipes the schema
    // before the @Transactional commit fires, causing DB writes to hit the wrong schema.

    @PostMapping("/{id}/bookings")
    @ResponseStatus(HttpStatus.CREATED)
    public BookingResponse createBooking(
            @PathVariable("id") UUID resourceId,
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody CreateBookingRequest request) {
        return resourceService.createBooking(resourceId, request, currentUser);
    }

    @GetMapping("/{id}/bookings")
    public List<BookingResponse> getBookingsForResource(@PathVariable("id") UUID resourceId) {
        return resourceService.getBookingsForResource(resourceId);
    }

    @PatchMapping("/bookings/{bookingId}/status")
    public BookingResponse updateBookingStatus(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID bookingId,
            @Valid @RequestBody UpdateBookingStatusRequest request) {
        ResourceAccess.requireManager(currentUser);
        return resourceService.updateBookingStatus(bookingId, request.getStatus(), request.getReason());
    }

    @GetMapping("/bookings/me")
    public List<BookingResponse> getUserBookings() {
        UUID userId = getAuthenticatedUserId();
        return resourceService.getUserBookings(userId);
    }

    private UUID getAuthenticatedUserId() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            throw new AccessDeniedException("Authentication required");
        }
        return user.getId();
    }
}
