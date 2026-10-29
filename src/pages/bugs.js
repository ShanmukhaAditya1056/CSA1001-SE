// DevTrack Defect & Bug Tracker
import { store } from '../store.js';
import { severityChip, priorityChip, statusChip, formatDate, showToast, showModal, closeModal, avatar } from '../ui.js';

let currentFilterSev = 'ALL';
let currentFilterStatus = 'ALL';
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
  const members = store.getMembers(project.id);

  const critCount = allBugs.filter(b => b.severity === 'Critical').length;
  const highCount = allBugs.filter(b => b.severity === 'High').length;
  const medCount = allBugs.filter(b => b.severity === 'Medium').length;
  const openCount = allBugs.filter(b => !['Fixed', 'Closed'].includes(b.status)).length;

  let filtered = allBugs;
  if (currentFilterSev !== 'ALL') {
    filtered = filtered.filter(b => b.severity === currentFilterSev);
  }
  if (currentFilterStatus !== 'ALL') {
    filtered = filtered.filter(b => b.status === currentFilterStatus);
  }
  if (bugSearchQuery.trim()) {
    const q = bugSearchQuery.toLowerCase();
    filtered = filtered.filter(b => b.title.toLowerCase().includes(q) || (b.description && b.description.toLowerCase().includes(q)));
  }

  container.innerHTML = `
    <div class="relative w-full px-6 py-6">
      <!-- Header -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div class="flex items-center gap-2 font-jetbrains text-mono-md text-text-muted mb-1">
            <span>${project.key}</span>
            <span>/</span>
            <span class="text-secondary font-medium">QUALITY & DELIVERY</span>
            <span>/</span>
            <span class="text-status-defect font-semibold">DEFECT TRACKER</span>
          </div>
          <h1 class="font-geist text-headline-xl font-bold text-text-primary tracking-tight">Defect & Bug Tracker</h1>
          <p class="text-body-sm text-text-muted mt-1">Manage lifecycle defects, reproduction steps, severity triage, and QA retest cycles</p>
        </div>

        <div class="flex items-center gap-3">
          <button id="add-bug-btn" class="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-status-defect hover:brightness-110 text-on-error font-semibold text-body-md transition-all shadow-md shadow-status-defect/20 active:scale-95">
            <span class="material-symbols-outlined text-[20px]">bug_report</span>
            <span>+ Log Defect</span>
          </button>
        </div>
      </div>

      <!-- Severity Metrics Bar -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <button class="sev-tab p-4 rounded-xl border ${currentFilterSev === 'ALL' ? 'border-primary bg-surface-canvas shadow-sm' : 'border-border-subtle bg-surface-panel/40 hover:bg-surface-panel'} text-left transition-all" data-sev="ALL">
          <div class="flex items-center justify-between text-text-muted text-[11px] font-jetbrains uppercase mb-1">
            <span>All Logged Defects</span>
            <span class="material-symbols-outlined text-[16px]">pest_control</span>
          </div>
          <div class="font-geist text-headline-lg font-bold text-text-primary">${allBugs.length}</div>
          <div class="text-[11px] text-text-muted mt-1 font-jetbrains">${openCount} currently active</div>
        </button>

        <button class="sev-tab p-4 rounded-xl border ${currentFilterSev === 'Critical' ? 'border-status-defect bg-surface-canvas shadow-sm' : 'border-border-subtle bg-surface-panel/40 hover:bg-surface-panel'} text-left transition-all" data-sev="Critical">
          <div class="flex items-center justify-between text-status-defect text-[11px] font-jetbrains uppercase mb-1">
            <span class="font-bold">Critical (P1 Blockers)</span>
            <span class="material-symbols-outlined text-[16px]">warning</span>
          </div>
          <div class="font-geist text-headline-lg font-bold text-status-defect">${critCount}</div>
          <div class="text-[11px] text-text-muted mt-1 font-jetbrains">Immediate release blocker</div>
        </button>

        <button class="sev-tab p-4 rounded-xl border ${currentFilterSev === 'High' ? 'border-status-in-progress bg-surface-canvas shadow-sm' : 'border-border-subtle bg-surface-panel/40 hover:bg-surface-panel'} text-left transition-all" data-sev="High">
          <div class="flex items-center justify-between text-status-in-progress text-[11px] font-jetbrains uppercase mb-1">
            <span class="font-bold">High Severity</span>
            <span class="material-symbols-outlined text-[16px]">priority_high</span>
          </div>
          <div class="font-geist text-headline-lg font-bold text-status-in-progress">${highCount}</div>
          <div class="text-[11px] text-text-muted mt-1 font-jetbrains">Sprint priority fix</div>
        </button>

        <button class="sev-tab p-4 rounded-xl border ${currentFilterSev === 'Medium' ? 'border-secondary bg-surface-canvas shadow-sm' : 'border-border-subtle bg-surface-panel/40 hover:bg-surface-panel'} text-left transition-all" data-sev="Medium">
          <div class="flex items-center justify-between text-secondary text-[11px] font-jetbrains uppercase mb-1">
            <span class="font-bold">Medium / Low</span>
            <span class="material-symbols-outlined text-[16px]">info</span>
          </div>
          <div class="font-geist text-headline-lg font-bold text-secondary">${medCount}</div>
          <div class="text-[11px] text-text-muted mt-1 font-jetbrains">Non-critical issues</div>
        </button>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 bg-surface-canvas p-3 rounded-xl border border-border-subtle">
        <div class="relative flex-1 max-w-md">
          <span class="material-symbols-outlined absolute left-3 top-2.5 text-text-muted text-[18px]">search</span>
          <input type="text" id="bug-search" value="${bugSearchQuery}" placeholder="Search defects by title or symptoms..."
            class="w-full bg-surface-base text-text-primary text-body-md pl-10 pr-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all" />
        </div>

        <div class="flex items-center gap-2">
          <span class="text-label-md text-text-muted font-jetbrains">Status:</span>
          <select id="bug-status-filter" class="bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none">
            <option value="ALL" ${currentFilterStatus === 'ALL' ? 'selected' : ''}>All Statuses</option>
            <option value="Open" ${currentFilterStatus === 'Open' ? 'selected' : ''}>Open</option>
            <option value="In Progress" ${currentFilterStatus === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Fixed" ${currentFilterStatus === 'Fixed' ? 'selected' : ''}>Fixed</option>
            <option value="Retest" ${currentFilterStatus === 'Retest' ? 'selected' : ''}>Retest</option>
            <option value="Closed" ${currentFilterStatus === 'Closed' ? 'selected' : ''}>Closed</option>
          </select>
        </div>
      </div>

      <!-- Defects List -->
      <div class="space-y-4">
        ${filtered.length === 0 ? `
          <div class="bg-surface-canvas border border-border-subtle rounded-xl p-12 text-center">
            <span class="material-symbols-outlined text-text-muted text-[48px] mb-3">check_circle</span>
            <h3 class="font-geist text-headline-sm font-bold text-text-primary mb-1">No Defects Matching Filter</h3>
            <p class="text-text-muted text-body-sm max-w-sm mx-auto mb-4">Great news! No defects found for the selected severity and status criteria.</p>
            <button onclick="document.getElementById('add-bug-btn').click()" class="px-4 py-2 bg-status-defect text-on-error rounded-lg font-semibold text-body-md">Log a Defect</button>
          </div>
        ` : filtered.map(bug => {
          const req = reqs.find(r => r.id === bug.relatedRequirementId);
          const task = tasks.find(t => t.id === bug.relatedTaskId);
          const assignee = members.find(m => m.userId === bug.assigneeId);
          const reporter = members.find(m => m.userId === bug.reporterId) || (store.currentUser ? { userName: `${store.currentUser.name} (QA)` } : { userName: 'QA Engineer' });

          return `
            <div class="bg-surface-canvas border border-border-subtle rounded-xl p-5 hover:border-border-strong transition-all shadow-sm">
              <div class="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div class="flex-1">
                  <div class="flex items-center flex-wrap gap-2.5 mb-2">
                    <span class="font-jetbrains text-mono-md font-bold px-2 py-0.5 rounded bg-status-defect-surface text-status-defect">${bug.id}</span>
                    ${severityChip(bug.severity)}
                    ${priorityChip(bug.priority)}
                    ${statusChip(bug.status)}
                    <span class="font-jetbrains text-[11px] text-text-muted">Reported: ${formatDate(bug.createdAt)}</span>
                  </div>

                  <h3 class="font-geist text-headline-sm font-bold text-text-primary mb-2">${bug.title}</h3>
                  <p class="text-body-md text-text-secondary mb-3">${bug.description}</p>

                  ${bug.stepsToReproduce ? `
                    <div class="p-3 bg-surface-base/80 rounded-lg border border-border-subtle mb-3">
                      <div class="text-[10px] font-jetbrains text-text-muted uppercase mb-1">Steps to Reproduce</div>
                      <div class="text-body-sm text-text-primary font-jetbrains whitespace-pre-line">${bug.stepsToReproduce}</div>
                    </div>
                  ` : ''}

                  <!-- Traceability Links -->
                  <div class="flex items-center flex-wrap gap-4 pt-2 border-t border-border-subtle/50 font-jetbrains text-[11px] text-text-muted">
                    ${req ? `
                      <span class="flex items-center gap-1 text-primary">
                        <span class="material-symbols-outlined text-[15px]">rule</span>
                        <span>Traces to: ${req.id}</span>
                      </span>
                    ` : ''}
                    ${task ? `
                      <span class="flex items-center gap-1 text-secondary">
                        <span class="material-symbols-outlined text-[15px]">task_alt</span>
                        <span>Fix Task: ${task.id}</span>
                      </span>
                    ` : ''}
                    ${bug.relatedTestRunId ? `
                      <span class="flex items-center gap-1 text-status-defect">
                        <span class="material-symbols-outlined text-[15px]">verified</span>
                        <span>Run: ${bug.relatedTestRunId}</span>
                      </span>
                    ` : ''}
                    <span class="ml-auto flex items-center gap-1 text-text-muted">
                      <span>Reporter: <strong class="text-text-primary">${reporter.userName}</strong></span>
                    </span>
                  </div>
                </div>

                <!-- Status Transition Action -->
                <div class="flex lg:flex-col items-end gap-2 shrink-0">
                  <div class="flex items-center gap-2">
                    <span class="text-label-sm text-text-muted font-jetbrains">Status:</span>
                    <select class="bug-status-select bg-surface-base text-text-primary font-jetbrains text-body-sm py-1.5 px-2.5 rounded-lg border border-border-subtle focus:border-primary outline-none" data-id="${bug.id}">
                      <option value="Open" ${bug.status === 'Open' ? 'selected' : ''}>Open</option>
                      <option value="In Progress" ${bug.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                      <option value="Fixed" ${bug.status === 'Fixed' ? 'selected' : ''}>Fixed</option>
                      <option value="Retest" ${bug.status === 'Retest' ? 'selected' : ''}>Retest</option>
                      <option value="Closed" ${bug.status === 'Closed' ? 'selected' : ''}>Closed</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  // Search input
  container.querySelector('#bug-search')?.addEventListener('input', (e) => {
    bugSearchQuery = e.target.value;
    renderBugs(container);
  });

  // Status select
  container.querySelector('#bug-status-filter')?.addEventListener('change', (e) => {
    currentFilterStatus = e.target.value;
    renderBugs(container);
  });

  // Severity tabs
  container.querySelectorAll('.sev-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      currentFilterSev = tab.dataset.sev;
      renderBugs(container);
    });
  });

  // Bug status transitions
  container.querySelectorAll('.bug-status-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const bugId = sel.dataset.id;
      const newStatus = e.target.value;
      store.updateBug(bugId, { status: newStatus });
      showToast(`Defect ${bugId} marked as ${newStatus}`, 'info');
      renderBugs(container);
    });
  });

  // Add Defect trigger
  container.querySelector('#add-bug-btn')?.addEventListener('click', () => {
    openDefectModal(project.id, () => renderBugs(container));
  });
}

function openDefectModal(projectId, onSaved) {
  const reqs = store.getRequirements(projectId);
  const tasks = store.getTasks(projectId);
  const members = store.getMembers(projectId);

  showModal(`
    <form id="new-bug-modal-form" class="space-y-4">
      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Defect Title *</label>
        <input type="text" id="mbug-title" required placeholder="e.g. CSRF token validation fails on Safari browser"
          class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all" />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">Severity *</label>
          <select id="mbug-sev" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none font-semibold">
            <option value="Critical" class="text-status-defect">Critical (Blocker)</option>
            <option value="High" class="text-status-in-progress" selected>High (Major)</option>
            <option value="Medium" class="text-secondary">Medium (Normal)</option>
            <option value="Low" class="text-text-muted">Low (Minor)</option>
          </select>
        </div>
        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">Priority *</label>
          <select id="mbug-pri" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none">
            <option value="High" selected>High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">Linked Requirement</label>
          <select id="mbug-req" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none">
            <option value="">None</option>
            ${reqs.map(r => `<option value="${r.id}">${r.id}: ${r.title}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">Assign Fix To</label>
          <select id="mbug-assignee" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none">
            <option value="">Unassigned</option>
            ${members.map(m => `<option value="${m.userId}">${m.userName} (${m.role})</option>`).join('')}
          </select>
        </div>
      </div>

      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Steps to Reproduce *</label>
        <textarea id="mbug-steps" rows="3" required placeholder="1. Go to URL...\n2. Click button...\n3. Expected behavior vs Observed behavior..."
          class="w-full bg-surface-base text-text-primary font-jetbrains text-body-sm px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none"></textarea>
      </div>

      <div class="flex justify-end gap-3 pt-3">
        <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-secondary hover:bg-surface-elevated text-body-md">Cancel</button>
        <button type="submit" class="px-5 py-2 rounded-lg bg-status-defect text-on-error font-semibold text-body-md hover:brightness-110 shadow-md shadow-status-defect/20">Log Defect</button>
      </div>
    </form>
  `, { title: 'Log New Lifecycle Defect' });

  document.getElementById('new-bug-modal-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('mbug-title').value.trim();
    const severity = document.getElementById('mbug-sev').value;
    const priority = document.getElementById('mbug-pri').value;
    const relatedRequirementId = document.getElementById('mbug-req').value || null;
    const assigneeId = document.getElementById('mbug-assignee').value || null;
    const stepsToReproduce = document.getElementById('mbug-steps').value.trim();

    store.createBug(projectId, {
      title,
      description: stepsToReproduce.split('\n')[0] || title,
      severity,
      priority,
      status: 'Open',
      stepsToReproduce,
      relatedRequirementId,
      assigneeId
    });

    closeModal();
    showToast('Defect logged into tracker!', 'success');
    if (onSaved) onSaved();
  });
}
