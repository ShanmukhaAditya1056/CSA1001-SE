# DevTrack — Requirements Specification Document (SRS)

## 1. Introduction & Purpose
This Software Requirements Specification (SRS) defines the functional, non-functional, and data requirements for the DevTrack platform.

## 2. User Roles & Permission Matrix
DevTrack enforces **project-scoped role-based access control (RBAC)**:

| Feature / Operation | Owner | Developer | Tester | Viewer |
| :--- | :---: | :---: | :---: | :---: |
| Create / Edit Project Settings | ✅ | ❌ | ❌ | ❌ |
| Invite Members / Change Roles | ✅ | ❌ | ❌ | ❌ |
| Create / Edit Requirements | ✅ | ✅ | ❌ | ❌ |
| Create / Move Sprint Tasks | ✅ | ✅ | ❌ | ❌ |
| Create / Edit Test Cases | ✅ | ❌ | ✅ | ❌ |
| Execute Test Runs | ✅ | ❌ | ✅ | ❌ |
| Log / Triage Defects | ✅ | ✅ | ✅ | ❌ |
| Cut Releases / Sign-off | ✅ | ❌ | ❌ | ❌ |
| View Boards, Matrices & Diffs | ✅ | ✅ | ✅ | ✅ |

*Rule:* A project must always have at least one active Owner. Attempting to remove or demote the last Owner is strictly prevented.

---

## 3. Functional Requirements

### 3.1 Authentication & User Management (FR-AUTH)
- **FR-AUTH-1:** Users must register with valid full name, unique email, and password (minimum 8 characters).
- **FR-AUTH-2:** Passwords must be hashed using Argon2id or bcrypt prior to storage; plaintext passwords must never be stored, logged, or returned.
- **FR-AUTH-3:** Authentication sessions must utilize secure, HTTP-only cookies with configurable `SameSite` and `Secure` attributes.
- **FR-AUTH-4:** State-changing requests must be protected against Cross-Site Request Forgery (CSRF).

### 3.2 Project Governance (FR-PROJ)
- **FR-PROJ-1:** Users can create workspaces with unique alphanumeric project keys (e.g., `DEV`, `LOGIST`).
- **FR-PROJ-2:** Project creators are automatically assigned the `Owner` role.
- **FR-PROJ-3:** Project owners can invite registered users by email and assign them `Owner`, `Developer`, `Tester`, or `Viewer` roles.

### 3.3 MoSCoW Requirements Engineering (FR-REQ)
- **FR-REQ-1:** Specifications must be prioritized using MoSCoW: Must Have, Should Have, Could Have, Won't Have.
- **FR-REQ-2:** Requirements lifecycle states: `Draft` $\rightarrow$ `Approved` $\rightarrow$ `In Progress` $\rightarrow$ `Completed` (or `Rejected`).
- **FR-REQ-3:** Any modification to priority, status, title, or criteria must be logged into `RequirementHistory` as an append-only audit record storing field name, old value, new value, modifier ID, and UTC timestamp.

### 3.4 Agile Sprints & Tasks (FR-SPRN)
- **FR-SPRN-1:** Sprints can be scheduled with start date, end date, and explicit goal statement.
- **FR-SPRN-2:** Tasks belong to a project and optional sprint, containing title, estimate (Fibonacci story points: 1, 2, 3, 5, 8, 13), assignee, and priority.
- **FR-SPRN-3:** Tasks transition across 5 statuses: `Backlog`, `To Do`, `In Progress`, `In Review`, and `Done`.
- **FR-SPRN-4:** Tasks must link to one or more requirement specifications.

### 3.5 QA Test Suites & Execution Telemetry (FR-TEST)
- **FR-TEST-1:** Test cases specify title, objective, preconditions, step-by-step procedure, expected result, and linked requirement ID.
- **FR-TEST-2:** Executing a test case produces an immutable `TestRun` record with result (`Passed`, `Failed`, `Blocked`, `Skipped`), execution notes, timestamp, and tester ID.
- **FR-TEST-3:** Historical test runs must be preserved append-only; new runs do not overwrite past results.
- **FR-TEST-4:** When a test run fails, a 1-click action allows immediate creation of a linked Defect record.

### 3.6 Defect & Bug Tracking (FR-BUG)
- **FR-BUG-1:** Bugs record title, reproduction steps, expected vs actual outcome, severity (`Critical`, `High`, `Medium`, `Low`), priority, and status (`Open`, `In Progress`, `Fixed`, `Retest`, `Closed`).
- **FR-BUG-2:** Bugs maintain explicit foreign key references to the failed `TestRun`, related `Task`, and originating `Requirement`.

### 3.7 Release Gate & Traceability Matrix (FR-REL)
- **FR-REL-1:** Releases track target milestone date, summary scope, and status (`Planned`, `In Progress`, `Released`, `Cancelled`).
- **FR-REL-2:** The Traceability Matrix must correlate every requirement with its implementation tasks, QA verification runs, and defect status.
- **FR-REL-3:** Release Gate Rule: A requirement is marked `RELEASE READY` only if all linked test runs have passed and zero unresolved Critical or High defects remain.

---

## 4. Non-Functional Requirements (NFR)
- **NFR-PERF:** Dashboard metrics and traceability views must render in $< 500\text{ ms}$.
- **NFR-SEC:** Passwords hashed with high-cost memory parameters; no secrets or tokens exposed in responses or Git.
- **NFR-USAB:** High-contrast dark theme adhering to Material Design / Geist typography with accessible focus indicators.
- **NFR-REL:** Zero data loss on reload; relational consistency enforced with cascading integrity or soft-delete policies.
