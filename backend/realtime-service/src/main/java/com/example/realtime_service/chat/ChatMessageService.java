package com.example.realtime_service.chat;

import com.example.realtime_service.auth.User;
import com.example.realtime_service.auth.UserRepository;
import com.example.realtime_service.auth.UserRole;
import com.example.realtime_service.auth.UserStatus;
import com.example.realtime_service.multitenancy.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
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

        // Prefer: 1) explicit senderId param, 2) senderId from request payload, 3) email lookup
        UUID validSenderId = senderId;
        if (validSenderId == null && request.senderId() != null) {
            validSenderId = request.senderId();
            // Resolve display name from DB if not provided
            if (displayName == null || displayName.isBlank()) {
                final UUID resolvedId = validSenderId;
                displayName = userRepository.findById(resolvedId)
                        .map(u -> u.getDisplayName() != null ? u.getDisplayName() : u.getEmail())
                        .orElse("Researcher");
            }
        }

        final String finalDisplayName = displayName;
        if (validSenderId == null) {
            // Last resort: look up by email (only works when senderName is actually an email)
            if (finalDisplayName.contains("@")) {
                validSenderId = userRepository.findByEmail(finalDisplayName)
                        .map(u -> u.getId())
                        .orElseGet(() -> {
                            User newUser = User.builder()
                                    .email(finalDisplayName)
                                    .passwordHash("N/A")
                                    .displayName(finalDisplayName)
                                    .role(UserRole.MEMBER)
                                    .status(UserStatus.ACTIVE)
                                    .build();
                            return userRepository.save(newUser).getId();
                        });
            } else {
                // senderName is a display name, not an email — create a placeholder user
                String generatedEmail = finalDisplayName.replace(" ", ".").toLowerCase() + "@system.local";
                validSenderId = userRepository.findByEmail(generatedEmail)
                        .map(u -> u.getId())
                        .orElseGet(() -> {
                            User newUser = User.builder()
                                    .email(generatedEmail)
                                    .passwordHash("N/A")
                                    .displayName(finalDisplayName)
                                    .role(UserRole.MEMBER)
                                    .status(UserStatus.ACTIVE)
                                    .build();
                            return userRepository.save(newUser).getId();
                        });
            }
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
                saved.getCreatedAt(),
                request.replyToId(),
                request.replyToSender(),
                request.replyToContent(),
                false,
                false
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
                            msg.getCreatedAt(),
                            null,
                            null,
                            null,
                            false,
                            false
                    );
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getProjectMessagesPaginated(UUID projectId, String tenantId, int page, int size) {
        if (tenantId != null && !tenantId.isBlank()) {
            String schemaName = "org_" + tenantId.toLowerCase().replace("-", "_");
            TenantContext.setCurrentTenant(schemaName);
        }

        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(
                page,
                size,
                org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt")
        );

        List<ChatMessage> fetched = chatMessageRepository.findByProjectId(projectId, pageable);
        List<ChatMessageResponse> result = new java.util.ArrayList<>(
                fetched.stream().map(msg -> {
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
                            msg.getCreatedAt(),
                            null,
                            null,
                            null,
                            false,
                            false
                    );
                }).toList()
        );

        Collections.reverse(result);
        return result;
    }

    @Transactional
    public void deleteAllMessages() {
        chatMessageRepository.deleteAll();
    }
}
