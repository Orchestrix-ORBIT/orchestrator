package com.example.core_api.resource;

import lombok.Builder;
import lombok.Data;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
public class ResourceResponse {
    private UUID id;
    private String name;
    private ResourceType type;
    private String description;
    private UUID ownerId;
    private ResourceStatus status;
    private String location;
    private Integer maxDurationHours;
    private String metadata;
    private OffsetDateTime createdAt;
}
