// DevTrack Project Settings & Audit History
import { store } from '../store.js';
import { formatDate, formatDateTime, showToast, showConfirm } from '../ui.js';

export function renderSettings(container) {
  const project = store.getActiveProject();
  if (!project) {
    container.innerHTML = `<div class="p-12 text-center text-text-muted">Select or create a project first.</div>`;
    return;
  }

  const reqHistory = store.getRequirements(project.id).flatMap(r => store.getRequirementHistory(r.id));
  const testRuns = store.getTestRuns(project.id);
  const bugs = store.getBugs(project.id);
  const releases = store.getReleases(project.id);
  const systemLogs = store.getAuditLogs ? store.getAuditLogs() : [];

  // Synthesize complete audit trail
  const auditEvents = [];

  systemLogs.forEach(s => {
    auditEvents.push({
      type: s.type || 'SYSTEM',
      title: s.title,
      details: s.details,
      author: s.author || 'System',
      timestamp: s.timestamp,
      icon: s.icon || 'terminal',
      color: s.color || 'text-primary'
    });
  });

  reqHistory.forEach(h => {
    const author = store.getUser(h.changedBy) || (store.currentUser ? { name: store.currentUser.name } : { name: 'Workspace Member' });
    auditEvents.push({
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
    auditEvents.push({
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
    auditEvents.push({
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
    auditEvents.push({
      type: 'RELEASE_CUT',
      title: `Release Milestone Created: ${r.name}`,
      details: `Target: ${formatDate(r.targetDate)} • Status: ${r.status}`,
      author: author.name,
      timestamp: r.createdAt,
      icon: 'rocket_launch',
      color: 'text-status-release'
    });
  });

  auditEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  container.innerHTML = `
    <div class="relative w-full px-6 py-6">
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
                <label class="block text-label-md font-medium text-text-secondary mb-1">Project Name</label>
                <input type="text" id="set-name" required value="${project.name}"
                  class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all" />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-label-md font-medium text-text-secondary mb-1">Project Key</label>
                  <input type="text" id="set-key" disabled value="${project.key}"
                    class="w-full bg-surface-panel/50 text-text-muted font-jetbrains text-body-md px-3 py-2 rounded-lg border border-border-subtle cursor-not-allowed" />
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

              <button type="submit" class="w-full py-2.5 rounded-lg bg-primary hover:bg-primary-fixed text-on-primary font-semibold text-body-md transition-all shadow-md shadow-primary/20">
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
              <button id="export-json-btn" class="w-full flex items-center justify-between p-3 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-primary text-body-sm font-medium border border-border-subtle transition-all">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-secondary text-[20px]">download</span>
                  <span>Export Complete Workspace JSON</span>
                </div>
                <span class="material-symbols-outlined text-[16px] text-text-muted">chevron_right</span>
              </button>

              <button id="reset-seed-btn" class="w-full flex items-center justify-between p-3 rounded-lg bg-status-defect-surface hover:bg-status-defect/20 text-status-defect text-body-sm font-medium border border-status-defect/30 transition-all">
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
          <div class="bg-surface-canvas border border-border-subtle rounded-xl p-6 shadow-sm">
            <div class="flex items-center justify-between mb-4">
              <h2 class="font-geist text-headline-sm font-bold text-text-primary flex items-center gap-2">
                <span class="material-symbols-outlined text-status-passed text-[20px]">history_toggle_off</span>
                <span>Audit & Revision Stream (${auditEvents.length})</span>
              </h2>
              <span class="text-[11px] font-jetbrains text-text-muted">Tamper-evident event log</span>
            </div>

            <div class="space-y-3 max-h-[650px] overflow-y-auto pr-1">
              ${auditEvents.map(event => `
                <div class="p-3.5 rounded-xl bg-surface-base border border-border-subtle flex items-start gap-3 hover:border-border-strong transition-all">
                  <div class="w-8 h-8 rounded-lg bg-surface-panel flex items-center justify-center shrink-0 mt-0.5">
                    <span class="material-symbols-outlined text-[18px] ${event.color}">${event.icon}</span>
                  </div>
                  <div class="flex-1 min-w-0 font-jetbrains">
                    <div class="flex items-center justify-between gap-2 mb-1">
                      <h4 class="font-inter font-semibold text-body-md text-text-primary truncate">${event.title}</h4>
                      <span class="text-[10px] text-text-muted shrink-0">${formatDateTime(event.timestamp)}</span>
                    </div>
                    <p class="text-[12px] text-text-secondary font-inter mb-1.5">${event.details}</p>
                    <div class="text-[10px] text-text-muted">
                      Authorized by: <strong class="text-text-primary">${event.author}</strong>
                    </div>
                  </div>
                </div>
              `).join('')}

              ${auditEvents.length === 0 ? `
                <div class="p-12 text-center text-text-muted font-jetbrains">No audit events logged yet.</div>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach Save settings
  container.querySelector('#project-settings-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('set-name').value.trim();
    const description = document.getElementById('set-desc').value.trim();
    const endDate = document.getElementById('set-end').value || null;

    store.updateProject(project.id, { name, description, endDate });
    showToast('Project settings saved successfully!', 'success');
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

  // Attach Reset Seed Data
  container.querySelector('#reset-seed-btn')?.addEventListener('click', () => {
    showConfirm('This will reset all requirements, tasks, test runs, and defects back to factory seed data. Are you sure?', () => {
      store.resetData();
      showToast('Workspace reset to factory default data!', 'info');
      setTimeout(() => {
        window.location.hash = '#/dashboard';
        window.location.reload();
      }, 500);
    }, { title: 'Reset Workspace Data', destructive: true, confirmText: 'Reset Factory Data' });
  });
}
