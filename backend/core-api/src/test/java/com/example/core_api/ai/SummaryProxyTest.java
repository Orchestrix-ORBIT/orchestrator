package com.example.core_api.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class SummaryProxyTest {
    private final ObjectMapper mapper = new ObjectMapper();
    private final AtomicReference<String> receivedBody = new AtomicReference<>();
    private HttpServer server;
    private SummaryProxy proxy;

    @BeforeEach
    void startServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/summarize", exchange -> {
            receivedBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] body = "{\"summary\":\"Done\"}".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            try (var output = exchange.getResponseBody()) {
                output.write(body);
            }
        });
        server.start();
        proxy = new SummaryProxy("http://127.0.0.1:" + server.getAddress().getPort());
    }

    @AfterEach
    void stopServer() {
        server.stop(0);
    }

    @Test
    void sendsMessagesAndTenantToPrivateEngine() throws Exception {
        UUID projectId = UUID.randomUUID();
        SummarizeRequest request = new SummarizeRequest(
                List.of(new SummarizeRequest.Message("Alice", "Project update", null)), projectId);

        var response = proxy.summarize(request, "acme");

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getBody()).contains("Done");
        JsonNode body = mapper.readTree(receivedBody.get());
        assertThat(body.get("projectId").asText()).isEqualTo(projectId.toString());
        assertThat(body.get("tenantId").asText()).isEqualTo("acme");
        assertThat(body.get("messages").get(0).get("content").asText()).isEqualTo("Project update");
    }
}
