package com.example.core_api.task;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
public class TaskResponse {
    private UUID id;
    private String title;
    private String description;
    private TaskStatus status;
    private TaskPriority priority;
    private UUID projectId;
    private UUID assigneeId;
    private LocalDate dueDate;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
