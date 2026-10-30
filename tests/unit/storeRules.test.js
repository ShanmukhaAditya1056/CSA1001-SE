// DevTrack unit tests: client store enforces the shared lifecycle rules
import assert from 'node:assert';

function makeStorage() {
  const data = {};
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => { data[key] = String(value); },
    removeItem: (key) => { delete data[key]; },
    clear: () => { Object.keys(data).forEach(key => delete data[key]); }
  };
}

export async function runStoreRulesTests() {
  global.localStorage = makeStorage();
  global.sessionStorage = makeStorage();

  const { store, encodeInviteToken, decodeInviteToken } = await import('../../src/store.js');
  store._data = null;
  store.resetData();

  console.log('\n--- [UNIT TESTS] Client Store Lifecycle Rule Enforcement ---');

  const owner = { uid: 'own-uid', email: 'owner@rules.io', displayName: 'Olivia Owner' };
  const viewer = { uid: 'view-uid', email: 'viewer@rules.io', displayName: 'Victor Viewer' };
  const tester = { uid: 'qa-uid', email: 'qa@rules.io', displayName: 'Quinn Tester' };

  store.setFirebaseUser(viewer);
  store.setFirebaseUser(tester);
  store.setFirebaseUser(owner);
  const project = store.createProject({ name: 'Rules Lab', key: 'RULE' }).data;
  assert.ok(store.createProject({ name: 'Dup', key: 'rule' }).error, 'Project keys are unique case-insensitively');
  store.addMember(project.id, viewer.email, 'Viewer');
  store.addMember(project.id, tester.email, 'Tester');

  // 1. Requirements: MoSCoW validation + initial history entry
  assert.ok(store.createRequirement(project.id, { title: 'Bad', priority: 'Optional' }).error);
  const req = store.createRequirement(project.id, { title: 'Telemetry', priority: 'Must', status: 'Draft' }).data;
  assert.strictEqual(store.getRequirementHistory(req.id).length, 1, 'Creation is recorded in history');
  store.updateRequirement(req.id, { status: 'Approved' });
  assert.strictEqual(store.getRequirementHistory(req.id).length, 2);
  console.log('✓ Requirement MoSCoW validation and append-only history enforced');

  // 2. Sprint chronology and single active sprint
  assert.ok(store.createSprint(project.id, { name: 'Backwards', startDate: '2026-11-15', endDate: '2026-11-01' }).error);
  const sprint = store.createSprint(project.id, { name: 'S1', startDate: '2026-11-01', endDate: '2026-11-15', status: 'Active' }).data;
  assert.ok(store.createSprint(project.id, { name: 'S2', startDate: '2026-11-16', endDate: '2026-11-30', status: 'Active' }).error);
  console.log('✓ Sprint chronology and single active sprint enforced');

  // 3. Kanban transitions
  const task = store.createTask(project.id, { title: 'Build', sprintId: sprint.id, requirementIds: [req.id] }).data;
  assert.strictEqual(task.status, 'To Do');
  assert.ok(store.updateTask(task.id, { status: 'Done' }).error, 'To Do → Done must be rejected');
  assert.ok(!store.updateTask(task.id, { status: 'In Progress' }).error);
  assert.ok(store.createTask(project.id, { title: 'Orphan', requirementIds: ['foreign-req'] }).error, 'Cross-project link rejected');
  console.log('✓ Kanban transitions and referential integrity enforced');

  // 4. Viewer is read-only; Tester owns QA but not requirements
  store.setFirebaseUser(viewer);
  assert.match(store.createRequirement(project.id, { title: 'Nope', priority: 'Must' }).error, /Forbidden/);
  assert.match(store.updateTask(task.id, { status: 'In Review' }).error, /Forbidden/);
  store.setFirebaseUser(tester);
  assert.match(store.createRequirement(project.id, { title: 'Nope', priority: 'Must' }).error, /Forbidden/);
  const tc = store.createTestCase(project.id, { title: 'Frames', type: 'E2E', requirementIds: [req.id] }).data;
  assert.ok(store.createTestRun(tc.id, { result: 'Skipped' }).error, 'Only Passed/Failed/Blocked are valid results');
  const passRun = store.createTestRun(tc.id, { result: 'Passed' }).data;
  assert.ok(store.createBug(project.id, { title: 'x', severity: 'High', relatedTestRunId: passRun.id }).error, 'Bugs only link to Failed runs');
  const failRun = store.createTestRun(tc.id, { result: 'Failed' }).data;
  const bug = store.createBug(project.id, { title: 'Overflow', severity: 'Critical', relatedTestRunId: failRun.id, relatedRequirementId: req.id }).data;
  assert.strictEqual(bug.status, 'Open');
  console.log('✓ Role permission matrix enforced in the client store');

  // 5. Defect lifecycle with QA sign-off
  assert.ok(store.updateBug(bug.id, { status: 'Verified' }).error, 'Open → Verified must be rejected');
  store.setFirebaseUser(owner);
  assert.ok(!store.updateBug(bug.id, { status: 'In Progress' }).error);
  assert.ok(!store.updateBug(bug.id, { status: 'Fixed' }).error);
  assert.ok(!store.updateBug(bug.id, { status: 'Verified' }).error);
  console.log('✓ Defect lifecycle transitions enforced');

  // 6. Releases need SemVer names and trace back to requirements
  assert.ok(store.createRelease(project.id, { name: 'Big Launch' }).error, 'Release names must be SemVer');
  const rel = store.createRelease(project.id, { name: 'v1.0.0 — Launch' }).data;
  assert.strictEqual(rel.status, 'Planning');
  store.updateRequirement(req.id, { targetRelease: rel.id });
  const row = store.getTraceability(project.id).find(r => r.requirement.id === req.id);
  assert.strictEqual(row.releases[0].id, rel.id);
  assert.strictEqual(row.bugs.length, 1);
  console.log('✓ SemVer release gates and requirement → release traceability enforced');

  // 7. Malicious self-describing invitation payloads are sanitized on decode
  const evil = encodeInviteToken({
    id: 'inv-x', projectId: 'p-x', projectName: '<img src=x onerror=alert(1)>', projectKey: 'EVL',
    inviterName: '"><script>alert(1)</script>', inviterEmail: 'a@b.io', inviteeEmail: 'v@b.io',
    role: 'SuperAdmin', team: [{ name: '<b>x</b>', email: 'T@B.IO', role: 'Root' }],
    expiresAt: new Date(Date.now() + 86400000).toISOString(), createdAt: new Date().toISOString()
  });
  const decoded = decodeInviteToken(evil);
  assert.ok(!/[<>"]/.test(decoded.projectName + decoded.inviterName + decoded.team[0].name), 'Markup must be stripped');
  assert.strictEqual(decoded.role, 'Developer', 'Unknown roles fall back to Developer');
  assert.strictEqual(decoded.team[0].role, 'Developer');
  assert.strictEqual(decoded.team[0].email, 't@b.io');
  // Server-signed tokens (payload.signature) still decode on the client
  assert.strictEqual(decodeInviteToken(`${evil}.c2lnbmF0dXJl`).projectKey, 'EVL');
  console.log('✓ Invitation token payloads sanitized; signed tokens decode');

  console.log('✓ All 7 Client Store Rule Enforcement tests PASSED!\n');
}
