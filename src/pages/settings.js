// DevTrack Project Settings & Audit History
import { store } from '../store.js';
import { formatDate, formatDateTime, showToast, showModal, closeModal, escapeHtml } from '../ui.js';
import { getWebhooks, saveWebhook, deleteWebhook, toggleWebhook, testWebhook, getWebhookDeliveries, WEBHOOK_EVENT_TYPES, SERVICE_PRESETS } from '../webhooks.js';

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

      <!-- Integrations & Outbound Webhooks Hub -->
      <div class="mt-8 bg-surface-canvas border border-border-subtle rounded-xl p-6 shadow-sm" id="webhooks-hub-container">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-border-subtle">
          <div>
            <h2 class="font-geist text-headline-sm font-bold text-text-primary flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-[22px]">hub</span>
              <span>Outbound Webhooks & CI/CD Integrations</span>
            </h2>
            <p class="text-body-xs text-text-muted mt-0.5">
              Dispatch real-time event payloads to Slack channels, Discord bots, Microsoft Teams, and custom DevOps pipelines.
            </p>
          </div>
          <button id="add-webhook-btn" class="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary hover:bg-primary-fixed text-on-primary font-semibold text-body-xs transition-all shadow-sm cursor-pointer active:scale-95 self-start sm:self-center">
            <span class="material-symbols-outlined text-[16px]">add_link</span>
            <span>+ Register Webhook Endpoint</span>
          </button>
        </div>

        <!-- Webhook Roster List -->
        <div class="space-y-3 mb-6" id="webhooks-roster-list"></div>

        <!-- Recent Delivery Stream -->
        <div class="pt-4 border-t border-border-subtle">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-geist text-label-md font-bold text-text-primary flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px] text-secondary">history</span>
              <span>Recent Webhook Delivery Audit</span>
            </h3>
            <span class="text-[11px] font-mono text-text-muted">Live outbound event dispatch log</span>
          </div>
          <div id="webhook-deliveries-list" class="space-y-2"></div>
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
  initWebhooksHub(container, project.id);

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


// =============================================================
// WEBHOOKS HUB CONTROLLER & MODALS
// =============================================================

function initWebhooksHub(container, projectId) {
  renderWebhooksRoster(container, projectId);
  renderDeliveriesStream(container, projectId);

  container.querySelector('#add-webhook-btn')?.addEventListener('click', () => {
    openWebhookEditModal(projectId, null, () => {
      renderWebhooksRoster(container, projectId);
      renderDeliveriesStream(container, projectId);
    });
  });
}

function renderWebhooksRoster(container, projectId) {
  const listEl = container.querySelector('#webhooks-roster-list');
  if (!listEl) return;

  const webhooks = getWebhooks(projectId);
  if (webhooks.length === 0) {
    listEl.innerHTML = `
      <div class="p-8 text-center border border-border-subtle border-dashed rounded-xl font-jetbrains text-body-xs text-text-muted">
        No webhook endpoints registered yet. Click <span class="text-primary font-semibold">+ Register Webhook Endpoint</span> to connect Slack, Discord, or Teams.
      </div>
    `;
    return;
  }

  const serviceBadges = {
    slack: { name: 'Slack', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: 'forum' },
    discord: { name: 'Discord', color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30', icon: 'smart_toy' },
    teams: { name: 'MS Teams', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30', icon: 'groups' },
    custom: { name: 'Custom HTTP', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30', icon: 'http' }
  };

  listEl.innerHTML = webhooks.map(wh => {
    const s = serviceBadges[wh.serviceType] || serviceBadges.custom;
    const urlDisplay = wh.url.length > 45 ? wh.url.slice(0, 32) + '...' + wh.url.slice(-10) : wh.url;

    return `
      <div class="p-4 rounded-xl bg-surface-base border border-border-subtle hover:border-border-strong transition-all font-jetbrains">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div class="flex items-start gap-3 min-w-0">
            <div class="w-9 h-9 rounded-lg bg-surface-panel flex items-center justify-center shrink-0 mt-0.5 border border-border-subtle">
              <span class="material-symbols-outlined text-[20px] text-primary">${s.icon}</span>
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap mb-1">
                <span class="font-inter font-bold text-body-md text-text-primary">${escapeHtml(wh.name)}</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${s.color}">${s.name}</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${wh.active ? 'bg-status-passed-surface text-status-passed border border-status-passed/30' : 'bg-surface-elevated text-text-muted border border-border-subtle'}">
                  ${wh.active ? 'ACTIVE' : 'PAUSED'}
                </span>
              </div>
              <div class="text-[11px] text-text-muted font-mono truncate" title="${escapeHtml(wh.url)}">
                Endpoint: <span class="text-text-secondary">${escapeHtml(urlDisplay)}</span>
              </div>
              <div class="flex items-center gap-1.5 flex-wrap mt-2">
                ${wh.events.map(evt => `
                  <span class="px-2 py-0.5 rounded bg-surface-panel text-text-muted text-[10px] font-mono border border-border-subtle">
                    ${evt}
                  </span>
                `).join('')}
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 self-end md:self-center shrink-0">
            <button class="btn-test-webhook flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-primary text-[11px] font-medium border border-border-subtle transition-all cursor-pointer active:scale-95" data-id="${wh.id}" title="Send simulated test ping">
              <span class="material-symbols-outlined text-[14px] text-secondary">send</span>
              <span>Test Ping</span>
            </button>
            <button class="btn-toggle-webhook flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-secondary text-[11px] font-medium border border-border-subtle transition-all cursor-pointer active:scale-95" data-id="${wh.id}" data-active="${wh.active}">
              <span class="material-symbols-outlined text-[14px]">${wh.active ? 'pause' : 'play_arrow'}</span>
              <span>${wh.active ? 'Pause' : 'Resume'}</span>
            </button>
            <button class="btn-edit-webhook p-1.5 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-secondary hover:text-text-primary border border-border-subtle transition-all cursor-pointer active:scale-95" data-id="${wh.id}" title="Edit Webhook">
              <span class="material-symbols-outlined text-[16px]">edit</span>
            </button>
            <button class="btn-delete-webhook p-1.5 rounded-lg bg-status-defect-surface hover:bg-status-defect/20 text-status-defect border border-status-defect/30 transition-all cursor-pointer active:scale-95" data-id="${wh.id}" title="Delete Webhook">
              <span class="material-symbols-outlined text-[16px]">delete</span>
            </button>
          </div>
        </div>

        <div class="flex items-center justify-between text-[10px] text-text-muted pt-2.5 mt-2.5 border-t border-border-subtle/50">
          <span>Created ${formatDate(wh.createdAt)}</span>
          <span class="flex items-center gap-1.5">
            <span>Last Delivery:</span>
            <strong class="text-text-secondary">${wh.lastStatus || 'No dispatches yet'}</strong>
            ${wh.lastTriggeredAt ? `(${formatDateTime(wh.lastTriggeredAt)})` : ''}
          </span>
        </div>
      </div>
    `;
  }).join('');

  // Attach action handlers
  listEl.querySelectorAll('.btn-test-webhook').forEach(btn => {
    btn.addEventListener('click', () => {
      openWebhookTestModal(projectId, btn.dataset.id, () => {
        renderWebhooksRoster(container, projectId);
        renderDeliveriesStream(container, projectId);
      });
    });
  });

  listEl.querySelectorAll('.btn-toggle-webhook').forEach(btn => {
    btn.addEventListener('click', () => {
      const isCurrentlyActive = btn.dataset.active === 'true';
      toggleWebhook(projectId, btn.dataset.id, !isCurrentlyActive);
      showToast(isCurrentlyActive ? 'Webhook paused' : 'Webhook activated', 'info');
      renderWebhooksRoster(container, projectId);
    });
  });

  listEl.querySelectorAll('.btn-edit-webhook').forEach(btn => {
    btn.addEventListener('click', () => {
      openWebhookEditModal(projectId, btn.dataset.id, () => {
        renderWebhooksRoster(container, projectId);
        renderDeliveriesStream(container, projectId);
      });
    });
  });

  listEl.querySelectorAll('.btn-delete-webhook').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Delete this webhook endpoint configuration?')) {
        deleteWebhook(projectId, btn.dataset.id);
        showToast('Webhook deleted', 'info');
        renderWebhooksRoster(container, projectId);
        renderDeliveriesStream(container, projectId);
      }
    });
  });
}

function renderDeliveriesStream(container, projectId) {
  const deliveriesEl = container.querySelector('#webhook-deliveries-list');
  if (!deliveriesEl) return;

  const deliveries = getWebhookDeliveries(projectId);
  if (deliveries.length === 0) {
    deliveriesEl.innerHTML = `
      <div class="p-3 rounded-lg bg-surface-base text-center text-[11px] font-mono text-text-muted">
        No webhook delivery transactions recorded in this session.
      </div>
    `;
    return;
  }

  deliveriesEl.innerHTML = deliveries.slice(0, 5).map(d => `
    <div class="p-2.5 rounded-lg bg-surface-base border border-border-subtle flex items-center justify-between gap-3 text-body-xs font-jetbrains">
      <div class="flex items-center gap-2 min-w-0">
        <span class="w-2 h-2 rounded-full bg-status-passed shrink-0"></span>
        <span class="font-bold text-text-primary truncate">${escapeHtml(d.webhookName)}</span>
        <span class="px-1.5 py-0.2 rounded bg-surface-panel text-text-muted text-[10px] font-mono">${escapeHtml(d.eventType)}</span>
      </div>
      <div class="flex items-center gap-3 shrink-0 text-[11px]">
        <span class="text-status-passed font-semibold">${escapeHtml(d.status)}</span>
        <span class="text-text-muted">${formatDateTime(d.timestamp)}</span>
      </div>
    </div>
  `).join('');
}

export function openWebhookEditModal(projectId, webhookId = null, onSaved) {
  const isEdit = Boolean(webhookId);
  const webhooks = getWebhooks(projectId);
  const existing = isEdit ? webhooks.find(w => w.id === webhookId) : null;

  const currentType = existing?.serviceType || 'slack';
  const currentEvents = existing?.events || ['defect.created', 'release.promoted'];

  const content = `
    <form id="webhook-edit-form" class="space-y-4">
      <div>
        <label class="block text-label-sm text-text-secondary mb-1">Integration Target Platform *</label>
        <select id="wh-service-type" class="w-full bg-surface-base text-text-primary text-body-sm px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none">
          ${SERVICE_PRESETS.map(p => `
            <option value="${p.id}" ${currentType === p.id ? 'selected' : ''}>${p.name}</option>
          `).join('')}
        </select>
      </div>

      <div>
        <label class="block text-label-sm text-text-secondary mb-1">Integration Name *</label>
        <input type="text" id="wh-name" required value="${escapeHtml(existing?.name || '')}" placeholder="e.g. Slack #incident-response"
          class="w-full bg-surface-base text-text-primary text-body-sm px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none" />
      </div>

      <div>
        <label class="block text-label-sm text-text-secondary mb-1">Webhook Target URL *</label>
        <input type="url" id="wh-url" required value="${escapeHtml(existing?.url || '')}" placeholder="https://hooks.slack.com/services/..."
          class="w-full bg-surface-base text-text-primary font-jetbrains text-body-xs px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none" />
      </div>

      <div>
        <label class="block text-label-sm text-text-secondary mb-1">Subscribed Event Triggers</label>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          ${WEBHOOK_EVENT_TYPES.map(evt => `
            <label class="flex items-center gap-2 p-2 rounded-lg bg-surface-base border border-border-subtle text-body-xs cursor-pointer hover:bg-surface-panel transition-colors">
              <input type="checkbox" name="wh-events" value="${evt.id}" ${currentEvents.includes(evt.id) ? 'checked' : ''}
                class="rounded border-border-subtle text-primary focus:ring-primary w-4 h-4 cursor-pointer" />
              <div>
                <div class="font-medium text-text-primary">${evt.label}</div>
                <div class="text-[10px] text-text-muted">${evt.description}</div>
              </div>
            </label>
          `).join('')}
        </div>
      </div>

      <div class="flex justify-end gap-2.5 pt-3 border-t border-border-subtle">
        <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-secondary hover:bg-surface-elevated text-body-sm cursor-pointer">Cancel</button>
        <button type="submit" class="px-4 py-2 rounded-lg bg-primary hover:bg-primary-fixed text-on-primary font-semibold text-body-sm transition-all shadow-sm cursor-pointer active:scale-95">
          ${isEdit ? 'Save Changes' : 'Register Webhook'}
        </button>
      </div>
    </form>
  `;

  showModal(content, { title: isEdit ? 'Configure Webhook Endpoint' : 'Register New Outbound Webhook', width: 'max-w-2xl' });

  const form = document.getElementById('webhook-edit-form');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const serviceType = document.getElementById('wh-service-type').value;
    const name = document.getElementById('wh-name').value.trim();
    const url = document.getElementById('wh-url').value.trim();
    const checkedEvents = Array.from(form.querySelectorAll('input[name="wh-events"]:checked')).map(el => el.value);

    const res = saveWebhook(projectId, {
      ...(existing || {}),
      name,
      url,
      serviceType,
      events: checkedEvents
    });

    if (res.error) {
      showToast(res.error, 'error');
      return;
    }

    closeModal();
    showToast(isEdit ? 'Webhook configuration saved!' : 'Webhook endpoint registered!', 'success');
    if (onSaved) onSaved();
  });
}

export function openWebhookTestModal(projectId, webhookId, onCompleted) {
  const webhooks = getWebhooks(projectId);
  const wh = webhooks.find(w => w.id === webhookId);
  if (!wh) {
    showToast('Webhook not found', 'error');
    return;
  }

  showModal(`
    <div class="space-y-4 max-h-[80vh] overflow-y-auto pr-1" id="webhook-test-container">
      <div class="p-3.5 rounded-xl bg-surface-panel border border-border-subtle flex items-center justify-between gap-3 font-jetbrains">
        <div>
          <div class="text-[11px] text-text-muted uppercase">TESTING OUTBOUND WEBHOOK</div>
          <div class="text-body-md font-bold text-text-primary">${escapeHtml(wh.name)}</div>
        </div>
        <button id="btn-fire-test-ping" class="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-fixed text-on-primary text-body-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm transition-all">
          <span class="material-symbols-outlined text-[16px]">send</span>
          <span>Dispatch Test Ping</span>
        </button>
      </div>

      <div id="test-results-area" class="space-y-3">
        <div class="p-6 text-center text-text-muted text-body-xs font-jetbrains">
          Click <strong>Dispatch Test Ping</strong> to transmit a simulated live quality gate event to this endpoint.
        </div>
      </div>

      <div class="flex justify-end pt-2 border-t border-border-subtle">
        <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-primary text-body-sm cursor-pointer">Close</button>
      </div>
    </div>
  `, { title: 'Webhook Dispatcher & Payload Inspector', width: 'max-w-2xl' });

  const btn = document.getElementById('btn-fire-test-ping');
  const resultsArea = document.getElementById('test-results-area');

  btn?.addEventListener('click', async () => {
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined text-[16px] animate-spin">refresh</span> Dispatching...';

    const testRes = await testWebhook(projectId, webhookId, 'defect.created');

    resultsArea.innerHTML = `
      <div class="p-3.5 rounded-xl bg-status-passed-surface/30 border border-status-passed/40 space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-status-passed font-jetbrains text-label-sm font-bold flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[16px]">check_circle</span>
            <span>Delivery Successful: ${testRes.status}</span>
          </span>
          <span class="text-[11px] font-mono text-text-muted">${formatDateTime(testRes.timestamp)}</span>
        </div>
        <p class="text-body-xs text-text-secondary">Payload successfully encoded in ${wh.serviceType.toUpperCase()} format and dispatched.</p>
      </div>

      <div>
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-label-sm font-bold text-text-primary">Transmitted JSON Payload</span>
          <button id="copy-test-payload-btn" class="text-primary hover:underline text-[11px] font-mono cursor-pointer">Copy JSON</button>
        </div>
        <pre class="p-3 rounded-xl bg-surface-base border border-border-subtle font-jetbrains text-[11px] text-text-secondary overflow-x-auto max-h-[240px] whitespace-pre-wrap select-all">${escapeHtml(JSON.stringify(testRes.payload, null, 2))}</pre>
      </div>
    `;

    document.getElementById('copy-test-payload-btn')?.addEventListener('click', () => {
      navigator.clipboard?.writeText(JSON.stringify(testRes.payload, null, 2)).then(() => {
        showToast('Payload copied to clipboard!', 'success');
      });
    });

    btn.disabled = false;
    btn.innerHTML = '<span class="material-symbols-outlined text-[16px]">check</span> Dispatched!';
    if (onCompleted) onCompleted();
  });
}
