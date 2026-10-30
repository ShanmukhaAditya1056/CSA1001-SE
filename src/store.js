// DevTrack LocalStorage-based Data Store
// Simulates a backend with full CRUD for all entities

const STORE_KEY = 'devtrack_store';
const VALID_ROLES = ['Owner', 'Developer', 'Tester', 'Viewer'];

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
}

function now() { return new Date().toISOString(); }

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
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
    const raw = clean.slice(4);
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
    return {
      id: d.id,
      projectId: d.pid,
      projectName: d.pname,
      projectKey: d.pkey,
      projectDesc: d.pdesc,
      inviterId: d.iid || '',
      inviterName: d.iname,
      inviterEmail: d.iemail,
      inviteeEmail: d.email,
      role: d.role,
      team: Array.isArray(d.team) ? d.team : [],
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
    const user = data.users.find(u => u.email === email && u.password === password);
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

    data.currentUser = {
      id: userId,
      name: user.name,
      email: email,
      photoURL: user.photoURL || null,
      isFirebase: true,
      uid: userId
    };

    this.addAuditLog({
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
    if (data.projects.find(p => p.key === key)) return { error: 'Project key already exists' };
    const project = { id: generateId(), name, key: key.toUpperCase(), description, startDate, endDate, createdBy: data.currentUser.id, createdAt: now(), updatedAt: now() };
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
    data.projects[idx] = { ...data.projects[idx], ...updates, updatedAt: now() };
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
      return { error: `User with email "${cleanEmail}" is already a member of this project.` };
    }

    // STRICT POLICY: Only users who have already signed up can be added to the project team
    const user = data.users.find(u => normalizeEmail(u.email) === cleanEmail);
    if (!user) {
      return {
        error: `No registered account found for "${cleanEmail}". Only users who have already signed up can be added to the team. Please send them an invitation link so they can create an account and join.`
      };
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

  // ===== INVITATIONS =====
  createInvitation(projectId, email, role) {
    const data = this._load();
    if (!data.currentUser) return { error: 'Authentication required.' };

    const project = data.projects.find(p => p.id === projectId);
    if (!project) return { error: 'Project not found.' };

    const myRole = this.getUserRole(projectId);
    if (myRole !== 'Owner') {
      return { error: 'Forbidden: Only project owners can invite new members.' };
    }

    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return { error: 'Please enter a valid email address.' };
    }

    const invitedRole = VALID_ROLES.includes(role) ? role : 'Developer';

    // Check if user is already an active member of this project
    const isAlreadyMember = data.members.some(m =>
      m.projectId === projectId &&
      ((m.userEmail && normalizeEmail(m.userEmail) === cleanEmail) ||
       (m.userId && data.users.some(u => u.id === m.userId && u.email && normalizeEmail(u.email) === cleanEmail)))
    );

    if (isAlreadyMember) {
      return { error: `User with email "${cleanEmail}" is already an active member of this project.` };
    }

    // Check if there is already an active pending invitation
    if (!data.invitations) data.invitations = [];
    const nowMs = Date.now();
    const existingPending = data.invitations.find(inv =>
      inv.projectId === projectId &&
      normalizeEmail(inv.inviteeEmail) === cleanEmail &&
      inv.status === 'Pending' &&
      new Date(inv.expiresAt).getTime() > nowMs
    );

    if (existingPending) {
      return { error: `A pending invitation has already been sent to "${cleanEmail}".` };
    }

    // Carry a roster snapshot in the token so a recipient on another device can
    // resolve the project team even though project data is stored per-browser.
    const team = this.getMembers(projectId)
      .filter(m => normalizeEmail(m.userEmail) && normalizeEmail(m.userEmail) !== cleanEmail)
      .map(m => ({ id: m.userId || null, name: m.userName, email: normalizeEmail(m.userEmail), role: m.role }));

    const invId = 'inv-' + generateId().slice(0, 8);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
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
      createdAt: now()
    });

    const invitation = {
      id: invId,
      projectId,
      projectName: project.name,
      projectKey: project.key,
      inviterId: data.currentUser.id,
      inviterName: data.currentUser.name,
      inviterEmail: data.currentUser.email,
      inviteeEmail: cleanEmail,
      role: invitedRole,
      status: 'Pending',
      token,
      expiresAt,
      createdAt: now()
    };

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

  acceptInvitation(idOrToken) {
    const data = this._load();
    if (!data.currentUser) {
      return { error: 'Authentication required. Please sign in or create an account to accept this invitation.' };
    }

    // STRICT POLICY: Only users who have signed up can join
    if (!isRegisteredUser(data, data.currentUser)) {
      return { error: 'Only signed-up users can join a project. Please create an account or sign in first.' };
    }

    const inv = this.getInvitationByToken(idOrToken) || (data.invitations || []).find(i => i.id === idOrToken || i.token === idOrToken);
    if (!inv) return { error: 'Invitation not found or invalid token.' };

    if (new Date(inv.expiresAt).getTime() <= Date.now()) {
      inv.status = 'Expired';
      this._save();
      return { error: 'This invitation has expired. Please ask the project owner for a new invitation.' };
    }

    if (normalizeEmail(data.currentUser.email) !== normalizeEmail(inv.inviteeEmail)) {
      return {
        error: `This invitation was issued to "${inv.inviteeEmail}". You are currently signed in as "${data.currentUser.email}". Please switch to the invited account.`
      };
    }

    if (inv.status !== 'Pending') {
      return { error: `This invitation has already been ${inv.status.toLowerCase()}.` };
    }

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
    const data = this._load();
    if (!data.currentUser) return { error: 'Authentication required.' };

    const inv = this.getInvitationByToken(idOrToken) || (data.invitations || []).find(i => i.id === idOrToken || i.token === idOrToken);
    if (!inv) return { error: 'Invitation not found.' };

    if (normalizeEmail(data.currentUser.email) !== normalizeEmail(inv.inviteeEmail)) {
      return { error: 'You are not authorized to decline this invitation.' };
    }

    if (inv.status !== 'Pending') {
      return { error: `Invitation has already been ${inv.status.toLowerCase()}.` };
    }

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
      reqs = reqs.filter(r => r.title.toLowerCase().includes(s) || r.description.toLowerCase().includes(s));
    }
    return reqs;
  }

  getRequirement(id) { return this._load().requirements.find(r => r.id === id); }

  createRequirement(projectId, reqData) {
    const data = this._load();
    const req = { id: generateId(), projectId, ...reqData, createdBy: data.currentUser?.id, createdAt: now(), updatedAt: now() };
    data.requirements.push(req);
    this._save();
    return { data: req };
  }

  updateRequirement(id, updates) {
    const data = this._load();
    const idx = data.requirements.findIndex(r => r.id === id);
    if (idx === -1) return { error: 'Requirement not found' };
    const old = data.requirements[idx];
    // Record history for meaningful changes
    ['title', 'description', 'priority', 'status', 'acceptanceCriteria'].forEach(field => {
      if (updates[field] !== undefined && updates[field] !== old[field]) {
        data.requirementHistory.push({
          id: generateId(), requirementId: id, field,
          oldValue: old[field] || '', newValue: updates[field],
          changedBy: data.currentUser?.id, changedAt: now()
        });
      }
    });
    data.requirements[idx] = { ...old, ...updates, updatedAt: now() };
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
    if (sprintData.status === 'Active') {
      const active = data.sprints.find(s => s.projectId === projectId && s.status === 'Active');
      if (active) return { error: 'Only one active sprint allowed per project' };
    }
    const sprint = { id: generateId(), projectId, ...sprintData, createdAt: now() };
    data.sprints.push(sprint);
    this._save();
    return { data: sprint };
  }

  updateSprint(id, updates) {
    const data = this._load();
    const idx = data.sprints.findIndex(s => s.id === id);
    if (idx === -1) return { error: 'Sprint not found' };
    if (updates.status === 'Active') {
      const active = data.sprints.find(s => s.projectId === data.sprints[idx].projectId && s.status === 'Active' && s.id !== id);
      if (active) return { error: 'Only one active sprint allowed per project' };
    }
    data.sprints[idx] = { ...data.sprints[idx], ...updates };
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
    const task = { id: generateId(), projectId, ...taskData, createdBy: data.currentUser?.id, createdAt: now(), updatedAt: now() };
    data.tasks.push(task);
    this._save();
    return { data: task };
  }

  updateTask(id, updates) {
    const data = this._load();
    const idx = data.tasks.findIndex(t => t.id === id);
    if (idx === -1) return { error: 'Task not found' };
    data.tasks[idx] = { ...data.tasks[idx], ...updates, updatedAt: now() };
    this._save();
    return { data: data.tasks[idx] };
  }

  // ===== TEST CASES =====
  getTestCases(projectId) { return this._load().testCases.filter(tc => tc.projectId === projectId); }
  getTestCase(id) { return this._load().testCases.find(tc => tc.id === id); }

  createTestCase(projectId, tcData) {
    const data = this._load();
    const tc = { id: generateId(), projectId, ...tcData, status: 'Active', createdBy: data.currentUser?.id, createdAt: now() };
    data.testCases.push(tc);
    this._save();
    return { data: tc };
  }

  updateTestCase(id, updates) {
    const data = this._load();
    const idx = data.testCases.findIndex(tc => tc.id === id);
    if (idx === -1) return { error: 'Test case not found' };
    data.testCases[idx] = { ...data.testCases[idx], ...updates };
    this._save();
    return { data: data.testCases[idx] };
  }

  // ===== TEST RUNS =====
  getTestRuns(testCaseId) {
    return this._load().testRuns.filter(tr => tr.testCaseId === testCaseId).sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt));
  }

  getTestRunsByProject(projectId) {
    return this._load().testRuns.filter(tr => tr.projectId === projectId);
  }

  createTestRun(testCaseId, runData) {
    const data = this._load();
    const tc = data.testCases.find(t => t.id === testCaseId);
    if (!tc) return { error: 'Test case not found' };
    const run = { id: generateId(), testCaseId, projectId: tc.projectId, ...runData, executedBy: data.currentUser?.id, executedAt: now() };
    data.testRuns.push(run);
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
    const bug = { id: generateId(), projectId, ...bugData, reporterId: data.currentUser?.id, createdAt: now(), updatedAt: now() };
    data.bugs.push(bug);
    this._save();
    return { data: bug };
  }

  updateBug(id, updates) {
    const data = this._load();
    const idx = data.bugs.findIndex(b => b.id === id);
    if (idx === -1) return { error: 'Bug not found' };
    data.bugs[idx] = { ...data.bugs[idx], ...updates, updatedAt: now() };
    this._save();
    return { data: data.bugs[idx] };
  }

  // ===== RELEASES =====
  getReleases(projectId) { return this._load().releases.filter(r => r.projectId === projectId); }
  getRelease(id) { return this._load().releases.find(r => r.id === id); }

  createRelease(projectId, relData) {
    const data = this._load();
    const rel = { id: generateId(), projectId, ...relData, createdBy: data.currentUser?.id, createdAt: now(), updatedAt: now() };
    data.releases.push(rel);
    this._save();
    return { data: rel };
  }

  updateRelease(id, updates) {
    const data = this._load();
    const idx = data.releases.findIndex(r => r.id === id);
    if (idx === -1) return { error: 'Release not found' };
    if (updates.status === 'Released' && !updates.actualDate && !data.releases[idx].actualDate) {
      updates.actualDate = new Date().toISOString().split('T')[0];
    }
    data.releases[idx] = { ...data.releases[idx], ...updates, updatedAt: now() };
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
      testRuns: { total: runs.length, passed: runs.filter(r => r.result === 'Passed').length, failed: runs.filter(r => r.result === 'Failed').length, blocked: runs.filter(r => r.result === 'Blocked').length, skipped: runs.filter(r => r.result === 'Skipped').length },
      bugs: { total: bugs.length, bySeverity: countBy(bugs, 'severity'), open: bugs.filter(b => !['Closed', 'Fixed'].includes(b.status)).length },
      releases: { total: releases.length, planned: releases.filter(r => r.status === 'Planned').length, released: releases.filter(r => r.status === 'Released').length },
      activeSprint: activeSprint ? { name: activeSprint.name, goal: activeSprint.goal, startDate: activeSprint.startDate, endDate: activeSprint.endDate, taskCount: tasks.filter(t => t.sprintId === activeSprint.id).length } : null,
    };
  }

  // ===== TRACEABILITY =====
  getTraceability(projectId) {
    const data = this._load();
    const reqs = data.requirements.filter(r => r.projectId === projectId);
    return reqs.map(req => {
      const linkedTasks = data.tasks.filter(t => t.requirementIds?.includes(req.id));
      const linkedTestCases = data.testCases.filter(tc => tc.requirementIds?.includes(req.id));
      const linkedTestRuns = linkedTestCases.flatMap(tc => data.testRuns.filter(tr => tr.testCaseId === tc.id));
      const linkedBugs = data.bugs.filter(b => b.relatedRequirementId === req.id);
      const linkedReleases = data.releases.filter(r => linkedTasks.some(t => r.taskIds?.includes(t.id)));
      return { requirement: req, tasks: linkedTasks, testCases: linkedTestCases, testRuns: linkedTestRuns, bugs: linkedBugs, releases: linkedReleases };
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
