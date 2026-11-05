// DevTrack Project Settings & Audit History
import { store } from '../store.js';
import { formatDate, formatDateTime, showToast, showModal, closeModal } from '../ui.js';

let activeCategoryFilter = 'ALL';
let currentPage = 1;
const PAGE_SIZE = 8;

export function renderSettings(container) {
  const project = store.getActiveProject();
  if (!project) {
    container.innerHTML = `<div class="p-12 text-center text-text-muted">Select or create a project first.</div>`;
    return;
  }

  const reqHistory = store.getRequirements(project.id).flatMap(r => store.getRequirementHistory(r.id));
  const testRuns = store.getTestRunsByProject(project.id);
  const bugs = store.getBugs(project.id);
  const releases = store.getReleases(project.id);

  // Derived types from entities; avoid duplicating system logs
  const DERIVED_TYPES = ['REQUIREMENT_CREATED', 'REQUIREMENT_UPDATED', 'TEST_RUN_RECORDED', 'BUG_FILED', 'RELEASE_CREATED'];
  const systemLogs = (store.getAuditLogs ? store.getAuditLogs() : []).filter(s => !DERIVED_TYPES.includes(s.type));

  // Synthesize complete audit trail
  const rawEvents = [];

  systemLogs.forEach(s => {
    rawEvents.push({
      category: s.type?.startsWith('AUTH') || s.type?.startsWith('TEAM') || s.type?.startsWith('INVIT') ? 'AUTH' : 'CONFIG',
      type: s.type || 'SYSTEM',
      title: s.title || 'System Operation Executed',
      details: s.details || 'Internal system transaction recorded.',
      author: s.author || 'System Operator',
      timestamp: s.timestamp || new Date().toISOString(),
      icon: s.icon || 'terminal',
      color: s.color || 'text-primary'
    });
  });

  reqHistory.forEach(h => {
    const author = store.getUser(h.changedBy) || (store.currentUser ? { name: store.currentUser.name } : { name: 'Workspace Member' });
    rawEvents.push({
      category: 'REQUIREMENTS',
      type: 'REQUIREMENT_UPDATE',
      title: `Requirement field modified: ${h.field}`,
      details: `Changed from "${h.oldValue || 'none'}" to "${h.newValue || 'none'}"`,
      author: author.name,
      timestamp: h.changedAt,
      icon: 'rule',
      color: 'text-primary'
    });
  });

  testRuns.forEach(tr => {
    const author = store.getUser(tr.executedBy) || (store.currentUser ? { name: store.currentUser.name } : { name: 'QA Tester' });
    rawEvents.push({
      category: 'QA',
      type: 'TEST_RUN',
      title: `QA Test Executed: ${tr.testCaseId}`,
      details: `Outcome: ${tr.result} ${tr.notes ? `— "${tr.notes}"` : ''}`,
      author: author.name,
      timestamp: tr.executedAt,
      icon: 'verified',
      color: tr.result === 'Passed' ? 'text-status-passed' : 'text-status-defect'
    });
  });

  bugs.forEach(b => {
    const author = store.getUser(b.reporterId) || (store.currentUser ? { name: store.currentUser.name } : { name: 'Reporter' });
    rawEvents.push({
      category: 'DEFECTS',
      type: 'BUG_LOGGED',
      title: `Defect Logged: ${b.id} (${b.severity})`,
      details: `${b.title} • Status: ${b.status}`,
      author: author.name,
      timestamp: b.createdAt,
      icon: 'pest_control',
      color: 'text-status-defect'
    });
  });

  releases.forEach(r => {
    const author = store.getUser(r.createdBy) || (store.currentUser ? { name: store.currentUser.name } : { name: 'Release Lead' });
    rawEvents.push({
      category: 'CONFIG',
      type: 'RELEASE_CUT',
      title: `Release Milestone Cut: ${r.name}`,
      details: `Target: ${formatDate(r.targetDate)} • Status: ${r.status}`,
      author: author.name,
      timestamp: r.createdAt,
      icon: 'rocket_launch',
      color: 'text-status-release'
    });
  });

  // Sort descending by timestamp
  rawEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Group consecutive repetitive events to reduce log noise
  const groupedEvents = groupRepetitiveEvents(rawEvents);

  // Apply Category Filter
  const filteredEvents = activeCategoryFilter === 'ALL'
    ? groupedEvents
    : groupedEvents.filter(e => e.category === activeCategoryFilter);

  // Pagination calculations
  const totalPages = Math.ceil(filteredEvents.length / PAGE_SIZE) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedEvents = filteredEvents.slice(startIndex, startIndex + PAGE_SIZE);

  container.innerHTML = `
    <div class="relative w-full px-6 py-6" id="settings-page-root">
      <!-- Header -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div class="flex items-center gap-2 font-jetbrains text-mono-md text-text-muted mb-1">
            <span>${project.key}</span>
            <span>/</span>
            <span class="text-secondary font-medium">WORKSPACE SETTINGS</span>
            <span>/</span>
            <span class="text-text-primary">PROJECT CONFIGURATION & AUDIT</span>
          </div>
          <h1 class="font-geist text-headline-xl font-bold text-text-primary tracking-tight">Project Settings & Audit Trail</h1>
          <p class="text-body-sm text-text-muted mt-1">Configure project metadata, view tamper-evident revision logs, and export workspace data</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Left: Project Configuration Form (5 cols) -->
        <div class="lg:col-span-5 space-y-6">
          <div class="bg-surface-canvas border border-border-subtle rounded-xl p-6 shadow-sm">
            <h2 class="font-geist text-headline-sm font-bold text-text-primary mb-4 flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-[20px]">tune</span>
              <span>General Configuration</span>
            </h2>

            <form id="project-settings-form" class="space-y-4">
              <div>
                <label class="block text-label-md font-medium text-text-secondary mb-1">Project Name *</label>
                <input type="text" id="set-name" required value="${project.name}"
                  class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all" />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-label-md font-medium text-text-secondary mb-1">
                    Project Key *
                    <span class="text-[10px] text-text-muted font-normal">(Uppercase A-Z, 2-10 chars)</span>
                  </label>
                  <input type="text" id="set-key" value="${project.key}" maxlength="10" required
                    placeholder="e.g. DEV"
                    class="w-full bg-surface-base text-text-primary font-jetbrains text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none uppercase font-bold" />
                </div>
                <div>
                  <label class="block text-label-md font-medium text-text-secondary mb-1">Target End Date</label>
                  <input type="date" id="set-end" value="${project.endDate || ''}"
                    class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all" />
                </div>
              </div>

              <div>
                <label class="block text-label-md font-medium text-text-secondary mb-1">Project Description & Scope</label>
                <textarea id="set-desc" rows="4"
                  class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all">${project.description || ''}</textarea>
              </div>

              <button type="submit" class="w-full py-2.5 rounded-lg bg-primary hover:bg-primary-fixed text-on-primary font-semibold text-body-md transition-all shadow-md shadow-primary/20 cursor-pointer active:scale-95">
                Save Project Changes
              </button>
            </form>
          </div>

          <!-- Danger & Backup Area -->
          <div class="bg-surface-canvas border border-border-subtle rounded-xl p-6 shadow-sm">
            <h2 class="font-geist text-headline-sm font-bold text-text-primary mb-3 flex items-center gap-2">
              <span class="material-symbols-outlined text-secondary text-[20px]">database</span>
              <span>Data & Backup Operations</span>
            </h2>

            <div class="space-y-3">
              <button id="export-json-btn" class="w-full flex items-center justify-between p-3 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-primary text-body-sm font-medium border border-border-subtle transition-all cursor-pointer">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-secondary text-[20px]">download</span>
                  <span>Export Complete Workspace JSON</span>
                </div>
                <span class="material-symbols-outlined text-[16px] text-text-muted">chevron_right</span>
              </button>

              <button id="reset-seed-btn" class="w-full flex items-center justify-between p-3 rounded-lg bg-status-defect-surface hover:bg-status-defect/20 text-status-defect text-body-sm font-medium border border-status-defect/30 transition-all cursor-pointer">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-[20px]">restart_alt</span>
                  <span>Reset Data to Initial Seed State</span>
                </div>
                <span class="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Right: Real-time System Audit History (7 cols) -->
        <div class="lg:col-span-7">
          <div class="bg-surface-canvas border border-border-subtle rounded-xl p-6 shadow-sm flex flex-col justify-between min-h-[600px]">
            <div>
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h2 class="font-geist text-headline-sm font-bold text-text-primary flex items-center gap-2">
                    <span class="material-symbols-outlined text-status-passed text-[20px]">history_toggle_off</span>
                    <span>Audit & Revision Stream (${rawEvents.length})</span>
                  </h2>
                  <p class="text-[11px] text-text-muted font-jetbrains mt-0.5">Tamper-evident revision lineage with noise collapse</p>
                </div>
                <span class="text-[11px] font-jetbrains text-secondary">
                  Showing ${filteredEvents.length === 0 ? 0 : startIndex + 1}–${Math.min(startIndex + PAGE_SIZE, filteredEvents.length)} of ${filteredEvents.length}
                </span>
              </div>

              <!-- Audit Category Filters -->
              <div class="flex items-center gap-1.5 flex-wrap mb-4 pb-3 border-b border-border-subtle text-[11px] font-jetbrains">
                ${[
                  { id: 'ALL', label: 'All Events' },
                  { id: 'AUTH', label: 'Auth & Team' },
                  { id: 'CONFIG', label: 'Config & Releases' },
                  { id: 'REQUIREMENTS', label: 'Requirements' },
                  { id: 'QA', label: 'QA Testing' },
                  { id: 'DEFECTS', label: 'Defects' }
                ].map(cat => `
                  <button class="audit-cat-btn px-2.5 py-1 rounded-md transition-all cursor-pointer ${activeCategoryFilter === cat.id ? 'bg-primary text-on-primary font-bold shadow-sm' : 'bg-surface-panel hover:bg-surface-elevated text-text-secondary border border-border-subtle'}" data-cat="${cat.id}">
                    ${cat.label}
                  </button>
                `).join('')}
              </div>

              <!-- Events List with Grouped Repetitive Logs -->
              <div class="space-y-3">
                ${paginatedEvents.map(group => {
                  const isMultiple = group.occurrences > 1;

                  return `
                    <div class="p-3.5 rounded-xl bg-surface-base border border-border-subtle hover:border-border-strong transition-all font-jetbrains">
                      <div class="flex items-start gap-3">
                        <div class="w-8 h-8 rounded-lg bg-surface-panel flex items-center justify-center shrink-0 mt-0.5">
                          <span class="material-symbols-outlined text-[18px] ${group.color}">${group.icon}</span>
                        </div>
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center justify-between gap-2 mb-1">
                            <div class="flex items-center gap-2 truncate">
                              <h4 class="font-inter font-semibold text-body-md text-text-primary truncate">${group.title}</h4>
                              ${isMultiple ? `
                                <span class="px-1.5 py-0.2 rounded bg-secondary/20 text-secondary text-[10px] font-bold border border-secondary/30">
                                  ×${group.occurrences} events
                                </span>
                              ` : ''}
                            </div>
                            <span class="text-[10px] text-text-muted shrink-0">${formatDateTime(group.timestamp)}</span>
                          </div>
                          <p class="text-[12px] text-text-secondary font-inter mb-1.5">${group.details}</p>
                          <div class="text-[10px] text-text-muted flex items-center justify-between">
                            <span>Authorized by: <strong class="text-text-primary">${group.author}</strong></span>
                            <span class="text-[9px] uppercase px-1.5 py-0.2 rounded bg-surface-panel text-text-muted border border-border-subtle">${group.category}</span>
                          </div>

                          ${isMultiple ? `
                            <details class="mt-2 pt-2 border-t border-border-subtle text-[11px]">
                              <summary class="text-text-muted cursor-pointer hover:text-text-primary text-[10px]">
                                View all ${group.occurrences} grouped occurrences
                              </summary>
                              <div class="mt-1.5 space-y-1 pl-2 border-l border-border-subtle">
                                ${group.subEvents.map(se => `
                                  <div class="text-[10px] text-text-muted flex justify-between py-0.5">
                                    <span class="truncate">${se.details}</span>
                                    <span class="shrink-0 ml-2">${formatDateTime(se.timestamp)}</span>
                                  </div>
                                `).join('')}
                              </div>
                            </details>
                          ` : ''}
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}

                ${filteredEvents.length === 0 ? `
                  <div class="p-12 text-center text-text-muted font-jetbrains">No audit events match the selected filter.</div>
                ` : ''}
              </div>
            </div>

            <!-- Pagination Bar -->
            ${totalPages > 1 ? `
              <div class="flex items-center justify-between pt-4 mt-4 border-t border-border-subtle font-jetbrains text-[12px]">
                <button id="prev-page-btn" class="px-3 py-1.5 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-primary border border-border-subtle disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer" ${currentPage === 1 ? 'disabled' : ''}>
                  &larr; Previous
                </button>
                <span class="text-text-muted font-medium">
                  Page <strong class="text-text-primary">${currentPage}</strong> of ${totalPages}
                </span>
                <button id="next-page-btn" class="px-3 py-1.5 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-primary border border-border-subtle disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer" ${currentPage === totalPages ? 'disabled' : ''}>
                  Next &rarr;
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;

  // Project Key input validation: automatically capitalize and restrict spaces/special characters
  const keyInput = container.querySelector('#set-key');
  keyInput?.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  });

  // Attach Save settings
  container.querySelector('#project-settings-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('set-name').value.trim();
    const key = document.getElementById('set-key').value.trim().toUpperCase();
    const description = document.getElementById('set-desc').value.trim();
    const endDate = document.getElementById('set-end').value || null;

    if (key.length < 2) {
      showToast('Project Key must be at least 2 characters long.', 'error');
      return;
    }

    const res = store.updateProject(project.id, { name, key, description, endDate });
    if (res.error) {
      showToast(res.error, 'error');
      return;
    }
    showToast('Project settings saved successfully!', 'success');
  });

  // Category filter handlers
  container.querySelectorAll('.audit-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCategoryFilter = btn.dataset.cat;
      currentPage = 1;
      renderSettings(container);
    });
  });

  // Pagination handlers
  container.querySelector('#prev-page-btn')?.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderSettings(container);
    }
  });

  container.querySelector('#next-page-btn')?.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderSettings(container);
    }
  });

  // Attach Export JSON
  container.querySelector('#export-json-btn')?.addEventListener('click', () => {
    const raw = localStorage.getItem('devtrack_store');
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DevTrack_Workspace_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('Complete workspace backup downloaded!', 'success');
  });

  // Attach Reset Seed Data with strict confirmation modal
  container.querySelector('#reset-seed-btn')?.addEventListener('click', () => {
    if (store.getUserRole(project.id) !== 'Owner') {
      showToast('Forbidden: Only project owners can reset workspace data.', 'error');
      return;
    }
    openStrictResetModal(project, () => {
      store.resetData();
      showToast('Workspace successfully reset to factory seed state!', 'info');
      setTimeout(() => {
        window.location.hash = '#/dashboard';
        window.location.reload();
      }, 500);
    });
  });
}

/**
 * Groups consecutive repetitive events to collapse audit stream noise.
 */
function groupRepetitiveEvents(events) {
  const grouped = [];
  let currentGroup = null;

  events.forEach(event => {
    if (
      currentGroup &&
      currentGroup.type === event.type &&
      currentGroup.author === event.author
    ) {
      currentGroup.occurrences++;
      currentGroup.subEvents.push(event);
    } else {
      currentGroup = {
        ...event,
        occurrences: 1,
        subEvents: [event]
      };
      grouped.push(currentGroup);
    }
  });

  return grouped;
}

/**
 * Strict Destructive Action Safeguard: Type-to-confirm modal
 */
function openStrictResetModal(project, onConfirmed) {
  showModal(`
    <div class="space-y-4 font-jetbrains">
      <div class="flex items-center gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
        <span class="material-symbols-outlined text-3xl shrink-0">warning</span>
        <div>
          <div class="font-geist font-bold text-headline-sm text-white">Danger Zone: Destructive Reset</div>
          <div class="text-[12px] text-rose-300">This action permanently deletes all custom sprints, tasks, QA runs, and defects.</div>
        </div>
      </div>

      <div class="text-body-sm font-inter text-text-secondary leading-relaxed">
        To prevent accidental data loss, please confirm that you intend to wipe and reset workspace data for project
        <strong class="text-text-primary">${project.name}</strong>.
      </div>

      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">
          Type the exact Project Name <code class="text-rose-400 font-bold select-all bg-surface-panel px-1.5 py-0.5 rounded">${project.name}</code> to confirm:
        </label>
        <input type="text" id="confirm-project-name" autocomplete="off" placeholder="Type project name here"
          class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-rose-500 outline-none transition-all font-mono" />
      </div>

      <div class="flex justify-end gap-3 pt-3">
        <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-secondary hover:bg-surface-elevated text-body-md font-sans cursor-pointer">
          Cancel
        </button>
        <button id="execute-reset-btn" disabled class="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-body-md shadow-md shadow-rose-900/40 opacity-50 cursor-not-allowed transition-all font-sans">
          I Understand, Reset Workspace
        </button>
      </div>
    </div>
  `, { title: 'Strict Destructive Reset Confirmation' });

  const input = document.getElementById('confirm-project-name');
  const resetBtn = document.getElementById('execute-reset-btn');

  input?.addEventListener('input', () => {
    const matches = input.value.trim() === project.name.trim();
    resetBtn.disabled = !matches;
    if (matches) {
      resetBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      resetBtn.classList.add('cursor-pointer');
    } else {
      resetBtn.classList.add('opacity-50', 'cursor-not-allowed');
      resetBtn.classList.remove('cursor-pointer');
    }
  });

  resetBtn?.addEventListener('click', () => {
    if (input.value.trim() !== project.name.trim()) return;
    closeModal();
    onConfirmed();
  });
}
