package com.example.realtime_service.config;

import com.example.realtime_service.chat.ChatTokenVerifier;
import com.example.realtime_service.chat.ChatProjectAccess;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ChatChannelInterceptorTest {
    private static final String SECRET = "ThisIsASecretKeyForTestingPurposesOnly!!";
    private static final UUID PROJECT_ID = UUID.fromString("12345678-1234-1234-1234-123456789abc");
    private final ChatProjectAccess projectAccess = mock(ChatProjectAccess.class);
    private final ChatChannelInterceptor interceptor =
            new ChatChannelInterceptor(new ChatTokenVerifier(SECRET), projectAccess, new ObjectMapper());

    @Test
    void rejectsUnauthenticatedConnect() {
        assertThatThrownBy(() -> send(StompCommand.CONNECT, new HashMap<>(), null, null, new byte[0]))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void acceptsOwnTenantAndRejectsOtherTenantSubscriptionAndSend() {
        when(projectAccess.canAccess("org_first", "user@example.test", PROJECT_ID)).thenReturn(true);
        Map<String, Object> session = new HashMap<>();
        send(StompCommand.CONNECT, session, null, "Bearer " + token("org_first"), new byte[0]);
        send(StompCommand.SUBSCRIBE, session, "/topic/tenant/first/project/" + PROJECT_ID, null, new byte[0]);

        assertThatThrownBy(() -> send(StompCommand.SUBSCRIBE, session,
                "/topic/tenant/second/project/" + PROJECT_ID, null, new byte[0]))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> send(StompCommand.SEND, session, "/app/chat.sendMessage", null,
                ("{\"tenantId\":\"second\",\"projectId\":\"" + PROJECT_ID + "\"}")
                        .getBytes(StandardCharsets.UTF_8)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsSameTenantProjectWithoutMembership() {
        Map<String, Object> session = new HashMap<>();
        send(StompCommand.CONNECT, session, null, "Bearer " + token("org_first"), new byte[0]);
        assertThatThrownBy(() -> send(StompCommand.SUBSCRIBE, session,
                "/topic/tenant/first/project/" + PROJECT_ID, null, new byte[0]))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> send(StompCommand.SEND, session, "/app/chat.sendMessage", null,
                ("{\"tenantId\":\"first\",\"projectId\":\"" + PROJECT_ID + "\"}")
                        .getBytes(StandardCharsets.UTF_8)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private void send(StompCommand command, Map<String, Object> session, String destination,
                      String authorization, byte[] body) {
        StompHeaderAccessor headers = StompHeaderAccessor.create(command);
        headers.setSessionAttributes(session);
        if (destination != null) headers.setDestination(destination);
        if (authorization != null) headers.addNativeHeader("Authorization", authorization);
        Message<byte[]> message = MessageBuilder.createMessage(body, headers.getMessageHeaders());
        interceptor.preSend(message, null);
    }

    private String token(String tenant) {
        long now = System.currentTimeMillis();
        return Jwts.builder().subject("user@example.test").claim("tenant", tenant)
                .issuedAt(new Date(now)).expiration(new Date(now + 60_000))
                .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8))).compact();
    }
}
