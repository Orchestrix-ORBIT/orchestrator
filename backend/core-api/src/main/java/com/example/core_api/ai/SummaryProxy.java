package com.example.core_api.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import tools.jackson.databind.ObjectMapper;

@Service
public class SummaryProxy {
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient client;
    private final URI endpoint;

    public SummaryProxy(@Value("${context-engine.url}") String contextEngineUrl) {
        this.client = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(5))
                .build();
        this.endpoint = URI.create(contextEngineUrl.replaceAll("/+$", "") + "/summarize");
    }

    public ResponseEntity<String> summarize(SummarizeRequest request, String tenantId) {
        try {
            String payload = objectMapper.writeValueAsString(Map.of(
                    "messages", request.messages(),
                    "projectId", request.projectId().toString(),
                    "tenantId", tenantId));
            HttpRequest upstream = HttpRequest.newBuilder(endpoint)
                    .timeout(Duration.ofSeconds(120))
                    .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();
            HttpResponse<String> response = client.send(upstream, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(response.body());
            }
            if (response.statusCode() == 400 || response.statusCode() == 422) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .contentType(MediaType.APPLICATION_JSON).body(response.body());
            }
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).contentType(MediaType.APPLICATION_JSON)
                    .body("{\"message\":\"Summarization service failed\"}");
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).contentType(MediaType.APPLICATION_JSON)
                    .body("{\"message\":\"Summarization service unavailable\"}");
        } catch (IOException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).contentType(MediaType.APPLICATION_JSON)
                    .body("{\"message\":\"Summarization service unavailable\"}");
        }
    }
}
