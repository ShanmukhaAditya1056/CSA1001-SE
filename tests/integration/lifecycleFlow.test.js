// DevTrack End-to-End Lifecycle Smoke Journey Test (gemini.md Section 10)
import assert from 'node:assert';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';

async function request(path, options = {}) {
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

export async function runLifecycleFlowTests() {
  console.log('\n--- [INTEGRATION TESTS] 12-Step End-to-End Lifecycle Journey ---');

  // Step 1: User Registration and Login
  console.log('Step 1: Register and login project creator...');
  const regRes = await request('/api/v1/auth/register', {
    method: 'POST',
    body: { name: 'Dr. Evelyn Reed', email: 'evelyn@reed-labs.io', password: 'StrongSecurePassword123!' }
  });
  assert.strictEqual(regRes.status, 201, 'User registration failed');
  const creatorUser = regRes.body.data;
  const loginRes = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'evelyn@reed-labs.io', password: 'StrongSecurePassword123!' }
  });
  assert.strictEqual(loginRes.status, 200, 'Login failed');
  const creatorToken = loginRes.body.data.token;
  console.log('✓ Registered project creator:', creatorUser.email);

  // Step 2: Create a Project
  console.log('Step 2: Create new software project workspace...');
  const projRes = await request('/api/v1/projects', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${creatorToken}` },
    body: {
      name: 'Autonomous Rover Fleet OS',
      key: 'ROVER',
      description: 'Distributed real-time operating telemetry system for exploration rovers'
    }
  });
  assert.strictEqual(projRes.status, 201, 'Project creation failed');
  const project = projRes.body.data;
  console.log(`✓ Project initialized: [${project.key}] ${project.name}`);

  // Step 3: Register a Teammate and Add to Project Team
  console.log('Step 3: Register teammate and add verified member to team...');
  const devRegRes = await request('/api/v1/auth/register', {
    method: 'POST',
    body: { name: 'Kaelen Vance', email: 'kaelen@reed-labs.io', password: 'StrongSecurePassword123!' }
  });
  assert.strictEqual(devRegRes.status, 201);
  const devUser = devRegRes.body.data;
  const devToken = devUser.token;

  const addMemberRes = await request(`/api/v1/projects/${project.id}/members`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${creatorToken}` },
    body: { email: devUser.email, role: 'Developer' }
  });
  assert.strictEqual(addMemberRes.status, 201, 'Team member addition failed');
  console.log(`✓ Added verified teammate ${devUser.name} as Developer`);

  // Step 4: Create Requirement with Acceptance Criteria and MoSCoW Priority
  console.log('Step 4: Author requirement with MoSCoW priority...');
  const reqRes = await request(`/api/v1/projects/${project.id}/requirements`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${creatorToken}` },
    body: {
      title: 'High-Gain Antenna Telemetry Stream',
      description: 'Stream directional antenna radiation telemetry at 20Hz via UDP.',
      priority: 'Must',
      acceptanceCriteria: 'Packets must include GPS coordinates, timestamp, and SNR ratio.'
    }
  });
  assert.strictEqual(reqRes.status, 201, 'Requirement authoring failed');
  const requirement = reqRes.body.data;
  console.log(`✓ Requirement created: [${requirement.priority}] ${requirement.title}`);

  // Step 5: Create Sprint and Sprint Task Linked to Requirement
  console.log('Step 5: Create Sprint and Task linked to requirement...');
  const sprintRes = await request(`/api/v1/projects/${project.id}/sprints`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${creatorToken}` },
    body: {
      name: 'Sprint Alpha — Communications Bridge',
      startDate: '2026-11-01',
      endDate: '2026-11-15',
      goal: 'Deliver stable UDP antenna telemetry'
    }
  });
  assert.strictEqual(sprintRes.status, 201);
  const sprint = sprintRes.body.data;

  const taskRes = await request(`/api/v1/projects/${project.id}/tasks`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${creatorToken}` },
    body: {
      title: 'Implement UDP socket streamer in telemetry daemon',
      sprintId: sprint.id,
      assigneeId: devUser.id,
      priority: 'High',
      status: 'In Progress',
      estimate: 5,
      requirementIds: [requirement.id]
    }
  });
  assert.strictEqual(taskRes.status, 201);
  const task = taskRes.body.data;
  // Kanban state machine: In Progress may not jump straight to Done
  const skipRes = await request(`/api/v1/projects/${project.id}/tasks/${task.id}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${devToken}` },
    body: { status: 'Done' }
  });
  assert.strictEqual(skipRes.status, 400, 'Skipping Review must be rejected');
  const reviewRes = await request(`/api/v1/projects/${project.id}/tasks/${task.id}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${devToken}` },
    body: { status: 'In Review' }
  });
  assert.strictEqual(reviewRes.status, 200);
  console.log(`✓ Sprint Task created: '${task.title}' linked to ${requirement.id}`);

  // Step 6: Create QA Test Case Linked to Requirement
  console.log('Step 6: Author QA Test Case linked to requirement...');
  const tcRes = await request(`/api/v1/projects/${project.id}/test-cases`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${creatorToken}` },
    body: {
      title: 'Verify UDP telemetry frame integrity under 20% packet drop',
      type: 'Integration',
      steps: '1. Inject network packet drop\n2. Stream 1000 frames\n3. Verify frame sequence parity',
      expectedResult: 'Frame sequence numbers are contiguous and no buffer corruption occurs.',
      requirementIds: [requirement.id]
    }
  });
  assert.strictEqual(tcRes.status, 201);
  const testCase = tcRes.body.data;
  console.log(`✓ Test Case created: '${testCase.title}'`);

  // Step 7: Execute Test Run as Failed
  console.log('Step 7: Record append-only QA execution run with Failed result...');
  const runRes = await request(`/api/v1/projects/${project.id}/test-runs`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${creatorToken}` },
    body: {
      testCaseId: testCase.id,
      result: 'Failed',
      notes: 'Frame sequence desynchronized at packet 482 due to memory ring buffer overrun.'
    }
  });
  assert.strictEqual(runRes.status, 201);
  const testRun = runRes.body.data;
  console.log(`✓ Telemetry execution log recorded: Result = ${testRun.result}`);

  // Step 8: Create Defect / Bug Linked to Failed Test Run and Requirement
  console.log('Step 8: File defect linked to failed test run...');
  const bugRes = await request(`/api/v1/projects/${project.id}/bugs`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${creatorToken}` },
    body: {
      title: 'UDP telemetry ring buffer overflow on dropped frames',
      severity: 'Critical',
      priority: 'High',
      status: 'Open',
      relatedRequirementId: requirement.id,
      relatedTestRunId: testRun.id
    }
  });
  assert.strictEqual(bugRes.status, 201);
  const bug = bugRes.body.data;
  console.log(`✓ Defect filed: [${bug.severity}] '${bug.title}' linked to test run ${testRun.id}`);

  // Step 9: Fix / Remediate Bug, then QA sign-off
  console.log('Step 9: Fix and verify defect through its lifecycle...');
  const patchBug = (token, status) => request(`/api/v1/projects/${project.id}/bugs/${bug.id}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}` },
    body: { status }
  });
  assert.strictEqual((await patchBug(devToken, 'Verified')).status, 400, 'Open → Verified must be rejected');
  assert.strictEqual((await patchBug(devToken, 'In Progress')).status, 200);
  assert.strictEqual((await patchBug(devToken, 'Fixed')).status, 200);
  assert.strictEqual((await patchBug(devToken, 'Verified')).status, 403, 'Developers cannot verify their own fix');
  const verifyRes = await patchBug(creatorToken, 'Verified');
  assert.strictEqual(verifyRes.status, 200);
  assert.strictEqual(verifyRes.body.data.status, 'Verified');
  console.log('✓ Bug fixed by development and verified by QA owner');

  // Step 10: Create Release Gate
  console.log('Step 10: Cut production release gate...');
  const relRes = await request(`/api/v1/projects/${project.id}/releases`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${creatorToken}` },
    body: {
      name: 'v1.0.0 — Rover Telemetry Flight Certification',
      summary: 'Production flight release for antenna communication subsystem',
      targetDate: '2026-11-20'
    }
  });
  assert.strictEqual(relRes.status, 201);
  const release = relRes.body.data;
  assert.strictEqual(release.status, 'Planning');
  const blockerRes = await request(`/api/v1/projects/${project.id}/bugs`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${creatorToken}` },
    body: { title: 'Antenna gimbal drift', severity: 'High', relatedRequirementId: requirement.id }
  });
  assert.strictEqual(blockerRes.status, 201);
  const patchRelease = status => request(`/api/v1/projects/${project.id}/releases/${release.id}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${creatorToken}` },
    body: { status }
  });
  assert.strictEqual((await patchRelease('Staging')).status, 200);
  const blockedRes = await patchRelease('Released');
  assert.strictEqual(blockedRes.status, 409, 'Release gate must block on unresolved High defects');
  assert.strictEqual(blockedRes.body.error.code, 'RELEASE_BLOCKED');
  // Triage the blocker as a duplicate and close it, then ship
  const closeRes = await request(`/api/v1/projects/${project.id}/bugs/${blockerRes.body.data.id}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${creatorToken}` },
    body: { status: 'Closed' }
  });
  assert.strictEqual(closeRes.status, 200);
  const shippedRes = await patchRelease('Released');
  assert.strictEqual(shippedRes.status, 200);
  assert.ok(shippedRes.body.data.actualDate, 'Released gate records its ship date');
  const linkRes = await request(`/api/v1/projects/${project.id}/requirements/${requirement.id}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${creatorToken}` },
    body: { targetRelease: release.id, status: 'Implemented' }
  });
  assert.strictEqual(linkRes.status, 200);
  console.log(`✓ Production release gate created and shipped: '${release.name}'`);

  // Step 11: Verify Complete Traceability Matrix
  console.log('Step 11: Validate end-to-end bidirectional traceability matrix...');
  const matrixRes = await request(`/api/v1/projects/${project.id}/traceability`, {
    headers: { 'Authorization': `Bearer ${creatorToken}` }
  });
  assert.strictEqual(matrixRes.status, 200);
  const matrix = matrixRes.body.data;
  assert.strictEqual(matrix.length, 1);
  const traceEntry = matrix[0];

  assert.strictEqual(traceEntry.requirement.id, requirement.id);
  assert.strictEqual(traceEntry.tasks.length, 1);
  assert.strictEqual(traceEntry.tasks[0].id, task.id);
  assert.strictEqual(traceEntry.testCases.length, 1);
  assert.strictEqual(traceEntry.testCases[0].id, testCase.id);
  assert.strictEqual(traceEntry.testRuns.length, 1);
  assert.strictEqual(traceEntry.testRuns[0].result, 'Failed');
  assert.strictEqual(traceEntry.bugs.length, 2);
  assert.ok(traceEntry.bugs.some(b => b.id === bug.id));
  assert.strictEqual(traceEntry.releases.length, 1);
  assert.strictEqual(traceEntry.releases[0].id, release.id);
  const historyRes = await request(`/api/v1/projects/${project.id}/requirements/${requirement.id}/history`, {
    headers: { 'Authorization': `Bearer ${creatorToken}` }
  });
  assert.ok(historyRes.body.data.some(h => h.field === 'status' && h.newValue === 'Implemented'), 'Requirement history is append-only');
  const coverageRes = await request(`/api/v1/projects/${project.id}/coverage`, {
    headers: { 'Authorization': `Bearer ${creatorToken}` }
  });
  assert.strictEqual(coverageRes.status, 200);
  assert.strictEqual(coverageRes.body.data.defectsResolvedPct, 100);
  assert.strictEqual(coverageRes.body.data.blockerCount, 0);
  console.log('✓ Complete bidirectional lifecycle trace confirmed (Requirement → Task → Test → Bug → Release)!');

  // Step 12: Confirm Strict Cross-Project Data Isolation
  console.log('Step 12: Confirm unauthenticated or outsider users cannot access this project...');
  const anonAttempt = await request(`/api/v1/projects/${project.id}/traceability`);
  assert.strictEqual(anonAttempt.status, 401, 'Unauthenticated access must be denied');
  const outsiderReg = await request('/api/v1/auth/register', {
    method: 'POST',
    body: { name: 'Mallory', email: 'mallory@rival.io', password: 'StrongSecurePassword123!' }
  });
  assert.strictEqual(outsiderReg.status, 201);
  const outsiderAttempt = await request(`/api/v1/projects/${project.id}/traceability`, {
    headers: { 'Authorization': `Bearer ${outsiderReg.body.data.token}` }
  });
  assert.strictEqual(outsiderAttempt.status, 403, 'Registered non-members must be denied');
  console.log('✓ Project data confirmed strictly isolated from unauthorized parties');

  console.log('✓ All 12 Steps of the End-to-End Lifecycle Journey PASSED with 100% success!\n');
}
