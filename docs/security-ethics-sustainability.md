# DevTrack — Security, Ethics & Sustainability Analysis

## 1. Security Architecture & Threat Model

### 1.1 Principle of Least Privilege & Project Isolation
- Every project record (Requirement, Task, TestCase, TestRun, Bug, Release) belongs strictly to a `projectId`.
- A user cannot read, update, or delete any record unless they are verified as a member of that project.
- Role-based permissions are enforced strictly: Viewers cannot perform state-modifying actions; only Owners can manage memberships or demote roles.
- The system prevents removal of the last project Owner to prevent orphaned workspaces.

### 1.2 Authentication & Credential Protection
- Passwords are never stored in plaintext. They are hashed using Argon2id or bcrypt with configurable memory and iteration costs.
- Tokens are delivered via HTTP-only, `SameSite=Lax` cookies, neutralizing Cross-Site Scripting (XSS) token exfiltration.
- Cross-Site Request Forgery (CSRF) defenses are applied to all state-changing endpoints.
- Rate limiting is applied to authentication endpoints to prevent brute-force credential stuffing.

### 1.3 Data Integrity & Audit Immutability
- Requirements revisions are logged in `RequirementHistory` as an append-only audit stream.
- Test runs preserve execution history instead of overwriting previous results.
- No sensitive keys or passwords are exposed in API JSON responses or client logs.

---

## 2. Ethical Considerations

### 2.1 Psychological Safety & Blameless Postmortems
- DevTrack is designed as a collaborative lifecycle platform, not an employee surveillance tool.
- Velocity metrics and burndown charts measure sprint-level delivery feasibility, not individual developer typing speed or keystroke monitoring.
- Defect tracking emphasizes root-cause process improvement and requirement ambiguity rather than personal blame.

### 2.2 Transparency & Fair Ownership
- Team members can view the exact criteria required for release sign-off.
- Role transitions and audit records clearly indicate who made each change, ensuring transparency across the engineering hierarchy.

---

## 3. Sustainability & Green Computing

### 3.1 Efficient Architecture & Resource Minimization
- **Modular Monolith over Microservices:** Avoiding distributed microservices eliminates container sprawl, service meshes, complex distributed tracing, and redundant networking overhead, drastically reducing idle CPU and electricity consumption.
- **Client-Side Rendering Efficiency:** The lightweight Single Page Application bundles under $250\text{ KB}$ gzipped, reducing network bandwidth usage and CDN carbon footprints.
- **Optimized Relational Queries:** Targeted indexes on `projectId`, `status`, and foreign keys prevent full table scans on PostgreSQL, lowering database memory utilization.
- **No Idle Polling:** The application utilizes reactive client updates rather than constant background interval polling, preserving battery life on mobile and laptop workstations.
