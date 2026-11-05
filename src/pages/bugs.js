// DevTrack Defect & Bug Tracker + Interactive Severity Filters + Comprehensive Logging + Screenshot Zone
import { store } from '../store.js';
import { teamCollab } from '../collab.js';
import { severityChip, priorityChip, statusChip, formatDate, showToast, showModal, closeModal, showConfirm, avatar, escapeHtml } from '../ui.js';
import { BUG_STATUSES, BUG_TRANSITIONS } from '../rules.js';

let currentFilterSev = 'ALL';
let currentFilterStatus = 'ALL';
let currentFilterEnv = 'ALL';
let bugSearchQuery = '';

export function renderBugs(container) {
  const project = store.getActiveProject();
  if (!project) {
    container.innerHTML = `<div class="p-12 text-center text-text-muted">Select or create a project first.</div>`;
    return;
  }

  const allBugs = store.getBugs(project.id);
  const reqs = store.getRequirements(project.id);
  const tasks = store.getTasks(project.id);
  const testRuns = store.getTestRunsByProject(project.id);
  const members = store.getMembers(project.id);

  // Severity metrics
  const critCount = allBugs.filter(b => b.severity === 'Critical').length;
  const highCount = allBugs.filter(b => b.severity === 'High').length;
  const medCount = allBugs.filter(b => b.severity === 'Medium').length;
  const lowCount = allBugs.filter(b => b.severity === 'Low').length;
  const openCount = allBugs.filter(b => !['Fixed', 'Verified', 'Closed'].includes(b.status)).length;

  // Filter defects
  let filtered = allBugs;
  if (currentFilterSev !== 'ALL') {
    filtered = filtered.filter(b => b.severity === currentFilterSev);
  }
  if (currentFilterStatus !== 'ALL') {
    filtered = filtered.filter(b => b.status === currentFilterStatus);
  }
  if (currentFilterEnv !== 'ALL') {
    filtered = filtered.filter(b => b.environment === currentFilterEnv);
  }
  if (bugSearchQuery.trim()) {
    const q = bugSearchQuery.toLowerCase();
    filtered = filtered.filter(b =>
      (b.title && b.title.toLowerCase().includes(q)) ||
      (b.id && b.id.toLowerCase().includes(q)) ||
      (b.description && b.description.toLowerCase().includes(q)) ||
      (b.stepsToReproduce && b.stepsToReproduce.toLowerCase().includes(q))
    );
  }

  container.innerHTML = `
    <div class="relative w-full px-6 py-6 pb-24">
      <!-- Ambient Background Glow -->
      <div class="absolute -top-32 -left-20 w-96 h-96 bg-status-defect/10 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Action & Context Header -->
      <div class="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div class="flex items-center gap-2 font-jetbrains text-mono-md text-text-muted mb-1">
            <span>${escapeHtml(project.key)}</span>
            <span>/</span>
            <span class="text-secondary font-medium">QUALITY & DELIVERY</span>
            <span>/</span>
            <span class="text-status-defect font-semibold">DEFECT TRACKER</span>
            <span class="px-2 py-0.5 rounded-full bg-surface-elevated text-text-muted text-[11px] font-semibold ml-2">
              ${allBugs.length} DEFECTS FILED
            </span>
          </div>
          <h1 class="font-geist text-headline-xl font-bold text-text-primary tracking-tight">Defect & Bug Tracker</h1>
          <p class="text-body-sm text-text-muted mt-1">Manage lifecycle defects, environment telemetry, screenshot evidence, and QA retest cycles</p>
        </div>

        <div class="flex items-center gap-3">
          <button id="add-bug-btn" class="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-status-defect hover:brightness-110 text-on-error font-semibold text-label-md transition-all shadow-md shadow-status-defect/20 active:scale-95 cursor-pointer">
            <span class="material-symbols-outlined text-[20px]">bug_report</span>
            <span>+ Log Defect</span>
          </button>
        </div>
      </div>

      <!-- Interactive Severity Metrics Cards (Click to Instant Filter) -->
      <div class="relative z-10 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <!-- ALL TAB -->
        <button class="sev-tab group p-3.5 rounded-xl border text-left transition-all cursor-pointer ${currentFilterSev === 'ALL' ? 'border-primary bg-primary/10 shadow-md ring-1 ring-primary/40' : 'border-border-subtle bg-surface-canvas hover:bg-surface-panel/60'}" data-sev="ALL">
          <div class="flex items-center justify-between text-text-muted text-[11px] font-jetbrains uppercase mb-1">
            <span class="group-hover:text-primary transition-colors">All Defects</span>
            <span class="material-symbols-outlined text-[16px] ${currentFilterSev === 'ALL' ? 'text-primary' : 'text-text-muted'}">pest_control</span>
          </div>
          <div class="flex items-baseline justify-between">
            <span class="font-geist text-headline-sm font-bold text-text-primary">${allBugs.length}</span>
            <span class="text-[10px] font-jetbrains text-text-muted">${openCount} active</span>
          </div>
        </button>

        <!-- CRITICAL TAB (P1 Blockers) -->
        <button class="sev-tab group p-3.5 rounded-xl border text-left transition-all cursor-pointer ${currentFilterSev === 'Critical' ? 'border-status-defect bg-status-defect-surface shadow-md ring-1 ring-status-defect/40' : 'border-border-subtle bg-surface-canvas hover:bg-surface-panel/60'}" data-sev="Critical">
          <div class="flex items-center justify-between text-status-defect text-[11px] font-jetbrains uppercase mb-1">
            <span class="font-bold">Critical (P1)</span>
            <span class="material-symbols-outlined text-[16px] text-status-defect animate-pulse">warning</span>
          </div>
          <div class="flex items-baseline justify-between">
            <span class="font-geist text-headline-sm font-bold text-status-defect">${critCount}</span>
            ${currentFilterSev === 'Critical' ? `<span class="text-[10px] font-jetbrains text-status-defect font-bold">FILTERED</span>` : `<span class="text-[10px] font-jetbrains text-text-muted">Blockers</span>`}
          </div>
        </button>

        <!-- HIGH TAB -->
        <button class="sev-tab group p-3.5 rounded-xl border text-left transition-all cursor-pointer ${currentFilterSev === 'High' ? 'border-status-in-progress bg-status-in-progress-surface shadow-md ring-1 ring-status-in-progress/40' : 'border-border-subtle bg-surface-canvas hover:bg-surface-panel/60'}" data-sev="High">
          <div class="flex items-center justify-between text-status-in-progress text-[11px] font-jetbrains uppercase mb-1">
            <span class="font-bold">High Severity</span>
            <span class="material-symbols-outlined text-[16px]">priority_high</span>
          </div>
          <div class="flex items-baseline justify-between">
            <span class="font-geist text-headline-sm font-bold text-status-in-progress">${highCount}</span>
            ${currentFilterSev === 'High' ? `<span class="text-[10px] font-jetbrains text-status-in-progress font-bold">FILTERED</span>` : `<span class="text-[10px] font-jetbrains text-text-muted">Major</span>`}
          </div>
        </button>

        <!-- MEDIUM TAB -->
        <button class="sev-tab group p-3.5 rounded-xl border text-left transition-all cursor-pointer ${currentFilterSev === 'Medium' ? 'border-secondary bg-secondary/10 shadow-md ring-1 ring-secondary/40' : 'border-border-subtle bg-surface-canvas hover:bg-surface-panel/60'}" data-sev="Medium">
          <div class="flex items-center justify-between text-secondary text-[11px] font-jetbrains uppercase mb-1">
            <span class="font-bold">Medium</span>
            <span class="material-symbols-outlined text-[16px]">info</span>
          </div>
          <div class="flex items-baseline justify-between">
            <span class="font-geist text-headline-sm font-bold text-secondary">${medCount}</span>
            ${currentFilterSev === 'Medium' ? `<span class="text-[10px] font-jetbrains text-secondary font-bold">FILTERED</span>` : `<span class="text-[10px] font-jetbrains text-text-muted">Normal</span>`}
          </div>
        </button>

        <!-- LOW TAB -->
        <button class="sev-tab group p-3.5 rounded-xl border text-left transition-all cursor-pointer ${currentFilterSev === 'Low' ? 'border-text-muted bg-surface-panel shadow-md ring-1 ring-border-strong' : 'border-border-subtle bg-surface-canvas hover:bg-surface-panel/60'}" data-sev="Low">
          <div class="flex items-center justify-between text-text-muted text-[11px] font-jetbrains uppercase mb-1">
            <span class="font-bold">Low Severity</span>
            <span class="material-symbols-outlined text-[16px]">check_circle</span>
          </div>
          <div class="flex items-baseline justify-between">
            <span class="font-geist text-headline-sm font-bold text-text-primary">${lowCount}</span>
            ${currentFilterSev === 'Low' ? `<span class="text-[10px] font-jetbrains text-text-muted font-bold">FILTERED</span>` : `<span class="text-[10px] font-jetbrains text-text-muted">Minor</span>`}
          </div>
        </button>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 bg-surface-canvas p-3 rounded-xl border border-border-subtle shadow-sm">
        <div class="relative flex-1 max-w-md">
          <span class="material-symbols-outlined absolute left-3 top-2 text-text-muted text-[18px]">search</span>
          <input type="text" id="bug-search" value="${escapeHtml(bugSearchQuery)}" placeholder="Search defects by title, steps, or symptoms..."
            class="w-full bg-surface-base text-text-primary text-body-sm pl-9 pr-8 py-1.5 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all" />
          ${bugSearchQuery ? `
            <button id="clear-bug-search" class="absolute right-2.5 top-2 text-text-muted hover:text-text-primary text-[16px] cursor-pointer" title="Clear">✕</button>
          ` : ''}
        </div>

        <div class="flex items-center flex-wrap gap-2.5 shrink-0">
          <!-- Environment Filter -->
          <div class="flex items-center gap-1.5">
            <span class="text-[12px] text-text-muted font-jetbrains hidden sm:inline">Env:</span>
            <select id="bug-env-filter" class="bg-surface-base text-text-primary text-body-sm px-3 py-1.5 rounded-lg border border-border-subtle focus:border-primary outline-none cursor-pointer">
              <option value="ALL" ${currentFilterEnv === 'ALL' ? 'selected' : ''}>All Environments</option>
              <option value="Production" ${currentFilterEnv === 'Production' ? 'selected' : ''}>Production</option>
              <option value="Staging" ${currentFilterEnv === 'Staging' ? 'selected' : ''}>Staging</option>
              <option value="Development" ${currentFilterEnv === 'Development' ? 'selected' : ''}>Development</option>
              <option value="QA / Testing" ${currentFilterEnv === 'QA / Testing' ? 'selected' : ''}>QA / Testing</option>
            </select>
          </div>

          <!-- Status Filter -->
          <div class="flex items-center gap-1.5">
            <span class="text-[12px] text-text-muted font-jetbrains hidden sm:inline">Status:</span>
            <select id="bug-status-filter" class="bg-surface-base text-text-primary text-body-sm px-3 py-1.5 rounded-lg border border-border-subtle focus:border-primary outline-none cursor-pointer">
              <option value="ALL" ${currentFilterStatus === 'ALL' ? 'selected' : ''}>All Statuses</option>
              <option value="Open" ${currentFilterStatus === 'Open' ? 'selected' : ''}>Open</option>
              <option value="In Progress" ${currentFilterStatus === 'In Progress' ? 'selected' : ''}>In Progress</option>
              <option value="Fixed" ${currentFilterStatus === 'Fixed' ? 'selected' : ''}>Fixed</option>
              <option value="Verified" ${currentFilterStatus === 'Verified' ? 'selected' : ''}>Verified</option>
              <option value="Closed" ${currentFilterStatus === 'Closed' ? 'selected' : ''}>Closed</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Defects List -->
      <div class="relative z-10 space-y-4">
        ${filtered.length === 0 ? `
          <div class="bg-surface-canvas border border-border-subtle rounded-xl p-12 text-center shadow-sm">
            <span class="material-symbols-outlined text-text-muted text-[48px] mb-3">check_circle</span>
            <h3 class="font-geist text-headline-sm font-bold text-text-primary mb-1">No Defects Matching Filter</h3>
            <p class="text-text-muted text-body-sm max-w-sm mx-auto mb-4">No defects found for the selected severity, status, and environment criteria.</p>
            <button id="empty-add-bug-btn" class="px-4 py-2 bg-status-defect text-on-error rounded-lg font-semibold text-body-md cursor-pointer hover:brightness-110">Log a Defect</button>
          </div>
        ` : filtered.map(bug => {
          const req = reqs.find(r => r.id === bug.relatedRequirementId);
          const task = tasks.find(t => t.id === bug.relatedTaskId);
          const run = testRuns.find(r => r.id === bug.relatedTestRunId);
          const assignee = members.find(m => m.userId === bug.assigneeId);
          const reporter = members.find(m => m.userId === bug.reporterId) || (store.currentUser ? { userName: `${store.currentUser.name} (QA)` } : { userName: 'QA Engineer' });

          return `
            <div class="bg-surface-canvas border border-border-subtle rounded-xl p-5 hover:border-border-strong transition-all shadow-sm">
              <div class="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div class="flex-1 min-w-0">
                  <!-- Meta chips: ID, Severity, Priority, Status, Environment, OS -->
                  <div class="flex items-center flex-wrap gap-2 mb-2">
                    <span class="font-jetbrains text-mono-md font-bold px-2 py-0.5 rounded bg-status-defect-surface text-status-defect border border-status-defect/30">${escapeHtml(bug.id)}</span>
                    ${severityChip(bug.severity)}
                    ${priorityChip(bug.priority)}
                    ${statusChip(bug.status)}
                    
                    ${bug.environment ? `
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-jetbrains font-semibold ${bug.environment === 'Production' ? 'bg-status-defect-surface text-status-defect border border-status-defect/30' : 'bg-surface-panel text-text-muted border border-border-subtle'}">
                        ENV: ${escapeHtml(bug.environment)}
                      </span>
                    ` : ''}

                    ${bug.browserOs ? `
                      <span class="px-2 py-0.5 rounded bg-surface-base text-text-muted text-[10px] font-jetbrains border border-border-subtle">
                        ${escapeHtml(bug.browserOs)}
                      </span>
                    ` : ''}

                    <span class="font-jetbrains text-[11px] text-text-muted ml-auto sm:ml-0">Reported: ${formatDate(bug.createdAt)}</span>
                  </div>

                  <h3 class="font-geist text-headline-sm font-bold text-text-primary mb-1.5">${escapeHtml(bug.title)}</h3>
                  ${bug.description && bug.description !== bug.title ? `<p class="text-body-sm text-text-secondary mb-3 leading-relaxed">${escapeHtml(bug.description)}</p>` : ''}

                  <!-- Steps to Reproduce Box -->
                  ${bug.stepsToReproduce ? `
                    <div class="p-3 bg-surface-base/80 rounded-xl border border-border-subtle mb-3">
                      <div class="flex items-center gap-1.5 text-[11px] font-jetbrains text-text-muted uppercase mb-1 font-semibold">
                        <span class="material-symbols-outlined text-[15px] text-status-defect">replay</span>
                        <span>Steps to Reproduce</span>
                      </div>
                      <div class="text-body-sm text-text-primary font-jetbrains whitespace-pre-line leading-relaxed">${escapeHtml(bug.stepsToReproduce)}</div>
                    </div>
                  ` : ''}

                  <!-- Attached Screenshot Thumbnail Preview -->
                  ${bug.screenshot ? `
                    <div class="mb-3">
                      <div class="text-[11px] font-jetbrains text-text-muted uppercase mb-1.5 flex items-center gap-1">
                        <span class="material-symbols-outlined text-[15px]">image</span>
                        <span>Attached Screenshot Telemetry</span>
                      </div>
                      <div class="relative inline-block group/img cursor-pointer view-screenshot-btn" data-img="${bug.screenshot}">
                        <img src="${bug.screenshot}" alt="Defect evidence" class="w-44 h-28 object-cover rounded-lg border border-border-strong hover:brightness-110 transition-all shadow-sm" />
                        <div class="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                          <span class="material-symbols-outlined text-white text-[24px]">zoom_in</span>
                        </div>
                      </div>
                    </div>
                  ` : ''}

                  <!-- Traceability Links Bar -->
                  <div class="flex items-center flex-wrap gap-3 pt-2.5 border-t border-border-subtle/50 font-jetbrains text-[11px] text-text-muted">
                    ${req ? `
                      <span class="flex items-center gap-1 text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                        <span class="material-symbols-outlined text-[14px]">rule</span>
                        <span>Requirement: ${escapeHtml(req.id)}</span>
                      </span>
                    ` : ''}

                    ${task ? `
                      <span class="flex items-center gap-1 text-secondary bg-secondary/10 px-2 py-0.5 rounded border border-secondary/20">
                        <span class="material-symbols-outlined text-[14px]">task_alt</span>
                        <span>Fix Task: ${escapeHtml(task.title.slice(0, 25))}</span>
                      </span>
                    ` : ''}

                    ${bug.relatedTestRunId ? `
                      <span class="flex items-center gap-1 text-status-defect bg-status-defect-surface px-2 py-0.5 rounded border border-status-defect/30">
                        <span class="material-symbols-outlined text-[14px]">verified</span>
                        <span>Failed Run: ${escapeHtml(bug.relatedTestRunId)}</span>
                      </span>
                    ` : ''}

                    ${assignee ? `
                      <span class="flex items-center gap-1 text-text-secondary bg-surface-base px-2 py-0.5 rounded border border-border-subtle">
                        <span>Assigned to: <strong>${escapeHtml(assignee.userName)}</strong></span>
                      </span>
                    ` : ''}

                    <span class="ml-auto flex items-center gap-1 text-text-muted">
                      <span>Reporter: <strong class="text-text-primary">${escapeHtml(reporter.userName)}</strong></span>
                    </span>
                  </div>
                </div>

                <!-- Actions: Status Mover, Edit & Delete -->
                <div class="flex lg:flex-col items-end gap-2 shrink-0 self-end lg:self-start">
                  <div class="flex items-center gap-1.5">
                    <span class="text-label-sm text-text-muted font-jetbrains hidden sm:inline">Status:</span>
                    <select class="bug-status-select bg-surface-base text-text-primary font-jetbrains text-body-sm py-1.5 px-2.5 rounded-lg border border-border-subtle focus:border-primary outline-none cursor-pointer" data-id="${bug.id}">
                      ${BUG_STATUSES.filter(st => st === bug.status || BUG_TRANSITIONS[bug.status]?.includes(st)).map(st =>
                        `<option value="${st}" ${bug.status === st ? 'selected' : ''}>${st}</option>`).join('')}
                    </select>
                  </div>

                  <div class="flex items-center gap-1.5 mt-1">
                    <button class="edit-bug-btn px-2.5 py-1 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-primary text-label-sm border border-border-subtle transition-colors flex items-center gap-1 cursor-pointer" data-id="${bug.id}" title="Edit defect">
                      <span class="material-symbols-outlined text-[15px]">edit</span>
                      <span class="hidden md:inline">Edit</span>
                    </button>
                    <button class="delete-bug-btn px-2.5 py-1 rounded-lg bg-surface-panel hover:bg-status-defect-surface text-text-muted hover:text-status-defect text-label-sm border border-border-subtle transition-colors flex items-center gap-1 cursor-pointer" data-id="${bug.id}" title="Delete defect">
                      <span class="material-symbols-outlined text-[15px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  // Search input handler
  container.querySelector('#bug-search')?.addEventListener('input', (e) => {
    bugSearchQuery = e.target.value;
    renderBugs(container);
  });
  container.querySelector('#clear-bug-search')?.addEventListener('click', () => {
    bugSearchQuery = '';
    renderBugs(container);
  });

  // Environment filter
  container.querySelector('#bug-env-filter')?.addEventListener('change', (e) => {
    currentFilterEnv = e.target.value;
    renderBugs(container);
  });

  // Status filter
  container.querySelector('#bug-status-filter')?.addEventListener('change', (e) => {
    currentFilterStatus = e.target.value;
    renderBugs(container);
  });

  // Severity tab click
  container.querySelectorAll('.sev-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const sev = tab.dataset.sev;
      currentFilterSev = currentFilterSev === sev && sev !== 'ALL' ? 'ALL' : sev;
      renderBugs(container);
    });
  });

  // Bug status transitions
  container.querySelectorAll('.bug-status-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const bugId = sel.dataset.id;
      const newStatus = e.target.value;
      const res = store.updateBug(bugId, { status: newStatus });
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        showToast(`Defect marked as ${newStatus}`, 'info');
      }
      renderBugs(container);
    });
  });

  // Edit defect handler
  container.querySelectorAll('.edit-bug-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const bug = allBugs.find(b => b.id === btn.dataset.id);
      if (bug) openDefectModal(project.id, bug, () => renderBugs(container));
    });
  });

  // Delete defect handler
  container.querySelectorAll('.delete-bug-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const bugId = btn.dataset.id;
      showConfirm(`Permanently delete defect record ${bugId}?`, () => {
        const res = store.deleteBug(bugId);
        if (res.error) showToast(res.error, 'error');
        else {
          showToast('Defect deleted.', 'info');
          renderBugs(container);
        }
      }, { title: 'Delete Defect', destructive: true, confirmText: 'Delete' });
    });
  });

  // Screenshot full-size modal viewer
  container.querySelectorAll('.view-screenshot-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const src = btn.dataset.img;
      showModal(`
        <div class="text-center">
          <img src="${src}" alt="Screenshot evidence" class="max-h-[75vh] mx-auto rounded-xl shadow-2xl border border-border-strong object-contain" />
          <div class="flex justify-end pt-3">
            <button onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-primary text-body-md hover:bg-surface-elevated cursor-pointer">Close Preview</button>
          </div>
        </div>
      `, { title: 'Screenshot Evidence' });
    });
  });

  // Add Defect trigger
  container.querySelector('#add-bug-btn')?.addEventListener('click', () => {
    openDefectModal(project.id, null, () => renderBugs(container));
  });
  container.querySelector('#empty-add-bug-btn')?.addEventListener('click', () => {
    openDefectModal(project.id, null, () => renderBugs(container));
  });
}

// ===== COMPREHENSIVE DEFECT LOGGING MODAL WITH SCREENSHOT DROPZONE =====
export function openDefectModal(projectId, existingBug = null, onSaved = null) {
  const isEdit = !!existingBug;
  const reqs = store.getRequirements(projectId);
  const tasks = store.getTasks(projectId);
  const testRuns = store.getTestRunsByProject(projectId);
  const members = store.getMembers(projectId);

  // Auto-detect browser/OS
  const defaultBrowserOs = typeof navigator !== 'undefined'
    ? `${navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : navigator.userAgent.includes('Safari') ? 'Safari' : 'Browser'} on ${navigator.userAgent.includes('Windows') ? 'Windows' : navigator.userAgent.includes('Mac') ? 'macOS' : 'Linux'}`
    : 'Chrome on Windows';

  let currentScreenshot = existingBug?.screenshot || null;

  showModal(`
    <form id="new-bug-modal-form" class="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Defect Title *</label>
        <input type="text" id="mbug-title" required value="${existingBug ? escapeHtml(existingBug.title) : ''}" placeholder="e.g. CSRF token validation fails on Safari browser"
          class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all" />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">Severity *</label>
          <select id="mbug-sev" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none font-semibold cursor-pointer">
            <option value="Critical" ${existingBug?.severity === 'Critical' ? 'selected' : ''} class="text-status-defect font-bold">Critical (P1 Blocker)</option>
            <option value="High" ${!existingBug || existingBug.severity === 'High' ? 'selected' : ''} class="text-status-in-progress font-semibold">High (Major)</option>
            <option value="Medium" ${existingBug?.severity === 'Medium' ? 'selected' : ''} class="text-secondary font-medium">Medium (Normal)</option>
            <option value="Low" ${existingBug?.severity === 'Low' ? 'selected' : ''} class="text-text-muted">Low (Minor)</option>
          </select>
        </div>
        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">Priority *</label>
          <select id="mbug-pri" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none cursor-pointer">
            <option value="High" ${existingBug?.priority === 'High' ? 'selected' : ''}>High</option>
            <option value="Medium" ${!existingBug || existingBug.priority === 'Medium' ? 'selected' : ''}>Medium</option>
            <option value="Low" ${existingBug?.priority === 'Low' ? 'selected' : ''}>Low</option>
          </select>
        </div>
      </div>

      <!-- Environment & Browser/OS -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">Environment *</label>
          <select id="mbug-env" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none cursor-pointer">
            <option value="Production" ${existingBug?.environment === 'Production' ? 'selected' : ''}>Production</option>
            <option value="Staging" ${!existingBug || existingBug.environment === 'Staging' ? 'selected' : ''}>Staging</option>
            <option value="Development" ${existingBug?.environment === 'Development' ? 'selected' : ''}>Development</option>
            <option value="QA / Testing" ${existingBug?.environment === 'QA / Testing' ? 'selected' : ''}>QA / Testing</option>
          </select>
        </div>
        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">Browser / Operating System</label>
          <input type="text" id="mbug-browser" value="${existingBug?.browserOs ? escapeHtml(existingBug.browserOs) : defaultBrowserOs}" placeholder="e.g. Chrome 120 on macOS Sonoma"
            class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none" />
        </div>
      </div>

      <!-- Traceability Links (Requirements, Test Runs, Tasks) -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">Linked Requirement</label>
          <select id="mbug-req" class="w-full bg-surface-base text-text-primary text-body-sm px-2.5 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none cursor-pointer">
            <option value="">None</option>
            ${reqs.map(r => `<option value="${r.id}" ${existingBug?.relatedRequirementId === r.id ? 'selected' : ''}>${escapeHtml(r.id)}: ${escapeHtml(r.title)}</option>`).join('')}
          </select>
        </div>

        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">Linked Test Run</label>
          <select id="mbug-run" class="w-full bg-surface-base text-text-primary text-body-sm px-2.5 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none cursor-pointer">
            <option value="">None</option>
            ${testRuns.map(tr => `<option value="${tr.id}" ${existingBug?.relatedTestRunId === tr.id ? 'selected' : ''}>${escapeHtml(tr.id)} (${tr.result})</option>`).join('')}
          </select>
        </div>

        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">Linked Sprint Task</label>
          <select id="mbug-task" class="w-full bg-surface-base text-text-primary text-body-sm px-2.5 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none cursor-pointer">
            <option value="">None</option>
            ${tasks.map(t => `<option value="${t.id}" ${existingBug?.relatedTaskId === t.id ? 'selected' : ''}>${escapeHtml(t.id)}: ${escapeHtml(t.title)}</option>`).join('')}
          </select>
        </div>
      </div>

      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Assign Fix To</label>
        <select id="mbug-assignee" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none cursor-pointer">
          <option value="">Unassigned</option>
          ${members.map(m => `<option value="${m.userId}" ${existingBug?.assigneeId === m.userId ? 'selected' : ''}>${escapeHtml(m.userName)} (${escapeHtml(m.role || 'Member')})</option>`).join('')}
        </select>
      </div>

      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Steps to Reproduce *</label>
        <textarea id="mbug-steps" rows="3" required placeholder="1. Go to URL...\n2. Click button...\n3. Expected behavior vs Observed actual behavior..."
          class="w-full bg-surface-base text-text-primary font-jetbrains text-body-sm px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none leading-relaxed">${existingBug?.stepsToReproduce ? escapeHtml(existingBug.stepsToReproduce) : ''}</textarea>
      </div>

      <!-- Drag & Drop / Paste Screenshot Zone -->
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="block text-label-md font-medium text-text-secondary">Screenshot Evidence</label>
          <span class="text-[11px] text-text-muted font-jetbrains">Supports Drag-and-Drop or Ctrl+V paste</span>
        </div>

        <div id="bug-screenshot-dropzone" class="p-4 border-2 border-dashed border-border-subtle hover:border-status-defect/60 rounded-xl bg-surface-panel/30 text-center cursor-pointer transition-all">
          <input type="file" id="bug-screenshot-file" accept="image/*" class="hidden" />
          <div id="screenshot-placeholder" class="${currentScreenshot ? 'hidden' : 'block'}">
            <span class="material-symbols-outlined text-text-muted text-[28px] mb-1">add_photo_alternate</span>
            <div class="text-body-sm font-semibold text-text-primary">Click to upload screenshot or drag image here</div>
            <div class="text-[11px] text-text-muted font-jetbrains mt-0.5">Or paste directly from clipboard (Ctrl+V)</div>
          </div>

          <div id="screenshot-preview-box" class="${currentScreenshot ? 'block' : 'hidden'} relative inline-block">
            <img id="screenshot-preview-img" src="${currentScreenshot || ''}" alt="Evidence preview" class="max-h-36 rounded-lg border border-border-strong shadow-md object-contain mx-auto" />
            <button type="button" id="remove-screenshot-btn" class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-status-defect text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer" title="Remove screenshot">
              ✕
            </button>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-3 pt-3 border-t border-border-subtle">
        <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-secondary hover:bg-surface-elevated text-body-md cursor-pointer">Cancel</button>
        <button type="submit" class="px-5 py-2 rounded-lg bg-status-defect text-on-error font-semibold text-body-md hover:brightness-110 shadow-md shadow-status-defect/20 cursor-pointer">
          ${isEdit ? 'Save Changes' : 'Log Defect'}
        </button>
      </div>
    </form>
  `, { title: isEdit ? `Edit Defect: ${existingBug.id}` : 'Log Lifecycle Defect' });

  // Screenshot handling
  const dropzone = document.getElementById('bug-screenshot-dropzone');
  const fileInput = document.getElementById('bug-screenshot-file');
  const placeholder = document.getElementById('screenshot-placeholder');
  const previewBox = document.getElementById('screenshot-preview-box');
  const previewImg = document.getElementById('screenshot-preview-img');
  const removeBtn = document.getElementById('remove-screenshot-btn');

  const setScreenshot = (dataUrl) => {
    currentScreenshot = dataUrl;
    previewImg.src = dataUrl;
    placeholder.classList.add('hidden');
    previewBox.classList.remove('hidden');
  };

  const clearScreenshot = () => {
    currentScreenshot = null;
    previewImg.src = '';
    placeholder.classList.remove('hidden');
    previewBox.classList.add('hidden');
    fileInput.value = '';
  };

  dropzone?.addEventListener('click', (e) => {
    if (e.target.closest('#remove-screenshot-btn')) return;
    fileInput?.click();
  });

  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => setScreenshot(evt.target.result);
    reader.readAsDataURL(file);
  });

  // Drag and drop image
  dropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('border-status-defect', 'bg-status-defect/10');
  });
  dropzone?.addEventListener('dragleave', () => {
    dropzone.classList.remove('border-status-defect', 'bg-status-defect/10');
  });
  dropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('border-status-defect', 'bg-status-defect/10');
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (evt) => setScreenshot(evt.target.result);
      reader.readAsDataURL(file);
    }
  });

  // Ctrl+V paste image handler
  const formModal = document.getElementById('new-bug-modal-form');
  formModal?.addEventListener('paste', (e) => {
    const items = (e.clipboardData || window.clipboardData)?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        const reader = new FileReader();
        reader.onload = (evt) => {
          setScreenshot(evt.target.result);
          showToast('Screenshot pasted from clipboard!', 'info');
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  });

  removeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    clearScreenshot();
  });

  formModal?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('mbug-title').value.trim();
    const severity = document.getElementById('mbug-sev').value;
    const priority = document.getElementById('mbug-pri').value;
    const environment = document.getElementById('mbug-env').value;
    const browserOs = document.getElementById('mbug-browser').value.trim();
    const relatedRequirementId = document.getElementById('mbug-req').value || null;
    const relatedTestRunId = document.getElementById('mbug-run').value || null;
    const relatedTaskId = document.getElementById('mbug-task').value || null;
    const assigneeId = document.getElementById('mbug-assignee').value || null;
    const stepsToReproduce = document.getElementById('mbug-steps').value.trim();

    const payload = {
      title,
      description: stepsToReproduce.split('\n')[0] || title,
      severity,
      priority,
      environment,
      browserOs,
      stepsToReproduce,
      screenshot: currentScreenshot,
      relatedRequirementId,
      relatedTestRunId,
      relatedTaskId,
      assigneeId
    };

    let res;
    if (isEdit) {
      res = store.updateBug(existingBug.id, payload);
    } else {
      res = store.createBug(projectId, payload);
    }

    if (res.error) {
      showToast(res.error, 'error');
      return;
    }

    closeModal();
    showToast(isEdit ? 'Defect updated!' : 'Defect logged into tracker!', 'success');
    if (onSaved) onSaved();
  });
}
