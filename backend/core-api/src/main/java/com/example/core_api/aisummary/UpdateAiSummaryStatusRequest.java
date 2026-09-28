package com.example.core_api.aisummary;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateAiSummaryStatusRequest {
    @NotBlank(message = "status is required")
    private String status;
}
