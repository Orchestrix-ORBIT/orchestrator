package com.example.core_api.resource;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.OffsetDateTime;

@Data
public class CreateBookingRequest {
    @NotNull(message = "Start time is required")
    private OffsetDateTime startTime;
    
    @NotNull(message = "End time is required")
    private OffsetDateTime endTime;
    
    private String purpose;
}
