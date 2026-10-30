// Minimal Firestore REST client. Plain HTTPS requests get through networks and
// security software that break the SDK's long-lived WebChannel connection.
// Pure module (no SDK imports) so it can be unit-tested in Node.

const STATUS_TO_CODE = {
  PERMISSION_DENIED: 'permission-denied',
  UNAUTHENTICATED: 'unauthenticated',
  NOT_FOUND: 'not-found',
  ALREADY_EXISTS: 'already-exists',
  FAILED_PRECONDITION: 'failed-precondition',
  INVALID_ARGUMENT: 'invalid-argument',
  UNAVAILABLE: 'unavailable'
};

export function toValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  return { stringValue: String(v) };
}

export function fromValue(v = {}) {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  return null;
}

export const toFields = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, toValue(v)]));
export const fromDocument = (docJson) => Object.fromEntries(Object.entries(docJson?.fields || {}).map(([k, v]) => [k, fromValue(v)]));

export function createFirestoreRest({ projectId, getToken, fetchImpl = (...args) => fetch(...args) }) {
  const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

  async function request(path, { method = 'GET', body, allowNotFound = false } = {}) {
    const token = await getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetchImpl(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (res.status === 404 && allowNotFound) return null;
    const json = await res.json().catch(() => ({}));
    // runQuery responds with an array, so its errors arrive as [{ error }].
    const failure = Array.isArray(json) ? json.find(row => row?.error)?.error : json?.error;
    if (!res.ok || failure) {
      const err = new Error(failure?.message || `Firestore request failed (HTTP ${res.status})`);
      err.code = STATUS_TO_CODE[failure?.status] || `http-${res.status}`;
      throw err;
    }
    return json;
  }

  const docPath = (collection, id) => `/${collection}/${encodeURIComponent(id)}`;

  return {
    async get(collection, id) {
      const json = await request(docPath(collection, id), { allowNotFound: true });
      return json ? fromDocument(json) : null;
    },

    // Full overwrite; creates the document if it does not exist (setDoc semantics).
    async set(collection, id, data) {
      await request(docPath(collection, id), { method: 'PATCH', body: { fields: toFields(data) } });
    },

    // Fails with already-exists instead of overwriting.
    async create(collection, id, data) {
      await request(`/${collection}?documentId=${encodeURIComponent(id)}`, { method: 'POST', body: { fields: toFields(data) } });
    },

    // Changes only the given fields of an existing document.
    async update(collection, id, data) {
      const mask = Object.keys(data).map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
      await request(`${docPath(collection, id)}?${mask}&currentDocument.exists=true`, { method: 'PATCH', body: { fields: toFields(data) } });
    },

    // Equality-only query, e.g. where({ inviterId: 'x', inviteeEmail: 'y' }).
    async where(collection, equals) {
      const filters = Object.entries(equals).map(([field, value]) => ({
        fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: toValue(value) }
      }));
      const whereClause = filters.length === 1 ? filters[0] : { compositeFilter: { op: 'AND', filters } };
      const rows = await request(':runQuery', {
        method: 'POST',
        body: { structuredQuery: { from: [{ collectionId: collection }], where: whereClause } }
      });
      return (rows || []).filter(r => r.document).map(r => fromDocument(r.document));
    }
  };
}
