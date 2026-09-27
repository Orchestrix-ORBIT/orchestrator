package com.example.core_api.chat;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class ChatController {

    private final ChatMessageService chatMessageService;
    private final SimpMessagingTemplate messagingTemplate;

    // REST Endpoint to fetch historical chat messages for a channel/project
    @GetMapping("/api/chat/projects/{projectId}/messages")
    public ResponseEntity<List<ChatMessageResponse>> getMessages(
            @PathVariable UUID projectId,
            @RequestHeader(value = "X-Tenant-ID", required = false, defaultValue = "myorg") String tenantId
    ) {
        String schemaName = "org_" + (tenantId != null ? tenantId : "myorg").toLowerCase().replace("-", "_");
        com.example.core_api.multitenancy.TenantContext.setCurrentTenant(schemaName);
        try {
            List<ChatMessageResponse> messages = chatMessageService.getProjectMessages(projectId, tenantId);
            return ResponseEntity.ok(messages);
        } finally {
            com.example.core_api.multitenancy.TenantContext.clear();
        }
    }

    // STOMP Message Handler: Clients publish to /app/chat.sendMessage
    @MessageMapping("/chat.sendMessage")
    public void sendMessage(@Payload SendChatMessageRequest request) {
        String tenant = (request.tenantId() != null && !request.tenantId().isBlank()) ? request.tenantId() : "myorg";
        String schemaName = "org_" + tenant.toLowerCase().replace("-", "_");
        com.example.core_api.multitenancy.TenantContext.setCurrentTenant(schemaName);
        try {
            ChatMessageResponse response = chatMessageService.saveMessage(request, null);

            // Broadcast to all clients subscribed to /topic/project/{projectId}
            String destination = "/topic/project/" + request.projectId().toString();
            messagingTemplate.convertAndSend(destination, response);
        } finally {
            com.example.core_api.multitenancy.TenantContext.clear();
        }
    }
}
