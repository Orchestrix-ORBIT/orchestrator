# Orchestrix ORBIT — Backend Services Testing Documentation

> **Framework**: JUnit 5 (Jupiter) + Mockito (with Mockito Subclass) + Spring Boot Test + AssertJ  
> **Target Services**: `backend/core-api` & `backend/realtime-service`  
> **Total Tests**: 131 across 19 test classes  
> **Result**: ✅ 131/131 passing (Core API: 117/117, Realtime Service: 14/14)

---

## Quick Start

```bash
# Run Core-API Tests
cd backend/core-api
JAVA_HOME=~/.jdks/jdk-21.0.6+7 ./mvnw test

# Run Realtime-Service Tests
cd backend/realtime-service
JAVA_HOME=~/.jdks/jdk-21.0.6+7 ./mvnw test
```

---

## Comprehensive Test Suite Overview

| Service Module | Test Classes | Test Count | Key Coverage Areas | Status |
| :--- | :---: | :---: | :--- | :---: |
| **`core-api`** | 14 | 117 | Auth, JWT, Encrypted Documents, Projects, Tasks, Teams, Resources, Tenants | ✅ Pass |
| **`realtime-service`** | 5 | 14 | WebSocket STOMP messaging, Chat history REST APIs, Tenant filters | ✅ Pass |
| **Total** | **19** | **131** | **100% Backend Unit Test Pass Rate** | **100%** |

---

## Realtime Service Test Breakdown (`backend/realtime-service`)

### 1. Spring Boot Integration
#### `RealtimeServiceApplicationTests.java` (1 Test)
- **File Path**: [RealtimeServiceApplicationTests.java](file:///run/media/sheharak/New%20Volume/Sem5/Project/ProjectCode/orchestrator/backend/realtime-service/src/test/java/com/example/realtime_service/RealtimeServiceApplicationTests.java)
- **Coverage**:
  - `contextLoads()`: Bootstraps Spring application context, WebSocket message broker registry, dynamic JPA multi-tenant connection provider, and database entities.

### 2. Multi-Tenancy Package (`com.example.realtime_service.multitenancy`)
#### `TenantContextTest.java` (2 Tests)
- **File Path**: [TenantContextTest.java](file:///run/media/sheharak/New%20Volume/Sem5/Project/ProjectCode/orchestrator/backend/realtime-service/src/test/java/com/example/realtime_service/multitenancy/TenantContextTest.java)
- **Coverage**:
  - `setCurrentTenant_and_getCurrentTenant`: Verifies setting and getting ThreadLocal tenant schema string (`org_<tenant>`).
  - `clear_resetsCurrentTenantToNull`: Ensures `clear()` resets ThreadLocal state to prevent thread pool leakages.

#### `TenantFilterTest.java` (3 Tests)
- **File Path**: [TenantFilterTest.java](file:///run/media/sheharak/New%20Volume/Sem5/Project/ProjectCode/orchestrator/backend/realtime-service/src/test/java/com/example/realtime_service/multitenancy/TenantFilterTest.java)
- **Coverage**:
  - `doFilterInternal_withHeader_setsSchemaAndChainsRequest`: Tests extracting `X-Tenant-ID` header (e.g., `mit-lab` -> `org_mit_lab`), setting `TenantContext`, chaining filter, and executing cleanup in `finally`.
  - `doFilterInternal_withoutHeader_defaultsToOrgMyorg`: Tests default schema fallback (`org_myorg`) when tenant header is missing.
  - `doFilterInternal_withBlankHeader_defaultsToOrgMyorg`: Handles whitespace headers safely.

### 3. Real-Time Chat Package (`com.example.realtime_service.chat`)
#### `ChatMessageServiceTest.java` (5 Tests)
- **File Path**: [ChatMessageServiceTest.java](file:///run/media/sheharak/New%20Volume/Sem5/Project/ProjectCode/orchestrator/backend/realtime-service/src/test/java/com/example/realtime_service/chat/ChatMessageServiceTest.java)
- **Coverage**:
  - `saveMessage_withValidTenantAndSenderId_savesMessageAndReturnsResponse`: Tests saving chat message, schema binding, user display name resolution, and returning `ChatMessageResponse`.
  - `saveMessage_withNullSenderName_fetchesDisplayNameFromRepository`: Fetches display name from `UserRepository` when omitted in payload.
  - `saveMessage_withNullSenderIdAndName_defaultsToResearcher`: Verifies default sender fallback logic.
  - `getProjectMessages_returnsOrderedMessages`: Tests non-paginated chat history retrieval.
  - `getProjectMessagesPaginated_fetchesAndReversesForChronologicalOrder`: Verifies database fetch in descending timestamp order and array reversal for chronological UI presentation.

#### `ChatControllerTest.java` (3 Tests)
- **File Path**: [ChatControllerTest.java](file:///run/media/sheharak/New%20Volume/Sem5/Project/ProjectCode/orchestrator/backend/realtime-service/src/test/java/com/example/realtime_service/chat/ChatControllerTest.java)
- **Coverage**:
  - `getMessages_validProjectId_returnsOkWithMessagesAndClearsTenantContext`: Tests REST API `GET /api/chat/projects/{projectId}/messages`, tenant header parsing, pagination, and `TenantContext` cleanup in `finally`.
  - `getMessages_invalidProjectId_returnsEmptyList`: Handles invalid UUID strings gracefully without throwing HTTP 500.
  - `sendMessage_validPayload_savesMessageBroadcastsToStompTopicAndClearsTenantContext`: Tests WebSocket STOMP `@MessageMapping("/chat.sendMessage")`, invoking `saveMessage()`, and broadcasting payload to `/topic/project/{projectId}` via `SimpMessagingTemplate`.

---

## Core-API Service Test Breakdown (`backend/core-api`)

| Test File / Class | Test Count | Scope & Focus Area | Status |
| :--- | :---: | :--- | :---: |
| [CoreApiApplicationTests.java](file:///run/media/sheharak/New%20Volume/Sem5/Project/ProjectCode/orchestrator/backend/core-api/src/test/java/com/example/core_api/CoreApiApplicationTests.java) | 1 | Spring context & Flyway bootstrap verification | ✅ Pass |
| [AuthServiceTest.java](file:///run/media/sheharak/New%20Volume/Sem5/Project/ProjectCode/orchestrator/backend/core-api/src/test/java/com/example/core_api/auth/AuthServiceTest.java) | 9 | User registration, login, role assignment & UserDetails | ✅ Pass |
| [JwtServiceTest.java](file:///run/media/sheharak/New%20Volume/Sem5/Project/ProjectCode/orchestrator/backend/core-api/src/test/java/com/example/core_api/auth/JwtServiceTest.java) | 13 | HMAC-SHA256 JWT generation, claims, expiration & security | ✅ Pass |
| [ChatMessageServiceTest.java](file:///run/media/sheharak/New%20Volume/Sem5/Project/ProjectCode/orchestrator/backend/core-api/src/test/java/com/example/core_api/chat/ChatMessageServiceTest.java) | 10 | Real-time chat messages, channel history & tenant authorization | ✅ Pass |
| [AttributeEncryptorTest.java](file:///run/media/sheharak/New%20Volume/Sem5/Project/ProjectCode/orchestrator/backend/core-api/src/test/java/com/example/core_api/document/AttributeEncryptorTest.java) | 2 | JPA `AttributeConverter` AES-256 field-level encryption | ✅ Pass |
| [DocumentServiceTest.java](file:///run/media/sheharak/New%20Volume/Sem5/Project/ProjectCode/orchestrator/backend/core-api/src/test/java/com/example/core_api/document/DocumentServiceTest.java) | 11 | Encrypted document upload, download, metadata & soft deletion | ✅ Pass |
| [EncryptionServiceTest.java](file:///run/media/sheharak/New%20Volume/Sem5/Project/ProjectCode/orchestrator/backend/core-api/src/test/java/com/example/core_api/document/EncryptionServiceTest.java) | 4 | Low-level AES-256 GCM cryptographic operations | ✅ Pass |
| [ProjectServiceTest.java](file:///run/media/sheharak/New%20Volume/Sem5/Project/ProjectCode/orchestrator/backend/core-api/src/test/java/com/example/core_api/project/ProjectServiceTest.java) | 12 | Research project lifecycle, access controls & deletion rules | ✅ Pass |
| [ResearchTeamServiceTest.java](file:///run/media/sheharak/New%20Volume/Sem5/Project/ProjectCode/orchestrator/backend/core-api/src/test/java/com/example/core_api/researchteam/ResearchTeamServiceTest.java) | 9 | Multi-tenant research teams, membership & lead designations | ✅ Pass |
| [ResourceServiceTest.java](file:///run/media/sheharak/New%20Volume/Sem5/Project/ProjectCode/orchestrator/backend/core-api/src/test/java/com/example/core_api/resource/ResourceServiceTest.java) | 20 | Compute/lab resource allocation, state transitions & availability | ✅ Pass |
| [StudentProfileServiceTest.java](file:///run/media/sheharak/New%20Volume/Sem5/Project/ProjectCode/orchestrator/backend/core-api/src/test/java/com/example/core_api/student/StudentProfileServiceTest.java) | 6 | Researcher/student profile creation, updates & user binding | ✅ Pass |
| [TaskServiceTest.java](file:///run/media/sheharak/New%20Volume/Sem5/Project/ProjectCode/orchestrator/backend/core-api/src/test/java/com/example/core_api/task/TaskServiceTest.java) | 15 | Task lifecycle, priorities, role-based acceptance workflow | ✅ Pass |
| [TeamServiceTest.java](file:///run/media/sheharak/New%20Volume/Sem5/Project/ProjectCode/orchestrator/backend/core-api/src/test/java/com/example/core_api/team/TeamServiceTest.java) | 5 | Team membership tracking, suspension & role updates | ✅ Pass |
| [TenantServiceTest.java](file:///run/media/sheharak/New%20Volume/Sem5/Project/ProjectCode/orchestrator/backend/core-api/src/test/java/com/example/core_api/tenant/TenantServiceTest.java) | 10 | Dynamic PostgreSQL schema provisioning, slug mapping & lifecycle | ✅ Pass |
