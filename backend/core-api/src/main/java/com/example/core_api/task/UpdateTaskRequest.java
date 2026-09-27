package com.example.core_api.task;

import lombok.Data;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class UpdateTaskRequest {
    private String title;
    private String description;
    private TaskStatus status;
    private TaskPriority priority;
    private UUID assigneeId;
    private LocalDate dueDate;
}
