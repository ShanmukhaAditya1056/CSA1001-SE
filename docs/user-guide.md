# DevTrack — Enterprise User Manual & Operational Guide

Welcome to **DevTrack**, an enterprise-grade Software Engineering Lifecycle Platform providing bidirectional forward and backward traceability, GitOps automation, real-time distributed collaboration, DORA metrics, two-person integrity release gating, and outbound incident webhooks.

---

## Table of Contents
1. [Quick Access Demo Accounts](#1-quick-access-demo-accounts)
2. [Role-Based Access Control (RBAC) Matrix](#2-role-based-access-control-rbac-matrix)
3. [Real-Time Distributed Collaboration & Live Presence](#3-real-time-distributed-collaboration--live-presence)
4. [Team Working Agreements & Configuration](#4-team-working-agreements--configuration)
5. [GitOps & Commit-to-Card Automation](#5-gitops--commit-to-card-automation)
6. [Requirements Engineering (MoSCoW) & Revision Audit](#6-requirements-engineering-moscow--revision-audit)
7. [Sprint Planning & Kanban Workflow (WIP Limits)](#7-sprint-planning--kanban-workflow-wip-limits)
8. [QA Test Suites, Telemetry & Defect Triage](#8-qa-test-suites-telemetry--defect-triage)
9. [Engineering Flow & DORA 4 Metrics Analytics](#9-engineering-flow--dora-4-metrics-analytics)
10. [Two-Person Integrity Production Release Gate & Semantic Changelog](#10-two-person-integrity-production-release-gate--semantic-changelog)
11. [Outbound Webhook Bus & CI/CD Integrations Hub](#11-outbound-webhook-bus--cicd-integrations-hub)
12. [Workspace Settings, Backups & Audit Trail](#12-workspace-settings-backups--audit-trail)

---

## 1. Quick Access Demo Accounts
To explore DevTrack immediately without manual registration, use the **1-Click Demo Access** buttons on the Sign In screen (`#/login`):

| Persona | Name | Role | Email | Key Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Project Owner / Lead** | Alex Vance | Owner | `alex@devtrack.io` | Full project administration, working agreements, role changes, dual release sign-off |
| **Senior Full-Stack Dev** | Jordan Chen | Developer | `jordan@devtrack.io` | GitOps branch simulation, task Kanban updates, engineering certification, bug remediation |
| **QA / SDET Lead** | Sam Rivera | Tester | `sam@devtrack.io` | Test cases, execution telemetry, defect triage, QA digital sign-off |
| **Product Auditor** | Morgan Reed | Viewer | `morgan@devtrack.io` | Read-only audit verification, E2E traceability matrix, compliance exports |

---

## 2. Role-Based Access Control (RBAC) Matrix
DevTrack strictly enforces enterprise governance across 4 roles:

| Capability / Resource | Owner | Developer | Tester | Viewer |
| :--- | :---: | :---: | :---: | :---: |
| View Dashboard, Kanban, QA, Traceability, Audit Trail | ✅ | ✅ | ✅ | ✅ |
| Project Settings & Workspace Backup | ✅ | ❌ | ❌ | ❌ |
| Invite Members & Manage Roles | ✅ | ❌ | ❌ | ❌ |
| Team Working Agreements & Preferences | ✅ | ❌ | ❌ | ❌ |
| Author & Edit Requirements (MoSCoW) | ✅ | ✅ | ❌ | ❌ |
| Sprints & Task Board (WIP Limits, GitOps) | ✅ | ✅ | ❌ | ❌ |
| Author Test Cases & Record Execution Runs | ✅ | ❌ | ✅ | ❌ |
| Log Defects (Bugs) | ✅ | ✅ | ✅ | ❌ |
| Work on Defects (`In Progress` $\to$ `Fixed`) | ✅ | ✅ | ❌ | ❌ |
| Verify & Close Defects (`Fixed` $\to$ `Verified` $\to$ `Closed`) | ✅ | ❌ | ✅ | ❌ |
| Two-Person Digital Sign-off (Engineering / QA) | ✅ | ✅ (Eng) | ✅ (QA) | ❌ |
| Deploy Milestone to Production (`Released`) | ✅ | ❌ | ❌ | ❌ |
| Register & Manage Outbound Webhooks | ✅ | ❌ | ❌ | ❌ |

---

## 3. Real-Time Distributed Collaboration & Live Presence
DevTrack incorporates an asynchronous real-time peer bus (`src/collab.js`) utilizing bi-directional `BroadcastChannel` with automated `localStorage` cross-tab fallback.

### 3.1 Live Presence Indicator
- Located in the navigation header bar.
- Shows the real-time count of active teammates currently connected to the workspace (e.g. `🟢 2 Online`).
- Features an interactive avatar stack displaying online users' profile photos, names, and current viewing routes.

### 3.2 Real-Time Activity Feed Drawer
- Click the **Live Stream** button (`#team-stream-btn`) in the header to open the slide-out team activity drawer.
- Streams live actions across all peers: card transitions, defect filings, release promotions, and team preference updates.
- Highlights teammate events with color-coded toast notifications.

---

## 4. Team Working Agreements & Configuration
Configure project policies in **Team & Roles** (`#/team`) under **Team Working Agreements**:

1. **Sprint Cadence**: Configurable between 1, 2, 3, or 4-week iteration cycles.
2. **Story Point Estimation Scale**:
   - `Fibonacci`: 1, 2, 3, 5, 8, 13, 21 pts (standard agile delivery).
   - `Linear`: 1, 2, 3, 4, 5 pts.
   - `T-Shirt`: XS, S, M, L, XL sizes.
3. **WIP Limit Enforcement Mode**:
   - `Warning (Advisory)`: Displays amber warnings when column capacity is exceeded while allowing urgent work.
   - `Strict (Block Moves)`: Strictly prevents dragging or moving cards into columns that have reached their limit.
4. **Auto-Assignment on In Progress**: Automatically assigns unassigned task cards to the engineer who moved them.
5. **Quality Gate Transition Check**: Enforces MoSCoW requirement links and passing tests before cards can reach `Done`.

---

## 5. GitOps & Commit-to-Card Automation
Eliminate manual board maintenance with DevTrack's Commit-to-Card engine (`src/gitops.js`):

### 5.1 Branch Naming Convention
- Open any task modal (`#/sprints`).
- The **GitOps & Commit-to-Card Automation** panel automatically generates the canonical Git branch name:
  ```bash
  git checkout -b feat/PROJ-101-socket-stream
  ```
- Click **Copy Branch** for 1-click clipboard access.

### 5.2 Automated Kanban Progression via Git
- **Feature Commit**: Commits following the conventional syntax `feat(KEY-101): ...` or `fix(KEY-101): ...` automatically advance the card from `To Do` $\to$ `In Progress`.
- **Pull Request Created**: Opening a PR automatically advances the card to `In Review`.
- **Pull Request Merged**: Merging the PR into the target branch transitions the card to `Done` and records the short commit SHA (e.g. `7a9b1c2`).

### 5.3 Interactive PR Simulation in UI
- In the task modal, select **Simulate PR Merge**.
- DevTrack runs the automated git progression, increments story point burn, and attaches Git metadata to the card.
- Cards on the sprint board display Git branch pills and commit count badges.

---

## 6. Requirements Engineering (MoSCoW) & Revision Audit
Navigate to **Requirements / MoSCoW** (`#/requirements`):

1. **Authoring Specifications**:
   - Click `+ New Requirement`. Enter title, detailed scope, and testable acceptance criteria (*Given / When / Then*).
   - Categorize by **MoSCoW Priority**: `Must Have`, `Should Have`, `Could Have`, `Won't Have (this time)`.
   - Link target release version (e.g. `v1.0.0`).
2. **State Lifecycle**:
   - Progress from `Draft` $\to$ `Reviewed` $\to$ `Approved` $\to$ `In Development` $\to$ `Implemented`.
3. **Tamper-Evident Revisions**:
   - Click `Audit Revisions` on any card to view field-level diffs detailing who changed what, the previous vs new value, and ISO timestamps.

---

## 7. Sprint Planning & Kanban Workflow (WIP Limits)
Navigate to **Sprints & Tasks Board** (`#/sprints`):

1. **Sprint Management**:
   - Create sprints with chronology validation (end date must be after start date).
   - Projects maintain one `Active` sprint at a time; future sprints are held in `Planned`.
2. **Work In Progress (WIP) Limits**:
   - Click **WIP Limits** in the top toolbar to configure maximum card limits for `Backlog`, `To Do`, `In Progress`, `In Review`, and `Done`.
   - Columns show real-time utilization (e.g. `WIP: 3/4`).
   - If a column reaches or exceeds capacity, it highlights in amber or rose. In `Strict` mode, excess moves are blocked.
3. **Card Transitions**:
   - Strictly enforces linear progression: `Backlog` $\leftrightarrow$ `To Do` $\leftrightarrow$ `In Progress` $\leftrightarrow$ `In Review` $\leftrightarrow$ `Done`.

---

## 8. QA Test Suites, Telemetry & Defect Triage
Navigate to **Test Runs & QA** (`#/tests`) and **Bug Tracker** (`#/bugs`):

1. **Test Case Authoring**:
   - Link test cases directly to approved MoSCoW requirements.
   - Define test types: `Unit`, `Integration`, `E2E`, `Regression`, `Performance`, `Security`.
2. **Immutable Test Execution Telemetry**:
   - Select `Execute Test Run`, choose outcome (`Passed`, `Failed`, `Blocked`, `Skipped`), and enter assertion evidence (HTTP status, memory usage, logs).
   - Test runs are append-only audit records that cannot be rewritten.
3. **Failure-to-Defect One-Click Linking**:
   - On any `Failed` test run, click `Log Linked Bug`.
   - The bug modal opens pre-populated with the failed test run reference and originating requirement.
4. **Defect Lifecycle Governance**:
   - Developers work on bugs: `Open` $\to$ `In Progress` $\to$ `Fixed`.
   - Only **Testers** and **Owners** can verify: `Fixed` $\to$ `Verified` $\to$ `Closed`.

---

## 9. Engineering Flow & DORA 4 Metrics Analytics
Navigate to the **Dashboard** (`#/dashboard`) and click **"Flow & DORA Analytics"** (`#open-flow-analytics-btn`):

1. **DORA 4 Core Metrics**:
   - **Deployment Frequency**: Measures release cadence into production (rated `ELITE`, `HIGH`, `MEDIUM`, `LOW`).
   - **Lead Time for Changes**: Measures duration from code commit to verified production deployment.
   - **Change Failure Rate**: Percentage of shipped releases that trigger critical defects.
   - **Mean Time to Restore (MTTR)**: Turnaround time required to mitigate and close critical defects.
2. **Cycle Time vs Lead Time Efficiency**:
   - Visual progress split comparing active coding time (~65%) vs code review and verification wait time (~35%).
3. **Cumulative Flow Distribution (CFD)**:
   - Real-time distribution of story points and item count across all 5 Kanban states.
4. **Automated Bottleneck Detection**:
   - Alerts the team when items stall in `In Review` or when `In Progress` WIP limits are exceeded.
5. **Multi-Sprint Rolling Velocity**:
   - History table comparing Planned vs Delivered points, reliability percentage, and rolling team velocity.

---

## 10. Two-Person Integrity Production Release Gate & Semantic Changelog
Navigate to **Releases & Traceability** (`#/releases`):

### 10.1 Dual Digital Sign-off Gate
In enterprise environments, no single person can deploy code directly to production without verification:
- Click **"Dual Sign-off"** on any release card (`v1.0.0`, `v1.1.0`).
- The modal reviews real-time compliance gates:
  1. **Blocker Defect Gate**: Checks for 0 unresolved Critical or High defects.
  2. **Regression Gate**: Confirms test run execution pass rate ($\ge 80\%$).
- **Engineering Lead Sign-off**: Confirms architecture stability, PR code review, and clean CI builds.
- **QA & Quality Lead Sign-off**: Confirms test suite execution and zero blocker bugs.
- Once both sign-offs are stamped, the release displays `✅ 2/2 Sign-offs` and unlocks the **Deploy to Production** button.

### 10.2 Automated Semantic Changelog Generator
- Click **"Changelog"** on any release card, or click **"Changelog Hub"** in the top toolbar.
- The engine automatically aggregates:
  - 🚀 **Features & Enhancements**: Completed requirements and sprint tasks with Git branch names and commit SHAs.
  - 🐛 **Defect Mitigations & Fixes**: Verified and closed bugs with severity badges.
  - 🛡️ **Verification Evidence**: Test run counts, pass rates, and blocker counts.
  - ✍️ **Digital Sign-off Stamps**: Full electronic signature records with signer identity and timestamps.
- Features **1-Click Copy Markdown** and **Download `.md`** (`CHANGELOG-v1.0.0.md`).

---

## 11. Outbound Webhook Bus & CI/CD Integrations Hub
Navigate to **Project Settings** (`#/settings`) under **Outbound Webhooks & CI/CD Integrations**:

### 11.1 Supported Platforms
- **Slack**: Formatted Block Kit JSON with styled headers, project details, and action metadata.
- **Discord**: Color-coded Embed JSON with severity badges and timestamps.
- **Microsoft Teams**: Office 365 MessageCard / Adaptive Card JSON.
- **Custom HTTP REST / CloudEvents**: Standard CloudEvents 1.0 JSON payloads for Jenkins, GitHub Actions, GitLab CI, or custom web services.

### 11.2 Subscribed Event Triggers
- `defect.created`: Dispatched immediately when a Critical or High bug is logged.
- `defect.resolved`: Dispatched when a defect is verified or closed.
- `release.promoted`: Dispatched when a release moves to Staging or Production.
- `release.signed_off`: Dispatched when Engineering or QA signs off on a release gate.
- `task.moved`: Dispatched when a task moves to `In Review` or `Done`.
- `test.failed`: Dispatched when a test execution assertion fails.

### 11.3 Test Ping & Payload Inspector
- Click **Test Ping** on any registered webhook.
- Select **Dispatch Test Ping** to transmit a simulated quality gate event.
- Inspect the formatted JSON payload, view delivery status (`200 OK`), and copy the raw payload with 1 click.
- The **Recent Webhook Delivery Audit** stream logs outbound dispatches with exact timestamps.

---

## 12. Workspace Settings, Backups & Audit Trail
Navigate to **Project Settings** (`#/settings`):

1. **General Configuration**: Update project name, description, target end date, and unique key.
2. **Full Workspace Backup**: Click **Export Complete Workspace JSON** to export an offline snapshot of requirements, tasks, test runs, defects, and audit logs.
3. **Complete Audit Lineage**:
   - Tamper-evident revision stream tracking every system event with noise-reduction grouping.
   - Filterable by categories: `All Events`, `Auth & Team`, `Config & Releases`, `Requirements`, `QA Testing`, `Defects`.
   - Full pagination and searchable revision logs.
