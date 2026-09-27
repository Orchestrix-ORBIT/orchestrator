package com.example.core_api.resource;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateResourceStatusRequest {
    @NotNull(message = "Status is required")
    private ResourceStatus status;
}
