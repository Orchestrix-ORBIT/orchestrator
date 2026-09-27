package com.example.core_api.project;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ProjectSummaryResponse {
    private int totalTasks;
    private int completedTasks;
    private double completionPercentage;
    private int teamMemberCount;
}
