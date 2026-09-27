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
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "tenant.bootstrap-key=integration-bootstrap-key")
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
                    .isEqualTo(403);
            HttpResponse<String> otherUser = send("POST", "/api/auth/register", otherTenant,
                    "{\"email\":\"other-" + suffix + "@example.test\",\"password\":\"IntegrationPass123!\"}", null);
            assertThat(otherUser.statusCode()).as(otherUser.body()).isEqualTo(201);
            String otherToken = json.readTree(otherUser.body()).get("token").asText();
            assertThat(send("GET", "/api/projects/" + projectId, otherTenant, null, otherToken).statusCode())
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
            assertThat(send("PATCH", "/api/team/" + UUID.randomUUID() + "/role", tenant,
                    "{\"role\":\"ADMIN\"}", memberBody.get("token").asText()).statusCode())
                    .isEqualTo(403);
            assertThat(send("DELETE", "/api/team/" + UUID.randomUUID(), tenant,
                    null, memberBody.get("token").asText()).statusCode()).isEqualTo(403);
            String memberToken = memberBody.get("token").asText();
            UUID adminId = jdbc.queryForObject("SELECT id FROM " + schema + ".users WHERE email = ?",
                    UUID.class, email);
            UUID memberId = jdbc.queryForObject("SELECT id FROM " + schema + ".users WHERE email = ?",
                    UUID.class, "member-" + suffix + "@example.test");
            UUID adminNotification = UUID.randomUUID();
            UUID memberNotification = UUID.randomUUID();
            jdbc.update("INSERT INTO " + schema + ".notifications(id,user_id,type,title) VALUES (?,?,?,?)",
                    adminNotification, adminId, "INFO", "Admin only");
            jdbc.update("INSERT INTO " + schema + ".notifications(id,user_id,type,title) VALUES (?,?,?,?)",
                    memberNotification, memberId, "INFO", "Member only");
            JsonNode memberNotifications = json.readTree(send("GET", "/api/notifications", tenant,
                    null, memberToken).body());
            assertThat(memberNotifications.size()).isEqualTo(1);
            assertThat(memberNotifications.get(0).get("id").asText()).isEqualTo(memberNotification.toString());
            assertThat(send("PATCH", "/api/notifications/read-all", tenant, null, memberToken).statusCode())
                    .isEqualTo(200);
            assertThat(jdbc.queryForObject("SELECT is_read FROM " + schema + ".notifications WHERE id = ?",
                    Boolean.class, adminNotification)).isFalse();
            assertThat(jdbc.queryForObject("SELECT is_read FROM " + schema + ".notifications WHERE id = ?",
                    Boolean.class, memberNotification)).isTrue();
            assertThat(send("PATCH", "/api/notifications/" + adminNotification + "/read", tenant,
                    null, memberToken).statusCode()).isEqualTo(404);
            assertThat(send("GET", "/api/projects/" + projectId, tenant, null, memberToken).statusCode())
                    .isEqualTo(403);
            assertThat(send("GET", "/api/chat/projects/" + projectId + "/messages",
                    tenant, null, memberToken).statusCode()).isEqualTo(403);
            assertThat(json.readTree(send("GET", "/api/projects", tenant, null, memberToken).body()).size())
                    .isZero();

            HttpResponse<String> team = send("POST", "/api/research-teams", tenant,
                    "{\"name\":\"HTTP access team\"}", adminToken);
            assertThat(team.statusCode()).as(team.body()).isEqualTo(201);
            String teamId = json.readTree(team.body()).get("id").asText();
            String addMemberBody = "{\"userId\":\"" + memberId + "\",\"roleInTeam\":\"MEMBER\"}";
            assertThat(send("POST", "/api/research-teams/" + teamId + "/members", tenant,
                    addMemberBody, memberToken).statusCode()).isEqualTo(403);
            assertThat(send("POST", "/api/research-teams/" + teamId + "/members", tenant,
                    addMemberBody, adminToken).statusCode()).isEqualTo(204);
            HttpResponse<String> sharedProject = send("POST", "/api/projects", tenant,
                    "{\"name\":\"Shared project\",\"teamId\":\"" + teamId + "\"}", adminToken);
            assertThat(sharedProject.statusCode()).as(sharedProject.body()).isEqualTo(201);
            String sharedProjectId = json.readTree(sharedProject.body()).get("id").asText();
            assertThat(send("GET", "/api/projects/" + sharedProjectId, tenant, null, memberToken).statusCode())
                    .isEqualTo(200);
            assertThat(send("GET", "/api/chat/projects/" + sharedProjectId + "/messages",
                    tenant, null, memberToken).statusCode()).isEqualTo(200);
            assertThat(send("DELETE", "/api/research-teams/" + teamId + "/members/" + memberId,
                    tenant, null, adminToken).statusCode()).isEqualTo(204);
            assertThat(send("GET", "/api/projects/" + sharedProjectId, tenant, null, memberToken).statusCode())
                    .isEqualTo(403);
            assertThat(send("DELETE", "/api/projects/" + sharedProjectId, tenant, null, adminToken).statusCode())
                    .isEqualTo(204);

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

    @Test
    void provisionsTenantThroughHttpAndReturnsFrontendFields() throws Exception {
        String slug = "integration-provision-" + UUID.randomUUID().toString().substring(0, 8);
        String schema = "org_" + slug.replace('-', '_');
        try {
            assertThat(send("POST", "/api/admin/tenants", "myorg",
                    "{\"slug\":\"" + slug + "\",\"name\":\"Unauthorized\"}", null).statusCode())
                    .isEqualTo(403);
            assertThat(sendWithBootstrap("POST", "/api/admin/tenants", "myorg",
                    "{\"slug\":\"" + slug + "\",\"name\":\"Unauthorized\"}", "wrong-key").statusCode())
                    .isEqualTo(403);
            assertThat(sendWithBootstrap("POST", "/api/admin/tenants", "myorg",
                    "{\"slug\":\" \" ,\"name\":\"Invalid\"}", "integration-bootstrap-key").statusCode())
                    .isEqualTo(400);
            HttpResponse<String> created = sendWithBootstrap("POST", "/api/admin/tenants", "myorg",
                    "{\"slug\":\"" + slug + "\",\"name\":\"Provisioned test tenant\"}",
                    "integration-bootstrap-key");
            assertThat(created.statusCode()).as(created.body()).isEqualTo(201);
            JsonNode body = json.readTree(created.body());
            assertThat(body.get("id").asText()).isNotBlank();
            assertThat(body.get("slug").asText()).isEqualTo(slug);
            assertThat(body.get("name").asText()).isEqualTo("Provisioned test tenant");
            assertThat(body.get("schemaName").asText()).isEqualTo(schema);
            assertThat(body.get("status").asText()).isEqualTo("ACTIVE");

            assertThat(send("GET", "/api/admin/tenants", slug, null, null).statusCode()).isEqualTo(403);
            assertThat(send("GET", "/api/admin/tenants/" + slug, slug, null, null).statusCode())
                    .isEqualTo(403);
            HttpResponse<String> admin = send("POST", "/api/auth/register", slug,
                    "{\"email\":\"admin@example.test\",\"password\":\"IntegrationPass123!\"}", null);
            String adminToken = json.readTree(admin.body()).get("token").asText();
            HttpResponse<String> read = send("GET", "/api/admin/tenants/" + slug, slug, null, adminToken);
            assertThat(read.statusCode()).as(read.body()).isEqualTo(200);
            assertThat(json.readTree(read.body()).get("id").asText()).isEqualTo(body.get("id").asText());
            assertThat(send("GET", "/api/admin/tenants", slug, null, adminToken).statusCode()).isEqualTo(200);
            HttpResponse<String> member = send("POST", "/api/auth/register", slug,
                    "{\"email\":\"member@example.test\",\"password\":\"IntegrationPass123!\"}", null);
            String memberToken = json.readTree(member.body()).get("token").asText();
            assertThat(send("GET", "/api/admin/tenants", slug, null, memberToken).statusCode()).isEqualTo(403);
            assertThat(send("GET", "/api/admin/tenants/other-tenant", slug, null, memberToken).statusCode())
                    .isEqualTo(403);
            assertThat(send("PATCH", "/api/admin/tenants/" + body.get("id").asText()
                    + "/status?status=SUSPENDED", slug, null, memberToken).statusCode()).isEqualTo(403);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM public.tenants WHERE slug = ?",
                    Integer.class, slug)).isEqualTo(1);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM information_schema.tables "
                    + "WHERE table_schema = ? AND table_name = 'projects'", Integer.class, schema)).isEqualTo(1);
        } finally {
            jdbc.update("DELETE FROM public.tenants WHERE slug = ?", slug);
            jdbc.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
        }
    }

    @Test
    void createsAndReadsResourceWithFrontendResponseFields() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String tenant = "integration-resource-" + suffix;
        String schema = "org_" + tenant.replace('-', '_');
        try {
            migrations.provisionTenantSchema(schema);
            HttpResponse<String> registered = send("POST", "/api/auth/register", tenant,
                    "{\"email\":\"resource-" + suffix + "@example.test\",\"password\":\"IntegrationPass123!\"}", null);
            assertThat(registered.statusCode()).as(registered.body()).isEqualTo(201);
            String token = json.readTree(registered.body()).get("token").asText();
            // Protected reads must reject an anonymous caller before the controller touches tenant data.
            assertThat(send("GET", "/api/projects", tenant, null, null).statusCode()).isEqualTo(403);
            assertThat(send("GET", "/api/resources", tenant, null, null).statusCode()).isEqualTo(403);
            assertThat(send("GET", "/api/team", tenant, null, null).statusCode()).isEqualTo(403);
            assertThat(send("GET", "/api/chat/projects/" + UUID.randomUUID() + "/messages",
                    tenant, null, null).statusCode()).isEqualTo(403);

            HttpResponse<String> created = send("POST", "/api/resources", tenant,
                    "{\"name\":\"Integration GPU\",\"type\":\"GPU\",\"description\":\"Test-owned resource\"}", token);
            assertThat(created.statusCode()).as(created.body()).isEqualTo(201);
            JsonNode body = json.readTree(created.body());
            String id = body.get("id").asText();
            HttpResponse<String> member = send("POST", "/api/auth/register", tenant,
                    "{\"email\":\"member-" + suffix + "@example.test\",\"password\":\"IntegrationPass123!\"}", null);
            String memberToken = json.readTree(member.body()).get("token").asText();
            assertThat(send("POST", "/api/resources", tenant,
                    "{\"name\":\"Forbidden asset\",\"type\":\"GPU\"}", memberToken).statusCode())
                    .isEqualTo(403);
            assertThat(send("PATCH", "/api/resources/" + id + "/status", tenant,
                    "{\"status\":\"MAINTENANCE\"}", memberToken).statusCode()).isEqualTo(403);
            assertThat(send("POST", "/api/resources/maintenance", tenant,
                    "{\"assetName\":\"Forbidden maintenance\"}", memberToken).statusCode())
                    .isEqualTo(403);
            assertThat(send("POST", "/api/resources/maintenance", tenant,
                    "{\"assetName\":\" \"}", token).statusCode()).isEqualTo(400);
            HttpResponse<String> maintenance = send("POST", "/api/resources/maintenance", tenant,
                    "{\"assetName\":\"Integration GPU\",\"resourceId\":\"" + id
                            + "\",\"status\":\"In Progress\"}", token);
            assertThat(maintenance.statusCode()).as(maintenance.body()).isEqualTo(201);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM " + schema
                    + ".resource_maintenance WHERE resource_id = ?", Integer.class, UUID.fromString(id)))
                    .isEqualTo(1);
            assertThat(json.readTree(send("GET", "/api/resources/" + id, tenant, null, token).body())
                    .get("status").asText()).isEqualTo("MAINTENANCE");
            assertThat(UUID.fromString(id)).isNotNull();
            assertThat(body.get("name").asText()).isEqualTo("Integration GPU");
            assertThat(body.get("type").asText()).isEqualTo("GPU");
            assertThat(body.get("status").asText()).isEqualTo("AVAILABLE");
            assertThat(body.get("ownerId").asText()).isNotBlank();
            assertThat(body.get("createdAt").asText()).isNotBlank();
            assertThat(jdbc.queryForObject("SELECT count(*) FROM " + schema + ".resources WHERE id = ?",
                    Integer.class, UUID.fromString(id))).isEqualTo(1);

            HttpResponse<String> read = send("GET", "/api/resources/" + id, tenant, null, token);
            assertThat(read.statusCode()).as(read.body()).isEqualTo(200);
            assertThat(json.readTree(read.body()).get("name").asText()).isEqualTo("Integration GPU");
            HttpResponse<String> listed = send("GET", "/api/resources?type=GPU", tenant, null, token);
            assertThat(listed.statusCode()).as(listed.body()).isEqualTo(200);
            assertThat(json.readTree(listed.body()).findValuesAsText("id")).contains(id);
        } finally {
            jdbc.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
        }
    }

    @Test
    void rejectsInvalidInputsDuplicatesUnauthorizedWritesAndBookingConflicts() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String tenant = "integration-rules-" + suffix;
        String schema = "org_" + tenant.replace('-', '_');
        String email = "rules-" + suffix + "@example.test";
        try {
            migrations.provisionTenantSchema(schema);
            assertThat(send("POST", "/api/auth/register", tenant,
                    "{\"email\":\"bad-email\",\"password\":\"short\"}", null).statusCode())
                    .isEqualTo(400);
            assertThat(send("POST", "/api/auth/register", tenant, "{\"email\":", null).statusCode())
                    .isEqualTo(400);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM " + schema + ".users", Integer.class)).isZero();

            String registration = "{\"email\":\"" + email
                    + "\",\"password\":\"IntegrationPass123!\"}";
            HttpResponse<String> registered = send("POST", "/api/auth/register", tenant, registration, null);
            assertThat(registered.statusCode()).as(registered.body()).isEqualTo(201);
            String token = json.readTree(registered.body()).get("token").asText();
            assertThat(send("POST", "/api/auth/register", tenant, registration, null).statusCode())
                    .isEqualTo(400);
            assertThat(send("POST", "/api/auth/login", tenant,
                    "{\"email\":\"" + email + "\",\"password\":\"wrong-password\"}", null)
                    .statusCode()).isEqualTo(401);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM " + schema + ".users", Integer.class))
                    .isEqualTo(1);

            assertThat(send("POST", "/api/projects", tenant, "{\"name\":\" \"}", token).statusCode())
                    .isEqualTo(400);
            assertThat(send("POST", "/api/projects", tenant, "{\"name\":\"No token\"}", null).statusCode())
                    .isEqualTo(403);
            HttpResponse<String> project = send("POST", "/api/projects", tenant,
                    "{\"name\":\"Rules project\"}", token);
            assertThat(project.statusCode()).as(project.body()).isEqualTo(201);
            String projectId = json.readTree(project.body()).get("id").asText();

            assertThat(send("POST", "/api/projects/" + projectId + "/tasks", tenant,
                    "{\"title\":\" \"}", token).statusCode()).isEqualTo(400);
            assertThat(send("POST", "/api/projects/" + projectId + "/tasks", tenant,
                    "{\"title\":\"No token\"}", null).statusCode()).isEqualTo(403);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM " + schema + ".tasks", Integer.class)).isZero();
            HttpResponse<String> task = send("POST", "/api/projects/" + projectId + "/tasks", tenant,
                    "{\"title\":\"Scoped task\"}", token);
            assertThat(task.statusCode()).as(task.body()).isEqualTo(201);
            String taskId = json.readTree(task.body()).get("id").asText();
            assertThat(send("PATCH", "/api/projects/" + projectId + "/tasks/" + taskId,
                    tenant, "{\"title\":\"No token edit\"}", null).statusCode()).isEqualTo(403);
            assertThat(send("DELETE", "/api/projects/" + projectId + "/tasks/" + taskId,
                    tenant, null, null).statusCode()).isEqualTo(403);
            String wrongProjectPath = "/api/projects/" + UUID.randomUUID() + "/tasks/" + taskId;
            assertThat(send("GET", wrongProjectPath, tenant, null, token).statusCode()).isEqualTo(404);
            assertThat(send("PATCH", wrongProjectPath, tenant,
                    "{\"title\":\"Cross-project edit\"}", token).statusCode()).isEqualTo(404);
            assertThat(send("DELETE", wrongProjectPath, tenant, null, token).statusCode()).isEqualTo(404);
            assertThat(jdbc.queryForObject("SELECT title FROM " + schema + ".tasks WHERE id = ?",
                    String.class, UUID.fromString(taskId))).isEqualTo("Scoped task");

            assertThat(send("POST", "/api/resources", tenant,
                    "{\"name\":\"GPU with no type\"}", token).statusCode()).isEqualTo(400);
            assertThat(send("POST", "/api/resources", tenant,
                    "{\"name\":\"No token\",\"type\":\"GPU\"}", null).statusCode()).isEqualTo(403);
            HttpResponse<String> resource = send("POST", "/api/resources", tenant,
                    "{\"name\":\"Rules GPU\",\"type\":\"GPU\"}", token);
            assertThat(resource.statusCode()).as(resource.body()).isEqualTo(201);
            String resourceId = json.readTree(resource.body()).get("id").asText();
            assertThat(send("PATCH", "/api/resources/" + resourceId + "/status", tenant,
                    "{\"status\":\"MAINTENANCE\"}", null).statusCode()).isEqualTo(403);
            assertThat(send("POST", "/api/resources/maintenance", tenant,
                    "{\"assetName\":\"No token\"}", null).statusCode()).isEqualTo(403);
            assertThat(send("POST", "/api/resources/" + resourceId + "/bookings", tenant,
                    "{\"startTime\":\"2030-01-01T12:00:00Z\",\"endTime\":\"2030-01-01T11:00:00Z\"}",
                    token).statusCode()).isEqualTo(400);
            String bookingBody = "{\"startTime\":\"2030-01-01T10:00:00Z\","
                    + "\"endTime\":\"2030-01-01T12:00:00Z\"}";
            assertThat(send("POST", "/api/resources/" + resourceId + "/bookings", tenant,
                    bookingBody, null).statusCode()).isEqualTo(403);
            HttpResponse<String> booking = send("POST", "/api/resources/" + resourceId + "/bookings",
                    tenant, bookingBody, token);
            assertThat(booking.statusCode()).as(booking.body()).isEqualTo(201);
            String bookingId = json.readTree(booking.body()).get("id").asText();
            assertThat(send("PATCH", "/api/resources/bookings/" + bookingId + "/status", tenant,
                    "{\"status\":\"APPROVED\"}", null).statusCode()).isEqualTo(403);
            assertThat(send("POST", "/api/resources/" + resourceId + "/bookings", tenant,
                    bookingBody, token).statusCode()).isEqualTo(409);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM " + schema + ".resource_bookings",
                    Integer.class)).isEqualTo(1);
        } finally {
            jdbc.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
        }
    }

    @Test
    void validatesDocumentsStudentProfilesAndResearchTeamsOverHttp() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String tenant = "integration-domains-" + suffix;
        String schema = "org_" + tenant.replace('-', '_');
        try {
            migrations.provisionTenantSchema(schema);
            HttpResponse<String> registered = send("POST", "/api/auth/register", tenant,
                    "{\"email\":\"domains-" + suffix
                            + "@example.test\",\"password\":\"IntegrationPass123!\"}", null);
            assertThat(registered.statusCode()).as(registered.body()).isEqualTo(201);
            String token = json.readTree(registered.body()).get("token").asText();
            HttpResponse<String> project = send("POST", "/api/projects", tenant,
                    "{\"name\":\"Domain project\"}", token);
            assertThat(project.statusCode()).as(project.body()).isEqualTo(201);
            String projectId = json.readTree(project.body()).get("id").asText();

            String documentPath = "/api/projects/" + projectId + "/documents";
            assertThat(send("POST", documentPath, tenant, "{\"title\":\" \"}", token).statusCode())
                    .isEqualTo(400);
            assertThat(send("POST", documentPath, tenant, "{\"title\":\"No token\"}", null).statusCode())
                    .isEqualTo(403);
            HttpResponse<String> document = send("POST", documentPath, tenant,
                    "{\"title\":\"Test document\"}", token);
            assertThat(document.statusCode()).as(document.body()).isEqualTo(201);
            String documentId = json.readTree(document.body()).get("id").asText();
            assertThat(send("GET", documentPath + "/" + documentId, tenant, null, token).statusCode())
                    .isEqualTo(200);
            assertThat(send("GET", "/api/projects/" + UUID.randomUUID() + "/documents/" + documentId,
                    tenant, null, token).statusCode()).isEqualTo(404);
            assertThat(send("PUT", documentPath + "/" + documentId, tenant,
                    "{\"title\":\"No token edit\"}", null).statusCode()).isEqualTo(403);
            assertThat(send("DELETE", documentPath + "/" + documentId, tenant, null, null).statusCode())
                    .isEqualTo(403);

            assertThat(send("POST", "/api/students/profile", tenant,
                    "{\"studentIdCode\":\" \"}", token).statusCode()).isEqualTo(400);
            HttpResponse<String> profile = send("POST", "/api/students/profile", tenant,
                    "{\"studentIdCode\":\"ST-001\",\"department\":\"Computing\","
                            + "\"degreeProgram\":\"BSc\",\"academicYear\":3}", token);
            assertThat(profile.statusCode()).as(profile.body()).isEqualTo(200);
            assertThat(send("GET", "/api/students/profile/me", tenant, null, token).statusCode())
                    .isEqualTo(200);

            assertThat(send("POST", "/api/research-teams", tenant,
                    "{\"name\":\" \"}", token).statusCode()).isEqualTo(400);
            HttpResponse<String> team = send("POST", "/api/research-teams", tenant,
                    "{\"name\":\"Test team\"}", token);
            assertThat(team.statusCode()).as(team.body()).isEqualTo(201);
            String teamId = json.readTree(team.body()).get("id").asText();
            assertThat(jdbc.queryForObject("SELECT count(*) FROM " + schema
                    + ".team_members WHERE team_id = ?", Integer.class, UUID.fromString(teamId))).isEqualTo(1);
            assertThat(send("GET", "/api/research-teams", tenant, null, token).statusCode())
                    .isEqualTo(200);
        } finally {
            jdbc.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
        }
    }

    private HttpResponse<String> send(String method, String path, String tenant, String body, String token)
            throws Exception {
        return send(method, path, tenant, body, token, null);
    }

    private HttpResponse<String> sendWithBootstrap(String method, String path, String tenant, String body,
                                                   String bootstrapKey) throws Exception {
        return send(method, path, tenant, body, null, bootstrapKey);
    }

    private HttpResponse<String> send(String method, String path, String tenant, String body, String token,
                                      String bootstrapKey) throws Exception {
        int port = environment.getRequiredProperty("local.server.port", Integer.class);
        HttpRequest.Builder request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
                .timeout(Duration.ofSeconds(15))
                .header("X-Tenant-ID", tenant);
        if (token != null) request.header("Authorization", "Bearer " + token);
        if (bootstrapKey != null) request.header("X-Bootstrap-Key", bootstrapKey);
        if (body != null) request.header("Content-Type", "application/json");
        request.method(method, body == null
                ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(body));
        return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }
}
