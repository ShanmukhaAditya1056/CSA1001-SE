// DevTrack Project Getting Started & Sequential Lifecycle Guide
import { store } from '../store.js';
import { evaluateLifecycleGating } from '../utils/onboardingGate.js';

export function renderGettingStarted(container) {
  const project = store.getActiveProject();
  if (!project) {
    container.innerHTML = `<div class="p-12 text-center text-text-muted">Select or create a project first.</div>`;
    return;
  }

  // Real store queries for dynamic progress tracking
  const members = store.getMembers(project.id);
  const reqs = store.getRequirements(project.id);
  const tasks = store.getTasks(project.id);
  const testCases = store.getTestCases(project.id);
  const releases = store.getReleases(project.id);
  const testRuns = store.getTestRunsByProject ? store.getTestRunsByProject(project.id) : [];

  // Evaluate sequential gating engine
  const { steps, completedCount, totalSteps, progressPct } = evaluateLifecycleGating({
    members,
    reqs,
    tasks,
    testCases,
    pipelineRuns: testRuns.length > 0 ? [{ id: 'run-1', status: 'Passed' }] : [],
    releases
  });

  container.innerHTML = `
    <div class="relative w-full px-6 py-6 max-w-5xl mx-auto" id="getting-started-root">
      <!-- Header -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-jetbrains text-mono-md mb-3 font-semibold">
          <span class="material-symbols-outlined text-[16px]">rocket</span>
          <span>SOFTWARE ENGINEERING LIFECYCLE BLUEPRINT</span>
        </div>
        <h1 class="font-geist text-headline-xl font-bold text-text-primary tracking-tight mb-2">Getting Started with ${project.name}</h1>
        <p class="text-body-md text-text-muted max-w-xl mx-auto">Follow this 6-stage sequential workflow to establish audit verification from requirements elicitation through production release.</p>

        <!-- Progress Indicator -->
        <div class="mt-6 max-w-md mx-auto">
          <div class="flex items-center justify-between text-body-sm font-jetbrains mb-2">
            <span class="text-text-secondary">Lifecycle Maturity</span>
            <span class="text-primary font-bold">${completedCount} of ${totalSteps} Stages Complete (${progressPct}%)</span>
          </div>
          <div class="w-full bg-surface-canvas h-2.5 rounded-full overflow-hidden border border-border-subtle p-0.5">
            <div class="bg-gradient-to-r from-primary to-secondary h-full rounded-full transition-all duration-500" style="width: ${progressPct}%"></div>
          </div>
        </div>
      </div>

      <!-- Step Cards Grid with Sequential Gating -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        ${steps.map(s => {
          let cardBorder = 'border-border-subtle bg-surface-canvas';
          let statusBadge = 'bg-surface-elevated text-text-muted';
          let statusIcon = 'pending';
          let statusLabel = 'INCOMPLETE';

          if (s.done) {
            cardBorder = 'border-emerald-500/40 bg-surface-canvas';
            statusBadge = 'bg-status-passed-surface text-status-passed';
            statusIcon = 'check_circle';
            statusLabel = 'VERIFIED';
          } else if (!s.unlocked) {
            cardBorder = 'border-border-subtle/60 bg-surface-canvas/40 opacity-70';
            statusBadge = 'bg-surface-panel text-text-muted';
            statusIcon = 'lock';
            statusLabel = 'GATED (LOCKED)';
          } else {
            // Unlocked & active
            cardBorder = 'border-primary/50 bg-primary/5 ring-1 ring-primary/30';
            statusBadge = 'bg-primary-container/20 text-primary';
            statusIcon = 'arrow_forward';
            statusLabel = 'NEXT STAGE';
          }

          return `
            <div class="rounded-xl border ${cardBorder} p-5 flex flex-col justify-between shadow-sm hover:border-border-strong transition-all">
              <div>
                <div class="flex items-center justify-between mb-3">
                  <span class="font-jetbrains text-mono-md font-bold px-2 py-0.5 rounded bg-surface-panel text-secondary">
                    STAGE ${s.step}
                  </span>
                  <span class="flex items-center gap-1 font-jetbrains text-[11px] px-2.5 py-0.5 rounded-full ${statusBadge} font-bold">
                    <span class="material-symbols-outlined text-[14px]">${statusIcon}</span>
                    <span>${statusLabel}</span>
                  </span>
                </div>

                <h3 class="font-geist text-headline-sm font-bold text-text-primary mb-1.5">${s.title}</h3>
                <p class="text-body-sm text-text-muted mb-3">${s.description}</p>

                ${s.prerequisiteText ? `
                  <div class="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-jetbrains flex items-center gap-2 mb-3">
                    <span class="material-symbols-outlined text-[15px] shrink-0">lock</span>
                    <span>${s.prerequisiteText}</span>
                  </div>
                ` : ''}
              </div>

              <div class="pt-3 border-t border-border-subtle flex items-center justify-between font-jetbrains text-[11px]">
                <span class="text-text-secondary font-medium">${s.metricText}</span>

                ${s.unlocked ? `
                  <a href="${s.link}" class="px-3.5 py-1.5 rounded-lg ${s.done ? 'bg-surface-panel hover:bg-surface-elevated text-text-primary' : 'bg-primary hover:bg-primary-fixed text-on-primary font-bold shadow-md shadow-primary/20'} transition-all flex items-center gap-1">
                    <span>${s.action}</span>
                    <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </a>
                ` : `
                  <span class="px-3 py-1.5 rounded-lg bg-surface-panel/40 text-text-muted border border-border-subtle/50 cursor-not-allowed flex items-center gap-1">
                    <span class="material-symbols-outlined text-[13px]">lock</span>
                    <span>Gated</span>
                  </span>
                `}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="text-center">
        <a href="#/dashboard" class="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary hover:bg-primary-fixed text-on-primary font-semibold text-body-md transition-all shadow-lg shadow-primary/25 cursor-pointer">
          <span>Enter Executive Dashboard</span>
          <span class="material-symbols-outlined text-[18px]">dashboard</span>
        </a>
      </div>
    </div>
  `;
}
