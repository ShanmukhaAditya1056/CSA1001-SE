# DevTrack — API Specification Document

## 1. Overview
DevTrack exposes a versioned RESTful JSON API under `/api/v1`.

### 1.1 Standard Response Format
All successful responses return HTTP status `200` (or `201` for creation) in the following envelope:
```json
{
  "data": {},
  "meta": {
    "timestamp": "2026-10-25T15:00:00Z",
    "version": "1.0"
  },
  "error": null
}
```

### 1.2 Standard Error Response Format
All client or server failures return appropriate HTTP status codes (`400`, `401`, `403`, `404`, `409`, `500`) with this error envelope:
```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "details": [
      { "field": "email", "message": "Email is already registered" }
    ]
  }
}
```

---

## 2. API Endpoints

### 2.1 Authentication (`/api/v1/auth`)

#### `POST /api/v1/auth/register`
- **Description:** Provision new workspace user account.
- **Request:**
  ```json
  {
    "name": "Alex Vance",
    "email": "alex@devtrack.io",
    "password": "password123"
  }
  ```
- **Response (201):**
  ```json
  {
    "data": {
      "id": "usr-001",
      "name": "Alex Vance",
      "email": "alex@devtrack.io"
    }
  }
  ```

#### `POST /api/v1/auth/login`
- **Description:** Authenticate user and issue secure HTTP-only cookie.
- **Request:**
  ```json
  {
    "email": "alex@devtrack.io",
    "password": "password123"
  }
  ```
- **Response (200):** Sets cookie `devtrack_session`.

#### `POST /api/v1/auth/logout`
- **Description:** Clears session cookie.

#### `GET /api/v1/auth/me`
- **Description:** Retrieves current authenticated user profile.

---

### 2.2 Projects & Membership (`/api/v1/projects`)

#### `GET /api/v1/projects`
- **Auth:** Requires authenticated user. Returns only projects where user is an active member.

#### `POST /api/v1/projects`
- **Description:** Creates a new project; caller is automatically assigned `Owner` role.
- **Request:**
  ```json
  {
    "name": "DevTrack Platform",
    "key": "DEV",
    "description": "Lifecycle management platform",
    "startDate": "2026-09-15"
  }
  ```

#### `GET /api/v1/projects/:projectId/members`
- **Description:** Lists members and their assigned roles (`Owner`, `Developer`, `Tester`, `Viewer`).

#### `POST /api/v1/projects/:projectId/members`
- **Auth:** `Owner` only.
- **Request:**
  ```json
  {
    "email": "jordan@devtrack.io",
    "role": "Developer"
  }
  ```

#### `DELETE /api/v1/projects/:projectId/members/:memberId`
- **Auth:** `Owner` only.
- **Validation:** Returns `400 Bad Request` if attempting to delete the last project owner.

---

### 2.3 Requirements & MoSCoW (`/api/v1/projects/:projectId/requirements`)

#### `GET /api/v1/projects/:projectId/requirements?priority=Must&status=Approved`
- **Description:** Query specifications with MoSCoW and status filters.

#### `POST /api/v1/projects/:projectId/requirements`
- **Request:**
  ```json
  {
    "title": "Argon2id Password Hashing",
    "description": "Secure password storage using memory-hard Argon2id.",
    "priority": "Must",
    "status": "Approved",
    "acceptanceCriteria": "Given valid password, hash matches verification salt."
  }
  ```

#### `GET /api/v1/requirements/:requirementId/history`
- **Description:** Returns chronological list of field revisions:
  ```json
  {
    "data": [
      {
        "id": "rh-001",
        "field": "status",
        "oldValue": "Draft",
        "newValue": "Approved",
        "changedBy": "Alex Vance",
        "changedAt": "2026-09-20T00:00:00Z"
      }
    ]
  }
  ```

---

### 2.4 Sprints & Tasks

#### `GET /api/v1/projects/:projectId/sprints`
- **Description:** Lists sprints with dates, goals, and status (`Planned`, `Active`, `Completed`).

#### `POST /api/v1/projects/:projectId/tasks`
- **Request:**
  ```json
  {
    "title": "Implement JWT cookie handler",
    "sprintId": "sprint-001",
    "assigneeId": "usr-002",
    "priority": "High",
    "status": "To Do",
    "estimate": 5,
    "requirementIds": ["req-001"]
  }
  ```

---

### 2.5 Testing & QA Execution

#### `POST /api/v1/projects/:projectId/test-cases`
- **Request:**
  ```json
  {
    "title": "Verify duplicate email rejection",
    "steps": "1. POST /auth/register with duplicate email\n2. Check status",
    "expectedResult": "HTTP 409 Conflict with duplicate email message",
    "requirementIds": ["req-001"]
  }
  ```

#### `POST /api/v1/test-cases/:testCaseId/runs`
- **Request:**
  ```json
  {
    "result": "Passed",
    "notes": "Asserted 409 Conflict returned successfully."
  }
  ```

---

### 2.6 Defects & Bugs

#### `POST /api/v1/projects/:projectId/bugs`
- **Request:**
  ```json
  {
    "title": "Session cookie expires unexpectedly",
    "severity": "Critical",
    "priority": "High",
    "status": "Open",
    "stepsToReproduce": "1. Login\n2. Wait 5 minutes\n3. Request fails with 401",
    "relatedRequirementId": "req-001",
    "relatedTestRunId": "tr-003"
  }
  ```

---

### 2.7 Releases & Traceability Matrix

#### `GET /api/v1/projects/:projectId/traceability`
- **Description:** Generates the complete forward and backward audit matrix linking:
  $$\text{Requirement} \longrightarrow \text{Tasks} \longrightarrow \text{Test Runs} \longrightarrow \text{Bugs} \longrightarrow \text{Release Gate}$$
