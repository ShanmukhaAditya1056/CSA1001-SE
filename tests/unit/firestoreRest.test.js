// DevTrack unit tests: Firestore REST client request shapes (mocked network)
import assert from 'node:assert';
import { createFirestoreRest, toValue, fromDocument } from '../../src/firestoreRest.js';

function mockFetch(responder) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, method: init.method, headers: init.headers, body: init.body ? JSON.parse(init.body) : undefined });
    const { status = 200, json = {} } = responder(url, init) || {};
    return { ok: status >= 200 && status < 300, status, json: async () => json };
  };
  return { calls, fetchImpl };
}

export async function runFirestoreRestTests() {
  console.log('\n--- [UNIT TESTS] Firestore REST Client ---');
  const BASE = 'https://firestore.googleapis.com/v1/projects/demo-proj/databases/(default)/documents';

  // 1. Value encoding round-trips the types the app stores
  assert.deepStrictEqual(toValue('x'), { stringValue: 'x' });
  assert.deepStrictEqual(toValue(1735689600000), { integerValue: '1735689600000' });
  assert.deepStrictEqual(toValue(null), { nullValue: null });
  assert.deepStrictEqual(toValue(true), { booleanValue: true });
  assert.deepStrictEqual(fromDocument({ fields: { a: { stringValue: 's' }, n: { integerValue: '42' }, z: { nullValue: null } } }), { a: 's', n: 42, z: null });
  console.log('✓ Field values encode and decode correctly');

  // 2. Requests carry the signed-in user's token and target the right paths
  const { calls, fetchImpl } = mockFetch((url) => {
    if (url.includes('/userDirectory/missing%40x.io')) return { status: 404, json: { error: { status: 'NOT_FOUND' } } };
    if (url.endsWith(':runQuery')) return { json: [{ document: { fields: { id: { stringValue: 'inv-1' } } } }, { readTime: 'now' }] };
    return { json: { fields: { uid: { stringValue: 'u1' } } } };
  });
  const fsr = createFirestoreRest({ projectId: 'demo-proj', getToken: async () => 'ID_TOKEN', fetchImpl });

  assert.strictEqual(await fsr.get('userDirectory', 'missing@x.io'), null, 'Missing documents read as null');
  assert.deepStrictEqual(await fsr.get('userDirectory', 'a@x.io'), { uid: 'u1' });
  assert.strictEqual(calls[1].url, `${BASE}/userDirectory/a%40x.io`);
  assert.strictEqual(calls[1].headers.Authorization, 'Bearer ID_TOKEN');

  await fsr.set('userDirectory', 'a@x.io', { uid: 'u1', photoURL: null });
  assert.strictEqual(calls[2].method, 'PATCH');
  assert.strictEqual(calls[2].url, `${BASE}/userDirectory/a%40x.io`, 'Set overwrites the whole document (no update mask)');
  assert.deepStrictEqual(calls[2].body, { fields: { uid: { stringValue: 'u1' }, photoURL: { nullValue: null } } });

  await fsr.create('invitations', 'inv-1', { status: 'Pending', expiresAtMs: 5 });
  assert.strictEqual(calls[3].method, 'POST');
  assert.strictEqual(calls[3].url, `${BASE}/invitations?documentId=inv-1`, 'Create never overwrites an existing document');

  await fsr.update('invitations', 'inv-1', { status: 'Accepted', respondedAt: 't' });
  assert.strictEqual(calls[4].method, 'PATCH');
  assert.strictEqual(calls[4].url, `${BASE}/invitations/inv-1?updateMask.fieldPaths=status&updateMask.fieldPaths=respondedAt&currentDocument.exists=true`,
    'Update touches only the listed fields, as the security rules require');
  console.log('✓ Reads, overwrites, creates and partial updates use the correct REST requests');

  const rows = await fsr.where('invitations', { inviterId: 'u1', inviteeEmail: 'b@x.io' });
  assert.deepStrictEqual(rows, [{ id: 'inv-1' }], 'Query rows without documents are skipped');
  assert.deepStrictEqual(calls[5].body.structuredQuery, {
    from: [{ collectionId: 'invitations' }],
    where: { compositeFilter: { op: 'AND', filters: [
      { fieldFilter: { field: { fieldPath: 'inviterId' }, op: 'EQUAL', value: { stringValue: 'u1' } } },
      { fieldFilter: { field: { fieldPath: 'inviteeEmail' }, op: 'EQUAL', value: { stringValue: 'b@x.io' } } }
    ] } }
  });
  await fsr.where('invitations', { inviteeEmail: 'b@x.io' });
  assert.ok(calls[6].body.structuredQuery.where.fieldFilter, 'A single condition is sent without a composite filter');
  console.log('✓ Equality queries are built correctly');

  // 3. Errors keep Firestore's status, including the array form runQuery uses
  const failing = createFirestoreRest({
    projectId: 'demo-proj', getToken: async () => 'T',
    fetchImpl: mockFetch((url) => url.endsWith(':runQuery')
      ? { status: 403, json: [{ error: { status: 'PERMISSION_DENIED', message: 'Missing or insufficient permissions.' } }] }
      : { status: 409, json: { error: { status: 'ALREADY_EXISTS', message: 'Document already exists' } } }).fetchImpl
  });
  await assert.rejects(failing.where('invitations', { inviteeEmail: 'x' }), err => err.code === 'permission-denied');
  await assert.rejects(failing.create('invitations', 'dup', {}), err => err.code === 'already-exists');
  console.log('✓ Firestore errors keep their status codes');

  console.log('✓ All 4 Firestore REST Client tests PASSED!\n');
}
