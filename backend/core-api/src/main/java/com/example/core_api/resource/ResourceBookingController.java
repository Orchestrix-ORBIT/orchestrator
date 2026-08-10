package com.example.core_api.resource;

import com.example.core_api.auth.User;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
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

    @PostMapping("/{id}/bookings")
    @ResponseStatus(HttpStatus.CREATED)
    public BookingResponse createBooking(
            @PathVariable("id") UUID resourceId,
            @Valid @RequestBody CreateBookingRequest request) {
        UUID userId = getAuthenticatedUserId();
        return resourceService.createBooking(resourceId, request, userId);
    }

    @GetMapping("/{id}/bookings")
    public List<BookingResponse> getBookingsForResource(@PathVariable("id") UUID resourceId) {
        return resourceService.getBookingsForResource(resourceId);
    }

    @PatchMapping("/bookings/{bookingId}/status")
    public BookingResponse updateBookingStatus(
            @PathVariable UUID bookingId,
            @Valid @RequestBody UpdateBookingStatusRequest request) {
        return resourceService.updateBookingStatus(bookingId, request.getStatus());
    }

    @GetMapping("/bookings/me")
    public List<BookingResponse> getUserBookings() {
        UUID userId = getAuthenticatedUserId();
        return resourceService.getUserBookings(userId);
    }

    private UUID getAuthenticatedUserId() {
        User user = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return user.getId();
    }
}
