package com.example.core_api.task;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class CreateTaskRequest {
    @NotBlank(message = "Title is required")
    private String title;
    private String description;
    private TaskPriority priority;
    private UUID assigneeId;
    private LocalDate dueDate;
}
