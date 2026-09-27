package com.example.realtime_service.config;

import com.example.realtime_service.chat.ChatTokenVerifier;
import com.example.realtime_service.chat.ChatProjectAccess;
import com.example.realtime_service.chat.SendChatMessageRequest;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class ChatChannelInterceptor implements ChannelInterceptor {
    private static final String SESSION_TENANT = "authenticatedTenant";
    private static final String SESSION_EMAIL = "authenticatedEmail";
    private static final Pattern PROJECT_TOPIC = Pattern.compile(
            "^/topic/tenant/([a-z0-9_]+)/project/([0-9a-fA-F-]{36})$");

    private final ChatTokenVerifier verifier;
    private final ChatProjectAccess projectAccess;
    private final ObjectMapper json;

    public ChatChannelInterceptor(ChatTokenVerifier verifier, ChatProjectAccess projectAccess, ObjectMapper json) {
        this.verifier = verifier;
        this.projectAccess = projectAccess;
        this.json = json;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor headers = StompHeaderAccessor.wrap(message);
        StompCommand command = headers.getCommand();
        if (command == null) return message;

        Map<String, Object> session = headers.getSessionAttributes();
        if (session == null) throw new IllegalArgumentException("STOMP session required");

        if (command == StompCommand.CONNECT) {
            var claims = verifier.verifyBearer(headers.getFirstNativeHeader("Authorization"));
            session.put(SESSION_TENANT, claims.get("tenant", String.class));
            session.put(SESSION_EMAIL, claims.getSubject());
        } else if (command == StompCommand.SUBSCRIBE) {
            String tenant = authenticatedTenant(session);
            Matcher topic = PROJECT_TOPIC.matcher(headers.getDestination() == null ? "" : headers.getDestination());
            if (!topic.matches() || !topic.group(1).equals(tenant.substring(4))) {
                throw new IllegalArgumentException("Subscription belongs to a different tenant or project");
            }
            if (!projectAccess.canAccess(tenant, authenticatedEmail(session), UUID.fromString(topic.group(2)))) {
                throw new IllegalArgumentException("Project access denied");
            }
        } else if (command == StompCommand.SEND) {
            String tenant = authenticatedTenant(session);
            if (!"/app/chat.sendMessage".equals(headers.getDestination())) {
                throw new IllegalArgumentException("Destination is not allowed");
            }
            try {
                Object payload = message.getPayload();
                byte[] body = payload instanceof byte[] bytes ? bytes
                        : payload.toString().getBytes(StandardCharsets.UTF_8);
                SendChatMessageRequest request = json.readValue(body, SendChatMessageRequest.class);
                if (!tenant.equals(verifier.schemaFor(request.tenantId()))) {
                    throw new IllegalArgumentException("Message belongs to a different tenant");
                }
                if (!projectAccess.canAccess(tenant, authenticatedEmail(session), request.projectId())) {
                    throw new IllegalArgumentException("Project access denied");
                }
            } catch (JacksonException e) {
                throw new IllegalArgumentException("Invalid chat message", e);
            }
        }
        return message;
    }

    private String authenticatedTenant(Map<String, Object> session) {
        Object tenant = session.get(SESSION_TENANT);
        if (!(tenant instanceof String value)) throw new IllegalArgumentException("Authentication required");
        return value;
    }

    private String authenticatedEmail(Map<String, Object> session) {
        Object email = session.get(SESSION_EMAIL);
        if (!(email instanceof String value)) throw new IllegalArgumentException("Authentication required");
        return value;
    }
}
