// Firestore implementation of the shared directory (see directory.js).
// Collections, guarded by firestore.rules:
//   userDirectory/{email}  — one record per registered account (get-only, no listing)
//   invitations/{id}       — readable by inviter and invitee only
import {
  initializeFirestore, getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';
import { getFirebaseAuth, waitForAuthReady } from './firebase.js';

let cachedDb = null;

function db() {
  if (cachedDb) return cachedDb;
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase is not initialized');
  try {
    // Campus/corporate proxies often break Firestore's streaming transport;
    // plain long-polling gets through them reliably.
    cachedDb = initializeFirestore(auth.app, {
      experimentalForceLongPolling: true
    });
  } catch {
    cachedDb = getFirestore(auth.app);
  }
  return cachedDb;
}

const INVITATION_FIELDS = [
  'id', 'projectId', 'projectName', 'projectKey', 'inviterId', 'inviterName', 'inviterEmail',
  'inviteeId', 'inviteeName', 'inviteeEmail', 'role', 'status', 'token', 'createdAt', 'expiresAt'
];

export const firestoreBackend = {
  remote: true,

  async syncUser(user) {
    await waitForAuthReady();
    const ref = doc(db(), 'userDirectory', user.email);
    const existing = await getDoc(ref);
    const nowIso = new Date().toISOString();
    await setDoc(ref, {
      uid: user.id,
      email: user.email,
      displayName: user.name || user.email.split('@')[0],
      photoURL: user.photoURL || null,
      createdAt: existing.exists() ? existing.data().createdAt : nowIso,
      lastSeenAt: nowIso
    });
  },

  async findUserByEmail(email) {
    await waitForAuthReady();
    const snap = await getDoc(doc(db(), 'userDirectory', email));
    if (!snap.exists()) return null;
    const d = snap.data();
    return { id: d.uid, name: d.displayName || email.split('@')[0], email: d.email, photoURL: d.photoURL || null };
  },

  // Security rules only allow reading invitations you sent or received, so the
  // duplicate check is scoped to the current inviter.
  async findPendingInvitation(projectId, email, inviterId) {
    await waitForAuthReady();
    const snap = await getDocs(query(collection(db(), 'invitations'),
      where('inviterId', '==', inviterId), where('inviteeEmail', '==', email)));
    return snap.docs.map(d => d.data()).find(inv =>
      inv.projectId === projectId && inv.status === 'Pending' && inv.expiresAtMs > Date.now()) || null;
  },

  async createInvitation(invitation) {
    await waitForAuthReady();
    const record = Object.fromEntries(INVITATION_FIELDS.map(f => [f, invitation[f] ?? null]));
    record.expiresAtMs = Date.parse(invitation.expiresAt);
    await setDoc(doc(db(), 'invitations', invitation.id), record);
  },

  // Link-only invitations (created before the shared inbox, or offline) have no
  // shared record; there is nothing to update for them.
  async updateInvitationStatus(id, status) {
    await waitForAuthReady();
    const ref = doc(db(), 'invitations', id);
    if (!(await getDoc(ref)).exists()) return;
    await updateDoc(ref, { status, respondedAt: new Date().toISOString() });
  },

  subscribeInbox(email, onChange, onError) {
    return onSnapshot(query(collection(db(), 'invitations'), where('inviteeEmail', '==', email)),
      snap => onChange(snap.docs.map(d => d.data())), onError);
  },

  subscribeSent(inviterId, onChange, onError) {
    return onSnapshot(query(collection(db(), 'invitations'), where('inviterId', '==', inviterId)),
      snap => onChange(snap.docs.map(d => d.data())), onError);
  }
};
