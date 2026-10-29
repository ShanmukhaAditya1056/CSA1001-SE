# DevTrack --- Full Implementation Plan

## Gemini / AI Coding Agent Project Instructions

> **Project goal:** Build a medium-complexity, full-stack Software
> Engineering Lifecycle Management Platform in a focused 10-day project
> window. This document defines the complete implementation scope and
> execution rules. **Do not organize implementation into a day-by-day
> schedule.** Implement in dependency order, finishing and validating
> each feature before moving on.

------------------------------------------------------------------------

## 1. Project Overview

**Product name:** DevTrack\
**Product type:** Full-stack web application for managing a software
project lifecycle\
**Primary users:** Project owners, developers, testers, and project
members\
**Core purpose:** Keep software requirements, implementation tasks, test
evidence, bugs, and releases connected in one place so a team can trace
a feature from its requirement through implementation and testing to
release.

DevTrack should demonstrate the Software Engineering lifecycle:

1.  Agile project and sprint management
2.  Requirements elicitation, prioritization, and change history
3.  Application architecture and API-first design
4.  Full-stack implementation with version control
5.  Automated testing and quality assurance
6.  Containerization and CI validation
7.  Release management, maintenance, documentation, ethics, usability,
    and sustainability

### Product boundaries

Build a **single deployable application with a modular backend**. Keep
the implementation understandable and achievable. Do not turn it into a
distributed enterprise platform.

**Must have** - Authentication and authorization - Project creation and
project membership - Requirements and requirement history - Tasks and
sprints - Manual test cases and test runs - Bug/defect tracking -
Release records - Dashboard and basic lifecycle traceability - Backend
validation and project-level access checks - Automated tests - Docker
Compose setup - CI workflow - Documentation and a repeatable demo

**Out of scope** - GitHub API integration or automatic repository
synchronization - AI-generated requirements, tests, or bug fixes -
Microservices or a service mesh - Kubernetes - Real-time collaboration,
WebSockets, or chat - Email/SMS/push notifications - Payment
processing - Advanced analytics or predictive models -
Prometheus/Grafana or a large observability stack - Complex enterprise
approval workflows - Multiple organizations/tenants with billing -
Mobile application - Complex deployment strategies such as canary
releases - External integrations unless explicitly approved later

If a feature is not listed under "Must have," do not add it without
checking whether it is necessary for the core workflow.

------------------------------------------------------------------------

## 2. Required Technology Stack

Use this stack consistently unless the repository already has a working
equivalent that should be preserved.

### Frontend

-   React
-   TypeScript
-   Vite
-   Material UI (MUI)
-   React Router
-   Axios
-   React Hook Form only if it materially simplifies forms
-   Zod for client-side form schemas where useful
-   Vitest and React Testing Library for frontend tests

### Backend

-   Node.js with Express
-   TypeScript
-   Prisma ORM
-   PostgreSQL
-   Zod for request validation
-   Argon2id or bcrypt for password hashing
-   JWT-based authentication using secure, HTTP-only cookies
-   Vitest or Jest with Supertest for API tests

### Quality and delivery

-   Git and GitHub
-   Docker
-   Docker Compose
-   GitHub Actions
-   ESLint and Prettier
-   Optional Playwright smoke tests if time permits

### Version/runtime guidance

-   Use a currently supported Node.js LTS release and pin it
    consistently in local development, Docker, and CI.
-   Commit the package-manager lockfiles.
-   Do not install libraries just because they are popular. Add
    dependencies only when they solve a specific requirement.
-   Check current package compatibility before upgrading major versions.
-   Never commit `.env` files or secrets.

------------------------------------------------------------------------

## 3. Architecture

Use a simple modular monolith.

``` text
devtrack/
├── client/                    # React + TypeScript + Vite
│   ├── src/
│   │   ├── app/                # Router, providers, app shell
│   │   ├── components/         # Shared UI components
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── projects/
│   │   │   ├── requirements/
│   │   │   ├── sprints/
│   │   │   ├── tasks/
│   │   │   ├── testing/
│   │   │   ├── bugs/
│   │   │   ├── releases/
│   │   │   └── team/
│   │   ├── lib/                # Axios client, helpers
│   │   ├── types/
│   │   └── main.tsx
│   └── ...
├── server/                    # Express + TypeScript
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── projects/
│   │   │   ├── requirements/
│   │   │   ├── sprints/
│   │   │   ├── tasks/
│   │   │   ├── test-cases/
│   │   │   ├── test-runs/
│   │   │   ├── bugs/
│   │   │   ├── releases/
│   │   │   └── dashboard/
│   │   ├── utils/
│   │   ├── app.ts
│   │   └── server.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── ...
├── docs/
│   ├── project-proposal.md
│   ├── requirements-specification.md
│   ├── architecture.md
│   ├── api.md
│   ├── test-plan.md
│   ├── deployment-guide.md
│   ├── user-guide.md
│   ├── security-ethics-sustainability.md
│   └── final-report-outline.md
├── .github/workflows/ci.yml
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
└── gemini.md
```

The structure is a target, not a reason to rewrite an existing working
repository. Inspect the repository first. Preserve working code,
conventions, scripts, and UI. Adapt this layout to the current project
when necessary.

### Backend module convention

Each feature module should use a consistent, small structure, for
example:

``` text
requirements/
├── requirements.routes.ts
├── requirements.controller.ts
├── requirements.service.ts
└── requirements.schemas.ts
```

-   **Routes:** URL definitions and middleware composition
-   **Controllers:** translate HTTP requests into service calls and
    responses
-   **Services:** business rules and database operations
-   **Schemas:** Zod validation for request parameters, query strings,
    and bodies

Do not create needless abstraction layers or a generic framework for
this project.

------------------------------------------------------------------------

## 4. Roles and Permissions

Use project-scoped authorization.

### Roles

-   **Owner:** creates the project, manages project settings and
    membership, and can manage all project records.
-   **Developer:** manages assigned work, tasks, requirements where
    permitted, and can view project testing and release information.
-   **Tester:** manages test cases and test runs, reports bugs, and can
    view requirements, tasks, and releases.
-   **Viewer:** read-only access to project data.

The creator becomes the project owner. A user may have different roles
in different projects.

### Permission rules

-   A signed-in user must not be able to read or change a project unless
    they are a member of it.
-   Every project-scoped API endpoint must verify membership on the
    server.
-   Never trust a `projectId`, `userId`, or role supplied by the browser
    without checking it against the authenticated user and database.
-   Only owners can add/remove members or change their project roles.
-   Viewers cannot create, update, or delete project records.
-   Prevent removing the last owner from a project.
-   Enforce role checks on the backend even when the frontend hides a
    button.

------------------------------------------------------------------------

## 5. Core Functional Requirements

### 5.1 Authentication

-   Register with name, email, and password.
-   Log in and log out.
-   Get the current authenticated user.
-   Reject duplicate email addresses.
-   Hash passwords with Argon2id or bcrypt.
-   Use secure, HTTP-only cookies for session tokens.
-   Configure cookie `SameSite`, `Secure`, and expiration appropriately
    for local and production environments.
-   Protect state-changing cookie-authenticated requests against CSRF
    using an appropriate strategy.
-   Implement a consistent unauthorized response and frontend redirect.
-   Do not expose password hashes, token values, or secrets in API
    responses or logs.

### 5.2 Projects and team

-   List projects accessible to the current user.
-   Create a project with name, key, description, and optional start/end
    dates.
-   View project details and summary.
-   Update project metadata with permission checks.
-   Add existing registered users by email to a project.
-   Assign a project role and update/remove membership.
-   Prevent duplicate project keys where keys are intended to be
    globally unique.
-   Show team members and their roles.

### 5.3 Requirements

A requirement should include: - Title - Description - Project -
Priority: Must / Should / Could / Won't (MoSCoW) - Status: Draft /
Approved / In Progress / Completed / Rejected - Acceptance criteria -
Creator and timestamps - Optional target release - Change history

Capabilities: - Create, view, edit, and archive requirements. - Filter
by priority and status. - Search by title. - Record meaningful changes
in `RequirementHistory`, including who changed it, when, and a concise
before/after representation. - Link requirements to tasks and test
cases. - Do not silently overwrite history. - Use a soft-delete/archive
strategy for records that need to remain traceable.

### 5.4 Sprints and tasks

A sprint should include: - Name - Project - Goal - Start date and end
date - Status: Planned / Active / Completed

A task should include: - Title and description - Project - Optional
sprint - Assignee - Priority - Status: Backlog / To Do / In Progress /
In Review / Done - Estimate (optional) - Due date (optional) - Creator
and timestamps - Links to one or more requirements

Capabilities: - Create and edit sprints. - Enforce at most one active
sprint per project unless a documented product decision says
otherwise. - Create, assign, edit, and move tasks across statuses. -
Filter tasks by status, assignee, sprint, and priority. - Provide a
simple board grouped by task status. - Support list/table view if it is
easier to implement accessibly. - Avoid complex drag-and-drop if it
threatens schedule; status-change menus are acceptable. - Validate
sprint date ranges and task/project consistency.

### 5.5 Test cases and test runs

A test case should include: - Title - Objective/description -
Preconditions (optional) - Test steps - Expected result - Requirement
links - Creator and timestamps - Status: Active / Archived

A test run should include: - Test case - Result: Passed / Failed /
Blocked / Skipped - Actual result or notes - Executed by - Execution
timestamp - Optional linked bug

Capabilities: - Create, edit, view, and archive test cases. - Execute a
test case and save each run as a separate record. - Preserve historical
runs instead of overwriting previous results. - Show latest result and
run history. - Allow a failed run to create a linked bug. - Validate
that the test case and bug belong to the same project.

### 5.6 Bug tracking

A bug should include: - Title - Description - Steps to reproduce -
Expected result - Actual result - Severity: Low / Medium / High /
Critical - Priority - Status: Open / In Progress / Fixed / Retest /
Closed / Reopened - Reporter and optional assignee - Optional related
task, requirement, test run, and release - Created/updated timestamps

Capabilities: - Create and edit bugs. - Filter by status, severity,
priority, and assignee. - Change bug status with validation. - Preserve
references to the test run that exposed a bug. - Keep status transitions
understandable. Do not implement an elaborate workflow engine. - Show
bug counts on the dashboard.

### 5.7 Releases

A release should include: - Name or version - Project - Summary/notes -
Status: Planned / In Progress / Released / Cancelled - Target date and
optional actual release date - Creator and timestamps - Linked tasks and
bugs

Capabilities: - Create and update releases. - Link tasks and bugs to
releases. - Prevent inconsistent links across projects. - Require an
actual release date when marking a release as Released, or set it on the
server during the transition. - Show included tasks and known bugs. -
Record enough release information to demonstrate maintenance and
delivery.

### 5.8 Dashboard and traceability

Provide a project dashboard with: - Total requirements and counts by
status - Tasks by status - Current sprint summary - Test runs: passed,
failed, blocked, skipped - Open bugs by severity - Upcoming/planned
releases - Recent project activity if it can be implemented simply

Provide a traceability view or section that allows users to follow:
**Requirement → Task(s) → Test case(s) / Test run(s) → Bug(s) →
Release**

The dashboard must use real database data, not hard-coded demo values.
Use simple aggregate queries and avoid expensive or redundant requests.

------------------------------------------------------------------------

## 6. Data Model

Implement a relational schema in PostgreSQL using Prisma. Use UUIDs or
another consistent ID strategy, `createdAt`/`updatedAt` where
appropriate, foreign keys, unique constraints, and indexes for
frequently filtered fields.

### Main entities

1.  `User`
2.  `Project`
3.  `ProjectMember`
4.  `Requirement`
5.  `RequirementHistory`
6.  `Sprint`
7.  `Task`
8.  `TestCase`
9.  `TestRun`
10. `Bug`
11. `Release`

### Join entities where needed

-   `RequirementTask` --- many-to-many requirement/task link
-   `RequirementTestCase` --- many-to-many requirement/test-case link
-   `ReleaseTask` --- many-to-many release/task link
-   `ReleaseBug` --- many-to-many release/bug link

A join table may instead be represented with a relation field if the
relationship needs extra metadata, but keep the data model explicit and
easy to query.

### Modeling rules

-   Use Prisma enums for role, priority, status, severity, and test
    result values. Do not use arbitrary free-form status strings.
-   Store dates as appropriate database date/time types; use UTC
    internally and display local time in the UI.
-   Use unique constraints for email and project key according to the
    chosen key policy.
-   Add indexes for project IDs, status fields, assignee IDs, due dates,
    and foreign keys used in filters.
-   Add delete behavior deliberately. Prefer archive/soft-delete for
    traceability-sensitive entities. Avoid cascading deletes that erase
    test history or audit evidence unexpectedly.
-   Prevent cross-project relationships at the service layer and, where
    practical, reinforce them through schema design.
-   Store requirement history as append-only audit records.
-   Do not store derived dashboard totals as source-of-truth fields
    unless there is a clear consistency strategy.

Before implementing the schema, draw a small ER diagram in
`docs/architecture.md`. After defining the Prisma schema, run
formatting, migration, and Prisma client generation. Test the migration
against a clean database.

------------------------------------------------------------------------

## 7. API Design

Use a versioned REST API with JSON responses under `/api/v1`. Use
consistent status codes and a predictable error shape.

### Authentication

-   `POST /api/v1/auth/register`
-   `POST /api/v1/auth/login`
-   `POST /api/v1/auth/logout`
-   `GET /api/v1/auth/me`

### Projects and membership

-   `GET /api/v1/projects`
-   `POST /api/v1/projects`
-   `GET /api/v1/projects/:projectId`
-   `PATCH /api/v1/projects/:projectId`
-   `GET /api/v1/projects/:projectId/members`
-   `POST /api/v1/projects/:projectId/members`
-   `PATCH /api/v1/projects/:projectId/members/:memberId`
-   `DELETE /api/v1/projects/:projectId/members/:memberId`

### Requirements

-   `GET /api/v1/projects/:projectId/requirements`
-   `POST /api/v1/projects/:projectId/requirements`
-   `GET /api/v1/requirements/:requirementId`
-   `PATCH /api/v1/requirements/:requirementId`
-   `POST /api/v1/requirements/:requirementId/archive`
-   `GET /api/v1/requirements/:requirementId/history`

### Sprints and tasks

-   `GET /api/v1/projects/:projectId/sprints`
-   `POST /api/v1/projects/:projectId/sprints`
-   `PATCH /api/v1/sprints/:sprintId`
-   `GET /api/v1/projects/:projectId/tasks`
-   `POST /api/v1/projects/:projectId/tasks`
-   `GET /api/v1/tasks/:taskId`
-   `PATCH /api/v1/tasks/:taskId`

### Testing

-   `GET /api/v1/projects/:projectId/test-cases`
-   `POST /api/v1/projects/:projectId/test-cases`
-   `GET /api/v1/test-cases/:testCaseId`
-   `PATCH /api/v1/test-cases/:testCaseId`
-   `POST /api/v1/test-cases/:testCaseId/runs`
-   `GET /api/v1/test-cases/:testCaseId/runs`

### Bugs

-   `GET /api/v1/projects/:projectId/bugs`
-   `POST /api/v1/projects/:projectId/bugs`
-   `GET /api/v1/bugs/:bugId`
-   `PATCH /api/v1/bugs/:bugId`

### Releases

-   `GET /api/v1/projects/:projectId/releases`
-   `POST /api/v1/projects/:projectId/releases`
-   `GET /api/v1/releases/:releaseId`
-   `PATCH /api/v1/releases/:releaseId`

### Dashboard and traceability

-   `GET /api/v1/projects/:projectId/dashboard`
-   `GET /api/v1/projects/:projectId/traceability`

Add pagination and filtering to collection endpoints. Use a consistent
response format. Example:

``` json
{
  "data": {},
  "meta": {},
  "error": null
}
```

For errors, return a safe, consistent shape such as:

``` json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "details": []
  }
}
```

Do not expose stack traces, SQL details, or internal exception messages
to clients in production. Use `400` for invalid input, `401` for
unauthenticated requests, `403` for forbidden access, `404` for missing
resources, `409` for conflicts, and `500` for unexpected server errors.
Avoid leaking whether a protected resource exists when that would reveal
sensitive project data.

Create and maintain `docs/api.md` with request/response examples and
permission requirements. OpenAPI can be added if it is quick and does
not delay core features.

------------------------------------------------------------------------

## 8. Frontend Pages and User Experience

### Required routes

-   `/login`
-   `/register`
-   `/dashboard`
-   `/projects`
-   `/projects/new`
-   `/projects/:projectId`
-   `/projects/:projectId/requirements`
-   `/projects/:projectId/sprints`
-   `/projects/:projectId/tasks`
-   `/projects/:projectId/tests`
-   `/projects/:projectId/bugs`
-   `/projects/:projectId/releases`
-   `/projects/:projectId/team`

Use nested routes and a shared project layout where appropriate. Route
names can be adjusted to match the existing codebase, but keep
navigation consistent.

### Layout

-   Left navigation/sidebar with DevTrack branding and project
    navigation
-   Top bar with current project/context, user menu, and logout
-   Responsive content area
-   Page title, primary action, filters, and data table/list
-   Reusable form dialogs or dedicated forms for create/edit flows
-   Confirmation dialog for destructive or irreversible actions
-   Snackbar/toast feedback for successful and failed actions

### Required UI states

Every API-backed page must handle: - Initial loading - Empty result -
Error/failure - Successful data - Form validation errors -
Saving/submitting state - Unauthorized/expired session - Disabled
actions where the user's role lacks permission

### UI quality requirements

-   Use a consistent typography scale, spacing system, colors, and
    component patterns.
-   Prefer clear and professional project-management UI over decorative
    effects.
-   Use accessible labels, keyboard-operable controls, visible focus
    states, and adequate contrast.
-   Tables should have useful empty states and filters.
-   Forms should preserve entered data when safe to do so after
    validation errors.
-   Do not leave buttons decorative or nonfunctional.
-   Do not hard-code dashboard counts, team members, or tasks.
-   Avoid duplicating components across feature pages; reuse tables,
    form fields, status chips, confirmation dialogs, and loading/error
    components.
-   Make desktop layouts polished and ensure smaller screens remain
    usable.

------------------------------------------------------------------------

## 9. Implementation Order

Implement in dependency order, not by calendar day. Keep each stage
runnable before moving forward.

### Stage A --- Repository inspection and project foundation

1.  Inspect all existing files, scripts, package manifests, environment
    configuration, and current application behavior.
2.  Identify which code is already working and preserve it.
3.  Establish the repository structure and scripts.
4.  Configure TypeScript, linting, formatting, environment variable
    validation, and a health endpoint.
5.  Configure PostgreSQL, Prisma, the initial schema, and migrations.
6.  Add `.env.example` and `.gitignore`.
7.  Confirm client and server can run locally and the database
    connection works.

**Exit criteria:** A clean checkout can install dependencies, start the
client/server, connect to PostgreSQL, and run the initial migration.

### Stage B --- Authentication and authorization

1.  Implement registration, login, logout, and current-user endpoints.
2.  Add password hashing, cookie handling, request validation, and error
    middleware.
3.  Implement authentication middleware.
4.  Implement reusable project-membership and role-checking helpers.
5.  Build login/register forms and session-aware routing.
6.  Test unauthorized access and cross-project access denial.

**Exit criteria:** Users can register and sign in; protected endpoints
reject unauthenticated users; project data is isolated by membership.

### Stage C --- Project workspace and shared frontend shell

1.  Build the shared app layout, navigation, project selector, and user
    menu.
2.  Implement project list, project creation, project details, and
    membership management.
3.  Add reusable data table, form field, status chip, confirmation
    dialog, loading, empty, error, and toast components.
4.  Establish a single Axios API client and a consistent error-handling
    pattern.
5.  Add project selection/context to feature pages.

**Exit criteria:** A user can create a project, see only accessible
projects, and manage members according to role.

### Stage D --- Requirements and change history

1.  Implement requirement CRUD/archive and MoSCoW priority.
2.  Add filtering, searching, validation, and acceptance criteria.
3.  Record history for meaningful changes.
4.  Add requirement-to-task and requirement-to-test-case linking.
5.  Build requirement list/detail/form pages and history display.

**Exit criteria:** Requirement changes persist and history is visible;
links cannot cross project boundaries.

### Stage E --- Sprints and task management

1.  Implement sprint CRUD and date validation.
2.  Implement task CRUD, assignment, status transitions, and filters.
3.  Add requirement links.
4.  Build a board grouped by status; use simple status menus if
    drag-and-drop is not essential.
5.  Add role checks and tests.

**Exit criteria:** Team members can organize tasks into sprints, update
task status, and trace tasks to requirements.

### Stage F --- Test management and defect tracking

1.  Implement test case CRUD/archive.
2.  Implement append-only test run history.
3.  Implement bug creation, assignment, filtering, and status updates.
4.  Allow failed test runs to create linked bugs.
5.  Link test cases to requirements and bugs to relevant tasks/releases
    where applicable.
6.  Build test and bug pages with history and clear result indicators.

**Exit criteria:** A tester can execute a case, record a failure, create
a linked bug, and view the history without overwriting prior runs.

### Stage G --- Release management, dashboard, and traceability

1.  Implement release CRUD and state-transition validation.
2.  Link tasks and bugs to releases.
3.  Implement dashboard aggregate endpoints and UI using database data.
4.  Implement requirement-to-task-to-test/bug-to-release traceability.
5.  Add filters and clear empty states.

**Exit criteria:** A project can be followed from requirements through
work and tests to known defects and a release.

### Stage H --- Quality assurance and security hardening

1.  Add unit tests for business rules and utilities.
2.  Add API integration tests using Supertest.
3.  Add frontend tests for critical forms and state handling.
4.  Test project isolation, roles, validation, duplicate records,
    invalid status changes, and relationship consistency.
5.  Add rate limiting to authentication endpoints and appropriate
    security headers.
6.  Configure CORS narrowly and protect cookie-authenticated
    state-changing requests against CSRF.
7.  Review password handling, logs, errors, secrets, and authorization
    checks.
8.  Run lint, type checks, and tests; fix failures rather than
    suppressing them.

**Exit criteria:** Critical workflows pass automated tests, forbidden
cross-project operations are denied, and no known high-severity security
issue remains unaddressed.

### Stage I --- Containerization and continuous integration

1.  Add a Dockerfile for the client and server as appropriate.
2.  Add Docker Compose services for client, server, and PostgreSQL.
3.  Configure service health checks and startup dependencies where
    supported.
4.  Use environment variables for configuration and provide
    `.env.example`.
5.  Make database migration execution explicit and safe.
6.  Add GitHub Actions CI for dependency installation, linting, type
    checking, tests, and production builds.
7.  Ensure backend integration tests have a PostgreSQL service or a
    clearly documented test database.
8.  Validate Docker builds and `docker compose up --build` from a clean
    checkout.
9.  Document common setup and troubleshooting steps.

**Exit criteria:** A new developer can follow the README to start the
complete application locally, and CI validates every pull request or
push to the configured branches.

### Stage J --- Final validation, documentation, and demonstration

1.  Run all build, lint, type-check, test, migration, and Docker checks.
2.  Execute the end-to-end demo flow below.
3.  Remove dead code, unused dependencies, console debugging, hard-coded
    data, and placeholder buttons.
4.  Review accessibility, responsiveness, error states, and loading
    behavior.
5.  Finish project and technical documentation.
6.  Prepare screenshots and a short demo script.
7.  List known limitations honestly instead of claiming unfinished
    features are complete.

**Exit criteria:** The project can be reproduced, tested, explained, and
demonstrated from a clean environment.

------------------------------------------------------------------------

## 10. Testing Strategy

Use a practical test pyramid: many focused unit tests, meaningful API
integration tests, and a small number of end-to-end smoke tests.

### Unit tests

Test: - Role/permission helpers - Requirement status/priority
validation - Sprint date validation - Task and bug state transitions -
Release transition rules - Dashboard aggregation helpers - Validation
schemas

### API integration tests

Test: - Register, login, logout, and current-user behavior - Invalid and
duplicate registration - Protected routes without authentication -
Project creation and membership - Cross-project data access denial -
Viewer write denial - Requirement create/update/history - Task creation
and requirement links - Test run history persistence - Failed test run
to linked bug - Bug lifecycle - Release creation and release-state
validation - Dashboard response from actual database data

### Frontend tests

Test critical interactions: - Login validation and API failure display -
Project creation - Requirement form validation - Task status update -
Test-run submission - Bug creation - Loading, empty, and error states -
Permission-aware actions

### End-to-end smoke flow

If Playwright is practical, automate one complete core journey.
Otherwise, document and perform the same flow manually.

1.  Register/login.
2.  Create a project.
3.  Add a team member and assign a role.
4.  Create a requirement with acceptance criteria.
5.  Create a task and link it to the requirement.
6.  Create a test case and link it to the requirement.
7.  Execute the test as Failed.
8.  Create a bug linked to that test run.
9.  Fix or update the bug status.
10. Create a release and link the task and bug.
11. Verify the dashboard and traceability view.
12. Confirm a user outside the project cannot access the project data.

Do not report tests as passing unless they were actually run. Clearly
identify skipped tests and remaining defects.

------------------------------------------------------------------------

## 11. Security Requirements

-   Hash passwords with Argon2id or bcrypt using a suitable work factor.
-   Use secure HTTP-only cookies for authentication tokens.
-   Configure `SameSite` and `Secure` according to the deployment
    context.
-   Implement CSRF protection for state-changing requests when using
    cookies.
-   Configure CORS to allow only intended frontend origins.
-   Validate body, path, and query inputs using Zod.
-   Apply rate limits to authentication endpoints.
-   Use security headers.
-   Enforce authentication, membership, and role checks on the server.
-   Use parameterized ORM queries; do not construct raw SQL from
    untrusted input.
-   Do not return password hashes, secrets, internal stack traces, or
    database details.
-   Avoid storing secrets in source control, screenshots, test fixtures,
    or documentation.
-   Provide `.env.example` with placeholders only.
-   Use generic production error messages and appropriate server-side
    logging.
-   Keep dependencies reasonably current and review major changes.
-   Avoid logging passwords, cookies, bearer tokens, or sensitive
    request bodies.
-   Verify that related records belong to the same project before
    linking them.
-   Treat uploaded content as out of scope unless explicitly approved;
    do not add arbitrary file uploads.

------------------------------------------------------------------------

## 12. DevOps and Repository Workflow

### Git workflow

-   Use a `main` branch and short-lived feature branches.
-   Use meaningful commits such as
    `feat(requirements): add requirement history`.
-   Keep each commit focused.
-   Do not commit generated secrets, build output, `node_modules`, local
    databases, or `.env`.
-   Use pull requests or at least review the diff before merging.
-   Keep `README.md` and API documentation aligned with actual behavior.

### CI workflow

The GitHub Actions workflow should run: 1. Checkout 2. Install
dependencies from lockfiles 3. Lint 4. Type check 5. Unit and
integration tests 6. Production build 7. Optional Docker build check

Pin or review GitHub Actions versions according to current security and
maintenance guidance. Do not store production credentials in the
repository. Add database service configuration for integration tests if
required.

### Docker requirements

-   Separate build/runtime stages where useful.
-   Use a non-root runtime user when practical.
-   Do not bake secrets into images.
-   Use health checks where meaningful.
-   Persist PostgreSQL data through a named volume for local
    development.
-   Document migration commands.
-   Ensure the application can start from a clean clone with documented
    commands.

------------------------------------------------------------------------

## 13. Environment Configuration

Create `.env.example` with the exact variable names required by the
application, using placeholders only. For example:

``` dotenv
NODE_ENV=development
PORT=4000
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgresql://devtrack:devtrack_local_password@localhost:5432/devtrack
JWT_SECRET=replace_with_a_long_random_secret
COOKIE_NAME=devtrack_session
```

Adjust the database URL and cookie strategy to match the chosen
Docker/local setup. Validate required environment variables at startup
and fail with a clear configuration error if any required variable is
missing. Never use the example secret in production.

Do not introduce Redis, S3, external auth providers, or other
infrastructure for this scope.

------------------------------------------------------------------------

## 14. Documentation Deliverables

Create documentation that reflects the actual implementation.

### `README.md`

Include: - Project overview and features - Technology stack -
Prerequisites - Local setup - Environment configuration - Database
migration and seed instructions - Run/test/build commands - Docker
Compose instructions - CI summary - Demo credentials only if they are
intentionally safe and documented - Known limitations

### `docs/project-proposal.md`

Include problem statement, objectives, scope, target users, expected
outcomes, and constraints.

### `docs/requirements-specification.md`

Include functional requirements, non-functional requirements, roles, use
cases, acceptance criteria, and out-of-scope features.

### `docs/architecture.md`

Include architecture overview, component responsibilities, ER diagram,
key data flows, and technology choices with brief trade-offs.

### `docs/api.md`

Include endpoints, authorization requirements, request/response
examples, error codes, filtering, and pagination.

### `docs/test-plan.md`

Include test strategy, test cases, execution results, known defects, and
evidence of checks actually run.

### `docs/deployment-guide.md`

Include local setup, Docker commands, environment variables, migrations,
CI behavior, and troubleshooting.

### `docs/user-guide.md`

Explain how owners, developers, testers, and viewers perform the main
workflows.

### `docs/security-ethics-sustainability.md`

Discuss least privilege, privacy, access isolation, secure credential
handling, accessibility, maintainability, and avoiding unnecessary
infrastructure/compute.

### `docs/final-report-outline.md`

Provide an academic report outline: abstract, introduction, problem
statement, objectives, related work, requirements, design,
implementation, testing, deployment, results, limitations, ethics,
sustainability, conclusion, and future work. Do not fabricate results or
claim evaluation that was not performed.

------------------------------------------------------------------------

## 15. Seed Data and Demonstration

Provide an optional development seed script with clearly fake data: -
One demo owner - A small sample project - A few requirements with
different MoSCoW priorities - One sprint - Tasks in multiple statuses -
Test cases with passed and failed runs - A few bugs - One planned
release

Seed scripts must be development-only, idempotent where feasible, and
must never create a production backdoor or fixed production password. If
demo credentials are included, clearly label them as local-only and
require a safe setup.

### Demo narrative

Demonstrate one requirement travelling through the lifecycle: - Define
the requirement and acceptance criteria. - Link a task and assign it. -
Create a test case linked to the requirement. - Record a failed test run
and create a linked bug. - Update the bug and connect it to a release. -
Show dashboard metrics and traceability. - Show CI passing and the
application running with Docker Compose. - Demonstrate that
project-level access control blocks an unauthorized user.

------------------------------------------------------------------------

## 16. Non-Functional Requirements and Acceptance Criteria

### Usability

-   Main workflows are discoverable without external instructions.
-   Forms show clear validation and server errors.
-   All API-backed pages have loading, empty, error, and success states.
-   Core pages work at desktop and tablet widths; mobile remains usable.

### Reliability

-   Invalid inputs fail safely.
-   Database relationships remain consistent.
-   Failed requests do not leave misleading UI state.
-   Test runs and requirement history remain available for traceability.

### Maintainability

-   TypeScript strictness is enabled where practical.
-   Business logic lives in services rather than route handlers.
-   Reusable components and validation schemas reduce duplication.
-   Linting, formatting, tests, and CI are reproducible.

### Security

-   Project data is isolated by membership.
-   Roles are checked server-side.
-   Passwords are hashed.
-   Secrets are not committed.
-   Error responses do not expose internals.

### Performance

-   Use pagination for growing collections.
-   Add indexes for common filters and relations.
-   Avoid fetching every project record to calculate dashboard
    summaries.
-   Avoid premature caching and external infrastructure.

### Acceptance checklist

-   [ ] Registration/login/logout/current-user work.
-   [ ] Project creation and role-based membership work.
-   [ ] Cross-project access is blocked by backend checks.
-   [ ] Requirements support MoSCoW priority, acceptance criteria, and
    history.
-   [ ] Tasks and sprints can be managed and linked to requirements.
-   [ ] Test cases preserve multiple test-run results.
-   [ ] Failed test runs can create linked bugs.
-   [ ] Bugs support a simple lifecycle and useful filters.
-   [ ] Releases link tasks and bugs and validate release transitions.
-   [ ] Dashboard uses real database data.
-   [ ] Requirement-to-release traceability works.
-   [ ] Backend validation and consistent errors are implemented.
-   [ ] Critical unit/API/frontend tests pass.
-   [ ] Docker Compose starts the application and database.
-   [ ] CI runs lint, type checks, tests, and builds.
-   [ ] README and required technical/academic documentation are
    complete.
-   [ ] A clean-clone demo can be completed without manual database
    edits.

------------------------------------------------------------------------

## 17. Rules for the AI Coding Agent

Follow these rules whenever making changes to this repository.

1.  **Inspect before editing.** Read the existing directory structure,
    package manifests, scripts, Prisma schema, routes, components, and
    current git diff before changing files.
2.  **Do not overwrite working code unnecessarily.** Reuse and extend
    existing components, APIs, styles, utilities, and conventions.
3.  **Work only within the agreed scope.** Do not add integrations,
    microservices, Kubernetes, AI features, or extra product modules.
4.  **Implement complete vertical slices.** For a feature, finish the
    database model/migration, backend validation and authorization, API,
    frontend, loading/error/empty states, and tests before calling it
    complete.
5.  **Keep the application runnable.** Make incremental changes and run
    relevant checks after each meaningful feature.
6.  **Do not fake functionality.** No dead buttons, fake dashboard
    numbers, hard-coded API success, or frontend-only authorization.
7.  **Do not fabricate test results.** Run commands and report actual
    outcomes. If a command cannot be run, state why.
8.  **Use safe database changes.** Create migrations; do not silently
    reset or destroy user data. Confirm before destructive operations.
9.  **Keep schemas aligned.** Update Prisma schema, migrations,
    TypeScript types, validation schemas, API documentation, and
    frontend forms together.
10. **Handle errors deliberately.** Return consistent API errors and
    show useful user-facing messages.
11. **Enforce project isolation everywhere.** Check membership for every
    project-scoped read/write and validate all related record IDs.
12. **Protect secrets.** Never print, commit, or place real secrets in
    documentation or code.
13. **Prefer the simplest adequate solution.** Do not add an abstraction
    or dependency unless it reduces real complexity.
14. **Preserve UI consistency.** Reuse shared layout, form, table,
    status, loading, and feedback components.
15. **Document meaningful decisions.** Update the relevant docs when
    behavior, routes, data models, environment variables, or setup steps
    change.
16. **End each implementation pass with a concise report:** files
    changed, behavior implemented, commands run, pass/fail results,
    known limitations, and the next logical implementation step.
17. **Never claim completion based only on code generation.** Completion
    requires validation against the acceptance criteria.

------------------------------------------------------------------------

## 18. Definition of Done

DevTrack is complete when the required acceptance checklist passes, the
application can be started from a clean checkout using the documented
setup, the core lifecycle demo works end to end, project-level
authorization has been tested, CI runs the agreed checks, and the
documentation accurately describes the delivered system.

**Priority order if time becomes constrained:** 1. Authentication and
project isolation 2. Requirements 3. Tasks and sprints 4. Test cases,
test runs, and bugs 5. Releases and traceability 6. Dashboard 7.
Automated tests and security checks 8. Docker and CI 9. Documentation
polish and optional smoke automation

Do not sacrifice authorization, data integrity, or core workflow
correctness to add visual polish or optional features.
