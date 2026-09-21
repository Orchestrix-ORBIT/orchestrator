package com.example.core_api.chat;

import com.example.core_api.auth.User;
import com.example.core_api.auth.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for ChatMessageService (Chalani's assignment).
 *
 * SRS Coverage: FR-COLLAB-01 (Real-Time Project Chat),
 *               FR-COLLAB-03 (In-Transit Socket Encryption),
 *               NFR-SEC-01 (content stored encrypted as-is)
 *
 * SendChatMessageRequest record signature:
 *   (UUID projectId, UUID taskId, String content, String senderName, String tenantId)
 */
@ExtendWith(MockitoExtension.class)
class ChatMessageServiceTest {

    @Mock private ChatMessageRepository chatMessageRepository;
    @Mock private UserRepository        userRepository;
    @InjectMocks private ChatMessageService chatMessageService;

    private UUID projectId, senderId, messageId;
    private User sampleUser;
    private ChatMessage sampleMessage;

    @BeforeEach
    void setUp() {
        projectId = UUID.randomUUID();
        senderId  = UUID.randomUUID();
        messageId = UUID.randomUUID();
        sampleUser = new User();
        sampleUser.setId(senderId);
        sampleUser.setEmail("researcher@lab.com");
        sampleUser.setDisplayName("Dr. Silva");
        sampleMessage = ChatMessage.builder().id(messageId).projectId(projectId)
                .senderId(senderId).contentEncrypted("AES256_ENCRYPTED_CONTENT")
                .createdAt(OffsetDateTime.now()).build();
    }

    @Test
    void saveMessage_withKnownSenderIdAndNoSenderName_resolvesDisplayNameFromRepo() {
        // senderName=null triggers userRepository lookup (SRS FR-COLLAB-01)
        when(userRepository.findById(senderId)).thenReturn(Optional.of(sampleUser));
        when(chatMessageRepository.save(any(ChatMessage.class))).thenReturn(sampleMessage);

        // Record: (projectId, taskId, content, senderName, tenantId)
        SendChatMessageRequest req = new SendChatMessageRequest(
                projectId, null, "AES256_ENCRYPTED_CONTENT", null, null);

        ChatMessageResponse response = chatMessageService.saveMessage(req, senderId);
        assertThat(response.id()).isEqualTo(messageId);
        assertThat(response.senderName()).isEqualTo("Dr. Silva");
        assertThat(response.content()).isEqualTo("AES256_ENCRYPTED_CONTENT");
        verify(chatMessageRepository).save(any(ChatMessage.class));
    }

    @Test
    void saveMessage_whenDisplayNameIsNull_fallsBackToEmail() {
        User noDisplay = new User();
        noDisplay.setId(senderId); noDisplay.setEmail("researcher@lab.com"); noDisplay.setDisplayName(null);
        when(userRepository.findById(senderId)).thenReturn(Optional.of(noDisplay));
        when(chatMessageRepository.save(any())).thenReturn(sampleMessage);
        SendChatMessageRequest req = new SendChatMessageRequest(
                projectId, null, "AES256_ENCRYPTED_CONTENT", null, null);
        assertThat(chatMessageService.saveMessage(req, senderId).senderName()).isEqualTo("researcher@lab.com");
    }

    @Test
    void saveMessage_withExplicitSenderName_usesProvidedNameWithoutLookup() {
        // When senderName is provided, skip the DB lookup (performance optimisation)
        when(chatMessageRepository.save(any())).thenReturn(sampleMessage);
        SendChatMessageRequest req = new SendChatMessageRequest(
                projectId, null, "AES256_ENCRYPTED_CONTENT", "Dr. Silva", null);
        assertThat(chatMessageService.saveMessage(req, senderId).senderName()).isEqualTo("Dr. Silva");
        verify(userRepository, never()).findById(any());
    }

    @Test
    void saveMessage_persistsEncryptedContentAsIs() {
        // Content must reach the repository unchanged (SRS NFR-SEC-01)
        String cipher = "AES256_GCM::IV:abc123::CIPHER:xyz789";
        ChatMessage savedMsg = ChatMessage.builder().id(messageId).projectId(projectId)
                .senderId(senderId).contentEncrypted(cipher).createdAt(OffsetDateTime.now()).build();
        when(userRepository.findById(senderId)).thenReturn(Optional.of(sampleUser));
        when(chatMessageRepository.save(any())).thenReturn(savedMsg);
        SendChatMessageRequest req = new SendChatMessageRequest(projectId, null, cipher, null, null);
        assertThat(chatMessageService.saveMessage(req, senderId).content()).isEqualTo(cipher);
    }

    @Test
    void getProjectMessages_returnsMappedListInChronologicalOrder() {
        ChatMessage m1 = ChatMessage.builder().id(UUID.randomUUID()).projectId(projectId).senderId(senderId)
                .contentEncrypted("First").createdAt(OffsetDateTime.now().minusMinutes(5)).build();
        ChatMessage m2 = ChatMessage.builder().id(UUID.randomUUID()).projectId(projectId).senderId(senderId)
                .contentEncrypted("Second").createdAt(OffsetDateTime.now()).build();
        when(chatMessageRepository.findByProjectIdOrderByCreatedAtAsc(projectId)).thenReturn(List.of(m1, m2));
        when(userRepository.findById(senderId)).thenReturn(Optional.of(sampleUser));
        List<ChatMessageResponse> results = chatMessageService.getProjectMessages(projectId, null);
        assertThat(results).hasSize(2);
        assertThat(results.get(0).content()).isEqualTo("First");
        assertThat(results.get(1).content()).isEqualTo("Second");
        assertThat(results.get(0).senderName()).isEqualTo("Dr. Silva");
    }

    @Test
    void getProjectMessages_whenNoMessages_returnsEmptyList() {
        when(chatMessageRepository.findByProjectIdOrderByCreatedAtAsc(projectId)).thenReturn(List.of());
        assertThat(chatMessageService.getProjectMessages(projectId, null)).isEmpty();
        verify(userRepository, never()).findById(any());
    }

    @Test
    void getProjectMessages_whenSenderDeleted_fallsBackToResearcherLabel() {
        // Edge case: sender account deleted — graceful fallback (SRS FR-COLLAB-01)
        UUID deletedId = UUID.randomUUID();
        ChatMessage orphan = ChatMessage.builder().id(messageId).projectId(projectId).senderId(deletedId)
                .contentEncrypted("Orphan content").createdAt(OffsetDateTime.now()).build();
        when(chatMessageRepository.findByProjectIdOrderByCreatedAtAsc(projectId)).thenReturn(List.of(orphan));
        when(userRepository.findById(deletedId)).thenReturn(Optional.empty());
        List<ChatMessageResponse> results = chatMessageService.getProjectMessages(projectId, null);
        assertThat(results).hasSize(1);
        assertThat(results.get(0).senderName()).isEqualTo("Researcher");
    }
}
