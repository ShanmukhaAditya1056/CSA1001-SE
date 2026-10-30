// DevTrack Test Cases & QA Run Execution
import { store } from '../store.js';
import { statusChip, formatDate, formatDateTime, showToast, showModal, closeModal, avatar } from '../ui.js';
import { TEST_TYPES } from '../rules.js';

let activeTab = 'CASES'; // 'CASES' or 'RUNS'

export function renderTests(container) {
  const project = store.getActiveProject();
  if (!project) {
    container.innerHTML = `<div class="p-12 text-center text-text-muted">Select or create a project first.</div>`;
    return;
  }

  const testCases = store.getTestCases(project.id);
  const testRuns = store.getTestRuns(project.id);
  const reqs = store.getRequirements(project.id);

  const passedCount = testRuns.filter(r => r.result === 'Passed').length;
  const failedCount = testRuns.filter(r => r.result === 'Failed').length;
  const blockedCount = testRuns.filter(r => r.result === 'Blocked').length;
  const skippedCount = testRuns.filter(r => r.result === 'Skipped').length;
  const passRate = testRuns.length > 0 ? Math.round((passedCount / testRuns.length) * 100) : 100;

  container.innerHTML = `
    <div class="relative w-full px-6 py-6">
      <!-- Header -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div class="flex items-center gap-2 font-jetbrains text-mono-md text-text-muted mb-1">
            <span>${project.key}</span>
            <span>/</span>
            <span class="text-secondary font-medium">QUALITY ASSURANCE</span>
            <span>/</span>
            <span class="text-text-primary">TEST SUITES & TELEMETRY</span>
          </div>
          <h1 class="font-geist text-headline-xl font-bold text-text-primary tracking-tight">Test Cases & QA Run Execution</h1>
          <p class="text-body-sm text-text-muted mt-1">Manual test specifications, append-only execution records, and defect linking</p>
        </div>

        <div class="flex items-center flex-wrap gap-2.5">
          <button id="add-tc-btn" class="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-primary font-medium text-body-md border border-border-subtle transition-all">
            <span class="material-symbols-outlined text-[18px]">post_add</span>
            <span>+ New Test Case</span>
          </button>
          <button id="exec-run-btn" class="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-fixed text-on-primary font-semibold text-body-md transition-all shadow-md shadow-primary/20 active:scale-95">
            <span class="material-symbols-outlined text-[18px]">play_circle</span>
            <span>Execute Test Run</span>
          </button>
        </div>
      </div>

      <!-- QA Telemetry Stats Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <div class="bg-surface-canvas border border-border-subtle rounded-xl p-4">
          <div class="text-[11px] font-jetbrains text-text-muted uppercase mb-1">Verification Pass Rate</div>
          <div class="font-geist text-headline-lg font-bold ${passRate >= 80 ? 'text-status-passed' : 'text-status-defect'}">${passRate}%</div>
          <div class="text-[11px] text-text-secondary mt-1 font-jetbrains">${testRuns.length} total runs logged</div>
        </div>

        <div class="bg-surface-canvas border border-border-subtle rounded-xl p-4">
          <div class="text-[11px] font-jetbrains text-status-passed uppercase mb-1">Passed Executions</div>
          <div class="font-geist text-headline-lg font-bold text-status-passed">${passedCount}</div>
          <div class="text-[11px] text-text-muted mt-1 font-jetbrains">Assertions verified</div>
        </div>

        <div class="bg-surface-canvas border border-border-subtle rounded-xl p-4">
          <div class="text-[11px] font-jetbrains text-status-defect uppercase mb-1">Failed Runs</div>
          <div class="font-geist text-headline-lg font-bold text-status-defect">${failedCount}</div>
          <div class="text-[11px] text-text-muted mt-1 font-jetbrains">Requires triage / fix</div>
        </div>

        <div class="bg-surface-canvas border border-border-subtle rounded-xl p-4">
          <div class="text-[11px] font-jetbrains text-status-in-progress uppercase mb-1">Blocked Runs</div>
          <div class="font-geist text-headline-lg font-bold text-status-in-progress">${blockedCount}</div>
          <div class="text-[11px] text-text-muted mt-1 font-jetbrains">Pending dependency</div>
        </div>

        <div class="bg-surface-canvas border border-border-subtle rounded-xl p-4">
          <div class="text-[11px] font-jetbrains text-text-muted uppercase mb-1">Total Test Cases</div>
          <div class="font-geist text-headline-lg font-bold text-text-primary">${testCases.length}</div>
          <div class="text-[11px] text-text-secondary mt-1 font-jetbrains">Active test specifications</div>
        </div>
      </div>

      <!-- Navigation Tabs: Test Cases vs Test Runs History -->
      <div class="flex items-center gap-2 border-b border-border-subtle mb-6">
        <button class="qa-tab px-4 py-2.5 font-jetbrains text-label-md font-semibold transition-all border-b-2 ${activeTab === 'CASES' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-primary'}" data-tab="CASES">
          Test Specifications (${testCases.length})
        </button>
        <button class="qa-tab px-4 py-2.5 font-jetbrains text-label-md font-semibold transition-all border-b-2 ${activeTab === 'RUNS' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-primary'}" data-tab="RUNS">
          Execution Runs Log (${testRuns.length})
        </button>
      </div>

      <!-- Tab 1: Test Cases -->
      ${activeTab === 'CASES' ? `
        <div class="space-y-4">
          ${testCases.length === 0 ? `
            <div class="bg-surface-canvas border border-border-subtle rounded-xl p-12 text-center">
              <span class="material-symbols-outlined text-text-muted text-[48px] mb-3">quiz</span>
              <h3 class="font-geist text-headline-sm font-bold text-text-primary mb-1">No Test Cases Yet</h3>
              <p class="text-text-muted text-body-sm max-w-sm mx-auto mb-4">Create your first test specification to verify requirement acceptance criteria.</p>
              <button onclick="document.getElementById('add-tc-btn').click()" class="px-4 py-2 bg-primary text-on-primary rounded-lg font-semibold text-body-md">Create Test Case</button>
            </div>
          ` : testCases.map(tc => {
            const req = reqs.find(r => tc.requirementIds?.includes(r.id));
            const runs = testRuns.filter(r => r.testCaseId === tc.id);
            const latestRun = runs[runs.length - 1];

            return `
              <div class="bg-surface-canvas border border-border-subtle rounded-xl p-5 hover:border-border-strong transition-all shadow-sm">
                <div class="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div class="flex-1">
                    <div class="flex items-center flex-wrap gap-2.5 mb-2">
                      <span class="font-jetbrains text-mono-md font-bold px-2 py-0.5 rounded bg-primary-container/20 text-primary">${tc.id}</span>
                      ${latestRun ? statusChip(latestRun.result) : '<span class="font-jetbrains text-[11px] px-2 py-0.5 rounded bg-surface-elevated text-text-muted">UNEXECUTED</span>'}
                      <span class="font-jetbrains text-[11px] text-text-muted">${runs.length} Runs Executed</span>
                    </div>

                    <h3 class="font-geist text-headline-sm font-bold text-text-primary mb-2">${tc.title}</h3>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 text-body-sm">
                      <div class="p-3 bg-surface-base/80 rounded-lg border border-border-subtle">
                        <strong class="text-text-secondary text-[11px] font-jetbrains uppercase block mb-1">Objective</strong>
                        <p class="text-text-primary">${tc.objective || 'N/A'}</p>
                        ${tc.preconditions ? `
                          <strong class="text-text-secondary text-[11px] font-jetbrains uppercase block mt-2 mb-1">Preconditions</strong>
                          <p class="text-text-muted font-jetbrains text-[12px]">${tc.preconditions}</p>
                        ` : ''}
                      </div>

                      <div class="p-3 bg-surface-base/80 rounded-lg border border-border-subtle">
                        <strong class="text-text-secondary text-[11px] font-jetbrains uppercase block mb-1">Test Steps</strong>
                        <p class="text-text-primary font-jetbrains text-[12px] whitespace-pre-line mb-2">${tc.steps || '1. Navigate\n2. Perform action\n3. Verify'}</p>
                        <strong class="text-status-passed text-[11px] font-jetbrains uppercase block mb-1">Expected Result</strong>
                        <p class="text-text-secondary font-jetbrains text-[12px]">${tc.expectedResult || 'Expected pass state'}</p>
                      </div>
                    </div>

                    ${req ? `
                      <div class="flex items-center gap-1.5 font-jetbrains text-[11px] text-secondary">
                        <span class="material-symbols-outlined text-[15px]">link</span>
                        <span>Traces to ${req.id}: ${req.title}</span>
                      </div>
                    ` : ''}
                  </div>

                  <div class="flex lg:flex-col gap-2 shrink-0">
                    <button class="run-single-tc-btn px-4 py-2 rounded-lg bg-primary hover:bg-primary-fixed text-on-primary text-body-sm font-semibold transition-all shadow-sm flex items-center gap-1.5" data-id="${tc.id}">
                      <span class="material-symbols-outlined text-[16px]">play_arrow</span>
                      <span>Run Test</span>
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : `
        <!-- Tab 2: Test Runs Append-Only Log -->
        <div class="space-y-3">
          ${testRuns.length === 0 ? `
            <div class="p-12 text-center text-text-muted font-jetbrains">No test runs executed yet.</div>
          ` : [...testRuns].reverse().map(run => {
            const tc = testCases.find(t => t.id === run.testCaseId);
            const executor = store.getUser(run.executedBy) || (store.currentUser ? { name: store.currentUser.name } : { name: 'QA Tester' });

            return `
              <div class="p-4 rounded-xl bg-surface-canvas border border-border-subtle flex flex-col md:flex-row md:items-center justify-between gap-4 font-jetbrains">
                <div class="flex items-start gap-3">
                  <div class="mt-0.5">
                    ${statusChip(run.result)}
                  </div>
                  <div>
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-mono-md font-bold text-text-primary">${run.testCaseId}</span>
                      <span class="text-text-muted text-[12px]">${tc ? tc.title : 'Test Case'}</span>
                    </div>
                    ${run.notes ? `<p class="text-body-sm text-text-secondary font-inter mb-1.5">${run.notes}</p>` : ''}
                    <div class="flex items-center gap-3 text-[11px] text-text-muted">
                      <span>Executed by: <strong class="text-text-primary">${executor.name}</strong></span>
                      <span>${formatDateTime(run.executedAt)}</span>
                    </div>
                  </div>
                </div>

                ${run.result === 'Failed' ? `
                  <div class="shrink-0">
                    <button class="link-bug-btn px-3 py-1.5 rounded-lg bg-status-defect-surface hover:bg-status-defect/20 text-status-defect text-[11px] font-semibold border border-status-defect/30 transition-all flex items-center gap-1" data-runid="${run.id}" data-tcid="${run.testCaseId}">
                      <span class="material-symbols-outlined text-[14px]">bug_report</span>
                      <span>Log Linked Bug</span>
                    </button>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;

  // Attach tab switching
  container.querySelectorAll('.qa-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeTab = tab.dataset.tab;
      renderTests(container);
    });
  });

  // Attach Add Test Case trigger
  container.querySelector('#add-tc-btn')?.addEventListener('click', () => {
    openTestCaseModal(project.id, () => renderTests(container));
  });

  // Attach Execute Run trigger
  container.querySelector('#exec-run-btn')?.addEventListener('click', () => {
    openExecuteRunModal(project.id, null, () => renderTests(container));
  });

  // Run single test case button
  container.querySelectorAll('.run-single-tc-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tcid = btn.dataset.id;
      openExecuteRunModal(project.id, tcid, () => renderTests(container));
    });
  });

  // Log linked bug from failed run
  container.querySelectorAll('.link-bug-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const runId = btn.dataset.runid;
      const tcId = btn.dataset.tcid;
      openLinkedBugModal(project.id, runId, tcId);
    });
  });
}

function openTestCaseModal(projectId, onSaved) {
  const reqs = store.getRequirements(projectId);

  showModal(`
    <form id="new-tc-form" class="space-y-4">
      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Test Case Title *</label>
        <input type="text" id="tc-title" required placeholder="e.g. Verify duplicate email rejected with 409 status"
          class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all" />
      </div>

      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Target Requirement Specification *</label>
        <select id="tc-req" required class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none">
          ${reqs.map(r => `<option value="${r.id}">${r.id}: ${r.title}</option>`).join('')}
        </select>
      </div>

      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Test Type *</label>
        <select id="tc-type" required class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none">
          ${TEST_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
        </select>
      </div>

      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Objective</label>
        <input type="text" id="tc-objective" placeholder="e.g. Ensure idempotency and uniqueness validations"
          class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none" />
      </div>

      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Preconditions</label>
        <input type="text" id="tc-pre" placeholder="e.g. Existing registered user in database"
          class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none" />
      </div>

      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Step-by-Step Test Procedure *</label>
        <textarea id="tc-steps" rows="3" required placeholder="1. Submit POST /api/v1/auth/register\n2. Provide duplicate email\n3. Assert response"
          class="w-full bg-surface-base text-text-primary font-jetbrains text-body-sm px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none"></textarea>
      </div>

      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Expected Assertion Result *</label>
        <textarea id="tc-expected" rows="2" required placeholder="HTTP 409 with 'Email already in use' message body"
          class="w-full bg-surface-base text-text-primary font-jetbrains text-body-sm px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none"></textarea>
      </div>

      <div class="flex justify-end gap-3 pt-3">
        <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-secondary hover:bg-surface-elevated text-body-md">Cancel</button>
        <button type="submit" class="px-5 py-2 rounded-lg bg-primary text-on-primary font-semibold text-body-md hover:bg-primary-fixed shadow-md shadow-primary/20">Create Test Case</button>
      </div>
    </form>
  `, { title: 'Create Manual Test Specification' });

  document.getElementById('new-tc-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('tc-title').value.trim();
    const reqId = document.getElementById('tc-req').value;
    const objective = document.getElementById('tc-objective').value.trim();
    const preconditions = document.getElementById('tc-pre').value.trim();
    const steps = document.getElementById('tc-steps').value.trim();
    const expectedResult = document.getElementById('tc-expected').value.trim();
    const type = document.getElementById('tc-type').value;

    const res = store.createTestCase(projectId, {
      title,
      type,
      requirementIds: reqId ? [reqId] : [],
      objective,
      preconditions,
      steps,
      expectedResult
    });
    if (res.error) {
      showToast(res.error, 'error');
      return;
    }

    closeModal();
    showToast('Test case created!', 'success');
    if (onSaved) onSaved();
  });
}

function openExecuteRunModal(projectId, preselectedTcId, onSaved) {
  const testCases = store.getTestCases(projectId);

  showModal(`
    <form id="execute-run-form" class="space-y-4">
      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Test Case *</label>
        <select id="run-tcid" required class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none">
          ${testCases.map(tc => `<option value="${tc.id}" ${tc.id === preselectedTcId ? 'selected' : ''}>${tc.id}: ${tc.title}</option>`).join('')}
        </select>
      </div>

      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Execution Outcome *</label>
        <select id="run-outcome" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none font-jetbrains font-semibold">
          <option value="Passed" class="text-status-passed">Passed — All Assertions Verified</option>
          <option value="Failed" class="text-status-defect">Failed — Bug or Unexpected Response</option>
          <option value="Blocked" class="text-status-in-progress">Blocked — Upstream Dependency Missing</option>
        </select>
      </div>

      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Execution Notes & Assertion Telemetry</label>
        <textarea id="run-notes" rows="3" placeholder="Paste response status code, assertion diff, or browser logs..."
          class="w-full bg-surface-base text-text-primary font-jetbrains text-body-sm px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none"></textarea>
      </div>

      <div class="flex justify-end gap-3 pt-3">
        <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-secondary hover:bg-surface-elevated text-body-md">Cancel</button>
        <button type="submit" class="px-5 py-2 rounded-lg bg-primary text-on-primary font-semibold text-body-md hover:bg-primary-fixed shadow-md shadow-primary/20">Commit Execution Record</button>
      </div>
    </form>
  `, { title: 'Execute QA Test & Record Result' });

  document.getElementById('execute-run-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const testCaseId = document.getElementById('run-tcid').value;
    const result = document.getElementById('run-outcome').value;
    const notes = document.getElementById('run-notes').value.trim();

    const res = store.createTestRun(testCaseId, { result, notes });
    if (res.error) {
      showToast(res.error, 'error');
      return;
    }
    closeModal();
    showToast(`Test execution recorded as ${result}!`, result === 'Passed' ? 'success' : 'error');
    if (onSaved) onSaved();
  });
}

function openLinkedBugModal(projectId, runId, tcId) {
  const tc = store.getTestCases(projectId).find(t => t.id === tcId);
  const reqId = tc?.requirementIds?.[0] || null;

  showModal(`
    <form id="linked-bug-form" class="space-y-4">
      <div class="p-3 rounded-lg bg-status-defect-surface border border-status-defect/30 text-status-defect text-body-sm font-jetbrains">
        Linking to Failed Test Run: <strong>${runId}</strong> (${tc?.id || 'TC'})
      </div>

      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Defect Title *</label>
        <input type="text" id="lbug-title" required value="Assertion failure in ${tc?.title || 'Test Run'}"
          class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none" />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">Severity</label>
          <select id="lbug-sev" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none">
            <option value="Critical">Critical</option>
            <option value="High" selected>High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">Priority</label>
          <select id="lbug-pri" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none">
            <option value="High" selected>High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Steps to Reproduce</label>
        <textarea id="lbug-steps" rows="3" class="w-full bg-surface-base text-text-primary font-jetbrains text-body-sm px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none">${tc?.steps || ''}</textarea>
      </div>

      <div class="flex justify-end gap-3 pt-3">
        <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-secondary hover:bg-surface-elevated text-body-md">Cancel</button>
        <button type="submit" class="px-5 py-2 rounded-lg bg-status-defect text-on-error font-semibold text-body-md hover:brightness-110">Log Defect</button>
      </div>
    </form>
  `, { title: 'Log Linked QA Defect' });

  document.getElementById('linked-bug-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('lbug-title').value.trim();
    const severity = document.getElementById('lbug-sev').value;
    const priority = document.getElementById('lbug-pri').value;
    const stepsToReproduce = document.getElementById('lbug-steps').value.trim();

    const res = store.createBug(projectId, {
      title,
      severity,
      priority,
      stepsToReproduce,
      relatedTestRunId: runId,
      relatedRequirementId: reqId
    });
    if (res.error) {
      showToast(res.error, 'error');
      return;
    }

    closeModal();
    showToast('Bug linked and filed in Bug Tracker!', 'success');
    window.location.hash = '#/bugs';
  });
}
