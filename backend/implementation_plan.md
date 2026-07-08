# Privacy Preserving Collaborative Resource and Task Orchestrator (Implementation Plan)

This project is a full-stack, self-hostable SaaS platform designed for secure team collaboration in research environments. Based on our discussion, we are proceeding with the 3-Service Microservices Architecture, which provides the best balance of enterprise-grade scalability and manageable development overhead for your semester project.

## User Review Required

> [!IMPORTANT]
> This is the final blueprint for initializing the backend repository. Please review the proposed steps below. If this looks good, click **Proceed** (or reply), and I will execute the scaffolding commands in the current workspace.

## System Architecture and Tech Stack

- **Web Application**: React / Next.js
- **Mobile Application**: Flutter
- **API Gateway**: Nginx
- **Backend Services**:
  1. **Core API**: Spring Boot (Java 21, Maven, PostgreSQL). Handles Auth, Projects, Tasks, Resources.
  2. **Realtime Service**: Spring Boot (Java 21, Maven, Redis). Handles WebSockets, Chat, Presence.
  3. **Context Engine**: Python (FastAPI, LangChain). Handles AI-powered summarization and suggestions.
- **Infrastructure**: Docker Compose (PostgreSQL, Redis, MinIO)

## Execution Plan

I will execute the following steps to initialize the `orchestrator-backend` repository locally:

### 1. Initialize Core API (Spring Boot)
- Create a `core-api` directory.
- Scaffold a standard Spring Boot Maven project (Java 21) with dependencies for Web, Data JPA, PostgreSQL, Validation, and Security.

### 2. Initialize Realtime Service (Spring Boot)
- Create a `realtime-service` directory.
- Scaffold a standard Spring Boot Maven project (Java 21) with dependencies for Web, WebSocket, and Spring Data Redis.

### 3. Initialize Context Engine (Python/FastAPI)
- Create a `context-engine` directory.
- Create `requirements.txt` with `fastapi`, `uvicorn`, and `langchain`.
- Create a basic `main.py` entry point.

### 4. Setup Local Infrastructure
- Create a `docker-compose.yml` in the root directory to spin up PostgreSQL, Redis, and MinIO for local development.

### 5. Git Setup
- Add a master `.gitignore` at the root level.
- Stage and commit the initial scaffolding to the local Git repository.

## Verification Plan
- Verify that `docker-compose.yml` is well-formed.
- Ensure the directory structure matches the architecture.
- Confirm the `pom.xml` files have the correct Java versions and dependencies.
