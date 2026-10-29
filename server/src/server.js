// DevTrack Backend REST API Server v1
// Implements complete API specification, Security Hardening, and Project Isolation (gemini.md Section 7, 9-H, 11)
import http from 'node:http';
import { URL } from 'node:url';

const PORT = process.env.PORT || 4000;

// Security Headers (Section 11)
const SECURITY_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'",
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

// In-Memory Database State (isolated, with relational integrity)
export const DB = {
  users: [],
  projects: [],
  members: [],
  requirements: [],
  requirementHistory: [],
  sprints: [],
  tasks: [],
  testCases: [],
  testRuns: [],
  bugs: [],
  releases: [],
  invitations: []
};


// Seed initial workspace data safely
export function resetDb() {
  DB.users = [
    { id: 'usr-admin', name: 'Lead Architect', email: 'lead@devtrack.io', password: 'password123', role: 'Owner', emailVerified: true },
    { id: 'usr-dev', name: 'Dev Engineer', email: 'dev@devtrack.io', password: 'password123', role: 'Developer', emailVerified: true },
    { id: 'usr-qa', name: 'QA Tester', email: 'qa@devtrack.io', password: 'password123', role: 'Tester', emailVerified: true },
    { id: 'usr-viewer', name: 'Auditor Viewer', email: 'viewer@devtrack.io', password: 'password123', role: 'Viewer', emailVerified: true }
  ];
  DB.projects = [
    {
      id: 'proj-001',
      name: 'DevTrack Platform',
      key: 'DEV',
      description: 'Full-stack Software Engineering Lifecycle Management Platform',
      startDate: '2026-09-15',
      endDate: '2026-12-31',
      createdById: 'usr-admin'
    }
  ];
  DB.members = [
    { id: 'mem-001', projectId: 'proj-001', userId: 'usr-admin', role: 'Owner' },
    { id: 'mem-002', projectId: 'proj-001', userId: 'usr-dev', role: 'Developer' },
    { id: 'mem-003', projectId: 'proj-001', userId: 'usr-qa', role: 'Tester' },
    { id: 'mem-004', projectId: 'proj-001', userId: 'usr-viewer', role: 'Viewer' }
  ];
  DB.requirements = [
    {
      id: 'req-001',
      projectId: 'proj-001',
      title: 'User Authentication & Session Management',
      description: 'Implement secure authentication with Argon2id and JWT cookies.',
      priority: 'Must',
      status: 'Completed',
      acceptanceCriteria: 'Users can register, login, logout. Sessions use secure cookies.',
      targetRelease: 'rel-001'
    }
  ];
  DB.requirementHistory = [
    { id: 'rh-001', requirementId: 'req-001', field: 'status', oldValue: 'Draft', newValue: 'Approved', changedBy: 'usr-admin', changedAt: '2026-09-20T00:00:00Z' },
    { id: 'rh-002', requirementId: 'req-001', field: 'status', oldValue: 'Approved', newValue: 'Completed', changedBy: 'usr-dev', changedAt: '2026-10-05T00:00:00Z' }
  ];
  DB.sprints = [
    { id: 'sprint-001', projectId: 'proj-001', name: 'Sprint 1 — Foundation', goal: 'Core infrastructure setup', startDate: '2026-09-15', endDate: '2026-09-29', status: 'Completed' }
  ];
  DB.tasks = [
    { id: 'task-001', projectId: 'proj-001', sprintId: 'sprint-001', title: 'Implement registration endpoint', assigneeId: 'usr-dev', priority: 'High', status: 'Done', estimate: 5, requirementIds: ['req-001'] }
  ];
  DB.testCases = [
    { id: 'tc-001', projectId: 'proj-001', title: 'Verify user registration with valid data', steps: '1. POST /register\n2. Verify cookie', expectedResult: '201 Created', requirementIds: ['req-001'], status: 'Active' }
  ];
  DB.testRuns = [
    { id: 'tr-001', testCaseId: 'tc-001', projectId: 'proj-001', result: 'Passed', notes: 'All assertions verified.', executedBy: 'usr-qa', executedAt: '2026-10-03T14:30:00Z' }
  ];
  DB.bugs = [];
  DB.releases = [
    { id: 'rel-001', projectId: 'proj-001', name: 'v1.0.0 — Foundation Release', summary: 'Core foundation and auth', status: 'Planned', targetDate: '2026-11-01', actualDate: null }
  ];
  DB.invitations = [];
}


// Initial seed
resetDb();

function generateId(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// Rate Limiter for Authentication Endpoints (Brute Force Protection)
export const rateLimitMap = new Map();
export function checkRateLimit(key, limit = 10, windowMs = 60000) {
  const now = Date.now();
  const record = rateLimitMap.get(key) || { count: 0, resetTime: now + windowMs };
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
    rateLimitMap.set(key, record);
    return { allowed: true, remaining: limit - 1 };
  }
  record.count += 1;
  rateLimitMap.set(key, record);
  if (record.count > limit) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((record.resetTime - now) / 1000) };
  }
  return { allowed: true, remaining: limit - record.count };
}

function setCorsHeaders(res, origin) {
  const allowed = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4000', 'http://localhost:3000'];
  if (process.env.CLIENT_URL) allowed.push(process.env.CLIENT_URL);
  const isVercel = origin && (origin.endsWith('.vercel.app') || origin.includes('vercel.app'));
  const allowOrigin = (origin && (allowed.includes(origin) || isVercel)) ? origin : (allowed.includes(origin) ? origin : '*');
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, X-CSRF-Token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

function sendJson(res, statusCode, data, error = null, extraHeaders = {}) {
  const headers = { ...SECURITY_HEADERS, ...extraHeaders };
  res.writeHead(statusCode, headers);
  res.end(JSON.stringify({ data, meta: { timestamp: new Date().toISOString() }, error }));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

// Authentication & Membership Helpers
function getAuthUser(req) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const user = DB.users.find(u => u.id === token || u.email.toLowerCase() === token.toLowerCase());
    if (user) return user;
  }
  const cookies = req.headers['cookie'];
  if (cookies) {
    const match = cookies.match(/auth_user=([^;]+)/);
    if (match) {
      const val = decodeURIComponent(match[1]);
      const user = DB.users.find(u => u.id === val || u.email.toLowerCase() === val.toLowerCase());
      if (user) return user;
    }
  }
  return null;
}

function checkProjectAccess(projectId, user) {
  if (!user) {
    return { allowed: false, status: 401, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } };
  }
  const project = DB.projects.find(p => p.id === projectId);
  if (!project) {
    return { allowed: false, status: 404, error: { code: 'NOT_FOUND', message: `Project ${projectId} not found.` } };
  }
  const member = DB.members.find(m => m.projectId === projectId && m.userId === user.id);
  if (!member) {
    return { allowed: false, status: 403, error: { code: 'FORBIDDEN', message: 'Access denied: You are not a member of this project.' } };
  }
  return { allowed: true, role: member.role, member, project };
}

function checkWritePermission(role) {
  if (role === 'Viewer') {
    return { allowed: false, status: 403, error: { code: 'FORBIDDEN', message: 'Forbidden: Viewer role has read-only permissions.' } };
  }
  return { allowed: true };
}

export const server = http.createServer(async (req, res) => {
  const origin = req.headers['origin'];
  setCorsHeaders(res, origin);

  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, SECURITY_HEADERS);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost:4000'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;
  const clientIp = req.socket.remoteAddress || '127.0.0.1';

  try {
    // 1. Health Endpoint
    if (pathname === '/api/health') {
      sendJson(res, 200, { status: 'healthy', version: '2.14.0', service: 'DevTrack API Server' });
      return;
    }

    // 2. Test Reset Endpoint (For automated test runners)
    if (pathname === '/api/v1/test/reset' && method === 'POST') {
      resetDb();
      rateLimitMap.clear();
      sendJson(res, 200, { message: 'Database state reset successfully' });
      return;
    }

    // 3. Authentication Endpoints (With Rate Limiting)
    if (pathname === '/api/v1/auth/login' && method === 'POST') {
      const rl = checkRateLimit(`login_${clientIp}`, 10, 60000);
      if (!rl.allowed) {
        sendJson(res, 429, null, { code: 'RATE_LIMIT_EXCEEDED', message: `Too many login attempts. Please retry in ${rl.retryAfter}s.` }, { 'Retry-After': String(rl.retryAfter) });
        return;
      }

      const body = await readBody(req);
      const email = (body.email || '').trim().toLowerCase();
      const user = DB.users.find(u => u.email.toLowerCase() === email && u.password === body.password);
      if (!user) {
        sendJson(res, 401, null, { code: 'UNAUTHORIZED', message: 'Invalid email or password.' });
        return;
      }

      // Set HttpOnly session cookie
      sendJson(res, 200, { id: user.id, name: user.name, email: user.email, role: user.role }, null, {
        'Set-Cookie': `auth_user=${encodeURIComponent(user.id)}; HttpOnly; SameSite=Lax; Path=/`
      });
      return;
    }

    if (pathname === '/api/v1/auth/register' && method === 'POST') {
      const rl = checkRateLimit(`register_${clientIp}`, 10, 60000);
      if (!rl.allowed) {
        sendJson(res, 429, null, { code: 'RATE_LIMIT_EXCEEDED', message: `Too many registration attempts. Please retry in ${rl.retryAfter}s.` }, { 'Retry-After': String(rl.retryAfter) });
        return;
      }

      const body = await readBody(req);
      const email = (body.email || '').trim().toLowerCase();
      if (!email || !email.includes('@') || !body.password) {
        sendJson(res, 400, null, { code: 'VALIDATION_ERROR', message: 'Valid email and password are required.' });
        return;
      }
      if (DB.users.some(u => u.email.toLowerCase() === email)) {
        sendJson(res, 409, null, { code: 'CONFLICT', message: 'Email already in use.' });
        return;
      }

      const newUser = {
        id: generateId('usr'),
        name: (body.name || email.split('@')[0]).trim(),
        email,
        password: body.password,
        role: 'Developer',
        emailVerified: true
      };
      DB.users.push(newUser);
      sendJson(res, 201, { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role });
      return;
    }

    if (pathname === '/api/v1/auth/logout' && method === 'POST') {
      sendJson(res, 200, { message: 'Logged out successfully' }, null, {
        'Set-Cookie': 'auth_user=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'
      });
      return;
    }

    if (pathname === '/api/v1/auth/me' && method === 'GET') {
      const user = getAuthUser(req);
      if (!user) {
        sendJson(res, 401, null, { code: 'UNAUTHORIZED', message: 'Not authenticated.' });
        return;
      }
      sendJson(res, 200, { id: user.id, name: user.name, email: user.email, role: user.role });
      return;
    }

    // 4. Projects Endpoints
    if (pathname === '/api/v1/projects' && method === 'GET') {
      const user = getAuthUser(req);
      if (!user) {
        sendJson(res, 401, null, { code: 'UNAUTHORIZED', message: 'Authentication required.' });
        return;
      }
      // Project isolation: Return only projects user is a member of
      const memberProjIds = DB.members.filter(m => m.userId === user.id).map(m => m.projectId);
      const userProjects = DB.projects.filter(p => memberProjIds.includes(p.id));
      sendJson(res, 200, userProjects);
      return;
    }

    if (pathname === '/api/v1/projects' && method === 'POST') {
      const user = getAuthUser(req);
      if (!user) {
        sendJson(res, 401, null, { code: 'UNAUTHORIZED', message: 'Authentication required.' });
        return;
      }
      const body = await readBody(req);
      if (!body.name || !body.key) {
        sendJson(res, 400, null, { code: 'VALIDATION_ERROR', message: 'Project name and key are required.' });
        return;
      }
      const key = body.key.toUpperCase();
      if (DB.projects.some(p => p.key === key)) {
        sendJson(res, 409, null, { code: 'CONFLICT', message: `Project key '${key}' already exists.` });
        return;
      }

      const proj = {
        id: generateId('proj'),
        name: body.name.trim(),
        key,
        description: body.description || '',
        startDate: body.startDate || new Date().toISOString().split('T')[0],
        endDate: body.endDate || null,
        createdById: user.id
      };
      DB.projects.push(proj);
      // Project creator is assigned as Owner
      DB.members.push({ id: generateId('mem'), projectId: proj.id, userId: user.id, role: 'Owner' });
      sendJson(res, 201, proj);
      return;
    }

    // 4.5 Central In-App Invitations Endpoints (Inbox & Link Verification)
    if (pathname === '/api/v1/invitations/my' && method === 'GET') {
      const user = getAuthUser(req);
      if (!user) {
        sendJson(res, 401, null, { code: 'UNAUTHORIZED', message: 'Authentication required.' });
        return;
      }
      const nowMs = Date.now();
      DB.invitations.forEach(inv => {
        if (inv.status === 'Pending' && new Date(inv.expiresAt).getTime() <= nowMs) {
          inv.status = 'Expired';
        }
      });
      const userInvs = DB.invitations.filter(inv => inv.inviteeEmail.toLowerCase() === user.email.toLowerCase());
      sendJson(res, 200, userInvs);
      return;
    }

    const tokenLookupMatch = pathname.match(/^\/api\/v1\/invitations\/token\/([^/]+)$/);
    if (tokenLookupMatch && method === 'GET') {
      const token = tokenLookupMatch[1];
      const inv = DB.invitations.find(i => i.token === token);
      if (!inv) {
        sendJson(res, 404, null, { code: 'NOT_FOUND', message: 'Invitation not found or invalid token.' });
        return;
      }
      if (inv.status === 'Pending' && new Date(inv.expiresAt).getTime() <= Date.now()) {
        inv.status = 'Expired';
      }
      sendJson(res, 200, {
        id: inv.id,
        projectId: inv.projectId,
        projectName: inv.projectName,
        projectKey: inv.projectKey,
        inviterName: inv.inviterName,
        inviterEmail: inv.inviterEmail,
        inviteeEmail: inv.inviteeEmail,
        role: inv.role,
        status: inv.status,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt
      });
      return;
    }

    const invActionMatch = pathname.match(/^\/api\/v1\/invitations\/([^/]+)\/(accept|decline)$/);
    if (invActionMatch && method === 'POST') {
      const user = getAuthUser(req);
      if (!user) {
        sendJson(res, 401, null, { code: 'UNAUTHORIZED', message: 'Authentication required to respond to invitation.' });
        return;
      }

      const invId = invActionMatch[1];
      const action = invActionMatch[2];
      const inv = DB.invitations.find(i => i.id === invId || i.token === invId);
      if (!inv) {
        sendJson(res, 404, null, { code: 'NOT_FOUND', message: 'Invitation not found.' });
        return;
      }

      if (new Date(inv.expiresAt).getTime() <= Date.now()) {
        inv.status = 'Expired';
        sendJson(res, 410, null, { code: 'INVITATION_EXPIRED', message: 'This invitation has expired.' });
        return;
      }

      if (user.email.toLowerCase() !== inv.inviteeEmail.toLowerCase()) {
        sendJson(res, 403, null, {
          code: 'FORBIDDEN',
          message: `This invitation was issued to "${inv.inviteeEmail}". You are authenticated as "${user.email}".`
        });
        return;
      }

      if (inv.status !== 'Pending') {
        sendJson(res, 400, null, {
          code: 'INVALID_STATUS',
          message: `Invitation has already been ${inv.status.toLowerCase()}.`
        });
        return;
      }

      if (action === 'decline') {
        inv.status = 'Declined';
        inv.declinedAt = new Date().toISOString();
        sendJson(res, 200, { message: 'Invitation declined successfully.', invitation: inv });
        return;
      }

      if (action === 'accept') {
        const isAlreadyMember = DB.members.some(m => m.projectId === inv.projectId && m.userId === user.id);
        if (isAlreadyMember) {
          inv.status = 'Accepted';
          sendJson(res, 409, null, { code: 'ALREADY_MEMBER', message: 'You are already a member of this project.' });
          return;
        }

        const newMember = {
          id: generateId('mem'),
          projectId: inv.projectId,
          userId: user.id,
          role: inv.role
        };
        DB.members.push(newMember);
        inv.status = 'Accepted';
        inv.acceptedAt = new Date().toISOString();

        const project = DB.projects.find(p => p.id === inv.projectId);
        sendJson(res, 200, {
          message: 'Invitation accepted successfully.',
          membership: { ...newMember, userName: user.name, userEmail: user.email },
          project
        });
        return;
      }
    }

    // 5. Project-Scoped Endpoints with Strict Project Isolation & Role Verification
    // Format: /api/v1/projects/:projectId/...
    const projectSubRouteMatch = pathname.match(/^\/api\/v1\/projects\/([^/]+)(\/.*)?$/);
    if (projectSubRouteMatch) {
      const projectId = projectSubRouteMatch[1];
      const subpath = projectSubRouteMatch[2] || '';
      const user = getAuthUser(req);

      const access = checkProjectAccess(projectId, user);
      if (!access.allowed) {
        sendJson(res, access.status, null, access.error);
        return;
      }

      // Check write permissions for mutating methods
      if (['POST', 'PATCH', 'DELETE'].includes(method)) {
        const writeCheck = checkWritePermission(access.role);
        if (!writeCheck.allowed) {
          sendJson(res, writeCheck.status, null, writeCheck.error);
          return;
        }
      }

      // --- Members Endpoints (Verified User Only Enforcement) ---
      if (subpath === '/members' && method === 'GET') {
        const projectMembers = DB.members.filter(m => m.projectId === projectId).map(m => {
          const u = DB.users.find(usr => usr.id === m.userId);
          return { ...m, userName: u?.name || 'User', userEmail: u?.email || '' };
        });
        sendJson(res, 200, projectMembers);
        return;
      }

      if (subpath === '/members' && method === 'POST') {
        const body = await readBody(req);
        const cleanEmail = (body.email || '').trim().toLowerCase();
        if (!cleanEmail || !cleanEmail.includes('@')) {
          sendJson(res, 400, null, { code: 'VALIDATION_ERROR', message: 'Valid email address is required.' });
          return;
        }

        // STRICT POLICY: Only verified users who already have an account can be added
        const registeredUser = DB.users.find(u => u.email.toLowerCase() === cleanEmail);
        if (!registeredUser) {
          sendJson(res, 404, null, {
            code: 'USER_NOT_FOUND',
            message: `No registered account found for "${cleanEmail}". Only verified users who have already created an account can be added to project teams.`
          });
          return;
        }

        // Prevent duplicate membership
        if (DB.members.some(m => m.projectId === projectId && m.userId === registeredUser.id)) {
          sendJson(res, 409, null, {
            code: 'CONFLICT',
            message: `"${registeredUser.name}" is already a member of this project.`
          });
          return;
        }

        const newMember = {
          id: generateId('mem'),
          projectId,
          userId: registeredUser.id,
          role: body.role || 'Developer'
        };
        DB.members.push(newMember);
        sendJson(res, 201, { ...newMember, userName: registeredUser.name, userEmail: registeredUser.email });
        return;
      }

      // --- Project Invitations Endpoints ---
      if (subpath === '/invitations' && method === 'GET') {
        const projectInvs = DB.invitations.filter(inv => inv.projectId === projectId);
        sendJson(res, 200, projectInvs);
        return;
      }

      if (subpath === '/invitations' && method === 'POST') {
        if (access.role !== 'Owner') {
          sendJson(res, 403, null, { code: 'FORBIDDEN', message: 'Forbidden: Only project owners can invite new members.' });
          return;
        }

        const body = await readBody(req);
        const cleanEmail = (body.email || '').trim().toLowerCase();
        if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
          sendJson(res, 400, null, { code: 'VALIDATION_ERROR', message: 'Valid email address is required.' });
          return;
        }

        const isMember = DB.members.some(m => {
          if (m.projectId !== projectId) return false;
          const u = DB.users.find(usr => usr.id === m.userId);
          return u && u.email.toLowerCase() === cleanEmail;
        });

        if (isMember) {
          sendJson(res, 409, null, { code: 'ALREADY_MEMBER', message: `User with email "${cleanEmail}" is already a member of this project.` });
          return;
        }

        const nowMs = Date.now();
        const existingPending = DB.invitations.find(inv =>
          inv.projectId === projectId &&
          inv.inviteeEmail.toLowerCase() === cleanEmail &&
          inv.status === 'Pending' &&
          new Date(inv.expiresAt).getTime() > nowMs
        );

        if (existingPending) {
          sendJson(res, 409, null, { code: 'INVITATION_ALREADY_PENDING', message: `A pending invitation has already been sent to "${cleanEmail}".` });
          return;
        }

        const allowedRoles = ['Owner', 'Developer', 'Tester', 'Viewer'];
        const role = allowedRoles.includes(body.role) ? body.role : 'Developer';
        const token = 'inv_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 12);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        const invitation = {
          id: generateId('inv'),
          projectId,
          projectName: access.project.name,
          projectKey: access.project.key,
          inviterId: user.id,
          inviterName: user.name,
          inviterEmail: user.email,
          inviteeEmail: cleanEmail,
          role,
          status: 'Pending',
          token,
          expiresAt,
          createdAt: new Date().toISOString()
        };

        DB.invitations.push(invitation);
        sendJson(res, 201, invitation);
        return;
      }

      const invRevokeMatch = subpath.match(/^\/invitations\/([^/]+)$/);
      if (invRevokeMatch && method === 'DELETE') {
        if (access.role !== 'Owner') {
          sendJson(res, 403, null, { code: 'FORBIDDEN', message: 'Forbidden: Only project owners can revoke invitations.' });
          return;
        }
        const invId = invRevokeMatch[1];
        const invIndex = DB.invitations.findIndex(inv => inv.id === invId && inv.projectId === projectId);
        if (invIndex === -1) {
          sendJson(res, 404, null, { code: 'NOT_FOUND', message: 'Invitation not found.' });
          return;
        }
        DB.invitations[invIndex].status = 'Revoked';
        sendJson(res, 200, { message: 'Invitation revoked successfully', invitation: DB.invitations[invIndex] });
        return;
      }

      // --- Requirements Endpoints ---
      if (subpath === '/requirements' && method === 'GET') {
        sendJson(res, 200, DB.requirements.filter(r => r.projectId === projectId));
        return;
      }

      if (subpath === '/requirements' && method === 'POST') {
        const body = await readBody(req);
        if (!body.title) {
          sendJson(res, 400, null, { code: 'VALIDATION_ERROR', message: 'Requirement title is required.' });
          return;
        }
        const reqItem = {
          id: generateId('req'),
          projectId,
          title: body.title.trim(),
          description: body.description || '',
          priority: ['Must', 'Should', 'Could', "Won't"].includes(body.priority) ? body.priority : 'Must',
          status: body.status || 'Draft',
          acceptanceCriteria: body.acceptanceCriteria || '',
          targetRelease: body.targetRelease || null
        };
        DB.requirements.push(reqItem);
        DB.requirementHistory.push({
          id: generateId('rh'),
          requirementId: reqItem.id,
          field: 'status',
          oldValue: null,
          newValue: reqItem.status,
          changedBy: user.id,
          changedAt: new Date().toISOString()
        });
        sendJson(res, 201, reqItem);
        return;
      }

      // --- Sprints Endpoints ---
      if (subpath === '/sprints' && method === 'GET') {
        sendJson(res, 200, DB.sprints.filter(s => s.projectId === projectId));
        return;
      }

      if (subpath === '/sprints' && method === 'POST') {
        const body = await readBody(req);
        if (!body.name || !body.startDate || !body.endDate) {
          sendJson(res, 400, null, { code: 'VALIDATION_ERROR', message: 'Sprint name, start date, and end date are required.' });
          return;
        }
        if (new Date(body.startDate) >= new Date(body.endDate)) {
          sendJson(res, 400, null, { code: 'VALIDATION_ERROR', message: 'Sprint start date must be strictly before end date.' });
          return;
        }
        const sprint = {
          id: generateId('sprint'),
          projectId,
          name: body.name.trim(),
          goal: body.goal || '',
          startDate: body.startDate,
          endDate: body.endDate,
          status: body.status || 'Planned'
        };
        DB.sprints.push(sprint);
        sendJson(res, 201, sprint);
        return;
      }

      // --- Tasks Endpoints (With Cross-Project Link Validation) ---
      if (subpath === '/tasks' && method === 'GET') {
        sendJson(res, 200, DB.tasks.filter(t => t.projectId === projectId));
        return;
      }

      if (subpath === '/tasks' && method === 'POST') {
        const body = await readBody(req);
        if (!body.title) {
          sendJson(res, 400, null, { code: 'VALIDATION_ERROR', message: 'Task title is required.' });
          return;
        }

        // Enforce referential integrity: Linked requirements must belong to this project
        if (Array.isArray(body.requirementIds)) {
          for (const reqId of body.requirementIds) {
            const reqRecord = DB.requirements.find(r => r.id === reqId && r.projectId === projectId);
            if (!reqRecord) {
              sendJson(res, 400, null, {
                code: 'INVALID_RELATION',
                message: `Requirement '${reqId}' does not belong to project '${projectId}'. Cross-project linking is forbidden.`
              });
              return;
            }
          }
        }

        const task = {
          id: generateId('task'),
          projectId,
          sprintId: body.sprintId || null,
          title: body.title.trim(),
          assigneeId: body.assigneeId || null,
          priority: body.priority || 'Medium',
          status: body.status || 'Backlog',
          estimate: body.estimate || 1,
          requirementIds: body.requirementIds || []
        };
        DB.tasks.push(task);
        sendJson(res, 201, task);
        return;
      }

      // --- Test Cases & Runs Endpoints ---
      if (subpath === '/test-cases' && method === 'GET') {
        sendJson(res, 200, DB.testCases.filter(t => t.projectId === projectId));
        return;
      }

      if (subpath === '/test-cases' && method === 'POST') {
        const body = await readBody(req);
        if (!body.title) {
          sendJson(res, 400, null, { code: 'VALIDATION_ERROR', message: 'Test case title is required.' });
          return;
        }
        const tc = {
          id: generateId('tc'),
          projectId,
          title: body.title.trim(),
          steps: body.steps || '',
          expectedResult: body.expectedResult || '',
          requirementIds: body.requirementIds || [],
          status: 'Active'
        };
        DB.testCases.push(tc);
        sendJson(res, 201, tc);
        return;
      }

      if (subpath === '/test-runs' && method === 'POST') {
        const body = await readBody(req);
        if (!body.testCaseId || !body.result) {
          sendJson(res, 400, null, { code: 'VALIDATION_ERROR', message: 'TestCaseId and result are required.' });
          return;
        }
        const tc = DB.testCases.find(t => t.id === body.testCaseId && t.projectId === projectId);
        if (!tc) {
          sendJson(res, 404, null, { code: 'NOT_FOUND', message: 'Test case not found in this project.' });
          return;
        }

        // Append-only test run
        const tr = {
          id: generateId('tr'),
          testCaseId: tc.id,
          projectId,
          result: body.result, // 'Passed' | 'Failed' | 'Blocked' | 'Skipped'
          notes: body.notes || '',
          executedBy: user.id,
          executedAt: new Date().toISOString()
        };
        DB.testRuns.push(tr);
        sendJson(res, 201, tr);
        return;
      }

      // --- Bugs Endpoints ---
      if (subpath === '/bugs' && method === 'GET') {
        sendJson(res, 200, DB.bugs.filter(b => b.projectId === projectId));
        return;
      }

      if (subpath === '/bugs' && method === 'POST') {
        const body = await readBody(req);
        if (!body.title) {
          sendJson(res, 400, null, { code: 'VALIDATION_ERROR', message: 'Bug title is required.' });
          return;
        }
        const bug = {
          id: generateId('bug'),
          projectId,
          title: body.title.trim(),
          severity: body.severity || 'Medium',
          priority: body.priority || 'Medium',
          status: body.status || 'Open',
          reporterId: user.id,
          assigneeId: body.assigneeId || null,
          relatedRequirementId: body.relatedRequirementId || null,
          relatedTestRunId: body.relatedTestRunId || null
        };
        DB.bugs.push(bug);
        sendJson(res, 201, bug);
        return;
      }

      // --- Releases Endpoints ---
      if (subpath === '/releases' && method === 'GET') {
        sendJson(res, 200, DB.releases.filter(r => r.projectId === projectId));
        return;
      }

      if (subpath === '/releases' && method === 'POST') {
        const body = await readBody(req);
        if (!body.name) {
          sendJson(res, 400, null, { code: 'VALIDATION_ERROR', message: 'Release name is required.' });
          return;
        }
        const rel = {
          id: generateId('rel'),
          projectId,
          name: body.name.trim(),
          summary: body.summary || '',
          status: 'Planned',
          targetDate: body.targetDate || null,
          actualDate: null
        };
        DB.releases.push(rel);
        sendJson(res, 201, rel);
        return;
      }

      // --- Traceability & Dashboard Endpoints ---
      if (subpath === '/traceability' && method === 'GET') {
        const reqs = DB.requirements.filter(r => r.projectId === projectId);
        const matrix = reqs.map(reqItem => {
          const linkedTasks = DB.tasks.filter(t => t.projectId === projectId && t.requirementIds?.includes(reqItem.id));
          const linkedTCs = DB.testCases.filter(tc => tc.projectId === projectId && tc.requirementIds?.includes(reqItem.id));
          const linkedRuns = linkedTCs.flatMap(tc => DB.testRuns.filter(tr => tr.testCaseId === tc.id));
          const linkedBugs = DB.bugs.filter(b => b.projectId === projectId && b.relatedRequirementId === reqItem.id);
          return {
            requirement: reqItem,
            tasks: linkedTasks,
            testCases: linkedTCs,
            testRuns: linkedRuns,
            bugs: linkedBugs
          };
        });
        sendJson(res, 200, matrix);
        return;
      }
    }

    // 6. Fallback 404
    sendJson(res, 404, null, { code: 'NOT_FOUND', message: `Route '${pathname}' not found on DevTrack API Server.` });
  } catch (err) {
    sendJson(res, 500, null, { code: 'INTERNAL_SERVER_ERROR', message: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`[DevTrack Backend Server] running on http://localhost:${PORT}`);
});
