# Orchestrix — Service Execution Guide

This document contains step-by-step commands to run each service in the Orchestrix platform individually in separate terminal windows.

---

## 🚀 Quick Reference Summary

| Service Name | Directory | Default Port | Primary Run Command (Linux / macOS) | Primary Run Command (Windows PowerShell) |
|---|---|---|---|---|
| **Infrastructure Containers** | `backend/` | `5432` (DB)<br>`6379` (Redis)<br>`9000/9001` (MinIO) | `docker compose up -d` | `docker compose up -d` |
| **Core API Service** | `backend/core-api` | `8080` | `./run.sh`<br>*(or `./mvnw spring-boot:run`)* | `.\run.ps1`<br>*(or `.\mvnw.cmd spring-boot:run`)* |
| **Realtime Service** | `backend/realtime-service` | `8082` | `./mvnw spring-boot:run` | `.\mvnw.cmd spring-boot:run` |
| **Context Engine (AI)** | `backend/context-engine` | `8083` | `./run.sh`<br>*(or `uvicorn main:app --port 8083`)* | `.\venv\Scripts\Activate.ps1; uvicorn main:app --port 8083` |
| **Frontend Web App** | `frontend/orchestrix_orbit_frontend` | `3000` | `npm run dev` | `npm run dev` |

---

## 1. Infrastructure Services (PostgreSQL, Redis, MinIO)

Before running the application backend services, start the database and storage services via Docker.

### Terminal 1: Infrastructure
```bash
# Navigate to the backend directory
cd backend

# Start PostgreSQL, Redis, and MinIO in detached mode
docker compose up -d
```
> **Note**: To stop containers later, run `docker compose down`.

### Supabase database on an IPv4-only network

The direct Supabase database host (`db.<project-ref>.supabase.co`) uses IPv6 unless the project has the IPv4 add-on. If the machine running the Java services has no IPv6 route, set these values in both `backend/core-api/.env` and `backend/realtime-service/.env` using the **Session pooler** host shown in the Supabase Dashboard's Connect dialog:

```dotenv
SPRING_DATASOURCE_URL=jdbc:postgresql://<session-pooler-host>:5432/postgres?sslmode=require
SPRING_DATASOURCE_USERNAME=postgres.<project-ref>
SPRING_DATASOURCE_PASSWORD=<database-password>
```

The pooler host cannot be derived reliably from the project region; copy the exact host from the dashboard. Keep these `.env` files local because they contain credentials. The local Docker database above is a separate alternative and uses its own connection settings.

Core API and Realtime must also use the same `JWT_SECRET`. Core API signs tenant-bound login tokens; Realtime verifies them for chat history and STOMP connections. Users with tokens issued before this change must sign in again.

---

## 2. Core API Service (Spring Boot)

Handles core domain models, authentication, tenants, projects, resources, and task management.

- **Port**: `8080`
- **Location**: `backend/core-api`

### Terminal 2: Core API

#### Linux / macOS:
```bash
cd backend/core-api
./run.sh
```
*Or using Maven directly:*
```bash
cd backend/core-api
./mvnw spring-boot:run
```

#### Windows (PowerShell):
```powershell
cd backend\core-api
.\run.ps1
```
*Or using Maven directly:*
```powershell
cd backend\core-api
.\mvnw.cmd spring-boot:run
```

---

## 3. Realtime Service (Spring Boot WebSockets)

Handles real-time chat, WebSocket subscriptions, and live notifications.

- **Port**: `8082`
- **Location**: `backend/realtime-service`

### Terminal 3: Realtime Service

#### Linux / macOS:
```bash
cd backend/realtime-service
./mvnw spring-boot:run
```

#### Windows (PowerShell):
```powershell
cd backend\realtime-service
.\mvnw.cmd spring-boot:run
```

---

## 4. Context Engine Service (FastAPI / Gemini AI)

Provides AI summarization, contextual search, and intelligence insights using FastAPI and Google Gemini API.

- **Port**: `8083`
- **Swagger Docs**: `http://localhost:8083/docs`
- **Location**: `backend/context-engine`

### Setup Prerequisites (First Time Only):
Ensure a `.env` file exists in `backend/context-engine` containing your `GOOGLE_API_KEY`:
```bash
cd backend/context-engine
cp .env.example .env
# Edit .env and set GOOGLE_API_KEY=your_key_here
```

### Terminal 4: Context Engine

#### Linux / macOS:
```bash
cd backend/context-engine
./run.sh
```
*Or manually:*
```bash
cd backend/context-engine
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8083 --reload
```

#### Windows (PowerShell):
```powershell
cd backend\context-engine
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8083 --reload
```

---

## 5. Frontend Application (Next.js)

The web dashboard interface built with Next.js and TypeScript.

- **Port**: `3000`
- **Location**: `frontend/orchestrix_orbit_frontend`

### Terminal 5: Frontend

#### Linux / macOS / Windows:
```bash
cd frontend/orchestrix_orbit_frontend

# Install dependencies if not already done
npm install

# Start Next.js development server
npm run dev
```

---

## 🔗 Verification & Health Check URLs

Once all services are running, verify them in your browser or terminal:

| Service | Endpoint | Expected Result |
|---|---|---|
| **Frontend App** | [http://localhost:3000](http://localhost:3000) | Orchestrix Orbit Dashboard |
| **Core API** | [http://localhost:8080/api/admin/tenants](http://localhost:8080/api/admin/tenants) | Tenant API Response |
| **Realtime Service** | [http://localhost:8082/ws-chat](http://localhost:8082/ws-chat) | WebSocket Endpoint |
| **Context Engine** | [http://localhost:8083/docs](http://localhost:8083/docs) | FastAPI OpenAPI Documentation |
| **MinIO Console** | [http://localhost:9001](http://localhost:9001) | Object Storage Admin Console |
