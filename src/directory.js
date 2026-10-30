// DevTrack Shared User Directory & Real-Time Invitation Delivery
// Uses Firestore when Firebase is configured, so an invitation reaches the
// recipient's inbox on any device. Without Firebase (local dev, Node tests)
// it falls back to this browser's store, which syncs across tabs.
import { store } from './store.js';
import { UNREGISTERED_USER_MESSAGE, PENDING_INVITATION_MESSAGE } from './rules.js';

const normalizeEmail = (email) => (email || '').trim().toLowerCase();

export const localBackend = {
  remote: false,
  async syncUser() {},
  async findUserByEmail(email) {
    const user = store.getAllUsers().find(u => normalizeEmail(u.email) === email);
    return user ? { id: user.id, name: user.name, email: normalizeEmail(user.email), photoURL: user.photoURL || null } : null;
  },
  async findPendingInvitation() { return null; },
  async createInvitation() {},
  async updateInvitationStatus() {},
  subscribeInbox(email, onChange) {
    const emit = () => onChange(store.getUserInvitations(email));
    emit();
    return store.subscribe(emit);
  },
  subscribeSent() { return () => {}; }
};

let backendPromise = null;

// Tests (and future backends) can swap the implementation.
export function setDirectoryBackend(backend) {
  backendPromise = Promise.resolve(backend);
}

function isFirestoreConfigured() {
  const env = import.meta.env || {};
  return typeof window !== 'undefined' && Boolean(env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID);
}

function getBackend() {
  if (!backendPromise) {
    backendPromise = isFirestoreConfigured()
      ? import('./firestoreDirectory.js').then(m => m.firestoreBackend).catch(err => {
          console.warn('[Directory] Firestore unavailable, using this browser only:', err);
          return localBackend;
        })
      : Promise.resolve(localBackend);
  }
  return backendPromise;
}

export async function checkUserRegistered(email) {
  const clean = normalizeEmail(email);
  if (!clean) return { exists: false };
  const user = await (await getBackend()).findUserByEmail(clean);
  return user ? { exists: true, user } : { exists: false };
}

export async function sendProjectInvitation(projectId, email, role) {
  const check = store.validateInvitation(projectId, email);
  if (check.error) return check;
  const { cleanEmail } = check.data;

  try {
    const backend = await getBackend();
    if (await backend.findPendingInvitation(projectId, cleanEmail, store.currentUser.id)) {
      return { error: PENDING_INVITATION_MESSAGE };
    }
    const lookup = await checkUserRegistered(cleanEmail);
    if (!lookup.exists) return { error: UNREGISTERED_USER_MESSAGE };

    const res = store.createInvitation(projectId, cleanEmail, role, { invitee: lookup.user });
    if (res.error) return res;
    try {
      await backend.createInvitation(res.data);
    } catch (err) {
      store.discardInvitation(res.data.id);
      throw err;
    }
    return res;
  } catch (err) {
    return { error: `Could not deliver the invitation: ${err?.message || err}` };
  }
}

export async function respondToInvitation(idOrToken, action) {
  const check = store.checkInvitationResponse(idOrToken, action);
  if (check.error) return check;
  const inv = check.data;

  const target = action === 'accept' ? 'Accepted' : 'Declined';

  // Update the shared record first; it is the authority other devices follow.
  try {
    await (await getBackend()).updateInvitationStatus(inv.id, target);
  } catch (err) {
    return { error: `Could not update the invitation: ${err?.message || err}` };
  }

  // Our own inbox listener may already have applied the change locally.
  const local = store.getInvitation(inv.id);
  if (local?.status === target) return { data: { invitation: local } };
  return action === 'accept' ? store.acceptInvitation(inv.id) : store.declineInvitation(inv.id);
}

export async function revokeProjectInvitation(invitationId) {
  const res = store.revokeInvitation(invitationId);
  if (res.error) return res;
  try {
    await (await getBackend()).updateInvitationStatus(invitationId, 'Revoked');
  } catch (err) {
    console.warn('[Directory] Revoke not propagated:', err);
  }
  return res;
}

let activeSession = null;

export function stopInvitationSync() {
  activeSession?.unsubscribers.forEach(unsub => unsub());
  activeSession = null;
}

// Registers the signed-in user in the shared directory and listens for
// invitations addressed to them (and responses to invitations they sent).
export function startInvitationSync(user, { onNewInvitations, onInvitationResponse, onError } = {}) {
  if (!user?.email) return;
  if (activeSession?.userId === user.id) return;
  stopInvitationSync();

  const email = normalizeEmail(user.email);
  const session = {
    userId: user.id,
    unsubscribers: [],
    known: new Set(store.getUserInvitations(email).map(i => i.id))
  };
  activeSession = session;

  getBackend().then(async backend => {
    if (activeSession !== session) return;
    try {
      await backend.syncUser({ ...user, email });
    } catch (err) {
      onError?.(err);
    }
    if (activeSession !== session) return;

    session.unsubscribers.push(backend.subscribeInbox(email, invitations => {
      const fresh = [];
      invitations.forEach(inv => {
        if (backend.remote) store.syncRemoteInvitation(inv);
        const live = inv.status === 'Pending' && new Date(inv.expiresAt).getTime() > Date.now();
        if (live && !session.known.has(inv.id)) fresh.push(inv);
        session.known.add(inv.id);
      });
      if (fresh.length) onNewInvitations?.(fresh);
    }, err => onError?.(err)));

    if (backend.remote) {
      session.unsubscribers.push(backend.subscribeSent(user.id, invitations => {
        invitations.forEach(inv => {
          const changed = store.applyInvitationResponse(inv);
          if (changed) onInvitationResponse?.(changed);
        });
      }, err => onError?.(err)));
    }
  });
}
