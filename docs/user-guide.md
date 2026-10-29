# DevTrack — End-User Operational Guide

## 1. Quick Access Demo Accounts
To explore DevTrack immediately without manually creating accounts, use the **1-Click Quick Demo Access** buttons on the Sign In screen (`#/login`):

| Persona | Name | Role | Email | Default Password | Key Workflows |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Project Lead** | Alex Vance | Owner | `alex@devtrack.io` | `password123` | Full project administration, role management, release sign-off |
| **Full-Stack Dev** | Jordan Chen | Developer | `jordan@devtrack.io` | `password123` | Task Kanban updates, requirement elicitation, bug fixes |
| **QA Engineer** | Sam Rivera | Tester | `sam@devtrack.io` | `password123` | Author test cases, execute test runs, log linked defect reports |

---

## 2. Core Operational Workflows

### 2.1 Project Owner Workflow
1. **Initialize Project:** Navigate to **Projects Directory** (`#/projects`), click `+ New Project`, enter project name and unique key (e.g. `DEV`), and save.
2. **Build the Team:** Navigate to **Team & Roles** (`#/team`), click `+ Add Member`, enter colleague's email, and select their role (`Developer`, `Tester`, `Viewer`).
3. **Approve Specifications:** Navigate to **Requirements / MoSCoW** (`#/requirements`), review draft user stories, set priority (*Must Have*), and promote status to `Approved`.
4. **Oversee Executive Cockpit:** Monitor the **Dashboard** (`#/dashboard`) for sprint velocity burndown and QA verification pass rates.
5. **Release Promotion:** Navigate to **Releases & Traceability** (`#/releases`). When all requirements pass the release gate, click `Mark Released`.

### 2.2 Developer Workflow
1. **Sprint Planning:** Navigate to **Sprints & Tasks Board** (`#/sprints`). Select the active sprint.
2. **Task Execution:** Pick a task from `To Do`, click the status dropdown to transition it to `In Progress`, and when implementation is ready, move it to `In Review` or `Done`.
3. **Bug Remediation:** Navigate to **Bug Tracker** (`#/bugs`). Filter for bugs assigned to you. Once resolved in code, update status to `Fixed`.

### 2.3 QA Tester Workflow
1. **Test Specification:** Navigate to **Test Runs & QA** (`#/tests`). Click `+ New Test Case`, link it to an approved requirement, and define steps and expected outcomes.
2. **Execute Test Run:** Click `Run Test` on a test case, select outcome (`Passed`, `Failed`, `Blocked`, or `Skipped`), and record assertion telemetry.
3. **Log Defect from Failure:** If a test fails, click `Log Linked Bug` on the execution log. The bug form opens pre-filled with the failed test run reference and originating requirement.

### 2.4 Project Viewer / Auditor Workflow
1. **Audit History & Diffs:** Navigate to **Settings & Audit** (`#/settings`) or click `Audit Revisions` on any requirement to inspect field-level changes.
2. **Inspect Traceability Matrix:** Navigate to **Releases & Traceability** (`#/releases`) to inspect forward and backward traceability across the entire lifecycle. Click `Export Matrix CSV` to export the audit sheet.
3. **Global Search:** Press `Ctrl + K` anywhere in the app to search across requirements, tasks, test cases, and defects instantly.
