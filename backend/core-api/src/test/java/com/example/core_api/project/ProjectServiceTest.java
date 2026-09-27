package com.example.core_api.project;

import com.example.core_api.exception.ResourceNotFoundException;
import com.example.core_api.researchteam.TeamMember;
import com.example.core_api.researchteam.TeamMemberRepository;
import com.example.core_api.task.Task;
import com.example.core_api.task.TaskPriority;
import com.example.core_api.task.TaskRepository;
import com.example.core_api.task.TaskStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProjectServiceTest {

    // ── Fakes ─────────────────────────────────────────────────────────────────
    // ProjectService depends on three repositories. We mock all three so no
    // real database is involved during any test.
    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private TeamMemberRepository teamMemberRepository;

    // ── Real class under test ─────────────────────────────────────────────────
    // Mockito creates a real ProjectService and injects the three mocks above
    // into its constructor automatically.
    @InjectMocks
    private ProjectService projectService;

    // ── Shared test data ──────────────────────────────────────────────────────
    private UUID projectId;
    private UUID ownerId;
    private UUID teamId;
    private Project sampleProject;

    // Runs before EVERY @Test — gives each test a completely fresh, clean state
    @BeforeEach
    void setUp() {
        projectId = UUID.randomUUID();
        ownerId   = UUID.randomUUID();
        teamId    = UUID.randomUUID();

        sampleProject = Project.builder()
                .id(projectId)
                .name("Quantum Research Initiative")
                .description("Exploring quantum computing applications")
                .status(ProjectStatus.ACTIVE)
                .ownerId(ownerId)
                .teamId(teamId)
                .build();
    }

    // =========================================================================
    // createProject() tests
    // =========================================================================

    @Test
    void createProject_savesProjectAndReturnsResponse() {
        // ARRANGE
        // When save() is called with any Project, return our sampleProject
        // (simulates the DB assigning an ID and returning the persisted entity)
        when(projectRepository.save(any(Project.class))).thenReturn(sampleProject);

        CreateProjectRequest request = new CreateProjectRequest();
        request.setName("Quantum Research Initiative");
        request.setDescription("Exploring quantum computing applications");
        request.setTeamId(teamId);

        // ACT — call the real createProject() method
        ProjectResponse response = projectService.createProject(request, ownerId);

        // ASSERT — verify the response fields are correctly mapped
        assertThat(response).isNotNull();
        assertThat(response.getName()).isEqualTo("Quantum Research Initiative");
        assertThat(response.getStatus()).isEqualTo(ProjectStatus.ACTIVE); // default status
        assertThat(response.getOwnerId()).isEqualTo(ownerId);
        assertThat(response.getTeamId()).isEqualTo(teamId);

        // Confirm save() was called exactly once — the project must have been persisted
        verify(projectRepository, times(1)).save(any(Project.class));
    }

    @Test
    void createProject_withoutTeam_stillSavesSuccessfully() {
        // A project can be created before a team is assigned
        Project projectWithoutTeam = Project.builder()
                .id(projectId)
                .name("Solo Research")
                .status(ProjectStatus.ACTIVE)
                .ownerId(ownerId)
                .teamId(null) // no team yet
                .build();
        when(projectRepository.save(any(Project.class))).thenReturn(projectWithoutTeam);

        CreateProjectRequest request = new CreateProjectRequest();
        request.setName("Solo Research");
        // teamId intentionally left null

        ProjectResponse response = projectService.createProject(request, ownerId);

        assertThat(response.getTeamId()).isNull();
        verify(projectRepository, times(1)).save(any(Project.class));
    }

    // =========================================================================
    // getAllProjects() tests
    // =========================================================================

    @Test
    void getAllProjects_returnsMappedList() {
        // ARRANGE — fake repo returns a list with one project
        when(projectRepository.findAll()).thenReturn(List.of(sampleProject));

        // ACT
        List<ProjectResponse> results = projectService.getAllProjects();

        // ASSERT
        assertThat(results).hasSize(1);
        assertThat(results.get(0).getId()).isEqualTo(projectId);
        assertThat(results.get(0).getName()).isEqualTo("Quantum Research Initiative");
    }

    @Test
    void getAllProjects_whenNoneExist_returnsEmptyList() {
        when(projectRepository.findAll()).thenReturn(List.of());

        List<ProjectResponse> results = projectService.getAllProjects();

        assertThat(results).isEmpty();
    }

    // =========================================================================
    // getProjectById() tests
    // =========================================================================

    @Test
    void getProjectById_whenFound_returnsResponse() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));

        ProjectResponse response = projectService.getProjectById(projectId);

        assertThat(response.getId()).isEqualTo(projectId);
        assertThat(response.getName()).isEqualTo("Quantum Research Initiative");
    }

    @Test
    void getProjectById_whenNotFound_throwsResourceNotFoundException() {
        // Fake repo returns nothing — simulates project not in DB
        when(projectRepository.findById(projectId)).thenReturn(Optional.empty());

        // The .orElseThrow() inside getProjectById() should fire
        assertThatThrownBy(() -> projectService.getProjectById(projectId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining(projectId.toString());
    }

    // =========================================================================
    // deleteProject() tests
    // =========================================================================

    @Test
    void deleteProject_whenExists_deletesSuccessfully() {
        when(projectRepository.existsById(projectId)).thenReturn(true);

        // deleteProject() returns void, so we just confirm no exception is thrown
        projectService.deleteProject(projectId);

        // Verify that deleteById was actually called with the correct ID
        verify(projectRepository, times(1)).deleteById(projectId);
    }

    @Test
    void deleteProject_whenNotFound_throwsResourceNotFoundException() {
        when(projectRepository.existsById(projectId)).thenReturn(false);

        assertThatThrownBy(() -> projectService.deleteProject(projectId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining(projectId.toString());

        // deleteById must NEVER be called if the project doesn't exist
        verify(projectRepository, never()).deleteById(any());
    }

    // =========================================================================
    // getProjectSummary() tests
    // =========================================================================

    @Test
    void getProjectSummary_calculatesCompletionPercentageCorrectly() {
        // ARRANGE — project exists with 4 tasks: 2 DONE, 1 TODO, 1 IN_PROGRESS
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));

        Task doneTask1 = Task.builder().status(TaskStatus.DONE)
                .priority(TaskPriority.MEDIUM).projectId(projectId).title("T1").build();
        Task doneTask2 = Task.builder().status(TaskStatus.DONE)
                .priority(TaskPriority.MEDIUM).projectId(projectId).title("T2").build();
        Task todoTask  = Task.builder().status(TaskStatus.TODO)
                .priority(TaskPriority.MEDIUM).projectId(projectId).title("T3").build();
        Task inProgTask = Task.builder().status(TaskStatus.IN_PROGRESS)
                .priority(TaskPriority.MEDIUM).projectId(projectId).title("T4").build();

        when(taskRepository.findAllByProjectId(projectId))
                .thenReturn(List.of(doneTask1, doneTask2, todoTask, inProgTask));

        // Simulate 3 team members
        when(teamMemberRepository.findAllByTeamId(teamId))
                .thenReturn(List.of(mock(TeamMember.class), mock(TeamMember.class), mock(TeamMember.class)));

        // ACT
        ProjectSummaryResponse summary = projectService.getProjectSummary(projectId);

        // ASSERT — 2 of 4 tasks done = 50%
        assertThat(summary.getTotalTasks()).isEqualTo(4);
        assertThat(summary.getCompletedTasks()).isEqualTo(2);
        assertThat(summary.getCompletionPercentage()).isEqualTo(50.0);
        assertThat(summary.getTeamMemberCount()).isEqualTo(3);
    }

    @Test
    void getProjectSummary_whenNoTasks_completionPercentageIsZero() {
        // Edge case: project with no tasks at all — must not divide by zero!
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        when(taskRepository.findAllByProjectId(projectId)).thenReturn(List.of());
        when(teamMemberRepository.findAllByTeamId(teamId)).thenReturn(List.of());

        ProjectSummaryResponse summary = projectService.getProjectSummary(projectId);

        assertThat(summary.getTotalTasks()).isEqualTo(0);
        assertThat(summary.getCompletionPercentage()).isEqualTo(0.0);
    }

    @Test
    void getProjectSummary_whenProjectHasNoTeam_teamCountIsZero() {
        // Project with teamId = null should skip the team member count query
        Project projectWithoutTeam = Project.builder()
                .id(projectId)
                .name("Unassigned Project")
                .status(ProjectStatus.ACTIVE)
                .ownerId(ownerId)
                .teamId(null) // no team
                .build();
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(projectWithoutTeam));
        when(taskRepository.findAllByProjectId(projectId)).thenReturn(List.of());

        ProjectSummaryResponse summary = projectService.getProjectSummary(projectId);

        assertThat(summary.getTeamMemberCount()).isEqualTo(0);
        // findAllByTeamId should NEVER be called when teamId is null
        verify(teamMemberRepository, never()).findAllByTeamId(any());
    }

    @Test
    void getProjectSummary_whenProjectNotFound_throwsResourceNotFoundException() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectService.getProjectSummary(projectId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining(projectId.toString());
    }
}
