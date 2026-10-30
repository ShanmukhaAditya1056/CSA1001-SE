// DevTrack Domain Rules — single source of truth shared by the client store,
// the API server, and the automated test suite. Pure functions only (no DOM).

export const ROLES = ['Owner', 'Developer', 'Tester', 'Viewer'];

// Role Permission Matrix
export const PERMISSIONS = {
  'project.update':     ['Owner'],
  'team.manage':        ['Owner'],
  'requirement.write':  ['Owner', 'Developer'],
  'sprint.write':       ['Owner', 'Developer'],
  'task.write':         ['Owner', 'Developer'],
  'testcase.write':     ['Owner', 'Tester'],
  'testrun.create':     ['Owner', 'Tester'],
  'bug.create':         ['Owner', 'Developer', 'Tester'],
  'bug.update':         ['Owner', 'Developer', 'Tester'],
  'bug.verify':         ['Owner', 'Tester'],
  'release.write':      ['Owner'],
  'data.reset':         ['Owner']
};

export function can(role, action) {
  return Boolean(role && PERMISSIONS[action]?.includes(role));
}

export function permissionError(role, action) {
  if (can(role, action)) return null;
  if (!role) return 'Forbidden: You are not a member of this project.';
  return `Forbidden: The ${role} role is not permitted to perform "${action}".`;
}

// Requirements & MoSCoW
export const MOSCOW_PRIORITIES = ['Must', 'Should', 'Could', "Won't"];
export const REQUIREMENT_STATUSES = ['Draft', 'Approved', 'In Development', 'Implemented', 'Rejected'];
export const REQUIREMENT_HISTORY_FIELDS = ['title', 'description', 'priority', 'status', 'acceptanceCriteria'];

export function isValidPriority(p) {
  return MOSCOW_PRIORITIES.includes(p);
}

// Sprints
export const SPRINT_STATUSES = ['Planned', 'Active', 'Completed'];

export function validateSprintDates(start, end) {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (!start || !end || isNaN(s) || isNaN(e)) return { valid: false, reason: 'Sprint start and end dates are required.' };
  if (s >= e) return { valid: false, reason: 'Sprint start date must be strictly before end date.' };
  return { valid: true };
}

// Tasks — Kanban state machine. Backlog holds unscheduled work; the sprint
// flow is To Do → In Progress → In Review → Done, with one step back allowed.
export const TASK_STATUSES = ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'];
export const TASK_TRANSITIONS = {
  'Backlog': ['To Do'],
  'To Do': ['In Progress', 'Backlog'],
  'In Progress': ['In Review', 'To Do'],
  'In Review': ['Done', 'In Progress'],
  'Done': ['In Review']
};

export function canTransitionTask(from, to) {
  if (!TASK_STATUSES.includes(from) || !TASK_STATUSES.includes(to)) return false;
  return TASK_TRANSITIONS[from].includes(to);
}

// QA
export const TEST_TYPES = ['Unit', 'Integration', 'E2E', 'Regression'];
export const TEST_RESULTS = ['Passed', 'Failed', 'Blocked'];

// Defects
export const BUG_SEVERITIES = ['Critical', 'High', 'Medium', 'Low'];
export const BUG_STATUSES = ['Open', 'In Progress', 'Fixed', 'Verified', 'Closed'];
export const BUG_TRANSITIONS = {
  'Open': ['In Progress', 'Closed'],
  'In Progress': ['Fixed', 'Open'],
  'Fixed': ['Verified', 'In Progress'],
  'Verified': ['Closed', 'In Progress'],
  'Closed': ['Open']
};
// Moving into these states is a QA sign-off and needs bug.verify.
export const BUG_VERIFY_STATES = ['Verified', 'Closed'];
export const BUG_RESOLVED_STATES = ['Fixed', 'Verified', 'Closed'];

export function isValidSeverity(sev) {
  return BUG_SEVERITIES.includes(sev);
}

export function canTransitionBug(from, to) {
  if (!BUG_STATUSES.includes(from) || !BUG_STATUSES.includes(to)) return false;
  return BUG_TRANSITIONS[from].includes(to);
}

// Releases
export const RELEASE_STATUSES = ['Planning', 'Staging', 'Released'];
export const SEMVER_PREFIX = /^v?\d+\.\d+\.\d+/;

export function isValidReleaseName(name) {
  return SEMVER_PREFIX.test((name || '').trim());
}

// Legacy status values from earlier builds, mapped to the current vocabulary.
export const LEGACY_STATUS_MAP = {
  requirement: { 'In Progress': 'In Development', 'Completed': 'Implemented' },
  bug: { 'Retest': 'Verified', 'Reopened': 'Open' },
  release: { 'Planned': 'Planning', 'Cancelled': 'Planning' }
};

// Traceability: Requirement → Tasks → Test Cases → Test Runs → Bugs → Release
export function buildTraceability({ requirements, tasks, testCases, testRuns, bugs, releases }) {
  return requirements.map(req => {
    const linkedTasks = tasks.filter(t => t.requirementIds?.includes(req.id));
    const linkedTestCases = testCases.filter(tc => tc.requirementIds?.includes(req.id));
    const linkedTestRuns = linkedTestCases.flatMap(tc => testRuns.filter(tr => tr.testCaseId === tc.id));
    const linkedBugs = bugs.filter(b => b.relatedRequirementId === req.id);
    const linkedReleases = releases.filter(r =>
      r.id === req.targetRelease || linkedTasks.some(t => r.taskIds?.includes(t.id))
    );
    return {
      requirement: req,
      tasks: linkedTasks,
      testCases: linkedTestCases,
      testRuns: linkedTestRuns,
      bugs: linkedBugs,
      releases: linkedReleases
    };
  });
}

// A requirement is verified when every linked test case's latest run passed.
export function computeCoverage(matrix, sprints = [], tasks = []) {
  const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
  const verified = matrix.filter(row => row.testCases.length > 0 && row.testCases.every(tc => {
    const runs = row.testRuns.filter(tr => tr.testCaseId === tc.id)
      .sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt));
    return runs[0]?.result === 'Passed';
  })).length;

  const sprintsResolved = sprints.filter(s => {
    const st = tasks.filter(t => t.sprintId === s.id);
    return st.length > 0 && st.every(t => t.status === 'Done');
  }).length;

  const allBugs = matrix.flatMap(row => row.bugs);
  const uniqueBugs = [...new Map(allBugs.map(b => [b.id, b])).values()];
  const resolved = uniqueBugs.filter(b => BUG_RESOLVED_STATES.includes(b.status)).length;
  const blockers = uniqueBugs.filter(b => !BUG_RESOLVED_STATES.includes(b.status) && ['Critical', 'High'].includes(b.severity)).length;

  return {
    requirementsVerifiedPct: pct(verified, matrix.length),
    sprintsResolvedPct: pct(sprintsResolved, sprints.length),
    defectsResolvedPct: pct(resolved, uniqueBugs.length),
    blockerCount: blockers
  };
}

// Team invitations: only accounts that already exist in DevTrack can be invited or added.
export const UNREGISTERED_USER_MESSAGE = 'User not registered in DevTrack. Please ask them to create an account first.';
export const ALREADY_MEMBER_MESSAGE = 'This user is already a member of this project.';
export const PENDING_INVITATION_MESSAGE = 'An invitation has already been sent to this user.';
export const INVALID_EMAIL_MESSAGE = 'Please enter a valid email address.';
export const INVITE_FORBIDDEN_MESSAGE = 'You cannot invite members to this project. Only project owners can send invitations.';
export const INVITE_FAILED_MESSAGE = 'Unable to send invitation; try again.';
export const SELF_INVITE_MESSAGE = 'You cannot invite yourself to a project.';
export const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
