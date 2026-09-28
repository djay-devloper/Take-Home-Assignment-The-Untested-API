# Take-Home Assignment Submission: Task Manager API

## Overview
This submission provides comprehensive test coverage, bug reports and fixes, the implementation of the new `PATCH /tasks/:id/assign` endpoint, and production-ready deployment configurations (health checks, graceful shutdowns, Dockerfile, docker-compose).

---

## 1. Test Suite & Coverage

The test suite is structured into unit tests and integration tests using Jest and Supertest:
- **Unit Tests:**
  - `tests/unit/taskService.test.js`: Direct unit tests covering all functions in `taskService.js` (`create`, `getAll`, `findById`, `getByStatus`, `getPaginated`, `getStats`, `update`, `remove`, `completeTask`, `assignTask`, `_reset`).
  - `tests/unit/validators.test.js`: Unit tests for input validators (`validateCreateTask`, `validateUpdateTask`, `validateAssignTask`) including edge cases.
- **Integration Tests:**
  - `tests/integration/tasks.test.js`: Supertest integration tests testing every API route, status codes (200, 201, 204, 400, 404, 500), pagination, query filters, and payload validations.

### Coverage Summary

```text
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-----------------|---------|----------|---------|---------|-------------------
All files        |   94.88 |    99.04 |   91.42 |   94.44 |                   
 src             |    62.5 |       75 |      50 |    62.5 |                   
  app.js         |    62.5 |       75 |      50 |    62.5 | 33-46             
 src/routes      |     100 |      100 |     100 |     100 |                   
  tasks.js       |     100 |      100 |     100 |     100 |                   
 src/services    |     100 |      100 |     100 |     100 |                   
  taskService.js |     100 |      100 |     100 |     100 |                   
 src/utils       |     100 |      100 |     100 |     100 |                   
  validators.js  |     100 |      100 |     100 |     100 |                   
-----------------|---------|----------|---------|---------|-------------------

Test Suites: 3 passed, 3 total
Tests:       80 passed, 80 total
Snapshots:   0 total
```
*(Note: The only uncovered lines in `src/app.js` represent the `if (require.main === module)` block that executes only when starting the server process directly).*

---

## 2. Bug Reports & Fixes (Part A & B)

A comprehensive bug report is documented in [BUG_REPORT.md](./BUG_REPORT.md). Seven distinct bugs were identified:

1. **Pagination offset calculation bug (Primary Fix):**
   - *Problem:* `offset = page * limit` skipped the entire first page when using 1-based indexing (`page=1&limit=10` skipped items 0–9).
   - *Fix:* Updated formula to `(pageNum - 1) * limitNum` with safe minimum defaults.
2. **`completeTask` priority overwrite:**
   - *Problem:* Hardcoded `priority: 'medium'` stripped out high/low priorities when marking a task complete.
   - *Fix:* Removed the override, preserving the task's existing priority.
3. **Substring status matching:**
   - *Problem:* `getByStatus` used `.includes(status)`, matching `'do'` with both `'todo'` and `'done'`.
   - *Fix:* Enforced exact match `t.status === status`.
4. **Falsy empty-string validator bypass:**
   - *Problem:* `if (body.status && ...)` allowed `""` to bypass validation.
   - *Fix:* Checked `if (body.status !== undefined && ...)`.
5. **Mutually exclusive status filter and pagination:**
   - *Problem:* Passing both `?status=` and `?page=` ignored pagination.
   - *Fix:* Structured filter and pagination sequentially in `routes/tasks.js`.
6. **Immutable field mutation:**
   - *Problem:* `PUT /tasks/:id` allowed overwriting `id` and `createdAt`.
   - *Fix:* Stripped `id` and `createdAt` from update payloads in `taskService.update`.
7. **Validator unhandled null reference:**
   - *Problem:* `validateCreateTask(null)` crashed with `TypeError`.
   - *Fix:* Added null/type guard checks.

---

## 3. New Feature: `PATCH /tasks/:id/assign` (Part C)

### Specification & Design Decisions
- **Route:** `PATCH /tasks/:id/assign`
- **Request Body:** `{ "assignee": "string" }`
- **Response:**
  - `200 OK` with updated task object (`assignee: "Alice"`).
  - `400 Bad Request` if `assignee` is missing, not a string, or contains only whitespace.
  - `404 Not Found` if no task matches `:id`.

### Design Trade-offs & Decisions:
1. **Validation & Whitespace:** Empty strings (`""`) and whitespace-only strings (`"   "`) are rejected with `400 Bad Request`. Assignee names are trimmed of leading/trailing whitespace.
2. **Reassignment:** If a task already has an assignee, subsequent calls to `PATCH /tasks/:id/assign` cleanly update the assignee to the new user without errors.
3. **Default Field Value:** Newly created tasks initialize with `assignee: null` to maintain a consistent schema across all task objects.
4. **Endpoint Separation:** Implemented dedicated `validateAssignTask` in `src/utils/validators.js` and `assignTask` in `src/services/taskService.js` to preserve separation of concerns and maintain testability.

---

## 4. Production Readiness & Deployment

To prepare the service for production deployment:
1. **Health Check (`GET /health`):** Added a standardized health endpoint reporting uptime and service status for container orchestrators (Kubernetes, AWS ECS, Railway, Render).
2. **Graceful Shutdown:** Configured `SIGTERM` and `SIGINT` handlers in `src/app.js` to ensure in-flight HTTP requests complete before the server exits.
3. **Containerization (`Dockerfile`):**
   - Multi-stage / lightweight Node 20 Alpine image.
   - Uses `npm ci --omit=dev` for deterministic dependency installation without test libraries in production.
   - Runs as non-root user (`USER node`) for container security.
   - Integrated container `HEALTHCHECK`.
4. **Orchestration:** Added [docker-compose.yml](./docker-compose.yml) and [.dockerignore](./task-api/.dockerignore).
5. **Environment Configuration:** Provided [.env.example](./task-api/.env.example).

---

## 5. Reflection & Production Considerations

### What I'd test next if I had more time:
- **Concurrency & Race Conditions:** Because the current data store is in-memory JavaScript arrays, concurrent mutations are safe within a single event loop, but testing atomic updates under clustering (e.g., PM2 or multi-worker Node) would be essential.
- **Contract / Schema Testing:** Implement automated OpenAPI/Swagger specification testing or JSON Schema validation (e.g., Zod or Joi) to guarantee API contract stability across releases.
- **Fuzz Testing:** Run property-based testing (e.g. `fast-check`) on edge-case inputs like Unicode emojis, right-to-left text, and extreme page/limit numbers.
- **Load / Stress Testing:** Run k6 or Autocannon benchmarks to verify performance characteristics under high throughput.

### Anything that surprised you in the codebase:
- The pagination offset calculation skipping page 1 was a classic off-by-one bug that would immediately degrade user experience.
- The `completeTask` function silently modifying `priority` to `'medium'` stood out — in production, this would cause data loss for priority metrics and workflows.
- Route definition ordering: `/stats` was placed before `/:id` in `routes/tasks.js`. While this is correct to avoid `:id` swallowing `/stats`, relying on route declaration order without path prefixing can be error-prone as teams grow.

### Questions I'd ask before shipping this to production:
1. **Persistence & Scalability:** In-memory storage resets on server restart and cannot scale horizontally across multiple instances. Which persistent database (PostgreSQL, MongoDB, Redis) fits the product roadmap?
2. **Authentication & Authorization:** Currently, any client can create, modify, delete, or assign any task. What authentication mechanism (JWT, OAuth2, session cookies) and role-based access control (RBAC) should be introduced?
3. **Assignee Model:** Is assignee simply an arbitrary string name, or should it validate against a registered User entity ID in a Users service?
4. **Pagination Standards:** Should we implement cursor-based pagination instead of offset-based pagination to avoid duplication when tasks are inserted while a user is paging?
5. **Audit Logs & Soft Deletes:** Should tasks support soft deletion (`deletedAt`) and an audit log of who changed status/assignee and when?
