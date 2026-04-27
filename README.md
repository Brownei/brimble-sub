# Brimble Deployment Platform

A full-stack deployment platform that enables users to deploy applications from Git repositories or direct file uploads. The platform simulates containerized deployments with real-time log streaming and deployment management.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Setup Instructions](#setup-instructions)
  - [Local Development](#local-development)
  - [Docker Deployment](#docker-deployment)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Environment Variables](#environment-variables)
- [Development Workflow](#development-workflow)

---

## Overview

Brimble is a deployment platform built with:

- **Backend**: Go (Golang) with Chi router, GORM, and PostgreSQL
- **Frontend**: React 19 with TypeScript, Vite, TanStack Router/Query, and Tailwind CSS
- **Reverse Proxy**: Caddy for routing and SSL termination
- **Database**: PostgreSQL 16 for data persistence

### Key Features

- Deploy applications from Git repositories or ZIP file uploads
- Real-time log streaming via Server-Sent Events (SSE)
- Mock Docker build simulation with realistic build steps
- Deployment status tracking (pending → building → deploying → running/failed)
- RESTful API for deployment management

---

## Architecture

### System Architecture Diagram

```
                    ┌─────────────────┐
                    │   Caddy Proxy   │
                    │   (Port 8000)   │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
   │   Client    │   │   Server    │   │  SSE Stream │
   │ (React/Vite)│   │  (Go/Chi)   │   │  (Port 3333)│
   │  Port 3000  │   │  Port 3333  │   └─────────────┘
   └─────────────┘   └──────┬──────┘
                            │
                            ▼
                    ┌─────────────┐
                    │  PostgreSQL │
                    │   Port 5432 │
                    └─────────────┘
```

### Component Overview

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Client** | React 19 + Vite | Frontend UI for deployment management |
| **Server** | Go + Chi Router | REST API and SSE log streaming |
| **Database** | PostgreSQL 16 | Deployment and log storage |
| **Proxy** | Caddy 2 | Reverse proxy, routing, SSL |

### Request Flow

1. **Client requests** → `localhost:8000` → Caddy → React dev server (port 3000)
2. **API requests** → `api.localhost:8000` → Caddy → Go server (port 3333)
3. **SSE streaming** → `sse.localhost:8000` → Caddy → Go server (unbuffered)
4. **Database** → Go server ↔ PostgreSQL (port 5432)

---

## Prerequisites

### Required

- [Docker](https://docs.docker.com/get-docker/) 20.10+
- [Docker Compose](https://docs.docker.com/compose/install/) 2.0+
- [Go](https://golang.org/dl/) 1.22+ (for local development)
- [Node.js](https://nodejs.org/) 20+ (for local development)
- [pnpm](https://pnpm.io/installation) (package manager)

### Optional

- [Air](https://github.com/cosmtrek/air) - Go live reload
- [Make](https://www.gnu.org/software/make/) - Build automation

---

## Quick Start

The fastest way to get started is using Docker Compose:

```bash
# Clone the repository
git clone <repository-url>
cd brimble-sub

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Access the application
# Frontend: http://localhost:8000
# API:      http://api.localhost:8000
```

Services will be available after approximately 30 seconds.

---

## Setup Instructions

### Local Development

#### 1. Database Setup

```bash
# Start PostgreSQL via Docker
docker run -d \
  --name brimble-postgres \
  -e POSTGRES_USER=brimble \
  -e POSTGRES_PASSWORD=brimble \
  -e POSTGRES_DB=brimble \
  -p 5432:5432 \
  postgres:16-alpine
```

#### 2. Backend Setup

```bash
# Navigate to server directory
cd server

# Copy environment configuration
cp .env.example .env

# Install Go dependencies
go mod tidy

# Run database migrations (auto-migrated by GORM on startup)
# Start the server
go run main.go

# Or use Air for hot reloading
air
```

The server will start on `http://localhost:3333`.

#### 3. Frontend Setup

```bash
# Navigate to client directory
cd client

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The client will start on `http://localhost:3000`.

### Docker Deployment

#### Production Build

```bash
# Build and start all services
docker-compose up --build -d

# Scale specific services (if needed)
docker-compose up -d --scale server=2

# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v
```

#### Development with Docker

```bash
# View service logs
docker-compose logs -f server
docker-compose logs -f client
docker-compose logs -f postgres

# Execute commands in containers
docker-compose exec server sh
docker-compose exec postgres psql -U db -d db

# Restart specific service
docker-compose restart server
```

---

## Project Structure

```
brimble-sub/
├── docker-compose.yml          # Docker orchestration
├── Caddyfile                   # Reverse proxy configuration
├── brimble.sh                  # Deployment script
│
├── client/                     # React Frontend
│   ├── src/
│   │   ├── routes/            # TanStack Router routes
│   │   ├── components/        # React components
│   │   ├── hooks/             # Custom hooks
│   │   ├── lib/               # Utilities
│   │   └── styles/            # CSS/Tailwind
│   ├── package.json
│   ├── vite.config.ts
│   ├── Dockerfile
│
├── server/                     # Go Backend
│   ├── api/
│   │   ├── api.go             # Router setup
│   │   └── handlers/          # HTTP handlers
│   ├── db/
│   │   ├── db.go              # Database connection
│   │   └── models/            # GORM models
│   ├── internal/
│   │   ├── config.go          # Configuration
│   │   ├── logger.go          # Logging setup
│   │   ├── services/          # Business logic
│   │   └── repo-downloader.go # Git operations
│   ├── deployments/           # Deployment storage
│   ├── main.go                # Application entry
│   ├── go.mod
│   ├── Dockerfile
│   └── .air.toml              # Air config
│
└── README.md                   # This file
```

---

## API Endpoints

### Deployment Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/deployments` | List all deployments |
| GET | `/v1/deployments/{uuid}` | Get deployment by UUID |
| POST | `/v1/deployments/git` | Create deployment from Git repo |
| POST | `/v1/deployments/upload` | Create deployment from ZIP upload |
| DELETE | `/v1/deployments/{uuid}` | Delete deployment |
| GET | `/v1/deployments/{uuid}/logs` | Get deployment logs |
| GET | `/v1/deployments/{uuid}/logs/stream` | Stream logs (SSE) |

### Request/Response Examples

#### Create Git Deployment

```bash
curl -X POST http://api.localhost:8000/v1/deployments/git \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-app",
    "git_url": "https://github.com/example/repo.git",
    "branch": "main",
    "port": 8080
  }'
```

Response:
```json
{
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "name": "my-app",
  "git_url": "https://github.com/example/repo.git",
  "branch": "main",
  "status": "pending",
  "port": 8080,
  "created_at": "2024-01-01T12:00:00Z"
}
```

#### Stream Logs (SSE)

```javascript
const eventSource = new EventSource(
  'http://api.localhost:8000/v1/deployments/{uuid}/logs/stream'
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data.message);
};
```

---

## Environment Variables

### Server Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | postgres | PostgreSQL host |
| `DB_PORT` | 5432 | PostgreSQL port |
| `DB_USER` | db | Database username |
| `DB_PASSWORD` | db | Database password |
| `DB_NAME` | db | Database name |
| `APP_PORT` | 3333 | Server listen port |
| `APP_ENV` | production | Environment mode |

### Client Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | http://api.localhost/v1 | API base URL |

### Docker Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `COMPOSE_PROJECT_NAME` | brimble | Docker project name |

---

## Development Workflow

### Adding a New API Endpoint

1. **Define the handler** in `server/api/handlers/`:

```go
func (h *DeploymentHandler) NewEndpoint(w http.ResponseWriter, r *http.Request) {
    // Implementation
}
```

2. **Register the route** in `server/api/api.go`:

```go
r.Route("/v1", func(r chi.Router) {
    r.Get("/new-endpoint", deploymentHandler.NewEndpoint)
})
```

3. **Add frontend integration** in `client/src/` as needed.

### Database Migrations

GORM auto-migrates models on startup. To add a new model:

1. Define the model in `server/db/models/models.go`:

```go
type NewModel struct {
    gorm.Model
    Name string `json:"name"`
}
```
---

### Common Issues

**Port Conflicts**
```bash
# Check if ports are in use
lsof -i :5432  # PostgreSQL
lsof -i :3333  # Server
lsof -i :3000  # Client
lsof -i :8000  # Caddy
```

**Database Connection Issues**
```bash
# Verify PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres
```

**Caddy Certificate Issues**
```bash
# Remove Caddy data to regenerate certificates
docker-compose down --volumes
docker volume rm brimble-sub_caddy_data
docker-compose up -d
```

---

# brimble-sub
