package com.example.core_api.ai;

import com.example.core_api.auth.User;
import com.example.core_api.project.ProjectAccess;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class SummaryControllerTest {
    private final ProjectAccess access = mock(ProjectAccess.class);
    private final SummaryProxy proxy = mock(SummaryProxy.class);
    private final SummaryController controller = new SummaryController(access, proxy);

    @Test
    void forwardsOnlyForAnAccessibleProject() {
        User user = mock(User.class);
        SummarizeRequest request = new SummarizeRequest(
                List.of(new SummarizeRequest.Message("Alice", "Hello", null)), UUID.randomUUID());
        when(access.canAccess(user, request.projectId())).thenReturn(true);
        when(proxy.summarize(request, "acme")).thenReturn(ResponseEntity.ok("{\"summary\":\"Hello\"}"));

        assertThat(controller.summarize(user, "acme", request).getStatusCode().is2xxSuccessful()).isTrue();
        verify(proxy).summarize(request, "acme");

        when(access.canAccess(user, request.projectId())).thenReturn(false);
        assertThatThrownBy(() -> controller.summarize(user, "acme", request))
                .isInstanceOf(AccessDeniedException.class);
        verifyNoMoreInteractions(proxy);
    }
}
