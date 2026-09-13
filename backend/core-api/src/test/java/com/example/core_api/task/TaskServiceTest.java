package com.example.core_api.task;

import com.example.core_api.auth.User;
import com.example.core_api.auth.UserRole;
import com.example.core_api.exception.ResourceNotFoundException;
import com.example.core_api.project.Project;
import com.example.core_api.project.ProjectRepository;
import com.example.core_api.researchteam.TeamMemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

// ─────────────────────────────────────────────────────────────────────────────
// @ExtendWith(MockitoExtension.class)
//   → Activates Mockito for this test class.
//     Instead of a real Spring context (which would need a database), Mockito
//     creates fake (mock) versions of our dependencies so we can control their
//     behaviour in each test.
// ─────────────────────────────────────────────────────────────────────────────
@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    // ─────────────────────────────────────────────────────────────────────────
    // @Mock  → Creates a "fake" version of the class.
    //          When a method on a mock is called it does NOTHING by default
    //          (returns null / 0 / false / empty).  We use when(...) to
    //          program specific behaviour for each test case.
    // ─────────────────────────────────────────────────────────────────────────
    @Mock
    private TaskRepository taskRepository;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private TeamMemberRepository teamMemberRepository;

    // ─────────────────────────────────────────────────────────────────────────
    // @InjectMocks → Creates a REAL instance of TaskService and automatically
    //               injects the @Mock fields above into its constructor.
    //               So TaskService gets our fake repos, not real database ones.
    // ─────────────────────────────────────────────────────────────────────────
    @InjectMocks
    private TaskService taskService;

    // ── Shared test data ──────────────────────────────────────────────────────
    private UUID projectId;
    private UUID taskId;
    private UUID assigneeId;
    private UUID teamId;
    private Project sampleProject;
    private Task sampleTask;

    // ─────────────────────────────────────────────────────────────────────────
    // @BeforeEach → This method runs BEFORE every single @Test method below.
    //              Use it to set up fresh, shared test objects so each test
    //              starts from a clean, predictable state.
    // ─────────────────────────────────────────────────────────────────────────
    @BeforeEach
    void setUp() {
        projectId  = UUID.randomUUID();
        taskId     = UUID.randomUUID();
        assigneeId = UUID.randomUUID();
        teamId     = UUID.randomUUID();

        // Build a sample Project that the fake projectRepository will return
        sampleProject = Project.builder()
                .id(projectId)
                .teamId(teamId)
                .build();

        // Build a sample Task that the fake taskRepository will return
        sampleTask = Task.builder()
                .id(taskId)
                .title("Write unit tests")
                .description("Cover TaskService with JUnit 5")
                .status(TaskStatus.TODO)
                .priority(TaskPriority.HIGH)
                .projectId(projectId)
                .assigneeId(assigneeId)
                .dueDate(LocalDate.now().plusDays(7))
                .build();
    }

    // =========================================================================
    // createTask() tests
    // =========================================================================

    @Test
    void createTask_whenProjectExists_andAssigneeIsTeamMember_savesAndReturnsResponse() {
        // ── ARRANGE ───────────────────────────────────────────────────────────
        // Tell the fake projectRepository: "when findById(projectId) is called,
        // return Optional.of(sampleProject) instead of hitting the database."
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));

        // Tell the fake teamMemberRepository: "the assignee IS a member"
        when(teamMemberRepository.existsByTeamIdAndUserId(teamId, assigneeId)).thenReturn(true);

        // Tell the fake taskRepository: "when save() is called with any Task,
        // return sampleTask" (simulates the DB persisting and returning the entity)
        when(taskRepository.save(any(Task.class))).thenReturn(sampleTask);

        CreateTaskRequest request = new CreateTaskRequest();
        request.setTitle("Write unit tests");
        request.setDescription("Cover TaskService with JUnit 5");
        request.setPriority(TaskPriority.HIGH);
        request.setAssigneeId(assigneeId);
        request.setDueDate(LocalDate.now().plusDays(7));

        // ── ACT ───────────────────────────────────────────────────────────────
        // Call the REAL method we are testing (not a mock)
        TaskResponse response = taskService.createTask(projectId, request);

        // ── ASSERT ────────────────────────────────────────────────────────────
        // assertThat() from AssertJ gives us a fluent, readable way to check values
        assertThat(response).isNotNull();
        assertThat(response.getTitle()).isEqualTo("Write unit tests");
        assertThat(response.getPriority()).isEqualTo(TaskPriority.HIGH);
        assertThat(response.getStatus()).isEqualTo(TaskStatus.TODO);   // default status

        // verify() checks that a mock method was actually called (and how many times)
        verify(taskRepository, times(1)).save(any(Task.class));
    }

    @Test
    void createTask_whenProjectNotFound_throwsResourceNotFoundException() {
        // Tell the fake projectRepository: "return nothing (project does not exist)"
        when(projectRepository.findById(projectId)).thenReturn(Optional.empty());

        CreateTaskRequest request = new CreateTaskRequest();
        request.setTitle("Orphan task");

        // assertThatThrownBy verifies that a specific exception is thrown
        assertThatThrownBy(() -> taskService.createTask(projectId, request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining(projectId.toString());

        // The task must NEVER be saved when the project is missing
        verify(taskRepository, never()).save(any());
    }

    @Test
    void createTask_whenAssigneeNotTeamMember_throwsIllegalArgumentException() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        // The assignee is NOT in the team
        when(teamMemberRepository.existsByTeamIdAndUserId(teamId, assigneeId)).thenReturn(false);

        CreateTaskRequest request = new CreateTaskRequest();
        request.setTitle("Bad assignee task");
        request.setAssigneeId(assigneeId);

        assertThatThrownBy(() -> taskService.createTask(projectId, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("not a member");

        verify(taskRepository, never()).save(any());
    }

    @Test
    void createTask_withNullPriority_defaultsToMedium() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(sampleProject));
        // No assignee → skip team-membership check
        Task savedTask = Task.builder()
                .id(taskId)
                .title("Default priority task")
                .status(TaskStatus.TODO)
                .priority(TaskPriority.MEDIUM)  // the default
                .projectId(projectId)
                .build();
        when(taskRepository.save(any(Task.class))).thenReturn(savedTask);

        CreateTaskRequest request = new CreateTaskRequest();
        request.setTitle("Default priority task");
        // priority intentionally left null

        TaskResponse response = taskService.createTask(projectId, request);

        assertThat(response.getPriority()).isEqualTo(TaskPriority.MEDIUM);
    }

    // =========================================================================
    // getTasksByProject() tests
    // =========================================================================

    @Test
    void getTasksByProject_returnsMappedList() {
        when(taskRepository.findAllByProjectId(projectId)).thenReturn(List.of(sampleTask));

        List<TaskResponse> results = taskService.getTasksByProject(projectId);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getId()).isEqualTo(taskId);
        assertThat(results.get(0).getProjectId()).isEqualTo(projectId);
    }

    @Test
    void getTasksByProject_whenNoTasks_returnsEmptyList() {
        when(taskRepository.findAllByProjectId(projectId)).thenReturn(List.of());

        List<TaskResponse> results = taskService.getTasksByProject(projectId);

        assertThat(results).isEmpty();
    }

    // =========================================================================
    // getTaskById() tests
    // =========================================================================

    @Test
    void getTaskById_whenFound_returnsResponse() {
        when(taskRepository.findById(taskId)).thenReturn(Optional.of(sampleTask));

        TaskResponse response = taskService.getTaskById(taskId);

        assertThat(response.getId()).isEqualTo(taskId);
        assertThat(response.getTitle()).isEqualTo("Write unit tests");
    }

    @Test
    void getTaskById_whenNotFound_throwsResourceNotFoundException() {
        when(taskRepository.findById(taskId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> taskService.getTaskById(taskId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining(taskId.toString());
    }

    // =========================================================================
    // updateTask() tests
    // =========================================================================

    @Test
    void updateTask_asAdmin_canAcceptTask() {
        // Admin user has no role restrictions in our service
        User adminUser = User.builder()
                .id(UUID.randomUUID())
                .role(UserRole.ADMIN)
                .build();

        when(taskRepository.findById(taskId)).thenReturn(Optional.of(sampleTask));
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateTaskRequest request = new UpdateTaskRequest();
        request.setStatus(TaskStatus.ACCEPTED);

        TaskResponse response = taskService.updateTask(taskId, request, adminUser);

        assertThat(response.getStatus()).isEqualTo(TaskStatus.ACCEPTED);
        verify(taskRepository).save(any(Task.class));
    }

    @Test
    void updateTask_asResearcher_cannotSetStatusToAccepted_throwsAccessDeniedException() {
        // MEMBER and GUEST are "researcher" roles — they cannot accept tasks
        User researcher = User.builder()
                .id(UUID.randomUUID())
                .role(UserRole.MEMBER)
                .build();

        when(taskRepository.findById(taskId)).thenReturn(Optional.of(sampleTask));

        UpdateTaskRequest request = new UpdateTaskRequest();
        request.setStatus(TaskStatus.ACCEPTED);

        assertThatThrownBy(() -> taskService.updateTask(taskId, request, researcher))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("not allowed to accept");

        verify(taskRepository, never()).save(any());
    }

    @Test
    void updateTask_asResearcher_cannotModifyAlreadyAcceptedTask() {
        // The task is already accepted
        sampleTask.setStatus(TaskStatus.ACCEPTED);

        User researcher = User.builder()
                .id(UUID.randomUUID())
                .role(UserRole.GUEST)
                .build();

        when(taskRepository.findById(taskId)).thenReturn(Optional.of(sampleTask));

        UpdateTaskRequest request = new UpdateTaskRequest();
        request.setTitle("Sneaky title change");

        assertThatThrownBy(() -> taskService.updateTask(taskId, request, researcher))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("cannot be modified");

        verify(taskRepository, never()).save(any());
    }

    @Test
    void updateTask_updatesOnlyProvidedFields() {
        when(taskRepository.findById(taskId)).thenReturn(Optional.of(sampleTask));
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateTaskRequest request = new UpdateTaskRequest();
        request.setTitle("Updated Title");
        // description, status, priority, dueDate all left null — should not change

        TaskResponse response = taskService.updateTask(taskId, request, null);

        assertThat(response.getTitle()).isEqualTo("Updated Title");
        assertThat(response.getDescription()).isEqualTo("Cover TaskService with JUnit 5"); // unchanged
        assertThat(response.getStatus()).isEqualTo(TaskStatus.TODO);                       // unchanged
    }

    @Test
    void updateTask_whenTaskNotFound_throwsResourceNotFoundException() {
        when(taskRepository.findById(taskId)).thenReturn(Optional.empty());

        UpdateTaskRequest request = new UpdateTaskRequest();
        request.setTitle("Ghost update");

        assertThatThrownBy(() -> taskService.updateTask(taskId, request, null))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining(taskId.toString());
    }

    // =========================================================================
    // deleteTask() tests
    // =========================================================================

    @Test
    void deleteTask_whenExists_deletesSuccessfully() {
        when(taskRepository.existsById(taskId)).thenReturn(true);

        // Should NOT throw
        taskService.deleteTask(taskId);

        // Confirm the real delete was called exactly once
        verify(taskRepository, times(1)).deleteById(taskId);
    }

    @Test
    void deleteTask_whenNotFound_throwsResourceNotFoundException() {
        when(taskRepository.existsById(taskId)).thenReturn(false);

        assertThatThrownBy(() -> taskService.deleteTask(taskId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining(taskId.toString());

        // deleteById must NEVER be called if the task does not exist
        verify(taskRepository, never()).deleteById(any());
    }
}
