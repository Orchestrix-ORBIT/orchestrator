package com.example.core_api.task;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, UUID> {
    List<Task> findAllByProjectId(UUID projectId);
    List<Task> findAllByProjectIdAndStatus(UUID projectId, TaskStatus status);
    List<Task> findAllByProjectIdAndAssigneeId(UUID projectId, UUID assigneeId);
}
