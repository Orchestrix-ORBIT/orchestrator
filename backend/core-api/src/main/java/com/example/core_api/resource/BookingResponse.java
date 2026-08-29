package com.example.core_api.resource;

import lombok.Builder;
import lombok.Data;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
public class BookingResponse {
    private UUID id;
    private UUID resourceId;
    private String resourceName;
    private UUID userId;
    private String userEmail;
    private OffsetDateTime startTime;
    private OffsetDateTime endTime;
    private BookingStatus status;
    private String purpose;
    private OffsetDateTime createdAt;
}
