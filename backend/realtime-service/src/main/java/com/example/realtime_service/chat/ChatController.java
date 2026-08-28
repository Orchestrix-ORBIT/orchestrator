package com.example.realtime_service.chat;

import com.example.realtime_service.multitenancy.TenantContext;
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
@CrossOrigin(origins = "*")
public class ChatController {

    private final ChatMessageService chatMessageService;
    private final SimpMessagingTemplate messagingTemplate;

    @GetMapping("/api/chat/projects/{projectId}/messages")
    public ResponseEntity<List<ChatMessageResponse>> getMessages(
            @PathVariable UUID projectId,
            @RequestHeader(value = "X-Tenant-ID", required = false, defaultValue = "myorg") String tenantId
    ) {
        String schemaName = "org_" + (tenantId != null ? tenantId : "myorg").toLowerCase().replace("-", "_");
        TenantContext.setCurrentTenant(schemaName);
        try {
            List<ChatMessageResponse> messages = chatMessageService.getProjectMessages(projectId, tenantId);
            return ResponseEntity.ok(messages);
        } finally {
            TenantContext.clear();
        }
    }

    @MessageMapping("/chat.sendMessage")
    public void sendMessage(@Payload SendChatMessageRequest request) {
        String tenant = (request.tenantId() != null && !request.tenantId().isBlank()) ? request.tenantId() : "myorg";
        String schemaName = "org_" + tenant.toLowerCase().replace("-", "_");
        TenantContext.setCurrentTenant(schemaName);
        try {
            ChatMessageResponse response = chatMessageService.saveMessage(request, null);
            String destination = "/topic/project/" + request.projectId().toString();
            messagingTemplate.convertAndSend(destination, response);
        } finally {
            TenantContext.clear();
        }
    }
}
