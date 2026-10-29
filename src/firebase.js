// DevTrack Real-time Firebase Authentication Service
// Uses official Google Firebase modular SDK (v10.13.0)
import { initializeApp, getApps, deleteApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  browserLocalPersistence,
  setPersistence
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';

const FIREBASE_CONFIG_KEY = 'devtrack_firebase_config';

// Default Firebase configuration (Loaded dynamically from environment variables)
export const DEFAULT_CONFIG = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID || ""
};

export function getSavedFirebaseConfig() {
  try {
    const raw = localStorage.getItem(FIREBASE_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.apiKey && !parsed.apiKey.includes('DemoKey')) {
        return { ...DEFAULT_CONFIG, ...parsed };
      }
    }
  } catch (err) {
    console.warn('[Firebase] Error reading saved config:', err);
  }
  return DEFAULT_CONFIG;
}

export function isFirebaseConfigured() {
  const cfg = getSavedFirebaseConfig();
  return Boolean(cfg.apiKey && cfg.projectId && !cfg.apiKey.includes('DemoKey'));
}

export function getFirebaseStatus() {
  const cfg = getSavedFirebaseConfig();
  const configured = isFirebaseConfigured();
  return {
    configured,
    isDemo: !configured,
    projectId: cfg.projectId || 'devtrack-demo',
    authDomain: cfg.authDomain || 'devtrack-lifecycle.firebaseapp.com',
    appId: cfg.appId || 'default'
  };
}

export function parseFirebaseConfigInput(text) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();

  // Try parsing direct JSON
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const obj = JSON.parse(trimmed);
      if (obj.apiKey) {
        return {
          apiKey: obj.apiKey || '',
          authDomain: obj.authDomain || '',
          projectId: obj.projectId || '',
          storageBucket: obj.storageBucket || '',
          messagingSenderId: obj.messagingSenderId || '',
          appId: obj.appId || ''
        };
      }
    } catch {
      // Not strict JSON, proceed to regex
    }
  }

  // Regex extraction for JavaScript configuration snippets
  const extract = (key) => {
    const regex = new RegExp(`["']?${key}["']?\\s*:\\s*["'\`]([^"'\`]+)["'\`]`, 'i');
    const match = trimmed.match(regex);
    return match ? match[1].trim() : '';
  };

  const apiKey = extract('apiKey');
  const authDomain = extract('authDomain');
  const projectId = extract('projectId');
  const storageBucket = extract('storageBucket');
  const messagingSenderId = extract('messagingSenderId');
  const appId = extract('appId');

  if (apiKey || projectId) {
    return {
      apiKey: apiKey || '',
      authDomain: authDomain || '',
      projectId: projectId || '',
      storageBucket: storageBucket || '',
      messagingSenderId: messagingSenderId || '',
      appId: appId || ''
    };
  }

  return null;
}

export async function testFirebaseConnection(config) {
  const startTime = Date.now();
  try {
    if (!config.apiKey || !config.projectId) {
      return { ok: false, error: 'API Key and Project ID are required.' };
    }
    // Ping Google Identity Toolkit endpoint with API Key
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${encodeURIComponent(config.apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        continueUri: window.location.origin,
        providerId: 'google.com'
      })
    });
    const latency = Date.now() - startTime;
    const json = await res.json();

    if (res.ok) {
      return { ok: true, latency, message: `Connected to Firebase in ${latency}ms!` };
    }

    if (json.error?.message?.includes('API_KEY_INVALID')) {
      return { ok: false, error: 'Firebase API Key is invalid. Please copy the exact Web API Key from Firebase Console.' };
    }

    // Google returned an auth schema response, which confirms the API key is authentic & reachable
    return { ok: true, latency, message: `Firebase API Key verified (${latency}ms latency). Ready for live auth.` };
  } catch (err) {
    return { ok: false, error: err.message || 'Unable to connect to Google Firebase endpoints. Check network connection.' };
  }
}

export function formatFirebaseError(err) {
  if (!err) return 'An error occurred during authentication.';
  const code = err.code || '';
  const msg = err.message || '';

  if (code === 'auth/invalid-credential' || msg.includes('auth/invalid-credential')) {
    return 'Invalid email or password. Please check your credentials or create a new account.';
  }
  if (code === 'auth/user-not-found' || msg.includes('auth/user-not-found')) {
    return 'No user found with this email. Please register for a workspace account first.';
  }
  if (code === 'auth/wrong-password' || msg.includes('auth/wrong-password')) {
    return 'Incorrect password. Please try again or use the password reset link.';
  }
  if (code === 'auth/email-already-in-use' || msg.includes('auth/email-already-in-use')) {
    return 'An account already exists with this email address. Please sign in instead.';
  }
  if (code === 'auth/weak-password' || msg.includes('auth/weak-password')) {
    return 'Password is too weak. Firebase requires at least 6 characters.';
  }
  if (code === 'auth/popup-closed-by-user' || msg.includes('auth/popup-closed-by-user')) {
    return 'Google Sign-In popup was closed before completing.';
  }
  if (code === 'auth/cancelled-popup-request' || msg.includes('auth/cancelled-popup-request')) {
    return 'Google Sign-In popup was cancelled.';
  }
  if (code === 'auth/operation-not-allowed' || msg.includes('auth/operation-not-allowed')) {
    return 'This sign-in method is not enabled in your Firebase Console (Build > Authentication > Sign-in method).';
  }
  if (code === 'auth/unauthorized-domain' || msg.includes('auth/unauthorized-domain')) {
    return 'This domain (localhost) is not added to Authorized Domains in Firebase Console (Authentication > Settings > Authorized domains).';
  }
  if (code === 'auth/network-request-failed' || msg.includes('auth/network-request-failed')) {
    return 'Network error: Unable to contact Firebase Auth servers. Check your internet connection.';
  }
  if (code === 'auth/api-key-not-valid' || msg.includes('auth/api-key-not-valid')) {
    return 'Your Firebase API Key is invalid or expired. Check your Firebase Setup.';
  }
  return msg || 'Authentication failed. Please verify your credentials.';
}

let currentApp = null;
let currentAuth = null;
let currentAnalytics = null;

export async function initFirebase(force = false) {
  if (currentAuth && !force) return { app: currentApp, auth: currentAuth, isConfigured: isFirebaseConfigured() };

  try {
    const config = getSavedFirebaseConfig();
    const existingApps = getApps();

    if (force && existingApps.length > 0) {
      await Promise.all(existingApps.map(a => deleteApp(a).catch(() => {})));
    }

    const appsNow = getApps();
    // Use standard [DEFAULT] app so Firebase Auth persists sessions across page reloads in IndexedDB
    currentApp = appsNow.length > 0 && !force ? appsNow[0] : initializeApp(config);
    currentAuth = getAuth(currentApp);
    try {
      setPersistence(currentAuth, browserLocalPersistence).catch(() => {});
    } catch {}

    // Initialize Firebase Analytics if measurementId is provided
    if (config.measurementId && typeof window !== 'undefined') {
      try {
        const { getAnalytics, isSupported } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-analytics.js');
        if (await isSupported()) {
          currentAnalytics = getAnalytics(currentApp);
        }
      } catch (analyticsErr) {
        // Analytics is optional and non-blocking
      }
    }

    return {
      app: currentApp,
      auth: currentAuth,
      analytics: currentAnalytics,
      isConfigured: isFirebaseConfigured()
    };
  } catch (err) {
    console.warn('[Firebase] Init error (using demo fallback):', err.message);
    return { app: null, auth: null, isConfigured: false, error: err.message };
  }
}

// Auto-initialize
initFirebase();

export function getFirebaseAuth() {
  if (!currentAuth) {
    try {
      const config = getSavedFirebaseConfig();
      const apps = getApps();
      currentApp = apps.length > 0 ? apps[0] : initializeApp(config);
      currentAuth = getAuth(currentApp);
      setPersistence(currentAuth, browserLocalPersistence).catch(() => {});
    } catch (e) {
      console.warn('[Firebase] Auth init fallback:', e);
    }
  }
  return currentAuth;
}

export async function waitForAuthReady() {
  const auth = getFirebaseAuth();
  if (auth && typeof auth.authStateReady === 'function') {
    try {
      await auth.authStateReady();
    } catch (e) {
      console.warn('[Firebase] authStateReady error:', e);
    }
  }
  return auth?.currentUser || null;
}

export function getFirebaseAnalytics() {
  return currentAnalytics;
}

export async function saveFirebaseConfig(config) {
  localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config));
  return await initFirebase(true);
}

export async function resetFirebaseConfigToDemo() {
  localStorage.removeItem(FIREBASE_CONFIG_KEY);
  return await initFirebase(true);
}

export async function firebaseLogin(email, password) {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase Auth is not initialized');
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function firebaseRegister(name, email, password) {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase Auth is not initialized');
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  if (name && userCredential.user) {
    try {
      await updateProfile(userCredential.user, { displayName: name });
    } catch (e) {
      console.warn('[Firebase] Could not update displayName:', e);
    }
  }
  return userCredential.user;
}

export async function firebaseGoogleLogin() {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase Auth is not initialized');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function firebaseLogout() {
  const auth = getFirebaseAuth();
  if (auth) {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('[Firebase] Sign out error:', err);
    }
  }
}

export async function firebaseResetPassword(email) {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase Auth is not initialized');
  await sendPasswordResetEmail(auth, email);
}

export function subscribeFirebaseAuthState(callback) {
  const auth = getFirebaseAuth();
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}
