package com.example.core_api.resource;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateBookingStatusRequest {
    @NotNull(message = "Status is required")
    private BookingStatus status;
}
