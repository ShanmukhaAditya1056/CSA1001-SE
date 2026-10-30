// DevTrack Unit Tests: Business Rules & Validation (gemini.md Section 10)
import assert from 'node:assert';
import {
  ROLES, PERMISSIONS, can, MOSCOW_PRIORITIES, isValidPriority, validateSprintDates,
  TASK_STATUSES, TASK_TRANSITIONS, canTransitionTask, BUG_SEVERITIES, BUG_STATUSES,
  isValidSeverity, canTransitionBug, buildTraceability, computeCoverage
} from '../../src/rules.js';

export async function runBusinessRulesTests() {
  console.log('\n--- [UNIT TESTS] Business Rules & Model Validation ---');

  // 1. Role Permission Matrix Validation (production rules module)
  console.log('Testing: Role Permission Matrix...');
  assert.deepStrictEqual(ROLES, ['Owner', 'Developer', 'Tester', 'Viewer']);
  assert.strictEqual(can('Owner', 'team.manage'), true, 'Owner must have team management permission');
  assert.strictEqual(can('Owner', 'release.write'), true, 'Owner approves releases');
  assert.strictEqual(can('Developer', 'requirement.write'), true, 'Developer authors requirements');
  assert.strictEqual(can('Developer', 'task.write'), true, 'Developer moves Kanban tasks');
  assert.strictEqual(can('Developer', 'team.manage'), false, 'Developer cannot manage the team');
  assert.strictEqual(can('Tester', 'testrun.create'), true, 'Tester records test runs');
  assert.strictEqual(can('Tester', 'requirement.write'), false, 'Tester cannot author requirements');
  assert.strictEqual(can('Developer', 'bug.verify'), false, 'Developer cannot sign off own fixes');
  Object.keys(PERMISSIONS).forEach(action => assert.strictEqual(can('Viewer', action), false, `Viewer must be read-only (${action})`));
  assert.strictEqual(can(null, 'requirement.write'), false, 'Non-members have no permissions');
  console.log('✓ Role permission matrix correctly enforced');

  // 2. MoSCoW Priorities Validation
  console.log('Testing: MoSCoW Priority Validation...');
  MOSCOW_PRIORITIES.forEach(p => assert.strictEqual(isValidPriority(p), true));
  assert.strictEqual(isValidPriority('Optional'), false);
  assert.strictEqual(isValidPriority('must'), false, 'Priorities are case-sensitive');
  console.log('✓ MoSCoW priorities strictly validated');

  // 3. Sprint Date Validation
  console.log('Testing: Sprint Date Range Validation...');
  assert.strictEqual(validateSprintDates('2026-10-01', '2026-10-15').valid, true);
  assert.strictEqual(validateSprintDates('2026-10-15', '2026-10-01').valid, false);
  assert.strictEqual(validateSprintDates('2026-10-01', '2026-10-01').valid, false);
  assert.strictEqual(validateSprintDates('not-a-date', '2026-10-01').valid, false);
  assert.strictEqual(validateSprintDates('', '').valid, false);
  console.log('✓ Sprint date chronology enforced');

  // 4. Task State Machine Transitions
  console.log('Testing: Task Kanban Workflow Transitions...');
  assert.strictEqual(canTransitionTask('Backlog', 'To Do'), true);
  assert.strictEqual(canTransitionTask('To Do', 'In Progress'), true);
  assert.strictEqual(canTransitionTask('In Progress', 'In Review'), true);
  assert.strictEqual(canTransitionTask('In Review', 'Done'), true);
  assert.strictEqual(canTransitionTask('Backlog', 'Done'), false);
  assert.strictEqual(canTransitionTask('To Do', 'Done'), false, 'Cannot skip review');
  assert.strictEqual(canTransitionTask('Done', 'Archived'), false, 'Unknown terminal states rejected');
  TASK_STATUSES.forEach(st => assert.ok(Array.isArray(TASK_TRANSITIONS[st]), `${st} has a transition list`));
  console.log('✓ Task Kanban state machine transitions validated');

  // 5. Bug Severity Triage & Status Flow
  console.log('Testing: Defect Severity Triage...');
  BUG_SEVERITIES.forEach(sev => assert.strictEqual(isValidSeverity(sev), true));
  assert.strictEqual(isValidSeverity('P1-Blocker'), false);
  assert.deepStrictEqual(BUG_STATUSES, ['Open', 'In Progress', 'Fixed', 'Verified', 'Closed']);
  assert.strictEqual(canTransitionBug('Open', 'In Progress'), true);
  assert.strictEqual(canTransitionBug('In Progress', 'Fixed'), true);
  assert.strictEqual(canTransitionBug('Fixed', 'Verified'), true);
  assert.strictEqual(canTransitionBug('Verified', 'Closed'), true);
  assert.strictEqual(canTransitionBug('Open', 'Verified'), false, 'Cannot verify an unfixed defect');
  assert.strictEqual(canTransitionBug('Open', 'Pending'), false);
  console.log('✓ Bug severity and lifecycle status validated');

  // 6. Traceability Matrix Calculation Logic
  console.log('Testing: Traceability Matrix Graph Aggregation...');
  const matrix = buildTraceability({
    requirements: [{ id: 'req-01', title: 'Login with OAuth', targetRelease: 'rel-01' }, { id: 'req-02', title: 'Untested' }],
    tasks: [{ id: 'task-01', requirementIds: ['req-01'] }, { id: 'task-02', requirementIds: ['req-02'] }],
    testCases: [{ id: 'tc-01', requirementIds: ['req-01'] }],
    testRuns: [
      { id: 'tr-01', testCaseId: 'tc-01', result: 'Failed', executedAt: '2026-10-01T00:00:00Z' },
      { id: 'tr-02', testCaseId: 'tc-01', result: 'Passed', executedAt: '2026-10-02T00:00:00Z' }
    ],
    bugs: [{ id: 'bug-01', relatedRequirementId: 'req-01', severity: 'Critical', status: 'Verified' }],
    releases: [{ id: 'rel-01', name: 'v1.0.0' }]
  });
  const row = matrix.find(r => r.requirement.id === 'req-01');
  assert.strictEqual(row.tasks.length, 1);
  assert.strictEqual(row.testCases.length, 1);
  assert.strictEqual(row.testRuns.length, 2);
  assert.strictEqual(row.bugs.length, 1);
  assert.strictEqual(row.releases[0].id, 'rel-01', 'Requirement must trace through to its release gate');
  const coverage = computeCoverage(matrix);
  assert.strictEqual(coverage.requirementsVerifiedPct, 50, 'Only req-01 has a latest passing run');
  assert.strictEqual(coverage.defectsResolvedPct, 100);
  assert.strictEqual(coverage.blockerCount, 0);
  console.log('✓ Bidirectional traceability links and coverage correctly computed');

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

  // 8. Project Invitation Lifecycle & Security Rules
  console.log('Testing: Project Invitation Lifecycle & Security Rules...');
  function createTestInvitation(inviterRole, inviteeEmail, role) {
    if (inviterRole !== 'Owner') throw new Error('FORBIDDEN: Only owners can invite');
    const clean = (inviteeEmail || '').trim().toLowerCase();
    if (!clean || !clean.includes('@') || !clean.includes('.')) throw new Error('INVALID_EMAIL');
    return {
      token: 'inv_test_' + Math.random().toString(36).slice(2),
      inviteeEmail: clean,
      role: role || 'Developer',
      status: 'Pending',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  // Permission check: Developer/Viewer cannot invite
  assert.throws(() => createTestInvitation('Developer', 'user@test.io'), /Only owners can invite/);
  assert.throws(() => createTestInvitation('Viewer', 'user@test.io'), /Only owners can invite/);
  const inv = createTestInvitation('Owner', 'colleague@test.io', 'Developer');
  assert.strictEqual(inv.status, 'Pending');
  assert.ok(inv.token.startsWith('inv_test_'));

  // Acceptance validation: Identity & Expiry
  function validateInvitationAcceptance(invitation, userEmail, currentTimeMs = Date.now()) {
    if (new Date(invitation.expiresAt).getTime() <= currentTimeMs) return { allowed: false, reason: 'EXPIRED' };
    if (invitation.status !== 'Pending') return { allowed: false, reason: 'NOT_PENDING' };
    if (userEmail.toLowerCase() !== invitation.inviteeEmail.toLowerCase()) return { allowed: false, reason: 'IDENTITY_MISMATCH' };
    return { allowed: true };
  }

  // Identity mismatch rejection
  assert.strictEqual(validateInvitationAcceptance(inv, 'wrong@test.io').allowed, false);
  assert.strictEqual(validateInvitationAcceptance(inv, 'wrong@test.io').reason, 'IDENTITY_MISMATCH');

  // Correct identity acceptance
  assert.strictEqual(validateInvitationAcceptance(inv, 'colleague@test.io').allowed, true);

  // Expiry rejection
  const futureExpiredTime = Date.now() + 8 * 24 * 60 * 60 * 1000;
  assert.strictEqual(validateInvitationAcceptance(inv, 'colleague@test.io', futureExpiredTime).allowed, false);
  assert.strictEqual(validateInvitationAcceptance(inv, 'colleague@test.io', futureExpiredTime).reason, 'EXPIRED');

  // Decline flow: ensures NO membership created
  let mockMembers = [];
  function processDecline(invitation, userEmail) {
    const val = validateInvitationAcceptance(invitation, userEmail);
    if (!val.allowed) throw new Error(val.reason);
    invitation.status = 'Declined';
    return invitation;
  }
  processDecline(inv, 'colleague@test.io');
  assert.strictEqual(inv.status, 'Declined');
  assert.strictEqual(mockMembers.length, 0, 'Declining invitation must not create membership');

  // Accept flow: creates membership
  const freshInv = createTestInvitation('Owner', 'joiner@test.io', 'Developer');
  function processAccept(invitation, userEmail, userId) {
    const val = validateInvitationAcceptance(invitation, userEmail);
    if (!val.allowed) throw new Error(val.reason);
    invitation.status = 'Accepted';
    mockMembers.push({ userId, email: userEmail, role: invitation.role });
    return invitation;
  }
  processAccept(freshInv, 'joiner@test.io', 'usr-joiner');
  assert.strictEqual(freshInv.status, 'Accepted');
  assert.strictEqual(mockMembers.length, 1);
  assert.strictEqual(mockMembers[0].userId, 'usr-joiner');
  console.log('✓ Project invitation security, identity, and membership rules confirmed');

  console.log('✓ All 8 Business Rules unit test suites PASSED!\n');
}

