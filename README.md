# DaiPhat Lottery System

An enterprise omnichannel lottery management and distribution system designed for traditional and digital lottery operations, supporting retail customers, administrators/staff, street ticket vendors, and an integrated AI assistant.

---

## 🏛️ System Architecture

The system is designed with a Modular Monolith backend architecture integrated with specialized microservices:

* **`daiphat-be` (Core API)**:
  * **Runtime & Framework**: Java 21, Spring Boot 3.4, Gradle.
  * **Databases & Cache**: PostgreSQL 16 (Transactional Data), Redis 7 (Caching, Token Blacklist & Session Store), MongoDB (Audit Logs & Chat History).
  * **Schema Management**: Flyway Database Migration.
  * **Security**: Spring Security with JWT (HttpOnly Cookie) and RBAC (Role-Based Access Control) matrix.
  * **Realtime**: WebSocket / STOMP for live notifications and chat.

* **`daiphat-fe` (Web Portal)**:
  * **Runtime & Framework**: Next.js 15 (App Router), React 19, TypeScript.
  * **UI & Styling**: Material UI (MUI), Emotion, Tailwind CSS.
  * **State & Data Fetching**: TanStack React Query, Zustand, Axios.
  * **Portals**: Customer Web (Browsing, Purchasing, Draw Results, Prize Claims) and Admin/Staff Portal (Ticket Inventory, Order Fulfillment, Street Agent Allocation, Financial Reconciliation).

* **`daiphat-ai` (AI Assistant Service)**:
  * **Runtime & Framework**: Python 3.11, FastAPI, Uvicorn.
  * **AI & NLP**: Google Gemini API, LangChain.
  * **Features**: Customer intent classification, lottery statistics consultation, and automated 24/7 customer support.

* **`daiphat_mobile` (Mobile Application)**:
  * **Framework**: Flutter / Dart.
  * **Target**: Mobile app for Street Vendors (Ticket allocation, handover, on-the-go reconciliation) and end-users.

---

## 📋 Prerequisites

Ensure the following dependencies are installed on your development machine:

* **Docker & Docker Compose** (v24.0+)
* **Java Development Kit (JDK)**: Java 21 (Eclipse Temurin or OpenJDK)
* **Node.js**: v20.x or higher & npm
* **Python**: Python 3.10+ (for AI service)
* **Flutter SDK**: 3.24+ (for mobile app development)

---

## 🚀 Quick Start (Docker Compose)

### 1. Configure Environment Variables
Copy or create the `.env` file at the repository root:

```bash
# Ensure .env exists with required local credentials
cp .env.example .env
```

### 2. Start Full Stack
Start all infrastructure services, Core API, Web Portal, and AI service:

```bash
docker compose up -d --build
```

---

## 💻 Manual Local Development

### 1. Infrastructure Services (Database & Cache)
```bash
docker compose up -d postgres-db redis mongo
```

### 2. Backend Core API (`daiphat-be`)
```bash
cd daiphat-be/core-api

# Run Spring Boot application
./gradlew bootRun
```
* **Swagger API Documentation**: `http://localhost:8080/swagger-ui/index.html`

### 3. Frontend Web Portal (`daiphat-fe`)
```bash
cd daiphat-fe

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```
* **Web Portal URL**: `http://localhost:5173` (or configured dev port)

### 4. AI Service (`daiphat-ai`)
```bash
cd daiphat-ai

# Setup Python virtual environment
python3 -m venv .venv
source .venv/bin/activate # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Start FastAPI server
uvicorn main:app --reload --port 8000
```
* **Interactive API Docs**: `http://localhost:8000/docs`

---

## 🌐 Ports & Service Endpoints

| Service | Local Endpoint | Description |
| :--- | :--- | :--- |
| **Frontend Web** | `http://localhost:5173` | Customer & Admin Web Portal |
| **Backend Core API** | `http://localhost:8080` | Core RESTful API & WebSocket |
| **Swagger UI** | `http://localhost:8080/swagger-ui/index.html` | Interactive API Documentation |
| **AI FastAPI Service** | `http://localhost:8000` | AI Chatbot & Intent Engine |
| **PostgreSQL** | `localhost:5434` (mapped) | Main Relational Database |
| **Redis** | `localhost:6380` (mapped) | Session, Cache & Locks |
| **MongoDB** | `localhost:27018` (mapped) | Chat History & System Logs |

---

## 🛠️ Database Schema Management (Flyway)

Database migrations are managed automatically using **Flyway**:
* Migration Scripts Location: `daiphat-be/core-api/src/main/resources/db/migration/`
* Naming Convention: `V<YYYYMMDDHHmm>__<description>.sql`
* *Rule*: Never modify existing migrations that have already been applied to any target environment.

---

## 🧪 Testing & Quality Assurance

```bash
# Frontend TypeScript & Lint Check
cd daiphat-fe
npx tsc --noEmit

# Backend Unit & Integration Tests
cd daiphat-be/core-api
./gradlew test

# Preflight Deployment Check
scripts/preflight-deploy.sh
```
