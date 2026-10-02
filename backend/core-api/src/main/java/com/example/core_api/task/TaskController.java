package com.example.core_api.task;

import com.example.core_api.auth.User;
import com.example.core_api.exception.ResourceNotFoundException;
import org.springframework.security.access.AccessDeniedException;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects/{projectId}/tasks")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    // TenantFilter (Order=1) sets TenantContext for the full request lifecycle.
    // No manual TenantContext management needed in any controller method.

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TaskResponse createTask(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID projectId,
            @Valid @RequestBody CreateTaskRequest request) {
        requireAuthenticated(currentUser);
        return taskService.createTask(projectId, request);
    }

    @GetMapping
    public List<TaskResponse> getTasksByProject(
            @PathVariable UUID projectId,
            @RequestParam(required = false) TaskStatus status,
            @RequestParam(required = false) UUID assigneeId) {
        if (status != null) {
            return taskService.getTasksByProjectAndStatus(projectId, status);
        } else if (assigneeId != null) {
            return taskService.getTasksByProjectAndAssignee(projectId, assigneeId);
        }
        return taskService.getTasksByProject(projectId);
    }

    @GetMapping("/{taskId}")
    public TaskResponse getTaskById(
            @PathVariable UUID projectId,
            @PathVariable UUID taskId) {
        return taskInProject(projectId, taskId);
    }

    @PatchMapping("/{taskId}")
    public TaskResponse updateTask(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID projectId,
            @PathVariable UUID taskId,
            @RequestBody UpdateTaskRequest request) {
        requireAuthenticated(currentUser);
        taskInProject(projectId, taskId);
        return taskService.updateTask(taskId, request, currentUser);
    }

    @DeleteMapping("/{taskId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTask(
            @AuthenticationPrincipal User currentUser,
            @PathVariable UUID projectId,
            @PathVariable UUID taskId) {
        requireAuthenticated(currentUser);
        taskInProject(projectId, taskId);
        taskService.deleteTask(taskId);
    }

    private void requireAuthenticated(User currentUser) {
        if (currentUser == null) throw new AccessDeniedException("Authentication required");
    }

    private TaskResponse taskInProject(UUID projectId, UUID taskId) {
        TaskResponse task = taskService.getTaskById(taskId);
        if (!projectId.equals(task.getProjectId())) {
            throw new ResourceNotFoundException("Task not found in project: " + projectId);
        }
        return task;
    }
}
