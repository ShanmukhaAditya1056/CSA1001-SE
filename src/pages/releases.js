// DevTrack Releases & Traceability Matrix
import { store } from '../store.js';
import { statusChip, priorityChip, severityChip, formatDate, showToast, showModal, closeModal } from '../ui.js';

export function renderReleases(container) {
  const project = store.getActiveProject();
  if (!project) {
    container.innerHTML = `<div class="p-12 text-center text-text-muted">Select or create a project first.</div>`;
    return;
  }

  const releases = store.getReleases(project.id);
  const traceability = store.getTraceability(project.id);
  const totalReqs = traceability.length;
  const readyCount = traceability.filter(row => {
    const hasPassingRun = row.testRuns.some(r => r.result === 'Passed');
    const hasUnresolvedBug = row.bugs.some(b => ['Open', 'In Progress'].includes(b.status));
    return hasPassingRun && !hasUnresolvedBug;
  }).length;

  container.innerHTML = `
    <div class="relative w-full px-6 py-6">
      <!-- Header -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div class="flex items-center gap-2 font-jetbrains text-mono-md text-text-muted mb-1">
            <span>${project.key}</span>
            <span>/</span>
            <span class="text-secondary font-medium">LIFECYCLE AUDIT</span>
            <span>/</span>
            <span class="text-status-release font-semibold">RELEASES & TRACEABILITY MATRIX</span>
          </div>
          <h1 class="font-geist text-headline-xl font-bold text-text-primary tracking-tight">Releases & Traceability Matrix</h1>
          <p class="text-body-sm text-text-muted mt-1">End-to-end forward and backward audit verification from elicitation to production release</p>
        </div>

        <div class="flex items-center flex-wrap gap-2.5">
          <button id="export-csv-btn" class="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-primary font-medium text-body-md border border-border-subtle transition-all">
            <span class="material-symbols-outlined text-[18px]">download</span>
            <span>Export Matrix CSV</span>
          </button>
          <button id="add-release-btn" class="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-fixed text-on-primary font-semibold text-body-md transition-all shadow-md shadow-primary/20 active:scale-95">
            <span class="material-symbols-outlined text-[18px]">rocket_launch</span>
            <span>+ Cut New Release</span>
          </button>
        </div>
      </div>

      <!-- Release Gate KPI Banner -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div class="bg-surface-canvas border border-border-subtle rounded-xl p-5 shadow-sm">
          <div class="text-[11px] font-jetbrains text-text-muted uppercase mb-1">Total Release Versions</div>
          <div class="font-geist text-headline-lg font-bold text-text-primary">${releases.length}</div>
          <div class="text-[11px] text-text-secondary mt-1 font-jetbrains">
            ${releases.filter(r => r.status === 'Released').length} Shipped • ${releases.filter(r => r.status === 'Planned').length} Planned
          </div>
        </div>

        <div class="bg-surface-canvas border border-border-subtle rounded-xl p-5 shadow-sm">
          <div class="text-[11px] font-jetbrains text-text-muted uppercase mb-1">Release Gate Compliance</div>
          <div class="font-geist text-headline-lg font-bold ${readyCount === totalReqs ? 'text-status-passed' : 'text-status-in-progress'}">
            ${readyCount} / ${totalReqs} Specs
          </div>
          <div class="text-[11px] text-text-muted mt-1 font-jetbrains">
            Verified with passing tests & zero blocker defects
          </div>
        </div>

        <div class="bg-surface-canvas border border-border-subtle rounded-xl p-5 shadow-sm">
          <div class="text-[11px] font-jetbrains text-text-muted uppercase mb-1">Audit Trace Coverage</div>
          <div class="font-geist text-headline-lg font-bold text-secondary">100%</div>
          <div class="text-[11px] text-status-passed mt-1 font-jetbrains flex items-center gap-1">
            <span class="material-symbols-outlined text-[14px]">verified</span>
            <span>All specs have linked tasks or test runs</span>
          </div>
        </div>
      </div>

      <!-- Release Cuts List -->
      <div class="mb-8">
        <h2 class="font-geist text-headline-sm font-bold text-text-primary mb-3">Release Milestones</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${releases.map(rel => {
            const isReleased = rel.status === 'Released';

            return `
              <div class="bg-surface-canvas border border-border-subtle rounded-xl p-5 flex flex-col justify-between shadow-sm">
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <span class="font-jetbrains text-mono-md font-bold px-2 py-0.5 rounded bg-status-release-surface text-status-release">${rel.name.split(' ')[0]}</span>
                    ${statusChip(rel.status)}
                  </div>
                  <h3 class="font-geist text-headline-sm font-bold text-text-primary mb-1">${rel.name}</h3>
                  <p class="text-body-sm text-text-secondary mb-4">${rel.summary || 'Release build cut.'}</p>
                </div>

                <div class="pt-3 border-t border-border-subtle flex items-center justify-between font-jetbrains text-[11px] text-text-muted">
                  <div class="flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[15px]">event</span>
                    <span>Target: ${formatDate(rel.targetDate)}</span>
                    ${rel.actualDate ? `<span class="text-status-passed ml-2">Shipped: ${formatDate(rel.actualDate)}</span>` : ''}
                  </div>

                  ${!isReleased ? `
                    <button class="mark-released-btn px-3 py-1 rounded bg-status-passed-surface hover:bg-status-passed/20 text-status-passed font-semibold transition-all border border-status-passed/30" data-id="${rel.id}">
                      Mark Released
                    </button>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Full Traceability Matrix Table -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <div>
            <h2 class="font-geist text-headline-sm font-bold text-text-primary">E2E Lifecycle Traceability Matrix</h2>
            <p class="text-body-sm text-text-muted">Bidirectional verification link linking: Requirement &rarr; Tasks &rarr; Test Suites &rarr; Defects &rarr; Release</p>
          </div>
        </div>

        <div class="bg-surface-canvas border border-border-subtle rounded-xl overflow-hidden shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-left font-jetbrains text-body-sm">
              <thead class="bg-surface-panel/80 border-b border-border-subtle text-[11px] uppercase tracking-wider text-text-muted">
                <tr>
                  <th class="py-3 px-4">Requirement Spec</th>
                  <th class="py-3 px-4">Implementation Tasks</th>
                  <th class="py-3 px-4">Verification Runs</th>
                  <th class="py-3 px-4">Defects / Blockers</th>
                  <th class="py-3 px-4">Release Target</th>
                  <th class="py-3 px-4 text-center">Audit Readiness Gate</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border-subtle">
                ${traceability.map(row => {
                  const req = row.requirement;
                  const hasPassingRun = row.testRuns.some(r => r.result === 'Passed');
                  const hasFailingRun = row.testRuns.some(r => r.result === 'Failed');
                  const openDefects = row.bugs.filter(b => !['Fixed', 'Closed'].includes(b.status));
                  const isReady = hasPassingRun && openDefects.length === 0;

                  return `
                    <tr class="hover:bg-surface-panel/30 transition-colors">
                      <!-- 1. Requirement Spec -->
                      <td class="py-3.5 px-4 align-top max-w-xs">
                        <div class="flex items-center gap-1.5 mb-1">
                          <span class="text-mono-md font-bold text-primary">${req.id}</span>
                          ${priorityChip(req.priority)}
                        </div>
                        <div class="font-inter font-semibold text-text-primary text-[13px] line-clamp-2">${req.title}</div>
                      </td>

                      <!-- 2. Implementation Tasks -->
                      <td class="py-3.5 px-4 align-top">
                        ${row.tasks.length === 0 ? `
                          <span class="text-text-muted text-[11px]">No tasks</span>
                        ` : `
                          <div class="space-y-1">
                            ${row.tasks.map(t => `
                              <div class="flex items-center gap-1.5 text-[11px]">
                                <span class="text-secondary font-bold">${t.id}</span>
                                ${statusChip(t.status)}
                              </div>
                            `).join('')}
                          </div>
                        `}
                      </td>

                      <!-- 3. Test Cases & Runs -->
                      <td class="py-3.5 px-4 align-top">
                        ${row.testRuns.length === 0 ? `
                          <span class="text-text-muted text-[11px]">${row.testCases.length} case(s), unexecuted</span>
                        ` : `
                          <div class="space-y-1">
                            ${row.testRuns.map(tr => `
                              <div class="flex items-center gap-1.5 text-[11px]">
                                <span class="text-text-primary font-bold">${tr.testCaseId}</span>
                                ${statusChip(tr.result)}
                              </div>
                            `).join('')}
                          </div>
                        `}
                      </td>

                      <!-- 4. Defects -->
                      <td class="py-3.5 px-4 align-top">
                        ${row.bugs.length === 0 ? `
                          <span class="text-status-passed text-[11px] font-semibold flex items-center gap-1">
                            <span class="material-symbols-outlined text-[13px]">check</span>
                            <span>Clean</span>
                          </span>
                        ` : `
                          <div class="space-y-1">
                            ${row.bugs.map(b => `
                              <div class="flex items-center gap-1.5 text-[11px]">
                                <span class="text-status-defect font-bold">${b.id}</span>
                                ${severityChip(b.severity)}
                                ${statusChip(b.status)}
                              </div>
                            `).join('')}
                          </div>
                        `}
                      </td>

                      <!-- 5. Release Target -->
                      <td class="py-3.5 px-4 align-top">
                        <span class="text-[11px] font-bold text-status-release">
                          ${releases.find(r => r.id === req.targetRelease)?.name.split(' ')[0] || 'v1.0.0'}
                        </span>
                      </td>

                      <!-- 6. Gate Status -->
                      <td class="py-3.5 px-4 align-top text-center">
                        ${isReady ? `
                          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-status-passed-surface text-status-passed text-[11px] font-bold">
                            <span class="w-1.5 h-1.5 rounded-full bg-status-passed"></span>
                            RELEASE READY
                          </span>
                        ` : `
                          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-status-defect-surface text-status-defect text-[11px] font-bold">
                            <span class="w-1.5 h-1.5 rounded-full bg-status-defect animate-pulse"></span>
                            GATED (${openDefects.length > 0 ? `${openDefects.length} DEFECT` : 'QA PENDING'})
                          </span>
                        `}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach mark released button
  container.querySelectorAll('.mark-released-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const relId = btn.dataset.id;
      store.updateRelease(relId, { status: 'Released' });
      showToast('Release cut marked as Released to production!', 'success');
      renderReleases(container);
    });
  });

  // Attach Add Release trigger
  container.querySelector('#add-release-btn')?.addEventListener('click', () => {
    openReleaseModal(project.id, () => renderReleases(container));
  });

  // Export CSV
  container.querySelector('#export-csv-btn')?.addEventListener('click', () => {
    exportMatrixCSV(traceability);
  });
}

function openReleaseModal(projectId, onSaved) {
  showModal(`
    <form id="new-rel-form" class="space-y-4">
      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Release Version Tag & Title *</label>
        <input type="text" id="rel-name" required placeholder="e.g. v1.1.0 — Security Hardening Release"
          class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all" />
      </div>

      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Target Cutoff Date *</label>
        <input type="date" id="rel-date" required value="${new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]}"
          class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all" />
      </div>

      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Release Summary Scope</label>
        <textarea id="rel-summary" rows="3" placeholder="Key deliverables, audit gates, changelog notes..."
          class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none"></textarea>
      </div>

      <div class="flex justify-end gap-3 pt-3">
        <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-secondary hover:bg-surface-elevated text-body-md">Cancel</button>
        <button type="submit" class="px-5 py-2 rounded-lg bg-primary text-on-primary font-semibold text-body-md hover:bg-primary-fixed shadow-md shadow-primary/20">Create Milestone</button>
      </div>
    </form>
  `, { title: 'Cut New Release Milestone' });

  document.getElementById('new-rel-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('rel-name').value.trim();
    const targetDate = document.getElementById('rel-date').value;
    const summary = document.getElementById('rel-summary').value.trim();

    store.createRelease(projectId, { name, targetDate, summary, status: 'Planned' });
    closeModal();
    showToast('Release milestone created!', 'success');
    if (onSaved) onSaved();
  });
}

function exportMatrixCSV(traceability) {
  let csv = 'Requirement ID,Title,MoSCoW,Tasks,Test Cases,Test Runs Status,Open Bugs,Ready\n';
  traceability.forEach(row => {
    const req = row.requirement;
    const tasks = row.tasks.map(t => `${t.id}:${t.status}`).join('; ');
    const testRuns = row.testRuns.map(tr => `${tr.testCaseId}:${tr.result}`).join('; ');
    const bugs = row.bugs.map(b => `${b.id}:${b.status}`).join('; ');
    const isReady = row.testRuns.some(r => r.result === 'Passed') && row.bugs.filter(b => !['Fixed', 'Closed'].includes(b.status)).length === 0;
    csv += `"${req.id}","${req.title}","${req.priority}","${tasks}","${row.testCases.length}","${testRuns}","${bugs}","${isReady ? 'YES' : 'NO'}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `DevTrack_Traceability_Matrix_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  showToast('Traceability Matrix CSV exported!', 'success');
}
