// DevTrack API Integration Tests: Security, Rate Limiting & Project Isolation (gemini.md Section 10 & 11)
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

async function login(email, password = 'password123') {
  const res = await request('/api/v1/auth/login', { method: 'POST', body: { email, password } });
  assert.strictEqual(res.status, 200, `Login failed for ${email}`);
  return res.body.data.token;
}

export async function runApiSecurityTests() {
  console.log('\n--- [INTEGRATION TESTS] API Security, Rate Limiting & Project Isolation ---');

  // Reset database before tests
  await request('/api/v1/test/reset', { method: 'POST' });

  // 1. Security Headers Verification
  console.log('Testing: Security Headers on HTTP responses...');
  const healthRes = await request('/api/health');
  assert.strictEqual(healthRes.status, 200);
  assert.strictEqual(healthRes.headers.get('x-content-type-options'), 'nosniff', 'Must include X-Content-Type-Options: nosniff');
  assert.strictEqual(healthRes.headers.get('x-frame-options'), 'DENY', 'Must include X-Frame-Options: DENY');
  assert.ok(healthRes.headers.get('strict-transport-security'), 'Must include Strict-Transport-Security');
  assert.ok(healthRes.headers.get('content-security-policy'), 'Must include Content-Security-Policy');
  console.log('✓ Strict security headers confirmed on API endpoints');

  // 2. Authentication Rate Limiting
  console.log('Testing: Auth Rate Limiting (Brute Force Protection)...');
  let rateLimited = false;
  // Send 12 rapid login attempts
  for (let i = 0; i < 12; i++) {
    const res = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { email: 'wrong@devtrack.io', password: 'badpassword' }
    });
    if (res.status === 429) {
      rateLimited = true;
      assert.strictEqual(res.body.error.code, 'RATE_LIMIT_EXCEEDED');
      assert.ok(res.headers.get('retry-after'), 'Must include Retry-After header');
      break;
    }
  }
  assert.strictEqual(rateLimited, true, 'Rate limiter must trigger HTTP 429 Too Many Requests after threshold');
  console.log('✓ Rate limiter successfully blocked rapid auth attempts with HTTP 429');

  // Reset rate limiter & db for subsequent tests
  await request('/api/v1/test/reset', { method: 'POST' });

  // Seeded accounts authenticate with real session tokens
  const ownerToken = await login('lead@devtrack.io');
  const devToken = await login('dev@devtrack.io');
  const testerToken = await login('qa@devtrack.io');
  const viewerToken = await login('viewer@devtrack.io');

  // 3. Project Isolation & Access Control
  console.log('Testing: Unauthenticated Access Denial (401)...');
  const unauthRes = await request('/api/v1/projects/proj-001/requirements');
  assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request must return 401');
  // A raw user id or email is not a credential
  const spoofRes = await request('/api/v1/projects/proj-001/requirements', { headers: { 'Authorization': 'Bearer usr-admin' } });
  assert.strictEqual(spoofRes.status, 401, 'Bearer <userId> must not authenticate');
  const spoofEmailRes = await request('/api/v1/projects/proj-001/requirements', { headers: { 'Authorization': 'Bearer lead@devtrack.io' } });
  assert.strictEqual(spoofEmailRes.status, 401, 'Bearer <email> must not authenticate');
  console.log('✓ Unauthenticated and spoofed-identity access denied with 401 Unauthorized');

  console.log('Testing: Cross-Project Access Denial (403 for Non-Member)...');
  // Register an outsider user
  const outsiderRes = await request('/api/v1/auth/register', {
    method: 'POST',
    body: { name: 'Outsider User', email: 'outsider@othercorp.com', password: 'password123' }
  });
  assert.strictEqual(outsiderRes.status, 201);
  assert.strictEqual(outsiderRes.body.data.password, undefined, 'Password must never be returned');
  const outsiderToken = outsiderRes.body.data.token;

  // Outsider attempts to access proj-001
  const crossProjectRes = await request('/api/v1/projects/proj-001/requirements', {
    headers: { 'Authorization': `Bearer ${outsiderToken}` }
  });
  assert.strictEqual(crossProjectRes.status, 403, 'Cross-project access must return 403 Forbidden');
  assert.strictEqual(crossProjectRes.body.error.code, 'FORBIDDEN');
  console.log('✓ Non-member cross-project access blocked with 403 Forbidden');

  // 4. Viewer Role Write Denial
  console.log('Testing: Viewer Role Write Denial (Read-Only Enforcement)...');
  const viewerWriteRes = await request('/api/v1/projects/proj-001/requirements', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${viewerToken}` },
    body: { title: 'Unauthorized Viewer Requirement' }
  });
  assert.strictEqual(viewerWriteRes.status, 403, 'Viewer write operation must return 403');
  assert.strictEqual(viewerWriteRes.body.error.code, 'FORBIDDEN');
  // Role matrix: Testers cannot author requirements, Developers cannot cut releases
  const testerReqRes = await request('/api/v1/projects/proj-001/requirements', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${testerToken}` },
    body: { title: 'Tester-authored requirement', priority: 'Must' }
  });
  assert.strictEqual(testerReqRes.status, 403, 'Tester requirement authoring must return 403');
  const devReleaseRes = await request('/api/v1/projects/proj-001/releases', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${devToken}` },
    body: { name: 'v9.9.9 — Unapproved' }
  });
  assert.strictEqual(devReleaseRes.status, 403, 'Developer cutting a release must return 403');
  const badPriorityRes = await request('/api/v1/projects/proj-001/requirements', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${devToken}` },
    body: { title: 'Bad priority', priority: 'Optional' }
  });
  assert.strictEqual(badPriorityRes.status, 400, 'Invalid MoSCoW priority must return 400');
  console.log('✓ Viewer role write operation blocked with 403 Forbidden; role matrix enforced');

  // 5. Cross-Project Referential Integrity Enforcement
  console.log('Testing: Cross-Project Link Prevention (Referential Integrity)...');
  const invalidLinkRes = await request('/api/v1/projects/proj-001/tasks', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${devToken}` },
    body: {
      title: 'Task linked to non-existent or foreign requirement',
      requirementIds: ['foreign-req-999']
    }
  });
  assert.strictEqual(invalidLinkRes.status, 400, 'Cross-project requirement link must return 400 Bad Request');
  assert.strictEqual(invalidLinkRes.body.error.code, 'INVALID_RELATION');
  const invalidBugLinkRes = await request('/api/v1/projects/proj-001/bugs', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${testerToken}` },
    body: { title: 'Bug linked to foreign requirement', severity: 'High', relatedRequirementId: 'foreign-req-999' }
  });
  assert.strictEqual(invalidBugLinkRes.status, 400, 'Cross-project bug link must return 400');
  const passedRunBugRes = await request('/api/v1/projects/proj-001/bugs', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${testerToken}` },
    body: { title: 'Bug against a passing run', severity: 'Low', relatedTestRunId: 'tr-001' }
  });
  assert.strictEqual(passedRunBugRes.status, 400, 'Defects may only link to Failed test runs');
  console.log('✓ Cross-project relational corruption blocked with 400 Bad Request');

  // 6. Verified User Team Member Enforcement
  console.log('Testing: Team Member Addition - Verified Account Requirement...');
  // Try adding email that does not have an account
  const unverifiedAddRes = await request('/api/v1/projects/proj-001/members', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${ownerToken}` },
    body: { email: 'nobody@nowhere.com', role: 'Developer' }
  });
  assert.strictEqual(unverifiedAddRes.status, 404, 'Adding unverified account must return 404');
  assert.strictEqual(unverifiedAddRes.body.error.code, 'USER_NOT_FOUND');
  assert.strictEqual(unverifiedAddRes.body.error.message, 'User not registered. The user must first create an account in DevTrack before they can be added or invited to a team.');
  console.log('✓ Adding unverified non-registered email rejected with 404');

  // Add existing verified user (outsider registered earlier)
  const verifiedAddRes = await request('/api/v1/projects/proj-001/members', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${ownerToken}` },
    body: { email: 'outsider@othercorp.com', role: 'Developer' }
  });
  assert.strictEqual(verifiedAddRes.status, 201, 'Adding registered user must return 201 Created');
  console.log('✓ Registered verified user successfully added to team');

  // Duplicate addition check
  const duplicateAddRes = await request('/api/v1/projects/proj-001/members', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${ownerToken}` },
    body: { email: 'outsider@othercorp.com', role: 'Developer' }
  });
  assert.strictEqual(duplicateAddRes.status, 409, 'Duplicate member addition must return 409 Conflict');
  console.log('✓ Duplicate team member addition rejected with 409 Conflict');

  // Only project owners may add team members (Developer must be denied)
  const nonOwnerAddRes = await request('/api/v1/projects/proj-001/members', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${devToken}` },
    body: { email: 'outsider@othercorp.com', role: 'Developer' }
  });
  assert.strictEqual(nonOwnerAddRes.status, 403, 'Non-owner adding a member must return 403');
  assert.strictEqual(nonOwnerAddRes.body.error.code, 'FORBIDDEN');
  console.log('✓ Non-owner team member addition blocked with 403 Forbidden');

  // 7. Project Invitations Security, Inbox & Accept/Decline Workflow
  console.log('Testing: Project Invitations Security, Central Inbox & Accept/Decline Flow...');
  // A. Non-owner cannot create invitation (e.g. usr-dev or usr-viewer)
  const nonOwnerInviteRes = await request('/api/v1/projects/proj-001/invitations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${devToken}` },
    body: { email: 'invitee@secure.io', role: 'Tester' }
  });
  assert.strictEqual(nonOwnerInviteRes.status, 403, 'Non-owner inviting must return 403');
  assert.strictEqual(nonOwnerInviteRes.body.error.code, 'FORBIDDEN');

  // A2. Inviting an email with no DevTrack account is rejected outright
  const unregInviteRes = await request('/api/v1/projects/proj-001/invitations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${ownerToken}` },
    body: { email: 'invitee@secure.io', role: 'Tester' }
  });
  assert.strictEqual(unregInviteRes.status, 404, 'Inviting an unregistered email must return 404');
  assert.strictEqual(unregInviteRes.body.error.message, 'User not registered. The user must first create an account in DevTrack before they can be added or invited to a team.');
  const pendingBeforeSignup = await request('/api/v1/projects/proj-001/invitations', { headers: { 'Authorization': `Bearer ${ownerToken}` } });
  assert.strictEqual(pendingBeforeSignup.body.data.length, 0, 'No invitation may be created for an unregistered email');

  // A3. Owner cannot invite themselves
  const selfInviteRes = await request('/api/v1/projects/proj-001/invitations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${ownerToken}` },
    body: { email: 'lead@devtrack.io', role: 'Tester' }
  });
  assert.strictEqual(selfInviteRes.status, 400, 'Self-invitation must return 400');

  // Invitee creates their DevTrack account first
  const inviteeRegRes = await request('/api/v1/auth/register', {
    method: 'POST',
    body: { name: 'Invitee User', email: 'invitee@secure.io', password: 'password123' }
  });
  assert.strictEqual(inviteeRegRes.status, 201);
  const inviteeToken = inviteeRegRes.body.data.token;

  const lookupRes = await request('/api/v1/users/lookup?email=INVITEE@secure.io', { headers: { 'Authorization': `Bearer ${ownerToken}` } });
  assert.strictEqual(lookupRes.body.data.exists, true, 'checkUserRegistered finds the new account');
  const missingLookup = await request('/api/v1/users/lookup?email=ghost@secure.io', { headers: { 'Authorization': `Bearer ${ownerToken}` } });
  assert.strictEqual(missingLookup.body.data.exists, false);

  // B. Owner creates invitation for invitee@secure.io
  const inviteRes = await request('/api/v1/projects/proj-001/invitations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${ownerToken}` },
    body: { email: 'invitee@secure.io', role: 'Tester' }
  });
  assert.strictEqual(inviteRes.status, 201, 'Owner creating invitation must return 201');
  const invitation = inviteRes.body.data;
  assert.strictEqual(invitation.status, 'Pending');
  assert.strictEqual(invitation.role, 'Tester');
  assert.ok(invitation.token, 'Must return secure token');
  assert.strictEqual(invitation.inviteeId, inviteeRegRes.body.data.id, 'Invitation is addressed to the registered account');

  // C. Duplicate pending invitation rejected
  const dupInviteRes = await request('/api/v1/projects/proj-001/invitations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${ownerToken}` },
    body: { email: 'invitee@secure.io', role: 'Tester' }
  });
  assert.strictEqual(dupInviteRes.status, 409, 'Duplicate pending invitation must return 409 Conflict');

  // D. Public/Authenticated Token Preview
  const tokenPreviewRes = await request(`/api/v1/invitations/token/${invitation.token}`);
  assert.strictEqual(tokenPreviewRes.status, 200);
  assert.strictEqual(tokenPreviewRes.body.data.projectKey, 'DEV');
  assert.strictEqual(tokenPreviewRes.body.data.role, 'Tester');

  // E. Central In-App Inbox retrieval
  const myInvsRes = await request('/api/v1/invitations/my', {
    headers: { 'Authorization': `Bearer ${inviteeToken}` }
  });
  assert.strictEqual(myInvsRes.status, 200);
  assert.ok(myInvsRes.body.data.some(i => i.id === invitation.id && i.status === 'Pending'));

  // F. Identity Mismatch Denial (Outsider tries to accept invitee's invitation)
  const mismatchAcceptRes = await request(`/api/v1/invitations/${invitation.id}/accept`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${outsiderToken}` }
  });
  assert.strictEqual(mismatchAcceptRes.status, 403, 'Accepting invitation with wrong identity must return 403 Forbidden');
  assert.strictEqual(mismatchAcceptRes.body.error.code, 'FORBIDDEN');

  // G. Decline Flow Verification (Decline must NOT create membership)
  const declineRes = await request(`/api/v1/invitations/${invitation.id}/decline`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${inviteeToken}` }
  });
  assert.strictEqual(declineRes.status, 200, 'Declining invitation must succeed');
  assert.strictEqual(declineRes.body.data.invitation.status, 'Declined');

  // Verify invitee is NOT a member after declining
  const membersAfterDecline = await request('/api/v1/projects/proj-001/members', {
    headers: { 'Authorization': `Bearer ${ownerToken}` }
  });
  assert.strictEqual(
    membersAfterDecline.body.data.some(m => m.userEmail.toLowerCase() === 'invitee@secure.io'),
    false,
    'Declining must NOT add user to project members'
  );

  // H. Accept Flow Verification (Create new invite, accept, verify membership created)
  const secondInviteRes = await request('/api/v1/projects/proj-001/invitations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${ownerToken}` },
    body: { email: 'invitee@secure.io', role: 'Developer' }
  });
  assert.strictEqual(secondInviteRes.status, 201);
  const secondInv = secondInviteRes.body.data;

  const acceptRes = await request(`/api/v1/invitations/${secondInv.id}/accept`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${inviteeToken}` }
  });
  assert.strictEqual(acceptRes.status, 200, 'Accepting invitation must succeed');
  assert.strictEqual(acceptRes.body.data.membership.role, 'Developer');

  // Verify invitee IS now an active member
  const membersAfterAccept = await request('/api/v1/projects/proj-001/members', {
    headers: { 'Authorization': `Bearer ${ownerToken}` }
  });
  assert.ok(
    membersAfterAccept.body.data.some(m => m.userEmail.toLowerCase() === 'invitee@secure.io' && m.role === 'Developer'),
    'Accepting invitation must add user to project members'
  );

  // J. Forged self-describing token (attacker grants themselves Owner) is rejected
  const forgedPayload = Buffer.from(JSON.stringify({
    id: 'inv-forged', pid: 'proj-001', pname: 'DevTrack Platform', pkey: 'DEV',
    iname: 'Lead Architect', iemail: 'lead@devtrack.io', email: 'outsider@othercorp.com',
    role: 'Owner', exp: new Date(Date.now() + 86400000).toISOString(), iat: new Date().toISOString()
  })).toString('base64url');
  for (const forged of [`inv_${forgedPayload}`, `inv_${forgedPayload}.invalidsignature`]) {
    const forgedRes = await request(`/api/v1/invitations/${forged}/accept`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${outsiderToken}` }
    });
    assert.strictEqual(forgedRes.status, 404, 'Unsigned or tampered invitation tokens must be rejected');
  }

  // I. Cannot re-accept already accepted invitation
  const reAcceptRes = await request(`/api/v1/invitations/${secondInv.id}/accept`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${inviteeToken}` }
  });
  assert.strictEqual(reAcceptRes.status, 400, 'Re-accepting non-pending invitation must return 400');

  const auditRes = await request('/api/v1/projects/proj-001/audit', { headers: { 'Authorization': `Bearer ${viewerToken}` } });
  assert.strictEqual(auditRes.status, 200);
  assert.strictEqual(auditRes.body.data.chainValid, true, 'Audit hash chain must verify');
  assert.ok(auditRes.body.data.entries.some(e => e.type === 'INVITATION_ACCEPTED'), 'Membership changes must be audited');

  console.log('✓ Project invitations security, identity verification, inbox & accept/decline flows confirmed');

  console.log('✓ All 7 API Security & Project Isolation integration tests PASSED!\n');
}

