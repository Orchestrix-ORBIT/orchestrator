package com.example.realtime_service.chat;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.messaging.WebSocketStompClient;
import org.springframework.web.socket.sockjs.client.SockJsClient;
import org.springframework.web.socket.sockjs.client.WebSocketTransport;

import java.lang.reflect.Type;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/** Checks live SockJS/STOMP delivery and database isolation using two tenant schemas. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@EnabledIfEnvironmentVariable(
        named = "SPRING_DATASOURCE_URL",
        matches = "jdbc:postgresql://(127\\.0\\.0\\.1|localhost):55432/orchestrix_test.*")
class ChatStompIT {

    private static final String FIRST_TENANT = "integration_lab";
    private static final String SECOND_TENANT = "integration_other";

    @Autowired private JdbcTemplate jdbc;
    @Autowired private Environment environment;
    @Autowired private SimpMessagingTemplate messaging;
    @Value("${jwt.secret}") private String jwtSecret;

    @Test
    void deliversOnlyToTheMatchingTenantAndStoresEachMessageSeparately() throws Exception {
        UUID senderId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        String senderEmail = senderId + "@example.test";

        WebSocketStompClient client = new WebSocketStompClient(
                new SockJsClient(List.of(new WebSocketTransport(new StandardWebSocketClient()))));
        StompSession first = null;
        StompSession second = null;
        StompSession intruder = null;
        try {
            insertFixtures(FIRST_TENANT, senderId, projectId, senderEmail);
            insertFixtures(SECOND_TENANT, senderId, projectId, senderEmail);
            client.start();
            String endpoint = "http://127.0.0.1:" + environment.getRequiredProperty("local.server.port") + "/ws";
            first = connect(client, endpoint, FIRST_TENANT, senderEmail);
            second = connect(client, endpoint, SECOND_TENANT, senderEmail);
            intruder = connect(client, endpoint, FIRST_TENANT, senderEmail);

            BlockingQueue<String> firstMessages = new LinkedBlockingQueue<>();
            BlockingQueue<String> secondMessages = new LinkedBlockingQueue<>();
            subscribe(first, FIRST_TENANT, projectId, firstMessages);
            subscribe(second, SECOND_TENANT, projectId, secondMessages);
            BlockingQueue<String> unauthorizedMessages = new LinkedBlockingQueue<>();
            intruder.subscribe("/topic/tenant/" + SECOND_TENANT + "/project/" + projectId,
                    new StompFrameHandler() {
                        @Override public Type getPayloadType(StompHeaders headers) { return byte[].class; }
                        @Override public void handleFrame(StompHeaders headers, Object payload) {
                            unauthorizedMessages.add(new String((byte[]) payload, StandardCharsets.UTF_8));
                        }
                    });

            send(first, FIRST_TENANT, projectId, senderEmail, "First tenant message");
            assertThat(firstMessages.poll(10, TimeUnit.SECONDS)).contains("First tenant message");
            assertThat(secondMessages.poll(500, TimeUnit.MILLISECONDS)).isNull();
            assertThat(messageCount(FIRST_TENANT, projectId)).isEqualTo(1);
            assertThat(messageCount(SECOND_TENANT, projectId)).isZero();

            send(second, SECOND_TENANT, projectId, senderEmail, "Second tenant message");
            assertThat(secondMessages.poll(10, TimeUnit.SECONDS)).contains("Second tenant message");
            assertThat(firstMessages.poll(500, TimeUnit.MILLISECONDS)).isNull();
            assertThat(unauthorizedMessages.poll(500, TimeUnit.MILLISECONDS)).isNull();
            assertThat(messageCount(FIRST_TENANT, projectId)).isEqualTo(1);
            assertThat(messageCount(SECOND_TENANT, projectId)).isEqualTo(1);

            assertThat(history(FIRST_TENANT, projectId, token(FIRST_TENANT, senderEmail)))
                    .contains("First tenant message")
                    .doesNotContain("Second tenant message");
            assertThat(history(SECOND_TENANT, projectId, token(SECOND_TENANT, senderEmail)))
                    .contains("Second tenant message")
                    .doesNotContain("First tenant message");

            assertThat(historyStatus(SECOND_TENANT, projectId, null)).isEqualTo(401);
            assertThat(historyStatus(SECOND_TENANT, projectId, token(FIRST_TENANT, senderEmail)))
                    .isEqualTo(403);
        } finally {
            if (first != null) first.disconnect();
            if (second != null) second.disconnect();
            if (intruder != null && intruder.isConnected()) intruder.disconnect();
            client.stop();
            removeFixtures(FIRST_TENANT, senderId, projectId);
            removeFixtures(SECOND_TENANT, senderId, projectId);
        }
    }

    private StompSession connect(WebSocketStompClient client, String endpoint, String tenant, String email)
            throws Exception {
        StompHeaders headers = new StompHeaders();
        headers.add("Authorization", "Bearer " + token(tenant, email));
        return client.connectAsync(endpoint, new WebSocketHttpHeaders(), headers,
                new StompSessionHandlerAdapter() {}).get(10, TimeUnit.SECONDS);
    }

    private String token(String tenant, String email) {
        long now = System.currentTimeMillis();
        return Jwts.builder().subject(email).claim("tenant", "org_" + tenant)
                .issuedAt(new Date(now)).expiration(new Date(now + 60_000))
                .signWith(Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8))).compact();
    }

    private void insertFixtures(String tenant, UUID senderId, UUID projectId, String email) {
        String schema = "org_" + tenant;
        jdbc.update("INSERT INTO " + schema + ".users (id, email, password_hash, role, status) "
                + "VALUES (?, ?, 'test-only', 'MEMBER', 'ACTIVE')", senderId, email);
        jdbc.update("INSERT INTO " + schema + ".projects (id, name, owner_id) "
                + "VALUES (?, 'STOMP integration project', ?)", projectId, senderId);
    }

    private void removeFixtures(String tenant, UUID senderId, UUID projectId) {
        String schema = "org_" + tenant;
        jdbc.update("DELETE FROM " + schema + ".chat_messages WHERE project_id = ?", projectId);
        jdbc.update("DELETE FROM " + schema + ".projects WHERE id = ?", projectId);
        jdbc.update("DELETE FROM " + schema + ".users WHERE id = ?", senderId);
    }

    private int messageCount(String tenant, UUID projectId) {
        return jdbc.queryForObject("SELECT count(*) FROM org_" + tenant
                + ".chat_messages WHERE project_id = ?", Integer.class, projectId);
    }

    private void subscribe(StompSession session, String tenant, UUID projectId, BlockingQueue<String> messages)
            throws Exception {
        String topic = "/topic/tenant/" + tenant + "/project/" + projectId;
        session.subscribe(topic,
                new StompFrameHandler() {
                    @Override public Type getPayloadType(StompHeaders headers) { return byte[].class; }
                    @Override public void handleFrame(StompHeaders headers, Object payload) {
                        messages.add(new String((byte[]) payload, StandardCharsets.UTF_8));
                    }
                });
        for (int attempt = 0; attempt < 20; attempt++) {
            messaging.convertAndSend(topic, "subscription-ready");
            if ("subscription-ready".equals(messages.poll(250, TimeUnit.MILLISECONDS))) {
                messages.clear();
                return;
            }
        }
        throw new AssertionError("Subscriber did not receive a probe on " + topic);
    }

    private void send(StompSession session, String tenant, UUID projectId, String senderEmail, String content) {
        StompHeaders headers = new StompHeaders();
        headers.setDestination("/app/chat.sendMessage");
        headers.setContentType(MediaType.APPLICATION_JSON);
        String body = "{\"projectId\":\"" + projectId + "\",\"tenantId\":\"" + tenant
                + "\",\"senderName\":\"" + senderEmail + "\",\"content\":\"" + content + "\"}";
        session.send(headers, body.getBytes(StandardCharsets.UTF_8));
    }

    private String history(String tenant, UUID projectId, String token) throws Exception {
        HttpResponse<String> response = historyResponse(tenant, projectId, token);
        assertThat(response.statusCode()).isEqualTo(200);
        return response.body();
    }

    private int historyStatus(String tenant, UUID projectId, String token) throws Exception {
        return historyResponse(tenant, projectId, token).statusCode();
    }

    private HttpResponse<String> historyResponse(String tenant, UUID projectId, String token) throws Exception {
        int port = environment.getRequiredProperty("local.server.port", Integer.class);
        HttpRequest.Builder request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port
                        + "/api/chat/projects/" + projectId + "/messages"))
                .header("X-Tenant-ID", tenant)
                .timeout(Duration.ofSeconds(10));
        if (token != null) request.header("Authorization", "Bearer " + token);
        return HttpClient.newHttpClient().send(request.build(), HttpResponse.BodyHandlers.ofString());
    }
}
