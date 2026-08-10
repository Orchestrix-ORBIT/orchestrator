package com.example.core_api.task;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
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

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TaskResponse createTask(
            @PathVariable UUID projectId,
            @Valid @RequestBody CreateTaskRequest request) {
        return taskService.createTask(projectId, request);
    }

    @GetMapping
    public List<TaskResponse> getTasksByProject(@PathVariable UUID projectId) {
        return taskService.getTasksByProject(projectId);
    }

    @GetMapping("/{taskId}")
    public TaskResponse getTaskById(
            @PathVariable UUID projectId, 
            @PathVariable UUID taskId) {
        return taskService.getTaskById(taskId);
    }

    @PatchMapping("/{taskId}")
    public TaskResponse updateTask(
            @PathVariable UUID projectId,
            @PathVariable UUID taskId,
            @RequestBody UpdateTaskRequest request) {
        return taskService.updateTask(taskId, request);
    }

    @DeleteMapping("/{taskId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTask(
            @PathVariable UUID projectId, 
            @PathVariable UUID taskId) {
        taskService.deleteTask(taskId);
    }
}
