package com.example.realtime_service.config;

import com.example.realtime_service.chat.ChatTokenVerifier;
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

@Component
public class ChatChannelInterceptor implements ChannelInterceptor {
    private static final String SESSION_TENANT = "authenticatedTenant";
    private static final String TOPIC_PREFIX = "/topic/tenant/";

    private final ChatTokenVerifier verifier;
    private final ObjectMapper json;

    public ChatChannelInterceptor(ChatTokenVerifier verifier, ObjectMapper json) {
        this.verifier = verifier;
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
            String tenant = verifier.verifyBearer(headers.getFirstNativeHeader("Authorization"))
                    .get("tenant", String.class);
            session.put(SESSION_TENANT, tenant);
        } else if (command == StompCommand.SUBSCRIBE) {
            String tenant = authenticatedTenant(session);
            String destination = headers.getDestination();
            if (destination == null || !destination.startsWith(TOPIC_PREFIX)
                    || !destination.startsWith(TOPIC_PREFIX + tenant.substring(4) + "/project/")) {
                throw new IllegalArgumentException("Subscription belongs to a different tenant");
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
}
