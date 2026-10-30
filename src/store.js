// DevTrack LocalStorage-based Data Store
// Simulates a backend with full CRUD for all entities
import {
  ROLES, permissionError, isValidPriority, REQUIREMENT_STATUSES, REQUIREMENT_HISTORY_FIELDS,
  SPRINT_STATUSES, validateSprintDates, TASK_STATUSES, canTransitionTask, TEST_TYPES, TEST_RESULTS,
  isValidSeverity, canTransitionBug, can, BUG_VERIFY_STATES, BUG_RESOLVED_STATES, RELEASE_STATUSES,
  isValidReleaseName, LEGACY_STATUS_MAP, buildTraceability, UNREGISTERED_USER_MESSAGE,
  ALREADY_MEMBER_MESSAGE, PENDING_INVITATION_MESSAGE, SELF_INVITE_MESSAGE, INVITATION_TTL_MS,
  INVALID_EMAIL_MESSAGE, INVITE_FORBIDDEN_MESSAGE
} from './rules.js';

const STORE_KEY = 'devtrack_store';
const VALID_ROLES = ROLES;

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
}

function now() { return new Date().toISOString(); }

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

function cleanText(value) {
  return typeof value === 'string' ? value.replace(/[<>"'`]/g, '').trim() : '';
}

function memberMatchesUser(member, user) {
  if (!member || !user) return false;
  if (member.userId && user.id && member.userId === user.id) return true;
  return Boolean(member.userEmail && user.email && normalizeEmail(member.userEmail) === normalizeEmail(user.email));
}

function isRegisteredUser(data, user) {
  if (!user) return false;
  return Boolean(user.isFirebase) || (data.users || []).some(u =>
    u.id === user.id || (u.email && user.email && normalizeEmail(u.email) === normalizeEmail(user.email))
  );
}

// Default clean data structure (Real-time Firebase users only)
function getDefaultData() {
  const projectId = 'proj-001';

  return {
    currentUser: null,
    activeProjectId: projectId,
    users: [],
    projects: [
      {
        id: projectId,
        name: 'DevTrack Platform',
        key: 'DEV',
        description: 'Full-stack Software Engineering Lifecycle Management Platform for managing requirements, tasks, sprints, testing, bugs, and releases.',
        startDate: '2026-09-15',
        endDate: '2026-12-31',
        createdBy: 'system',
        createdAt: now(),
        updatedAt: now()
      }
    ],
    members: [],
    requirements: [],
    requirementHistory: [],
    sprints: [],
    tasks: [],
    testCases: [],
    testRuns: [],
    bugs: [],
    releases: [],
    auditLogs: [],
    invitations: []
  };
}


export function encodeInviteToken(data) {
  try {
    const payload = {
      id: data.id,
      pid: data.projectId,
      pname: data.projectName,
      pkey: data.projectKey,
      pdesc: data.projectDesc || '',
      iid: data.inviterId || '',
      iname: data.inviterName,
      iemail: data.inviterEmail,
      email: (data.inviteeEmail || '').toLowerCase(),
      role: data.role,
      team: Array.isArray(data.team) ? data.team : [],
      exp: data.expiresAt,
      iat: data.createdAt
    };
    const jsonStr = JSON.stringify(payload);
    let b64 = '';
    if (typeof Buffer !== 'undefined') {
      b64 = Buffer.from(jsonStr, 'utf-8').toString('base64url');
    } else {
      b64 = btoa(unescape(encodeURIComponent(jsonStr)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    }
    return `inv_${b64}`;
  } catch (err) {
    return 'inv_' + (data.id || Date.now());
  }
}

export function decodeInviteToken(token) {
  if (!token || typeof token !== 'string') return null;
  const clean = decodeURIComponent(token).trim();
  if (!clean.startsWith('inv_')) return null;
  try {
    // Server-issued tokens carry an HMAC suffix (inv_<payload>.<sig>); the
    // payload is still self-describing, so the client only decodes that part.
    const raw = clean.slice(4).split('.')[0];
    let jsonStr = '';
    if (typeof Buffer !== 'undefined') {
      jsonStr = Buffer.from(raw, 'base64url').toString('utf-8');
    } else {
      const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
      const pad = b64.length % 4;
      const paddedB64 = pad ? b64 + '='.repeat(4 - pad) : b64;
      jsonStr = decodeURIComponent(escape(atob(paddedB64)));
    }
    const d = JSON.parse(jsonStr);
    if (!d || !d.pid || !d.email) return null;
    // Token content is attacker-controllable; strip markup before it reaches the DOM.
    const team = Array.isArray(d.team) ? d.team.map(m => ({
      id: cleanText(m?.id) || null,
      name: cleanText(m?.name),
      email: normalizeEmail(cleanText(m?.email)),
      role: VALID_ROLES.includes(m?.role) ? m.role : 'Developer'
    })) : [];
    return {
      id: cleanText(d.id),
      projectId: cleanText(d.pid),
      projectName: cleanText(d.pname),
      projectKey: cleanText(d.pkey),
      projectDesc: cleanText(d.pdesc),
      inviterId: cleanText(d.iid),
      inviterName: cleanText(d.iname),
      inviterEmail: normalizeEmail(cleanText(d.iemail)),
      inviteeEmail: normalizeEmail(cleanText(d.email)),
      role: VALID_ROLES.includes(d.role) ? d.role : 'Developer',
      team,
      expiresAt: d.exp,
      createdAt: d.iat,
      token: clean
    };
  } catch (err) {
    return null;
  }
}

class Store {

  constructor() {
    this._data = null;
    this._listeners = new Set();
  }

  _load() {
    if (this._data) return this._data;
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        this._data = JSON.parse(raw);

        // Purge dummy accounts and legacy seed records (real users only)
        const DUMMY_EMAILS = ['alex@devtrack.io', 'jordan@devtrack.io', 'sam@devtrack.io', 'elena@company.com'];
        const DUMMY_USER_IDS = ['user-001', 'user-002', 'user-003'];
        const DUMMY_REQ_IDS = ['req-001', 'req-002', 'req-003', 'req-004'];
        const DUMMY_TASK_IDS = ['task-001', 'task-002', 'task-003', 'task-004', 'task-005'];
        const DUMMY_TC_IDS = ['tc-001', 'tc-002', 'tc-003'];
        const DUMMY_TR_IDS = ['tr-001', 'tr-002', 'tr-003'];
        const DUMMY_BUG_IDS = ['bug-001', 'bug-002'];
        const DUMMY_SPRINT_IDS = ['sprint-001', 'sprint-002'];
        const DUMMY_REL_IDS = ['rel-001'];

        if (this._data.users) {
          this._data.users = this._data.users.filter(u => !DUMMY_EMAILS.includes(u.email) && !DUMMY_USER_IDS.includes(u.id));
        }
        if (this._data.members) {
          this._data.members = this._data.members.filter(m => !DUMMY_USER_IDS.includes(m.userId) && !DUMMY_EMAILS.includes(m.userEmail));
        }
        if (this._data.currentUser && (DUMMY_EMAILS.includes(this._data.currentUser.email) || DUMMY_USER_IDS.includes(this._data.currentUser.id))) {
          this._data.currentUser = null;
        }

        if (this._data.requirements) {
          this._data.requirements = this._data.requirements.filter(r => !DUMMY_REQ_IDS.includes(r.id));
        }
        if (this._data.requirementHistory) {
          this._data.requirementHistory = this._data.requirementHistory.filter(h => !DUMMY_REQ_IDS.includes(h.requirementId));
        }
        if (this._data.tasks) {
          this._data.tasks = this._data.tasks.filter(t => !DUMMY_TASK_IDS.includes(t.id));
        }
        if (this._data.testCases) {
          this._data.testCases = this._data.testCases.filter(t => !DUMMY_TC_IDS.includes(t.id));
        }
        if (this._data.testRuns) {
          this._data.testRuns = this._data.testRuns.filter(t => !DUMMY_TR_IDS.includes(t.id));
        }
        if (this._data.bugs) {
          this._data.bugs = this._data.bugs.filter(b => !DUMMY_BUG_IDS.includes(b.id));
        }
        if (this._data.sprints) {
          this._data.sprints = this._data.sprints.filter(s => !DUMMY_SPRINT_IDS.includes(s.id));
        }
        if (this._data.releases) {
          this._data.releases = this._data.releases.filter(r => !DUMMY_REL_IDS.includes(r.id));
        }

        if (!this._data.invitations) {
          this._data.invitations = [];
        } else {
          const nowMs = Date.now();
          this._data.invitations.forEach(inv => {
            if (inv.status === 'Pending' && new Date(inv.expiresAt).getTime() <= nowMs) {
              inv.status = 'Expired';
            }
          });
        }

        const migrate = (records, map) => (records || []).forEach(r => {
          if (map[r.status]) r.status = map[r.status];
        });
        migrate(this._data.requirements, LEGACY_STATUS_MAP.requirement);
        migrate(this._data.bugs, LEGACY_STATUS_MAP.bug);
        migrate(this._data.releases, LEGACY_STATUS_MAP.release);

        if (!this._data.activeProjectId && this._data.projects && this._data.projects.length > 0) {
          this._data.activeProjectId = this._data.projects[0].id;
        }
        this._save();

      } else {
        this._data = getDefaultData();
        this._save();
      }
    } catch {
      this._data = getDefaultData();
      this._save();
    }
    return this._data;
  }

  _save() {
    localStorage.setItem(STORE_KEY, JSON.stringify(this._data));
    this._listeners.forEach(fn => fn(this._data));
  }

  subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  resetData() {
    this._data = getDefaultData();
    this._save();
  }

  // ===== AUTH =====
  get currentUser() { return this._load().currentUser; }

  login(email, password) {
    const data = this._load();
    const cleanEmail = normalizeEmail(email);
    const user = data.users.find(u => normalizeEmail(u.email) === cleanEmail && u.password === password);
    if (!user) return { error: 'Invalid email or password' };
    data.currentUser = { id: user.id, name: user.name, email: user.email };
    this._save();
    return { data: data.currentUser };
  }

  register(name, email, password) {
    const data = this._load();
    const cleanEmail = (email || '').trim().toLowerCase();
    if (data.users.find(u => (u.email || '').toLowerCase() === cleanEmail)) return { error: 'Email already in use' };
    const user = { id: generateId(), name: name.trim(), email: cleanEmail, password, createdAt: now() };
    data.users.push(user);
    if (data.projects && data.projects.length > 0) {
      const activeProjId = data.activeProjectId || data.projects[0].id;
      const existingMembers = data.members.filter(m => m.projectId === activeProjId);
      const hasPendingInvite = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('pending_invite_token');
      if (existingMembers.length === 0 && data.users.length === 1 && !hasPendingInvite) {
        data.members.push({
          id: 'mem-' + generateId().slice(0, 8),
          projectId: activeProjId,
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          role: 'Owner',
          addedAt: now()
        });
      } else {
        const invited = data.members.find(m => m.projectId === activeProjId && m.userEmail && m.userEmail.toLowerCase() === cleanEmail);
        if (invited) {
          invited.userId = user.id;
          invited.userName = user.name;
        }
      }
    }
    data.currentUser = { id: user.id, name: user.name, email: user.email };
    this._save();
    return { data: data.currentUser };
  }

  logout() {
    const data = this._load();
    if (data.currentUser) {
      this.addAuditLog({
        type: 'AUTH_LOGOUT',
        title: `User Signed Out: ${data.currentUser.email}`,
        details: 'User terminated active session.',
        author: data.currentUser.name,
        icon: 'logout',
        color: 'text-text-muted'
      });
    }
    data.currentUser = null;
    this._save();
  }

  setFirebaseUser(fbUser) {
    if (!fbUser) {
      this.logout();
      return null;
    }
    const data = this._load();
    const email = normalizeEmail(fbUser.email || 'user@firebase.io');
    const userId = fbUser.uid || generateId();
    let user = data.users.find(u => u.id === userId || normalizeEmail(u.email) === email);

    if (!user) {
      user = {
        id: userId,
        name: fbUser.displayName || email.split('@')[0],
        email: email,
        photoURL: fbUser.photoURL || null,
        isFirebase: true,
        createdAt: now()
      };
      data.users.push(user);
    } else {
      const previousId = user.id;
      user.name = fbUser.displayName || user.name || email.split('@')[0];
      user.photoURL = fbUser.photoURL || user.photoURL || null;
      user.email = email;
      user.isFirebase = true;
      user.id = userId;

      // Firebase UIDs can differ from older local IDs. Migrate every reference so
      // project memberships and audit trails are not orphaned.
      if (previousId && previousId !== userId) {
        this._migrateUserReferences(data, previousId, userId, user.name, email);
      }
    }

    // Ensure project owner exists if no members yet, or link existing invitation
    if (data.projects && data.projects.length > 0) {
      const activeProjId = data.activeProjectId || data.projects[0].id;
      let member = data.members.find(m => m.projectId === activeProjId && memberMatchesUser(m, { id: userId, email }));
      if (!member) {
        const existingMembers = data.members.filter(m => m.projectId === activeProjId);
        const hasPendingInvite = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('pending_invite_token');
        // Only the workspace creator / initial user becomes Owner automatically.
        // Subsequent users who create accounts are registered users and must be explicitly added to teams.
        if (existingMembers.length === 0 && data.users.length === 1 && !hasPendingInvite) {
          data.members.push({
            id: 'mem-' + generateId().slice(0, 8),
            projectId: activeProjId,
            userId: userId,
            userName: user.name,
            userEmail: email,
            role: 'Owner',
            addedAt: now()
          });
        }
      } else {
        member.userId = userId;
        member.userName = user.name;
        member.userEmail = email;
      }
    }

    const isNewSession = data.currentUser?.id !== userId;
    data.currentUser = {
      id: userId,
      name: user.name,
      email: email,
      photoURL: user.photoURL || null,
      isFirebase: true,
      uid: userId
    };

    if (isNewSession) this.addAuditLog({
      type: 'FIREBASE_AUTH_LOGIN',
      title: `Firebase Real-time Login: ${user.email}`,
      details: `User authenticated via Firebase Realtime SDK (Provider: ${fbUser.providerData?.[0]?.providerId || 'password'}).`,
      author: user.name,
      icon: 'local_fire_department',
      color: 'text-amber-500'
    });

    this._save();
    return data.currentUser;
  }

  _migrateUserReferences(data, oldId, newId, name, email) {
    const replace = (record, field) => {
      if (record && record[field] === oldId) record[field] = newId;
    };

    (data.projects || []).forEach(p => replace(p, 'createdBy'));
    (data.requirements || []).forEach(r => replace(r, 'createdBy'));
    (data.requirementHistory || []).forEach(h => replace(h, 'changedBy'));
    (data.tasks || []).forEach(t => replace(t, 'assigneeId'));
    (data.testCases || []).forEach(tc => replace(tc, 'createdBy'));
    (data.testRuns || []).forEach(tr => replace(tr, 'executedBy'));
    (data.bugs || []).forEach(b => {
      replace(b, 'reporterId');
      replace(b, 'assigneeId');
    });
    (data.releases || []).forEach(r => replace(r, 'createdBy'));
    (data.invitations || []).forEach(inv => replace(inv, 'inviterId'));

    (data.members || []).forEach(m => {
      if (m.userId === oldId || (m.userEmail && normalizeEmail(m.userEmail) === email)) {
        m.userId = newId;
        m.userName = name;
        m.userEmail = email;
      }
    });

    // Collapse duplicate memberships that can result from the ID migration.
    const seenProjects = new Set();
    data.members = (data.members || []).filter(m => {
      if (m.userId !== newId) return true;
      if (seenProjects.has(m.projectId)) return false;
      seenProjects.add(m.projectId);
      return true;
    });
  }

  addAuditLog(entry) {
    const data = this._load();
    if (!data.auditLogs) data.auditLogs = [];
    data.auditLogs.unshift({
      id: generateId(),
      timestamp: now(),
      ...entry
    });
    if (data.auditLogs.length > 100) data.auditLogs = data.auditLogs.slice(0, 100);
    this._save();
  }

  getAuditLogs() {
    const data = this._load();
    return data.auditLogs || [];
  }

  getUser(id) {
    return this._load().users.find(u => u.id === id);
  }

  getAllUsers() {
    return this._load().users.map(u => ({ id: u.id, name: u.name, email: u.email, photoURL: u.photoURL }));
  }

  // ===== PROJECTS =====
  getProjects() {
    const data = this._load();
    if (!data.currentUser) return [];
    return data.projects.filter(p =>
      data.members.some(m => m.projectId === p.id && memberMatchesUser(m, data.currentUser))
    );
  }

  getProject(id) {
    return this._load().projects.find(p => p.id === id);
  }

  getActiveProjectId() {
    const data = this._load();
    const projects = this.getProjects();
    if (projects.length === 0) return null;
    if (!data.activeProjectId || !projects.some(p => p.id === data.activeProjectId)) {
      data.activeProjectId = projects[0].id;
      this._save();
    }
    return data.activeProjectId;
  }

  setActiveProjectId(id) {
    const data = this._load();
    data.activeProjectId = id;
    this._save();
  }

  getActiveProject() {
    const projects = this.getProjects();
    if (projects.length === 0) return null;
    const id = this.getActiveProjectId();
    return projects.find(p => p.id === id) || projects[0];
  }

  createProject({ name, key, description, startDate, endDate }) {
    const data = this._load();
    if (!data.currentUser) return { error: 'Not authenticated' };
    const cleanKey = (key || '').trim().toUpperCase();
    if (!name?.trim() || !/^[A-Z][A-Z0-9]{1,9}$/.test(cleanKey)) return { error: 'Project name and a 2-10 character alphanumeric key are required' };
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) return { error: 'Project start date must be before end date' };
    if (data.projects.find(p => (p.key || '').toUpperCase() === cleanKey)) return { error: 'Project key already exists' };
    const project = { id: generateId(), name: name.trim(), key: cleanKey, description, startDate, endDate, createdBy: data.currentUser.id, createdAt: now(), updatedAt: now() };
    data.projects.push(project);
    data.members.push({
      id: generateId(),
      projectId: project.id,
      userId: data.currentUser.id,
      userName: data.currentUser.name,
      userEmail: data.currentUser.email,
      role: 'Owner',
      addedAt: now()
    });
    data.activeProjectId = project.id;
    this._save();
    return { data: project };
  }

  updateProject(id, updates) {
    const data = this._load();
    const idx = data.projects.findIndex(p => p.id === id);
    if (idx === -1) return { error: 'Project not found' };
    const denied = this._deny(id, 'project.update');
    if (denied) return denied;
    const { id: _id, key: _key, createdBy: _cb, ...safe } = updates;
    data.projects[idx] = { ...data.projects[idx], ...safe, updatedAt: now() };
    this._save();
    return { data: data.projects[idx] };
  }

  // ===== MEMBERS =====
  getMembers(projectId) {
    const data = this._load();
    const seen = new Set();
    return data.members
      .filter(m => m.projectId === projectId)
      .filter(m => {
        const key = normalizeEmail(m.userEmail) || m.userId || m.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(m => {
        const user = data.users.find(u => u.id === m.userId || (u.email && m.userEmail && normalizeEmail(u.email) === normalizeEmail(m.userEmail)));
        return {
          ...m,
          userName: user?.name || m.userName || m.userEmail?.split('@')[0] || 'Team Member',
          userEmail: user?.email || m.userEmail || ''
        };
      });
  }

  addMember(projectId, email, role) {
    const data = this._load();
    if (!data.currentUser) return { error: 'Authentication required.' };

    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return { error: 'Please enter a valid email address.' };
    }

    const project = data.projects.find(p => p.id === projectId);
    if (!project) return { error: 'Project not found.' };

    const myRole = this.getUserRole(projectId);
    if (myRole !== 'Owner') {
      return { error: 'Forbidden: Only project owners can add team members.' };
    }

    const assignedRole = VALID_ROLES.includes(role) ? role : 'Developer';

    // Check if user is already a member of this project
    const isAlreadyMember = data.members.some(m =>
      m.projectId === projectId &&
      ((m.userEmail && normalizeEmail(m.userEmail) === cleanEmail) ||
       (m.userId && data.users.some(u => u.id === m.userId && u.email && normalizeEmail(u.email) === cleanEmail)))
    );

    if (isAlreadyMember) {
      return { error: ALREADY_MEMBER_MESSAGE };
    }

    // STRICT POLICY: Only users who have already signed up can be added to the project team
    const user = data.users.find(u => normalizeEmail(u.email) === cleanEmail);
    if (!user) {
      return { error: UNREGISTERED_USER_MESSAGE };
    }

    const member = {
      id: 'mem-' + generateId().slice(0, 8),
      projectId,
      userId: user.id,
      userName: user.name,
      userEmail: cleanEmail,
      role: assignedRole,
      addedVia: 'direct',
      addedAt: now()
    };
    data.members.push(member);

    this.addAuditLog({
      type: 'MEMBER_ADDED',
      title: `Team Member Added: ${user.name}`,
      details: `${user.email} was added directly to project [${project.key}] with role: ${member.role}`,
      author: data.currentUser?.name || 'Workspace Owner',
      icon: 'person_add',
      color: 'text-secondary'
    });

    this._save();
    return { data: { ...member, userName: user.name, userEmail: user.email } };
  }

  updateMemberRole(memberId, role) {
    const data = this._load();
    if (!data.currentUser) return { error: 'Authentication required.' };
    if (!VALID_ROLES.includes(role)) return { error: `Invalid project role: ${role}` };

    const member = data.members.find(m => m.id === memberId);
    if (!member) return { error: 'Member not found' };

    const myRole = this.getUserRole(member.projectId);
    if (myRole !== 'Owner') {
      return { error: 'Forbidden: Only project owners can change team roles.' };
    }

    if (member.role === 'Owner' && role !== 'Owner') {
      const owners = data.members.filter(m => m.projectId === member.projectId && m.role === 'Owner');
      if (owners.length <= 1) return { error: 'Cannot demote the last owner of this project' };
    }

    const oldRole = member.role;
    member.role = role;
    if (!member.userName || !member.userEmail) {
      const user = data.users.find(u => u.id === member.userId || (u.email && member.userEmail && normalizeEmail(u.email) === normalizeEmail(member.userEmail)));
      if (user) {
        member.userName = user.name;
        member.userEmail = user.email;
      }
    }

    this.addAuditLog({
      type: 'MEMBER_ROLE_CHANGED',
      title: `Project Role Changed: ${member.userName || member.userEmail}`,
      details: `${member.userEmail} role changed from ${oldRole} to ${role}`,
      author: data.currentUser.name,
      icon: 'manage_accounts',
      color: 'text-secondary'
    });

    this._save();
    return { data: member };
  }

  removeMember(memberId) {
    const data = this._load();
    if (!data.currentUser) return { error: 'Authentication required.' };

    const member = data.members.find(m => m.id === memberId);
    if (!member) return { error: 'Member not found' };

    const myRole = this.getUserRole(member.projectId);
    if (myRole !== 'Owner') {
      return { error: 'Forbidden: Only project owners can remove team members.' };
    }

    const owners = data.members.filter(m => m.projectId === member.projectId && m.role === 'Owner');
    if (member.role === 'Owner' && owners.length <= 1) return { error: 'Cannot remove the last owner' };

    data.members = data.members.filter(m => m.id !== memberId);

    this.addAuditLog({
      type: 'MEMBER_REMOVED',
      title: `Team Member Removed: ${member.userName || member.userEmail}`,
      details: `${member.userEmail} was removed from the project`,
      author: data.currentUser.name,
      icon: 'person_remove',
      color: 'text-status-defect'
    });

    this._save();
    return { data: true };
  }

  getUserRole(projectId) {
    const data = this._load();
    if (!projectId || !data.currentUser) return null;
    const m = data.members.find(m => m.projectId === projectId && memberMatchesUser(m, data.currentUser));
    return m ? m.role : null;
  }

  _deny(projectId, action) {
    if (!this._load().currentUser) return { error: 'Authentication required.' };
    const msg = permissionError(this.getUserRole(projectId), action);
    return msg ? { error: msg } : null;
  }

  // Referential integrity: linked records must exist inside the same project.
  _invalidLinks(projectId, collection, ids, label) {
    const records = this._load()[collection] || [];
    const bad = (ids || []).filter(Boolean).find(id => !records.some(r => r.id === id && r.projectId === projectId));
    return bad ? { error: `${label} '${bad}' does not belong to this project.` } : null;
  }

  // ===== INVITATIONS =====
  // Checks that need no registry lookup: auth, ownership, email format,
  // self-invite, existing membership and an already-pending invitation.
  validateInvitation(projectId, email) {
    const data = this._load();
    if (!data.currentUser) return { error: 'Authentication required.' };

    const project = data.projects.find(p => p.id === projectId);
    if (!project) return { error: 'Project not found.' };

    if (this.getUserRole(projectId) !== 'Owner') {
      return { error: INVITE_FORBIDDEN_MESSAGE };
    }

    const cleanEmail = normalizeEmail(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { error: INVALID_EMAIL_MESSAGE };
    }
    if (cleanEmail === normalizeEmail(data.currentUser.email)) {
      return { error: SELF_INVITE_MESSAGE };
    }

    const isAlreadyMember = data.members.some(m =>
      m.projectId === projectId &&
      ((m.userEmail && normalizeEmail(m.userEmail) === cleanEmail) ||
       (m.userId && data.users.some(u => u.id === m.userId && u.email && normalizeEmail(u.email) === cleanEmail)))
    );
    if (isAlreadyMember) return { error: ALREADY_MEMBER_MESSAGE };

    const nowMs = Date.now();
    const existingPending = (data.invitations || []).find(inv =>
      inv.projectId === projectId &&
      normalizeEmail(inv.inviteeEmail) === cleanEmail &&
      inv.status === 'Pending' &&
      new Date(inv.expiresAt).getTime() > nowMs
    );
    if (existingPending) return { error: PENDING_INVITATION_MESSAGE };

    return { data: { project, cleanEmail } };
  }

  // `invitee` is the shared-registry record for the email (see directory.js).
  // Without it, only accounts known to this browser count as registered.
  createInvitation(projectId, email, role, { invitee = null } = {}) {
    const check = this.validateInvitation(projectId, email);
    if (check.error) return check;
    const { project, cleanEmail } = check.data;
    const data = this._load();

    const localUser = data.users.find(u => normalizeEmail(u.email) === cleanEmail);
    const registered = invitee && normalizeEmail(invitee.email) === cleanEmail ? invitee : localUser;
    if (!registered) return { error: UNREGISTERED_USER_MESSAGE };

    const invitedRole = VALID_ROLES.includes(role) ? role : 'Developer';

    // Carry a roster snapshot in the token so a recipient on another device can
    // resolve the project team even though project data is stored per-browser.
    const team = this.getMembers(projectId)
      .filter(m => normalizeEmail(m.userEmail) && normalizeEmail(m.userEmail) !== cleanEmail)
      .map(m => ({ id: m.userId || null, name: m.userName, email: normalizeEmail(m.userEmail), role: m.role }));

    const invId = 'inv-' + generateId().slice(0, 8);
    const createdAt = now();
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS).toISOString();
    const token = encodeInviteToken({
      id: invId,
      projectId,
      projectName: project.name,
      projectKey: project.key,
      projectDesc: project.description || '',
      inviterId: data.currentUser.id,
      inviterName: data.currentUser.name,
      inviterEmail: data.currentUser.email,
      inviteeEmail: cleanEmail,
      role: invitedRole,
      team,
      expiresAt,
      createdAt
    });

    const invitation = {
      id: invId,
      projectId,
      projectName: project.name,
      projectKey: project.key,
      inviterId: data.currentUser.id,
      inviterName: data.currentUser.name,
      inviterEmail: normalizeEmail(data.currentUser.email),
      inviteeId: registered.id || null,
      inviteeName: registered.name || cleanEmail.split('@')[0],
      inviteeEmail: cleanEmail,
      role: invitedRole,
      status: 'Pending',
      token,
      expiresAt,
      createdAt
    };

    if (!data.invitations) data.invitations = [];
    data.invitations.unshift(invitation);

    this.addAuditLog({
      type: 'INVITATION_SENT',
      title: `Project Invitation Sent: ${cleanEmail}`,
      details: `Invited to project [${invitation.projectKey}] with role: ${invitation.role}`,
      author: data.currentUser.name,
      icon: 'send',
      color: 'text-secondary'
    });

    this._save();
    return { data: invitation };
  }

  // Rolls back a locally created invitation that could not be delivered.
  discardInvitation(invitationId) {
    const data = this._load();
    data.invitations = (data.invitations || []).filter(i => i.id !== invitationId);
    this._save();
  }

  // Merge an invitation delivered through the shared inbox. Returns true when
  // the local copy changed.
  syncRemoteInvitation(remote) {
    if (!remote?.id) return false;
    const data = this._load();
    let local = (data.invitations || []).find(i => i.id === remote.id);
    const existed = Boolean(local);
    if (!local && remote.token) local = this.getInvitationByToken(remote.token);
    if (!local) return false;
    const statusChanged = remote.status && remote.status !== 'Pending' && local.status !== remote.status;
    // The invitee responded (possibly on another of their devices, or this
    // device's own write echoing back): apply it fully so membership exists here too.
    const isInvitee = normalizeEmail(data.currentUser?.email) === normalizeEmail(local.inviteeEmail);
    if (statusChanged && isInvitee && local.status === 'Pending' && ['Accepted', 'Declined'].includes(remote.status)) {
      const res = remote.status === 'Accepted' ? this.acceptInvitation(local.id) : this.declineInvitation(local.id);
      if (!res.error) return true;
    }
    if (statusChanged) local.status = remote.status;
    if (!existed || statusChanged) this._save();
    return Boolean(!existed || statusChanged);
  }

  // Inviter side: reflect the invitee's Accept/Decline (or a revoke) from the
  // shared inbox, creating the membership locally when accepted.
  applyInvitationResponse(remote) {
    const data = this._load();
    const local = (data.invitations || []).find(i => i.id === remote?.id);
    if (!local || local.status === remote.status || remote.status === 'Pending') return null;
    local.status = remote.status;
    if (remote.status === 'Accepted') {
      local.acceptedAt = remote.respondedAt || now();
      const email = normalizeEmail(remote.inviteeEmail);
      const exists = data.members.some(m => m.projectId === remote.projectId &&
        (normalizeEmail(m.userEmail) === email || (remote.inviteeId && m.userId === remote.inviteeId)));
      if (!exists) {
        data.members.push({
          id: 'mem-' + generateId().slice(0, 8),
          projectId: remote.projectId,
          userId: remote.inviteeId || null,
          userName: remote.inviteeName || email.split('@')[0],
          userEmail: email,
          role: VALID_ROLES.includes(remote.role) ? remote.role : 'Developer',
          addedVia: 'invitation',
          addedAt: local.acceptedAt
        });
      }
      this.addAuditLog({
        type: 'INVITATION_ACCEPTED',
        title: `Team Member Joined: ${remote.inviteeName || email}`,
        details: `Accepted invitation to project [${remote.projectKey}] as ${remote.role}`,
        author: remote.inviteeName || email,
        icon: 'how_to_reg',
        color: 'text-status-passed'
      });
    }
    this._save();
    return local;
  }

  getProjectInvitations(projectId) {
    const data = this._load();
    return (data.invitations || []).filter(i => i.projectId === projectId);
  }

  getUserInvitations(email) {
    const data = this._load();
    const clean = normalizeEmail(email || data.currentUser?.email);
    if (!clean) return [];
    return (data.invitations || []).filter(i => normalizeEmail(i.inviteeEmail) === clean);
  }

  getPendingInvitationsCount(email) {
    const invs = this.getUserInvitations(email);
    const nowMs = Date.now();
    return invs.filter(i => i.status === 'Pending' && new Date(i.expiresAt).getTime() > nowMs).length;
  }

  getInvitationByToken(token) {
    const data = this._load();
    if (!token || typeof token !== 'string') return null;
    const clean = decodeURIComponent(token).trim();
    let inv = (data.invitations || []).find(i => i.token === clean || i.token === token);

    // If not found in local store, try decoding self-describing token across devices
    if (!inv) {
      const decoded = decodeInviteToken(clean);
      if (decoded) {
        inv = (data.invitations || []).find(i => i.id === decoded.id || i.token === clean);
        if (!inv) {
          const isExp = new Date(decoded.expiresAt).getTime() <= Date.now();
          inv = {
            id: decoded.id || ('inv-' + generateId().slice(0, 8)),
            projectId: decoded.projectId,
            projectName: decoded.projectName || 'DevTrack Platform',
            projectKey: decoded.projectKey || 'DEV',
            inviterId: decoded.inviterId || '',
            inviterName: decoded.inviterName || 'Project Lead',
            inviterEmail: decoded.inviterEmail || 'lead@devtrack.io',
            inviteeEmail: decoded.inviteeEmail,
            role: VALID_ROLES.includes(decoded.role) ? decoded.role : 'Developer',
            status: isExp ? 'Expired' : 'Pending',
            token: clean,
            expiresAt: decoded.expiresAt,
            createdAt: decoded.createdAt || now()
          };
          if (!data.invitations) data.invitations = [];
          data.invitations.unshift(inv);
        }

        // Ensure project stub exists in local store so project details can be resolved
        if (decoded.projectId) {
          if (!data.projects) data.projects = [];
          let proj = data.projects.find(p => p.id === decoded.projectId);
          if (!proj) {
            proj = {
              id: decoded.projectId,
              name: decoded.projectName || 'DevTrack Project',
              key: decoded.projectKey || 'DEV',
              description: decoded.projectDesc || 'Shared Project Workspace',
              createdAt: decoded.createdAt || now(),
              updatedAt: decoded.createdAt || now()
            };
            data.projects.push(proj);
          }
          this._hydrateInvitationTeam(data, decoded);
        }
        this._save();
      }
    }

    if (inv && inv.status === 'Pending' && new Date(inv.expiresAt).getTime() <= Date.now()) {
      inv.status = 'Expired';
      this._save();
    }
    return inv || null;
  }

  _hydrateInvitationTeam(data, decoded) {
    if (!decoded || !decoded.projectId) return;
    if (!data.members) data.members = [];

    const projectId = decoded.projectId;
    const addedAt = decoded.createdAt || now();

    const addRosterMember = (entry, fallbackRole = 'Developer') => {
      const email = normalizeEmail(entry.email);
      if (!email) return;
      const exists = data.members.some(m =>
        m.projectId === projectId &&
        (normalizeEmail(m.userEmail) === email || (entry.id && m.userId === entry.id))
      );
      if (exists) return;

      data.members.push({
        id: 'mem-' + generateId().slice(0, 8),
        projectId,
        userId: entry.id || null,
        userName: entry.name || email.split('@')[0],
        userEmail: email,
        role: VALID_ROLES.includes(entry.role) ? entry.role : fallbackRole,
        addedVia: 'invite-snapshot',
        addedAt
      });
    };

    (decoded.team || []).forEach(entry => addRosterMember(entry));

    // Older invitation tokens have no roster snapshot. At minimum preserve the
    // inviter as the project Owner so the recipient does not see an empty team.
    if (decoded.inviterEmail) {
      addRosterMember({
        id: decoded.inviterId || ('inviter-' + normalizeEmail(decoded.inviterEmail).replace(/[^a-z0-9]/g, '-')),
        name: decoded.inviterName || 'Project Lead',
        email: decoded.inviterEmail,
        role: 'Owner'
      }, 'Owner');
    }
  }

  getInvitation(id) {
    const data = this._load();
    if (!id) return null;
    let inv = (data.invitations || []).find(i => i.id === id || i.token === id);
    if (!inv && typeof id === 'string' && id.startsWith('inv_')) {
      inv = this.getInvitationByToken(id);
    }
    return inv || null;
  }

  // Validates that the signed-in user may respond to an invitation, without
  // changing anything. Used before the shared inbox is updated.
  checkInvitationResponse(idOrToken, action = 'accept') {
    const data = this._load();
    if (!data.currentUser) {
      return { error: 'Authentication required. Please sign in or create an account to respond to this invitation.' };
    }

    // STRICT POLICY: Only users who have signed up can join
    if (action === 'accept' && !isRegisteredUser(data, data.currentUser)) {
      return { error: 'Only signed-up users can join a project. Please create an account or sign in first.' };
    }

    const inv = this.getInvitationByToken(idOrToken) || (data.invitations || []).find(i => i.id === idOrToken || i.token === idOrToken);
    if (!inv) return { error: 'Invitation not found or invalid token.' };

    if (normalizeEmail(data.currentUser.email) !== normalizeEmail(inv.inviteeEmail)) {
      return {
        error: `This invitation was issued to "${inv.inviteeEmail}". You are currently signed in as "${data.currentUser.email}". Please switch to the invited account.`
      };
    }

    if (inv.status === 'Pending' && new Date(inv.expiresAt).getTime() <= Date.now()) {
      inv.status = 'Expired';
      this._save();
    }
    if (inv.status === 'Expired') {
      return { error: 'This invitation has expired. Please ask the project owner for a new invitation.' };
    }

    if (inv.status !== 'Pending') {
      return { error: `This invitation has already been ${inv.status.toLowerCase()}.` };
    }
    return { data: inv };
  }

  acceptInvitation(idOrToken) {
    const check = this.checkInvitationResponse(idOrToken, 'accept');
    if (check.error) return check;
    const inv = check.data;
    const data = this._load();

    // Check if already a member
    const isAlreadyMember = data.members.some(m =>
      m.projectId === inv.projectId && memberMatchesUser(m, data.currentUser)
    );
    if (isAlreadyMember) {
      inv.status = 'Accepted';
      this._save();
      return { error: 'You are already a member of this project.' };
    }

    // CREATE PROJECT MEMBERSHIP UPON EXPLICIT ACCEPTANCE
    const member = {
      id: 'mem-' + generateId().slice(0, 8),
      projectId: inv.projectId,
      userId: data.currentUser.id,
      userName: data.currentUser.name,
      userEmail: normalizeEmail(data.currentUser.email),
      role: VALID_ROLES.includes(inv.role) ? inv.role : 'Developer',
      addedVia: 'invitation',
      addedAt: now()
    };
    data.members.push(member);
    inv.status = 'Accepted';
    inv.acceptedAt = now();
    data.activeProjectId = inv.projectId;

    this.addAuditLog({
      type: 'INVITATION_ACCEPTED',
      title: `Team Member Joined: ${data.currentUser.name}`,
      details: `Accepted invitation to project [${inv.projectKey}] as ${member.role}`,
      author: data.currentUser.name,
      icon: 'how_to_reg',
      color: 'text-status-passed'
    });

    this._save();
    return { data: { invitation: inv, membership: member } };
  }

  declineInvitation(idOrToken) {
    const check = this.checkInvitationResponse(idOrToken, 'decline');
    if (check.error) return check;
    const inv = check.data;
    const data = this._load();

    // EXPLICIT DECLINE: DO NOT CREATE MEMBERSHIP!
    inv.status = 'Declined';
    inv.declinedAt = now();

    this.addAuditLog({
      type: 'INVITATION_DECLINED',
      title: `Invitation Declined: ${data.currentUser.name}`,
      details: `Declined invitation to project [${inv.projectKey}]`,
      author: data.currentUser.name,
      icon: 'person_cancel',
      color: 'text-text-muted'
    });

    this._save();
    return { data: inv };
  }

  revokeInvitation(invitationId) {
    const data = this._load();
    if (!data.currentUser) return { error: 'Authentication required.' };

    const inv = (data.invitations || []).find(i => i.id === invitationId);
    if (!inv) return { error: 'Invitation not found.' };

    const myRole = this.getUserRole(inv.projectId);
    if (myRole !== 'Owner') {
      return { error: 'Forbidden: Only project owners can revoke invitations.' };
    }
    if (inv.status !== 'Pending') {
      return { error: `Invitation has already been ${inv.status.toLowerCase()}.` };
    }

    inv.status = 'Revoked';
    inv.revokedAt = now();
    this._save();
    return { data: inv };
  }


  // ===== REQUIREMENTS =====
  getRequirements(projectId, filters = {}) {
    const data = this._load();
    let reqs = data.requirements.filter(r => r.projectId === projectId);
    if (filters.priority) reqs = reqs.filter(r => r.priority === filters.priority);
    if (filters.status) reqs = reqs.filter(r => r.status === filters.status);
    if (filters.search) {
      const s = filters.search.toLowerCase();
      reqs = reqs.filter(r => r.title.toLowerCase().includes(s) || (r.description || '').toLowerCase().includes(s));
    }
    return reqs;
  }

  getRequirement(id) { return this._load().requirements.find(r => r.id === id); }

  _validateRequirement(projectId, reqData) {
    if (reqData.title !== undefined && !String(reqData.title).trim()) return { error: 'Requirement title is required.' };
    if (reqData.priority !== undefined && !isValidPriority(reqData.priority)) return { error: `Invalid MoSCoW priority: ${reqData.priority}` };
    if (reqData.status !== undefined && !REQUIREMENT_STATUSES.includes(reqData.status)) return { error: `Invalid requirement status: ${reqData.status}` };
    if (reqData.targetRelease) return this._invalidLinks(projectId, 'releases', [reqData.targetRelease], 'Release');
    return null;
  }

  createRequirement(projectId, reqData) {
    const data = this._load();
    const denied = this._deny(projectId, 'requirement.write');
    if (denied) return denied;
    const input = { priority: 'Must', status: 'Draft', ...reqData };
    if (!input.title) return { error: 'Requirement title is required.' };
    const invalid = this._validateRequirement(projectId, input);
    if (invalid) return invalid;
    const req = { id: generateId(), projectId, ...input, title: input.title.trim(), createdBy: data.currentUser.id, createdAt: now(), updatedAt: now() };
    data.requirements.push(req);
    data.requirementHistory.push({
      id: generateId(), requirementId: req.id, field: 'status',
      oldValue: '', newValue: req.status, changedBy: data.currentUser.id, changedAt: now()
    });
    this.addAuditLog({ type: 'REQUIREMENT_CREATED', title: `Requirement Created: ${req.title}`, details: `[${req.priority}] ${req.status}`, author: data.currentUser.name, icon: 'rule', color: 'text-primary' });
    this._save();
    return { data: req };
  }

  updateRequirement(id, updates) {
    const data = this._load();
    const idx = data.requirements.findIndex(r => r.id === id);
    if (idx === -1) return { error: 'Requirement not found' };
    const old = data.requirements[idx];
    const denied = this._deny(old.projectId, 'requirement.write');
    if (denied) return denied;
    const invalid = this._validateRequirement(old.projectId, updates);
    if (invalid) return invalid;
    const { id: _id, projectId: _pid, ...safe } = updates;
    // Record history for meaningful changes (append-only)
    const changed = REQUIREMENT_HISTORY_FIELDS.filter(field => safe[field] !== undefined && safe[field] !== old[field]);
    changed.forEach(field => {
      data.requirementHistory.push({
        id: generateId(), requirementId: id, field,
        oldValue: old[field] || '', newValue: safe[field],
        changedBy: data.currentUser.id, changedAt: now()
      });
    });
    data.requirements[idx] = { ...old, ...safe, updatedAt: now() };
    if (changed.length) {
      this.addAuditLog({ type: 'REQUIREMENT_UPDATED', title: `Requirement Updated: ${data.requirements[idx].title}`, details: `Changed: ${changed.join(', ')}`, author: data.currentUser.name, icon: 'edit_note', color: 'text-primary' });
    }
    this._save();
    return { data: data.requirements[idx] };
  }

  archiveRequirement(id) {
    return this.updateRequirement(id, { status: 'Rejected' });
  }

  getRequirementHistory(reqId) {
    const data = this._load();
    return data.requirementHistory.filter(h => h.requirementId === reqId).sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt));
  }

  // ===== SPRINTS =====
  getSprints(projectId) {
    return this._load().sprints.filter(s => s.projectId === projectId);
  }

  createSprint(projectId, sprintData) {
    const data = this._load();
    const denied = this._deny(projectId, 'sprint.write');
    if (denied) return denied;
    if (!sprintData.name?.trim()) return { error: 'Sprint name is required.' };
    const dates = validateSprintDates(sprintData.startDate, sprintData.endDate);
    if (!dates.valid) return { error: dates.reason };
    const status = sprintData.status || 'Planned';
    if (!SPRINT_STATUSES.includes(status)) return { error: `Invalid sprint status: ${status}` };
    if (status === 'Active') {
      const active = data.sprints.find(s => s.projectId === projectId && s.status === 'Active');
      if (active) return { error: 'Only one active sprint allowed per project' };
    }
    const sprint = { id: generateId(), projectId, ...sprintData, status, createdAt: now() };
    data.sprints.push(sprint);
    this._save();
    return { data: sprint };
  }

  updateSprint(id, updates) {
    const data = this._load();
    const idx = data.sprints.findIndex(s => s.id === id);
    if (idx === -1) return { error: 'Sprint not found' };
    const denied = this._deny(data.sprints[idx].projectId, 'sprint.write');
    if (denied) return denied;
    if (updates.status !== undefined && !SPRINT_STATUSES.includes(updates.status)) return { error: `Invalid sprint status: ${updates.status}` };
    const merged = { ...data.sprints[idx], ...updates };
    const dates = validateSprintDates(merged.startDate, merged.endDate);
    if (!dates.valid) return { error: dates.reason };
    if (updates.status === 'Active') {
      const active = data.sprints.find(s => s.projectId === data.sprints[idx].projectId && s.status === 'Active' && s.id !== id);
      if (active) return { error: 'Only one active sprint allowed per project' };
    }
    data.sprints[idx] = merged;
    this._save();
    return { data: data.sprints[idx] };
  }

  // ===== TASKS =====
  getTasks(projectId, filters = {}) {
    const data = this._load();
    let tasks = data.tasks.filter(t => t.projectId === projectId);
    if (filters.status) tasks = tasks.filter(t => t.status === filters.status);
    if (filters.assigneeId) tasks = tasks.filter(t => t.assigneeId === filters.assigneeId);
    if (filters.sprintId) tasks = tasks.filter(t => t.sprintId === filters.sprintId);
    if (filters.priority) tasks = tasks.filter(t => t.priority === filters.priority);
    return tasks;
  }

  getTask(id) { return this._load().tasks.find(t => t.id === id); }

  createTask(projectId, taskData) {
    const data = this._load();
    const denied = this._deny(projectId, 'task.write');
    if (denied) return denied;
    if (!taskData.title?.trim()) return { error: 'Task title is required.' };
    const status = taskData.status || (taskData.sprintId ? 'To Do' : 'Backlog');
    if (!TASK_STATUSES.includes(status)) return { error: `Invalid task status: ${status}` };
    const invalid = this._invalidLinks(projectId, 'requirements', taskData.requirementIds, 'Requirement')
      || this._invalidLinks(projectId, 'sprints', [taskData.sprintId], 'Sprint');
    if (invalid) return invalid;
    const task = { id: generateId(), projectId, ...taskData, status, requirementIds: taskData.requirementIds || [], createdBy: data.currentUser.id, createdAt: now(), updatedAt: now() };
    data.tasks.push(task);
    this._save();
    return { data: task };
  }

  updateTask(id, updates) {
    const data = this._load();
    const idx = data.tasks.findIndex(t => t.id === id);
    if (idx === -1) return { error: 'Task not found' };
    const task = data.tasks[idx];
    const denied = this._deny(task.projectId, 'task.write');
    if (denied) return denied;
    if (updates.status !== undefined && updates.status !== task.status && !canTransitionTask(task.status, updates.status)) {
      return { error: `Invalid Kanban transition: ${task.status} → ${updates.status}` };
    }
    const invalid = this._invalidLinks(task.projectId, 'requirements', updates.requirementIds, 'Requirement')
      || this._invalidLinks(task.projectId, 'sprints', [updates.sprintId], 'Sprint');
    if (invalid) return invalid;
    const { id: _id, projectId: _pid, ...safe } = updates;
    data.tasks[idx] = { ...task, ...safe, updatedAt: now() };
    this._save();
    return { data: data.tasks[idx] };
  }

  // ===== TEST CASES =====
  getTestCases(projectId) { return this._load().testCases.filter(tc => tc.projectId === projectId); }
  getTestCase(id) { return this._load().testCases.find(tc => tc.id === id); }

  createTestCase(projectId, tcData) {
    const data = this._load();
    const denied = this._deny(projectId, 'testcase.write');
    if (denied) return denied;
    if (!tcData.title?.trim()) return { error: 'Test case title is required.' };
    if (tcData.type !== undefined && !TEST_TYPES.includes(tcData.type)) return { error: `Invalid test type: ${tcData.type}` };
    const invalid = this._invalidLinks(projectId, 'requirements', tcData.requirementIds, 'Requirement');
    if (invalid) return invalid;
    const tc = { id: generateId(), projectId, ...tcData, requirementIds: tcData.requirementIds || [], status: 'Active', createdBy: data.currentUser.id, createdAt: now() };
    data.testCases.push(tc);
    this._save();
    return { data: tc };
  }

  updateTestCase(id, updates) {
    const data = this._load();
    const idx = data.testCases.findIndex(tc => tc.id === id);
    if (idx === -1) return { error: 'Test case not found' };
    const denied = this._deny(data.testCases[idx].projectId, 'testcase.write');
    if (denied) return denied;
    const invalid = this._invalidLinks(data.testCases[idx].projectId, 'requirements', updates.requirementIds, 'Requirement');
    if (invalid) return invalid;
    const { id: _id, projectId: _pid, ...safe } = updates;
    data.testCases[idx] = { ...data.testCases[idx], ...safe };
    this._save();
    return { data: data.testCases[idx] };
  }

  // ===== TEST RUNS (append-only) =====
  getTestRuns(testCaseId) {
    return this._load().testRuns.filter(tr => tr.testCaseId === testCaseId).sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt));
  }

  getTestRunsByProject(projectId) {
    return this._load().testRuns.filter(tr => tr.projectId === projectId).sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt));
  }

  createTestRun(testCaseId, runData) {
    const data = this._load();
    const tc = data.testCases.find(t => t.id === testCaseId);
    if (!tc) return { error: 'Test case not found' };
    const denied = this._deny(tc.projectId, 'testrun.create');
    if (denied) return denied;
    if (!TEST_RESULTS.includes(runData.result)) return { error: `Invalid test result: ${runData.result}` };
    const run = { id: generateId(), testCaseId, projectId: tc.projectId, result: runData.result, notes: runData.notes || '', executedBy: data.currentUser.id, executedAt: now() };
    data.testRuns.push(run);
    this.addAuditLog({ type: 'TEST_RUN_RECORDED', title: `Test Run ${run.result}: ${tc.title}`, details: run.notes || 'No output logs.', author: data.currentUser.name, icon: 'science', color: run.result === 'Passed' ? 'text-status-passed' : 'text-status-defect' });
    this._save();
    return { data: run };
  }

  // ===== BUGS =====
  getBugs(projectId, filters = {}) {
    const data = this._load();
    let bugs = data.bugs.filter(b => b.projectId === projectId);
    if (filters.status) bugs = bugs.filter(b => b.status === filters.status);
    if (filters.severity) bugs = bugs.filter(b => b.severity === filters.severity);
    if (filters.priority) bugs = bugs.filter(b => b.priority === filters.priority);
    if (filters.assigneeId) bugs = bugs.filter(b => b.assigneeId === filters.assigneeId);
    return bugs;
  }

  getBug(id) { return this._load().bugs.find(b => b.id === id); }

  createBug(projectId, bugData) {
    const data = this._load();
    const denied = this._deny(projectId, 'bug.create');
    if (denied) return denied;
    if (!bugData.title?.trim()) return { error: 'Bug title is required.' };
    if (!isValidSeverity(bugData.severity)) return { error: `Invalid defect severity: ${bugData.severity}` };
    const invalid = this._invalidLinks(projectId, 'requirements', [bugData.relatedRequirementId], 'Requirement')
      || this._invalidLinks(projectId, 'testRuns', [bugData.relatedTestRunId], 'Test run');
    if (invalid) return invalid;
    if (bugData.relatedTestRunId) {
      const run = data.testRuns.find(tr => tr.id === bugData.relatedTestRunId);
      if (run.result !== 'Failed') return { error: 'Defects can only be filed against a Failed test run.' };
    }
    const bug = { id: generateId(), projectId, ...bugData, status: 'Open', reporterId: data.currentUser.id, createdAt: now(), updatedAt: now() };
    data.bugs.push(bug);
    this.addAuditLog({ type: 'BUG_FILED', title: `Defect Filed: ${bug.title}`, details: `[${bug.severity}] Open`, author: data.currentUser.name, icon: 'pest_control', color: 'text-status-defect' });
    this._save();
    return { data: bug };
  }

  updateBug(id, updates) {
    const data = this._load();
    const idx = data.bugs.findIndex(b => b.id === id);
    if (idx === -1) return { error: 'Bug not found' };
    const bug = data.bugs[idx];
    const role = this.getUserRole(bug.projectId);
    const denied = this._deny(bug.projectId, 'bug.update');
    if (denied) return denied;
    if (updates.severity !== undefined && !isValidSeverity(updates.severity)) return { error: `Invalid defect severity: ${updates.severity}` };
    if (updates.status !== undefined && updates.status !== bug.status) {
      if (!canTransitionBug(bug.status, updates.status)) return { error: `Invalid defect transition: ${bug.status} → ${updates.status}` };
      if (BUG_VERIFY_STATES.includes(updates.status) && !can(role, 'bug.verify')) {
        return { error: `Forbidden: Only Owners and Testers can move a defect to ${updates.status}.` };
      }
    }
    const { id: _id, projectId: _pid, reporterId: _r, ...safe } = updates;
    data.bugs[idx] = { ...bug, ...safe, updatedAt: now() };
    if (safe.status && safe.status !== bug.status) {
      this.addAuditLog({ type: 'BUG_STATUS_CHANGED', title: `Defect ${bug.status} → ${safe.status}: ${bug.title}`, details: `Severity ${bug.severity}`, author: data.currentUser.name, icon: 'pest_control', color: 'text-status-defect' });
    }
    this._save();
    return { data: data.bugs[idx] };
  }

  // ===== RELEASES =====
  getReleases(projectId) { return this._load().releases.filter(r => r.projectId === projectId); }
  getRelease(id) { return this._load().releases.find(r => r.id === id); }

  createRelease(projectId, relData) {
    const data = this._load();
    const denied = this._deny(projectId, 'release.write');
    if (denied) return denied;
    if (!isValidReleaseName(relData.name)) return { error: 'Release name must start with a SemVer version, e.g. v1.0.0' };
    const status = relData.status || 'Planning';
    if (!RELEASE_STATUSES.includes(status)) return { error: `Invalid release status: ${status}` };
    const rel = { id: generateId(), projectId, ...relData, name: relData.name.trim(), status, createdBy: data.currentUser.id, createdAt: now(), updatedAt: now() };
    data.releases.push(rel);
    this.addAuditLog({ type: 'RELEASE_CREATED', title: `Release Gate Created: ${rel.name}`, details: `Status ${rel.status}`, author: data.currentUser.name, icon: 'rocket_launch', color: 'text-status-release' });
    this._save();
    return { data: rel };
  }

  updateRelease(id, updates) {
    const data = this._load();
    const idx = data.releases.findIndex(r => r.id === id);
    if (idx === -1) return { error: 'Release not found' };
    const denied = this._deny(data.releases[idx].projectId, 'release.write');
    if (denied) return denied;
    if (updates.status !== undefined && !RELEASE_STATUSES.includes(updates.status)) return { error: `Invalid release status: ${updates.status}` };
    if (updates.name !== undefined && !isValidReleaseName(updates.name)) return { error: 'Release name must start with a SemVer version, e.g. v1.0.0' };
    const { id: _id, projectId: _pid, ...safe } = updates;
    if (safe.status === 'Released' && !safe.actualDate && !data.releases[idx].actualDate) {
      safe.actualDate = new Date().toISOString().split('T')[0];
    }
    const prevStatus = data.releases[idx].status;
    data.releases[idx] = { ...data.releases[idx], ...safe, updatedAt: now() };
    if (safe.status && safe.status !== prevStatus) {
      this.addAuditLog({ type: 'RELEASE_STATUS_CHANGED', title: `Release ${prevStatus} → ${safe.status}: ${data.releases[idx].name}`, details: 'Release gate status updated.', author: data.currentUser.name, icon: 'rocket_launch', color: 'text-status-release' });
    }
    this._save();
    return { data: data.releases[idx] };
  }

  // ===== DASHBOARD =====
  getDashboard(projectId) {
    const data = this._load();
    const reqs = data.requirements.filter(r => r.projectId === projectId);
    const tasks = data.tasks.filter(t => t.projectId === projectId);
    const runs = data.testRuns.filter(tr => tr.projectId === projectId);
    const bugs = data.bugs.filter(b => b.projectId === projectId);
    const releases = data.releases.filter(r => r.projectId === projectId);
    const sprints = data.sprints.filter(s => s.projectId === projectId);
    const activeSprint = sprints.find(s => s.status === 'Active');

    return {
      requirements: { total: reqs.length, byStatus: countBy(reqs, 'status') },
      tasks: { total: tasks.length, byStatus: countBy(tasks, 'status') },
      testRuns: { total: runs.length, passed: runs.filter(r => r.result === 'Passed').length, failed: runs.filter(r => r.result === 'Failed').length, blocked: runs.filter(r => r.result === 'Blocked').length },
      bugs: { total: bugs.length, bySeverity: countBy(bugs, 'severity'), open: bugs.filter(b => !BUG_RESOLVED_STATES.includes(b.status)).length },
      releases: { total: releases.length, planned: releases.filter(r => r.status !== 'Released').length, released: releases.filter(r => r.status === 'Released').length },
      activeSprint: activeSprint ? { name: activeSprint.name, goal: activeSprint.goal, startDate: activeSprint.startDate, endDate: activeSprint.endDate, taskCount: tasks.filter(t => t.sprintId === activeSprint.id).length } : null,
    };
  }

  // ===== TRACEABILITY =====
  getTraceability(projectId) {
    const data = this._load();
    const inProject = list => (list || []).filter(x => x.projectId === projectId);
    return buildTraceability({
      requirements: inProject(data.requirements),
      tasks: inProject(data.tasks),
      testCases: inProject(data.testCases),
      testRuns: inProject(data.testRuns),
      bugs: inProject(data.bugs),
      releases: inProject(data.releases)
    });
  }
}

function countBy(arr, field) {
  return arr.reduce((acc, item) => {
    const key = item[field] || 'Unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

export const store = new Store();

// Keep multiple tabs of the same browser in sync. localStorage is shared per
// origin, so a membership accepted in the invitee tab should immediately
// refresh the owner's roster in another tab.
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORE_KEY) return;
    try {
      store._data = event.newValue ? JSON.parse(event.newValue) : null;
      if (!store._data) store._data = getDefaultData();
      store._listeners.forEach(fn => fn(store._data));
      window.dispatchEvent(new Event('devtrack:store-sync'));
    } catch {
      // Ignore malformed cross-tab payloads and keep the current state.
    }
  });
}

export { generateId };
