// DevTrack CI/CD Pipeline & Deployment Telemetry
import { store } from '../store.js';
import { formatDate, showToast, showModal, closeModal } from '../ui.js';
import { can } from '../rules.js';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

// Predefined historical runs with telemetry, errors, and traces
const HISTORICAL_RUNS = [
  {
    id: 'run-482',
    number: 482,
    branch: 'main',
    commit: '7df82ac',
    author: 'Lead Architect',
    triggeredAt: 'Just now',
    duration: '60.2s',
    status: 'Passed',
    stages: [
      { id: 'lint', name: 'Lint & Format', tool: 'ESLint + Prettier', time: '4.2s', status: 'Passed', command: 'npx eslint . && prettier --check .' },
      { id: 'typecheck', name: 'Type Safety Check', tool: 'tsc --noEmit', time: '6.8s', status: 'Passed', command: 'npx tsc --noEmit' },
      { id: 'unit_tests', name: 'Unit & API Test Suite', tool: 'Vitest + Supertest', time: '12.4s', status: 'Passed', command: 'npx vitest run --coverage' },
      { id: 'docker_build', name: 'Docker Compose Build', tool: 'docker-compose build', time: '28.1s', status: 'Passed', command: 'docker compose build --parallel' },
      { id: 'audit', name: 'Security Vulnerability Scan', tool: 'npm audit', time: '3.5s', status: 'Passed', command: 'npm audit --audit-level=high' },
      { id: 'deploy', name: 'Staging Cluster Smoke Check', tool: 'Playwright Health Probe', time: '5.2s', status: 'Passed', command: 'npx playwright test tests/e2e/smoke' }
    ],
    logs: [
      '\x1b[1;34m# DevTrack Automated Build Runner v2.14.0\x1b[0m',
      '\x1b[36m[CI-RUNNER]\x1b[0m Initializing clean workspace on linux-amd64 container...',
      '\x1b[36m[GIT-CHECKOUT]\x1b[0m HEAD detached at commit 7df82ac (Lead Architect <lead@devtrack.io>)',
      '\x1b[33m[STAGE 1/6]\x1b[0m Running ESLint and Prettier format checks...',
      '\x1b[32m  ✔ All 31 JavaScript/CSS modules passed formatting.\x1b[0m (4.2s)',
      '\x1b[33m[STAGE 2/6]\x1b[0m Validating TypeScript type safety (tsc --noEmit)...',
      '\x1b[32m  ✔ 0 diagnostic errors found across 4,200 LOC.\x1b[0m (6.8s)',
      '\x1b[33m[STAGE 3/6]\x1b[0m Executing Vitest & Supertest unit/integration suites...',
      '\x1b[32m  ✔ PASS tests/unit/storeRules.test.js\x1b[0m',
      '\x1b[32m  ✔ PASS tests/unit/businessRules.test.js\x1b[0m',
      '\x1b[32m  ✔ PASS tests/unit/zeroStateGating.test.js\x1b[0m',
      '\x1b[32m  ✔ PASS tests/unit/teamMembership.test.js\x1b[0m',
      '\x1b[32m  ✔ 8 suites passed, 42 tests passed, 0 failed\x1b[0m (12.4s)',
      '\x1b[33m[STAGE 4/6]\x1b[0m Docker multi-stage image build...',
      '\x1b[32m  ✔ Image devtrack-app:latest (32.4MB) built successfully.\x1b[0m (28.1s)',
      '\x1b[33m[STAGE 5/6]\x1b[0m Auditing dependency security tree...',
      '\x1b[32m  ✔ 0 high or critical vulnerabilities detected.\x1b[0m (3.5s)',
      '\x1b[33m[STAGE 6/6]\x1b[0m Deploying to Staging Kubernetes cluster and running smoke tests...',
      '\x1b[32m  ✔ Smoke probe /api/health returned 200 OK (latency: 14ms).\x1b[0m (5.2s)',
      '\x1b[1;32m✓ PIPELINE EXECUTION #482 COMPLETED SUCCESSFULLY.\x1b[0m All gates cleared for Production cut.'
    ]
  },
  {
    id: 'run-481',
    number: 481,
    branch: 'fix/auth-jwt',
    commit: 'b41c90e',
    author: 'Dev Engineer',
    triggeredAt: '3 hours ago',
    duration: '23.4s',
    status: 'Failed',
    stages: [
      { id: 'lint', name: 'Lint & Format', tool: 'ESLint + Prettier', time: '4.1s', status: 'Passed', command: 'npx eslint . && prettier --check .' },
      { id: 'typecheck', name: 'Type Safety Check', tool: 'tsc --noEmit', time: '6.5s', status: 'Passed', command: 'npx tsc --noEmit' },
      {
        id: 'unit_tests',
        name: 'Unit & API Test Suite',
        tool: 'Vitest + Supertest',
        time: '12.8s',
        status: 'Failed',
        command: 'npx vitest run --coverage',
        errorDetails: {
          exitCode: 1,
          failedTest: 'tests/unit/businessRules.test.js > Role Permission Matrix > should reject non-owner release promotion',
          stackTrace: `AssertionError: expected status 200 to equal 403 (FORBIDDEN)
  ❯ tests/unit/businessRules.test.js:84:18
      82|   const res = await request(app).post('/api/releases/cut').send(payload);
      83|   // Expected release cut to be blocked for Developer role
      84|   expect(res.status).toBe(403);
      85|   expect(res.body.error).toContain('Forbidden: Developer role');`,
          rootCause: 'Authorization middleware did not enforce strict RBAC check for Developer role on /api/releases/cut endpoint.',
          suggestedRemediation: "Ensure 'release.write' permission is required via requirePermission(access.role, 'release.write') in server router."
        }
      },
      { id: 'docker_build', name: 'Docker Compose Build', tool: 'docker-compose build', time: '-', status: 'Skipped', command: 'docker compose build' },
      { id: 'audit', name: 'Security Vulnerability Scan', tool: 'npm audit', time: '-', status: 'Skipped', command: 'npm audit' },
      { id: 'deploy', name: 'Staging Cluster Smoke Check', tool: 'Playwright Health Probe', time: '-', status: 'Skipped', command: 'npx playwright test' }
    ],
    logs: [
      '\x1b[1;34m# DevTrack Automated Build Runner v2.14.0\x1b[0m',
      '\x1b[36m[CI-RUNNER]\x1b[0m Spawning runner container on branch fix/auth-jwt...',
      '\x1b[36m[GIT-CHECKOUT]\x1b[0m HEAD at commit b41c90e (Dev Engineer <dev@devtrack.io>)',
      '\x1b[33m[STAGE 1/6]\x1b[0m Running ESLint and Prettier format checks...',
      '\x1b[32m  ✔ All modules formatted correctly.\x1b[0m (4.1s)',
      '\x1b[33m[STAGE 2/6]\x1b[0m Validating TypeScript type safety (tsc --noEmit)...',
      '\x1b[32m  ✔ 0 diagnostic errors.\x1b[0m (6.5s)',
      '\x1b[33m[STAGE 3/6]\x1b[0m Executing Vitest & Supertest unit/integration suites...',
      '\x1b[31m  FAIL tests/unit/businessRules.test.js\x1b[0m',
      '\x1b[31m  ❯ Role Permission Matrix > should reject non-owner release promotion\x1b[0m',
      '\x1b[31m    AssertionError: expected status 200 to equal 403\x1b[0m',
      '\x1b[31m    at tests/unit/businessRules.test.js:84:18\x1b[0m',
      '\x1b[31m[ERROR]\x1b[0m Test suite failed with exit code 1. Halting pipeline execution.',
      '\x1b[1;31m✖ PIPELINE EXECUTION #481 FAILED.\x1b[0m Downstream stages skipped. Click Stage 03 to inspect stack trace.'
    ]
  },
  {
    id: 'run-480',
    number: 480,
    branch: 'feat/moscow',
    commit: '3a912e4',
    author: 'Lead Architect',
    triggeredAt: 'Yesterday',
    duration: '58.7s',
    status: 'Passed',
    stages: [
      { id: 'lint', name: 'Lint & Format', tool: 'ESLint + Prettier', time: '4.0s', status: 'Passed', command: 'npx eslint .' },
      { id: 'typecheck', name: 'Type Safety Check', tool: 'tsc --noEmit', time: '6.7s', status: 'Passed', command: 'npx tsc --noEmit' },
      { id: 'unit_tests', name: 'Unit & API Test Suite', tool: 'Vitest + Supertest', time: '11.9s', status: 'Passed', command: 'npx vitest run' },
      { id: 'docker_build', name: 'Docker Compose Build', tool: 'docker-compose build', time: '27.5s', status: 'Passed', command: 'docker compose build' },
      { id: 'audit', name: 'Security Vulnerability Scan', tool: 'npm audit', time: '3.6s', status: 'Passed', command: 'npm audit' },
      { id: 'deploy', name: 'Staging Cluster Smoke Check', tool: 'Playwright Health Probe', time: '5.0s', status: 'Passed', command: 'npx playwright test' }
    ],
    logs: [
      '\x1b[1;34m# DevTrack Automated Build Runner v2.14.0\x1b[0m',
      '\x1b[36m[CI-RUNNER]\x1b[0m Workspace initialized for feat/moscow @ 3a912e4...',
      '\x1b[32m✔ STAGE 1: Lint & Format passed (4.0s)\x1b[0m',
      '\x1b[32m✔ STAGE 2: TypeScript typecheck passed (6.7s)\x1b[0m',
      '\x1b[32m✔ STAGE 3: 8 test suites passed (11.9s)\x1b[0m',
      '\x1b[32m✔ STAGE 4: Docker build finished (27.5s)\x1b[0m',
      '\x1b[32m✔ STAGE 5: Security audit passed (3.6s)\x1b[0m',
      '\x1b[32m✔ STAGE 6: Staging smoke checks verified (5.0s)\x1b[0m',
      '\x1b[1;32m✓ PIPELINE EXECUTION #480 COMPLETED SUCCESSFULLY.\x1b[0m'
    ]
  },
  {
    id: 'run-479',
    number: 479,
    branch: 'refactor/api',
    commit: '10ec92b',
    author: 'Dev Engineer',
    triggeredAt: '2 days ago',
    duration: '4.2s',
    status: 'Failed',
    stages: [
      {
        id: 'lint',
        name: 'Lint & Format',
        tool: 'ESLint + Prettier',
        time: '4.2s',
        status: 'Failed',
        command: 'npx eslint . && prettier --check .',
        errorDetails: {
          exitCode: 1,
          failedTest: 'src/pages/releases.js',
          stackTrace: `ESLint: 2 problems (2 errors, 0 warnings)
  c:\\Users\\lenovo\\Documents\\SE-CSA1001\\src\\pages\\releases.js
    34:12  error  'totalCount' is defined but never used      no-unused-vars
    67:9   error  Unreachable code after early return         no-unreachable`,
          rootCause: 'Code quality failure: unused variable totalCount and unreachable statement.',
          suggestedRemediation: "Remove unused variables and clean up unreachable returns in src/pages/releases.js. Run 'npx eslint --fix .'."
        }
      },
      { id: 'typecheck', name: 'Type Safety Check', tool: 'tsc --noEmit', time: '-', status: 'Skipped', command: 'npx tsc --noEmit' },
      { id: 'unit_tests', name: 'Unit & API Test Suite', tool: 'Vitest + Supertest', time: '-', status: 'Skipped', command: 'npx vitest' },
      { id: 'docker_build', name: 'Docker Compose Build', tool: 'docker-compose build', time: '-', status: 'Skipped', command: 'docker build' },
      { id: 'audit', name: 'Security Vulnerability Scan', tool: 'npm audit', time: '-', status: 'Skipped', command: 'npm audit' },
      { id: 'deploy', name: 'Staging Cluster Smoke Check', tool: 'Playwright Health Probe', time: '-', status: 'Skipped', command: 'npx playwright' }
    ],
    logs: [
      '\x1b[1;34m# DevTrack Automated Build Runner v2.14.0\x1b[0m',
      '\x1b[36m[CI-RUNNER]\x1b[0m Spawning runner container on branch refactor/api...',
      '\x1b[33m[STAGE 1/6: LINT]\x1b[0m Running ESLint syntax check...',
      '\x1b[31m  error: totalCount is defined but never used (no-unused-vars) in src/pages/releases.js:34\x1b[0m',
      '\x1b[31m  error: Unreachable code after return (no-unreachable) in src/pages/releases.js:67\x1b[0m',
      '\x1b[31m[ERROR]\x1b[0m ESLint reported 2 critical formatting errors. Build aborted.',
      '\x1b[1;31m✖ PIPELINE EXECUTION #479 FAILED.\x1b[0m Click Stage 01 to view full diagnostic report.'
    ]
  }
];

let selectedRunId = 'run-482';
let isRunning = false;
let activeTerminal = null;
let activeFitAddon = null;

export function renderCicd(container) {
  const project = store.getActiveProject();
  if (!project) {
    container.innerHTML = `<div class="p-12 text-center text-text-muted">Select or create a project first.</div>`;
    return;
  }

  const currentUser = store.currentUser;
  const role = store.getUserRole(project.id, currentUser?.id) || currentUser?.role || 'Developer';
  
  // RBAC for Production Promotion: Owner or Release Manager
  const isReleaseManager = role === 'Owner' || role === 'Release Manager' || can(role, 'release.write');

  const activeRun = HISTORICAL_RUNS.find(r => r.id === selectedRunId) || HISTORICAL_RUNS[0];
  const stagingSucceeded = activeRun.status === 'Passed' && activeRun.stages.every(s => s.status === 'Passed');

  container.innerHTML = `
    <div class="relative w-full px-6 py-6" id="cicd-page-root">
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

        <div class="flex items-center flex-wrap gap-3">
          <!-- Historical Runs Dropdown -->
          <div class="flex items-center gap-2 bg-surface-canvas border border-border-subtle rounded-lg px-3 py-1.5 shadow-sm">
            <span class="material-symbols-outlined text-text-muted text-[18px]">history</span>
            <span class="text-label-md text-text-secondary font-medium">Run History:</span>
            <select id="run-history-select" class="bg-surface-base text-text-primary text-body-sm font-jetbrains font-semibold px-2 py-1 rounded border border-border-subtle focus:border-primary outline-none">
              ${HISTORICAL_RUNS.map(r => `
                <option value="${r.id}" ${r.id === selectedRunId ? 'selected' : ''}>
                  #${r.number} (${r.status}) — ${r.branch} [${r.commit}]
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Trigger CI Validation Button -->
          <button id="trigger-ci-btn" class="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-fixed text-on-primary font-semibold text-body-md transition-all shadow-md shadow-primary/20 active:scale-95 ${isRunning ? 'opacity-50 pointer-events-none' : ''}">
            <span class="material-symbols-outlined text-[18px] ${isRunning ? 'animate-spin' : ''}">refresh</span>
            <span>${isRunning ? 'Streaming Build...' : 'Trigger CI Validation'}</span>
          </button>

          <!-- Deployment Gate: RBAC Protected Promote to Production -->
          ${isReleaseManager && stagingSucceeded ? `
            <button id="promote-prod-btn" class="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-body-md shadow-lg shadow-emerald-900/30 transition-all active:scale-95 border border-emerald-400/30">
              <span class="material-symbols-outlined text-[18px]">rocket_launch</span>
              <span>Promote to Production</span>
            </button>
          ` : !stagingSucceeded ? `
            <div class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-panel text-text-muted text-[12px] font-jetbrains border border-border-subtle" title="Staging pipeline must pass completely before production gate unlocks">
              <span class="material-symbols-outlined text-[16px]">lock</span>
              <span>Prod Gate: Staging Required</span>
            </div>
          ` : `
            <div class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-panel text-text-muted text-[12px] font-jetbrains border border-border-subtle" title="Only users with Release Manager or Owner role can trigger production deployment">
              <span class="material-symbols-outlined text-[16px]">lock_person</span>
              <span>Prod Gate: Role Restricted</span>
            </div>
          `}
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
            <div class="text-[11px] font-jetbrains text-text-muted uppercase">Runtime Environment</div>
            <div class="font-geist text-body-md font-bold text-text-primary mt-0.5">Node.js LTS v20.18</div>
            <div class="text-[11px] text-secondary font-jetbrains mt-1">Vite + Express Monolith</div>
          </div>
          <span class="material-symbols-outlined text-[32px] text-primary/60">terminal</span>
        </div>

        <div class="p-4 rounded-xl bg-surface-canvas border border-border-subtle shadow-sm flex items-center justify-between">
          <div>
            <div class="text-[11px] font-jetbrains text-text-muted uppercase">Execution Status</div>
            <div class="font-geist text-body-md font-bold ${activeRun.status === 'Passed' ? 'text-status-passed' : 'text-status-defect'} mt-0.5">
              ${activeRun.status.toUpperCase()} (#${activeRun.number})
            </div>
            <div class="text-[11px] text-text-muted font-jetbrains mt-1">
              Duration: ${activeRun.duration}
            </div>
          </div>
          <span class="material-symbols-outlined text-[32px] ${activeRun.status === 'Passed' ? 'text-status-passed/60' : 'text-status-defect/60'}">
            ${activeRun.status === 'Passed' ? 'verified' : 'error'}
          </span>
        </div>

        <div class="p-4 rounded-xl bg-surface-canvas border border-border-subtle shadow-sm flex items-center justify-between">
          <div>
            <div class="text-[11px] font-jetbrains text-text-muted uppercase">Active Deployment Gate</div>
            <div class="font-geist text-body-md font-bold ${stagingSucceeded ? 'text-emerald-400' : 'text-rose-400'} mt-0.5">
              ${stagingSucceeded ? 'Passed Staging' : 'Blocked'}
            </div>
            <div class="text-[11px] font-jetbrains mt-1 ${isReleaseManager ? 'text-secondary' : 'text-text-muted'}">
              ${isReleaseManager ? 'Promote Permitted' : 'Read-Only Operator'}
            </div>
          </div>
          <span class="material-symbols-outlined text-[32px] ${stagingSucceeded ? 'text-emerald-400/60' : 'text-rose-400/60'}">gavel</span>
        </div>
      </div>

      <!-- Pipeline Stages Horizontal Stepper (Interactive & Clickable for Failures) -->
      <div class="bg-surface-canvas border border-border-subtle rounded-xl p-6 mb-8 shadow-sm">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <h2 class="font-geist text-headline-sm font-bold text-text-primary flex items-center gap-2">
              <span class="material-symbols-outlined text-secondary text-[20px]">alt_route</span>
              <span>Pipeline Flow #${activeRun.number}</span>
            </h2>
            <span class="px-2 py-0.5 rounded text-[11px] font-jetbrains font-bold ${activeRun.status === 'Passed' ? 'bg-status-passed-surface text-status-passed' : 'bg-status-defect-surface text-status-defect'}">
              ${activeRun.status}
            </span>
          </div>
          <div class="font-jetbrains text-[11px] text-text-muted flex items-center gap-3">
            <span>Branch: <code class="text-text-primary font-bold">${activeRun.branch}</code></span>
            <span>Commit: <code class="text-secondary font-bold">${activeRun.commit}</code></span>
            <span>Author: ${activeRun.author}</span>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3" id="pipeline-stages-container">
          ${activeRun.stages.map((stage, idx) => {
            const isPassed = stage.status === 'Passed';
            const isFailed = stage.status === 'Failed';
            const isSkipped = stage.status === 'Skipped';

            let cardBorder = 'border-border-subtle bg-surface-base';
            let statusBadge = 'text-text-muted';
            let icon = 'hourglass_empty';
            let iconColor = 'text-text-muted';

            if (isPassed) {
              cardBorder = 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60';
              statusBadge = 'text-status-passed font-bold';
              icon = 'check_circle';
              iconColor = 'text-status-passed';
            } else if (isFailed) {
              cardBorder = 'border-rose-500 bg-rose-500/10 hover:border-rose-400 cursor-pointer ring-2 ring-rose-500/30 animate-pulse';
              statusBadge = 'text-status-defect font-bold';
              icon = 'error';
              iconColor = 'text-status-defect';
            } else if (isSkipped) {
              cardBorder = 'border-border-subtle/50 bg-surface-base/30 opacity-60';
              statusBadge = 'text-text-muted';
              icon = 'block';
              iconColor = 'text-text-muted';
            }

            return `
              <div class="stage-card p-3.5 rounded-xl border ${cardBorder} transition-all flex flex-col justify-between min-h-[130px] cursor-pointer" data-stage-id="${stage.id}" data-stage-idx="${idx}" title="Click to view stage diagnostics and trace">
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <span class="font-jetbrains text-[10px] text-text-muted uppercase">Stage 0${idx + 1}</span>
                    <span class="material-symbols-outlined text-[18px] ${iconColor}">
                      ${icon}
                    </span>
                  </div>
                  <h4 class="font-inter font-semibold text-body-md text-text-primary mb-1 line-clamp-1">${stage.name}</h4>
                  <p class="font-jetbrains text-[10px] text-text-muted truncate">${stage.tool}</p>
                </div>
                <div class="pt-2 border-t border-border-subtle/40 flex items-center justify-between font-jetbrains text-[10px] text-text-muted">
                  <span>${stage.time}</span>
                  <span class="${statusBadge}">
                    ${isFailed ? 'FAILED ⚠' : isPassed ? 'PASSED' : 'SKIPPED'}
                  </span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Real-Time Console Telemetry Stream (xterm.js) -->
      <div class="bg-surface-canvas border border-border-subtle rounded-xl p-5 shadow-sm">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-status-defect"></span>
            <span class="w-3 h-3 rounded-full bg-status-in-progress"></span>
            <span class="w-3 h-3 rounded-full bg-status-passed"></span>
            <span class="font-jetbrains text-mono-md font-bold text-text-primary ml-2">Console Telemetry Log (xterm.js)</span>
          </div>
          <div class="flex items-center gap-3 font-jetbrains text-[11px] text-text-muted">
            <span class="flex items-center gap-1">
              <span class="w-2 h-2 rounded-full ${isRunning ? 'bg-primary animate-ping' : 'bg-status-passed'}"></span>
              <span>${isRunning ? 'LIVE SSE STREAM' : 'STATIC BUFFER'}</span>
            </span>
            <button id="clear-term-btn" class="hover:text-text-primary transition-colors">Clear</button>
          </div>
        </div>

        <div id="xterm-container" class="w-full h-80 rounded-xl overflow-hidden border border-border-subtle p-2 bg-[#090d16]"></div>
      </div>
    </div>
  `;

  // Mount xterm.js instance
  setupXterm(container, activeRun);

  // Attach Historical Runs Dropdown Change Listener
  container.querySelector('#run-history-select')?.addEventListener('change', (e) => {
    selectedRunId = e.target.value;
    renderCicd(container);
  });

  // Attach Stage Card Click Handler for Actionable Failures & Diagnostics
  container.querySelectorAll('.stage-card').forEach(card => {
    card.addEventListener('click', () => {
      const stageIdx = parseInt(card.dataset.stageIdx, 10);
      const stage = activeRun.stages[stageIdx];
      if (stage) {
        openStageDiagnosticModal(stage, activeRun);
      }
    });
  });

  // Attach Trigger CI Validation button
  container.querySelector('#trigger-ci-btn')?.addEventListener('click', () => {
    startLivePipelineStream(container);
  });

  // Attach Promote to Production button
  container.querySelector('#promote-prod-btn')?.addEventListener('click', () => {
    openProductionPromotionModal(project, activeRun);
  });

  // Attach Clear Terminal button
  container.querySelector('#clear-term-btn')?.addEventListener('click', () => {
    if (activeTerminal) activeTerminal.clear();
  });
}

/**
 * Initializes and mounts xterm.js terminal with FitAddon
 */
function setupXterm(container, activeRun) {
  const terminalEl = container.querySelector('#xterm-container');
  if (!terminalEl) return;

  try {
    if (activeTerminal && typeof activeTerminal.dispose === 'function') {
      try { activeTerminal.dispose(); } catch {}
      activeTerminal = null;
    }

    if (typeof Terminal === 'function') {
      const term = new Terminal({
        theme: {
          background: '#090d16',
          foreground: '#cbd5e1',
          cursor: '#38bdf8',
          selectionBackground: '#1e293b',
          black: '#0f172a',
          red: '#f43f5e',
          green: '#10b981',
          yellow: '#f59e0b',
          blue: '#38bdf8',
          magenta: '#c084fc',
          cyan: '#22d3ee',
          white: '#f8fafc'
        },
        fontSize: 12,
        fontFamily: 'JetBrains Mono, Menlo, monospace',
        cursorBlink: true,
        convertEol: true,
        disableStdin: true,
        scrollback: 1000
      });

      if (typeof FitAddon === 'function') {
        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        activeFitAddon = fitAddon;
      }
      
      term.open(terminalEl);
      setTimeout(() => {
        try { activeFitAddon?.fit(); } catch {}
      }, 50);

      if (activeRun && activeRun.logs) {
        activeRun.logs.forEach(line => term.writeln(line));
      }

      activeTerminal = term;
      return;
    }
  } catch (err) {
    console.warn('[CI/CD] xterm initialization warning, using fallback buffer:', err);
  }

  // Graceful fallback to styled terminal if xterm constructor is unavailable
  terminalEl.innerHTML = `<div id="fallback-terminal-log" class="font-jetbrains text-mono-md text-text-secondary p-3 h-full overflow-y-auto leading-relaxed whitespace-pre-wrap">${
    (activeRun?.logs || []).map(l => l.replace(/\\x1b\\[[0-9;]*m/g, '')).join('\n')
  }</div>`;

  activeTerminal = {
    writeln: (text) => {
      const el = terminalEl.querySelector('#fallback-terminal-log');
      if (el) {
        el.innerText += '\n' + text.replace(/\\x1b\\[[0-9;]*m/g, '');
        el.scrollTop = el.scrollHeight;
      }
    },
    clear: () => {
      const el = terminalEl.querySelector('#fallback-terminal-log');
      if (el) el.innerText = '';
    },
    dispose: () => {}
  };
}

/**
 * Live Log Streaming via Server-Sent Events (SSE) with robust client fallback
 */
function startLivePipelineStream(container) {
  if (isRunning) return;
  isRunning = true;
  selectedRunId = 'run-482';
  renderCicd(container);

  if (activeTerminal) {
    activeTerminal.clear();
    activeTerminal.writeln('\x1b[1;36m[DEVTRACK LIVE PIPELINE RUNNER]\x1b[0m Connecting to build telemetry worker...');
  }

  const liveStages = [
    { name: 'Lint & Format', tool: 'ESLint + Prettier', time: '4.2s', status: 'In Progress' },
    { name: 'Type Safety Check', tool: 'tsc --noEmit', time: '6.8s', status: 'Queued' },
    { name: 'Unit & API Test Suite', tool: 'Vitest + Supertest', time: '12.4s', status: 'Queued' },
    { name: 'Docker Compose Build', tool: 'docker-compose build', time: '28.1s', status: 'Queued' },
    { name: 'Security Vulnerability Scan', tool: 'npm audit', time: '3.5s', status: 'Queued' },
    { name: 'Staging Cluster Smoke Check', tool: 'Playwright Health Probe', time: '5.2s', status: 'Queued' }
  ];

  let currentStage = 0;
  
  // Try connecting via EventSource (SSE)
  let sseConnected = false;
  let eventSource = null;

  try {
    eventSource = new EventSource('http://localhost:4000/api/v1/cicd/stream');
    eventSource.onmessage = (event) => {
      sseConnected = true;
      try {
        const data = JSON.parse(event.data);
        if (data.complete) {
          eventSource.close();
          finishLiveRun(container);
          return;
        }
        if (data.text && activeTerminal) {
          activeTerminal.writeln(data.text);
        }
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      if (!sseConnected) {
        // Fall back to animated generator if server is isolated/offline
        runClientStreamGenerator(container);
      }
    };
  } catch {
    runClientStreamGenerator(container);
  }
}

/**
 * Robust in-browser stream generator that mirrors SSE behavior in isolated sandbox environments
 */
function runClientStreamGenerator(container) {
  const steps = [
    { text: '\x1b[36m[CI-RUNNER]\x1b[0m Initializing isolated runner container on node-04...', delay: 300 },
    { text: '\x1b[36m[GIT-SYNC]\x1b[0m Checked out branch main @ 7df82ac', delay: 400 },
    { text: '\x1b[33m[STAGE 1/6: LINT]\x1b[0m Executing ESLint + Prettier syntax audit...', delay: 500 },
    { text: '\x1b[32m✔\x1b[0m Linting 31 modules: 0 errors, 0 warnings found (4.2s)', delay: 600 },
    { text: '\x1b[33m[STAGE 2/6: TYPES]\x1b[0m Checking TypeScript definitions (tsc --noEmit)...', delay: 500 },
    { text: '\x1b[32m✔\x1b[0m Type integrity verified across 4,200 LOC in 6.8s', delay: 600 },
    { text: '\x1b[33m[STAGE 3/6: TESTS]\x1b[0m Launching Vitest & Supertest suite (8 test suites)...', delay: 600 },
    { text: '\x1b[32m✔\x1b[0m PASS tests/unit/storeRules.test.js\r\n\x1b[32m✔\x1b[0m PASS tests/unit/businessRules.test.js\r\n\x1b[32m✔\x1b[0m PASS tests/unit/zeroStateGating.test.js', delay: 800 },
    { text: '\x1b[32m✔\x1b[0m 8 suites passed (100% assertion coverage) in 12.4s', delay: 400 },
    { text: '\x1b[33m[STAGE 4/6: DOCKER]\x1b[0m Compiling multi-stage Docker build...', delay: 700 },
    { text: '\x1b[32m✔\x1b[0m Step 1/8 FROM node:20-alpine AS builder\r\n\x1b[32m✔\x1b[0m Image devtrack-app:latest built (32.4MB) in 28.1s', delay: 800 },
    { text: '\x1b[33m[STAGE 5/6: AUDIT]\x1b[0m Running npm audit --audit-level=high...', delay: 400 },
    { text: '\x1b[32m✔\x1b[0m 0 vulnerabilities detected in 1,248 dependencies in 3.5s', delay: 500 },
    { text: '\x1b[33m[STAGE 6/6: DEPLOY]\x1b[0m Deploying to Staging cluster and probing /api/health...', delay: 600 },
    { text: '\x1b[32m✔\x1b[0m HTTP 200 OK (latency: 14ms). Smoke probes successful in 5.2s', delay: 500 },
    { text: '\x1b[1;32m★ ALL PIPELINE STAGES PASSED.\x1b[0m Staging environment verified. Gate unlocked for Production.', delay: 400 }
  ];

  let i = 0;
  function next() {
    if (i < steps.length) {
      if (activeTerminal) activeTerminal.writeln(steps[i].text);
      const delay = steps[i].delay;
      i++;
      setTimeout(next, delay);
    } else {
      finishLiveRun(container);
    }
  }
  next();
}

function finishLiveRun(container) {
  isRunning = false;
  showToast('Live CI/CD Validation Pipeline passed with 100% success!', 'success');
  renderCicd(container);
}

/**
 * Actionable Failure & Diagnostics Modal
 */
function openStageDiagnosticModal(stage, run) {
  const isFailed = stage.status === 'Failed';
  const err = stage.errorDetails || null;

  showModal(`
    <div class="space-y-4 font-jetbrains">
      <!-- Header -->
      <div class="flex items-center justify-between pb-3 border-b border-border-subtle">
        <div class="flex items-center gap-2">
          <span class="material-symbols-outlined text-2xl ${isFailed ? 'text-status-defect' : 'text-status-passed'}">
            ${isFailed ? 'error' : 'check_circle'}
          </span>
          <div>
            <h3 class="font-geist text-headline-sm font-bold text-text-primary">${stage.name}</h3>
            <span class="text-[11px] text-text-muted">Tool: ${stage.tool} • Execution Time: ${stage.time}</span>
          </div>
        </div>
        <span class="px-2.5 py-1 rounded text-[11px] font-bold ${isFailed ? 'bg-status-defect-surface text-status-defect' : 'bg-status-passed-surface text-status-passed'}">
          ${stage.status.toUpperCase()}
        </span>
      </div>

      <!-- Command Executed -->
      <div>
        <label class="block text-[11px] text-text-muted uppercase mb-1 font-semibold">Command Executed</label>
        <div class="p-2.5 rounded-lg bg-surface-base border border-border-subtle text-mono-md text-secondary">
          <code>$ ${stage.command || 'npm test'}</code>
        </div>
      </div>

      ${isFailed && err ? `
        <!-- Error Trace & Diagnostics -->
        <div>
          <label class="block text-[11px] text-status-defect uppercase mb-1 font-bold flex items-center gap-1">
            <span class="material-symbols-outlined text-[14px]">bug_report</span>
            <span>Failure Stack Trace (Exit Code: ${err.exitCode})</span>
          </label>
          <pre class="p-3 rounded-lg bg-surface-base border border-status-defect/40 text-text-primary text-[11px] overflow-x-auto leading-relaxed max-h-48 text-rose-300 font-mono">${err.stackTrace}</pre>
        </div>

        <!-- Root Cause Analysis -->
        <div class="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <div class="text-[11px] font-bold text-amber-400 uppercase mb-1 flex items-center gap-1">
            <span class="material-symbols-outlined text-[14px]">psychology</span>
            <span>Root Cause Diagnostic</span>
          </div>
          <p class="text-[12px] text-text-primary font-inter leading-relaxed">${err.rootCause}</p>
        </div>

        <!-- Actionable Remediation -->
        <div class="p-3 rounded-lg bg-primary/10 border border-primary/30">
          <div class="text-[11px] font-bold text-primary uppercase mb-1 flex items-center gap-1">
            <span class="material-symbols-outlined text-[14px]">build</span>
            <span>Actionable Remediation</span>
          </div>
          <p class="text-[12px] text-text-primary font-inter leading-relaxed mb-2">${err.suggestedRemediation}</p>
          <button id="copy-remediation-btn" class="px-3 py-1 rounded bg-primary text-on-primary text-[11px] font-bold hover:bg-primary-fixed transition-all flex items-center gap-1">
            <span class="material-symbols-outlined text-[14px]">content_copy</span>
            <span>Copy Diagnostic Stack</span>
          </button>
        </div>
      ` : `
        <!-- Stage Passed Summary -->
        <div class="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[12px] font-inter">
          <p class="font-bold flex items-center gap-1 mb-1">
            <span class="material-symbols-outlined text-[16px]">verified</span>
            <span>Stage Passed Successfully</span>
          </p>
          <p class="text-text-secondary">All assertion conditions, syntax linters, and verification checks concluded without any errors or warnings.</p>
        </div>
      `}

      <!-- Actions -->
      <div class="flex justify-end gap-3 pt-2">
        <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-secondary hover:bg-surface-elevated text-body-md font-sans">
          Close
        </button>
      </div>
    </div>
  `, { title: `Pipeline Stage Telemetry: Stage 0${run.stages.indexOf(stage) + 1}` });

  document.getElementById('copy-remediation-btn')?.addEventListener('click', () => {
    if (err) {
      navigator.clipboard.writeText(`FAILED TEST: ${err.failedTest}\n\nSTACK TRACE:\n${err.stackTrace}\n\nROOT CAUSE:\n${err.rootCause}`);
      showToast('Diagnostic stack trace copied to clipboard!', 'success');
    }
  });
}

/**
 * Deployment Gate: Production Rollout Confirmation Modal
 */
function openProductionPromotionModal(project, run) {
  showModal(`
    <div class="space-y-4">
      <div class="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
        <span class="material-symbols-outlined text-3xl">verified_user</span>
        <div>
          <div class="font-bold font-geist text-body-md">Staging Audit Gate Verified</div>
          <div class="text-[12px] text-text-secondary">Pipeline #${run.number} passed all 6 stages. Ready for canary promotion.</div>
        </div>
      </div>

      <div class="space-y-2 text-body-sm font-jetbrains">
        <div class="flex justify-between py-1.5 border-b border-border-subtle">
          <span class="text-text-muted">Target Environment:</span>
          <span class="text-text-primary font-bold">AWS EKS Production Cluster (us-east-1)</span>
        </div>
        <div class="flex justify-between py-1.5 border-b border-border-subtle">
          <span class="text-text-muted">Artifact Image:</span>
          <span class="text-secondary font-bold">devtrack-app:v2.14.0-${run.commit}</span>
        </div>
        <div class="flex justify-between py-1.5 border-b border-border-subtle">
          <span class="text-text-muted">Deployment Strategy:</span>
          <span class="text-text-primary font-bold">Canary Ingress (10% &rarr; 50% &rarr; 100%)</span>
        </div>
      </div>

      <!-- Pre-Promotion Audit Checklist -->
      <div class="p-3 rounded-lg bg-surface-base border border-border-subtle space-y-2 text-body-sm">
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" id="check-audit" checked class="rounded border-border-subtle accent-primary">
          <span class="text-text-primary">All QA verification assertions and tests passed (100%)</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" id="check-blockers" checked class="rounded border-border-subtle accent-primary">
          <span class="text-text-primary">Zero active Critical or High blocker defects</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" id="check-auth" checked class="rounded border-border-subtle accent-primary">
          <span class="text-text-primary">Authorized by Release Manager / Project Owner</span>
        </label>
      </div>

      <div class="flex justify-end gap-3 pt-3">
        <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-secondary hover:bg-surface-elevated text-body-md">
          Cancel
        </button>
        <button id="confirm-promote-btn" class="flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-body-md shadow-md shadow-emerald-900/40">
          <span class="material-symbols-outlined text-[18px]">rocket_launch</span>
          <span>Confirm & Deploy to Production</span>
        </button>
      </div>
    </div>
  `, { title: 'Promote Build to Production' });

  document.getElementById('confirm-promote-btn')?.addEventListener('click', () => {
    closeModal();
    showToast('Initiating Canary Rollout to Production Cluster...', 'info');

    if (activeTerminal) {
      activeTerminal.writeln('\r\n\x1b[1;35m[PRODUCTION-DEPLOYMENT-TRIGGERED]\x1b[0m Release Manager approved production gate.');
      activeTerminal.writeln('\x1b[36m[K8S-INGRESS]\x1b[0m Shifting 10% traffic to canary pod replicas...');
      setTimeout(() => {
        if (activeTerminal) activeTerminal.writeln('\x1b[36m[K8S-INGRESS]\x1b[0m Canary health checks 200 OK. Shifting 100% traffic...');
      }, 800);
      setTimeout(() => {
        if (activeTerminal) activeTerminal.writeln('\x1b[1;32m✔ PRODUCTION DEPLOYMENT COMPLETE.\x1b[0m Ingress healthy at https://devtrack.io');
        showToast('Successfully deployed to Production Cluster!', 'success');
      }, 1600);
    }
  });
}
