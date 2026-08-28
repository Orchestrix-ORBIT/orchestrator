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
            @RequestHeader(value = "X-Tenant-ID", required = false, defaultValue = "myorg") String tenantId,
            @PathVariable UUID projectId,
            @Valid @RequestBody CreateTaskRequest request) {
        String schemaName = "org_" + (tenantId != null ? tenantId : "myorg").toLowerCase().replace("-", "_");
        com.example.core_api.multitenancy.TenantContext.setCurrentTenant(schemaName);
        try {
            return taskService.createTask(projectId, request);
        } finally {
            com.example.core_api.multitenancy.TenantContext.clear();
        }
    }

    @GetMapping
    public List<TaskResponse> getTasksByProject(
            @RequestHeader(value = "X-Tenant-ID", required = false, defaultValue = "myorg") String tenantId,
            @PathVariable UUID projectId,
            @RequestParam(required = false) TaskStatus status,
            @RequestParam(required = false) UUID assigneeId) {
        
        String schemaName = "org_" + (tenantId != null ? tenantId : "myorg").toLowerCase().replace("-", "_");
        com.example.core_api.multitenancy.TenantContext.setCurrentTenant(schemaName);
        try {
            if (status != null) {
                return taskService.getTasksByProjectAndStatus(projectId, status);
            } else if (assigneeId != null) {
                return taskService.getTasksByProjectAndAssignee(projectId, assigneeId);
            }
            return taskService.getTasksByProject(projectId);
        } finally {
            com.example.core_api.multitenancy.TenantContext.clear();
        }
    }

    @GetMapping("/{taskId}")
    public TaskResponse getTaskById(
            @PathVariable UUID projectId, 
            @PathVariable UUID taskId) {
        return taskService.getTaskById(taskId);
    }

    @PatchMapping("/{taskId}")
    public TaskResponse updateTask(
            @RequestHeader(value = "X-Tenant-ID", required = false, defaultValue = "myorg") String tenantId,
            @PathVariable UUID projectId,
            @PathVariable UUID taskId,
            @RequestBody UpdateTaskRequest request) {
        String schemaName = "org_" + (tenantId != null ? tenantId : "myorg").toLowerCase().replace("-", "_");
        com.example.core_api.multitenancy.TenantContext.setCurrentTenant(schemaName);
        try {
            return taskService.updateTask(taskId, request);
        } finally {
            com.example.core_api.multitenancy.TenantContext.clear();
        }
    }

    @DeleteMapping("/{taskId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTask(
            @RequestHeader(value = "X-Tenant-ID", required = false, defaultValue = "myorg") String tenantId,
            @PathVariable UUID projectId, 
            @PathVariable UUID taskId) {
        String schemaName = "org_" + (tenantId != null ? tenantId : "myorg").toLowerCase().replace("-", "_");
        com.example.core_api.multitenancy.TenantContext.setCurrentTenant(schemaName);
        try {
            taskService.deleteTask(taskId);
        } finally {
            com.example.core_api.multitenancy.TenantContext.clear();
        }
    }
}
