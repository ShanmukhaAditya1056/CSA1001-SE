// DevTrack unit tests: project-scoped team membership, direct adds, and invitations
import assert from 'node:assert';

function makeStorage() {
  const data = {};
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => { data[key] = String(value); },
    removeItem: (key) => { delete data[key]; },
    clear: () => { Object.keys(data).forEach(key => delete data[key]); }
  };
}

export async function runTeamMembershipTests() {
  const local = makeStorage();
  const session = makeStorage();
  global.localStorage = local;
  global.sessionStorage = session;

  const { store } = await import('../../src/store.js');
  store._data = null;
  store.resetData();

  console.log('\n--- [UNIT TESTS] Team Membership, Roles & Project Isolation ---');

  const alice = { uid: 'alice-uid', email: 'alice@example.com', displayName: 'Alice Owner' };
  const bob = { uid: 'bob-uid', email: 'bob@example.com', displayName: 'Bob Developer' };
  const carol = { uid: 'carol-uid', email: 'carol@example.com', displayName: 'Carol Viewer' };
  const normalize = (value) => value.trim().toLowerCase();

  // 1. First signed-in user owns the default workspace
  store.setFirebaseUser(alice);
  const defaultProject = store.getActiveProject();
  assert.ok(defaultProject, 'First user must receive a default project');
  assert.strictEqual(store.getUserRole(defaultProject.id), 'Owner');
  console.log('✓ First user owns the default workspace');

  // 2. A project created by Alice is scoped to Alice only
  const created = store.createProject({
    name: 'Scoped Team Project',
    key: 'TEAM',
    description: 'Project-specific membership test',
    startDate: '2026-11-01',
    endDate: '2026-12-01'
  });
  assert.ok(!created.error, created.error);
  const projectId = created.data.id;
  assert.strictEqual(store.getUserRole(projectId), 'Owner');
  console.log('✓ New project creator is its Owner');

  // 3. Bob signs in on the same device but is not a member of any project yet
  store.setFirebaseUser(bob);
  assert.deepStrictEqual(store.getProjects(), [], 'Uninvited user must not see projects');
  assert.strictEqual(store.getActiveProject(), null, 'Uninvited user must not get an active project');
  console.log('✓ Uninvited registered user cannot access project data');

  // 4. Owner directly adds a registered user to a specific project
  store.setFirebaseUser(alice);
  const added = store.addMember(projectId, 'BOB@example.com', 'Tester');
  assert.ok(!added.error, added.error);
  assert.strictEqual(added.data.role, 'Tester');

  const roster = store.getMembers(projectId);
  const aliceMember = roster.find(m => normalize(m.userEmail) === 'alice@example.com');
  const bobMember = roster.find(m => normalize(m.userEmail) === 'bob@example.com');
  assert.ok(aliceMember && aliceMember.role === 'Owner');
  assert.ok(bobMember && bobMember.role === 'Tester');
  console.log('✓ Registered user added directly to the selected project');

  // 5. Membership is project-scoped, not workspace-wide
  store.setFirebaseUser(bob);
  const bobProjects = store.getProjects();
  assert.strictEqual(bobProjects.length, 1);
  assert.strictEqual(bobProjects[0].id, projectId);
  assert.strictEqual(store.getUserRole(projectId), 'Tester');
  assert.strictEqual(store.getUserRole(defaultProject.id), null);
  console.log('✓ Membership applies only to the selected project');

  // 6. Non-owners cannot add, promote, remove, or invite
  assert.ok(store.addMember(projectId, 'alice@example.com', 'Owner').error, 'Non-owner add must fail');
  assert.ok(store.updateMemberRole(bobMember.id, 'Owner').error, 'Non-owner role change must fail');
  assert.ok(store.removeMember(bobMember.id).error, 'Non-owner removal must fail');
  assert.ok(store.createInvitation(projectId, carol.email, 'Developer').error, 'Non-owner invite must fail');
  console.log('✓ Non-owner team and invitation operations are blocked');

  // 7. Owner can change roles, but the last Owner is protected
  store.setFirebaseUser(alice);
  const promoted = store.updateMemberRole(bobMember.id, 'Developer');
  assert.ok(!promoted.error, promoted.error);
  assert.strictEqual(promoted.data.role, 'Developer');

  assert.ok(store.updateMemberRole(aliceMember.id, 'Developer').error, 'Demoting the last owner must fail');
  assert.ok(store.removeMember(aliceMember.id).error, 'Removing the last owner must fail');
  console.log('✓ Owner role changes work and last-owner protection holds');

  // 8. Firebase UID changes migrate existing membership instead of orphaning it
  store.setFirebaseUser({ uid: 'bob-migrated-uid', email: 'bob@example.com', displayName: 'Bob Developer' });
  assert.strictEqual(store.getUserRole(projectId), 'Developer', 'Membership must survive a UID change');
  assert.ok(store.getProjects().some(p => p.id === projectId), 'Project must remain visible after a UID change');
  console.log('✓ Membership survives Firebase UID migration');

  // 9. Cross-device invitation carries the project roster and adds only after acceptance
  // Carol registered on another device: unknown locally, so she can only be
  // invited with her shared-directory record (what checkUserRegistered returns).
  store.setFirebaseUser(alice);
  assert.match(store.createInvitation(projectId, carol.email, 'Viewer').error, /^User not registered/);
  const carolDirectoryEntry = { id: carol.uid, name: carol.displayName, email: carol.email };
  const invitation = store.createInvitation(projectId, carol.email, 'Viewer', { invitee: carolDirectoryEntry });
  assert.ok(!invitation.error, invitation.error);
  const token = invitation.data.token;

  const secondDevice = makeStorage();
  global.localStorage = secondDevice;
  store._data = null; // simulate a fresh browser with no local project data

  const resolved = store.getInvitationByToken(token);
  assert.ok(resolved, 'Invitation token must resolve on a fresh device');
  assert.strictEqual(resolved.projectId, projectId);

  const preAccept = store.getMembers(projectId);
  assert.ok(preAccept.some(m => normalize(m.userEmail) === 'alice@example.com' && m.role === 'Owner'), 'Inviter must appear as Owner');
  assert.ok(preAccept.some(m => normalize(m.userEmail) === 'bob@example.com' && m.role === 'Developer'), 'Existing roster must be carried in the token');

  session.setItem('pending_invite_token', token);
  store.setFirebaseUser(carol);
  assert.deepStrictEqual(store.getProjects(), [], 'Invitation view alone must not grant membership');

  const accepted = store.acceptInvitation(token);
  assert.ok(!accepted.error, accepted.error);
  assert.strictEqual(accepted.data.membership.role, 'Viewer');

  const finalRoster = store.getMembers(projectId);
  assert.strictEqual(finalRoster.length, 3);
  assert.ok(finalRoster.some(m => normalize(m.userEmail) === 'carol@example.com' && m.role === 'Viewer'));
  assert.deepStrictEqual(store.getProjects().map(p => p.id), [projectId]);
  console.log('✓ Cross-device invitation shows the roster and joins only after acceptance');

  console.log('✓ All 9 Team Membership, Roles & Isolation tests PASSED!\n');
}

if (process.argv[1] && process.argv[1].includes('teamMembership.test.js')) {
  runTeamMembershipTests();
}
