package com.example.core_api.chat;

import com.example.core_api.auth.UserRepository;
import com.example.core_api.multitenancy.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatMessageService {

    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;

    @Transactional
    public ChatMessageResponse saveMessage(SendChatMessageRequest request, UUID senderId) {
        if (request.tenantId() != null && !request.tenantId().isBlank()) {
            String schemaName = "org_" + request.tenantId().toLowerCase().replace("-", "_");
            TenantContext.setCurrentTenant(schemaName);
        }

        String displayName = request.senderName();
        if (senderId != null && (displayName == null || displayName.isBlank())) {
            displayName = userRepository.findById(senderId)
                    .map(u -> u.getDisplayName() != null ? u.getDisplayName() : u.getEmail())
                    .orElse("Anonymous");
        } else if (displayName == null || displayName.isBlank()) {
            displayName = "Researcher";
        }

        UUID validSenderId = senderId;
        if (validSenderId == null) {
            validSenderId = userRepository.findByEmail(displayName)
                    .map(u -> u.getId())
                    .orElseGet(() -> userRepository.findAll().stream().findFirst().map(u -> u.getId()).orElse(UUID.randomUUID()));
        }

        ChatMessage message = ChatMessage.builder()
                .projectId(request.projectId())
                .taskId(request.taskId())
                .senderId(validSenderId)
                .contentEncrypted(request.content())
                .createdAt(OffsetDateTime.now())
                .build();

        ChatMessage saved = chatMessageRepository.save(message);

        return new ChatMessageResponse(
                saved.getId(),
                saved.getProjectId(),
                saved.getTaskId(),
                saved.getSenderId(),
                displayName,
                saved.getContentEncrypted(),
                saved.getCreatedAt()
        );
    }

    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getProjectMessages(UUID projectId, String tenantId) {
        if (tenantId != null && !tenantId.isBlank()) {
            String schemaName = "org_" + tenantId.toLowerCase().replace("-", "_");
            TenantContext.setCurrentTenant(schemaName);
        }

        return chatMessageRepository.findByProjectIdOrderByCreatedAtAsc(projectId)
                .stream()
                .map(msg -> {
                    String senderName = userRepository.findById(msg.getSenderId())
                            .map(u -> u.getDisplayName() != null ? u.getDisplayName() : u.getEmail())
                            .orElse("Researcher");
                    return new ChatMessageResponse(
                            msg.getId(),
                            msg.getProjectId(),
                            msg.getTaskId(),
                            msg.getSenderId(),
                            senderName,
                            msg.getContentEncrypted(),
                            msg.getCreatedAt()
                    );
                })
                .toList();
    }
}
