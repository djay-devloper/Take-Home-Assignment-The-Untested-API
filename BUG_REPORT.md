# Bug Report — Task Manager API

This document details all bugs discovered during exploratory testing and test suite implementation, along with root causes, reproduction steps, and proposed fixes.

---

## Summary of Discovered Bugs

| Bug ID | Component | Severity | Title | Status |
|--------|-----------|----------|-------|--------|
| BUG-001 | `taskService.js` | **High** | 1-based pagination skips the entire first page | **Fixed** |
| BUG-002 | `taskService.js` | **High** | `completeTask` resets task priority to `'medium'` | **Fixed** |
| BUG-003 | `taskService.js` | **Medium** | `getByStatus` uses substring search (`includes`) instead of exact match | **Fixed** |
| BUG-004 | `validators.js` | **Medium** | Falsy check allows empty string status & priority to bypass validation | **Fixed** |
| BUG-005 | `routes/tasks.js` | **Medium** | Status filter and pagination cannot be combined (pagination ignored) | **Fixed** |
| BUG-006 | `taskService.js` | **Medium** | Updating a task allows mutating immutable identifiers (`id`, `createdAt`) | **Fixed** |
| BUG-007 | `validators.js` | **Low** | Passing non-object body throws unhandled `TypeError` | **Fixed** |

---

## Detailed Bug Reports

### BUG-001: 1-Based Pagination Skips First Page

- **Location:** `src/services/taskService.js` (lines 11–14)
- **Expected Behavior:** Requesting page 1 with limit $L$ (`page=1&limit=10`) should return tasks from index $0$ to $9$ (the first page of tasks).
- **Actual Behavior:** The offset calculation was implemented as `const offset = page * limit;`. When `page = 1` and `limit = 10`, `offset = 10`, which skips items 0 through 9 entirely and returns items 10 through 19. Page 1 thus returns page 2's data, and the actual first page of data is never reachable.
- **How Discovered:** Unit test `getPaginated › returns correct slice for page 1` failed:
  ```text
  Expected length: 2
  Received length: 1
  Received array: [{"id": "...", "title": "Task 3"}]
  ```
- **Fix:**
  ```javascript
  const getPaginated = (page, limit) => {
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 10);
    const offset = (pageNum - 1) * limitNum;
    return tasks.slice(offset, offset + limitNum);
  };
  ```

---

### BUG-002: `completeTask` Overwrites Task Priority to `'medium'`

- **Location:** `src/services/taskService.js` (line 69)
- **Expected Behavior:** Completing a task via `PATCH /tasks/:id/complete` should only update `status` to `'done'` and set `completedAt` to the current ISO timestamp, preserving the task's existing `priority`.
- **Actual Behavior:** The `completeTask` function had a hardcoded `priority: 'medium'` in the updated object:
  ```javascript
  const updated = {
    ...task,
    priority: 'medium', // Overwrites existing priority!
    status: 'done',
    completedAt: new Date().toISOString(),
  };
  ```
  Any task marked as `high` or `low` priority was silently downgraded/changed to `medium` upon completion.
- **How Discovered:** Integration test `PATCH /tasks/:id/complete › marks task as completed, setting status to done and preserving priority` failed:
  ```text
  Expected: "high"
  Received: "medium"
  ```
- **Fix:** Removed the hardcoded `priority: 'medium'` line so the spread `...task` retains its original priority.

---

### BUG-003: `getByStatus` Uses Substring Matching Instead of Exact Match

- **Location:** `src/services/taskService.js` (line 9)
- **Expected Behavior:** Filtering tasks by `status` should only return tasks matching the exact status string (e.g. `status === 'todo'`).
- **Actual Behavior:** The filter was implemented as:
  ```javascript
  const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
  ```
  Passing query `?status=do` would return both `'todo'` and `'done'` tasks. Passing `?status=in` would return `'in_progress'`.
- **How Discovered:** Unit test `getByStatus › does not return tasks on substring/partial matches` failed:
  ```text
  Expected length: 0
  Received length: 2
  ```
- **Fix:** Changed substring search to strict equality:
  ```javascript
  const getByStatus = (status) => tasks.filter((t) => t.status === status);
  ```

---

### BUG-004: Falsy Check Allows Empty String Status/Priority to Bypass Validation

- **Location:** `src/utils/validators.js` (lines 8, 11, 24, 27)
- **Expected Behavior:** Providing `""` (empty string) as `status` or `priority` should trigger a 400 Bad Request indicating it must be one of the allowed enum values.
- **Actual Behavior:** The validator used truthiness checks:
  ```javascript
  if (body.status && !VALID_STATUSES.includes(body.status))
  ```
  In JavaScript, `""` is falsy. Therefore, `body.status && ...` evaluates to `""` (falsy) and bypasses the validation condition, allowing an empty status or priority to be saved to the database.
- **How Discovered:** Unit test `validateCreateTask › fails when status is invalid or empty string` received `null` instead of the validation error.
- **Fix:** Changed check from truthiness to explicit `!== undefined`:
  ```javascript
  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    return `status must be one of: ${VALID_STATUSES.join(', ')}`;
  }
  ```

---

### BUG-005: Status Filter and Pagination Cannot Be Combined

- **Location:** `src/routes/tasks.js` (lines 14–24)
- **Expected Behavior:** Clients can request filtered and paginated tasks together (e.g., `GET /tasks?status=todo&page=1&limit=5`).
- **Actual Behavior:** `GET /tasks` contained early-returning `if` blocks:
  ```javascript
  if (status) {
    const tasks = taskService.getByStatus(status);
    return res.json(tasks); // Early return ignores page & limit
  }
  ```
  If `status` was present in the query parameters, the handler immediately returned all matching tasks without checking for `page` or `limit`.
- **How Discovered:** Integration test `GET /tasks?status=todo&page=1&limit=2` returned all 3 todo tasks instead of 2.
- **Fix:** Composed the filtering and pagination steps sequentially rather than mutually exclusively:
  ```javascript
  let tasks = status ? taskService.getByStatus(status) : taskService.getAll();
  if (page !== undefined || limit !== undefined) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const offset = Math.max(0, (pageNum - 1) * limitNum);
    tasks = tasks.slice(offset, offset + limitNum);
  }
  res.json(tasks);
  ```

---

### BUG-006: Mutating Immutable Task Properties (`id`, `createdAt`)

- **Location:** `src/services/taskService.js` (lines 46–53)
- **Expected Behavior:** `PUT /tasks/:id` should update mutable fields (`title`, `description`, `status`, `priority`, `dueDate`), but preserve system-generated fields like `id` and `createdAt`.
- **Actual Behavior:** `tasks[index] = { ...tasks[index], ...fields };` blindly merged the payload. A client could maliciously overwrite `id` or alter audit timestamps `createdAt`.
- **How Discovered:** Unit test `update › does not allow mutating id or createdAt` found that the task's `id` changed to `"hacked-id"`.
- **Fix:** Destructured and stripped out `id` and `createdAt` before updating:
  ```javascript
  const { id: _ignoredId, createdAt: _ignoredCreatedAt, ...allowedFields } = fields;
  const updated = { ...tasks[index], ...allowedFields };
  ```

---

### BUG-007: Non-Object Body Throws Unhandled `TypeError`

- **Location:** `src/utils/validators.js`
- **Expected Behavior:** If a request is sent with an invalid or null body, the validator should return a user-friendly error string (`request body must be an object`).
- **Actual Behavior:** Executing `body.title` when `body` is `null` or `undefined` throws an unhandled `TypeError: Cannot read properties of null`, causing an unhandled 500 error instead of a clean 400 Bad Request.
- **How Discovered:** Edge case unit test passing `null` to `validateCreateTask`.
- **Fix:** Added null/object guard at the start of all validator functions:
  ```javascript
  if (!body || typeof body !== 'object') {
    return 'request body must be an object';
  }
  ```
