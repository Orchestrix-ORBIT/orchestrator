package com.example.core_api.aisummary;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class CreateAiSummaryRequest {
    @NotNull(message = "projectId is required")
    private UUID projectId;

    private String topic;

    @NotBlank(message = "summaryText is required")
    private String summaryText;

    private List<String> actionItems;
    private List<String> keyFindings;
    private List<String> deadlineSuggestions;
    private Integer confidence;
    private String model;
    private String status;
    private String transcriptHash;
}
