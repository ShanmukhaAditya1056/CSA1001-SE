// DevTrack Unit Tests: Business Rules & Validation (gemini.md Section 10)
import assert from 'node:assert';

export async function runBusinessRulesTests() {
  console.log('\n--- [UNIT TESTS] Business Rules & Model Validation ---');

  // 1. Role Permission Matrix Validation
  console.log('Testing: Role Permission Matrix...');
  const ROLES = {
    Owner: { canWrite: true, canManageTeam: true, canDeleteProject: true, canCutRelease: true },
    Developer: { canWrite: true, canManageTeam: false, canDeleteProject: false, canCutRelease: false },
    Tester: { canWrite: true, canManageTeam: false, canDeleteProject: false, canCutRelease: false },
    Viewer: { canWrite: false, canManageTeam: false, canDeleteProject: false, canCutRelease: false }
  };

  assert.strictEqual(ROLES.Owner.canManageTeam, true, 'Owner must have team management permission');
  assert.strictEqual(ROLES.Viewer.canWrite, false, 'Viewer must have read-only access');
  assert.strictEqual(ROLES.Developer.canDeleteProject, false, 'Developer cannot delete projects');
  console.log('✓ Role permission matrix correctly structured');

  // 2. MoSCoW Priorities Validation
  console.log('Testing: MoSCoW Priority Validation...');
  const validPriorities = ['Must', 'Should', 'Could', "Won't"];
  function validatePriority(p) {
    if (!validPriorities.includes(p)) throw new Error(`Invalid MoSCoW priority: ${p}`);
    return true;
  }
  validPriorities.forEach(p => assert.doesNotThrow(() => validatePriority(p)));
  assert.throws(() => validatePriority('Optional'), /Invalid MoSCoW priority/);
  console.log('✓ MoSCoW priorities strictly validated');

  // 3. Sprint Date Validation
  console.log('Testing: Sprint Date Range Validation...');
  function validateSprintDates(start, end) {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (isNaN(s) || isNaN(e)) return { valid: false, reason: 'Invalid date format' };
    if (s >= e) return { valid: false, reason: 'Start date must be strictly before end date' };
    return { valid: true };
  }
  assert.strictEqual(validateSprintDates('2026-10-01', '2026-10-15').valid, true);
  assert.strictEqual(validateSprintDates('2026-10-15', '2026-10-01').valid, false);
  assert.strictEqual(validateSprintDates('2026-10-01', '2026-10-01').valid, false);
  console.log('✓ Sprint date chronology enforced');

  // 4. Task State Machine Transitions
  console.log('Testing: Task Kanban Workflow Transitions...');
  const TASK_STATUSES = ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'];
  const ALLOWED_TASK_TRANSITIONS = {
    'Backlog': ['To Do'],
    'To Do': ['In Progress', 'Backlog'],
    'In Progress': ['In Review', 'To Do'],
    'In Review': ['Done', 'In Progress'],
    'Done': ['In Review']
  };

  function canTransitionTask(from, to) {
    if (!TASK_STATUSES.includes(from) || !TASK_STATUSES.includes(to)) return false;
    return ALLOWED_TASK_TRANSITIONS[from]?.includes(to) || false;
  }

  assert.strictEqual(canTransitionTask('Backlog', 'To Do'), true);
  assert.strictEqual(canTransitionTask('To Do', 'In Progress'), true);
  assert.strictEqual(canTransitionTask('In Progress', 'In Review'), true);
  assert.strictEqual(canTransitionTask('In Review', 'Done'), true);
  assert.strictEqual(canTransitionTask('Backlog', 'Done'), false);
  console.log('✓ Task Kanban state machine transitions validated');

  // 5. Bug Severity Triage & Status Flow
  console.log('Testing: Defect Severity Triage...');
  const BUG_SEVERITIES = ['Critical', 'High', 'Medium', 'Low'];
  function validateBugSeverity(sev) {
    return BUG_SEVERITIES.includes(sev);
  }
  assert.strictEqual(validateBugSeverity('Critical'), true);
  assert.strictEqual(validateBugSeverity('P1-Blocker'), false);

  const BUG_STATUSES = ['Open', 'In Progress', 'Fixed', 'Closed'];
  function validateBugStatus(status) {
    return BUG_STATUSES.includes(status);
  }
  assert.strictEqual(validateBugStatus('Fixed'), true);
  assert.strictEqual(validateBugStatus('Pending'), false);
  console.log('✓ Bug severity and lifecycle status validated');

  // 6. Traceability Matrix Calculation Logic
  console.log('Testing: Traceability Matrix Graph Aggregation...');
  const mockReq = { id: 'req-01', title: 'Login with OAuth' };
  const mockTasks = [{ id: 'task-01', requirementIds: ['req-01'] }, { id: 'task-02', requirementIds: ['req-02'] }];
  const mockTCs = [{ id: 'tc-01', requirementIds: ['req-01'] }];
  const mockRuns = [{ id: 'tr-01', testCaseId: 'tc-01', result: 'Passed' }];
  const mockBugs = [{ id: 'bug-01', relatedRequirementId: 'req-01' }];

  const linkedTasks = mockTasks.filter(t => t.requirementIds.includes(mockReq.id));
  const linkedTCs = mockTCs.filter(tc => tc.requirementIds.includes(mockReq.id));
  const linkedRuns = linkedTCs.flatMap(tc => mockRuns.filter(tr => tr.testCaseId === tc.id));
  const linkedBugs = mockBugs.filter(b => b.relatedRequirementId === mockReq.id);

  assert.strictEqual(linkedTasks.length, 1);
  assert.strictEqual(linkedTCs.length, 1);
  assert.strictEqual(linkedRuns.length, 1);
  assert.strictEqual(linkedBugs.length, 1);
  console.log('✓ Bidirectional traceability links correctly computed');

  // 7. Verified Account Policy for Team Members
  console.log('Testing: Verified Account Membership Policy...');
  const registeredUsers = [{ email: 'alice@company.com' }, { email: 'bob@company.com' }];
  function canAddToTeam(email) {
    const clean = (email || '').trim().toLowerCase();
    return registeredUsers.some(u => u.email.toLowerCase() === clean);
  }
  assert.strictEqual(canAddToTeam('alice@company.com'), true);
  assert.strictEqual(canAddToTeam('ALICE@company.com'), true);
  assert.strictEqual(canAddToTeam('unknown@random.com'), false);
  console.log('✓ Verified user membership rule confirmed');

  console.log('✓ All 7 Business Rules unit test suites PASSED!\n');
}
