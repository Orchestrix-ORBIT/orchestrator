package com.example.core_api.aisummary;

import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class AiSummaryResponse {
    private UUID id;
    private UUID projectId;
    private String topic;
    private String summaryText;
    private List<String> actionItems;
    private List<String> keyFindings;
    private List<String> deadlineSuggestions;
    private Integer confidence;
    private String model;
    private String status;
    private String transcriptHash;
    private OffsetDateTime processedAt;
}
