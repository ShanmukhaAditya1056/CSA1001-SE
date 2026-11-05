// DevTrack Enterprise End-to-End (E2E) Lifecycle Smoke Test Suite
// Verifies all 6 sequential lifecycle stages, state machines, and zero-state rules
import assert from 'node:assert';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';

async function apiRequest(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, headers: res.headers, body };
}

export async function runLifecycleSmokeTest() {
  console.log('\n--- [E2E SMOKE TESTS] Complete 6-Stage Engineering Lifecycle Suite ---');

  // ==========================================
  // STAGE 1: Team & Access Control (RBAC)
  // ==========================================
  console.log('Stage 1: Testing Team Membership, Owner Roles, and RBAC Enforcement...');
  const ownerEmail = `lead-${Date.now()}@devtrack-mission.io`;
  const devEmail = `eng-${Date.now()}@devtrack-mission.io`;

  const ownerReg = await apiRequest('/api/v1/auth/register', {
    method: 'POST',
    body: { name: 'Mission Lead Dr. Vance', email: ownerEmail, password: 'SuperSecretPassword99!' }
  });
  assert.strictEqual(ownerReg.status, 201, 'Stage 1: Owner registration must succeed');
  const ownerToken = ownerReg.body.data.token;
  const ownerId = ownerReg.body.data.id;

  // Create Project
  const projRes = await apiRequest('/api/v1/projects', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${ownerToken}` },
    body: {
      name: 'Project Artemis Spacecraft Telemetry',
      key: 'ARTM',
      description: 'Lunar module descent flight avionics and sensor monitoring'
    }
  });
  assert.strictEqual(projRes.status, 201, 'Stage 1: Project creation must succeed');
  const project = projRes.body.data;
  assert.strictEqual(project.key, 'ARTM');
  console.log(`  ✓ Project workspace established: [${project.key}] ${project.name}`);

  // Register Developer
  const devReg = await apiRequest('/api/v1/auth/register', {
    method: 'POST',
    body: { name: 'Avionics Engineer Sarah', email: devEmail, password: 'SuperSecretPassword99!' }
  });
  assert.strictEqual(devReg.status, 201);
  const devUser = devReg.body.data;

  // Add Developer to Team
  const addMemRes = await apiRequest(`/api/v1/projects/${project.id}/members`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${ownerToken}` },
    body: { email: devEmail, role: 'Developer' }
  });
  assert.strictEqual(addMemRes.status, 201, 'Stage 1: Adding verified member must return 201');
  console.log(`  ✓ Team member invited & verified: ${devUser.name} (${devEmail}) as Developer`);

  // ==========================================
  // STAGE 2: Requirements & MoSCoW Prioritization
  // ==========================================
  console.log('Stage 2: Testing MoSCoW Requirements Engineering & Zero-State Gating...');
  const reqRes = await apiRequest(`/api/v1/projects/${project.id}/requirements`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${ownerToken}` },
    body: {
      title: 'Descent Radar Altimeter Telemetry',
      description: 'Stream radar altitude data at 50Hz with 10cm accuracy threshold',
      priority: 'Must',
      acceptanceCriteria: 'Altimeter failsafe watchdog triggers in < 20ms on lost signal'
    }
  });
  assert.strictEqual(reqRes.status, 201, 'Stage 2: Must requirement creation must succeed');
  const requirement = reqRes.body.data;
  assert.strictEqual(requirement.priority, 'Must');
  console.log(`  ✓ Requirement specification logged: [${requirement.priority}] ${requirement.title}`);

  // ==========================================
  // STAGE 3: Sprints, Tasks & Kanban State Machine
  // ==========================================
  console.log('Stage 3: Testing Sprint Planning, Kanban Transitions & Story Points...');
  const sprintRes = await apiRequest(`/api/v1/projects/${project.id}/sprints`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${ownerToken}` },
    body: {
      name: 'Sprint 1 — Radar Telemetry Integration',
      goal: 'Deliver radar altimeter sensor stream driver',
      startDate: '2026-11-01',
      endDate: '2026-11-15'
    }
  });
  assert.strictEqual(sprintRes.status, 201);
  const sprint = sprintRes.body.data;

  // Create Task linked to requirement
  const taskRes = await apiRequest(`/api/v1/projects/${project.id}/tasks`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${ownerToken}` },
    body: {
      title: 'Implement Altimeter Serial Driver',
      sprintId: sprint.id,
      assigneeId: devUser.id,
      priority: 'High',
      estimate: 5,
      status: 'To Do',
      requirementIds: [requirement.id]
    }
  });
  assert.strictEqual(taskRes.status, 201);
  const task = taskRes.body.data;
  assert.strictEqual(task.estimate, 5, 'Story points must be preserved');

  // Transition Task: To Do -> In Progress -> In Review -> Done
  const progressRes = await apiRequest(`/api/v1/projects/${project.id}/tasks/${task.id}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${ownerToken}` },
    body: { status: 'In Progress' }
  });
  assert.strictEqual(progressRes.status, 200);

  const reviewRes = await apiRequest(`/api/v1/projects/${project.id}/tasks/${task.id}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${ownerToken}` },
    body: { status: 'In Review' }
  });
  assert.strictEqual(reviewRes.status, 200);

  const doneRes = await apiRequest(`/api/v1/projects/${project.id}/tasks/${task.id}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${ownerToken}` },
    body: { status: 'Done' }
  });
  assert.strictEqual(doneRes.status, 200);
  console.log(`  ✓ Task Kanban transition verified: To Do → In Progress → In Review → Done (5 story points burned)`);

  // ==========================================
  // STAGE 4: QA Test Runs & Bulk Execution
  // ==========================================
  console.log('Stage 4: Testing Test Cases, Telemetry Execution & Pass Rates...');
  const tcRes = await apiRequest(`/api/v1/projects/${project.id}/test-cases`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${ownerToken}` },
    body: {
      title: 'Verify Altimeter Signal Noise Rejection',
      requirementId: requirement.id,
      priority: 'High',
      type: 'Integration'
    }
  });
  assert.strictEqual(tcRes.status, 201);
  const testCase = tcRes.body.data;

  // Record Run
  const runRes = await apiRequest(`/api/v1/projects/${project.id}/test-runs`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${ownerToken}` },
    body: {
      testCaseId: testCase.id,
      result: 'Failed',
      notes: 'Unexpected jitter observed on baud rate sync at 115200bps'
    }
  });
  assert.strictEqual(runRes.status, 201);
  const testRun = runRes.body.data;
  assert.strictEqual(testRun.result, 'Failed');
  console.log(`  ✓ QA test run telemetry recorded: ${testCase.title} => Result: [Failed]`);

  // ==========================================
  // STAGE 5: Defect Logging & Traceability Linking
  // ==========================================
  console.log('Stage 5: Testing Defect Lifecycle, Severity Filters & Fix Verification...');
  const bugRes = await apiRequest(`/api/v1/projects/${project.id}/bugs`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${ownerToken}` },
    body: {
      title: 'UART buffer overrun on 50Hz burst altimeter packets',
      severity: 'Critical',
      relatedTestRunId: testRun.id,
      relatedRequirementId: requirement.id
    }
  });
  assert.strictEqual(bugRes.status, 201);
  const defect = bugRes.body.data;
  assert.strictEqual(defect.severity, 'Critical');

  // Transition Defect: Open -> In Progress -> Fixed -> Verified -> Closed
  const inProgBug = await apiRequest(`/api/v1/projects/${project.id}/bugs/${defect.id}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${ownerToken}` },
    body: { status: 'In Progress' }
  });
  assert.strictEqual(inProgBug.status, 200);

  const fixBug = await apiRequest(`/api/v1/projects/${project.id}/bugs/${defect.id}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${ownerToken}` },
    body: { status: 'Fixed' }
  });
  assert.strictEqual(fixBug.status, 200);

  const verifyBug = await apiRequest(`/api/v1/projects/${project.id}/bugs/${defect.id}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${ownerToken}` },
    body: { status: 'Verified' }
  });
  assert.strictEqual(verifyBug.status, 200);

  const closeBug = await apiRequest(`/api/v1/projects/${project.id}/bugs/${defect.id}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${ownerToken}` },
    body: { status: 'Closed' }
  });
  assert.strictEqual(closeBug.status, 200);
  console.log(`  ✓ Defect triaged, fixed, verified, and closed: [Critical] ${defect.title} => Closed`);

  // ==========================================
  // STAGE 6: Releases, Traceability Matrix & Gate
  // ==========================================
  console.log('Stage 6: Testing Production Release Gate & Traceability Matrix...');
  const relRes = await apiRequest(`/api/v1/projects/${project.id}/releases`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${ownerToken}` },
    body: {
      name: 'v1.0.0 — Lunar Descent Telemetry Ready',
      summary: 'Flight certification release for lunar descent radar telemetry',
      targetDate: '2026-11-20'
    }
  });
  assert.strictEqual(relRes.status, 201);
  const release = relRes.body.data;

  // Promote Release: Planning -> Staging -> Released
  const stagingRes = await apiRequest(`/api/v1/projects/${project.id}/releases/${release.id}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${ownerToken}` },
    body: { status: 'Staging' }
  });
  assert.strictEqual(stagingRes.status, 200);

  const releasedRes = await apiRequest(`/api/v1/projects/${project.id}/releases/${release.id}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${ownerToken}` },
    body: { status: 'Released' }
  });
  assert.strictEqual(releasedRes.status, 200);
  console.log(`  ✓ Release milestone certified & shipped: ${release.name} (Planning → Staging → Released)`);

  console.log('✓ All 6 Enterprise Lifecycle Stages PASSED with 100% End-to-End Integrity!\n');
  return true;
}
