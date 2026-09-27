package com.example.core_api.resource;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateResourceRequest {
    @NotBlank(message = "Resource name is required")
    private String name;
    
    @NotNull(message = "Resource type is required")
    private ResourceType type;
    
    private String description;
    
    private String metadata;
}
