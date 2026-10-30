// DevTrack unit tests: verified-only, real-time invitation delivery between devices
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

// In-memory stand-in for the Firestore directory: one shared database that
// pushes changes to every subscriber synchronously, like onSnapshot.
function makeSharedBackend() {
  const users = new Map();
  const invitations = new Map();
  const listeners = new Set();
  const notify = () => listeners.forEach(fn => fn());
  const watch = (filter, onChange) => {
    const emit = () => onChange([...invitations.values()].filter(filter).map(inv => ({ ...inv })));
    listeners.add(emit);
    emit();
    return () => listeners.delete(emit);
  };
  return {
    remote: true,
    users,
    invitations,
    async syncUser(user) { users.set(user.email, { id: user.id, name: user.name, email: user.email }); },
    async findUserByEmail(email) { return users.get(email) || null; },
    async findPendingInvitation(projectId, email, inviterId) {
      return [...invitations.values()].find(i => i.projectId === projectId && i.inviteeEmail === email && i.inviterId === inviterId && i.status === 'Pending') || null;
    },
    async createInvitation(inv) { invitations.set(inv.id, { ...inv }); notify(); },
    async updateInvitationStatus(id, status) {
      const inv = invitations.get(id);
      if (inv) { inv.status = status; inv.respondedAt = new Date().toISOString(); notify(); }
    },
    subscribeInbox(email, onChange) { return watch(i => i.inviteeEmail === email, onChange); },
    subscribeSent(inviterId, onChange) { return watch(i => i.inviterId === inviterId, onChange); }
  };
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

export async function runRealtimeInvitationTests() {
  console.log('\n--- [UNIT TESTS] Verified-Only Real-Time Team Invitations ---');

  global.localStorage = makeStorage();
  global.sessionStorage = makeStorage();
  const { store } = await import('../../src/store.js');
  const directory = await import('../../src/directory.js');
  const { UNREGISTERED_USER_MESSAGE } = await import('../../src/rules.js');

  const backend = makeSharedBackend();
  directory.setDirectoryBackend(backend);

  const deviceA = makeStorage(); // Owner's browser
  const deviceB = makeStorage(); // Recipient's browser
  const useDevice = (storage) => { directory.stopInvitationSync(); global.localStorage = storage; store._data = null; };

  const alice = { uid: 'alice-uid', email: 'alice@devtrack.io', displayName: 'Alice Owner' };
  const carol = { uid: 'carol-uid', email: 'carol@devtrack.io', displayName: 'Carol Tester' };
  const mallory = { uid: 'mallory-uid', email: 'mallory@devtrack.io', displayName: 'Mallory' };

  // Carol and Mallory sign up on their own devices, which registers them in the shared directory.
  useDevice(deviceB);
  store.resetData();
  for (const person of [mallory, carol]) {
    store.setFirebaseUser(person);
    directory.startInvitationSync(store.currentUser);
    await flush();
  }
  assert.deepStrictEqual((await directory.checkUserRegistered('CAROL@devtrack.io')).user.id, carol.uid);
  assert.deepStrictEqual(await directory.checkUserRegistered('nobody@devtrack.io'), { exists: false });
  console.log('✓ Sign-in syncs the account into the shared registry; checkUserRegistered resolves it');

  // 1. Owner cannot invite an unregistered email; nothing is created
  useDevice(deviceA);
  store.resetData();
  store.setFirebaseUser(alice);
  const project = store.createProject({ name: 'Rover OS', key: 'ROVER' }).data;
  const unreg = await directory.sendProjectInvitation(project.id, 'nobody@devtrack.io', 'Developer');
  assert.strictEqual(unreg.error, UNREGISTERED_USER_MESSAGE);
  assert.strictEqual(backend.invitations.size, 0, 'No shared invitation for an unregistered email');
  assert.strictEqual(store.getProjectInvitations(project.id).length, 0, 'No local invitation either');
  assert.match((await directory.sendProjectInvitation(project.id, alice.email, 'Developer')).error, /cannot invite yourself/);
  console.log('✓ Unregistered and self invitations rejected with no records created');

  // 2. Registered recipient receives the invitation in real time, no link needed
  useDevice(deviceB);
  store.setFirebaseUser(carol);
  const received = [];
  directory.startInvitationSync(store.currentUser, { onNewInvitations: invs => received.push(...invs) });
  await flush();
  assert.strictEqual(received.length, 0);

  global.localStorage = deviceA; store._data = null; // Alice acts on her device while Carol's listener stays live
  store.setFirebaseUser(alice);
  const sent = await directory.sendProjectInvitation(project.id, 'carol@devtrack.io', 'Tester');
  assert.ok(!sent.error, sent.error);
  assert.strictEqual(sent.data.inviteeId, carol.uid);
  assert.strictEqual(received.length, 1, 'Recipient listener fires as soon as the invitation is sent');
  assert.strictEqual(received[0].projectName, 'Rover OS');
  assert.strictEqual(received[0].role, 'Tester');
  assert.strictEqual((await directory.sendProjectInvitation(project.id, 'carol@devtrack.io', 'Tester')).error,
    'A pending invitation has already been sent to this user.');

  useDevice(deviceB); // Carol's device merges the delivered invitation into her inbox
  store.setFirebaseUser(carol);
  directory.startInvitationSync(store.currentUser);
  await flush();
  assert.strictEqual(store.getPendingInvitationsCount(carol.email), 1, 'Inbox badge count reflects the delivered invitation');
  assert.deepStrictEqual(store.getProjects(), [], 'Receiving an invitation grants no access');
  console.log('✓ Registered recipient receives the invitation in their inbox in real time');

  // 3. Only the intended recipient can accept
  store.setFirebaseUser(mallory);
  const stolen = await directory.respondToInvitation(sent.data.id, 'accept');
  assert.ok(stolen.error, 'A different account must not accept');
  assert.strictEqual(backend.invitations.get(sent.data.id).status, 'Pending', 'Shared record unchanged');
  console.log('✓ Only the intended registered recipient can accept');

  // 4. Accept grants membership and switches project; the owner sees it live
  store.setFirebaseUser(carol);
  const accepted = await directory.respondToInvitation(sent.data.id, 'accept');
  assert.ok(!accepted.error, accepted.error);
  assert.strictEqual(backend.invitations.get(sent.data.id).status, 'Accepted');
  assert.strictEqual(store.getUserRole(project.id), 'Tester');
  assert.strictEqual(store.getActiveProjectId(), project.id, 'Active project switches to the joined project');

  useDevice(deviceA);
  store.setFirebaseUser(alice);
  const responses = [];
  directory.startInvitationSync(store.currentUser, { onInvitationResponse: inv => responses.push(inv) });
  await flush();
  assert.strictEqual(responses.length, 1);
  assert.strictEqual(responses[0].status, 'Accepted');
  assert.ok(store.getMembers(project.id).some(m => m.userEmail === carol.email && m.role === 'Tester'), 'Owner roster shows the new member');
  console.log('✓ Accepted invitation creates active membership on both devices');

  // 5. Decline creates no membership
  const project2 = store.createProject({ name: 'Telemetry', key: 'TLM' }).data;
  const second = await directory.sendProjectInvitation(project2.id, carol.email, 'Developer');
  assert.ok(!second.error, second.error);
  useDevice(deviceB);
  store.setFirebaseUser(carol);
  directory.startInvitationSync(store.currentUser);
  await flush();
  const declined = await directory.respondToInvitation(second.data.id, 'decline');
  assert.ok(!declined.error, declined.error);
  assert.strictEqual(backend.invitations.get(second.data.id).status, 'Declined');
  assert.strictEqual(store.getUserRole(project2.id), null);

  useDevice(deviceA);
  store.setFirebaseUser(alice);
  directory.startInvitationSync(store.currentUser);
  await flush();
  assert.ok(!store.getMembers(project2.id).some(m => m.userEmail === carol.email), 'Declined invitation adds no member');
  assert.strictEqual(store.getProjectInvitations(project2.id)[0].status, 'Declined');
  directory.stopInvitationSync();
  console.log('✓ Declined invitation creates no membership');

  console.log('✓ All 6 Verified-Only Real-Time Invitation tests PASSED!\n');
}
