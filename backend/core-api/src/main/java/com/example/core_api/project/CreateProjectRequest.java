package com.example.core_api.project;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateProjectRequest {
    @NotBlank(message = "Project name is required")
    private String name;
    
    private String description;
}
