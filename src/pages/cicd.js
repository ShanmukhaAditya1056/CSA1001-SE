// DevTrack CI/CD Pipeline & Deployment Telemetry
import { store } from '../store.js';
import { formatDate, showToast } from '../ui.js';

let isRunning = false;
let currentStageIndex = 6; // all completed initially

const PIPELINE_STAGES = [
  { id: 'lint', name: 'Lint & Format', tool: 'ESLint + Prettier', time: '4.2s', status: 'Passed' },
  { id: 'typecheck', name: 'Type Safety Check', tool: 'tsc --noEmit', time: '6.8s', status: 'Passed' },
  { id: 'unit_tests', name: 'Unit & API Test Suite', tool: 'Vitest + Supertest', time: '12.4s', status: 'Passed' },
  { id: 'docker_build', name: 'Docker Compose Build', tool: 'docker-compose build', time: '28.1s', status: 'Passed' },
  { id: 'audit', name: 'Security Vulnerability Scan', tool: 'npm audit --audit-level=high', time: '3.5s', status: 'Passed' },
  { id: 'deploy', name: 'Staging Cluster Smoke Check', tool: 'Playwright Health Probe', time: '5.2s', status: 'Passed' }
];

export function renderCicd(container) {
  const project = store.getActiveProject();
  if (!project) {
    container.innerHTML = `<div class="p-12 text-center text-text-muted">Select or create a project first.</div>`;
    return;
  }

  container.innerHTML = `
    <div class="relative w-full px-6 py-6">
      <!-- Header -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div class="flex items-center gap-2 font-jetbrains text-mono-md text-text-muted mb-1">
            <span>${project.key}</span>
            <span>/</span>
            <span class="text-secondary font-medium">AUTOMATION & QA</span>
            <span>/</span>
            <span class="text-status-passed font-semibold">CI/CD PIPELINE</span>
          </div>
          <h1 class="font-geist text-headline-xl font-bold text-text-primary tracking-tight">CI/CD Pipeline & Deployment Status</h1>
          <p class="text-body-sm text-text-muted mt-1">Automated testing validation, multi-stage Docker build, and staging deployment health</p>
        </div>

        <div class="flex items-center gap-3">
          <button id="trigger-ci-btn" class="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary-fixed text-on-primary font-semibold text-body-md transition-all shadow-md shadow-primary/20 active:scale-95 ${isRunning ? 'opacity-50 pointer-events-none' : ''}">
            <span class="material-symbols-outlined text-[20px] ${isRunning ? 'animate-spin' : ''}">refresh</span>
            <span>${isRunning ? 'Running Pipeline...' : 'Trigger CI Validation'}</span>
          </button>
        </div>
      </div>

      <!-- Infrastructure Environment Badges -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div class="p-4 rounded-xl bg-surface-canvas border border-border-subtle shadow-sm flex items-center justify-between">
          <div>
            <div class="text-[11px] font-jetbrains text-text-muted uppercase">Container Engine</div>
            <div class="font-geist text-body-md font-bold text-text-primary mt-0.5">Docker Compose v2.28</div>
            <div class="text-[11px] text-status-passed font-jetbrains mt-1 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-status-passed"></span>
              <span>Cluster Healthy</span>
            </div>
          </div>
          <span class="material-symbols-outlined text-[32px] text-secondary/60">deployed_code</span>
        </div>

        <div class="p-4 rounded-xl bg-surface-canvas border border-border-subtle shadow-sm flex items-center justify-between">
          <div>
            <div class="text-[11px] font-jetbrains text-text-muted uppercase">Runtime Node Version</div>
            <div class="font-geist text-body-md font-bold text-text-primary mt-0.5">Node.js LTS v20.18</div>
            <div class="text-[11px] text-secondary font-jetbrains mt-1">Vite + Express Monolith</div>
          </div>
          <span class="material-symbols-outlined text-[32px] text-primary/60">terminal</span>
        </div>

        <div class="p-4 rounded-xl bg-surface-canvas border border-border-subtle shadow-sm flex items-center justify-between">
          <div>
            <div class="text-[11px] font-jetbrains text-text-muted uppercase">Database Container</div>
            <div class="font-geist text-body-md font-bold text-text-primary mt-0.5">PostgreSQL 16.2</div>
            <div class="text-[11px] text-status-passed font-jetbrains mt-1 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-status-passed"></span>
              <span>Prisma Migrated</span>
            </div>
          </div>
          <span class="material-symbols-outlined text-[32px] text-tertiary/60">database</span>
        </div>

        <div class="p-4 rounded-xl bg-surface-canvas border border-border-subtle shadow-sm flex items-center justify-between">
          <div>
            <div class="text-[11px] font-jetbrains text-text-muted uppercase">Pipeline Duration</div>
            <div class="font-geist text-body-md font-bold text-text-primary mt-0.5">60.2s Total</div>
            <div class="text-[11px] text-status-passed font-jetbrains mt-1">All 6 Stages Passing</div>
          </div>
          <span class="material-symbols-outlined text-[32px] text-status-passed/60">speed</span>
        </div>
      </div>

      <!-- Pipeline Stages Horizontal Stepper -->
      <div class="bg-surface-canvas border border-border-subtle rounded-xl p-6 mb-8 shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-geist text-headline-sm font-bold text-text-primary flex items-center gap-2">
            <span class="material-symbols-outlined text-secondary text-[20px]">alt_route</span>
            <span>Pipeline Execution Flow #482</span>
          </h2>
          <span class="font-jetbrains text-[11px] text-text-muted">Branch: <code>main</code> • Commit: <code>7df82ac</code></span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          ${PIPELINE_STAGES.map((stage, idx) => {
            const isDone = currentStageIndex > idx;
            const isCurrent = currentStageIndex === idx;

            return `
              <div class="p-3.5 rounded-xl border ${isCurrent ? 'border-primary bg-primary/10 animate-pulse' : isDone ? 'border-status-passed/40 bg-surface-base' : 'border-border-subtle bg-surface-base/40 opacity-50'} transition-all flex flex-col justify-between min-h-[120px]">
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <span class="font-jetbrains text-[10px] text-text-muted uppercase">Stage 0${idx + 1}</span>
                    <span class="material-symbols-outlined text-[16px] ${isCurrent ? 'text-primary animate-spin' : isDone ? 'text-status-passed' : 'text-text-muted'}">
                      ${isCurrent ? 'progress_activity' : isDone ? 'check_circle' : 'hourglass_empty'}
                    </span>
                  </div>
                  <h4 class="font-inter font-semibold text-body-md text-text-primary mb-1">${stage.name}</h4>
                  <p class="font-jetbrains text-[10px] text-text-muted truncate">${stage.tool}</p>
                </div>
                <div class="pt-2 border-t border-border-subtle/40 flex items-center justify-between font-jetbrains text-[10px] text-text-muted">
                  <span>${isDone ? stage.time : isCurrent ? 'Running...' : 'Queued'}</span>
                  <span class="${isDone ? 'text-status-passed font-bold' : isCurrent ? 'text-primary' : ''}">${isDone ? 'PASSED' : isCurrent ? 'BUSY' : 'WAIT'}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Real-Time Console Telemetry Stream -->
      <div class="bg-surface-canvas border border-border-subtle rounded-xl p-6 shadow-sm">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-status-defect"></span>
            <span class="w-3 h-3 rounded-full bg-status-in-progress"></span>
            <span class="w-3 h-3 rounded-full bg-status-passed"></span>
            <span class="font-jetbrains text-mono-md font-bold text-text-primary ml-2">Console Telemetry Log</span>
          </div>
          <span class="font-jetbrains text-[11px] text-text-muted">ANSI UTF-8</span>
        </div>

        <div id="ci-console" class="p-4 rounded-xl bg-surface-base border border-border-subtle font-jetbrains text-mono-md text-text-secondary h-64 overflow-y-auto space-y-1">
          <div class="text-text-muted"># DevTrack Automated Build Runner v2.14.0</div>
          <div><span class="text-secondary">[CI-RUNNER]</span> Initializing clean workspace on linux-amd64 container...</div>
          <div><span class="text-secondary">[GIT-CHECKOUT]</span> HEAD detached at commit 7df82ac (${store.currentUser?.name || 'Workspace Author'} &lt;${store.currentUser?.email || 'author@company.com'}&gt;)</div>
          <div><span class="text-status-passed">[STAGE-01]</span> Running ESLint and Prettier format checks... All 28 files passed.</div>
          <div><span class="text-status-passed">[STAGE-02]</span> TypeScript typecheck validation... 0 diagnostic errors found.</div>
          <div><span class="text-status-passed">[STAGE-03]</span> Vitest unit test suite executed: 38 passed, 0 failed, 4 skipped.</div>
          <div><span class="text-status-passed">[STAGE-04]</span> Docker image multi-stage build: devtrack-app:latest (32.4MB) built successfully.</div>
          <div><span class="text-status-passed">[STAGE-05]</span> npm audit: 0 high or critical vulnerabilities detected.</div>
          <div><span class="text-status-passed">[STAGE-06]</span> Smoke probe /api/health returned 200 OK (latency: 14ms).</div>
          <div class="text-status-passed font-bold mt-2">✓ Pipeline completed successfully. Ready for production release cut.</div>
        </div>
      </div>
    </div>
  `;

  // Attach trigger button
  container.querySelector('#trigger-ci-btn')?.addEventListener('click', () => {
    simulateCiRun(container);
  });
}

function simulateCiRun(container) {
  if (isRunning) return;
  isRunning = true;
  currentStageIndex = 0;
  renderCicd(container);

  const consoleEl = container.querySelector('#ci-console');
  if (consoleEl) {
    consoleEl.innerHTML = `
      <div class="text-text-muted"># DevTrack Automated Build Runner v2.14.0</div>
      <div><span class="text-secondary">[CI-RUNNER]</span> Initializing new build execution job...</div>
    `;
  }

  const stageInterval = setInterval(() => {
    currentStageIndex++;
    if (consoleEl) {
      const stage = PIPELINE_STAGES[currentStageIndex - 1];
      if (stage) {
        const div = document.createElement('div');
        div.innerHTML = `<span class="text-status-passed">[STAGE-0${currentStageIndex}]</span> Running ${stage.name} (${stage.tool})... PASSED in ${stage.time}`;
        consoleEl.appendChild(div);
        consoleEl.scrollTop = consoleEl.scrollHeight;
      }
    }

    if (currentStageIndex >= PIPELINE_STAGES.length) {
      clearInterval(stageInterval);
      isRunning = false;
      showToast('CI Pipeline validation finished with 100% pass!', 'success');
      renderCicd(container);
    } else {
      renderCicd(container);
    }
  }, 1200);
}
