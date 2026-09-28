# Take-Home Assignment — The Untested API (Completed)

A complete, production-ready Task Manager API with comprehensive unit and integration tests, bug fixes, feature implementation, and containerized deployment setup.

See **[SUBMISSION.md](./SUBMISSION.md)** for the full submission write-up and reflection.  
See **[BUG_REPORT.md](./BUG_REPORT.md)** for detailed documentation of all discovered bugs and fixes.  
See **[ASSIGNMENT.md](./ASSIGNMENT.md)** for original assignment brief.

---

## Getting Started

### Prerequisites
- Node.js 18+ (tested on Node 18 & 20)
- npm 9+
- Optional: Docker & Docker Compose

### Local Setup

```bash
cd task-api
npm install
npm start        # runs on http://localhost:3000
```

### Running Tests & Coverage

```bash
cd task-api
npm test           # runs all 80 tests
npm run coverage   # runs tests and outputs coverage table
```

### Running with Docker

Run directly with Docker Compose:
```bash
docker compose up --build
```
Or build and run the Docker container individually:
```bash
cd task-api
docker build -t task-api .
docker run -p 3000:3000 task-api
```

---

## API Reference

| Method   | Path                  | Status Code | Description |
|----------|-----------------------|-------------|-------------|
| `GET`    | `/health`             | `200`       | Service health check and uptime probe |
| `GET`    | `/tasks`              | `200`       | List tasks. Supports `?status=`, `?page=`, `?limit=` |
| `GET`    | `/tasks/:id`          | `200 / 404` | Fetch single task by ID |
| `POST`   | `/tasks`              | `201 / 400` | Create a new task |
| `PUT`    | `/tasks/:id`          | `200 / 400 / 404` | Full update of a task |
| `DELETE` | `/tasks/:id`          | `204 / 404` | Delete a task |
| `PATCH`  | `/tasks/:id/complete` | `200 / 404` | Mark task as complete (preserves priority) |
| `GET`    | `/tasks/stats`        | `200`       | Status counts + overdue count |
| `PATCH`  | `/tasks/:id/assign`   | `200 / 400 / 404` | Assign or reassign task to a user |

### Task Model

```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "status": "todo | in_progress | done",
  "priority": "low | medium | high",
  "dueDate": "ISO 8601 string or null",
  "completedAt": "ISO 8601 string or null",
  "createdAt": "ISO 8601 string",
  "assignee": "string or null"
}
```

---

## Example Requests

**Check Service Health**
```bash
curl http://localhost:3000/health
```

**Create a Task**
```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Deploy to staging", "priority": "high"}'
```

**Assign a Task**
```bash
curl -X PATCH http://localhost:3000/tasks/<id>/assign \
  -H "Content-Type: application/json" \
  -d '{"assignee": "Alex"}'
```

**Filter & Paginate Tasks**
```bash
curl "http://localhost:3000/tasks?status=todo&page=1&limit=10"
```

**Mark Complete**
```bash
curl -X PATCH http://localhost:3000/tasks/<id>/complete
```

