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

  // 3. Project Isolation & Access Control
  console.log('Testing: Unauthenticated Access Denial (401)...');
  const unauthRes = await request('/api/v1/projects/proj-001/requirements');
  assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request must return 401');
  console.log('✓ Unauthenticated access denied with 401 Unauthorized');

  console.log('Testing: Cross-Project Access Denial (403 for Non-Member)...');
  // Register an outsider user
  const outsiderRes = await request('/api/v1/auth/register', {
    method: 'POST',
    body: { name: 'Outsider User', email: 'outsider@othercorp.com', password: 'password123' }
  });
  assert.strictEqual(outsiderRes.status, 201);
  const outsiderToken = outsiderRes.body.data.id;

  // Outsider attempts to access proj-001
  const crossProjectRes = await request('/api/v1/projects/proj-001/requirements', {
    headers: { 'Authorization': `Bearer ${outsiderToken}` }
  });
  assert.strictEqual(crossProjectRes.status, 403, 'Cross-project access must return 403 Forbidden');
  assert.strictEqual(crossProjectRes.body.error.code, 'FORBIDDEN');
  console.log('✓ Non-member cross-project access blocked with 403 Forbidden');

  // 4. Viewer Role Write Denial
  console.log('Testing: Viewer Role Write Denial (Read-Only Enforcement)...');
  const viewerToken = 'usr-viewer'; // seeded with Viewer role on proj-001
  const viewerWriteRes = await request('/api/v1/projects/proj-001/requirements', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${viewerToken}` },
    body: { title: 'Unauthorized Viewer Requirement' }
  });
  assert.strictEqual(viewerWriteRes.status, 403, 'Viewer write operation must return 403');
  assert.strictEqual(viewerWriteRes.body.error.code, 'FORBIDDEN');
  console.log('✓ Viewer role write operation blocked with 403 Forbidden');

  // 5. Cross-Project Referential Integrity Enforcement
  console.log('Testing: Cross-Project Link Prevention (Referential Integrity)...');
  const devToken = 'usr-dev'; // Developer on proj-001
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
  console.log('✓ Cross-project relational corruption blocked with 400 Bad Request');

  // 6. Verified User Team Member Enforcement
  console.log('Testing: Team Member Addition - Verified Account Requirement...');
  const ownerToken = 'usr-admin';
  // Try adding email that does not have an account
  const unverifiedAddRes = await request('/api/v1/projects/proj-001/members', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${ownerToken}` },
    body: { email: 'nobody@nowhere.com', role: 'Developer' }
  });
  assert.strictEqual(unverifiedAddRes.status, 404, 'Adding unverified account must return 404');
  assert.strictEqual(unverifiedAddRes.body.error.code, 'USER_NOT_FOUND');
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

  console.log('✓ All 6 API Security & Project Isolation integration tests PASSED!\n');
}
