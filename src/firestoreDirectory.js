// Firestore implementation of the shared directory (see directory.js).
// Collections, guarded by firestore.rules:
//   userDirectory/{email}  — one record per registered account (get-only, no listing)
//   invitations/{id}       — readable by inviter and invitee only
//
// One-off reads/writes use the REST API: some networks and security software
// break the SDK's WebChannel while plain HTTPS works. Inbox updates use the
// SDK's live listener when it connects, and REST polling when it does not.
import {
  initializeFirestore, getFirestore, collection, query, where, onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';
import { getFirebaseAuth, waitForAuthReady } from './firebase.js';
import { createFirestoreRest } from './firestoreRest.js';

const POLL_MS = 10000;

let cachedDb = null;
let cachedRest = null;

function auth() {
  const a = getFirebaseAuth();
  if (!a) throw new Error('Firebase is not initialized');
  return a;
}

function db() {
  if (cachedDb) return cachedDb;
  try {
    // Campus/corporate proxies often break Firestore's streaming transport;
    // plain long-polling gets through them more often.
    cachedDb = initializeFirestore(auth().app, { experimentalForceLongPolling: true });
  } catch {
    cachedDb = getFirestore(auth().app);
  }
  return cachedDb;
}

function rest() {
  if (!cachedRest) {
    cachedRest = createFirestoreRest({
      projectId: auth().app.options.projectId,
      getToken: async () => {
        await waitForAuthReady();
        const user = auth().currentUser;
        if (!user) throw Object.assign(new Error('You are signed out. Sign in again.'), { code: 'unauthenticated' });
        return user.getIdToken();
      }
    });
  }
  return cachedRest;
}

// Live SDK listener with REST polling as a fallback. Polling runs until the
// listener delivers a server-confirmed snapshot, and resumes if it drops back
// to cached data (i.e. the connection was lost).
function watchInvitations(field, value, onChange, onError) {
  let stopped = false;
  let live = false;
  let timer = null;

  const poll = async () => {
    timer = null;
    if (stopped || live) return;
    try {
      onChange(await rest().where('invitations', { [field]: value }));
    } catch (err) {
      onError?.(err);
      return;
    }
    if (!stopped && !live) timer = setTimeout(poll, POLL_MS);
  };

  let unsubscribeLive = () => {};
  try {
    unsubscribeLive = onSnapshot(
      query(collection(db(), 'invitations'), where(field, '==', value)),
      { includeMetadataChanges: true },
      snap => {
        if (snap.metadata.fromCache) {
          if (live) { live = false; if (!timer) poll(); }
          return;
        }
        live = true;
        clearTimeout(timer);
        timer = null;
        onChange(snap.docs.map(d => d.data()));
      },
      () => { live = false; if (!timer && !stopped) poll(); }
    );
  } catch {
    // SDK unavailable; polling alone still works.
  }

  poll();
  return () => {
    stopped = true;
    clearTimeout(timer);
    unsubscribeLive();
  };
}

const INVITATION_FIELDS = [
  'id', 'projectId', 'projectName', 'projectKey', 'inviterId', 'inviterName', 'inviterEmail',
  'inviteeId', 'inviteeName', 'inviteeEmail', 'role', 'status', 'token', 'createdAt', 'expiresAt'
];

export const firestoreBackend = {
  remote: true,

  async syncUser(user) {
    const existing = await rest().get('userDirectory', user.email);
    const nowIso = new Date().toISOString();
    await rest().set('userDirectory', user.email, {
      uid: user.id,
      email: user.email,
      displayName: user.name || user.email.split('@')[0],
      photoURL: user.photoURL || null,
      createdAt: existing?.createdAt || nowIso,
      lastSeenAt: nowIso
    });
  },

  async findUserByEmail(email) {
    const d = await rest().get('userDirectory', email);
    return d ? { id: d.uid, name: d.displayName || email.split('@')[0], email: d.email, photoURL: d.photoURL || null } : null;
  },

  // Security rules only allow reading invitations you sent or received, so the
  // duplicate check is scoped to the current inviter.
  async findPendingInvitation(projectId, email, inviterId) {
    const sent = await rest().where('invitations', { inviterId, inviteeEmail: email });
    return sent.find(inv => inv.projectId === projectId && inv.status === 'Pending' && inv.expiresAtMs > Date.now()) || null;
  },

  async createInvitation(invitation) {
    const record = Object.fromEntries(INVITATION_FIELDS.map(f => [f, invitation[f] ?? null]));
    record.expiresAtMs = Date.parse(invitation.expiresAt);
    await rest().create('invitations', invitation.id, record);
  },

  // Link-only invitations (created before the shared inbox, or offline) have no
  // shared record; there is nothing to update for them.
  async updateInvitationStatus(id, status) {
    if (!(await rest().get('invitations', id))) return;
    await rest().update('invitations', id, { status, respondedAt: new Date().toISOString() });
  },

  subscribeInbox(email, onChange, onError) {
    return watchInvitations('inviteeEmail', email, onChange, onError);
  },

  subscribeSent(inviterId, onChange, onError) {
    return watchInvitations('inviterId', inviterId, onChange, onError);
  }
};
