// DevTrack Enterprise Real-Time Team Collaboration & Live Presence Engine
import { store } from './store.js';
import { showToast, escapeHtml } from './ui.js';
import { dispatchWebhookEvent } from './webhooks.js';

const CHANNEL_NAME = 'devtrack_team_collab_bus';
const PRESENCE_TTL_MS = 15000; // 15 seconds before inactive peer is removed

class TeamCollabEngine {
  constructor() {
    this.channel = null;
    this.activePeers = new Map(); // userId -> { user, projectId, lastSeen, currentHash }
    this.activityLog = [];
    this.presenceListeners = new Set();
    this.activityListeners = new Set();
    this.heartbeatInterval = null;

    if (typeof window !== 'undefined') {
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          this.channel = new BroadcastChannel(CHANNEL_NAME);
          this.channel.onmessage = (e) => this._handleMessage(e.data);
        }
      } catch (err) {
        console.warn('[Collab] BroadcastChannel unavailable, using storage bus fallback:', err);
      }

      // Storage event fallback for older browsers
      window.addEventListener('storage', (e) => {
        if (e.key === 'devtrack_collab_event' && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            this._handleMessage(data);
          } catch {}
        }
      });

      this._startHeartbeat();
    }
  }

  // Subscribe to live presence roster changes
  onPresenceChange(fn) {
    this.presenceListeners.add(fn);
    return () => this.presenceListeners.delete(fn);
  }

  // Subscribe to real-time team activity events
  onActivity(fn) {
    this.activityListeners.add(fn);
    return () => this.activityListeners.delete(fn);
  }

  _notifyPresence() {
    const list = this.getOnlineMembers();
    this.presenceListeners.forEach(fn => fn(list));
  }

  _notifyActivity(evt) {
    this.activityListeners.forEach(fn => fn(evt));
  }

  _startHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    // Send immediate ping
    this.sendPresencePing();
    // Re-ping every 6 seconds
    this.heartbeatInterval = setInterval(() => {
      this.sendPresencePing();
      this._pruneStalePeers();
    }, 6000);
  }

  sendPresencePing() {
    const user = store.currentUser;
    const project = store.getActiveProject();
    if (!user) return;

    const ping = {
      type: 'PRESENCE_PING',
      user: {
        id: user.id,
        name: user.name || user.email,
        email: user.email,
        photoURL: user.photoURL || null
      },
      projectId: project?.id || null,
      currentHash: window.location.hash || '#/dashboard',
      timestamp: Date.now()
    };

    this._send(ping);
  }

  broadcastAction(actionData) {
    const user = store.currentUser;
    const project = store.getActiveProject();
    if (!user || !project) return;

    const payload = {
      type: 'TEAM_ACTION',
      id: 'act-' + Math.random().toString(36).slice(2, 9),
      projectId: project.id,
      projectKey: project.key,
      user: {
        id: user.id,
        name: user.name || user.email,
        email: user.email
      },
      action: actionData.action, // 'TASK_MOVED' | 'DEFECT_LOGGED' | 'REQUIREMENT_UPDATED' | 'PREFERENCES_SAVED' | 'RELEASE_PROMOTED'
      title: actionData.title,
      details: actionData.details,
      timestamp: Date.now()
    };

    // Log locally
    this._recordActivity(payload);

    // Send to other tabs / teammates
    this._send(payload);

    // Outbound Webhook Integration Dispatch
    const webhookEventMap = {
      'DEFECT_LOGGED': 'defect.created',
      'RELEASE_PROMOTED': 'release.promoted',
      'RELEASE_SIGNOFF': 'release.signed_off',
      'TASK_MOVED': 'task.moved'
    };
    const targetWebhookEvent = webhookEventMap[actionData.action];
    if (targetWebhookEvent) {
      dispatchWebhookEvent(project.id, targetWebhookEvent, {
        title: actionData.title,
        details: actionData.details
      }).catch(() => {});
    }
  }

  _send(message) {
    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (err) {
        console.warn('[Collab] Failed to post message:', err);
      }
    }
    // Also broadcast through localStorage bus
    try {
      localStorage.setItem('devtrack_collab_event', JSON.stringify({ ...message, _busNonce: Math.random() }));
    } catch {}
  }

  _handleMessage(msg) {
    if (!msg || !msg.type) return;

    if (msg.type === 'PRESENCE_PING') {
      const { user, projectId, currentHash, timestamp } = msg;
      if (!user || !user.id) return;
      this.activePeers.set(user.id, {
        user,
        projectId,
        currentHash,
        lastSeen: timestamp || Date.now()
      });
      this._notifyPresence();
      return;
    }

    if (msg.type === 'TEAM_ACTION') {
      const activeProject = store.getActiveProject();
      // Only process events matching the current active project
      if (activeProject && msg.projectId === activeProject.id) {
        this._recordActivity(msg);
        this._notifyActivity(msg);

        // Don't toast self-originated storage bounces
        const isMe = store.currentUser?.id === msg.user.id;
        if (!isMe) {
          const pref = getTeamPreferences(activeProject.id);
          if (pref.toastOnTeamActivity) {
            showToast(`⚡ ${escapeHtml(msg.user.name)}: ${escapeHtml(msg.title)} (${escapeHtml(msg.details)})`, 'info');
          }
          // Trigger route refresh to reflect state updates smoothly
          window.dispatchEvent(new CustomEvent('devtrack:team-action', { detail: msg }));
        }
      }
    }
  }

  _recordActivity(entry) {
    this.activityLog.unshift(entry);
    if (this.activityLog.length > 50) this.activityLog.pop();
  }

  _pruneStalePeers() {
    const now = Date.now();
    let changed = false;
    for (const [uid, peer] of this.activePeers.entries()) {
      if (now - peer.lastSeen > PRESENCE_TTL_MS) {
        this.activePeers.delete(uid);
        changed = true;
      }
    }
    if (changed) this._notifyPresence();
  }

  getOnlineMembers(projectId = null) {
    const targetProjId = projectId || store.getActiveProject()?.id;
    const now = Date.now();
    const result = [];

    // Always include current user as active
    const me = store.currentUser;
    if (me) {
      result.push({
        id: me.id,
        name: me.name || me.email,
        email: me.email,
        photoURL: me.photoURL || null,
        isMe: true,
        lastSeen: now
      });
    }

    for (const [uid, peer] of this.activePeers.entries()) {
      if (me && uid === me.id) continue;
      if (now - peer.lastSeen <= PRESENCE_TTL_MS) {
        if (!targetProjId || !peer.projectId || peer.projectId === targetProjId) {
          result.push({ ...peer.user, isMe: false, lastSeen: peer.lastSeen, currentHash: peer.currentHash });
        }
      }
    }

    return result;
  }

  getRecentActivities(projectId = null) {
    const targetProjId = projectId || store.getActiveProject()?.id;
    if (!targetProjId) return this.activityLog.slice(0, 20);
    return this.activityLog.filter(a => a.projectId === targetProjId).slice(0, 20);
  }
}

export const teamCollab = new TeamCollabEngine();

// ===== TEAM WORKING PREFERENCES & AGREEMENTS =====
export const DEFAULT_TEAM_PREFERENCES = {
  sprintDurationWeeks: 2, // 1 | 2 | 3 | 4
  estimationScale: 'fibonacci', // 'fibonacci' (1,2,3,5,8,13) | 'linear' (1,2,3,4,5) | 'tshirt' (XS,S,M,L,XL)
  wipEnforcement: 'warning', // 'warning' | 'strict'
  autoAssignOnProgress: true, // auto-assign unassigned tasks to mover
  requireRequirementLink: true, // enforce MoSCoW requirement link for sprint tasks
  strictReleaseGate: true, // block release if open Critical/High defects exist
  toastOnTeamActivity: true // show live collaborator toasts
};

export function getTeamPreferences(projectId) {
  if (!projectId) return { ...DEFAULT_TEAM_PREFERENCES };
  const raw = localStorage.getItem(`devtrack_team_prefs_${projectId}`);
  if (raw) {
    try {
      return { ...DEFAULT_TEAM_PREFERENCES, ...JSON.parse(raw) };
    } catch {}
  }
  return { ...DEFAULT_TEAM_PREFERENCES };
}

export function saveTeamPreferences(projectId, preferences) {
  if (!projectId) return;
  const merged = { ...getTeamPreferences(projectId), ...preferences };
  localStorage.setItem(`devtrack_team_prefs_${projectId}`, JSON.stringify(merged));
  
  // Also save onto project record in store
  store.updateProject(projectId, { preferences: merged });

  // Broadcast preferences change event
  teamCollab.broadcastAction({
    action: 'PREFERENCES_SAVED',
    title: 'Team Working Agreements Updated',
    details: `${merged.sprintDurationWeeks}wk cadence, ${merged.estimationScale} points, ${merged.wipEnforcement} WIP mode`
  });

  return merged;
}

