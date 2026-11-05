// DevTrack Releases & Traceability Matrix
import { store } from '../store.js';
import { teamCollab } from '../collab.js';
import { statusChip, priorityChip, severityChip, formatDate, showToast, showModal, closeModal } from '../ui.js';
import { BUG_RESOLVED_STATES } from '../rules.js';
import { calculateTraceCoverage } from '../utils/zeroState.js';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { checkReleaseSignoffStatus, generateSemanticChangelog, openDualSignoffModal, openChangelogModal } from '../releaseChangelog.js';

export function renderReleases(container) {
  const project = store.getActiveProject();
  if (!project) {
    container.innerHTML = `<div class="p-12 text-center text-text-muted">Select or create a project first.</div>`;
    return;
  }

  const releases = store.getReleases(project.id);
  const traceability = store.getTraceability(project.id);
  const testCases = store.getTestCases(project.id);
  const testRuns = store.getTestRuns(project.id);
  const bugs = store.getBugs(project.id);
  const requirements = store.getRequirements(project.id);

  const totalReqs = traceability.length;
  const readyCount = traceability.filter(row => {
    const hasPassingRun = row.testRuns.some(r => r.result === 'Passed');
    const hasUnresolvedBug = row.bugs.some(b => !BUG_RESOLVED_STATES.includes(b.status));
    return hasPassingRun && !hasUnresolvedBug;
  }).length;

  // Zero-State Telemetry calculation
  const traceCoverage = calculateTraceCoverage(requirements, testCases, bugs);

  container.innerHTML = `
    <div class="relative w-full px-6 py-6" id="traceability-page-root">
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
          <button id="release-hub-changelog-btn" class="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-status-release-surface text-status-release hover:brightness-110 font-medium text-body-md border border-status-release/40 transition-all shadow-sm cursor-pointer" title="View Semantic Changelog for Latest Milestone">
            <span class="material-symbols-outlined text-[18px]">history_edu</span>
            <span>Changelog Hub</span>
          </button>
          <button id="export-pdf-btn" class="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-panel hover:bg-surface-elevated text-status-release font-medium text-body-md border border-status-release/30 hover:border-status-release transition-all shadow-sm">
            <span class="material-symbols-outlined text-[18px]">picture_as_pdf</span>
            <span>Export Audit PDF</span>
          </button>
          <button id="export-csv-btn" class="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-primary font-medium text-body-md border border-border-subtle transition-all">
            <span class="material-symbols-outlined text-[18px]">download</span>
            <span>Export CSV</span>
          </button>
          <button id="add-release-btn" class="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-fixed text-on-primary font-semibold text-body-md transition-all shadow-md shadow-primary/20 active:scale-95">
            <span class="material-symbols-outlined text-[18px]">rocket_launch</span>
            <span>+ Cut New Release</span>
          </button>
        </div>
      </div>

      <!-- Release Gate KPI Banner with Zero-State Logic -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div class="bg-surface-canvas border border-border-subtle rounded-xl p-5 shadow-sm">
          <div class="text-[11px] font-jetbrains text-text-muted uppercase mb-1">Total Release Versions</div>
          <div class="font-geist text-headline-lg font-bold text-text-primary">${releases.length}</div>
          <div class="text-[11px] text-text-secondary mt-1 font-jetbrains">
            ${releases.filter(r => r.status === 'Released').length} Shipped • ${releases.filter(r => r.status !== 'Released').length} Planned
          </div>
        </div>

        <div class="bg-surface-canvas border border-border-subtle rounded-xl p-5 shadow-sm">
          <div class="text-[11px] font-jetbrains text-text-muted uppercase mb-1">Release Gate Compliance</div>
          <div class="font-geist text-headline-lg font-bold ${totalReqs === 0 ? 'text-text-muted' : (readyCount === totalReqs ? 'text-status-passed' : 'text-status-in-progress')}">
            ${totalReqs === 0 ? 'N/A' : `${readyCount} / ${totalReqs} Specs`}
          </div>
          <div class="text-[11px] text-text-muted mt-1 font-jetbrains">
            ${totalReqs === 0 ? 'No requirements recorded' : 'Verified with passing tests & zero blocker defects'}
          </div>
        </div>

        <div class="bg-surface-canvas border border-border-subtle rounded-xl p-5 shadow-sm">
          <div class="text-[11px] font-jetbrains text-text-muted uppercase mb-1">Audit Trace Coverage</div>
          <div class="font-geist text-headline-lg font-bold ${traceCoverage.hasData ? traceCoverage.cssClass : 'text-text-muted'}">
            ${traceCoverage.label}
          </div>
          <div class="text-[11px] mt-1 font-jetbrains flex items-center gap-1 ${traceCoverage.hasData ? traceCoverage.cssClass : 'text-text-muted'}">
            <span class="material-symbols-outlined text-[14px]">${traceCoverage.hasData ? (traceCoverage.coverage >= 80 ? 'verified' : 'warning') : 'info'}</span>
            <span>${traceCoverage.hasData ? (traceCoverage.blockerCount > 0 ? `${traceCoverage.blockerCount} blocker defect(s) penalizing coverage` : `${traceCoverage.coveredCount}/${traceCoverage.totalCount} specs linked to test verification`) : 'Zero specifications recorded'}</span>
          </div>
        </div>
      </div>

      <!-- Release Cuts List -->
      <div class="mb-8">
        <h2 class="font-geist text-headline-sm font-bold text-text-primary mb-3">Release Milestones</h2>
        ${releases.length === 0 ? `
          <div class="bg-surface-canvas border border-border-subtle border-dashed rounded-xl p-6 text-center text-text-muted font-jetbrains text-body-sm">
            No release milestones cut yet. Click <span class="text-primary font-bold">+ Cut New Release</span> to schedule a release target.
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${releases.map(rel => {
              const isReleased = rel.status === 'Released';
              const signoffState = checkReleaseSignoffStatus(rel);

              return `
                <div class="bg-surface-canvas border border-border-subtle rounded-xl p-5 flex flex-col justify-between shadow-sm hover:border-border-default transition-all">
                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <div class="flex items-center gap-2">
                        <span class="font-jetbrains text-mono-md font-bold px-2 py-0.5 rounded bg-status-release-surface text-status-release">${rel.name.split(' ')[0]}</span>
                        ${signoffState.isFullyCertified ? `
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-status-passed-surface text-status-passed border border-status-passed/30">
                            <span class="material-symbols-outlined text-[12px]">verified</span> 2/2 Sign-offs
                          </span>
                        ` : (signoffState.engSigned || signoffState.qaSigned ? `
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <span class="material-symbols-outlined text-[12px]">pending</span> 1/2 Sign-offs
                          </span>
                        ` : `
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-text-muted bg-surface-elevated border border-border-subtle">
                            0/2 Sign-offs
                          </span>
                        `)}
                      </div>
                      ${statusChip(rel.status)}
                    </div>
                    <h3 class="font-geist text-headline-sm font-bold text-text-primary mb-1">${rel.name}</h3>
                    <p class="text-body-sm text-text-secondary mb-4">${rel.summary || 'Release build cut.'}</p>
                  </div>

                  <div class="space-y-3 pt-3 border-t border-border-subtle font-jetbrains text-[11px] text-text-muted">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-[15px]">event</span>
                        <span>Target: ${formatDate(rel.targetDate)}</span>
                      </div>
                      ${rel.actualDate ? `<span class="text-status-passed font-semibold">Shipped: ${formatDate(rel.actualDate)}</span>` : ''}
                    </div>

                    <div class="flex items-center gap-2 pt-1 border-t border-border-subtle/40">
                      <button class="btn-open-signoff flex items-center gap-1 px-2.5 py-1 rounded bg-surface-panel hover:bg-surface-elevated text-text-primary text-[11px] font-medium border border-border-subtle transition-all cursor-pointer active:scale-95" data-id="${rel.id}" title="Dual Digital Signoff Gate">
                        <span class="material-symbols-outlined text-[14px] text-primary">draw</span>
                        <span>${signoffState.isFullyCertified ? 'Sign-off Certified' : 'Dual Sign-off'}</span>
                      </button>
                      <button class="btn-open-changelog flex items-center gap-1 px-2.5 py-1 rounded bg-surface-panel hover:bg-surface-elevated text-text-primary text-[11px] font-medium border border-border-subtle transition-all cursor-pointer active:scale-95" data-id="${rel.id}" title="View Semantic Changelog">
                        <span class="material-symbols-outlined text-[14px] text-status-release">notes</span>
                        <span>Changelog</span>
                      </button>
                      <div class="flex-1"></div>
                      ${!isReleased ? `
                        <button class="mark-released-btn px-3 py-1 rounded bg-status-passed-surface hover:bg-status-passed/20 text-status-passed font-semibold text-[11px] transition-all border border-status-passed/30 cursor-pointer active:scale-95" data-id="${rel.id}" data-next="${rel.status === 'Staging' ? 'Released' : 'Staging'}">
                          ${rel.status === 'Staging' ? 'Deploy to Production' : 'Promote to Staging'}
                        </button>
                      ` : `
                        <span class="text-[11px] text-status-passed font-jetbrains font-bold flex items-center gap-1">
                          <span class="material-symbols-outlined text-[14px]">check_circle</span>
                          <span>Shipped</span>
                        </span>
                      `}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <!-- Full Traceability Matrix Table -->
      <div id="traceability-table-wrapper">
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
                ${traceability.length === 0 ? `
                  <tr>
                    <td colspan="6" class="py-12 text-center text-text-muted font-jetbrains text-body-sm">
                      <div class="max-w-md mx-auto space-y-2">
                        <span class="material-symbols-outlined text-4xl text-text-muted/60">rule_folder</span>
                        <div class="font-semibold text-text-primary">No Requirements Defined</div>
                        <p class="text-xs text-text-secondary">Create requirements in Lifecycle Planning to establish forward audit lineage.</p>
                      </div>
                    </td>
                  </tr>
                ` : traceability.map(row => {
                  const req = row.requirement;
                  const gateBadge = renderAuditGateBadge(row);

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

                      <!-- 6. Gate Status (Color-coded Badges) -->
                      <td class="py-3.5 px-4 align-top text-center whitespace-nowrap">
                        ${gateBadge}
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
      const next = btn.dataset.next;
      // Release gate: production cut is blocked while Critical/High defects are unresolved.
      const openBlockers = store.getBugs(project.id).filter(b => !BUG_RESOLVED_STATES.includes(b.status) && ['Critical', 'High'].includes(b.severity)).length;
      if (next === 'Released' && openBlockers > 0) {
        showToast(`Release gate blocked: ${openBlockers} unresolved Critical/High defect(s).`, 'error');
        return;
      }
      if (next === 'Released') {
        const signoffState = checkReleaseSignoffStatus(store.getRelease(relId));
        if (!signoffState.isFullyCertified) {
          showToast('Dual digital sign-off (Engineering + QA) required before production release.', 'warning');
          openDualSignoffModal(relId, () => renderReleases(container));
          return;
        }
      }
      const res = store.updateRelease(relId, { status: next });
      if (res.error) {
        showToast(res.error, 'error');
        return;
      }
      showToast(next === 'Released' ? '🎉 Release cut marked as Released to production!' : 'Release promoted to Staging.', 'success');
      renderReleases(container);
    });
  });

  // Attach Dual Signoff Gate triggers
  container.querySelectorAll('.btn-open-signoff').forEach(btn => {
    btn.addEventListener('click', () => {
      openDualSignoffModal(btn.dataset.id, () => renderReleases(container));
    });
  });

  // Attach Semantic Changelog triggers
  container.querySelectorAll('.btn-open-changelog').forEach(btn => {
    btn.addEventListener('click', () => {
      openChangelogModal(btn.dataset.id);
    });
  });

  // Attach Top Changelog Hub trigger
  container.querySelector('#release-hub-changelog-btn')?.addEventListener('click', () => {
    const target = releases.find(r => r.status === 'Released') || releases[0];
    if (target) {
      openChangelogModal(target.id);
    } else {
      showToast('No releases created yet', 'info');
    }
  });

  // Attach Add Release trigger
  container.querySelector('#add-release-btn')?.addEventListener('click', () => {
    openReleaseModal(project.id, () => renderReleases(container));
  });

  // Export CSV
  container.querySelector('#export-csv-btn')?.addEventListener('click', () => {
    exportMatrixCSV(traceability);
  });

  // Export PDF with html2canvas and jspdf
  container.querySelector('#export-pdf-btn')?.addEventListener('click', async () => {
    await exportMatrixPDF({ project, traceability, releases, traceCoverage, readyCount, totalReqs });
  });
}

/**
 * Generates color-coded pills/badges for the Audit Readiness Gate.
 */
function renderAuditGateBadge(row) {
  const hasPassingRun = row.testRuns.some(r => r.result === 'Passed');
  const hasFailingRun = row.testRuns.some(r => r.result === 'Failed');
  const criticalDefects = row.bugs.filter(b => !BUG_RESOLVED_STATES.includes(b.status) && ['Critical', 'High'].includes(b.severity));
  const otherDefects = row.bugs.filter(b => !BUG_RESOLVED_STATES.includes(b.status));

  if (criticalDefects.length > 0) {
    return `
      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[11px] font-bold tracking-wide">
        <span class="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
        BLOCKED (${criticalDefects.length} CRITICAL)
      </span>
    `;
  }

  if (otherDefects.length > 0) {
    return `
      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-bold tracking-wide">
        <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
        DEFECTS OPEN (${otherDefects.length})
      </span>
    `;
  }

  if (hasFailingRun && !hasPassingRun) {
    return `
      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[11px] font-bold tracking-wide">
        <span class="material-symbols-outlined text-[13px]">cancel</span>
        TEST FAILED
      </span>
    `;
  }

  if (hasPassingRun) {
    return `
      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold tracking-wide">
        <span class="material-symbols-outlined text-[13px]">verified</span>
        AUDIT READY
      </span>
    `;
  }

  if (row.testCases.length === 0) {
    return `
      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-panel text-text-muted border border-border-subtle text-[11px] font-medium tracking-wide">
        <span class="w-1.5 h-1.5 rounded-full bg-text-muted/60"></span>
        NO TESTS LINKED
      </span>
    `;
  }

  return `
    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-bold tracking-wide">
      <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
      QA PENDING
    </span>
  `;
}

export function openReleaseModal(projectId, onSaved) {
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

    const res = store.createRelease(projectId, { name, targetDate, summary, status: 'Planning' });
    if (res.error) {
      showToast(res.error, 'error');
      return;
    }
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
    const isReady = row.testRuns.some(r => r.result === 'Passed') && row.bugs.filter(b => !BUG_RESOLVED_STATES.includes(b.status)).length === 0;
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

/**
 * Formal Compliance PDF Export using html2canvas & jspdf
 */
async function exportMatrixPDF({ project, traceability, releases, traceCoverage, readyCount, totalReqs }) {
  showToast('Generating Formal Compliance Audit PDF...', 'info');

  try {
    // Construct clean, print-optimized DOM element
    const printContainer = document.createElement('div');
    printContainer.style.position = 'fixed';
    printContainer.style.left = '-99999px';
    printContainer.style.top = '0';
    printContainer.style.width = '1200px';
    printContainer.style.backgroundColor = '#0b0f17';
    printContainer.style.color = '#f1f5f9';
    printContainer.style.fontFamily = 'Inter, -apple-system, sans-serif';
    printContainer.style.padding = '32px';
    printContainer.style.boxSizing = 'border-box';

    const timestamp = new Date().toLocaleString();
    const currentUser = store.currentUser || { name: 'DevTrack Auditor', role: 'Release Manager' };

    printContainer.innerHTML = `
      <div style="border: 1px solid #1e293b; border-radius: 12px; padding: 24px; background: #0f172a;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #334155; padding-bottom: 20px; margin-bottom: 24px;">
          <div>
            <div style="font-family: monospace; font-size: 13px; color: #38bdf8; font-weight: 700; margin-bottom: 4px;">
              DEVTRACK LIFECYCLE AUDIT & COMPLIANCE SYSTEM
            </div>
            <h1 style="font-size: 26px; font-weight: 800; margin: 0; color: #ffffff;">
              E2E Traceability Matrix Audit Report
            </h1>
            <div style="font-size: 13px; color: #94a3b8; margin-top: 6px;">
              Project: <strong style="color: #f1f5f9;">${project.name}</strong> (${project.key}) • Methodology: Full Lifecycle Verification
            </div>
          </div>
          <div style="text-align: right; font-family: monospace; font-size: 12px; color: #94a3b8; line-height: 1.6;">
            <div><strong>Timestamp:</strong> ${timestamp}</div>
            <div><strong>Auditor:</strong> ${currentUser.name} (${currentUser.role})</div>
            <div><strong>Total Specs:</strong> ${totalReqs}</div>
          </div>
        </div>

        <!-- Telemetry Summary Cards -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;">
          <div style="background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 16px;">
            <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-family: monospace;">Release Gate Compliance</div>
            <div style="font-size: 22px; font-weight: 700; color: ${readyCount === totalReqs && totalReqs > 0 ? '#10b981' : '#f59e0b'}; margin-top: 4px;">
              ${totalReqs === 0 ? 'N/A' : `${readyCount} / ${totalReqs} Specs Ready`}
            </div>
          </div>
          <div style="background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 16px;">
            <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-family: monospace;">Audit Trace Coverage</div>
            <div style="font-size: 22px; font-weight: 700; color: #38bdf8; margin-top: 4px;">
              ${traceCoverage.label}
            </div>
          </div>
          <div style="background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 16px;">
            <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-family: monospace;">Milestones</div>
            <div style="font-size: 22px; font-weight: 700; color: #a855f7; margin-top: 4px;">
              ${releases.length} Release Cut(s)
            </div>
          </div>
        </div>

        <!-- Table -->
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; font-family: monospace;">
          <thead>
            <tr style="background: #1e293b; border-bottom: 1px solid #334155; color: #94a3b8;">
              <th style="padding: 10px 12px;">Req ID & Spec</th>
              <th style="padding: 10px 12px;">Priority</th>
              <th style="padding: 10px 12px;">Tasks</th>
              <th style="padding: 10px 12px;">Test Verification</th>
              <th style="padding: 10px 12px;">Defects</th>
              <th style="padding: 10px 12px; text-align: center;">Audit Gate Status</th>
            </tr>
          </thead>
          <tbody>
            ${traceability.map(row => {
              const req = row.requirement;
              const hasPassing = row.testRuns.some(r => r.result === 'Passed');
              const criticalDefects = row.bugs.filter(b => !BUG_RESOLVED_STATES.includes(b.status) && ['Critical', 'High'].includes(b.severity));
              const otherDefects = row.bugs.filter(b => !BUG_RESOLVED_STATES.includes(b.status));

              let statusText = 'QA PENDING';
              let statusColor = '#f59e0b';
              if (criticalDefects.length > 0) {
                statusText = `BLOCKED (${criticalDefects.length} CRITICAL)`;
                statusColor = '#f43f5e';
              } else if (otherDefects.length > 0) {
                statusText = `BLOCKED (${otherDefects.length} DEFECTS)`;
                statusColor = '#f59e0b';
              } else if (hasPassing) {
                statusText = 'AUDIT READY';
                statusColor = '#10b981';
              } else if (row.testCases.length === 0) {
                statusText = 'NO TESTS LINKED';
                statusColor = '#64748b';
              }

              return `
                <tr style="border-bottom: 1px solid #1e293b;">
                  <td style="padding: 10px 12px;">
                    <div style="font-weight: 700; color: #38bdf8;">${req.id}</div>
                    <div style="font-family: Inter, sans-serif; font-size: 11px; color: #cbd5e1; max-width: 260px;">${req.title}</div>
                  </td>
                  <td style="padding: 10px 12px; color: #e2e8f0;">${req.priority}</td>
                  <td style="padding: 10px 12px; color: #94a3b8;">
                    ${row.tasks.length > 0 ? row.tasks.map(t => `${t.id} (${t.status})`).join(', ') : 'None'}
                  </td>
                  <td style="padding: 10px 12px; color: #94a3b8;">
                    ${row.testRuns.length > 0 ? row.testRuns.map(r => `${r.testCaseId}: ${r.result}`).join(', ') : `${row.testCases.length} case(s), unexecuted`}
                  </td>
                  <td style="padding: 10px 12px; color: ${row.bugs.length > 0 ? '#f43f5e' : '#10b981'};">
                    ${row.bugs.length > 0 ? row.bugs.map(b => `${b.id} (${b.severity})`).join(', ') : 'Clean (0)'}
                  </td>
                  <td style="padding: 10px 12px; text-align: center;">
                    <span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-weight: 700; font-size: 10px; background: rgba(255,255,255,0.05); border: 1px solid ${statusColor}; color: ${statusColor};">
                      ${statusText}
                    </span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <!-- Sign-off Footer -->
        <div style="margin-top: 36px; padding-top: 20px; border-top: 1px dashed #334155; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; font-family: monospace;">
          <div>DevTrack Automated Traceability Engine • Integrity Verified</div>
          <div>Page 1 of 1 • Official Compliance Record</div>
        </div>
      </div>
    `;

    document.body.appendChild(printContainer);

    const canvas = await html2canvas(printContainer, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#0b0f17',
      logging: false
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [canvas.width / 2, canvas.height / 2]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
    pdf.save(`DevTrack_${project.key}_Traceability_Matrix_Audit_${new Date().toISOString().split('T')[0]}.pdf`);

    printContainer.remove();
    showToast('Audit Compliance PDF exported successfully!', 'success');
  } catch (err) {
    console.error('PDF export failed:', err);
    showToast('Failed to export PDF: ' + err.message, 'error');
  }
}
