// DevTrack unit tests: team member profiles
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

export async function runMemberProfileTests() {
  console.log('\n--- [UNIT TESTS] Team Member Profiles ---');
  global.localStorage = makeStorage();
  global.sessionStorage = makeStorage();
  const { store } = await import('../../src/store.js');
  store._data = null;
  store.resetData();

  const owner = { uid: 'own-uid', email: 'olive@team.io', displayName: 'Olive Owner' };
  const dev = { uid: 'dev-uid', email: 'dan@team.io', displayName: 'Dan Dev' };
  const outsider = { uid: 'out-uid', email: 'otto@else.io', displayName: 'Otto Outsider' };
  for (const u of [outsider, dev, owner]) store.setFirebaseUser(u);

  const project = store.createProject({ name: 'Profiles', key: 'PROF' }).data;
  store.addMember(project.id, dev.email, 'Developer');
  const req = store.createRequirement(project.id, { title: 'Login', priority: 'Must' }).data;
  const sprint = store.createSprint(project.id, { name: 'S1', startDate: '2026-11-01', endDate: '2026-11-14', status: 'Active' }).data;
  const t1 = store.createTask(project.id, { title: 'Build login form', sprintId: sprint.id, assigneeId: dev.uid, estimate: 3, priority: 'High', requirementIds: [req.id] }).data;
  const t2 = store.createTask(project.id, { title: 'Session API', sprintId: sprint.id, assigneeId: dev.uid, estimate: 5, priority: 'Medium', requirementIds: [req.id] }).data;
  for (const st of ['In Progress', 'In Review', 'Done']) store.updateTask(t2.id, { status: st });
  const tc = store.createTestCase(project.id, { title: 'Login works', type: 'E2E', requirementIds: [req.id] }).data;
  const failed = store.createTestRun(tc.id, { result: 'Failed' }).data;
  store.createTestRun(tc.id, { result: 'Passed' });
  store.createBug(project.id, { title: 'Login 500s', severity: 'High', assigneeId: dev.uid, relatedTestRunId: failed.id });

  const members = store.getMembers(project.id);
  const devMember = members.find(m => m.userEmail === dev.email);
  const ownerMember = members.find(m => m.userEmail === owner.email);

  // 1. Workload is scoped to the member and excludes finished work
  const devProfile = store.getMemberProfile(project.id, devMember.id).data;
  assert.strictEqual(devProfile.member.role, 'Developer');
  assert.strictEqual(devProfile.isMe, false);
  assert.strictEqual(devProfile.stats.openTasks, 1);
  assert.strictEqual(devProfile.stats.openPoints, 3);
  assert.strictEqual(devProfile.stats.doneTasks, 1);
  assert.deepStrictEqual(devProfile.tasks.map(t => t.id), [t1.id], 'Only open tasks are listed');
  assert.strictEqual(devProfile.tasks[0].sprintName, 'S1');
  assert.strictEqual(devProfile.stats.openBugs, 1);
  assert.strictEqual(devProfile.stats.testRuns, 0, 'Runs executed by others are not counted');
  console.log('✓ Workload stats count only the member\'s open work');

  // 2. The owner's profile shows their own authored work and activity, newest first
  const ownerProfile = store.getMemberProfile(project.id, ownerMember.id).data;
  assert.strictEqual(ownerProfile.isMe, true);
  assert.strictEqual(ownerProfile.stats.testRuns, 2);
  assert.strictEqual(ownerProfile.stats.passRate, 50);
  assert.strictEqual(ownerProfile.requirementsCount, 1);
  assert.strictEqual(ownerProfile.reportedCount, 1);
  const times = ownerProfile.activity.map(a => new Date(a.at).getTime());
  assert.deepStrictEqual(times, [...times].sort((a, b) => b - a), 'Activity is newest first');
  assert.ok(ownerProfile.activity.some(a => a.text.includes('Ran "Login works": Failed')));
  assert.strictEqual(store.getMyMembership(project.id).id, ownerMember.id, 'My Profile resolves to the signed-in member');
  console.log('✓ Authored work and recent activity are listed newest first');

  // 3. Status changes are attributed to whoever made them
  store.setFirebaseUser(dev);
  store.updateTask(t1.id, { status: 'In Progress' });
  store.updateTask(t1.id, { status: 'In Review' });
  store.setFirebaseUser(owner);
  const devAfter = store.getMemberProfile(project.id, devMember.id).data;
  assert.deepStrictEqual(devAfter.activity.slice(0, 2).map(a => a.text), [
    'Moved task "Build login form" from In Progress to In Review',
    'Moved task "Build login form" from To Do to In Progress'
  ], 'Newest move first, even within the same millisecond');
  assert.ok(!store.getMemberProfile(project.id, ownerMember.id).data.activity.some(a => a.text.startsWith('Moved task "Build login form" from To Do')),
    'A move is credited only to the member who made it');
  console.log('✓ Task and defect moves are credited to the member who made them');

  // 4. Non-members cannot view the team's profiles
  store.setFirebaseUser(outsider);
  assert.match(store.getMemberProfile(project.id, devMember.id).error, /not a member/);
  assert.strictEqual(store.getMyMembership(project.id), null);
  console.log('✓ Non-members cannot view member profiles');

  console.log('✓ All 4 Team Member Profile tests PASSED!\n');
}
