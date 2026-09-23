package com.example.realtime_service.chat;

import com.example.realtime_service.auth.User;
import com.example.realtime_service.auth.UserRepository;
import com.example.realtime_service.multitenancy.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatMessageServiceTest {

    @Mock
    private ChatMessageRepository chatMessageRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ChatMessageService chatMessageService;

    private UUID projectId;
    private UUID taskId;
    private UUID senderId;
    private User sampleUser;

    @BeforeEach
    void setUp() {
        TenantContext.clear();
        projectId = UUID.randomUUID();
        taskId = UUID.randomUUID();
        senderId = UUID.randomUUID();

        sampleUser = User.builder()
                .id(senderId)
                .email("alice@orbit.io")
                .displayName("Dr. Alice")
                .build();
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void saveMessage_withValidTenantAndSenderId_savesMessageAndReturnsResponse() {
        SendChatMessageRequest request = new SendChatMessageRequest(
                projectId, taskId, "Hello team!", "Dr. Alice", "test-lab", null, null, null
        );

        ChatMessage savedMessage = ChatMessage.builder()
                .id(UUID.randomUUID())
                .projectId(projectId)
                .taskId(taskId)
                .senderId(senderId)
                .contentEncrypted("Hello team!")
                .createdAt(OffsetDateTime.now())
                .build();

        when(chatMessageRepository.save(any(ChatMessage.class))).thenReturn(savedMessage);

        ChatMessageResponse response = chatMessageService.saveMessage(request, senderId);

        assertThat(response).isNotNull();
        assertThat(response.projectId()).isEqualTo(projectId);
        assertThat(response.senderName()).isEqualTo("Dr. Alice");
        assertThat(response.content()).isEqualTo("Hello team!");
        assertThat(TenantContext.getCurrentTenant()).isEqualTo("org_test_lab");
        verify(chatMessageRepository, times(1)).save(any(ChatMessage.class));
    }

    @Test
    void saveMessage_withNullSenderName_fetchesDisplayNameFromRepository() {
        SendChatMessageRequest request = new SendChatMessageRequest(
                projectId, taskId, "Message content", null, "myorg", null, null, null
        );

        when(userRepository.findById(senderId)).thenReturn(Optional.of(sampleUser));

        ChatMessage savedMessage = ChatMessage.builder()
                .id(UUID.randomUUID())
                .projectId(projectId)
                .taskId(taskId)
                .senderId(senderId)
                .contentEncrypted("Message content")
                .createdAt(OffsetDateTime.now())
                .build();

        when(chatMessageRepository.save(any(ChatMessage.class))).thenReturn(savedMessage);

        ChatMessageResponse response = chatMessageService.saveMessage(request, senderId);

        assertThat(response.senderName()).isEqualTo("Dr. Alice");
        verify(userRepository, times(1)).findById(senderId);
    }

    @Test
    void saveMessage_withNullSenderIdAndName_defaultsToResearcher() {
        SendChatMessageRequest request = new SendChatMessageRequest(
                projectId, taskId, "Anon msg", "", null, null, null, null
        );

        when(userRepository.findByEmail("Researcher")).thenReturn(Optional.empty());
        when(userRepository.findAll()).thenReturn(List.of(sampleUser));

        ChatMessage savedMessage = ChatMessage.builder()
                .id(UUID.randomUUID())
                .projectId(projectId)
                .taskId(taskId)
                .senderId(senderId)
                .contentEncrypted("Anon msg")
                .createdAt(OffsetDateTime.now())
                .build();

        when(chatMessageRepository.save(any(ChatMessage.class))).thenReturn(savedMessage);

        ChatMessageResponse response = chatMessageService.saveMessage(request, null);

        assertThat(response.senderName()).isEqualTo("Researcher");
    }

    @Test
    void getProjectMessages_returnsOrderedMessages() {
        ChatMessage msg1 = ChatMessage.builder()
                .id(UUID.randomUUID())
                .projectId(projectId)
                .senderId(senderId)
                .contentEncrypted("First")
                .createdAt(OffsetDateTime.now().minusMinutes(5))
                .build();

        when(chatMessageRepository.findByProjectIdOrderByCreatedAtAsc(projectId))
                .thenReturn(List.of(msg1));
        when(userRepository.findById(senderId)).thenReturn(Optional.of(sampleUser));

        List<ChatMessageResponse> result = chatMessageService.getProjectMessages(projectId, "orbit-org");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).content()).isEqualTo("First");
        assertThat(result.get(0).senderName()).isEqualTo("Dr. Alice");
        assertThat(TenantContext.getCurrentTenant()).isEqualTo("org_orbit_org");
    }

    @Test
    void getProjectMessagesPaginated_fetchesAndReversesForChronologicalOrder() {
        ChatMessage msg1 = ChatMessage.builder()
                .id(UUID.randomUUID())
                .projectId(projectId)
                .senderId(senderId)
                .contentEncrypted("Older")
                .createdAt(OffsetDateTime.now().minusMinutes(10))
                .build();

        ChatMessage msg2 = ChatMessage.builder()
                .id(UUID.randomUUID())
                .projectId(projectId)
                .senderId(senderId)
                .contentEncrypted("Newer")
                .createdAt(OffsetDateTime.now().minusMinutes(1))
                .build();

        // Repository returns in DESC order: [msg2, msg1]
        when(chatMessageRepository.findByProjectId(eq(projectId), any(Pageable.class)))
                .thenReturn(List.of(msg2, msg1));
        when(userRepository.findById(senderId)).thenReturn(Optional.of(sampleUser));

        // Act - service reverses result for UI ASC presentation
        List<ChatMessageResponse> result = chatMessageService.getProjectMessagesPaginated(projectId, "myorg", 0, 20);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).content()).isEqualTo("Older");
        assertThat(result.get(1).content()).isEqualTo("Newer");
    }
}
