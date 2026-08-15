package com.example.core_api.task;

import com.example.core_api.exception.ResourceNotFoundException;
import com.example.core_api.project.ProjectRepository;
import com.example.core_api.project.Project;
import com.example.core_api.researchteam.TeamMemberRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class TaskService {

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final TeamMemberRepository teamMemberRepository;

    public TaskService(TaskRepository taskRepository, ProjectRepository projectRepository, TeamMemberRepository teamMemberRepository) {
        this.taskRepository = taskRepository;
        this.projectRepository = projectRepository;
        this.teamMemberRepository = teamMemberRepository;
    }

    public TaskResponse createTask(UUID projectId, CreateTaskRequest request) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + projectId));

        if (request.getAssigneeId() != null && project.getTeamId() != null) {
            boolean isMember = teamMemberRepository.existsByTeamIdAndUserId(project.getTeamId(), request.getAssigneeId());
            if (!isMember) {
                throw new IllegalArgumentException("Assignee is not a member of the project's research team.");
            }
        }

        Task task = Task.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .priority(request.getPriority() != null ? request.getPriority() : TaskPriority.MEDIUM)
                .status(TaskStatus.TODO)
                .projectId(projectId)
                .assigneeId(request.getAssigneeId())
                .dueDate(request.getDueDate())
                .build();

        task = taskRepository.save(task);
        return mapToResponse(task);
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> getTasksByProject(UUID projectId) {
        return taskRepository.findAllByProjectId(projectId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> getTasksByProjectAndStatus(UUID projectId, TaskStatus status) {
        return taskRepository.findAllByProjectIdAndStatus(projectId, status).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> getTasksByProjectAndAssignee(UUID projectId, UUID assigneeId) {
        return taskRepository.findAllByProjectIdAndAssigneeId(projectId, assigneeId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TaskResponse getTaskById(UUID taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));
        return mapToResponse(task);
    }

    public TaskResponse updateTask(UUID taskId, UpdateTaskRequest request) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));

        if (request.getAssigneeId() != null && !request.getAssigneeId().equals(task.getAssigneeId())) {
            final UUID projectIdForQuery = task.getProjectId();
            Project project = projectRepository.findById(projectIdForQuery)
                    .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + projectIdForQuery));
            if (project.getTeamId() != null) {
                boolean isMember = teamMemberRepository.existsByTeamIdAndUserId(project.getTeamId(), request.getAssigneeId());
                if (!isMember) {
                    throw new IllegalArgumentException("Assignee is not a member of the project's research team.");
                }
            }
            task.setAssigneeId(request.getAssigneeId());
        }

        if (request.getTitle() != null) {
            task.setTitle(request.getTitle());
        }
        if (request.getDescription() != null) {
            task.setDescription(request.getDescription());
        }
        if (request.getStatus() != null) {
            task.setStatus(request.getStatus());
        }
        if (request.getPriority() != null) {
            task.setPriority(request.getPriority());
        }
        if (request.getDueDate() != null) {
            task.setDueDate(request.getDueDate());
        }

        task = taskRepository.save(task);
        return mapToResponse(task);
    }

    public void deleteTask(UUID taskId) {
        if (!taskRepository.existsById(taskId)) {
            throw new ResourceNotFoundException("Task not found with id: " + taskId);
        }
        taskRepository.deleteById(taskId);
    }

    private TaskResponse mapToResponse(Task task) {
        return TaskResponse.builder()
                .id(task.getId())
                .title(task.getTitle())
                .description(task.getDescription())
                .status(task.getStatus())
                .priority(task.getPriority())
                .projectId(task.getProjectId())
                .assigneeId(task.getAssigneeId())
                .dueDate(task.getDueDate())
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .build();
    }
}
