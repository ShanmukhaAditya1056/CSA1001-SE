// DevTrack Test Cases & QA Run Execution + Zero-State Logic + Dynamic Steps + Bulk QA Actions
import { store } from '../store.js';
import { statusChip, formatDate, formatDateTime, showToast, showModal, closeModal, showConfirm, avatar, escapeHtml } from '../ui.js';
import { TEST_TYPES } from '../rules.js';
import { calculatePassRate, renderZeroStateBadge } from '../utils/zeroState.js';

let activeTab = 'CASES'; // 'CASES' or 'RUNS'
let currentReqFilter = 'ALL';
let currentTypeFilter = 'ALL';
let testSearchQuery = '';
let selectedTcIds = new Set();

export function renderTests(container) {
  const project = store.getActiveProject();
  if (!project) {
    container.innerHTML = `<div class="p-12 text-center text-text-muted">Select or create a project first.</div>`;
    return;
  }

  const allTestCases = store.getTestCases(project.id);
  const testRuns = store.getTestRunsByProject(project.id);
  const reqs = store.getRequirements(project.id);

  // Telemetry Metrics with Zero-State Logic
  const passedCount = testRuns.filter(r => r.result === 'Passed').length;
  const failedCount = testRuns.filter(r => r.result === 'Failed').length;
  const blockedCount = testRuns.filter(r => r.result === 'Blocked').length;
  const passRateInfo = calculatePassRate(testRuns);

  // Filter test cases
  let filteredCases = allTestCases;
  if (currentReqFilter !== 'ALL') {
    filteredCases = filteredCases.filter(tc => tc.requirementIds?.includes(currentReqFilter));
  }
  if (currentTypeFilter !== 'ALL') {
    filteredCases = filteredCases.filter(tc => tc.type === currentTypeFilter);
  }
  if (testSearchQuery.trim()) {
    const q = testSearchQuery.toLowerCase();
    filteredCases = filteredCases.filter(tc =>
      (tc.title && tc.title.toLowerCase().includes(q)) ||
      (tc.id && tc.id.toLowerCase().includes(q)) ||
      (tc.objective && tc.objective.toLowerCase().includes(q)) ||
      (tc.steps && tc.steps.toLowerCase().includes(q))
    );
  }

  // Cleanup selection
  const validTcIds = new Set(allTestCases.map(t => t.id));
  for (const id of selectedTcIds) {
    if (!validTcIds.has(id)) selectedTcIds.delete(id);
  }

  const allFilteredSelected = filteredCases.length > 0 && filteredCases.every(tc => selectedTcIds.has(tc.id));
  const someSelected = selectedTcIds.size > 0;

  container.innerHTML = `
    <div class="relative w-full px-6 py-6 pb-28">
      <!-- Ambient Glow -->
      <div class="absolute -top-32 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Header -->
      <div class="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div class="flex items-center gap-2 font-jetbrains text-mono-md text-text-muted mb-1">
            <span>${escapeHtml(project.key)}</span>
            <span>/</span>
            <span class="text-secondary font-medium">QUALITY ASSURANCE</span>
            <span>/</span>
            <span class="text-text-primary">TEST SUITES & TELEMETRY</span>
            <span class="px-2 py-0.5 rounded-full bg-surface-elevated text-text-muted text-[11px] font-semibold ml-2">
              ${allTestCases.length} TEST SPECIFICATIONS
            </span>
          </div>
          <h1 class="font-geist text-headline-xl font-bold text-text-primary tracking-tight">Test Cases & QA Run Execution</h1>
          <p class="text-body-sm text-text-muted mt-1">Manual test specifications, structured preconditions, bulk QA executions, and defect linking</p>
        </div>

        <div class="flex items-center flex-wrap gap-2.5">
          <button id="add-tc-btn" class="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-primary font-medium text-label-md border border-border-subtle transition-all cursor-pointer shadow-sm active:scale-95">
            <span class="material-symbols-outlined text-[18px]">post_add</span>
            <span>+ New Test Case</span>
          </button>
          <button id="exec-run-btn" class="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-fixed text-on-primary font-semibold text-label-md transition-all shadow-md shadow-primary/20 active:scale-95 cursor-pointer">
            <span class="material-symbols-outlined text-[18px]">play_circle</span>
            <span>Execute Test Run</span>
          </button>
        </div>
      </div>

      <!-- QA Telemetry Stats Grid (Zero-State Sound Logic) -->
      <div class="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <!-- Pass Rate Gauge (Shows N/A when 0 test runs exist) -->
        <div class="bg-surface-canvas border border-border-subtle rounded-xl p-4 shadow-sm">
          <div class="flex items-center justify-between text-[11px] font-jetbrains text-text-muted uppercase mb-1">
            <span>Verification Pass Rate</span>
            <span class="material-symbols-outlined text-[16px] text-secondary">verified</span>
          </div>
          <div class="font-geist text-headline-lg font-bold ${passRateInfo.cssClass}">
            ${passRateInfo.label}
          </div>
          <div class="text-[11px] text-text-secondary mt-1 font-jetbrains">
            ${passRateInfo.hasData ? `${testRuns.length} total runs logged` : 'No runs executed yet'}
          </div>
        </div>

        <!-- Passed Executions -->
        <div class="bg-surface-canvas border border-border-subtle rounded-xl p-4 shadow-sm">
          <div class="flex items-center justify-between text-[11px] font-jetbrains text-status-passed uppercase mb-1">
            <span>Passed Executions</span>
            <span class="material-symbols-outlined text-[16px]">check_circle</span>
          </div>
          <div class="font-geist text-headline-lg font-bold text-status-passed">${passedCount}</div>
          <div class="text-[11px] text-text-muted mt-1 font-jetbrains">Assertions verified</div>
        </div>

        <!-- Failed Executions -->
        <div class="bg-surface-canvas border border-border-subtle rounded-xl p-4 shadow-sm">
          <div class="flex items-center justify-between text-[11px] font-jetbrains text-status-defect uppercase mb-1">
            <span>Failed Runs</span>
            <span class="material-symbols-outlined text-[16px]">cancel</span>
          </div>
          <div class="font-geist text-headline-lg font-bold text-status-defect">${failedCount}</div>
          <div class="text-[11px] text-text-muted mt-1 font-jetbrains">Requires triage / bug filing</div>
        </div>

        <!-- Blocked Executions -->
        <div class="bg-surface-canvas border border-border-subtle rounded-xl p-4 shadow-sm">
          <div class="flex items-center justify-between text-[11px] font-jetbrains text-status-in-progress uppercase mb-1">
            <span>Blocked Runs</span>
            <span class="material-symbols-outlined text-[16px]">pause_circle</span>
          </div>
          <div class="font-geist text-headline-lg font-bold text-status-in-progress">${blockedCount}</div>
          <div class="text-[11px] text-text-muted mt-1 font-jetbrains">Pending dependency</div>
        </div>

        <!-- Total Test Specifications -->
        <div class="bg-surface-canvas border border-border-subtle rounded-xl p-4 shadow-sm">
          <div class="flex items-center justify-between text-[11px] font-jetbrains text-text-muted uppercase mb-1">
            <span>Test Specifications</span>
            <span class="material-symbols-outlined text-[16px]">format_list_bulleted</span>
          </div>
          <div class="font-geist text-headline-lg font-bold text-text-primary">${allTestCases.length}</div>
          <div class="text-[11px] text-text-secondary mt-1 font-jetbrains">Active test specifications</div>
        </div>
      </div>

      <!-- Navigation Tabs: Test Cases vs Test Runs History -->
      <div class="relative z-10 flex items-center gap-2 border-b border-border-subtle mb-6">
        <button class="qa-tab px-4 py-2.5 font-jetbrains text-label-md font-semibold transition-all border-b-2 cursor-pointer ${activeTab === 'CASES' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-primary'}" data-tab="CASES">
          Test Specifications (${allTestCases.length})
        </button>
        <button class="qa-tab px-4 py-2.5 font-jetbrains text-label-md font-semibold transition-all border-b-2 cursor-pointer ${activeTab === 'RUNS' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-primary'}" data-tab="RUNS">
          Execution Runs Log (${testRuns.length})
        </button>
      </div>

      <!-- TAB 1: TEST SPECIFICATIONS -->
      ${activeTab === 'CASES' ? `
        <!-- Filter Toolbar -->
        <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 bg-surface-canvas p-3 rounded-xl border border-border-subtle shadow-sm">
          <div class="flex items-center gap-3 flex-1">
            <!-- Master Select All Checkbox -->
            <label class="flex items-center gap-2 text-label-sm text-text-muted font-jetbrains cursor-pointer select-none">
              <input type="checkbox" id="master-select-tc" ${allFilteredSelected ? 'checked' : ''} class="w-4 h-4 rounded text-primary focus:ring-primary bg-surface-base border-border-subtle cursor-pointer" />
              <span class="hidden sm:inline">Select All (${filteredCases.length})</span>
            </label>

            <!-- Search Input -->
            <div class="relative flex-1 max-w-sm">
              <span class="material-symbols-outlined absolute left-3 top-2 text-text-muted text-[18px]">search</span>
              <input type="text" id="tc-search" value="${escapeHtml(testSearchQuery)}" placeholder="Search tests by title, objective, steps..."
                class="w-full bg-surface-base text-text-primary text-body-sm pl-9 pr-8 py-1.5 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all" />
              ${testSearchQuery ? `
                <button id="clear-tc-search" class="absolute right-2.5 top-2 text-text-muted hover:text-text-primary text-[16px] cursor-pointer" title="Clear">✕</button>
              ` : ''}
            </div>
          </div>

          <div class="flex items-center flex-wrap gap-2.5 shrink-0">
            <!-- Filter by Requirement -->
            <div class="flex items-center gap-1.5">
              <span class="text-[12px] text-text-muted font-jetbrains hidden sm:inline">Requirement:</span>
              <select id="tc-req-filter" class="bg-surface-base text-text-primary text-body-sm px-3 py-1.5 rounded-lg border border-border-subtle focus:border-primary outline-none cursor-pointer max-w-[180px] truncate">
                <option value="ALL">All Requirements</option>
                ${reqs.map(r => `<option value="${r.id}" ${currentReqFilter === r.id ? 'selected' : ''}>${escapeHtml(r.id)}: ${escapeHtml(r.title)}</option>`).join('')}
              </select>
            </div>

            <!-- Filter by Test Type -->
            <div class="flex items-center gap-1.5">
              <span class="text-[12px] text-text-muted font-jetbrains hidden sm:inline">Type:</span>
              <select id="tc-type-filter" class="bg-surface-base text-text-primary text-body-sm px-3 py-1.5 rounded-lg border border-border-subtle focus:border-primary outline-none cursor-pointer">
                <option value="ALL" ${currentTypeFilter === 'ALL' ? 'selected' : ''}>All Types</option>
                ${TEST_TYPES.map(t => `<option value="${t}" ${currentTypeFilter === t ? 'selected' : ''}>${t}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <!-- Test Cases List -->
        <div class="relative z-10 space-y-4">
          ${filteredCases.length === 0 ? `
            <div class="bg-surface-canvas border border-border-subtle rounded-xl p-12 text-center shadow-sm">
              <span class="material-symbols-outlined text-text-muted text-[48px] mb-3">quiz</span>
              <h3 class="font-geist text-headline-sm font-bold text-text-primary mb-1">No Test Cases Found</h3>
              <p class="text-text-muted text-body-sm max-w-sm mx-auto mb-4">No test specifications match your filters. Create your first test case or adjust filter criteria.</p>
              <button id="empty-add-tc-btn" class="px-4 py-2 bg-primary text-on-primary rounded-lg font-semibold text-body-md cursor-pointer hover:bg-primary-fixed">Create Test Case</button>
            </div>
          ` : filteredCases.map(tc => {
            const req = reqs.find(r => tc.requirementIds?.includes(r.id));
            const runs = testRuns.filter(r => r.testCaseId === tc.id);
            const latestRun = runs[runs.length - 1];
            const isSelected = selectedTcIds.has(tc.id);

            return `
              <div class="bg-surface-canvas border ${isSelected ? 'border-primary ring-1 ring-primary/40 bg-primary/[0.02]' : 'border-border-subtle'} rounded-xl p-5 hover:border-border-strong transition-all shadow-sm">
                <div class="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div class="flex items-start gap-3 flex-1">
                    <!-- Row Checkbox for Bulk Execution -->
                    <input type="checkbox" class="tc-row-checkbox w-4 h-4 rounded text-primary focus:ring-primary bg-surface-base border-border-subtle cursor-pointer mt-1 shrink-0" data-id="${tc.id}" ${isSelected ? 'checked' : ''} />

                    <div class="flex-1 min-w-0">
                      <!-- Meta chips -->
                      <div class="flex items-center flex-wrap gap-2.5 mb-2">
                        <span class="font-jetbrains text-mono-md font-bold px-2 py-0.5 rounded bg-primary-container/20 text-primary">${escapeHtml(tc.id)}</span>
                        <span class="font-jetbrains text-[10px] px-2 py-0.5 rounded bg-surface-panel text-text-secondary border border-border-subtle font-semibold uppercase">${escapeHtml(tc.type || 'Manual')}</span>
                        ${latestRun ? statusChip(latestRun.result) : '<span class="font-jetbrains text-[11px] px-2 py-0.5 rounded bg-surface-elevated text-text-muted font-semibold">UNEXECUTED</span>'}
                        <span class="font-jetbrains text-[11px] text-text-muted">${runs.length} Runs Logged</span>
                      </div>

                      <h3 class="font-geist text-headline-sm font-bold text-text-primary mb-2">${escapeHtml(tc.title)}</h3>
                      
                      <!-- Objective & Preconditions / Steps Grid -->
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 text-body-sm">
                        <div class="p-3 bg-surface-base/80 rounded-lg border border-border-subtle">
                          <strong class="text-text-secondary text-[11px] font-jetbrains uppercase block mb-1">Objective</strong>
                          <p class="text-text-primary">${escapeHtml(tc.objective || 'Verify compliance with acceptance specification.')}</p>
                          ${tc.preconditions ? `
                            <strong class="text-text-secondary text-[11px] font-jetbrains uppercase block mt-2.5 mb-1">Preconditions</strong>
                            <p class="text-text-muted font-jetbrains text-[12px] bg-surface-panel/40 p-1.5 rounded border border-border-subtle/50">${escapeHtml(tc.preconditions)}</p>
                          ` : ''}
                        </div>

                        <div class="p-3 bg-surface-base/80 rounded-lg border border-border-subtle">
                          <strong class="text-text-secondary text-[11px] font-jetbrains uppercase block mb-1">Step-by-Step Procedure</strong>
                          <p class="text-text-primary font-jetbrains text-[12px] whitespace-pre-line mb-2 leading-relaxed">${escapeHtml(tc.steps || '1. Navigate to target workflow\n2. Trigger assertion\n3. Verify HTTP response')}</p>
                          <strong class="text-status-passed text-[11px] font-jetbrains uppercase block mb-1">Expected Assertion Result</strong>
                          <p class="text-text-secondary font-jetbrains text-[12px]">${escapeHtml(tc.expectedResult || 'Expected pass state without errors')}</p>
                        </div>
                      </div>

                      <!-- Traceability Link to Requirement -->
                      ${req ? `
                        <div class="flex items-center gap-1.5 font-jetbrains text-[11px] text-secondary bg-secondary/10 px-2.5 py-1 rounded-md border border-secondary/20 inline-flex">
                          <span class="material-symbols-outlined text-[15px]">link</span>
                          <span>Traces to Requirement <strong>${escapeHtml(req.id)}</strong>: ${escapeHtml(req.title)}</span>
                        </div>
                      ` : `
                        <div class="text-[11px] text-text-muted font-jetbrains italic">
                          No requirement linked (Standalone test suite)
                        </div>
                      `}
                    </div>
                  </div>

                  <!-- Actions Menu -->
                  <div class="flex lg:flex-col gap-2 shrink-0 self-end lg:self-start">
                    <button class="run-single-tc-btn px-4 py-2 rounded-lg bg-primary hover:bg-primary-fixed text-on-primary text-body-sm font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95" data-id="${tc.id}">
                      <span class="material-symbols-outlined text-[16px]">play_arrow</span>
                      <span>Run Test</span>
                    </button>
                    <button class="edit-tc-btn px-3 py-1.5 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-primary text-body-sm font-medium border border-border-subtle transition-colors flex items-center gap-1.5 cursor-pointer" data-id="${tc.id}">
                      <span class="material-symbols-outlined text-[15px]">edit</span>
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : `
        <!-- TAB 2: EXECUTION RUNS LOG -->
        <div class="relative z-10 space-y-3">
          ${testRuns.length === 0 ? `
            <div class="bg-surface-canvas border border-border-subtle rounded-xl p-12 text-center shadow-sm">
              <span class="material-symbols-outlined text-text-muted text-[48px] mb-3">history_toggle_off</span>
              <h3 class="font-geist text-headline-sm font-bold text-text-primary mb-1">No Test Runs Executed</h3>
              <p class="text-text-muted text-body-sm max-w-sm mx-auto mb-4">Execute individual test cases or use Bulk Execution to record verification telemetry.</p>
            </div>
          ` : [...testRuns].reverse().map(run => {
            const tc = allTestCases.find(t => t.id === run.testCaseId);
            const executor = store.getUser(run.executedBy) || (store.currentUser ? { name: store.currentUser.name } : { name: 'QA Tester' });

            return `
              <div class="p-4 rounded-xl bg-surface-canvas border border-border-subtle flex flex-col md:flex-row md:items-center justify-between gap-4 font-jetbrains shadow-sm">
                <div class="flex items-start gap-3">
                  <div class="mt-0.5">
                    ${statusChip(run.result)}
                  </div>
                  <div>
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-mono-md font-bold text-text-primary">${escapeHtml(run.testCaseId)}</span>
                      <span class="text-text-muted text-[12px]">${tc ? escapeHtml(tc.title) : 'Test Case'}</span>
                    </div>
                    ${run.notes ? `<p class="text-body-sm text-text-secondary font-inter mb-1.5">${escapeHtml(run.notes)}</p>` : ''}
                    <div class="flex items-center gap-3 text-[11px] text-text-muted">
                      <span>Executed by: <strong class="text-text-primary">${escapeHtml(executor.name)}</strong></span>
                      <span>${formatDateTime(run.executedAt)}</span>
                    </div>
                  </div>
                </div>

                ${run.result === 'Failed' ? `
                  <div class="shrink-0">
                    <button class="link-bug-btn px-3 py-1.5 rounded-lg bg-status-defect-surface hover:bg-status-defect/20 text-status-defect text-[11px] font-semibold border border-status-defect/30 transition-all flex items-center gap-1 cursor-pointer" data-runid="${run.id}" data-tcid="${run.testCaseId}">
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

      <!-- Sticky Floating QA Bulk Execution Action Bar (Visible when >= 1 test selected) -->
      ${someSelected ? `
        <div id="qa-bulk-action-bar" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-3xl bg-surface-canvas/95 backdrop-blur-md border border-primary/40 rounded-2xl p-3.5 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-slide-in ring-2 ring-primary/20">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-jetbrains font-bold text-mono-md shrink-0">
              ${selectedTcIds.size}
            </div>
            <div>
              <div class="font-geist text-body-md font-bold text-text-primary">
                ${selectedTcIds.size} test case${selectedTcIds.size > 1 ? 's' : ''} selected
              </div>
              <div class="text-[11px] text-text-muted font-jetbrains">
                Batch execute QA runs across selected test cases
              </div>
            </div>
          </div>

          <div class="flex items-center flex-wrap gap-2 shrink-0">
            <!-- Bulk Pass Button -->
            <button id="bulk-pass-btn" class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-status-passed-surface text-status-passed hover:bg-status-passed hover:text-white border border-status-passed/40 text-label-sm font-semibold transition-all cursor-pointer">
              <span class="material-symbols-outlined text-[16px]">check_circle</span>
              <span>Bulk Pass</span>
            </button>

            <!-- Bulk Fail Button -->
            <button id="bulk-fail-btn" class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-status-defect-surface text-status-defect hover:bg-status-defect hover:text-on-error border border-status-defect/40 text-label-sm font-semibold transition-all cursor-pointer">
              <span class="material-symbols-outlined text-[16px]">cancel</span>
              <span>Bulk Fail</span>
            </button>

            <!-- Deselect All -->
            <button id="bulk-deselect-btn" class="px-3 py-1.5 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-muted hover:text-text-primary text-label-sm border border-border-subtle transition-colors cursor-pointer">
              Deselect
            </button>
          </div>
        </div>
      ` : ''}
    </div>
  `;

  // Attach tab switching
  container.querySelectorAll('.qa-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeTab = tab.dataset.tab;
      renderTests(container);
    });
  });

  // Attach search handler
  const searchInput = container.querySelector('#tc-search');
  searchInput?.addEventListener('input', (e) => {
    testSearchQuery = e.target.value;
    renderTests(container);
  });
  container.querySelector('#clear-tc-search')?.addEventListener('click', () => {
    testSearchQuery = '';
    renderTests(container);
  });

  // Attach Requirement filter
  container.querySelector('#tc-req-filter')?.addEventListener('change', (e) => {
    currentReqFilter = e.target.value;
    renderTests(container);
  });

  // Attach Type filter
  container.querySelector('#tc-type-filter')?.addEventListener('change', (e) => {
    currentTypeFilter = e.target.value;
    renderTests(container);
  });

  // Master Checkbox
  container.querySelector('#master-select-tc')?.addEventListener('change', (e) => {
    if (e.target.checked) {
      filteredCases.forEach(tc => selectedTcIds.add(tc.id));
    } else {
      filteredCases.forEach(tc => selectedTcIds.delete(tc.id));
    }
    renderTests(container);
  });

  // Row Checkbox
  container.querySelectorAll('.tc-row-checkbox').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const id = cb.dataset.id;
      if (e.target.checked) {
        selectedTcIds.add(id);
      } else {
        selectedTcIds.delete(id);
      }
      renderTests(container);
    });
  });

  // Bulk Operations Handlers
  container.querySelector('#bulk-deselect-btn')?.addEventListener('click', () => {
    selectedTcIds.clear();
    renderTests(container);
  });

  // Bulk Pass Action
  container.querySelector('#bulk-pass-btn')?.addEventListener('click', () => {
    const targetIds = Array.from(selectedTcIds);
    let passedCount = 0;
    targetIds.forEach(id => {
      const res = store.createTestRun(id, {
        result: 'Passed',
        notes: 'Bulk QA automated verification passed'
      });
      if (!res.error) passedCount++;
    });
    showToast(`Successfully recorded ${passedCount} passed test run${passedCount > 1 ? 's' : ''}!`, 'success');
    selectedTcIds.clear();
    renderTests(container);
  });

  // Bulk Fail Action
  container.querySelector('#bulk-fail-btn')?.addEventListener('click', () => {
    const targetIds = Array.from(selectedTcIds);
    showModal(`
      <form id="bulk-fail-form" class="space-y-4">
        <div class="p-3 rounded-lg bg-status-defect-surface border border-status-defect/30 text-status-defect text-body-sm flex items-center gap-2">
          <span class="material-symbols-outlined text-[18px]">warning</span>
          <span>Recording ${targetIds.length} failed test execution runs.</span>
        </div>
        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">Failure Reason / Bug Notes *</label>
          <textarea id="bulk-fail-notes" rows="3" required placeholder="Describe regression root cause, assertion failure, or cluster timeout..."
            class="w-full bg-surface-base text-text-primary text-body-sm px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none"></textarea>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-secondary hover:bg-surface-elevated text-body-md cursor-pointer">Cancel</button>
          <button type="submit" class="px-5 py-2 rounded-lg bg-status-defect text-on-error font-semibold text-body-md hover:brightness-110 cursor-pointer">Commit Failed Runs</button>
        </div>
      </form>
    `, { title: 'Bulk Record Failed Test Runs' });

    document.getElementById('bulk-fail-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const notes = document.getElementById('bulk-fail-notes').value.trim();
      let failedCount = 0;
      targetIds.forEach(id => {
        const res = store.createTestRun(id, {
          result: 'Failed',
          notes: notes || 'Bulk QA failure logged'
        });
        if (!res.error) failedCount++;
      });
      closeModal();
      showToast(`Recorded ${failedCount} failed test runs.`, 'error');
      selectedTcIds.clear();
      renderTests(container);
    });
  });

  // Attach Add Test Case trigger
  container.querySelector('#add-tc-btn')?.addEventListener('click', () => {
    openTestCaseModal(project.id, null, () => renderTests(container));
  });
  container.querySelector('#empty-add-tc-btn')?.addEventListener('click', () => {
    openTestCaseModal(project.id, null, () => renderTests(container));
  });

  // Attach Edit Test Case trigger
  container.querySelectorAll('.edit-tc-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tc = allTestCases.find(t => t.id === btn.dataset.id);
      if (tc) openTestCaseModal(project.id, tc, () => renderTests(container));
    });
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

// ===== STRUCTURED TEST CASE MODAL WITH DYNAMIC STEPS BUILDER =====
export function openTestCaseModal(projectId, existingTc = null, onSaved = null) {
  const isEdit = !!existingTc;
  const reqs = store.getRequirements(projectId);

  // Parse existing steps into array of lines or default step list
  let initialSteps = [{ action: '', expected: '' }];
  if (existingTc?.steps) {
    const rawLines = existingTc.steps.split('\n').filter(Boolean);
    if (rawLines.length) {
      initialSteps = rawLines.map(line => {
        const parts = line.replace(/^\d+[\.\)]\s*/, '').split(' -> ');
        return { action: parts[0] || line, expected: parts[1] || '' };
      });
    }
  }

  showModal(`
    <form id="new-tc-form" class="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Test Case Title *</label>
        <input type="text" id="tc-title" required value="${existingTc ? escapeHtml(existingTc.title) : ''}" placeholder="e.g. Verify duplicate email rejected with 409 status"
          class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all" />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">Target Requirement Specification</label>
          <select id="tc-req" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none cursor-pointer">
            <option value="">None (Independent Suite)</option>
            ${reqs.map(r => `<option value="${r.id}" ${existingTc?.requirementIds?.includes(r.id) ? 'selected' : ''}>${escapeHtml(r.id)}: ${escapeHtml(r.title)}</option>`).join('')}
          </select>
        </div>

        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">Test Type *</label>
          <select id="tc-type" required class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none cursor-pointer">
            ${TEST_TYPES.map(t => `<option value="${t}" ${existingTc?.type === t ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </div>
      </div>

      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Objective</label>
        <input type="text" id="tc-objective" value="${existingTc?.objective ? escapeHtml(existingTc.objective) : ''}" placeholder="e.g. Ensure idempotency and uniqueness validations"
          class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none" />
      </div>

      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Pre-conditions</label>
        <textarea id="tc-pre" rows="2" placeholder="e.g. 1. Fresh database schema seeded\n2. User authenticated with Developer role"
          class="w-full bg-surface-base text-text-primary font-jetbrains text-body-sm px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none">${existingTc?.preconditions ? escapeHtml(existingTc.preconditions) : ''}</textarea>
      </div>

      <!-- Dynamic Test Steps Builder -->
      <div class="p-3.5 rounded-xl bg-surface-base/80 border border-border-subtle">
        <div class="flex items-center justify-between mb-2">
          <label class="block text-label-md font-medium text-text-primary">Dynamic Test Steps *</label>
          <button type="button" id="add-step-row-btn" class="flex items-center gap-1 text-[11px] font-jetbrains text-primary hover:underline cursor-pointer">
            <span class="material-symbols-outlined text-[16px]">add_circle</span>
            <span>+ Add Step</span>
          </button>
        </div>
        <div id="dynamic-steps-container" class="space-y-2.5">
          <!-- Populated dynamically below -->
        </div>
      </div>

      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Expected Assertion Result *</label>
        <textarea id="tc-expected" rows="2" required placeholder="HTTP 409 with 'Email already in use' message body"
          class="w-full bg-surface-base text-text-primary font-jetbrains text-body-sm px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none">${existingTc?.expectedResult ? escapeHtml(existingTc.expectedResult) : ''}</textarea>
      </div>

      <div class="flex justify-between items-center pt-3 border-t border-border-subtle">
        ${isEdit ? `
          <button type="button" id="delete-tc-btn" class="flex items-center gap-1 text-status-defect hover:underline text-[12px] font-jetbrains cursor-pointer">
            <span class="material-symbols-outlined text-[16px]">delete</span>
            <span>Delete Test</span>
          </button>
        ` : '<div></div>'}

        <div class="flex gap-2">
          <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-secondary hover:bg-surface-elevated text-body-md cursor-pointer">Cancel</button>
          <button type="submit" class="px-5 py-2 rounded-lg bg-primary text-on-primary font-semibold text-body-md hover:bg-primary-fixed shadow-md shadow-primary/20 cursor-pointer">
            ${isEdit ? 'Save Changes' : 'Create Test Case'}
          </button>
        </div>
      </div>
    </form>
  `, { title: isEdit ? `Edit Test Case: ${existingTc.id}` : 'Create Manual Test Specification' });

  // Dynamic step row generator
  const stepsContainer = document.getElementById('dynamic-steps-container');
  const renderStepRows = (steps) => {
    stepsContainer.innerHTML = steps.map((s, idx) => `
      <div class="step-row flex items-start gap-2 bg-surface-canvas p-2.5 rounded-lg border border-border-subtle" data-idx="${idx}">
        <span class="w-6 h-6 rounded-full bg-surface-panel text-text-muted text-[11px] font-jetbrains font-bold flex items-center justify-center shrink-0 mt-1">
          ${idx + 1}
        </span>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
          <input type="text" class="step-action-input w-full bg-surface-base text-text-primary font-jetbrains text-[12px] px-2.5 py-1.5 rounded border border-border-subtle focus:border-primary outline-none" required placeholder="Step Action description..." value="${escapeHtml(s.action)}" />
          <input type="text" class="step-expected-input w-full bg-surface-base text-text-primary font-jetbrains text-[12px] px-2.5 py-1.5 rounded border border-border-subtle focus:border-primary outline-none" placeholder="Expected step result..." value="${escapeHtml(s.expected)}" />
        </div>
        ${steps.length > 1 ? `
          <button type="button" class="remove-step-btn text-text-muted hover:text-status-defect p-1 shrink-0 mt-0.5 cursor-pointer" title="Remove step">
            <span class="material-symbols-outlined text-[18px]">delete</span>
          </button>
        ` : ''}
      </div>
    `).join('');

    // Attach step remove triggers
    stepsContainer.querySelectorAll('.remove-step-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const row = e.target.closest('.step-row');
        const idx = parseInt(row.dataset.idx, 10);
        const currentData = getStepsData();
        currentData.splice(idx, 1);
        renderStepRows(currentData.length ? currentData : [{ action: '', expected: '' }]);
      });
    });
  };

  const getStepsData = () => {
    const rows = stepsContainer.querySelectorAll('.step-row');
    const result = [];
    rows.forEach(r => {
      const action = r.querySelector('.step-action-input').value.trim();
      const expected = r.querySelector('.step-expected-input').value.trim();
      if (action || expected) result.push({ action, expected });
    });
    return result;
  };

  renderStepRows(initialSteps);

  // Add step row button
  document.getElementById('add-step-row-btn')?.addEventListener('click', () => {
    const current = getStepsData();
    current.push({ action: '', expected: '' });
    renderStepRows(current);
  });

  // Delete test case button
  document.getElementById('delete-tc-btn')?.addEventListener('click', () => {
    if (!existingTc) return;
    showConfirm(`Delete test case "${existingTc.title}" and its run telemetry permanently?`, () => {
      const res = store.deleteTestCase(existingTc.id);
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        closeModal();
        showToast('Test case deleted.', 'info');
        if (onSaved) onSaved();
      }
    }, { title: 'Delete Test Case', destructive: true, confirmText: 'Delete' });
  });

  document.getElementById('new-tc-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('tc-title').value.trim();
    const reqId = document.getElementById('tc-req').value;
    const objective = document.getElementById('tc-objective').value.trim();
    const preconditions = document.getElementById('tc-pre').value.trim();
    const expectedResult = document.getElementById('tc-expected').value.trim();
    const type = document.getElementById('tc-type').value;

    const stepsData = getStepsData();
    const formattedSteps = stepsData.map((s, i) => `${i + 1}. ${s.action}${s.expected ? ' -> ' + s.expected : ''}`).join('\n');

    const payload = {
      title,
      type,
      requirementIds: reqId ? [reqId] : [],
      objective,
      preconditions,
      steps: formattedSteps,
      expectedResult
    };

    let res;
    if (isEdit) {
      res = store.updateTestCase(existingTc.id, payload);
    } else {
      res = store.createTestCase(projectId, payload);
    }

    if (res.error) {
      showToast(res.error, 'error');
      return;
    }

    closeModal();
    showToast(isEdit ? 'Test case updated!' : 'Test case created!', 'success');
    if (onSaved) onSaved();
  });
}

// ===== EXECUTE RUN MODAL =====
function openExecuteRunModal(projectId, preselectedTcId, onSaved) {
  const testCases = store.getTestCases(projectId);

  showModal(`
    <form id="execute-run-form" class="space-y-4">
      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Select Test Case *</label>
        <select id="run-tcid" required class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none cursor-pointer">
          ${testCases.map(tc => `<option value="${tc.id}" ${tc.id === preselectedTcId ? 'selected' : ''}>${escapeHtml(tc.id)}: ${escapeHtml(tc.title)}</option>`).join('')}
        </select>
      </div>

      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Execution Outcome *</label>
        <select id="run-outcome" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none font-jetbrains font-semibold cursor-pointer">
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
        <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-secondary hover:bg-surface-elevated text-body-md cursor-pointer">Cancel</button>
        <button type="submit" class="px-5 py-2 rounded-lg bg-primary text-on-primary font-semibold text-body-md hover:bg-primary-fixed shadow-md shadow-primary/20 cursor-pointer">Commit Execution Record</button>
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

// ===== LINKED DEFECT MODAL =====
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
        <input type="text" id="lbug-title" required value="Assertion failure in ${tc?.title ? escapeHtml(tc.title) : 'Test Run'}"
          class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none" />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">Severity</label>
          <select id="lbug-sev" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none cursor-pointer">
            <option value="Critical">Critical</option>
            <option value="High" selected>High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">Priority</label>
          <select id="lbug-pri" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none cursor-pointer">
            <option value="High" selected>High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Steps to Reproduce</label>
        <textarea id="lbug-steps" rows="3" class="w-full bg-surface-base text-text-primary font-jetbrains text-body-sm px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none">${tc?.steps ? escapeHtml(tc.steps) : ''}</textarea>
      </div>

      <div class="flex justify-end gap-3 pt-3">
        <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-secondary hover:bg-surface-elevated text-body-md cursor-pointer">Cancel</button>
        <button type="submit" class="px-5 py-2 rounded-lg bg-status-defect text-on-error font-semibold text-body-md hover:brightness-110 cursor-pointer">Log Defect</button>
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
