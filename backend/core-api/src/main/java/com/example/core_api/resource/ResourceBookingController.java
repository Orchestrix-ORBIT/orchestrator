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
            @RequestHeader(value = "X-Tenant-ID", required = false, defaultValue = "myorg") String tenantId,
            @PathVariable("id") UUID resourceId,
            @Valid @RequestBody CreateBookingRequest request) {
        String schemaName = "org_" + (tenantId != null ? tenantId : "myorg").toLowerCase().replace("-", "_");
        com.example.core_api.multitenancy.TenantContext.setCurrentTenant(schemaName);
        try {
            UUID userId = getAuthenticatedUserId();
            return resourceService.createBooking(resourceId, request, userId);
        } finally {
            com.example.core_api.multitenancy.TenantContext.clear();
        }
    }

    @GetMapping("/{id}/bookings")
    public List<BookingResponse> getBookingsForResource(
            @RequestHeader(value = "X-Tenant-ID", required = false, defaultValue = "myorg") String tenantId,
            @PathVariable("id") UUID resourceId) {
        String schemaName = "org_" + (tenantId != null ? tenantId : "myorg").toLowerCase().replace("-", "_");
        com.example.core_api.multitenancy.TenantContext.setCurrentTenant(schemaName);
        try {
            return resourceService.getBookingsForResource(resourceId);
        } finally {
            com.example.core_api.multitenancy.TenantContext.clear();
        }
    }

    @PatchMapping("/bookings/{bookingId}/status")
    public BookingResponse updateBookingStatus(
            @RequestHeader(value = "X-Tenant-ID", required = false, defaultValue = "myorg") String tenantId,
            @PathVariable UUID bookingId,
            @Valid @RequestBody UpdateBookingStatusRequest request) {
        String schemaName = "org_" + (tenantId != null ? tenantId : "myorg").toLowerCase().replace("-", "_");
        com.example.core_api.multitenancy.TenantContext.setCurrentTenant(schemaName);
        try {
            return resourceService.updateBookingStatus(bookingId, request.getStatus());
        } finally {
            com.example.core_api.multitenancy.TenantContext.clear();
        }
    }

    @GetMapping("/bookings/me")
    public List<BookingResponse> getUserBookings(
            @RequestHeader(value = "X-Tenant-ID", required = false, defaultValue = "myorg") String tenantId) {
        String schemaName = "org_" + (tenantId != null ? tenantId : "myorg").toLowerCase().replace("-", "_");
        com.example.core_api.multitenancy.TenantContext.setCurrentTenant(schemaName);
        try {
            UUID userId = getAuthenticatedUserId();
            return resourceService.getUserBookings(userId);
        } finally {
            com.example.core_api.multitenancy.TenantContext.clear();
        }
    }

    private UUID getAuthenticatedUserId() {
        User user = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return user.getId();
    }
}
