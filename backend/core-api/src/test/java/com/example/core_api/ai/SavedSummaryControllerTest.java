package com.example.core_api.ai;

import com.example.core_api.auth.User;
import com.example.core_api.project.ProjectAccess;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class SavedSummaryControllerTest {
    private final SavedSummaryRepository repository = mock(SavedSummaryRepository.class);
    private final ProjectAccess access = mock(ProjectAccess.class);
    private final SavedSummaryController controller = new SavedSummaryController(repository, access);

    @Test
    void savesOnlyToProjectsTheUserCanAccess() {
        User user = mock(User.class);
        UUID projectId = UUID.randomUUID();
        SaveSummaryRequest request = new SaveSummaryRequest(projectId, "Project chat summary", "Summary",
                List.of("Point"), List.of("Action"), 2, "stuff");
        when(access.canAccess(user, projectId)).thenReturn(true);
        when(repository.save(any(SavedSummary.class))).thenAnswer(call -> call.getArgument(0));

        SavedSummaryResponse response = controller.save(user, request);
        assertThat(response.projectId()).isEqualTo(projectId);
        assertThat(response.keyPoints()).containsExactly("Point");
        assertThat(response.actionItems()).containsExactly("Action");

        when(access.canAccess(user, projectId)).thenReturn(false);
        assertThatThrownBy(() -> controller.save(user, request)).isInstanceOf(AccessDeniedException.class);
        verify(repository, times(1)).save(any(SavedSummary.class));
    }

    @Test
    void listsOnlySummariesFromAccessibleProjects() {
        User user = mock(User.class);
        SavedSummary visible = new SavedSummary();
        visible.setProjectId(UUID.randomUUID());
        visible.setSummary("Visible");
        SavedSummary hidden = new SavedSummary();
        hidden.setProjectId(UUID.randomUUID());
        hidden.setSummary("Hidden");
        when(repository.findAllByOrderByProcessedAtDesc()).thenReturn(List.of(visible, hidden));
        when(access.canAccess(user, visible.getProjectId())).thenReturn(true);

        assertThat(controller.list(user)).extracting(SavedSummaryResponse::summary).containsExactly("Visible");
        assertThatThrownBy(() -> controller.list(null)).isInstanceOf(AccessDeniedException.class);
    }
}
