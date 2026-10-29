# DevTrack — Full-Stack Software Engineering Lifecycle Platform

[![CI Pipeline](https://github.com/ShanmukhaAditya1056/CSA1001-SE/actions/workflows/ci.yml/badge.svg)](https://github.com/ShanmukhaAditya1056/CSA1001-SE/actions/workflows/ci.yml)
[![Node Version](https://img.shields.io/badge/node-20_LTS-green.svg)](https://nodejs.org/)
[![Docker Compose](https://img.shields.io/badge/docker-compose_v2.28-blue.svg)](https://docs.docker.com/compose/)
[![Design System](https://img.shields.io/badge/Stitch_Project-5183196354421110263-purple.svg)](https://stitch.google.com/)

**DevTrack** is a medium-complexity, full-stack Software Engineering Lifecycle Management Platform built to demonstrate the complete software engineering lifecycle: requirements elicitation, MoSCoW prioritization, agile sprint planning, Kanban execution, manual test case verification, defect tracking, forward and backward traceability matrices, containerization, and continuous integration.

The user interface reproduces all 17 screens designed in **Google Stitch Project ID `5183196354421110263`**.

---

## 📸 Key Features & Screen Navigation

| Screen / Feature | Route | Description |
| :--- | :--- | :--- |
| **Sign In & Secure Access** | `#/login` | Secure authentication with **1-click Quick Demo logins** for all project roles. |
| **Account Registration** | `#/register` | Provision new developer or tester accounts with input validation. |
| **Password Recovery** | `#/forgot-password` | Password reset request and instructions. |
| **Lifecycle Cockpit Dashboard** | `#/dashboard` | Executive Cockpit with live E2E Lifecycle Traceability Graph ribbon, MoSCoW split, Sprint Burndown & Velocity SVG chart, QA pass rates, and active defect triage. |
| **Projects Directory** | `#/projects` | Multi-project directory cards, delivery progress bars, and "+ New Project" creation modal. |
| **Requirements & MoSCoW** | `#/requirements` | Full MoSCoW filtering tabs (*Must, Should, Could, Won't*), lifecycle status filters, acceptance criteria, and audit diffs. |
| **Sprint Board & Tasks** | `#/sprints` | 5-column Kanban board (*Backlog*, *To Do*, *In Progress*, *In Review*, *Done*), story point estimates, assignee avatars, and interactive status menus. |
| **Test Cases & QA Runs** | `#/tests` | Test specifications, append-only execution telemetry log, pass/fail rates, and **1-click linked bug creation** on failed runs. |
| **Defect & Bug Tracker** | `#/bugs` | Severity triage (*Critical P1 blockers, High, Medium, Low*), reproduction steps, linked requirements/tasks, and status flow. |
| **Releases & Traceability** | `#/releases` | Release cuts, **full bidirectional Traceability Matrix table** (Requirement &rarr; Tasks &rarr; Test Suites &rarr; Defects &rarr; Release Readiness Gate), and CSV export. |
| **Team & Roles** | `#/team` | Project roster with role permissions (*Owner, Developer, Tester, Viewer*), role changer dropdown, and last owner protection. |
| **Settings & Audit** | `#/settings` | Project metadata management, complete chronological system audit event stream, full JSON workspace backup download, and factory seed reset. |
| **CI/CD Pipeline** | `#/ci-cd` | Multi-stage Docker Compose, lint, TypeScript typecheck, Vitest unit test, and cluster smoke check simulation with real-time streaming console logs. |
| **Lifecycle Blueprint Guide** | `#/getting-started` | 6-step project onboarding checklist from elicitation to production release cut. |
| **Omni Quick Search** | `Ctrl + K` | Universal search modal across all requirements, tasks, defects, and test cases. |

---

## 👥 Demo Accounts (1-Click Login)

The application includes seeded demo accounts with role-based permissions:

| Persona | Name | Role | Email | Password |
| :--- | :--- | :--- | :--- | :--- |
| **Project Lead** | Alex Vance | Owner | `alex@devtrack.io` | `password123` |
| **Full-Stack Developer** | Jordan Chen | Developer | `jordan@devtrack.io` | `password123` |
| **QA Engineer** | Sam Rivera | Tester | `sam@devtrack.io` | `password123` |

---

## 🛠️ Technology Stack

- **Frontend:** HTML5, Vanilla JavaScript (ES Modules), Tailwind CSS (Dark Theme), Google Fonts (`Geist`, `Inter`, `JetBrains Mono`), Material Symbols Outlined.
- **Client-Side State:** LocalStorage reactive store simulating full CRUD, relations, and append-only audit histories.
- **Data Model:** Prisma ORM schema with PostgreSQL 16 relational model (`prisma/schema.prisma`).
- **DevOps & Containerization:** Docker, Docker Compose v2.28, GitHub Actions CI workflow (`.github/workflows/ci.yml`).
- **Tooling:** Vite 5.

---

## 🚀 Quickstart — Run Locally

### 1. Prerequisites
- Node.js LTS (v20.x or higher)
- npm (v10.x or higher)

### 2. Install & Start
```bash
# Clone the repository
git clone https://github.com/ShanmukhaAditya1056/CSA1001-SE.git
cd CSA1001-SE

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Open **`http://localhost:5173/`** in your browser.

### 3. Production Build
```bash
npm run build
```
Build output is generated into `dist/`.

---

## 🐳 Docker Compose Deployment

To run DevTrack containerized alongside a PostgreSQL 16 database:

```bash
docker compose up --build -d
```
Access the application at `http://localhost:5173/`.

---

## 📚 Technical Documentation Suite

Comprehensive technical deliverables are located in the `docs/` directory:

- [Project Proposal](file:///c:/Users/lenovo/Documents/SE-CSA1001/docs/project-proposal.md)
- [Software Requirements Specification (SRS)](file:///c:/Users/lenovo/Documents/SE-CSA1001/docs/requirements-specification.md)
- [Architecture & ER Diagram](file:///c:/Users/lenovo/Documents/SE-CSA1001/docs/architecture.md)
- [REST API v1 Specification](file:///c:/Users/lenovo/Documents/SE-CSA1001/docs/api.md)
- [Quality Assurance & Test Plan](file:///c:/Users/lenovo/Documents/SE-CSA1001/docs/test-plan.md)
- [Deployment & Operations Guide](file:///c:/Users/lenovo/Documents/SE-CSA1001/docs/deployment-guide.md)
- [End-User Operational Guide](file:///c:/Users/lenovo/Documents/SE-CSA1001/docs/user-guide.md)
- [Security, Ethics & Sustainability Analysis](file:///c:/Users/lenovo/Documents/SE-CSA1001/docs/security-ethics-sustainability.md)
- [Academic Final Project Report Outline](file:///c:/Users/lenovo/Documents/SE-CSA1001/docs/final-report-outline.md)
- [Relational Prisma Schema](file:///c:/Users/lenovo/Documents/SE-CSA1001/prisma/schema.prisma)

---

## 📄 License
This project is licensed under the ISC License.
