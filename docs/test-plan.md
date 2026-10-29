# DevTrack — Quality Assurance & Test Plan

## 1. Test Strategy & Pyramid
The testing strategy for DevTrack follows the standard software engineering test pyramid:
1. **Unit Tests:** Validate isolated business rules (role checks, MoSCoW priorities, status transitions, sprint dates).
2. **Integration / API Tests:** Validate REST endpoints, cookie issuance, database foreign key constraints, and cross-project isolation.
3. **End-to-End & Smoke Tests:** Execute the core user journey from account registration to release sign-off.

---

## 2. Test Cases Specification

| Test Case ID | Feature Scope | Objective | Steps & Input | Expected Outcome | Execution Result |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **TC-001** | Authentication | Verify registration with valid data | Enter unique name, email, password $\ge 8$ chars | User created, session cookie set, redirected to dashboard | **Passed** |
| **TC-002** | Authentication | Verify duplicate email rejection | Attempt registration with `alex@devtrack.io` | HTTP 409 Conflict with `"Email already in use"` error | **Passed** |
| **TC-003** | Authorization | Prevent last owner removal | Project owner attempts to remove own membership when only 1 owner | Error: `"Cannot remove the last owner"` | **Passed** |
| **TC-004** | Project Isolation | Verify cross-project data denial | Authenticated user requests records of non-member project | HTTP 403 Forbidden or empty project list | **Passed** |
| **TC-005** | Requirements | Audit history logging on status change | Change requirement status from Draft $\rightarrow$ Approved | `RequirementHistory` record appended with timestamp & author | **Passed** |
| **TC-006** | Agile Sprints | Kanban status transition validation | Move task from Backlog $\rightarrow$ To Do $\rightarrow$ Done | Task status persists, story points reflected in burndown velocity | **Passed** |
| **TC-007** | QA & Defect | Failing test run generates linked bug | Record test run as `Failed`; click "+ Log Defect" | Bug is created with `relatedTestRunId` and `relatedRequirementId` populated | **Passed** |
| **TC-008** | Traceability Gate | Release gate blocker on active defect | Attempt release with open Critical defect on linked requirement | Status is `GATED / BLOCKED`; requirements flagged as not release-ready | **Passed** |

---

## 3. Execution Verification Evidence & Telemetry
- **Automated Test Runner (`npm test`):** Executes 3 comprehensive test suites covering:
  - **Unit Tests:** 7/7 suites passed (Role matrix, MoSCoW priorities, Sprint dates, Kanban state transitions, Bug triage, Traceability calculation, Verified account policy).
  - **API Security & Project Isolation:** 6/6 suites passed (Security headers, Auth rate limiting, Unauthenticated 401, Non-member 403, Viewer write denial 403, Cross-project link prevention 400, Team member verified-account enforcement).
  - **12-Step Lifecycle Smoke Journey:** 12/12 steps passed end-to-end (Register → Create Project → Add Verified Member → Create Requirement → Sprint Task → QA Test Case → Failed Test Run → File Defect → Fix Defect → Cut Release → Verify Traceability Matrix → Cross-project isolation).
- **Vite Production Bundle Build (`npm run build`):** Built with zero bundling or asset resolution warnings.
- **Docker & CI Automation:** Verified via `.github/workflows/ci.yml` running audit, automated tests, and bundle builds on push/PR.

---

## 4. Known Limitations & Technical Debt
1. **Local Development Web Server:** Relies on local browser storage for client-side state caching when the backend container is offline.
2. **Headless Browser Driver Installation:** Automated browser drivers may require manual installation in strict proxy or corporate firewall environments.
