// DevTrack Firestore Real-Time Shared Directory & Invitation Delivery
// Collections, guarded by firestore.rules:
//   users/{uid}            — user profiles keyed by auth UID (merge: true)
//   userDirectory/{email}  — one record per registered account (lookup fallback)
//   invitations/{id}       — top-level invitations collection with live onSnapshot listener
//   projects/{projectId}   — workspace project document updated atomically via writeBatch on accept
import {
  initializeFirestore,
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  query,
  where,
  or,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  arrayUnion
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

export function db() {
  if (cachedDb) return cachedDb;
  try {
    // Campus/corporate proxies often break Firestore's streaming transport;
    // plain long-polling gets through them more reliably.
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
      const results = await rest().where('invitations', { [field]: value });
      onChange(results);
    } catch (err) {
      onError?.(err);
      return;
    }
    if (!stopped && !live) timer = setTimeout(poll, POLL_MS);
  };

  let unsubscribeLive = () => {};
  try {
    const q = query(collection(db(), 'invitations'), where(field, '==', value));
    unsubscribeLive = onSnapshot(
      q,
      { includeMetadataChanges: true },
      snap => {
        if (snap.metadata.fromCache) {
          if (live) { live = false; if (!timer) poll(); }
          return;
        }
        live = true;
        clearTimeout(timer);
        timer = null;
        onChange(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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

/**
 * Top-Level Real-Time Invitations Live Listener (useRealtimeInvites)
 * Mounted at the top-level authenticated layout/navbar.
 * Query: where("invitedEmail", "==", currentUser.email.toLowerCase().trim()) && where("status", "==", "pending")
 * Includes proper unsubscribe() cleanup on unmount or user logout.
 */
export function useRealtimeInvites(currentUser, callbacks = {}) {
  const onInvites = typeof callbacks === 'function' ? callbacks : callbacks.onInvites;
  const onError = (typeof callbacks === 'object' && callbacks.onError) || ((err) => {
    console.error('[useRealtimeInvites] Firestore listener error:', err);
  });

  if (!currentUser?.email) {
    return () => {};
  }

  const cleanEmail = currentUser.email.toLowerCase().trim();
  let unsub = () => {};

  try {
    const database = db();
    const invitesRef = collection(database, 'invitations');
    // Query: where("invitedEmail", "==", currentUser.email.toLowerCase().trim()) and where("status", "==", "pending")
    const q = query(
      invitesRef,
      where('invitedEmail', '==', cleanEmail),
      where('status', '==', 'pending')
    );

    unsub = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => {
        const invites = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (onInvites) onInvites(invites);
      },
      (err) => {
        console.error('[useRealtimeInvites] Snapshot listener error:', err);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn('[useRealtimeInvites] Could not attach primary listener, trying watchInvitations fallback:', err);
    if (onError) onError(err);
    unsub = watchInvitations('invitedEmail', cleanEmail, onInvites, onError);
  }

  return () => {
    try {
      unsub();
    } catch (e) {
      console.warn('[useRealtimeInvites] Unsubscribe warning:', e);
    }
  };
}

/**
 * Real-Time Projects Live Listener (useRealtimeProjects)
 * Ensures newly joined projects appear in the workspace/project switcher list
 * immediately without page reloads.
 */
export function useRealtimeProjects(currentUser, onProjectsUpdate, onError) {
  if (!currentUser?.email) return () => {};
  const uid = currentUser.uid || currentUser.id;
  let unsub = () => {};

  try {
    const database = db();
    // Filter on the server: security rules only allow queries that are
    // constrained to the caller's own projects (rules are not filters).
    const q = query(
      collection(database, 'projects'),
      or(
        where('memberIds', 'array-contains', uid),
        where('createdBy', '==', uid)
      )
    );
    unsub = onSnapshot(
      q,
      (snap) => {
        const projects = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (onProjectsUpdate) onProjectsUpdate(projects);
      },
      (err) => {
        console.error('[useRealtimeProjects] Projects listener error:', err);
        if (onError) onError(err);
      }
    );
  } catch (e) {
    console.warn('[useRealtimeProjects] Fallback:', e);
  }

  return () => {
    try { unsub(); } catch {}
  };
}

export const firestoreBackend = {
  remote: true,

  // Sync user profile: Always use Firebase Auth uid as doc ID (doc(db, "users", user.uid)) with { merge: true }
  async syncUser(user) {
    const cleanEmail = (user.email || '').toLowerCase().trim();
    const uid = user.uid || user.id;
    const nowIso = new Date().toISOString();

    // 1. Primary storage: users/{uid} with { merge: true }
    try {
      const userRef = doc(db(), 'users', uid);
      await setDoc(userRef, {
        uid: uid,
        email: cleanEmail,
        displayName: user.name || user.displayName || cleanEmail.split('@')[0],
        photoURL: user.photoURL || null,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.warn('[firestoreBackend] SDK syncUser failed, trying REST:', e);
    }

    // 2. Directory lookup compatibility: userDirectory/{cleanEmail}
    try {
      const existing = await rest().get('userDirectory', cleanEmail);
      await rest().set('userDirectory', cleanEmail, {
        uid: uid,
        email: cleanEmail,
        displayName: user.name || user.displayName || cleanEmail.split('@')[0],
        photoURL: user.photoURL || null,
        createdAt: existing?.createdAt || nowIso,
        lastSeenAt: nowIso
      });
    } catch (e) {
      console.warn('[firestoreBackend] userDirectory sync warning:', e);
    }
  },

  // Case-insensitive user lookup by email
  async findUserByEmail(email) {
    const cleanEmail = (email || '').toLowerCase().trim();

    // 1. Try querying users collection by case-insensitive normalized email
    let sdkError = null;
    try {
      const q = query(collection(db(), 'users'), where('email', '==', cleanEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0].data();
        return {
          id: d.uid,
          name: d.displayName || cleanEmail.split('@')[0],
          email: d.email,
          photoURL: d.photoURL || null
        };
      }
    } catch (err) {
      console.warn('[firestoreBackend] users lookup failed, trying userDirectory:', err);
      sdkError = err;
    }

    // 2. Fallback to userDirectory/{cleanEmail} via REST
    const d = await rest().get('userDirectory', cleanEmail);
    if (d) return { id: d.uid, name: d.displayName || cleanEmail.split('@')[0], email: d.email, photoURL: d.photoURL || null };

    // A miss only means "not registered" if the primary lookup actually ran.
    // Otherwise surface the real failure (rules not deployed, network/proxy)
    // instead of telling the inviter the account doesn't exist.
    if (sdkError) throw sdkError;
    return null;
  },

  // Query invitations before creating to ensure no duplicate pending invite exists
  async findPendingInvitation(projectId, email, senderId) {
    const cleanEmail = (email || '').toLowerCase().trim();

    // 1. Try querying top-level invitations collection via SDK
    try {
      const q = query(
        collection(db(), 'invitations'),
        where('invitedEmail', '==', cleanEmail)
      );
      const snap = await getDocs(q);
      const match = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .find(inv => inv.projectId === projectId && ['pending', 'Pending'].includes(inv.status) && (inv.expiresAtMs ? inv.expiresAtMs > Date.now() : true));
      if (match) return match;
    } catch {}

    // 2. Fallback via REST query
    try {
      const sent = await rest().where('invitations', { senderId, invitedEmail: cleanEmail });
      const found = sent.find(inv => inv.projectId === projectId && ['pending', 'Pending'].includes(inv.status) && inv.expiresAtMs > Date.now());
      if (found) return found;
    } catch {}

    // 3. Fallback with inviterId & inviteeEmail
    try {
      const sent = await rest().where('invitations', { inviterId: senderId, inviteeEmail: cleanEmail });
      return sent.find(inv => inv.projectId === projectId && ['pending', 'Pending'].includes(inv.status) && inv.expiresAtMs > Date.now()) || null;
    } catch {}

    return null;
  },

  // Create invite with required top-level invitations fields
  async createInvitation(invitation) {
    const cleanEmail = (invitation.invitedEmail || invitation.inviteeEmail || '').toLowerCase().trim();
    const senderId = invitation.senderId || invitation.inviterId || auth().currentUser?.uid || '';
    const invitedBy = invitation.invitedBy || invitation.inviterName || invitation.inviterEmail || auth().currentUser?.displayName || cleanEmail;

    const record = {
      id: invitation.id,
      projectId: invitation.projectId,
      projectName: invitation.projectName,
      projectKey: invitation.projectKey || 'DEV',
      invitedEmail: cleanEmail,
      inviteeEmail: cleanEmail,
      invitedBy: invitedBy,
      inviterName: invitedBy,
      senderId: senderId,
      inviterId: senderId,
      inviterEmail: (invitation.inviterEmail || auth().currentUser?.email || '').toLowerCase().trim(),
      inviteeId: invitation.inviteeId || '',
      role: invitation.role,
      status: 'pending',
      token: invitation.token || null,
      expiresAt: invitation.expiresAt,
      expiresAtMs: Date.parse(invitation.expiresAt) || (Date.now() + 7 * 86400000),
      createdAt: serverTimestamp()
    };

    // Try SDK setDoc first
    try {
      const invRef = doc(db(), 'invitations', invitation.id);
      await setDoc(invRef, record);
      return;
    } catch (e) {
      console.warn('[firestoreBackend] SDK createInvitation failed, trying REST:', e);
    }

    // REST fallback
    const restRecord = { ...record };
    delete restRecord.createdAt;
    restRecord.createdAt = new Date().toISOString();
    await rest().create('invitations', invitation.id, restRecord);
  },

  // Atomic Accept via writeBatch:
  // 1. Updates invitations/{inviteId} status to "accepted" (and respondedAt: serverTimestamp())
  // 2. Adds user's uid and role/profile metadata to projects/{projectId} members list/map
  async acceptInvitation(inviteId, user, invite) {
    try {
      const database = db();
      const batch = writeBatch(database);
      const inviteRef = doc(database, 'invitations', inviteId);
      batch.update(inviteRef, {
        status: 'accepted',
        respondedAt: serverTimestamp()
      });

      if (invite?.projectId) {
        const projectRef = doc(database, 'projects', invite.projectId);
        const uid = user.uid || user.id;
        const cleanEmail = (user.email || '').toLowerCase().trim();
        const displayName = user.displayName || user.name || cleanEmail.split('@')[0];
        const role = invite.role || 'Developer';
        const memberData = {
          uid,
          email: cleanEmail,
          displayName,
          name: displayName,
          role,
          joinedAt: new Date().toISOString()
        };
        batch.set(projectRef, {
          members: {
            [uid]: memberData
          },
          memberIds: arrayUnion(uid),
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      await batch.commit();
      return { success: true };
    } catch (err) {
      console.warn('[firestoreBackend] SDK writeBatch accept error, falling back to REST:', err);
      await this.updateInvitationStatus(inviteId, 'Accepted');
    }
  },

  // Decline Invitation: Updates status to "declined"
  async declineInvitation(inviteId) {
    try {
      const database = db();
      const inviteRef = doc(database, 'invitations', inviteId);
      await updateDoc(inviteRef, {
        status: 'declined',
        respondedAt: serverTimestamp()
      });
      return { success: true };
    } catch (err) {
      console.warn('[firestoreBackend] SDK decline error, falling back to REST:', err);
      await this.updateInvitationStatus(inviteId, 'Declined');
    }
  },

  async updateInvitationStatus(id, status) {
    const norm = status.toLowerCase() === 'accepted' ? 'Accepted' : status.toLowerCase() === 'declined' ? 'Declined' : status;
    if (!(await rest().get('invitations', id))) return;
    await rest().update('invitations', id, { status: norm, respondedAt: new Date().toISOString() });
  },

  useRealtimeInvites(currentUser, callbacks) {
    return useRealtimeInvites(currentUser, callbacks);
  },

  useRealtimeProjects(currentUser, onProjectsUpdate, onError) {
    return useRealtimeProjects(currentUser, onProjectsUpdate, onError);
  },

  subscribeInbox(email, onChange, onError) {
    const cleanEmail = (email || '').toLowerCase().trim();
    return watchInvitations('invitedEmail', cleanEmail, onChange, () => {
      watchInvitations('inviteeEmail', cleanEmail, onChange, onError);
    });
  },

  subscribeSent(senderId, onChange, onError) {
    return watchInvitations('senderId', senderId, onChange, () => {
      watchInvitations('inviterId', senderId, onChange, onError);
    });
  }
};
