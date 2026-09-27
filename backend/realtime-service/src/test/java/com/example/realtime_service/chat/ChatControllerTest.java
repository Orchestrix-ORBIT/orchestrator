package com.example.realtime_service.chat;

import com.example.realtime_service.multitenancy.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatControllerTest {

    @Mock
    private ChatMessageService chatMessageService;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private ChatController chatController;

    private UUID projectId;
    private UUID senderId;

    @BeforeEach
    void setUp() {
        TenantContext.clear();
        projectId = UUID.randomUUID();
        senderId = UUID.randomUUID();
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void getMessages_validProjectId_returnsOkWithMessagesAndClearsTenantContext() {
        ChatMessageResponse msg = new ChatMessageResponse(
                UUID.randomUUID(), projectId, null, senderId, "Dr. Alice",
                "Hello", OffsetDateTime.now(), null, null, null, false, false
        );

        when(chatMessageService.getProjectMessagesPaginated(projectId, "orbit-lab", 0, 20))
                .thenReturn(List.of(msg));

        ResponseEntity<List<ChatMessageResponse>> response = chatController.getMessages(
                projectId.toString(), 0, 20, "orbit-lab"
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).content()).isEqualTo("Hello");
        assertThat(TenantContext.getCurrentTenant()).isNull(); // cleared in finally block
    }

    @Test
    void getMessages_invalidProjectId_returnsEmptyList() {
        ResponseEntity<List<ChatMessageResponse>> response = chatController.getMessages(
                "invalid-uuid-string", 0, 20, "orbit-lab"
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEmpty();
        assertThat(TenantContext.getCurrentTenant()).isNull();
        verifyNoInteractions(chatMessageService);
    }

    @Test
    void sendMessage_validPayload_savesMessageBroadcastsToStompTopicAndClearsTenantContext() {
        SendChatMessageRequest request = new SendChatMessageRequest(
                projectId, null, "Live chat broadcast", "Bob", "myorg", null, null, null
        );

        ChatMessageResponse responsePayload = new ChatMessageResponse(
                UUID.randomUUID(), projectId, null, senderId, "Bob",
                "Live chat broadcast", OffsetDateTime.now(), null, null, null, false, false
        );

        when(chatMessageService.saveMessage(request, null)).thenReturn(responsePayload);

        chatController.sendMessage(request);

        verify(chatMessageService, times(1)).saveMessage(request, null);
        verify(messagingTemplate, times(1)).convertAndSend(
                eq("/topic/tenant/myorg/project/" + projectId),
                eq(responsePayload)
        );
        assertThat(TenantContext.getCurrentTenant()).isNull(); // cleared in finally block
    }
}
