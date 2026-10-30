// DevTrack Backend REST API Server v1
// Implements complete API specification, Security Hardening, and Project Isolation (gemini.md Section 7, 9-H, 11)
import http from 'node:http';
import crypto from 'node:crypto';
import { URL } from 'node:url';
import {
  ROLES, can, isValidPriority, REQUIREMENT_STATUSES, REQUIREMENT_HISTORY_FIELDS, SPRINT_STATUSES,
  validateSprintDates, TASK_STATUSES, canTransitionTask, TEST_TYPES, TEST_RESULTS, isValidSeverity,
  canTransitionBug, BUG_VERIFY_STATES, BUG_RESOLVED_STATES, RELEASE_STATUSES, isValidReleaseName,
  buildTraceability, computeCoverage
} from '../../src/rules.js';

const PORT = process.env.PORT || 4000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const MAX_BODY_BYTES = 1024 * 1024;
// Signs self-describing invitation tokens so their payload cannot be forged.
const INVITE_SECRET = process.env.INVITE_SECRET || process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

// Security Headers (Section 11)
const SECURITY_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
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
  invitations: [],
  auditLogs: []
};

// Opaque session tokens → user id. Never accept a raw user id or email as a credential.
export const sessions = new Map();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(String(password || ''), salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

// Seed initial workspace data safely
export function resetDb() {
  const seedHash = hashPassword('password123');
  DB.users = [
    { id: 'usr-admin', name: 'Lead Architect', email: 'lead@devtrack.io', passwordHash: seedHash, emailVerified: true },
    { id: 'usr-dev', name: 'Dev Engineer', email: 'dev@devtrack.io', passwordHash: seedHash, emailVerified: true },
    { id: 'usr-qa', name: 'QA Tester', email: 'qa@devtrack.io', passwordHash: seedHash, emailVerified: true },
    { id: 'usr-viewer', name: 'Auditor Viewer', email: 'viewer@devtrack.io', passwordHash: seedHash, emailVerified: true }
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
      description: 'Implement secure authentication with hashed credentials and session cookies.',
      priority: 'Must',
      status: 'Implemented',
      acceptanceCriteria: 'Users can register, login, logout. Sessions use secure cookies.',
      targetRelease: 'rel-001'
    }
  ];
  DB.requirementHistory = [
    { id: 'rh-001', requirementId: 'req-001', field: 'status', oldValue: 'Draft', newValue: 'Approved', changedBy: 'usr-admin', changedAt: '2026-09-20T00:00:00Z' },
    { id: 'rh-002', requirementId: 'req-001', field: 'status', oldValue: 'Approved', newValue: 'Implemented', changedBy: 'usr-dev', changedAt: '2026-10-05T00:00:00Z' }
  ];
  DB.sprints = [
    { id: 'sprint-001', projectId: 'proj-001', name: 'Sprint 1 — Foundation', goal: 'Core infrastructure setup', startDate: '2026-09-15', endDate: '2026-09-29', status: 'Completed' }
  ];
  DB.tasks = [
    { id: 'task-001', projectId: 'proj-001', sprintId: 'sprint-001', title: 'Implement registration endpoint', assigneeId: 'usr-dev', priority: 'High', status: 'Done', estimate: 5, requirementIds: ['req-001'] }
  ];
  DB.testCases = [
    { id: 'tc-001', projectId: 'proj-001', title: 'Verify user registration with valid data', type: 'Integration', preconditions: '', steps: '1. POST /register\n2. Verify cookie', expectedResult: '201 Created', requirementIds: ['req-001'], status: 'Active' }
  ];
  DB.testRuns = [
    { id: 'tr-001', testCaseId: 'tc-001', projectId: 'proj-001', result: 'Passed', notes: 'All assertions verified.', executedBy: 'usr-qa', executedAt: '2026-10-03T14:30:00Z' }
  ];
  DB.bugs = [];
  DB.releases = [
    { id: 'rel-001', projectId: 'proj-001', name: 'v1.0.0 — Foundation Release', summary: 'Core foundation and auth', status: 'Planning', targetDate: '2026-11-01', actualDate: null }
  ];
  DB.invitations = [];
  DB.auditLogs = [];
  sessions.clear();
}


// Initial seed
resetDb();

function generateId(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
}

function createSession(user) {
  const token = crypto.randomBytes(32).toString('base64url');
  sessions.set(token, user.id);
  return token;
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

// Tamper-evident audit trail: each entry hashes the previous entry's hash.
function audit(type, actor, projectId, details) {
  const prevHash = DB.auditLogs.length ? DB.auditLogs[DB.auditLogs.length - 1].hash : 'GENESIS';
  const entry = { id: generateId('aud'), type, actorId: actor?.id || null, projectId: projectId || null, details, at: new Date().toISOString(), prevHash };
  entry.hash = crypto.createHash('sha256').update(JSON.stringify(entry)).digest('hex');
  DB.auditLogs.push(entry);
}

export function verifyAuditChain(logs = DB.auditLogs) {
  return logs.every((entry, i) => {
    const prevHash = i === 0 ? 'GENESIS' : logs[i - 1].hash;
    const { hash, ...rest } = entry;
    const expected = crypto.createHash('sha256').update(JSON.stringify(rest)).digest('hex');
    return entry.prevHash === prevHash && hash === expected;
  });
}

// Sliding-window rate limiter for authentication endpoints (brute-force protection)
export const rateLimitMap = new Map();
export function checkRateLimit(key, limit = 10, windowMs = 60000) {
  const now = Date.now();
  const hits = (rateLimitMap.get(key) || []).filter(t => now - t < windowMs);
  if (hits.length >= limit) {
    rateLimitMap.set(key, hits);
    return { allowed: false, remaining: 0, retryAfter: Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000)) };
  }
  hits.push(now);
  rateLimitMap.set(key, hits);
  return { allowed: true, remaining: limit - hits.length };
}

// Invitation tokens: inv_<base64url payload>.<base64url HMAC>
function signInviteToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', INVITE_SECRET).update(body).digest('base64url');
  return `inv_${body}.${sig}`;
}

function verifyInviteToken(token) {
  if (typeof token !== 'string' || !token.startsWith('inv_')) return null;
  const [body, sig] = token.slice(4).split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', INVITE_SECRET).update(body).digest();
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const d = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    return d && d.pid && d.email ? d : null;
  } catch {
    return null;
  }
}

// Resolve an invitation by id or token. Unknown tokens are only trusted when
// their signature verifies (e.g. after a server restart cleared memory).
function findInvitation(idOrToken) {
  let inv = DB.invitations.find(i => i.id === idOrToken || i.token === idOrToken);
  if (inv) return inv;
  const d = verifyInviteToken(idOrToken);
  if (!d || !DB.projects.some(p => p.id === d.pid)) return null;
  inv = DB.invitations.find(i => i.id === d.id);
  if (inv) return inv;
  inv = {
    id: d.id,
    projectId: d.pid,
    projectName: d.pname,
    projectKey: d.pkey,
    inviterName: d.iname,
    inviterEmail: d.iemail,
    inviteeEmail: d.email,
    role: ROLES.includes(d.role) ? d.role : 'Developer',
    status: 'Pending',
    expiresAt: d.exp,
    createdAt: d.iat,
    token: idOrToken
  };
  DB.invitations.push(inv);
  return inv;
}

function expireIfStale(inv) {
  if (inv.status === 'Pending' && new Date(inv.expiresAt).getTime() <= Date.now()) inv.status = 'Expired';
}

function setCorsHeaders(res, origin) {
  const allowed = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4000', 'http://localhost:3000'];
  if (process.env.CLIENT_URL) allowed.push(...process.env.CLIENT_URL.split(',').map(s => s.trim()).filter(Boolean));
  let isVercel = false;
  try {
    isVercel = Boolean(origin) && new URL(origin).protocol === 'https:' && new URL(origin).hostname.endsWith('.vercel.app');
  } catch {}
  // Credentials are allowed, so only ever reflect a vetted origin (never "*").
  if (origin && (allowed.includes(origin) || isVercel)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
}

function sendJson(res, statusCode, data, error = null, extraHeaders = {}) {
  const headers = { ...SECURITY_HEADERS, ...extraHeaders };
  res.writeHead(statusCode, headers);
  res.end(JSON.stringify({ data, meta: { timestamp: new Date().toISOString() }, error }));
}

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Request body exceeds 1MB limit.'));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        resolve(parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {});
      } catch {
        reject(new HttpError(400, 'INVALID_JSON', 'Request body must be valid JSON.'));
      }
    });
    req.on('error', reject);
  });
}

// Authentication & Membership Helpers
function getAuthUser(req) {
  let token = null;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else {
    const match = (req.headers['cookie'] || '').match(/(?:^|;\s*)auth_session=([^;]+)/);
    if (match) token = decodeURIComponent(match[1]);
  }
  const userId = token && sessions.get(token);
  return userId ? DB.users.find(u => u.id === userId) || null : null;
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

function requirePermission(role, action) {
  if (!can(role, action)) {
    throw new HttpError(403, 'FORBIDDEN', `Forbidden: The ${role} role is not permitted to perform "${action}".`);
  }
}

function validationError(message) {
  return new HttpError(400, 'VALIDATION_ERROR', message);
}

// Referential integrity: linked records must exist inside the same project.
function assertLinks(projectId, collection, ids, label) {
  for (const id of (ids || []).filter(Boolean)) {
    if (!DB[collection].some(r => r.id === id && r.projectId === projectId)) {
      throw new HttpError(400, 'INVALID_RELATION', `${label} '${id}' does not belong to project '${projectId}'. Cross-project linking is forbidden.`);
    }
  }
}

function pick(body, fields) {
  return Object.fromEntries(fields.filter(f => body[f] !== undefined).map(f => [f, body[f]]));
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

  const parsedUrl = new URL(req.url, 'http://localhost');
  const pathname = parsedUrl.pathname;
  const method = req.method;
  // Behind Render's proxy the socket address is the proxy; only trust the
  // forwarded header when explicitly configured, otherwise it is spoofable.
  const forwarded = process.env.TRUST_PROXY === 'true' ? (req.headers['x-forwarded-for'] || '').split(',')[0].trim() : '';
  const clientIp = forwarded || req.socket.remoteAddress || '127.0.0.1';

  try {
    // 1. Health Endpoint
    if (pathname === '/api/health') {
      sendJson(res, 200, { status: 'healthy', version: '2.14.0', service: 'DevTrack API Server' });
      return;
    }

    // 2. Test Reset Endpoint (For automated test runners — never exposed in production)
    if (pathname === '/api/v1/test/reset' && method === 'POST' && !IS_PRODUCTION) {
      resetDb();
      rateLimitMap.clear();
      sendJson(res, 200, { message: 'Database state reset successfully' });
      return;
    }

    // 3. Authentication Endpoints (With Rate Limiting)
    if (pathname === '/api/v1/auth/login' && method === 'POST') {
      const body = await readBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      const ipLimit = checkRateLimit(`login_ip_${clientIp}`, 10, 60000);
      const acctLimit = email ? checkRateLimit(`login_acct_${email}`, 10, 60000) : ipLimit;
      const rl = !ipLimit.allowed ? ipLimit : acctLimit;
      if (!rl.allowed) {
        sendJson(res, 429, null, { code: 'RATE_LIMIT_EXCEEDED', message: `Too many login attempts. Please retry in ${rl.retryAfter}s.` }, { 'Retry-After': String(rl.retryAfter) });
        return;
      }

      const user = DB.users.find(u => u.email.toLowerCase() === email);
      if (!user || !verifyPassword(body.password, user.passwordHash)) {
        audit('AUTH_LOGIN_FAILED', null, null, { email });
        sendJson(res, 401, null, { code: 'UNAUTHORIZED', message: 'Invalid email or password.' });
        return;
      }

      const token = createSession(user);
      audit('AUTH_LOGIN', user, null, { email: user.email });
      sendJson(res, 200, { ...publicUser(user), token }, null, {
        'Set-Cookie': `auth_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/${IS_PRODUCTION ? '; Secure' : ''}`
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
      const email = String(body.email || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof body.password !== 'string' || body.password.length < 8) {
        sendJson(res, 400, null, { code: 'VALIDATION_ERROR', message: 'A valid email and a password of at least 8 characters are required.' });
        return;
      }
      if (DB.users.some(u => u.email.toLowerCase() === email)) {
        sendJson(res, 409, null, { code: 'CONFLICT', message: 'Email already in use.' });
        return;
      }

      const newUser = {
        id: generateId('usr'),
        name: String(body.name || email.split('@')[0]).trim(),
        email,
        passwordHash: hashPassword(body.password),
        emailVerified: true
      };
      DB.users.push(newUser);
      const token = createSession(newUser);
      audit('AUTH_REGISTER', newUser, null, { email });
      sendJson(res, 201, { ...publicUser(newUser), token }, null, {
        'Set-Cookie': `auth_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/${IS_PRODUCTION ? '; Secure' : ''}`
      });
      return;
    }

    if (pathname === '/api/v1/auth/logout' && method === 'POST') {
      const authHeader = req.headers['authorization'] || '';
      const cookieMatch = (req.headers['cookie'] || '').match(/(?:^|;\s*)auth_session=([^;]+)/);
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : (cookieMatch ? decodeURIComponent(cookieMatch[1]) : null);
      if (token) sessions.delete(token);
      sendJson(res, 200, { message: 'Logged out successfully' }, null, {
        'Set-Cookie': 'auth_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'
      });
      return;
    }

    if (pathname === '/api/v1/auth/me' && method === 'GET') {
      const user = getAuthUser(req);
      if (!user) {
        sendJson(res, 401, null, { code: 'UNAUTHORIZED', message: 'Not authenticated.' });
        return;
      }
      sendJson(res, 200, publicUser(user));
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
      const key = String(body.key || '').trim().toUpperCase();
      if (!String(body.name || '').trim() || !/^[A-Z][A-Z0-9]{1,9}$/.test(key)) {
        sendJson(res, 400, null, { code: 'VALIDATION_ERROR', message: 'Project name and a 2-10 character alphanumeric key are required.' });
        return;
      }
      if (body.startDate && body.endDate && new Date(body.startDate) >= new Date(body.endDate)) {
        sendJson(res, 400, null, { code: 'VALIDATION_ERROR', message: 'Project start date must be before end date.' });
        return;
      }
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
      audit('PROJECT_CREATED', user, proj.id, { key });
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
      DB.invitations.forEach(expireIfStale);
      const userInvs = DB.invitations.filter(inv => inv.inviteeEmail.toLowerCase() === user.email.toLowerCase());
      sendJson(res, 200, userInvs);
      return;
    }

    const tokenLookupMatch = pathname.match(/^\/api\/v1\/invitations\/token\/([^/]+)$/);
    if (tokenLookupMatch && method === 'GET') {
      const inv = findInvitation(decodeURIComponent(tokenLookupMatch[1]));
      if (!inv) {
        sendJson(res, 404, null, { code: 'NOT_FOUND', message: 'Invitation not found or invalid token.' });
        return;
      }
      expireIfStale(inv);
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

      const action = invActionMatch[2];
      const inv = findInvitation(decodeURIComponent(invActionMatch[1]));
      if (!inv) {
        sendJson(res, 404, null, { code: 'NOT_FOUND', message: 'Invitation not found.' });
        return;
      }

      // Identity first, so outsiders learn nothing about the invitation's state.
      if (user.email.toLowerCase() !== inv.inviteeEmail.toLowerCase()) {
        sendJson(res, 403, null, {
          code: 'FORBIDDEN',
          message: `This invitation was issued to a different account. You are authenticated as "${user.email}".`
        });
        return;
      }

      expireIfStale(inv);
      if (inv.status === 'Expired') {
        sendJson(res, 410, null, { code: 'INVITATION_EXPIRED', message: 'This invitation has expired.' });
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
        audit('INVITATION_DECLINED', user, inv.projectId, { invitationId: inv.id });
        sendJson(res, 200, { message: 'Invitation declined successfully.', invitation: inv });
        return;
      }

      const project = DB.projects.find(p => p.id === inv.projectId);
      if (!project) {
        sendJson(res, 404, null, { code: 'NOT_FOUND', message: 'The project for this invitation no longer exists.' });
        return;
      }

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
      audit('INVITATION_ACCEPTED', user, inv.projectId, { invitationId: inv.id, role: inv.role });

      sendJson(res, 200, {
        message: 'Invitation accepted successfully.',
        membership: { ...newMember, userName: user.name, userEmail: user.email },
        project
      });
      return;
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
        requirePermission(access.role, 'team.manage');
        const body = await readBody(req);
        const cleanEmail = String(body.email || '').trim().toLowerCase();
        if (!cleanEmail || !cleanEmail.includes('@')) {
          sendJson(res, 400, null, { code: 'VALIDATION_ERROR', message: 'Valid email address is required.' });
          return;
        }

        // STRICT POLICY: Only verified users who already have an account can be added
        const registeredUser = DB.users.find(u => u.email.toLowerCase() === cleanEmail);
        if (!registeredUser) {
          sendJson(res, 404, null, {
            code: 'USER_NOT_FOUND',
            message: 'Only users who have already signed up can be added to the team.'
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
          role: ROLES.includes(body.role) ? body.role : 'Developer'
        };
        DB.members.push(newMember);
        audit('MEMBER_ADDED', user, projectId, { userId: registeredUser.id, role: newMember.role });
        sendJson(res, 201, { ...newMember, userName: registeredUser.name, userEmail: registeredUser.email });
        return;
      }

      // --- Project Invitations Endpoints ---
      if (subpath === '/invitations' && method === 'GET') {
        // Tokens are bearer secrets for the invitee; only owners may see them.
        const projectInvs = DB.invitations.filter(inv => inv.projectId === projectId)
          .map(inv => (access.role === 'Owner' ? inv : { ...inv, token: undefined }));
        sendJson(res, 200, projectInvs);
        return;
      }

      if (subpath === '/invitations' && method === 'POST') {
        requirePermission(access.role, 'team.manage');

        const body = await readBody(req);
        const cleanEmail = String(body.email || '').trim().toLowerCase();
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

        DB.invitations.forEach(expireIfStale);
        const existingPending = DB.invitations.find(inv =>
          inv.projectId === projectId &&
          inv.inviteeEmail.toLowerCase() === cleanEmail &&
          inv.status === 'Pending'
        );

        if (existingPending) {
          sendJson(res, 409, null, { code: 'INVITATION_ALREADY_PENDING', message: `A pending invitation has already been sent to "${cleanEmail}".` });
          return;
        }

        const role = ROLES.includes(body.role) ? body.role : 'Developer';
        const invId = generateId('inv');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const createdAt = new Date().toISOString();
        const token = signInviteToken({
          id: invId,
          pid: projectId,
          pname: access.project.name,
          pkey: access.project.key,
          pdesc: access.project.description || '',
          iname: user.name,
          iemail: user.email,
          email: cleanEmail,
          role,
          exp: expiresAt,
          iat: createdAt
        });

        const invitation = {
          id: invId,
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
          createdAt
        };

        DB.invitations.push(invitation);
        audit('INVITATION_SENT', user, projectId, { invitationId: invId, inviteeEmail: cleanEmail, role });
        sendJson(res, 201, invitation);
        return;
      }

      const invRevokeMatch = subpath.match(/^\/invitations\/([^/]+)$/);
      if (invRevokeMatch && method === 'DELETE') {
        requirePermission(access.role, 'team.manage');
        const invId = invRevokeMatch[1];
        const inv = DB.invitations.find(i => i.id === invId && i.projectId === projectId);
        if (!inv) {
          sendJson(res, 404, null, { code: 'NOT_FOUND', message: 'Invitation not found.' });
          return;
        }
        if (inv.status !== 'Pending') {
          sendJson(res, 400, null, { code: 'INVALID_STATUS', message: `Invitation has already been ${inv.status.toLowerCase()}.` });
          return;
        }
        inv.status = 'Revoked';
        audit('INVITATION_REVOKED', user, projectId, { invitationId: invId });
        sendJson(res, 200, { message: 'Invitation revoked successfully', invitation: inv });
        return;
      }

      // --- Requirements Endpoints ---
      if (subpath === '/requirements' && method === 'GET') {
        sendJson(res, 200, DB.requirements.filter(r => r.projectId === projectId));
        return;
      }

      if (subpath === '/requirements' && method === 'POST') {
        requirePermission(access.role, 'requirement.write');
        const body = await readBody(req);
        if (!String(body.title || '').trim()) throw validationError('Requirement title is required.');
        const priority = body.priority ?? 'Must';
        const status = body.status ?? 'Draft';
        if (!isValidPriority(priority)) throw validationError(`Invalid MoSCoW priority: ${priority}`);
        if (!REQUIREMENT_STATUSES.includes(status)) throw validationError(`Invalid requirement status: ${status}`);
        assertLinks(projectId, 'releases', [body.targetRelease], 'Release');
        const reqItem = {
          id: generateId('req'),
          projectId,
          title: body.title.trim(),
          description: body.description || '',
          priority,
          status,
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
        audit('REQUIREMENT_CREATED', user, projectId, { requirementId: reqItem.id });
        sendJson(res, 201, reqItem);
        return;
      }

      const reqItemMatch = subpath.match(/^\/requirements\/([^/]+)(\/history)?$/);
      if (reqItemMatch) {
        const reqItem = DB.requirements.find(r => r.id === reqItemMatch[1] && r.projectId === projectId);
        if (!reqItem) {
          sendJson(res, 404, null, { code: 'NOT_FOUND', message: 'Requirement not found in this project.' });
          return;
        }
        if (reqItemMatch[2] && method === 'GET') {
          sendJson(res, 200, DB.requirementHistory.filter(h => h.requirementId === reqItem.id));
          return;
        }
        if (!reqItemMatch[2] && method === 'PATCH') {
          requirePermission(access.role, 'requirement.write');
          const updates = pick(await readBody(req), [...REQUIREMENT_HISTORY_FIELDS, 'targetRelease']);
          if (updates.title !== undefined && !String(updates.title).trim()) throw validationError('Requirement title is required.');
          if (updates.priority !== undefined && !isValidPriority(updates.priority)) throw validationError(`Invalid MoSCoW priority: ${updates.priority}`);
          if (updates.status !== undefined && !REQUIREMENT_STATUSES.includes(updates.status)) throw validationError(`Invalid requirement status: ${updates.status}`);
          assertLinks(projectId, 'releases', [updates.targetRelease], 'Release');
          // Append-only change history
          for (const field of REQUIREMENT_HISTORY_FIELDS) {
            if (updates[field] !== undefined && updates[field] !== reqItem[field]) {
              DB.requirementHistory.push({
                id: generateId('rh'), requirementId: reqItem.id, field,
                oldValue: reqItem[field] ?? null, newValue: updates[field],
                changedBy: user.id, changedAt: new Date().toISOString()
              });
            }
          }
          Object.assign(reqItem, updates);
          audit('REQUIREMENT_UPDATED', user, projectId, { requirementId: reqItem.id, fields: Object.keys(updates) });
          sendJson(res, 200, reqItem);
          return;
        }
      }

      // --- Sprints Endpoints ---
      if (subpath === '/sprints' && method === 'GET') {
        sendJson(res, 200, DB.sprints.filter(s => s.projectId === projectId));
        return;
      }

      if (subpath === '/sprints' && method === 'POST') {
        requirePermission(access.role, 'sprint.write');
        const body = await readBody(req);
        if (!String(body.name || '').trim()) throw validationError('Sprint name is required.');
        const dates = validateSprintDates(body.startDate, body.endDate);
        if (!dates.valid) throw validationError(dates.reason);
        const status = body.status ?? 'Planned';
        if (!SPRINT_STATUSES.includes(status)) throw validationError(`Invalid sprint status: ${status}`);
        if (status === 'Active' && DB.sprints.some(s => s.projectId === projectId && s.status === 'Active')) {
          throw new HttpError(409, 'CONFLICT', 'Only one active sprint allowed per project.');
        }
        const sprint = {
          id: generateId('sprint'),
          projectId,
          name: body.name.trim(),
          goal: body.goal || '',
          startDate: body.startDate,
          endDate: body.endDate,
          status
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
        requirePermission(access.role, 'task.write');
        const body = await readBody(req);
        if (!String(body.title || '').trim()) throw validationError('Task title is required.');
        if (body.requirementIds !== undefined && !Array.isArray(body.requirementIds)) throw validationError('requirementIds must be an array.');
        // Enforce referential integrity: Linked requirements and sprint must belong to this project
        assertLinks(projectId, 'requirements', body.requirementIds, 'Requirement');
        assertLinks(projectId, 'sprints', [body.sprintId], 'Sprint');
        if (body.assigneeId && !DB.members.some(m => m.projectId === projectId && m.userId === body.assigneeId)) {
          throw new HttpError(400, 'INVALID_RELATION', 'Assignee must be a member of this project.');
        }
        const status = body.status ?? (body.sprintId ? 'To Do' : 'Backlog');
        if (!TASK_STATUSES.includes(status)) throw validationError(`Invalid task status: ${status}`);

        const task = {
          id: generateId('task'),
          projectId,
          sprintId: body.sprintId || null,
          title: body.title.trim(),
          assigneeId: body.assigneeId || null,
          priority: body.priority || 'Medium',
          status,
          estimate: body.estimate || 1,
          requirementIds: body.requirementIds || []
        };
        DB.tasks.push(task);
        sendJson(res, 201, task);
        return;
      }

      const taskItemMatch = subpath.match(/^\/tasks\/([^/]+)$/);
      if (taskItemMatch && method === 'PATCH') {
        requirePermission(access.role, 'task.write');
        const task = DB.tasks.find(t => t.id === taskItemMatch[1] && t.projectId === projectId);
        if (!task) {
          sendJson(res, 404, null, { code: 'NOT_FOUND', message: 'Task not found in this project.' });
          return;
        }
        const updates = pick(await readBody(req), ['title', 'status', 'assigneeId', 'priority', 'estimate', 'sprintId', 'requirementIds']);
        if (updates.status !== undefined && updates.status !== task.status && !canTransitionTask(task.status, updates.status)) {
          throw new HttpError(400, 'INVALID_TRANSITION', `Invalid Kanban transition: ${task.status} → ${updates.status}`);
        }
        assertLinks(projectId, 'requirements', updates.requirementIds, 'Requirement');
        assertLinks(projectId, 'sprints', [updates.sprintId], 'Sprint');
        Object.assign(task, updates);
        sendJson(res, 200, task);
        return;
      }

      // --- Test Cases & Runs Endpoints ---
      if (subpath === '/test-cases' && method === 'GET') {
        sendJson(res, 200, DB.testCases.filter(t => t.projectId === projectId));
        return;
      }

      if (subpath === '/test-cases' && method === 'POST') {
        requirePermission(access.role, 'testcase.write');
        const body = await readBody(req);
        if (!String(body.title || '').trim()) throw validationError('Test case title is required.');
        const type = body.type ?? 'Integration';
        if (!TEST_TYPES.includes(type)) throw validationError(`Invalid test type: ${type}`);
        assertLinks(projectId, 'requirements', body.requirementIds, 'Requirement');
        const tc = {
          id: generateId('tc'),
          projectId,
          title: body.title.trim(),
          type,
          preconditions: body.preconditions || '',
          steps: body.steps || body.testSteps || '',
          expectedResult: body.expectedResult || '',
          requirementIds: body.requirementIds || [],
          status: 'Active'
        };
        DB.testCases.push(tc);
        sendJson(res, 201, tc);
        return;
      }

      if (subpath === '/test-runs' && method === 'GET') {
        sendJson(res, 200, DB.testRuns.filter(tr => tr.projectId === projectId));
        return;
      }

      if (subpath === '/test-runs' && method === 'POST') {
        requirePermission(access.role, 'testrun.create');
        const body = await readBody(req);
        if (!body.testCaseId || !TEST_RESULTS.includes(body.result)) {
          throw validationError(`testCaseId and a result of ${TEST_RESULTS.join(', ')} are required.`);
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
          result: body.result,
          notes: body.notes || '',
          executedBy: user.id,
          executedAt: new Date().toISOString()
        };
        DB.testRuns.push(tr);
        audit('TEST_RUN_RECORDED', user, projectId, { testRunId: tr.id, result: tr.result });
        sendJson(res, 201, tr);
        return;
      }

      // --- Bugs Endpoints ---
      if (subpath === '/bugs' && method === 'GET') {
        sendJson(res, 200, DB.bugs.filter(b => b.projectId === projectId));
        return;
      }

      if (subpath === '/bugs' && method === 'POST') {
        requirePermission(access.role, 'bug.create');
        const body = await readBody(req);
        if (!String(body.title || '').trim()) throw validationError('Bug title is required.');
        const severity = body.severity ?? 'Medium';
        if (!isValidSeverity(severity)) throw validationError(`Invalid defect severity: ${severity}`);
        assertLinks(projectId, 'requirements', [body.relatedRequirementId], 'Requirement');
        assertLinks(projectId, 'testRuns', [body.relatedTestRunId], 'Test run');
        if (body.relatedTestRunId && DB.testRuns.find(tr => tr.id === body.relatedTestRunId).result !== 'Failed') {
          throw validationError('Defects can only be filed against a Failed test run.');
        }
        const bug = {
          id: generateId('bug'),
          projectId,
          title: body.title.trim(),
          severity,
          priority: body.priority || 'Medium',
          status: 'Open',
          reporterId: user.id,
          assigneeId: body.assigneeId || null,
          relatedRequirementId: body.relatedRequirementId || null,
          relatedTestRunId: body.relatedTestRunId || null
        };
        DB.bugs.push(bug);
        audit('BUG_FILED', user, projectId, { bugId: bug.id, severity });
        sendJson(res, 201, bug);
        return;
      }

      const bugItemMatch = subpath.match(/^\/bugs\/([^/]+)$/);
      if (bugItemMatch && method === 'PATCH') {
        requirePermission(access.role, 'bug.update');
        const bug = DB.bugs.find(b => b.id === bugItemMatch[1] && b.projectId === projectId);
        if (!bug) {
          sendJson(res, 404, null, { code: 'NOT_FOUND', message: 'Bug not found in this project.' });
          return;
        }
        const updates = pick(await readBody(req), ['title', 'status', 'severity', 'priority', 'assigneeId']);
        if (updates.severity !== undefined && !isValidSeverity(updates.severity)) throw validationError(`Invalid defect severity: ${updates.severity}`);
        if (updates.status !== undefined && updates.status !== bug.status) {
          if (!canTransitionBug(bug.status, updates.status)) {
            throw new HttpError(400, 'INVALID_TRANSITION', `Invalid defect transition: ${bug.status} → ${updates.status}`);
          }
          if (BUG_VERIFY_STATES.includes(updates.status)) requirePermission(access.role, 'bug.verify');
        }
        const previous = bug.status;
        Object.assign(bug, updates);
        if (updates.status && updates.status !== previous) {
          audit('BUG_STATUS_CHANGED', user, projectId, { bugId: bug.id, from: previous, to: bug.status });
        }
        sendJson(res, 200, bug);
        return;
      }

      // --- Releases Endpoints ---
      if (subpath === '/releases' && method === 'GET') {
        sendJson(res, 200, DB.releases.filter(r => r.projectId === projectId));
        return;
      }

      if (subpath === '/releases' && method === 'POST') {
        requirePermission(access.role, 'release.write');
        const body = await readBody(req);
        if (!isValidReleaseName(body.name)) throw validationError('Release name must start with a SemVer version, e.g. v1.0.0');
        const rel = {
          id: generateId('rel'),
          projectId,
          name: body.name.trim(),
          summary: body.summary || '',
          status: 'Planning',
          targetDate: body.targetDate || null,
          actualDate: null
        };
        DB.releases.push(rel);
        audit('RELEASE_CREATED', user, projectId, { releaseId: rel.id, name: rel.name });
        sendJson(res, 201, rel);
        return;
      }

      const relItemMatch = subpath.match(/^\/releases\/([^/]+)$/);
      if (relItemMatch && method === 'PATCH') {
        requirePermission(access.role, 'release.write');
        const rel = DB.releases.find(r => r.id === relItemMatch[1] && r.projectId === projectId);
        if (!rel) {
          sendJson(res, 404, null, { code: 'NOT_FOUND', message: 'Release not found in this project.' });
          return;
        }
        const updates = pick(await readBody(req), ['name', 'summary', 'status', 'targetDate']);
        if (updates.name !== undefined && !isValidReleaseName(updates.name)) throw validationError('Release name must start with a SemVer version, e.g. v1.0.0');
        if (updates.status !== undefined && !RELEASE_STATUSES.includes(updates.status)) throw validationError(`Invalid release status: ${updates.status}`);
        if (updates.status === 'Released' && rel.status !== 'Released') {
          // Production gate: no unresolved Critical/High defects in the project.
          const blockers = DB.bugs.filter(b => b.projectId === projectId && !BUG_RESOLVED_STATES.includes(b.status) && ['Critical', 'High'].includes(b.severity));
          if (blockers.length) {
            throw new HttpError(409, 'RELEASE_BLOCKED', `Release gate blocked by ${blockers.length} unresolved Critical/High defect(s).`);
          }
          rel.actualDate = new Date().toISOString().split('T')[0];
        }
        const previous = rel.status;
        Object.assign(rel, updates);
        if (updates.status && updates.status !== previous) {
          audit('RELEASE_STATUS_CHANGED', user, projectId, { releaseId: rel.id, from: previous, to: rel.status });
        }
        sendJson(res, 200, rel);
        return;
      }

      // --- Traceability, Coverage & Audit Endpoints ---
      const projectData = () => {
        const inProject = list => list.filter(x => x.projectId === projectId);
        return {
          requirements: inProject(DB.requirements),
          tasks: inProject(DB.tasks),
          testCases: inProject(DB.testCases),
          testRuns: inProject(DB.testRuns),
          bugs: inProject(DB.bugs),
          releases: inProject(DB.releases),
          sprints: inProject(DB.sprints)
        };
      };

      if (subpath === '/traceability' && method === 'GET') {
        sendJson(res, 200, buildTraceability(projectData()));
        return;
      }

      if (subpath === '/coverage' && method === 'GET') {
        const data = projectData();
        sendJson(res, 200, computeCoverage(buildTraceability(data), data.sprints, data.tasks));
        return;
      }

      if (subpath === '/audit' && method === 'GET') {
        const logs = DB.auditLogs.filter(l => l.projectId === projectId);
        sendJson(res, 200, { entries: logs, chainValid: verifyAuditChain() });
        return;
      }
    }

    // 6. Fallback 404
    sendJson(res, 404, null, { code: 'NOT_FOUND', message: `Route '${pathname}' not found on DevTrack API Server.` });
  } catch (err) {
    if (err instanceof HttpError) {
      sendJson(res, err.status, null, { code: err.code, message: err.message });
      return;
    }
    console.error('[DevTrack API] Unhandled error:', err);
    sendJson(res, 500, null, { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' });
  }
});

server.listen(PORT, () => {
  console.log(`[DevTrack Backend Server] running on http://localhost:${PORT}`);
});
