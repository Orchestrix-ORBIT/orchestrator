package com.example.core_api.aisummary;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "ai_summaries")
@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AiSummary {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "project_id", nullable = false)
    private UUID projectId;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "transcript_hash", nullable = false)
    @Builder.Default
    private String transcriptHash = "";

    @Column(name = "topic")
    private String topic;

    @Column(name = "summary_text", nullable = false, columnDefinition = "TEXT")
    private String summaryText;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "action_items", columnDefinition = "jsonb")
    @Builder.Default
    private String actionItems = "[]";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "key_findings", columnDefinition = "jsonb")
    @Builder.Default
    private String keyFindings = "[]";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "deadline_suggestions", columnDefinition = "jsonb")
    @Builder.Default
    private String deadlineSuggestions = "[]";

    @Column(name = "confidence")
    @Builder.Default
    private Integer confidence = 100;

    @Column(name = "model")
    @Builder.Default
    private String model = "LangChain Context Engine";

    @Column(name = "status", nullable = false)
    @Builder.Default
    private String status = "Pending Approval";

    @Column(name = "processed_at", nullable = false)
    private OffsetDateTime processedAt;

    @PrePersist
    protected void onCreate() {
        if (processedAt == null) {
            processedAt = OffsetDateTime.now();
        }
        if (status == null || status.isBlank()) {
            status = "Pending Approval";
        }
        if (model == null || model.isBlank()) {
            model = "LangChain Context Engine";
        }
        if (transcriptHash == null || transcriptHash.isBlank()) {
            transcriptHash = UUID.randomUUID().toString();
        }
        if (actionItems == null) {
            actionItems = "[]";
        }
        if (keyFindings == null) {
            keyFindings = "[]";
        }
        if (deadlineSuggestions == null) {
            deadlineSuggestions = "[]";
        }
    }
}
