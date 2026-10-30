// Client-side invitation and registered users policy unit tests
import assert from 'node:assert';

export async function runClientInviteFlowTests() {
  // Mock localStorage and sessionStorage for Node.js environment
  const localData = {};
  global.localStorage = {
    getItem: (key) => localData[key] || null,
    setItem: (key, val) => { localData[key] = String(val); },
    removeItem: (key) => { delete localData[key]; },
    clear: () => { Object.keys(localData).forEach(k => delete localData[k]); }
  };

  const sessionData = {};
  global.sessionStorage = {
    getItem: (key) => sessionData[key] || null,
    setItem: (key, val) => { sessionData[key] = String(val); },
    removeItem: (key) => { delete sessionData[key]; },
    clear: () => { Object.keys(sessionData).forEach(k => delete sessionData[k]); }
  };

  const { store, encodeInviteToken, decodeInviteToken } = await import('../../src/store.js');

  console.log('\n--- [UNIT TESTS] Client Store: Invite Links & Registered Users Policy ---');

  // Test 1: Self-describing token round-trip
  console.log('Testing: Self-describing token round trip...');
  const invitePayload = {
    id: 'inv-test01',
    projectId: 'proj-001',
    projectName: 'DevTrack Platform',
    projectKey: 'DEV',
    projectDesc: 'Software lifecycle management',
    inviterName: 'Lead Dev',
    inviterEmail: 'lead@devtrack.io',
    inviteeEmail: 'newdev@company.com',
    role: 'Developer',
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    createdAt: new Date().toISOString()
  };
  const token = encodeInviteToken(invitePayload);
  assert.ok(token.startsWith('inv_'), 'Token must start with inv_');
  const decoded = decodeInviteToken(token);
  assert.strictEqual(decoded.id, invitePayload.id);
  assert.strictEqual(decoded.projectId, invitePayload.projectId);
  assert.strictEqual(decoded.inviteeEmail, invitePayload.inviteeEmail);
  assert.strictEqual(decoded.role, 'Developer');
  console.log('✓ Self-describing token encoding/decoding confirmed');

  // Reset store
  store.resetData();

  // Test 2: Project creator logs in
  console.log('Testing: Workspace Creator registration and project ownership...');
  const creator = store.register('Alice Owner', 'alice@company.com', 'Pass123!');
  assert.strictEqual(creator.data.email, 'alice@company.com');
  const activeProjId = store.getActiveProjectId();
  const aliceRole = store.getUserRole(activeProjId);
  assert.strictEqual(aliceRole, 'Owner');
  console.log('✓ Initial workspace creator assigned Owner role');

  // Test 3: Attempting to add an unregistered user directly via addMember must fail
  console.log('Testing: Reject adding unregistered user to team...');
  const addUnregResult = store.addMember(activeProjId, 'unregistered@company.com', 'Developer');
  assert.ok(addUnregResult.error, 'Adding unregistered user must fail');
  assert.match(addUnregResult.error, /^User not registered\. The user must first create an account in DevTrack/);
  console.log('✓ Direct addition of unregistered email blocked');

  // Test 4: Inviting an unregistered email is rejected; once Bob signs up, the invite is created
  console.log('Testing: Unregistered invite rejected, registered invite created...');
  const unregInvite = store.createInvitation(activeProjId, 'bob@company.com', 'Developer');
  assert.match(unregInvite.error || '', /^User not registered/, 'Invitation to an unregistered email must fail');
  assert.strictEqual(store.getProjectInvitations(activeProjId).length, 0, 'No invitation record may be created');

  const bob = store.register('Bob Developer', 'bob@company.com', 'SecurePass123!');
  assert.strictEqual(bob.data.email, 'bob@company.com');
  // Bob must NOT be automatically made an Owner of Alice's workspace
  assert.strictEqual(store.getUserRole(activeProjId), null, 'A new account must not be auto-assigned Owner');
  store.login('alice@company.com', 'Pass123!');

  assert.match(store.createInvitation(activeProjId, 'alice@company.com', 'Developer').error, /cannot invite yourself/);
  const invResult = store.createInvitation(activeProjId, 'bob@company.com', 'Developer');
  assert.ok(!invResult.error, 'Invitation creation failed: ' + invResult.error);
  const createdInv = invResult.data;
  assert.ok(createdInv.token.startsWith('inv_'));
  assert.strictEqual(createdInv.inviteeId, bob.data.id, 'Invitation is addressed to the registered account');
  assert.strictEqual(store.createInvitation(activeProjId, 'bob@company.com', 'Tester').error, 'A pending invitation has already been sent to this user.');
  console.log('✓ Secure invitation dispatched with token:', createdInv.token.slice(0, 25) + '...');

  // Test 5: Simulating Device B (fresh browser where store has no local record of this invitation)
  console.log('Testing: Cross-device token resolution on new browser...');
  const deviceBLocalData = {};
  global.localStorage = {
    getItem: (key) => deviceBLocalData[key] || null,
    setItem: (key, val) => { deviceBLocalData[key] = String(val); },
    removeItem: (key) => { delete deviceBLocalData[key]; },
    clear: () => { Object.keys(deviceBLocalData).forEach(k => delete deviceBLocalData[k]); }
  };
  // Force store reload with new empty device B localStorage
  store._data = null;
  const resolvedOnDeviceB = store.getInvitationByToken(createdInv.token);
  assert.ok(resolvedOnDeviceB, 'Token must resolve on a fresh device without shared DB');
  assert.strictEqual(resolvedOnDeviceB.inviteeEmail, 'bob@company.com');
  assert.strictEqual(resolvedOnDeviceB.role, 'Developer');
  console.log('✓ Cross-device token decoded and resolved on independent device');

  // Test 6: Bob opens invite without signing up and tries to accept -> MUST FAIL
  console.log('Testing: Unauthenticated / unregistered accept attempt blocked...');
  const acceptUnauth = store.acceptInvitation(createdInv.token);
  assert.ok(acceptUnauth.error, 'Unauthenticated accept must be blocked');
  console.log('✓ Unauthenticated accept rejected');

  // Test 7: Bob signs in on Device B; viewing the invitation grants nothing yet
  console.log('Testing: Bob signs in on Device B...');
  sessionStorage.setItem('pending_invite_token', createdInv.token);
  store.setFirebaseUser({ uid: bob.data.id, email: 'bob@company.com', displayName: 'Bob Developer' });
  assert.strictEqual(store.getUserRole(activeProjId), null, 'Invitee must not be a member before accepting');
  console.log('✓ Invitee signed in without illegitimate Owner auto-assignment');

  // Test 8: Wrong account tries to accept Bob\'s invite -> MUST FAIL
  console.log('Testing: Account mismatch rejection...');
  store.setFirebaseUser({ uid: 'usr-charlie', email: 'charlie@company.com', displayName: 'Charlie' });
  const wrongAccountAccept = store.acceptInvitation(createdInv.token);
  assert.ok(wrongAccountAccept.error);
  assert.match(wrongAccountAccept.error, /This invitation was issued to/);
  console.log('✓ Account mismatch properly rejected');

  // Test 9: Bob accepts the invitation -> MUST SUCCEED
  console.log('Testing: Bob accepts valid invitation...');
  store.setFirebaseUser({ uid: bob.data.id, email: 'bob@company.com', displayName: 'Bob Developer' });
  const acceptResult = store.acceptInvitation(createdInv.token);
  assert.ok(!acceptResult.error, 'Bob accept failed: ' + acceptResult.error);
  assert.strictEqual(acceptResult.data.membership.role, 'Developer');
  assert.strictEqual(acceptResult.data.membership.userEmail, 'bob@company.com');
  assert.strictEqual(store.getUserRole(activeProjId), 'Developer');
  console.log('✓ Bob successfully joined project with assigned Developer role');

  // Test 10: Duplicate accept must be rejected
  console.log('Testing: Duplicate accept rejected...');
  const dupAccept = store.acceptInvitation(createdInv.token);
  assert.ok(dupAccept.error);
  assert.match(dupAccept.error, /already been accepted|already a member/);
  console.log('✓ Duplicate membership accept blocked');

  console.log('✓ All 10 Client Invitation & Membership tests PASSED!\n');
}

// Self-executing if run directly
if (process.argv[1] && process.argv[1].includes('clientInviteFlow.test.js')) {
  runClientInviteFlowTests();
}
