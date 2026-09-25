package com.example.core_api.integration;

import com.example.core_api.multitenancy.TenantMigrationService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** Exercises the HTTP, security, service, and persistence layers on the isolated test database. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@EnabledIfEnvironmentVariable(
        named = "SPRING_DATASOURCE_URL",
        matches = "jdbc:postgresql://(127\\.0\\.0\\.1|localhost):55432/orchestrix_test.*")
class CoreApiHttpIT {

    @Autowired private TenantMigrationService migrations;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private Environment environment;

    private final HttpClient client = HttpClient.newHttpClient();
    private final ObjectMapper json = new ObjectMapper();

    @Test
    void authenticatesAndPersistsProjectsAndTasksWithinOneTenant() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String tenant = "integration-http-" + suffix;
        String otherTenant = "integration-other-" + suffix;
        String schema = "org_" + tenant.replace('-', '_');
        String otherSchema = "org_" + otherTenant.replace('-', '_');

        try {
            migrations.provisionTenantSchema(schema);
            migrations.provisionTenantSchema(otherSchema);

            String email = "admin-" + suffix + "@example.test";
            String password = "IntegrationPass123!";
            HttpResponse<String> registered = send("POST", "/api/auth/register", tenant,
                    "{\"email\":\"" + email + "\",\"password\":\"" + password
                            + "\",\"displayName\":\"Integration Admin\"}", null);
            assertThat(registered.statusCode()).as(registered.body()).isEqualTo(201);
            assertThat(json.readTree(registered.body()).get("role").asText()).isEqualTo("ROLE_ADMIN");

            HttpResponse<String> loggedIn = send("POST", "/api/auth/login", tenant,
                    "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}", null);
            assertThat(loggedIn.statusCode()).as(loggedIn.body()).isEqualTo(200);
            String adminToken = json.readTree(loggedIn.body()).get("token").asText();
            assertThat(adminToken).isNotBlank();

            HttpResponse<String> createdProject = send("POST", "/api/projects", tenant,
                    "{\"name\":\"Integration HTTP project\"}", adminToken);
            assertThat(createdProject.statusCode()).as(createdProject.body()).isEqualTo(201);
            String projectId = json.readTree(createdProject.body()).get("id").asText();
            assertThat(jdbc.queryForObject("SELECT count(*) FROM " + schema + ".projects WHERE id = ?",
                    Integer.class, UUID.fromString(projectId))).isEqualTo(1);

            HttpResponse<String> projectRead = send("GET", "/api/projects/" + projectId, tenant, null, adminToken);
            assertThat(projectRead.statusCode()).as(projectRead.body()).isEqualTo(200);
            assertThat(json.readTree(projectRead.body()).get("name").asText())
                    .isEqualTo("Integration HTTP project");
            assertThat(send("GET", "/api/projects/" + projectId, otherTenant, null, null).statusCode())
                    .isEqualTo(404);

            HttpResponse<String> member = send("POST", "/api/auth/register", tenant,
                    "{\"email\":\"member-" + suffix + "@example.test\",\"password\":\""
                            + password + "\"}", null);
            assertThat(member.statusCode()).as(member.body()).isEqualTo(201);
            JsonNode memberBody = json.readTree(member.body());
            assertThat(memberBody.get("role").asText()).isEqualTo("ROLE_MEMBER");
            assertThat(send("POST", "/api/projects", tenant,
                    "{\"name\":\"Forbidden project\"}", memberBody.get("token").asText()).statusCode())
                    .isEqualTo(403);

            HttpResponse<String> createdTask = send("POST", "/api/projects/" + projectId + "/tasks", tenant,
                    "{\"title\":\"Integration HTTP task\"}", adminToken);
            assertThat(createdTask.statusCode()).as(createdTask.body()).isEqualTo(201);
            String taskId = json.readTree(createdTask.body()).get("id").asText();
            assertThat(send("GET", "/api/projects/" + projectId + "/tasks/" + taskId,
                    tenant, null, adminToken).statusCode()).isEqualTo(200);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM " + schema + ".tasks WHERE id = ?",
                    Integer.class, UUID.fromString(taskId))).isEqualTo(1);

            assertThat(send("DELETE", "/api/projects/" + projectId + "/tasks/" + taskId,
                    tenant, null, adminToken).statusCode()).isEqualTo(204);
            assertThat(send("DELETE", "/api/projects/" + projectId,
                    tenant, null, adminToken).statusCode()).isEqualTo(204);
            assertThat(send("GET", "/api/projects/" + projectId, tenant, null, adminToken).statusCode())
                    .isEqualTo(404);
        } finally {
            jdbc.execute("DROP SCHEMA IF EXISTS " + otherSchema + " CASCADE");
            jdbc.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
        }
    }

    private HttpResponse<String> send(String method, String path, String tenant, String body, String token)
            throws Exception {
        int port = environment.getRequiredProperty("local.server.port", Integer.class);
        HttpRequest.Builder request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
                .timeout(Duration.ofSeconds(15))
                .header("X-Tenant-ID", tenant);
        if (token != null) request.header("Authorization", "Bearer " + token);
        if (body != null) request.header("Content-Type", "application/json");
        request.method(method, body == null
                ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(body));
        return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }
}
