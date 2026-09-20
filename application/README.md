# Task Manager Application

A production-ready task management application built as the workload for the **CloudNative EKS Platform**. The app is intentionally small and focused — its purpose is to serve as a realistic service that gets deployed, monitored, and scaled on AWS EKS.

## Architecture

```
┌──────────────────┐         ┌──────────────────┐         ┌──────────────┐
│                  │  HTTP   │                  │         │              │
│  React + Vite    │────────▶│  Express API     │────────▶│  PostgreSQL  │
│  (Frontend)      │         │  (Backend)       │         │  (Database)  │
│                  │         │                  │         │              │
└──────────────────┘         └────────┬─────────┘         └──────────────┘
                                      │
                                      │
                              ┌───────▼────────┐
                              │                │
                              │     Redis      │
                              │   (Cache)      │
                              │                │
                              └────────────────┘
```

| Layer     | Technology        | Purpose                            |
|-----------|-------------------|------------------------------------|
| Frontend  | React + Vite      | Dashboard UI with Kanban board     |
| Backend   | Node.js + Express | REST API, validation, caching      |
| Database  | PostgreSQL        | Persistent task storage            |
| Cache     | Redis             | Read-through caching (optional)    |

> Redis is **optional** — the backend gracefully degrades to direct database reads if Redis is unavailable.

---

## Local Development Setup

### Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** ≥ 14
- **Redis** ≥ 7 (optional)

### 1. Clone and install

```bash
# Backend
cd application/backend
cp .env.example .env   # Edit with your local credentials
npm install

# Frontend
cd ../frontend
cp .env.example .env
npm install
```

### 2. Configure environment

Edit `backend/.env`:

```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/taskmanager
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
```

Edit `frontend/.env`:

```env
VITE_API_URL=http://localhost:3001
```

### 3. Create the database

```bash
createdb taskmanager
# The backend auto-creates the tasks table on startup.
```

### 4. Start the services

```bash
# Terminal 1 — Backend
cd application/backend
npm run dev

# Terminal 2 — Frontend
cd application/frontend
npm run dev
```

The frontend runs on `http://localhost:5173` and the backend on `http://localhost:3001`.

---

## Environment Variables

### Backend

| Variable       | Default                                    | Description                          |
|----------------|--------------------------------------------|--------------------------------------|
| `PORT`         | `3001`                                     | HTTP server port                     |
| `NODE_ENV`     | `development`                              | Environment (`development`/`production`) |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/taskmanager` | PostgreSQL connection string |
| `REDIS_URL`    | `redis://localhost:6379`                   | Redis connection string              |
| `DB_POOL_MIN`  | `2`                                        | Minimum database pool connections    |
| `DB_POOL_MAX`  | `10`                                       | Maximum database pool connections    |
| `CACHE_TTL`    | `60`                                       | Redis cache TTL in seconds           |
| `LOG_LEVEL`    | `info`                                     | Pino log level                       |
| `CORS_ORIGIN`  | `*`                                        | Allowed CORS origin                  |

### Frontend

| Variable       | Default                  | Description           |
|----------------|--------------------------|-----------------------|
| `VITE_API_URL` | `http://localhost:3001`  | Backend API base URL  |

---

## API Endpoints

### Health & Readiness

| Method | Path      | Description                                          | Response       |
|--------|-----------|------------------------------------------------------|----------------|
| `GET`  | `/health` | Liveness probe — always returns 200 if process is up | `200`          |
| `GET`  | `/ready`  | Readiness probe — checks PostgreSQL connectivity     | `200` or `503` |

### Tasks CRUD

| Method   | Path              | Description                    | Status Codes      |
|----------|-------------------|--------------------------------|--------------------|
| `GET`    | `/api/tasks`      | List tasks (filterable)        | `200`              |
| `GET`    | `/api/tasks/:id`  | Get a single task              | `200`, `404`       |
| `POST`   | `/api/tasks`      | Create a task                  | `201`, `400`       |
| `PUT`    | `/api/tasks/:id`  | Update a task                  | `200`, `400`, `404`|
| `DELETE` | `/api/tasks/:id`  | Delete a task                  | `204`, `404`       |

#### Query Parameters for `GET /api/tasks`

| Parameter  | Values                          | Description          |
|------------|----------------------------------|----------------------|
| `status`   | `todo`, `in-progress`, `done`   | Filter by status     |
| `priority` | `low`, `medium`, `high`         | Filter by priority   |

#### Task Schema

```json
{
  "id": "uuid",
  "title": "string (required, max 255)",
  "description": "string (optional)",
  "status": "todo | in-progress | done",
  "priority": "low | medium | high",
  "created_at": "ISO 8601 timestamp",
  "updated_at": "ISO 8601 timestamp"
}
```

---

## Testing

```bash
cd application/backend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Test Suites

| Suite                        | Type        | Tests                                        |
|------------------------------|-------------|----------------------------------------------|
| `tests/unit/task.model.test.js`      | Unit        | Validation logic, constants                  |
| `tests/integration/api.test.js`      | Integration | All CRUD endpoints, filtering, error handling |
| `tests/integration/health.test.js`   | Integration | `/health` and `/ready` probe behavior        |

Tests use **mocked PostgreSQL and Redis** — no live database needed to run the test suite.

---

## Scripts

### Backend

| Script            | Command              | Description                      |
|-------------------|----------------------|----------------------------------|
| `npm start`       | `node src/server.js` | Production start                 |
| `npm run dev`     | `nodemon src/server.js` | Development with auto-reload  |
| `npm test`        | `jest`               | Run test suite                   |
| `npm run test:watch`    | `jest --watch`  | Tests in watch mode              |
| `npm run test:coverage` | `jest --coverage` | Tests with coverage report     |

### Frontend

| Script        | Command        | Description                |
|---------------|----------------|----------------------------|
| `npm run dev` | `vite`         | Development server         |
| `npm run build` | `vite build` | Production build           |
| `npm run preview` | `vite preview` | Preview production build |

---

## Production Features

- **Structured JSON logging** via Pino — compatible with CloudWatch, Fluentd, etc.
- **Health/readiness probes** for Kubernetes liveness and readiness checks
- **Graceful shutdown** on SIGTERM/SIGINT — drains HTTP connections, closes DB pool and Redis
- **Connection pooling** for PostgreSQL with configurable min/max
- **Read-through caching** with Redis (automatic cache invalidation on writes)
- **Security headers** via Helmet
- **CORS** configurable via environment variable
- **Input validation** with structured error responses
- **No hardcoded credentials** — all configuration via environment variables

---

## Project Structure

```
application/
├── backend/
│   ├── src/
│   │   ├── config/          # Database, Redis, env configuration
│   │   ├── lib/             # Logger
│   │   ├── middleware/       # Error handler
│   │   ├── models/          # Task data access layer
│   │   ├── routes/          # Express routes (health, tasks)
│   │   ├── app.js           # Express app setup
│   │   └── server.js        # Entry point + graceful shutdown
│   ├── tests/
│   │   ├── unit/            # Unit tests
│   │   └── integration/     # API + health tests
│   ├── .env.example
│   ├── jest.config.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/             # Backend API client
│   │   ├── components/      # React components
│   │   ├── App.jsx          # Main application
│   │   ├── index.css        # Design system
│   │   └── main.jsx         # Entry point
│   ├── .env.example
│   ├── index.html
│   └── package.json
└── README.md
```

---

## DevOps Integration Notes

This application is designed to be containerized and deployed on Kubernetes. The following artifacts are **not included** and will be created separately:

- Dockerfiles (multi-stage builds for frontend and backend)
- Kubernetes manifests / Helm charts
- CI/CD pipelines (Jenkins, GitHub Actions)
- Infrastructure as Code (Terraform)
- GitOps configuration (Argo CD)

Key integration points for DevOps tooling:

| Concern             | Application Support                                |
|---------------------|----------------------------------------------------|
| Health checks       | `GET /health` (liveness), `GET /ready` (readiness) |
| Configuration       | All via environment variables                      |
| Logging             | Structured JSON to stdout                          |
| Graceful shutdown   | Handles SIGTERM with connection draining            |
| Secrets             | No hardcoded credentials                           |
| Statelessness       | App is stateless; state lives in PostgreSQL/Redis   |
