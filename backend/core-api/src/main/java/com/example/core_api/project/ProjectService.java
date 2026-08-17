package com.example.core_api.project;

import com.example.core_api.exception.ResourceNotFoundException;
import com.example.core_api.task.TaskRepository;
import com.example.core_api.task.TaskStatus;
import com.example.core_api.task.Task;
import com.example.core_api.researchteam.TeamMemberRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class ProjectService {
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final TeamMemberRepository teamMemberRepository;

    public ProjectService(ProjectRepository projectRepository, TaskRepository taskRepository, TeamMemberRepository teamMemberRepository) {
        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;
        this.teamMemberRepository = teamMemberRepository;
    }

    public ProjectResponse createProject(CreateProjectRequest request, UUID ownerId) {
        Project project = Project.builder()
                .name(request.getName())
                .description(request.getDescription())
                .status(ProjectStatus.ACTIVE)
                .ownerId(ownerId)
                .teamId(request.getTeamId())
                .build();
                
        project = projectRepository.save(project);
        return mapToResponse(project);
    }

    @Transactional(readOnly = true)
    public List<ProjectResponse> getAllProjects() {
        return projectRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProjectResponse getProjectById(UUID id) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + id));
        return mapToResponse(project);
    }

    public void deleteProject(UUID id) {
        if (!projectRepository.existsById(id)) {
            throw new ResourceNotFoundException("Project not found with id: " + id);
        }
        projectRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public ProjectSummaryResponse getProjectSummary(UUID projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + projectId));

        List<Task> tasks = taskRepository.findAllByProjectId(projectId);
        int totalTasks = tasks.size();
        int completedTasks = (int) tasks.stream().filter(t -> t.getStatus() == TaskStatus.DONE).count();
        double completionPercentage = totalTasks == 0 ? 0.0 : ((double) completedTasks / totalTasks) * 100.0;

        int teamMemberCount = 0;
        if (project.getTeamId() != null) {
            teamMemberCount = teamMemberRepository.findAllByTeamId(project.getTeamId()).size();
        }

        return ProjectSummaryResponse.builder()
                .totalTasks(totalTasks)
                .completedTasks(completedTasks)
                .completionPercentage(completionPercentage)
                .teamMemberCount(teamMemberCount)
                .build();
    }

    private ProjectResponse mapToResponse(Project project) {
        return ProjectResponse.builder()
                .id(project.getId())
                .name(project.getName())
                .description(project.getDescription())
                .status(project.getStatus())
                .ownerId(project.getOwnerId())
                .teamId(project.getTeamId())
                .createdAt(project.getCreatedAt())
                .build();
    }
}
