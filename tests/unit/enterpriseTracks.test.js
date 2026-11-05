// DevTrack Automated Unit Test Suite: 5 Enterprise Engineering Tracks
import assert from 'node:assert';

function makeStorage() {
  const data = {};
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => { data[key] = String(value); },
    removeItem: (key) => { delete data[key]; },
    clear: () => { Object.keys(data).forEach(key => delete data[key]); }
  };
}

export async function runEnterpriseTracksTests() {
  global.localStorage = makeStorage();
  global.sessionStorage = makeStorage();

  const { store } = await import('../../src/store.js');
  store._data = null;
  store.resetData();

  console.log('\n--- [UNIT TESTS] Enterprise Tracks: GitOps, DORA, Dual Signoff & Webhooks ---');

  // Setup test environment & workspace
  const lead = { uid: 'eng-lead', email: 'lead@enterprise.io', displayName: 'Engineering Lead Elena' };
  const qa = { uid: 'qa-lead', email: 'qa@enterprise.io', displayName: 'QA Lead Marcus' };
  store.setFirebaseUser(lead);
  store.setFirebaseUser(qa);
  store.setFirebaseUser(lead);

  const project = store.createProject({ name: 'Enterprise Core Platform', key: 'ECOR' }).data;
  store.addMember(project.id, qa.email, 'Tester');

  // ============================================================
  // 1. Team Working Agreements & Collaboration
  // ============================================================
  const { getTeamPreferences, saveTeamPreferences } = await import('../../src/collab.js');
  const initialPrefs = getTeamPreferences(project.id);
  assert.strictEqual(initialPrefs.sprintDurationWeeks, 2, 'Default sprint duration is 2 weeks');
  assert.strictEqual(initialPrefs.estimationScale, 'fibonacci', 'Default estimation scale is Fibonacci');
  assert.strictEqual(initialPrefs.wipEnforcement, 'warning', 'Default WIP mode is warning');

  const updatedPrefs = saveTeamPreferences(project.id, {
    sprintDurationWeeks: 3,
    wipEnforcement: 'strict',
    estimationScale: 'linear'
  });
  assert.strictEqual(updatedPrefs.sprintDurationWeeks, 3);
  assert.strictEqual(updatedPrefs.wipEnforcement, 'strict');
  assert.strictEqual(updatedPrefs.estimationScale, 'linear');
  console.log('✓ Track 1: Team Working Agreements configuration & persistence confirmed');

  // ============================================================
  // 2. GitOps & Commit-to-Card Automation
  // ============================================================
  const { generateBranchName, recordGitCommit, updatePullRequest } = await import('../../src/gitops.js');
  const sprint = store.createSprint(project.id, { name: 'Sprint 1', startDate: '2026-11-01', endDate: '2026-11-15', status: 'Active' }).data;
  const task = store.createTask(project.id, { title: 'Implement WebSocket Telemetry Stream', sprintId: sprint.id, estimate: 5 }).data;

  // Branch Name Generation
  const taskKey = `${project.key}-101`;
  const branchName = generateBranchName(project.key, taskKey, task.title);
  assert.match(branchName, /^feat\/ecor-101-implement-websocket/i, 'Branch naming matches canonical feat/KEY-slug syntax');

  // Commit Recording & Auto Transition To Do -> In Progress
  const commitRes = recordGitCommit(task.id, { message: 'feat: implement socket connection' });
  assert.ok(!commitRes.error, 'Git commit recorded');
  assert.strictEqual(commitRes.data.status, 'In Progress', 'First commit auto-promotes To Do -> In Progress');
  assert.strictEqual(commitRes.data.gitCommits.length, 1, 'Commit saved to task');

  // Pull Request Open -> In Review
  const prOpenRes = updatePullRequest(task.id, 'open');
  assert.ok(!prOpenRes.error);
  assert.strictEqual(prOpenRes.data.status, 'In Review', 'Opening PR auto-promotes In Progress -> In Review');
  assert.strictEqual(prOpenRes.data.pullRequest.status, 'open');

  // Pull Request Merge -> Done
  const prMergeRes = updatePullRequest(task.id, 'merge');
  assert.ok(!prMergeRes.error);
  assert.strictEqual(prMergeRes.data.status, 'Done', 'Merging PR auto-promotes In Review -> Done');
  assert.strictEqual(prMergeRes.data.pullRequest.status, 'merged');
  console.log('✓ Track 2: GitOps branch naming, commit recording & automated PR transitions confirmed');

  // ============================================================
  // 3. Flow & DORA Metrics Analytics
  // ============================================================
  const { computeFlowMetrics } = await import('../../src/analytics.js');

  // Add a release for DORA cadence
  store.createRelease(project.id, { name: 'v1.0.0 — Production Core', targetDate: '2026-11-10', status: 'Released' });

  const flow = computeFlowMetrics(project.id);
  assert.strictEqual(flow.projectKey, 'ECOR');
  assert.strictEqual(flow.totalPoints, 5);
  assert.strictEqual(flow.completedPoints, 5);
  assert.strictEqual(flow.completionPct, 100);

  // DORA 4 Metrics Verification
  assert.ok(flow.dora.deploymentFrequency.value, 'Deployment frequency computed');
  assert.ok(flow.dora.leadTimeForChanges.value, 'Lead time for changes computed');
  assert.ok(flow.dora.changeFailureRate.value, 'Change failure rate computed');
  assert.ok(flow.dora.timeToRestoreService.value, 'MTTR computed');
  assert.ok(['ELITE', 'HIGH', 'MEDIUM'].includes(flow.dora.deploymentFrequency.rating));

  // Cycle Time Breakdown
  assert.ok(flow.cycleTime.devTimeDays > 0, 'Dev coding time estimated');
  assert.ok(flow.cycleTime.reviewTimeDays > 0, 'Review wait time estimated');
  console.log('✓ Track 3: Flow distribution, Cycle Time split & DORA 4 core metrics confirmed');

  // ============================================================
  // 4. Two-Person Integrity Release Gate & Semantic Changelog
  // ============================================================
  const { checkReleaseSignoffStatus, recordReleaseSignoff, generateSemanticChangelog } = await import('../../src/releaseChangelog.js');
  const stagedRel = store.createRelease(project.id, { name: 'v1.1.0 — Flight Sensor Telemetry', targetDate: '2026-11-20', status: 'Staging' }).data;

  // Initial State: Uncertified
  const preSignoff = checkReleaseSignoffStatus(stagedRel);
  assert.strictEqual(preSignoff.isFullyCertified, false);
  assert.strictEqual(preSignoff.engSigned, false);
  assert.strictEqual(preSignoff.qaSigned, false);

  // Step 1: Engineering Lead Signoff
  const engRes = recordReleaseSignoff(stagedRel.id, 'engineering', { signerName: 'Elena Rostova', notes: 'All PRs merged and peer reviewed' });
  assert.ok(!engRes.error, 'Engineering signoff recorded');
  assert.strictEqual(engRes.isBothSigned, false, 'Still pending QA signoff');

  // Step 2: QA Lead Signoff
  const qaRes = recordReleaseSignoff(stagedRel.id, 'qa', { signerName: 'Marcus Rivera', notes: 'Full test suite passed with 0 blockers' });
  assert.ok(!qaRes.error, 'QA signoff recorded');
  assert.strictEqual(qaRes.isBothSigned, true, 'Both signoffs complete');

  // Certified Status Verification
  const certifiedRel = store.getRelease(stagedRel.id);
  const postSignoff = checkReleaseSignoffStatus(certifiedRel);
  assert.strictEqual(postSignoff.isFullyCertified, true, 'Two-Person Integrity certified');
  assert.strictEqual(postSignoff.canPromoteToProduction, true, 'Production deployment unlocked');

  // Keep-a-Changelog Markdown Generation
  const changelog = generateSemanticChangelog(stagedRel.id);
  assert.ok(changelog.markdown.includes('# Release Notes — v1.1.0'), 'Header formatted');
  assert.ok(changelog.markdown.includes('## 🚀 Features & Enhancements'), 'Features section present');
  assert.ok(changelog.markdown.includes('## ✍️ Two-Person Integrity Dual Digital Sign-off'), 'Sign-off signatures present');
  assert.ok(changelog.markdown.includes('Elena Rostova'), 'Engineering lead signature embedded');
  assert.ok(changelog.markdown.includes('Marcus Rivera'), 'QA lead signature embedded');
  console.log('✓ Track 4: Two-person digital signoff gate & Keep-a-Changelog generation confirmed');

  // ============================================================
  // 5. Outbound Webhook Bus & CI/CD Integrations Hub
  // ============================================================
  const { getWebhooks, saveWebhook, toggleWebhook, formatWebhookPayload, testWebhook, getWebhookDeliveries } = await import('../../src/webhooks.js');

  // Registration
  const slackWh = saveWebhook(project.id, {
    name: 'Ops Slack Incident Channel',
    url: 'https://hooks.slack.com/services/T00/B00/test-token',
    serviceType: 'slack',
    events: ['defect.created', 'release.promoted', 'release.signed_off']
  }).data;
  assert.strictEqual(slackWh.serviceType, 'slack');
  assert.strictEqual(slackWh.active, true);

  // Toggle State
  toggleWebhook(project.id, slackWh.id, false);
  assert.strictEqual(getWebhooks(project.id).find(w => w.id === slackWh.id).active, false);
  toggleWebhook(project.id, slackWh.id, true);

  // Payload Formatting: Slack Block Kit
  const slackPayload = formatWebhookPayload(slackWh, 'defect.created', { title: 'Critical Defect: Sensor buffer overflow', details: 'UART packet burst' });
  assert.ok(slackPayload.blocks, 'Slack payload generates Block Kit blocks');
  assert.ok(slackPayload.text.includes('Critical Defect'), 'Slack notification text formatted');

  // Payload Formatting: Discord Embeds
  const discordPayload = formatWebhookPayload({ ...slackWh, serviceType: 'discord' }, 'release.promoted', { title: 'Release Shipped v1.1.0' });
  assert.ok(discordPayload.embeds, 'Discord payload generates Embeds');
  assert.strictEqual(discordPayload.embeds[0].color, 0x10b981, 'Success color applied');

  // Payload Formatting: CloudEvents Standard
  const customPayload = formatWebhookPayload({ ...slackWh, serviceType: 'custom' }, 'task.moved', { title: 'Task moved to Done' });
  assert.strictEqual(customPayload.specversion, '1.0');
  assert.strictEqual(customPayload.type, 'io.devtrack.task.moved');

  // Test Ping Execution
  const testRes = await testWebhook(project.id, slackWh.id, 'defect.created');
  assert.strictEqual(testRes.success, true);
  assert.ok(testRes.status.includes('200 OK'));

  // Delivery Audit Stream
  const deliveries = getWebhookDeliveries(project.id);
  assert.ok(deliveries.length > 0, 'Outbound delivery logged in audit stream');
  assert.strictEqual(deliveries[0].webhookId, slackWh.id);
  console.log('✓ Track 5: Outbound webhooks (Slack, Discord, Custom) & test ping dispatch confirmed');

  console.log('🎉 All 5 Enterprise Tracks PASSED unit verification!');
}
