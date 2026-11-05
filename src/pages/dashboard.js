import { store } from '../store.js';
import { statusChip, priorityChip, severityChip, formatDate, showToast, showModal, closeModal, escapeHtml } from '../ui.js';
import { openInvitationsInboxModal } from '../main.js';
import { computeFlowMetrics } from '../analytics.js';

// Default layout widget IDs
const DEFAULT_METRIC_ORDER = [
  'widget-metrics-reqs',
  'widget-metrics-sprint',
  'widget-metrics-qa',
  'widget-metrics-defects',
  'widget-metrics-release'
];

const DEFAULT_BOTTOM_ORDER = [
  'widget-burndown',
  'widget-defect-health'
];

export function renderDashboard(container) {
  const project = store.getActiveProject();
  if (!project) {
    container.innerHTML = `
      <div class="p-12 text-center">
        <h2 class="text-headline-lg font-geist font-bold mb-4">No Project Found</h2>
        <a href="#/projects" class="px-4 py-2 bg-primary text-on-primary rounded-lg font-medium">Go to Projects</a>
      </div>
    `;
    return;
  }

  const reqs = store.getRequirements(project.id);
  const tasks = store.getTasks(project.id);
  const testCases = store.getTestCases(project.id);
  const testRuns = store.getTestRunsByProject(project.id);
  const bugs = store.getBugs(project.id);
  const releases = store.getReleases(project.id);
  const sprints = store.getSprints(project.id);
  const activeSprint = sprints.find(s => s.status === 'Active') || sprints[0];

  // Requirements metrics
  const totalReqs = reqs.length;
  const completedReqs = reqs.filter(r => r.status === 'Implemented').length;
  const inProgReqs = reqs.filter(r => r.status === 'In Development').length;
  const draftReqs = reqs.filter(r => r.status === 'Draft').length;
  const mCount = reqs.filter(r => r.priority === 'Must').length;
  const sCount = reqs.filter(r => r.priority === 'Should').length;
  const cCount = reqs.filter(r => r.priority === 'Could').length;
  const wCount = reqs.filter(r => r.priority === "Won't").length;

  // QA metrics (Zero-state logic: when totalRuns === 0, hasQaData is false)
  const totalRuns = testRuns.length;
  const hasQaData = totalRuns > 0;
  const passedRuns = testRuns.filter(r => r.result === 'Passed').length;
  const failedRuns = testRuns.filter(r => r.result === 'Failed').length;
  const blockedRuns = testRuns.filter(r => r.result === 'Blocked').length;
  const skippedRuns = testRuns.filter(r => r.result === 'Skipped').length;
  const passRate = hasQaData ? Math.round((passedRuns / totalRuns) * 100) : 0;

  // Bug metrics (Zero-state logic: when bugs.length === 0, hasDefects is false)
  const hasDefects = bugs.length > 0;
  const openBugs = bugs.filter(b => !['Fixed', 'Verified', 'Closed'].includes(b.status));
  const critBugs = bugs.filter(b => b.severity === 'Critical' && !['Fixed', 'Verified', 'Closed'].includes(b.status)).length;
  const highBugs = bugs.filter(b => b.severity === 'High' && !['Fixed', 'Verified', 'Closed'].includes(b.status)).length;
  const medBugs = bugs.filter(b => b.severity === 'Medium' && !['Fixed', 'Verified', 'Closed'].includes(b.status)).length;

  // Active Sprint
  const sprintTasks = activeSprint ? tasks.filter(t => t.sprintId === activeSprint.id) : [];
  const sprintDoneTasks = sprintTasks.filter(t => t.status === 'Done');
  const sprintTotalPts = sprintTasks.reduce((acc, t) => acc + (t.estimate || 0), 0);
  const sprintDonePts = sprintDoneTasks.reduce((acc, t) => acc + (t.estimate || 0), 0);
  const sprintProgress = sprintTotalPts > 0 ? Math.round((sprintDonePts / sprintTotalPts) * 100) : 0;

  // Next Release
  const targetRelease = releases.find(r => r.status !== 'Released') || releases[0] || null;

  // Pending project invitations for current user
  const userEmail = store.currentUser?.email || '';
  const nowMs = Date.now();
  const pendingInvs = userEmail ? store.getUserInvitations(userEmail).filter(i => i.status === 'Pending' && new Date(i.expiresAt).getTime() > nowMs) : [];

  // Load user layout configuration
  const layoutStorageKey = `devtrack_dash_layout_${project.id}`;
  let layoutConfig = loadLayout(layoutStorageKey);

  // Overall E2E Chain Status
  const hasActiveTrace = totalReqs > 0 || tasks.length > 0 || totalRuns > 0;
  const hasTraceFailure = failedRuns > 0 || critBugs > 0;

  container.innerHTML = `
    <div class="relative w-full px-6 py-6 overflow-hidden" id="dashboard-cockpit-root">

      <!-- Ambient Background Glow -->
      <div class="absolute -top-32 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute top-1/2 right-0 w-80 h-80 bg-status-defect/5 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Action & Context Header -->
      <div class="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div class="flex items-center gap-2 font-jetbrains text-mono-md text-text-muted mb-1">
            <span>PROGRAM / ${escapeHtml(project.key)}-CORE</span>
            <span>/</span>
            <span class="text-secondary font-medium">LIFECYCLE COCKPIT</span>
            <span class="px-2 py-0.5 rounded-full ${hasTraceFailure ? 'bg-status-defect-surface text-status-defect' : (hasQaData ? 'bg-status-passed-surface text-status-passed' : 'bg-surface-elevated text-text-muted')} font-semibold ml-2">
              ${hasTraceFailure ? 'ACTIVE DEFECT IN CHAIN' : (hasQaData ? 'AUDIT VERIFIED' : 'AWAITING QA EVIDENCE')}
            </span>
          </div>
          <h1 class="font-geist text-headline-xl text-text-primary tracking-tight font-bold">Executive Release & Traceability Cockpit</h1>
        </div>

        <!-- Cockpit Header Toolbar -->
        <div class="flex items-center flex-wrap gap-2.5">
          <!-- Flow & DORA Analytics Suite -->
          <button id="open-flow-analytics-btn" class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 font-inter text-label-md transition-all shadow-sm active:scale-95 cursor-pointer" title="View DORA 4 Metrics, Flow Distribution & Velocity Analytics">
            <span class="material-symbols-outlined text-[18px]">monitoring</span>
            <span>Flow & DORA Analytics</span>
          </button>
          <!-- Customize Layout Toggle -->
          <button id="dash-customize-layout-btn" class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-primary font-inter text-label-md transition-all border border-border-subtle shadow-sm active:scale-95 cursor-pointer" title="Reorder or resize dashboard widgets">
            <span class="material-symbols-outlined text-[18px] text-secondary">dashboard_customize</span>
            <span id="dash-customize-btn-text">Customize Layout</span>
          </button>
        </div>
      </div>

      <!-- Layout Customizer Edit Banner (Hidden by default) -->
      <div id="dash-edit-banner" class="hidden relative z-10 mb-6 p-3.5 rounded-xl bg-primary/10 border border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-slide-in">
        <div class="flex items-center gap-2.5 text-text-primary text-body-sm">
          <span class="material-symbols-outlined text-primary text-[20px]">drag_indicator</span>
          <span><strong>Customizing Layout:</strong> Drag cards to reorder. Click ⤢ to expand full width. Changes are saved automatically.</span>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button id="dash-reset-layout-btn" class="px-3 py-1.5 rounded-lg bg-surface-panel text-text-secondary hover:text-text-primary text-label-sm border border-border-subtle cursor-pointer">
            Reset Default
          </button>
          <button id="dash-done-layout-btn" class="px-3.5 py-1.5 rounded-lg bg-primary text-on-primary font-semibold text-label-sm hover:brightness-110 shadow-sm cursor-pointer">
            Done
          </button>
        </div>
      </div>

      <!-- Pending Invitations Banner -->
      ${pendingInvs.length > 0 ? `
        <div class="relative z-10 mb-6 p-4 rounded-xl bg-surface-canvas border border-secondary/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-secondary/5 animate-scale-in">
          <div class="flex items-center gap-3.5">
            <div class="w-10 h-10 rounded-xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0 border border-secondary/30">
              <span class="material-symbols-outlined text-[24px]">mark_email_unread</span>
            </div>
            <div>
              <div class="font-geist text-body-md font-bold text-text-primary flex items-center gap-2">
                <span>You have ${pendingInvs.length} pending project workspace invitation${pendingInvs.length > 1 ? 's' : ''}</span>
                <span class="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
              </div>
              <div class="text-[12px] text-text-muted mt-0.5">
                Invited to join <strong class="text-text-primary">${escapeHtml(pendingInvs[0].projectName)}</strong> (${escapeHtml(pendingInvs[0].role)}) by ${escapeHtml(pendingInvs[0].inviterName)}${pendingInvs.length > 1 ? ` plus ${pendingInvs.length - 1} other invitation(s)` : ''}.
              </div>
            </div>
          </div>
          <button id="dash-view-invites-btn" class="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-on-secondary font-bold text-body-sm hover:brightness-110 shadow-md shadow-secondary/20 transition-all self-end sm:self-center shrink-0 cursor-pointer">
            <span class="material-symbols-outlined text-[18px]">mail</span>
            <span>Review & Respond</span>
          </button>
        </div>
      ` : ''}

      <!-- Top Summary Metrics Grid (Draggable Cards) -->
      <div id="dash-metrics-grid" class="relative z-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
        ${renderMetricCards({
          project, totalReqs, completedReqs, inProgReqs, draftReqs, mCount, sCount, cCount, wCount,
          activeSprint, sprintTasks, sprintProgress, sprintDonePts, sprintTotalPts,
          totalRuns, hasQaData, passRate, passedRuns, failedRuns, blockedRuns, skippedRuns,
          hasDefects, openBugs, critBugs, highBugs, medBugs, bugs,
          targetRelease
        }, layoutConfig.metricsOrder)}
      </div>

      <!-- 1. Interactive Directed Acyclic Graph (DAG) Traceability Cockpit -->
      <div id="widget-dag" class="relative z-10 bg-surface-canvas border border-border-subtle rounded-xl p-6 mb-8 shadow-md transition-all">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary-container/20 text-primary flex items-center justify-center">
              <span class="material-symbols-outlined text-[22px]">account_tree</span>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="font-geist text-headline-md font-bold text-text-primary">Interactive Traceability DAG</h2>
                <span class="px-2 py-0.5 rounded-full bg-secondary/15 text-secondary font-jetbrains text-[10px] font-semibold">DIRECTED ACYCLIC GRAPH</span>
              </div>
              <p class="text-body-sm text-text-muted">Interactive audit lineage linking: Requirements ➔ Tasks ➔ QA Test Runs ➔ Defects ➔ Releases</p>
            </div>
          </div>

          <!-- DAG Controls & Legend Toolbar -->
          <div class="flex items-center flex-wrap gap-2">
            <!-- Filter Mode Selector -->
            <div class="flex items-center bg-surface-base p-1 rounded-lg border border-border-subtle font-jetbrains text-mono-md">
              <button id="dag-filter-all" class="px-2.5 py-1 rounded text-text-primary bg-surface-panel font-semibold shadow-xs text-[11px] cursor-pointer">All Nodes</button>
              <button id="dag-filter-defects" class="px-2.5 py-1 rounded text-text-muted hover:text-status-defect text-[11px] cursor-pointer">Defect Paths</button>
              <button id="dag-filter-passed" class="px-2.5 py-1 rounded text-text-muted hover:text-status-passed text-[11px] cursor-pointer">Verified Only</button>
            </div>

            <!-- Zoom & Pan Controls -->
            <div class="flex items-center bg-surface-base p-1 rounded-lg border border-border-subtle">
              <button id="dag-zoom-in" class="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-surface-panel cursor-pointer" title="Zoom In (+)">
                <span class="material-symbols-outlined text-[18px]">zoom_in</span>
              </button>
              <button id="dag-zoom-out" class="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-surface-panel cursor-pointer" title="Zoom Out (-)">
                <span class="material-symbols-outlined text-[18px]">zoom_out</span>
              </button>
              <button id="dag-fit-view" class="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-surface-panel cursor-pointer" title="Reset View">
                <span class="material-symbols-outlined text-[18px]">center_focus_strong</span>
              </button>
              <button id="dag-fullscreen-btn" class="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-surface-panel cursor-pointer" title="Toggle Fullscreen">
                <span class="material-symbols-outlined text-[18px]">fullscreen</span>
              </button>
            </div>

            <!-- Trace Chain Status Indicator -->
            <div class="flex items-center gap-2 bg-surface-base px-3 py-1.5 rounded-lg border border-border-subtle">
              <span class="w-2.5 h-2.5 rounded-full ${hasTraceFailure ? 'bg-status-defect animate-pulse' : (hasQaData ? 'bg-status-passed' : 'bg-text-muted')}"></span>
              <span class="font-jetbrains text-mono-md text-text-secondary">Trace Chain:</span>
              <span class="font-jetbrains text-mono-md font-semibold ${hasTraceFailure ? 'text-status-defect' : (hasQaData ? 'text-status-passed' : 'text-text-muted')}">
                ${hasTraceFailure ? 'ACTIVE DEFECT IN CHAIN' : (hasQaData ? 'ALL ASSERTIONS PASSED' : 'NO QA DATA')}
              </span>
            </div>
          </div>
        </div>

        <!-- DAG Canvas Viewport -->
        <div id="dag-canvas-container" class="relative w-full h-[460px] bg-surface-base/80 rounded-xl border border-border-subtle overflow-hidden select-none cursor-grab active:cursor-grabbing">
          <!-- Canvas Overlay Grid Background -->
          <div class="absolute inset-0 opacity-20 pointer-events-none" style="background-image: radial-gradient(circle, currentColor 1px, transparent 1px); background-size: 24px 24px;"></div>

          <!-- Dynamic SVG Edges Layer -->
          <svg id="dag-svg-layer" class="absolute inset-0 w-full h-full pointer-events-none" style="transform-origin: 0 0;">
            <defs>
              <marker id="dag-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 9 5 L 0 9 z" fill="rgba(192, 193, 255, 0.6)" />
              </marker>
              <marker id="dag-arrow-defect" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#ef4444" />
              </marker>
              <marker id="dag-arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#818cf8" />
              </marker>
            </defs>
            <g id="dag-edges-group"></g>
          </svg>

          <!-- Dynamic DOM Nodes Layer -->
          <div id="dag-nodes-layer" class="absolute inset-0 w-full h-full pointer-events-auto" style="transform-origin: 0 0;"></div>

          <!-- Lineage Inspector Popover (Bottom Corner) -->
          <div id="dag-inspector-panel" class="hidden absolute bottom-3 right-3 max-w-sm bg-surface-canvas/95 backdrop-blur-md border border-border-strong rounded-xl p-4 shadow-2xl z-30 animate-slide-up">
            <div class="flex items-center justify-between gap-2 mb-2">
              <span id="dag-insp-badge" class="font-jetbrains text-[10px] font-bold px-2 py-0.5 rounded bg-primary-container/20 text-primary uppercase">ENTITY</span>
              <button id="dag-insp-close" class="text-text-muted hover:text-text-primary material-symbols-outlined text-[16px] cursor-pointer">close</button>
            </div>
            <div id="dag-insp-title" class="font-geist text-body-md font-bold text-text-primary line-clamp-2 mb-1">Node Title</div>
            <div id="dag-insp-desc" class="text-text-secondary text-[12px] line-clamp-3 mb-3">Node description and audit evidence.</div>
            <div class="flex items-center justify-between pt-2 border-t border-border-subtle">
              <span id="dag-insp-meta" class="font-jetbrains text-[11px] text-text-muted">Type / Status</span>
              <button id="dag-insp-jump-btn" class="flex items-center gap-1 text-primary hover:underline font-jetbrains text-[11px] font-semibold cursor-pointer">
                <span>View Details</span>
                <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
          </div>

          <!-- DAG Hint Overlay -->
          <div class="absolute bottom-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded bg-surface-canvas/80 backdrop-blur-xs border border-border-subtle/60 text-[11px] font-jetbrains text-text-muted pointer-events-none">
            <span class="material-symbols-outlined text-[14px]">touch_app</span>
            <span>Click any node to trace upstream specs & downstream artifacts • Drag to pan</span>
          </div>
        </div>
      </div>

      <!-- Middle Split: Customizable Burndown & Defect Panels -->
      <div id="dash-bottom-grid" class="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        <!-- Sprint Burndown & Velocity Widget (7 Cols) -->
        <div id="widget-burndown" class="lg:col-span-7 bg-surface-canvas border border-border-subtle rounded-xl p-6 flex flex-col justify-between shadow-md transition-all">
          <div>
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="font-geist text-headline-sm font-bold text-text-primary">${activeSprint ? escapeHtml(activeSprint.name) : 'Sprint 1'} Burndown & Velocity</h3>
                  <span class="font-jetbrains text-mono-md px-2 py-0.5 rounded bg-surface-panel text-secondary font-semibold">${sprintTotalPts} Story Pts</span>
                </div>
                <p class="text-body-sm text-text-muted">Real-time ideal guideline vs actual completed velocity</p>
              </div>
              <div class="flex items-center gap-4 font-jetbrains text-[11px]">
                <div class="flex items-center gap-1.5">
                  <span class="w-3 h-0.5 bg-text-muted rounded-full"></span>
                  <span class="text-text-muted">Ideal Guide</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="w-3 h-1 bg-primary rounded-full"></span>
                  <span class="text-primary font-semibold">Actual Velocity</span>
                </div>
              </div>
            </div>

            <!-- Inline SVG Burndown Chart -->
            <div class="w-full h-56 bg-surface-base/60 rounded-xl p-4 relative mb-4 border border-border-subtle">
              <svg class="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 500 180">
                <defs>
                  <linearGradient id="velocityFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" class="text-primary" stop-color="currentColor" stop-opacity="0.3"></stop>
                    <stop offset="100%" class="text-primary" stop-color="currentColor" stop-opacity="0.0"></stop>
                  </linearGradient>
                </defs>
                <line class="text-border-strong" stroke="currentColor" stroke-width="1" x1="40" x2="480" y1="20" y2="20"></line>
                <line class="text-border-strong" stroke="currentColor" stroke-width="1" x1="40" x2="480" y1="65" y2="65"></line>
                <line class="text-border-strong" stroke="currentColor" stroke-width="1" x1="40" x2="480" y1="110" y2="110"></line>
                <line class="text-border-strong" stroke="currentColor" stroke-width="1" x1="40" x2="480" y1="155" y2="155"></line>

                <!-- Ideal Burndown Line -->
                <line class="text-text-muted" stroke="currentColor" stroke-dasharray="4 4" stroke-width="2" x1="40" x2="480" y1="20" y2="155"></line>

                <!-- Actual Velocity Area & Line -->
                <polygon fill="url(#velocityFill)" points="40,20 128,45 216,75 304,115 304,155 40,155"></polygon>
                <polyline class="text-primary" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" points="40,20 128,45 216,75 304,115"></polyline>

                <circle cx="40" cy="20" r="4" class="text-primary" fill="currentColor"></circle>
                <circle cx="128" cy="45" r="4" class="text-primary" fill="currentColor"></circle>
                <circle cx="216" cy="75" r="4" class="text-primary" fill="currentColor"></circle>
                <circle cx="304" cy="115" r="5" class="text-secondary" fill="currentColor" style="stroke: rgb(var(--c-surface-base))" stroke-width="2"></circle>
              </svg>
            </div>
          </div>

          <div class="flex items-center justify-between text-body-sm text-text-muted pt-2 border-t border-border-subtle">
            <span>Sprint Goal: <strong class="text-text-primary">${activeSprint ? escapeHtml(activeSprint.goal) : 'Core Infrastructure'}</strong></span>
            <a href="#/sprints" class="text-primary hover:underline font-medium flex items-center gap-1">
              <span>View Sprint Board</span>
              <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
            </a>
          </div>
        </div>

        <!-- Defect Severity & QA Health Gauges (5 Cols) -->
        <div id="widget-defect-health" class="lg:col-span-5 bg-surface-canvas border border-border-subtle rounded-xl p-6 flex flex-col justify-between shadow-md transition-all">
          <div>
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-geist text-headline-sm font-bold text-text-primary">Defect Health & Severity</h3>
              <a href="#/bugs" class="text-label-sm text-secondary hover:underline">All Defects (${bugs.length})</a>
            </div>

            <!-- Defect List with Zero-State -->
            <div class="space-y-3 mb-4">
              ${!hasDefects ? `
                <div class="p-6 text-center text-text-muted text-body-sm bg-surface-base/40 rounded-lg border border-border-subtle/50">
                  <span class="material-symbols-outlined text-[32px] text-text-muted mb-1 block">verified_user</span>
                  <div class="font-medium text-text-primary mb-0.5">Zero Active Defects</div>
                  No active defects reported for this project.
                </div>
              ` : bugs.slice(0, 3).map(bug => `
                <div class="p-3 rounded-lg bg-surface-panel border border-border-subtle flex items-start justify-between gap-3 hover:border-border-strong transition-all">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      ${severityChip(bug.severity)}
                      <span class="font-jetbrains text-mono-md text-text-muted">${escapeHtml(bug.id)}</span>
                      ${statusChip(bug.status)}
                    </div>
                    <h4 class="font-inter text-body-md text-text-primary font-medium truncate">${escapeHtml(bug.title)}</h4>
                  </div>
                  <button onclick="window.location.hash='#/bugs'" class="text-text-muted hover:text-text-primary material-symbols-outlined text-[18px]">open_in_new</button>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="p-3 bg-surface-base/80 rounded-lg border border-border-subtle flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined ${hasQaData ? (failedRuns > 0 ? 'text-status-defect' : 'text-status-passed') : 'text-text-muted'} text-[20px]">
                ${hasQaData ? (failedRuns > 0 ? 'warning' : 'check_circle') : 'help'}
              </span>
              <span class="text-body-sm text-text-secondary">Release Gate Readiness</span>
            </div>
            <span class="font-jetbrains text-mono-md font-bold ${failedRuns > 0 ? 'text-status-defect' : (hasQaData ? 'text-status-passed' : 'text-text-muted')}">
              ${failedRuns > 0 ? 'NEEDS RETEST' : (hasQaData ? 'PASSED' : 'NO QA EVIDENCE')}
            </span>
          </div>
        </div>
      </div>
    </div>
  `;

  

  container.querySelector('#open-flow-analytics-btn')?.addEventListener('click', () => {
    openFlowAnalyticsModal(project.id);
  });

  container.querySelector('#dash-view-invites-btn')?.addEventListener('click', () => {
    openInvitationsInboxModal(() => renderDashboard(container));
  });

  // Initialize Interactive DAG
  initInteractiveDag(container, project, { reqs, tasks, testCases, testRuns, bugs, releases });

  // Initialize Customizable Drag & Drop Layout
  initCustomizableLayout(container, layoutStorageKey);
}

// -------------------------------------------------------------
// METRIC CARDS RENDERER (Supports Zero-State Logic & Reordering)
// -------------------------------------------------------------
function renderMetricCards(data, order = DEFAULT_METRIC_ORDER) {
  const {
    project, totalReqs, completedReqs, inProgReqs, draftReqs, mCount, sCount, cCount, wCount,
    activeSprint, sprintTasks, sprintProgress, sprintDonePts, sprintTotalPts,
    totalRuns, hasQaData, passRate, passedRuns, failedRuns, blockedRuns, skippedRuns,
    hasDefects, openBugs, critBugs, highBugs, medBugs, bugs,
    targetRelease
  } = data;

  const cards = {
    'widget-metrics-reqs': `
      <div id="widget-metrics-reqs" class="dash-metric-card bg-surface-canvas border border-border-subtle rounded-xl p-5 flex flex-col justify-between shadow-sm hover:border-border-strong transition-all relative group cursor-grab">
        <div class="dash-card-drag-handle absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-text-primary p-1">
          <span class="material-symbols-outlined text-[16px]">drag_indicator</span>
        </div>
        <div>
          <div class="flex items-center justify-between text-text-muted mb-2">
            <span class="text-label-sm font-semibold uppercase tracking-wider">Total Requirements</span>
            <span class="material-symbols-outlined text-[20px] text-primary">rule</span>
          </div>
          <div class="flex items-baseline gap-2 mb-2">
            <span class="font-geist text-headline-xl font-bold text-text-primary">${totalReqs}</span>
            <span class="font-jetbrains text-mono-md text-text-muted">${completedReqs} Implemented</span>
          </div>
          <div class="w-full bg-surface-base h-2 rounded-full overflow-hidden flex mb-4">
            ${totalReqs > 0 ? `
              <div class="bg-status-passed h-full" style="width: ${(completedReqs / totalReqs) * 100}%" title="Implemented"></div>
              <div class="bg-status-in-progress h-full" style="width: ${(inProgReqs / totalReqs) * 100}%" title="In Progress"></div>
              <div class="bg-text-muted h-full" style="width: ${(draftReqs / totalReqs) * 100}%" title="Draft"></div>
            ` : `
              <div class="bg-border-subtle/50 h-full w-full"></div>
            `}
          </div>
        </div>
        <div class="bg-surface-base/80 rounded-lg p-2.5 border border-border-subtle">
          <div class="text-[10px] font-jetbrains text-text-secondary uppercase mb-1.5 font-medium">MoSCoW Split</div>
          <div class="grid grid-cols-4 gap-1.5 text-center font-jetbrains text-mono-md">
            <span class="bg-surface-panel py-1 rounded text-status-defect font-semibold" title="Must">M:${mCount}</span>
            <span class="bg-surface-panel py-1 rounded text-status-in-progress font-semibold" title="Should">S:${sCount}</span>
            <span class="bg-surface-panel py-1 rounded text-secondary font-semibold" title="Could">C:${cCount}</span>
            <span class="bg-surface-panel py-1 rounded text-text-muted" title="Won't">W:${wCount}</span>
          </div>
        </div>
      </div>
    `,

    'widget-metrics-sprint': `
      <div id="widget-metrics-sprint" class="dash-metric-card bg-surface-canvas border border-border-subtle rounded-xl p-5 flex flex-col justify-between shadow-sm hover:border-border-strong transition-all relative group cursor-grab">
        <div class="dash-card-drag-handle absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-text-primary p-1">
          <span class="material-symbols-outlined text-[16px]">drag_indicator</span>
        </div>
        <div>
          <div class="flex items-center justify-between text-text-muted mb-2">
            <span class="text-label-sm font-semibold uppercase tracking-wider">Active Sprint</span>
            <span class="px-2 py-0.5 rounded-full bg-status-in-progress-surface text-status-in-progress font-jetbrains text-[10px] font-semibold">ACTIVE</span>
          </div>
          <div class="font-geist text-headline-sm font-bold text-text-primary truncate" title="${activeSprint ? escapeHtml(activeSprint.name) : 'Sprint 1'}">
            ${activeSprint ? escapeHtml(activeSprint.name) : 'Sprint 1'}
          </div>
          <p class="font-jetbrains text-mono-md text-text-muted mt-1 mb-2">${sprintTasks.length} tasks • ${sprintProgress}% Velocity</p>
          <div class="w-full bg-surface-base h-2 rounded-full overflow-hidden mb-2">
            <div class="bg-secondary h-full rounded-full transition-all duration-500" style="width: ${sprintProgress}%"></div>
          </div>
        </div>
        <div class="flex items-center justify-between bg-surface-base/80 rounded-lg px-3 py-2 border border-border-subtle font-jetbrains text-mono-md">
          <span class="text-text-muted">Story Points</span>
          <span class="text-text-primary font-semibold">${sprintDonePts} <span class="text-text-muted font-normal">/ ${sprintTotalPts} pts</span></span>
        </div>
      </div>
    `,

    // QA VERIFICATION (ZERO-STATE LOGIC ENFORCED)
    'widget-metrics-qa': `
      <div id="widget-metrics-qa" class="dash-metric-card bg-surface-canvas border border-border-subtle rounded-xl p-5 flex flex-col justify-between shadow-sm hover:border-border-strong transition-all relative group cursor-grab">
        <div class="dash-card-drag-handle absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-text-primary p-1">
          <span class="material-symbols-outlined text-[16px]">drag_indicator</span>
        </div>
        <div>
          <div class="flex items-center justify-between text-text-muted mb-2">
            <span class="text-label-sm font-semibold uppercase tracking-wider">QA Verification</span>
            <span class="material-symbols-outlined text-[20px] ${hasQaData ? 'text-status-passed' : 'text-text-muted'}">verified</span>
          </div>
          <div class="flex items-baseline gap-2 mb-2">
            ${hasQaData ? `
              <span class="font-geist text-headline-xl font-bold ${passRate >= 80 ? 'text-status-passed' : 'text-status-in-progress'}">${passRate}%</span>
              <span class="font-jetbrains text-mono-md text-text-muted">${totalRuns} Executed</span>
            ` : `
              <span class="font-geist text-headline-lg font-bold text-text-muted">No Data</span>
              <span class="font-jetbrains text-mono-md text-text-muted">0 Runs</span>
            `}
          </div>
          <div class="w-full bg-surface-base h-2 rounded-full overflow-hidden flex mb-4">
            ${hasQaData ? `
              <div class="bg-status-passed h-full" style="width: ${(passedRuns / totalRuns) * 100}%" title="Passed"></div>
              <div class="bg-status-defect h-full" style="width: ${(failedRuns / totalRuns) * 100}%" title="Failed"></div>
              <div class="bg-status-in-progress h-full" style="width: ${(blockedRuns / totalRuns) * 100}%" title="Blocked"></div>
              <div class="bg-text-muted h-full" style="width: ${(skippedRuns / totalRuns) * 100}%" title="Skipped"></div>
            ` : `
              <div class="bg-border-subtle/50 h-full w-full" title="No test runs recorded"></div>
            `}
          </div>
        </div>
        <div class="flex items-center justify-between font-jetbrains text-[11px] bg-surface-base/80 rounded-lg px-2.5 py-1.5 border border-border-subtle">
          ${hasQaData ? `
            <span class="text-status-passed font-semibold">${passedRuns} Pass</span>
            <span class="text-status-defect font-semibold">${failedRuns} Fail</span>
            <span class="text-status-in-progress font-semibold">${blockedRuns} Blk</span>
            <span class="text-text-muted">${skippedRuns} Skp</span>
          ` : `
            <span class="text-text-muted italic w-full text-center">No QA test assertions recorded</span>
          `}
        </div>
      </div>
    `,

    // DEFECT HEALTH & SEVERITY (ZERO-STATE LOGIC ENFORCED)
    'widget-metrics-defects': `
      <div id="widget-metrics-defects" class="dash-metric-card bg-surface-canvas border border-border-subtle rounded-xl p-5 flex flex-col justify-between shadow-sm hover:border-border-strong transition-all relative group cursor-grab">
        <div class="dash-card-drag-handle absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-text-primary p-1">
          <span class="material-symbols-outlined text-[16px]">drag_indicator</span>
        </div>
        <div>
          <div class="flex items-center justify-between text-text-muted mb-2">
            <span class="text-label-sm font-semibold uppercase tracking-wider">Active Defects</span>
            <span class="material-symbols-outlined text-[20px] ${openBugs.length > 0 ? 'text-status-defect' : 'text-text-muted'}">pest_control</span>
          </div>
          <div class="flex items-baseline gap-2 mb-2">
            <span class="font-geist text-headline-xl font-bold ${openBugs.length > 0 ? 'text-status-defect' : 'text-text-muted'}">${openBugs.length}</span>
            ${openBugs.length > 0 ? (critBugs > 0 ? `<span class="font-jetbrains text-mono-md bg-status-defect-surface text-status-defect px-1.5 py-0.5 rounded font-semibold">${critBugs} Critical</span>` : `<span class="font-jetbrains text-mono-md text-status-passed">0 Critical</span>`) : `<span class="font-jetbrains text-mono-md text-text-muted">No Open Defects</span>`}
          </div>
          <p class="text-body-sm text-text-muted mb-3">${openBugs.length > 0 ? 'Triage & QA verification in progress' : 'Zero active defect reports'}</p>
        </div>
        <div class="grid grid-cols-3 gap-1.5 text-center font-jetbrains text-[11px]">
          ${hasDefects ? `
            <div class="bg-status-defect/15 text-status-defect py-1 rounded font-semibold">${critBugs} Crit</div>
            <div class="bg-status-in-progress/15 text-status-in-progress py-1 rounded font-semibold">${highBugs} High</div>
            <div class="bg-surface-panel text-text-secondary py-1 rounded">${medBugs} Med</div>
          ` : `
            <div class="col-span-3 bg-surface-panel/60 text-text-muted py-1 rounded italic">Zero defect telemetry</div>
          `}
        </div>
      </div>
    `,

    'widget-metrics-release': `
      <div id="widget-metrics-release" class="dash-metric-card bg-surface-canvas border border-border-subtle rounded-xl p-5 flex flex-col justify-between shadow-sm hover:border-border-strong transition-all cursor-pointer relative group cursor-grab" onclick="window.location.hash='#/releases'">
        <div class="dash-card-drag-handle absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-text-primary p-1">
          <span class="material-symbols-outlined text-[16px]">drag_indicator</span>
        </div>
        <div>
          <div class="flex items-center justify-between text-text-muted mb-2">
            <span class="text-label-sm font-semibold uppercase tracking-wider">Target Release</span>
            <span class="material-symbols-outlined text-[20px] text-status-release">rocket_launch</span>
          </div>
          <div class="font-geist text-headline-sm font-bold text-text-primary truncate">${targetRelease ? escapeHtml(targetRelease.name) : 'No Active Release'}</div>
          <div class="flex items-center gap-1.5 font-jetbrains text-mono-md text-text-muted mt-1 mb-2">
            <span class="material-symbols-outlined text-[15px]">event</span>
            <span>${targetRelease ? `Target: ${formatDate(targetRelease.targetDate)}` : 'Milestone not scheduled'}</span>
          </div>
        </div>
        <div class="bg-surface-base/80 rounded-lg p-2.5 flex items-center justify-between font-jetbrains text-mono-md border border-border-subtle">
          <span class="text-text-secondary">${targetRelease?.taskIds ? targetRelease.taskIds.length : 0} Linked Tasks</span>
          <span class="px-2 py-0.5 rounded ${failedRuns > 0 ? 'bg-status-defect-surface text-status-defect' : (hasQaData ? 'bg-status-passed-surface text-status-passed' : 'bg-surface-elevated text-text-muted')} font-semibold text-[10px]">
            ${failedRuns > 0 ? `${failedRuns} QA ISSUES` : (hasQaData ? 'RELEASE READY' : 'NO QA EVIDENCE')}
          </span>
        </div>
      </div>
    `
  };

  // Reorder based on saved layout
  const orderedKeys = order.filter(k => cards[k]);
  DEFAULT_METRIC_ORDER.forEach(k => { if (!orderedKeys.includes(k)) orderedKeys.push(k); });
  return orderedKeys.map(k => cards[k]).join('');
}


// -------------------------------------------------------------
// INTERACTIVE DIRECTED ACYCLIC GRAPH (DAG) CONTROLLER
// -------------------------------------------------------------
function initInteractiveDag(container, project, data) {
  const { reqs, tasks, testCases, testRuns, bugs, releases } = data;

  const viewport = container.querySelector('#dag-canvas-container');
  const nodesLayer = container.querySelector('#dag-nodes-layer');
  const edgesGroup = container.querySelector('#dag-edges-group');
  const svgLayer = container.querySelector('#dag-svg-layer');

  const inspectorPanel = container.querySelector('#dag-inspector-panel');
  const inspBadge = container.querySelector('#dag-insp-badge');
  const inspTitle = container.querySelector('#dag-insp-title');
  const inspDesc = container.querySelector('#dag-insp-desc');
  const inspMeta = container.querySelector('#dag-insp-meta');
  const inspJumpBtn = container.querySelector('#dag-insp-jump-btn');
  const inspCloseBtn = container.querySelector('#dag-insp-close');

  if (!viewport || !nodesLayer || !edgesGroup) return;

  // Build DAG model
  const tiers = [
    { title: 'Requirements', type: 'req', items: reqs },
    { title: 'Sprint Tasks', type: 'task', items: tasks },
    { title: 'QA Verification', type: 'test', items: testRuns.length ? testRuns : testCases },
    { title: 'Defects / Bugs', type: 'bug', items: bugs },
    { title: 'Release Cut', type: 'release', items: releases }
  ];

  // Graph state
  let scale = 1.0;
  let panX = 40;
  let panY = 40;
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let selectedNodeId = null;
  let activeFilter = 'all'; // 'all', 'defects', 'passed'

  // Pre-calculate node positions
  const nodePositions = new Map();
  const nodeElements = new Map();
  const edges = [];

  const colWidth = 220;
  const colSpacing = 280;
  const rowHeight = 84;
  const rowSpacing = 104;

  tiers.forEach((tier, colIdx) => {
    tier.items.forEach((item, rowIdx) => {
      const nodeId = `${tier.type}-${item.id}`;
      const x = colIdx * colSpacing;
      const y = rowIdx * rowSpacing;
      nodePositions.set(nodeId, { x, y, width: colWidth, height: rowHeight, item, tier: tier.type });
    });
  });

  // Calculate directed edges
  tasks.forEach(t => {
    if (t.requirementId && nodePositions.has(`req-${t.requirementId}`)) {
      edges.push({ from: `req-${t.requirementId}`, to: `task-${t.id}`, type: 'normal' });
    }
  });

  testRuns.forEach(tr => {
    const tc = testCases.find(c => c.id === tr.testCaseId);
    if (tc && tc.requirementId && nodePositions.has(`req-${tc.requirementId}`)) {
      edges.push({
        from: `req-${tc.requirementId}`,
        to: `test-${tr.id}`,
        type: tr.result === 'Failed' ? 'defect' : 'normal'
      });
    }
  });

  bugs.forEach(b => {
    let linked = false;
    if (b.relatedTestRunId && nodePositions.has(`test-${b.relatedTestRunId}`)) {
      edges.push({ from: `test-${b.relatedTestRunId}`, to: `bug-${b.id}`, type: 'defect' });
      linked = true;
    }
    if (b.relatedTaskId && nodePositions.has(`task-${b.relatedTaskId}`)) {
      edges.push({ from: `task-${b.relatedTaskId}`, to: `bug-${b.id}`, type: 'defect' });
      linked = true;
    }
    if (b.relatedRequirementId && nodePositions.has(`req-${b.relatedRequirementId}`)) {
      edges.push({ from: `req-${b.relatedRequirementId}`, to: `bug-${b.id}`, type: 'defect' });
      linked = true;
    }
    // If no direct link, connect from first task/req for trace continuity
    if (!linked && tasks.length && nodePositions.has(`task-${tasks[0].id}`)) {
      edges.push({ from: `task-${tasks[0].id}`, to: `bug-${b.id}`, type: 'defect' });
    }
  });

  releases.forEach(rel => {
    if (rel.taskIds && rel.taskIds.length) {
      rel.taskIds.forEach(tid => {
        if (nodePositions.has(`task-${tid}`)) {
          edges.push({ from: `task-${tid}`, to: `release-${rel.id}`, type: 'normal' });
        }
      });
    } else if (tasks.length && nodePositions.has(`task-${tasks[0].id}`)) {
      edges.push({ from: `task-${tasks[0].id}`, to: `release-${rel.id}`, type: 'normal' });
    }
  });

  // Render DOM nodes
  function renderDag() {
    nodesLayer.innerHTML = '';
    edgesGroup.innerHTML = '';

    // Render nodes
    nodePositions.forEach((pos, id) => {
      const isDefect = pos.tier === 'bug' || (pos.tier === 'test' && pos.item.result === 'Failed');
      const isPassed = (pos.tier === 'test' && pos.item.result === 'Passed') || (pos.tier === 'req' && pos.item.status === 'Implemented');

      // Filter check
      if (activeFilter === 'defects' && !isDefect && !isAncestorOfDefect(id)) return;
      if (activeFilter === 'passed' && !isPassed) return;

      const card = document.createElement('div');
      card.id = `dag-node-${id}`;
      card.className = `dag-node absolute bg-surface-panel border rounded-xl p-3 shadow-md transition-all cursor-pointer select-none ${isDefect ? 'border-status-defect/60 bg-status-defect-surface/20' : 'border-border-subtle hover:border-primary/60'}`;
      card.style.width = `${pos.width}px`;
      card.style.height = `${pos.height}px`;
      card.style.left = `${pos.x}px`;
      card.style.top = `${pos.y}px`;

      let badgeHtml = '';
      let titleHtml = escapeHtml(pos.item.title || pos.item.name || id);
      let subHtml = '';

      if (pos.tier === 'req') {
        badgeHtml = `<span class="font-jetbrains text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary-container/20 text-primary">${escapeHtml(pos.item.key || pos.item.id)}</span>`;
        subHtml = `<span class="text-[11px] font-jetbrains ${pos.item.priority === 'Must' ? 'text-status-defect font-bold' : 'text-secondary'}">${pos.item.priority}</span>`;
      } else if (pos.tier === 'task') {
        badgeHtml = `<span class="font-jetbrains text-[10px] font-bold px-1.5 py-0.5 rounded bg-secondary/15 text-secondary">${escapeHtml(pos.item.key || pos.item.id)}</span>`;
        subHtml = `<span class="text-[11px] font-jetbrains text-text-muted">${pos.item.estimate || 3} pts • ${escapeHtml(pos.item.status)}</span>`;
      } else if (pos.tier === 'test') {
        const isRun = Boolean(pos.item.result);
        badgeHtml = `<span class="font-jetbrains text-[10px] font-bold px-1.5 py-0.5 rounded ${pos.item.result === 'Passed' ? 'bg-status-passed-surface text-status-passed' : 'bg-status-defect-surface text-status-defect'}">${isRun ? pos.item.result.toUpperCase() : 'TEST'}</span>`;
        subHtml = `<span class="text-[11px] font-jetbrains text-text-muted">${escapeHtml(pos.item.id)}</span>`;
      } else if (pos.tier === 'bug') {
        badgeHtml = `<span class="font-jetbrains text-[10px] font-bold px-1.5 py-0.5 rounded bg-status-defect-surface text-status-defect">${escapeHtml(pos.item.severity)}</span>`;
        subHtml = `<span class="text-[11px] font-jetbrains text-text-muted">${escapeHtml(pos.item.id)} • ${escapeHtml(pos.item.status)}</span>`;
      } else if (pos.tier === 'release') {
        badgeHtml = `<span class="font-jetbrains text-[10px] font-bold px-1.5 py-0.5 rounded bg-status-release-surface text-status-release">RELEASE</span>`;
        subHtml = `<span class="text-[11px] font-jetbrains text-text-muted">${formatDate(pos.item.targetDate)}</span>`;
      }

      card.innerHTML = `
        <!-- Input Connection Handle -->
        <div class="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-border-strong border-2 border-surface-canvas pointer-events-none"></div>
        <!-- Output Connection Handle -->
        <div class="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary border-2 border-surface-canvas pointer-events-none"></div>

        <div class="flex items-center justify-between mb-1">
          ${badgeHtml}
          ${subHtml}
        </div>
        <div class="font-inter text-[12px] font-semibold text-text-primary line-clamp-2 leading-snug">
          ${titleHtml}
        </div>
      `;

      card.addEventListener('click', (e) => {
        e.stopPropagation();
        selectNode(id, pos);
      });

      nodesLayer.appendChild(card);
      nodeElements.set(id, card);
    });

    // Render SVG bezier edges
    edges.forEach((edge, idx) => {
      const fromPos = nodePositions.get(edge.from);
      const toPos = nodePositions.get(edge.to);
      if (!fromPos || !toPos) return;

      const x1 = fromPos.x + fromPos.width;
      const y1 = fromPos.y + fromPos.height / 2;
      const x2 = toPos.x;
      const y2 = toPos.y + toPos.height / 2;

      const dx = Math.abs(x2 - x1) * 0.5;
      const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('id', `dag-edge-${edge.from}-${edge.to}`);
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', edge.type === 'defect' ? '#ef4444' : 'rgba(192, 193, 255, 0.4)');
      path.setAttribute('stroke-width', edge.type === 'defect' ? '2.5' : '1.75');
      if (edge.type === 'defect') {
        path.setAttribute('stroke-dasharray', '5 3');
        path.setAttribute('marker-end', 'url(#dag-arrow-defect)');
      } else {
        path.setAttribute('marker-end', 'url(#dag-arrow)');
      }
      path.setAttribute('class', 'transition-all duration-300');

      edgesGroup.appendChild(path);
    });

    updateTransform();
  }

  function isAncestorOfDefect(nodeId) {
    // Traverse forward to check if leads to a defect
    const visited = new Set();
    const queue = [nodeId];
    while (queue.length) {
      const curr = queue.shift();
      if (visited.has(curr)) continue;
      visited.add(curr);
      const outgoing = edges.filter(e => e.from === curr);
      for (const e of outgoing) {
        if (e.to.startsWith('bug-') || e.type === 'defect') return true;
        queue.push(e.to);
      }
    }
    return false;
  }

  // Node selection & bidirectional lineage highlighting
  function selectNode(id, pos) {
    selectedNodeId = id;

    // Traverse upstream ancestors & downstream descendants
    const connectedNodes = new Set([id]);
    const connectedEdges = new Set();

    // Upstream
    const upQueue = [id];
    while (upQueue.length) {
      const curr = upQueue.shift();
      edges.filter(e => e.to === curr).forEach(e => {
        connectedNodes.add(e.from);
        connectedEdges.add(`dag-edge-${e.from}-${e.to}`);
        upQueue.push(e.from);
      });
    }

    // Downstream
    const downQueue = [id];
    while (downQueue.length) {
      const curr = downQueue.shift();
      edges.filter(e => e.from === curr).forEach(e => {
        connectedNodes.add(e.to);
        connectedEdges.add(`dag-edge-${e.from}-${e.to}`);
        downQueue.push(e.to);
      });
    }

    // Apply styles to nodes
    nodeElements.forEach((el, nId) => {
      if (connectedNodes.has(nId)) {
        el.style.opacity = '1';
        el.style.transform = nId === id ? 'scale(1.05)' : 'scale(1)';
        el.classList.add('ring-2', 'ring-primary', 'shadow-xl');
      } else {
        el.style.opacity = '0.25';
        el.style.transform = 'scale(0.98)';
        el.classList.remove('ring-2', 'ring-primary', 'shadow-xl');
      }
    });

    // Apply styles to edges
    edgesGroup.querySelectorAll('path').forEach(p => {
      if (connectedEdges.has(p.id)) {
        p.setAttribute('stroke', '#818cf8');
        p.setAttribute('stroke-width', '3.5');
        p.setAttribute('marker-end', 'url(#dag-arrow-active)');
        p.style.opacity = '1';
      } else {
        p.style.opacity = '0.15';
        p.setAttribute('stroke-width', '1');
      }
    });

    // Update inspector panel
    showInspector(pos);
  }

  function clearSelection() {
    selectedNodeId = null;
    nodeElements.forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'scale(1)';
      el.classList.remove('ring-2', 'ring-primary', 'shadow-xl');
    });
    edgesGroup.querySelectorAll('path').forEach(p => {
      p.style.opacity = '1';
      const isDef = p.id.includes('bug-') || p.getAttribute('stroke') === '#ef4444';
      p.setAttribute('stroke', isDef ? '#ef4444' : 'rgba(192, 193, 255, 0.4)');
      p.setAttribute('stroke-width', isDef ? '2.5' : '1.75');
      p.setAttribute('marker-end', isDef ? 'url(#dag-arrow-defect)' : 'url(#dag-arrow)');
    });
    inspectorPanel?.classList.add('hidden');
  }

  function showInspector(pos) {
    if (!inspectorPanel) return;
    const { item, tier } = pos;

    inspBadge.textContent = tier.toUpperCase();
    inspTitle.textContent = item.title || item.name || item.id;
    inspDesc.textContent = item.description || item.notes || 'No extended notes provided for this entity.';

    let meta = '';
    let jumpRoute = '#/dashboard';

    if (tier === 'req') {
      meta = `MoSCoW: ${item.priority} • Status: ${item.status}`;
      jumpRoute = '#/requirements';
    } else if (tier === 'task') {
      meta = `Estimate: ${item.estimate || 3} pts • Assignee: ${item.assigneeName || 'Sprint Team'}`;
      jumpRoute = '#/sprints';
    } else if (tier === 'test') {
      meta = `Result: ${item.result || 'Pending'} • Case: ${item.testCaseId || item.id}`;
      jumpRoute = '#/tests';
    } else if (tier === 'bug') {
      meta = `Severity: ${item.severity} • Priority: ${item.priority} • Status: ${item.status}`;
      jumpRoute = '#/bugs';
    } else if (tier === 'release') {
      meta = `Milestone: ${formatDate(item.targetDate)} • Status: ${item.status}`;
      jumpRoute = '#/releases';
    }

    inspMeta.textContent = meta;
    inspJumpBtn.onclick = () => { window.location.hash = jumpRoute; };
    inspectorPanel.classList.remove('hidden');
  }

  inspCloseBtn?.addEventListener('click', clearSelection);

  // Transform updater
  function updateTransform() {
    const transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    nodesLayer.style.transform = transform;
    svgLayer.style.transform = transform;
  }

  // Pan & Zoom controls
  viewport.addEventListener('mousedown', (e) => {
    if (e.target.closest('.dag-node') || e.target.closest('#dag-inspector-panel')) return;
    isDragging = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    updateTransform();
  });

  window.addEventListener('mouseup', () => { isDragging = false; });

  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    scale = Math.min(Math.max(scale * zoomFactor, 0.4), 2.2);
    updateTransform();
  }, { passive: false });

  // Zoom toolbar buttons
  container.querySelector('#dag-zoom-in')?.addEventListener('click', () => {
    scale = Math.min(scale * 1.2, 2.2);
    updateTransform();
  });
  container.querySelector('#dag-zoom-out')?.addEventListener('click', () => {
    scale = Math.max(scale * 0.8, 0.4);
    updateTransform();
  });
  container.querySelector('#dag-fit-view')?.addEventListener('click', () => {
    scale = 0.95;
    panX = 30;
    panY = 30;
    clearSelection();
    updateTransform();
  });

  // Fullscreen button
  container.querySelector('#dag-fullscreen-btn')?.addEventListener('click', () => {
    const widget = container.querySelector('#widget-dag');
    if (!widget) return;
    if (widget.classList.contains('fixed')) {
      widget.classList.remove('fixed', 'inset-4', 'z-50', 'h-auto');
      viewport.style.height = '460px';
    } else {
      widget.classList.add('fixed', 'inset-4', 'z-50', 'h-auto');
      viewport.style.height = 'calc(100vh - 120px)';
    }
  });

  // Filter tabs
  const filterBtns = {
    all: container.querySelector('#dag-filter-all'),
    defects: container.querySelector('#dag-filter-defects'),
    passed: container.querySelector('#dag-filter-passed')
  };

  Object.entries(filterBtns).forEach(([fKey, btn]) => {
    btn?.addEventListener('click', () => {
      activeFilter = fKey;
      Object.values(filterBtns).forEach(b => {
        b?.classList.remove('text-text-primary', 'bg-surface-panel', 'font-semibold', 'shadow-xs');
        b?.classList.add('text-text-muted');
      });
      btn.classList.add('text-text-primary', 'bg-surface-panel', 'font-semibold', 'shadow-xs');
      btn.classList.remove('text-text-muted');
      renderDag();
    });
  });

  // Initial draw
  renderDag();
}


// -------------------------------------------------------------
// CUSTOMIZABLE DRAG & DROP LAYOUT CONTROLLER
// -------------------------------------------------------------
function initCustomizableLayout(container, storageKey) {
  const customizeBtn = container.querySelector('#dash-customize-layout-btn');
  const customizeBtnText = container.querySelector('#dash-customize-btn-text');
  const editBanner = container.querySelector('#dash-edit-banner');
  const doneBtn = container.querySelector('#dash-done-layout-btn');
  const resetBtn = container.querySelector('#dash-reset-layout-btn');
  const grid = container.querySelector('#dash-metrics-grid');

  if (!customizeBtn || !grid) return;

  let isEditing = false;
  let draggedCard = null;

  function toggleEditMode(editing) {
    isEditing = editing;
    if (isEditing) {
      editBanner?.classList.remove('hidden');
      customizeBtnText.textContent = 'Exit Customizer';
      customizeBtn.classList.add('bg-primary/20', 'border-primary/50');
      grid.querySelectorAll('.dash-metric-card').forEach(card => {
        card.setAttribute('draggable', 'true');
        card.classList.add('border-dashed', 'border-primary/50', 'bg-surface-panel/40');
      });
    } else {
      editBanner?.classList.add('hidden');
      customizeBtnText.textContent = 'Customize Layout';
      customizeBtn.classList.remove('bg-primary/20', 'border-primary/50');
      grid.querySelectorAll('.dash-metric-card').forEach(card => {
        card.setAttribute('draggable', 'false');
        card.classList.remove('border-dashed', 'border-primary/50', 'bg-surface-panel/40');
      });
      saveCurrentOrder();
    }
  }

  customizeBtn.addEventListener('click', () => toggleEditMode(!isEditing));
  doneBtn?.addEventListener('click', () => toggleEditMode(false));

  resetBtn?.addEventListener('click', () => {
    localStorage.removeItem(storageKey);
    showToast('Dashboard layout reset to factory default.', 'info');
    renderDashboard(container);
  });

  // HTML5 Drag & Drop handlers
  grid.addEventListener('dragstart', (e) => {
    if (!isEditing) return;
    draggedCard = e.target.closest('.dash-metric-card');
    if (draggedCard) {
      e.dataTransfer.effectAllowed = 'move';
      draggedCard.classList.add('opacity-40');
    }
  });

  grid.addEventListener('dragover', (e) => {
    if (!isEditing || !draggedCard) return;
    e.preventDefault();
    const targetCard = e.target.closest('.dash-metric-card');
    if (targetCard && targetCard !== draggedCard) {
      const rect = targetCard.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;
      if (e.clientX < midX) {
        grid.insertBefore(draggedCard, targetCard);
      } else {
        grid.insertBefore(draggedCard, targetCard.nextSibling);
      }
    }
  });

  grid.addEventListener('dragend', () => {
    if (draggedCard) {
      draggedCard.classList.remove('opacity-40');
      draggedCard = null;
      saveCurrentOrder();
    }
  });

  function saveCurrentOrder() {
    const cards = Array.from(grid.querySelectorAll('.dash-metric-card'));
    const order = cards.map(c => c.id).filter(Boolean);
    const config = { metricsOrder: order };
    localStorage.setItem(storageKey, JSON.stringify(config));
  }
}

function loadLayout(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { metricsOrder: DEFAULT_METRIC_ORDER, bottomOrder: DEFAULT_BOTTOM_ORDER };
}


// -------------------------------------------------------------
// EXPORTED MODAL TRIGGERS (Callable Globally Across DevTrack)
// -------------------------------------------------------------
export function openNewRequirementModal(projectId) {
  showModal(`
    <form id="new-req-form" class="space-y-4">
      <div>
        <label class="block text-label-md text-text-secondary mb-1">Title *</label>
        <input type="text" id="req-title" required placeholder="e.g. Export Traceability to PDF/CSV"
          class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none" />
      </div>
      <div>
        <label class="block text-label-md text-text-secondary mb-1">Description *</label>
        <textarea id="req-desc" rows="3" required placeholder="Detailed requirement specifications and rationale..."
          class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none"></textarea>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-label-md text-text-secondary mb-1">MoSCoW Priority</label>
          <select id="req-priority" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none">
            <option value="Must">Must Have</option>
            <option value="Should">Should Have</option>
            <option value="Could">Could Have</option>
            <option value="Won't">Won't Have</option>
          </select>
        </div>
        <div>
          <label class="block text-label-md text-text-secondary mb-1">Initial Status</label>
          <select id="req-status" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none">
            <option value="Draft">Draft</option>
            <option value="Approved">Approved</option>
          </select>
        </div>
      </div>
      <div>
        <label class="block text-label-md text-text-secondary mb-1">Acceptance Criteria</label>
        <textarea id="req-ac" rows="2" placeholder="Given... When... Then..."
          class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none"></textarea>
      </div>
      <div class="flex justify-end gap-3 pt-2">
        <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-secondary hover:bg-surface-elevated text-body-md cursor-pointer">Cancel</button>
        <button type="submit" class="px-4 py-2 rounded-lg bg-primary text-on-primary font-semibold text-body-md hover:bg-primary-fixed cursor-pointer">Create Requirement</button>
      </div>
    </form>
  `, { title: 'Create Requirement' });

  document.getElementById('new-req-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('req-title').value.trim();
    const description = document.getElementById('req-desc').value.trim();
    const priority = document.getElementById('req-priority').value;
    const status = document.getElementById('req-status').value;
    const acceptanceCriteria = document.getElementById('req-ac').value.trim();

    const res = store.createRequirement(projectId, { title, description, priority, status, acceptanceCriteria });
    if (res.error) showToast(res.error, 'error');
    if (res.data) {
      closeModal();
      showToast('Requirement created successfully!', 'success');
      window.location.hash = '#/requirements';
    }
  });
}

export function openNewDefectModal(projectId) {
  const reqs = store.getRequirements(projectId);
  const tasks = store.getTasks(projectId);

  showModal(`
    <form id="new-defect-form" class="space-y-4">
      <div>
        <label class="block text-label-md text-text-secondary mb-1">Defect Title *</label>
        <input type="text" id="defect-title" required placeholder="e.g. Session expires unexpectedly during token refresh"
          class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none" />
      </div>
      <div>
        <label class="block text-label-md text-text-secondary mb-1">Description & Steps to Reproduce *</label>
        <textarea id="defect-desc" rows="3" required placeholder="1. Go to...\n2. Click on...\n3. Expected vs Actual..."
          class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none"></textarea>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-label-md text-text-secondary mb-1">Severity</label>
          <select id="defect-sev" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none">
            <option value="Critical">Critical</option>
            <option value="High" selected>High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
        <div>
          <label class="block text-label-md text-text-secondary mb-1">Priority</label>
          <select id="defect-pri" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none">
            <option value="High" selected>High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-label-md text-text-secondary mb-1">Linked Requirement</label>
          <select id="defect-req" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none">
            <option value="">None</option>
            ${reqs.map(r => `<option value="${r.id}">${escapeHtml(r.title)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-label-md text-text-secondary mb-1">Linked Task</label>
          <select id="defect-task" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none">
            <option value="">None</option>
            ${tasks.map(t => `<option value="${t.id}">${escapeHtml(t.title)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="flex justify-end gap-3 pt-2">
        <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-secondary hover:bg-surface-elevated text-body-md cursor-pointer">Cancel</button>
        <button type="submit" class="px-4 py-2 rounded-lg bg-status-defect text-on-error font-semibold text-body-md hover:brightness-110 cursor-pointer">Log Defect</button>
      </div>
    </form>
  `, { title: 'Log New Defect' });

  document.getElementById('new-defect-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('defect-title').value.trim();
    const description = document.getElementById('defect-desc').value.trim();
    const severity = document.getElementById('defect-sev').value;
    const priority = document.getElementById('defect-pri').value;
    const relatedRequirementId = document.getElementById('defect-req').value || null;
    const relatedTaskId = document.getElementById('defect-task').value || null;

    const res = store.createBug(projectId, {
      title,
      description,
      severity,
      priority,
      relatedRequirementId,
      relatedTaskId
    });

    if (res.error) showToast(res.error, 'error');
    if (res.data) {
      closeModal();
      showToast('Defect logged successfully!', 'success');
      window.location.hash = '#/bugs';
    }
  });
}

export function openNewTestRunModal(projectId) {
  const testCases = store.getTestCases(projectId);

  showModal(`
    <form id="new-testrun-form" class="space-y-4">
      <div>
        <label class="block text-label-md text-text-secondary mb-1">Select Test Case *</label>
        <select id="run-tc" required class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none">
          ${testCases.map(tc => `<option value="${tc.id}">${escapeHtml(tc.title)}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="block text-label-md text-text-secondary mb-1">Execution Result *</label>
        <select id="run-result" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none">
          <option value="Passed">Passed</option>
          <option value="Failed">Failed</option>
          <option value="Blocked">Blocked</option>
        </select>
      </div>
      <div>
        <label class="block text-label-md text-text-secondary mb-1">Execution Notes & Assertion Evidence</label>
        <textarea id="run-notes" rows="3" placeholder="Actual behavior observed, HTTP status codes, console telemetry..."
          class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none"></textarea>
      </div>
      <div class="flex justify-end gap-3 pt-2">
        <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-secondary hover:bg-surface-elevated text-body-md cursor-pointer">Cancel</button>
        <button type="submit" class="px-4 py-2 rounded-lg bg-primary text-on-primary font-semibold text-body-md hover:bg-primary-fixed cursor-pointer">Record Test Run</button>
      </div>
    </form>
  `, { title: 'Execute Test Run' });

  document.getElementById('new-testrun-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const testCaseId = document.getElementById('run-tc').value;
    const result = document.getElementById('run-result').value;
    const notes = document.getElementById('run-notes').value.trim();

    const res = store.createTestRun(testCaseId, { result, notes });
    if (res.error) showToast(res.error, 'error');
    if (res.data) {
      closeModal();
      showToast(`Test run recorded: ${result}`, result === 'Passed' ? 'success' : 'error');
      window.location.hash = '#/tests';
    }
  });
}


export function openFlowAnalyticsModal(projectId) {
  const metrics = computeFlowMetrics(projectId);
  if (!metrics) {
    showToast('Failed to calculate flow metrics', 'error');
    return;
  }

  const getRatingBadge = (rating) => {
    const colors = {
      ELITE: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      HIGH: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      MEDIUM: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      LOW: 'bg-rose-500/15 text-rose-400 border-rose-500/30'
    };
    const c = colors[rating] || colors.MEDIUM;
    return `<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border ${c}">${rating}</span>`;
  };

  const statusProgressColors = {
    'Backlog': 'bg-surface-elevated',
    'To Do': 'bg-secondary',
    'In Progress': 'bg-primary',
    'In Review': 'bg-amber-400',
    'Done': 'bg-emerald-400'
  };

  const content = `
    <div class="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
      <!-- Header Overview Banner -->
      <div class="p-4 rounded-xl bg-surface-panel border border-border-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="font-jetbrains text-mono-xs text-text-muted uppercase">${escapeHtml(metrics.projectKey)} PROGRAM FLOW</span>
            <span class="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">DevOps Research & Assessment</span>
          </div>
          <h3 class="font-geist text-title-lg font-bold text-text-primary">${escapeHtml(metrics.projectName)} Engineering Throughput</h3>
          <p class="text-text-muted text-body-xs mt-0.5">Continuous Delivery cadence, lead time efficiency, and delivery reliability metrics.</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="text-right">
            <div class="text-title-md font-bold text-text-primary font-jetbrains">${metrics.completedPoints} / ${metrics.totalPoints} pts</div>
            <div class="text-[11px] text-text-muted">${metrics.completionPct}% Delivery Progress</div>
          </div>
          <div class="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary flex items-center justify-center font-jetbrains font-bold text-xs text-text-primary">
            ${metrics.completionPct}%
          </div>
        </div>
      </div>

      <!-- DORA 4 Metrics Grid -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <h4 class="font-geist text-title-sm font-bold text-text-primary flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px] text-primary">speed</span>
            <span>DORA 4 Core Metrics</span>
          </h4>
          <span class="text-[11px] text-text-muted">Standard industry benchmarks</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <!-- Deployment Frequency -->
          <div class="p-3.5 rounded-xl bg-surface-base border border-border-subtle flex flex-col justify-between">
            <div class="flex items-center justify-between mb-2">
              <span class="text-body-xs text-text-muted font-medium">Deployment Frequency</span>
              ${getRatingBadge(metrics.dora.deploymentFrequency.rating)}
            </div>
            <div class="font-jetbrains text-headline-sm font-bold text-text-primary mb-1">
              ${escapeHtml(metrics.dora.deploymentFrequency.value)}
            </div>
            <div class="text-[11px] text-text-muted">Cadence of successful releases into production</div>
          </div>

          <!-- Lead Time for Changes -->
          <div class="p-3.5 rounded-xl bg-surface-base border border-border-subtle flex flex-col justify-between">
            <div class="flex items-center justify-between mb-2">
              <span class="text-body-xs text-text-muted font-medium">Lead Time for Changes</span>
              ${getRatingBadge(metrics.dora.leadTimeForChanges.rating)}
            </div>
            <div class="font-jetbrains text-headline-sm font-bold text-text-primary mb-1">
              ${escapeHtml(metrics.dora.leadTimeForChanges.value)}
            </div>
            <div class="text-[11px] text-text-muted">Commit to verified production code</div>
          </div>

          <!-- Change Failure Rate -->
          <div class="p-3.5 rounded-xl bg-surface-base border border-border-subtle flex flex-col justify-between">
            <div class="flex items-center justify-between mb-2">
              <span class="text-body-xs text-text-muted font-medium">Change Failure Rate</span>
              ${getRatingBadge(metrics.dora.changeFailureRate.rating)}
            </div>
            <div class="font-jetbrains text-headline-sm font-bold text-text-primary mb-1">
              ${escapeHtml(metrics.dora.changeFailureRate.value.split('%')[0])}%
            </div>
            <div class="text-[11px] text-text-muted">Critical defects following release deployment</div>
          </div>

          <!-- MTTR -->
          <div class="p-3.5 rounded-xl bg-surface-base border border-border-subtle flex flex-col justify-between">
            <div class="flex items-center justify-between mb-2">
              <span class="text-body-xs text-text-muted font-medium">Time to Restore (MTTR)</span>
              ${getRatingBadge(metrics.dora.timeToRestoreService.rating)}
            </div>
            <div class="font-jetbrains text-headline-sm font-bold text-text-primary mb-1">
              ${escapeHtml(metrics.dora.timeToRestoreService.value)}
            </div>
            <div class="text-[11px] text-text-muted">Mean time to mitigate critical defects</div>
          </div>
        </div>
      </div>

      <!-- Bottleneck Alert (if active) -->
      ${metrics.bottleneckAlert ? `
        <div class="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <span class="material-symbols-outlined text-amber-400 text-[22px] shrink-0 mt-0.5">warning</span>
          <div>
            <div class="font-geist text-body-sm font-bold text-amber-300">Flow Constraint Detected in [${escapeHtml(metrics.bottleneckAlert.stage)}]</div>
            <div class="text-body-xs text-amber-200/90 mt-0.5">${escapeHtml(metrics.bottleneckAlert.message)}</div>
          </div>
        </div>
      ` : ''}

      <!-- Cycle Time vs Lead Time Breakdown -->
      <div class="p-4 rounded-xl bg-surface-base border border-border-subtle space-y-3">
        <div class="flex items-center justify-between">
          <h4 class="font-geist text-title-sm font-bold text-text-primary flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px] text-secondary">timelapse</span>
            <span>Cycle Time vs Lead Time Efficiency</span>
          </h4>
          <span class="font-jetbrains text-mono-sm text-text-secondary">Avg Cycle: <strong>${metrics.cycleTime.avgCycleTimeDays}d</strong> / Lead: <strong>${metrics.cycleTime.avgLeadTimeDays}d</strong></span>
        </div>
        <div class="space-y-1.5">
          <div class="flex items-center justify-between text-body-xs text-text-muted">
            <span>Active Development (~${metrics.cycleTime.devTimeDays}d)</span>
            <span>Code Review & Verification (~${metrics.cycleTime.reviewTimeDays}d)</span>
          </div>
          <div class="w-full h-3 rounded-full bg-surface-elevated overflow-hidden flex">
            <div class="bg-primary h-full transition-all" style="width: 65%" title="Active Dev: 65%"></div>
            <div class="bg-amber-400 h-full transition-all" style="width: 35%" title="Review & QA: 35%"></div>
          </div>
          <div class="flex items-center gap-4 text-[11px] text-text-muted pt-1">
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-primary inline-block"></span> Active Coding / Work-in-Progress</span>
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span> Pull Request & Peer Verification</span>
          </div>
        </div>
      </div>

      <!-- Cumulative Flow Distribution (CFD) -->
      <div class="p-4 rounded-xl bg-surface-base border border-border-subtle space-y-3">
        <div class="flex items-center justify-between">
          <h4 class="font-geist text-title-sm font-bold text-text-primary flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px] text-primary">stacked_bar_chart</span>
            <span>Cumulative Flow Distribution</span>
          </h4>
          <span class="text-body-xs text-text-muted">${metrics.flowDistribution.reduce((a, c) => a + c.count, 0)} total active items</span>
        </div>
        <div class="w-full h-4 rounded-full bg-surface-elevated overflow-hidden flex">
          ${metrics.flowDistribution.map(col => {
            const pct = metrics.totalPoints > 0 ? (col.points / metrics.totalPoints) * 100 : 20;
            return `<div class="${statusProgressColors[col.status] || 'bg-surface-elevated'} h-full transition-all" style="width: ${pct}%" title="${col.status}: ${col.points} pts (${col.count} tasks)"></div>`;
          }).join('')}
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
          ${metrics.flowDistribution.map(col => `
            <div class="p-2.5 rounded-lg bg-surface-panel border border-border-subtle/50 text-center">
              <div class="text-[11px] font-medium text-text-muted mb-0.5">${escapeHtml(col.status)}</div>
              <div class="font-jetbrains font-bold text-title-sm text-text-primary">${col.count} <span class="text-[10px] text-text-muted font-normal">cards</span></div>
              <div class="text-[10px] text-text-secondary font-jetbrains">${col.points} pts</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Multi-Sprint Velocity & Reliability History -->
      <div class="p-4 rounded-xl bg-surface-base border border-border-subtle space-y-3">
        <div class="flex items-center justify-between">
          <h4 class="font-geist text-title-sm font-bold text-text-primary flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px] text-emerald-400">trending_up</span>
            <span>Multi-Sprint Velocity & Predictability</span>
          </h4>
          <span class="font-jetbrains text-mono-sm text-emerald-400 font-semibold">Rolling Velocity: ${metrics.avgVelocity} pts/sprint</span>
        </div>
        ${metrics.sprintHistory.length > 0 ? `
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-body-xs font-inter">
              <thead>
                <tr class="border-b border-border-subtle text-text-muted font-mono uppercase text-[10px]">
                  <th class="py-2 px-3">Sprint</th>
                  <th class="py-2 px-3 text-center">Status</th>
                  <th class="py-2 px-3 text-right">Planned</th>
                  <th class="py-2 px-3 text-right">Delivered</th>
                  <th class="py-2 px-3 text-right">Reliability</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border-subtle/40">
                ${metrics.sprintHistory.map(s => `
                  <tr class="hover:bg-surface-panel/50 transition-colors">
                    <td class="py-2 px-3 font-medium text-text-primary">${escapeHtml(s.name)}</td>
                    <td class="py-2 px-3 text-center">
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.status === 'Active' ? 'bg-primary/20 text-primary' : 'bg-surface-elevated text-text-muted'}">${s.status}</span>
                    </td>
                    <td class="py-2 px-3 text-right font-jetbrains text-text-secondary">${s.planned} pts</td>
                    <td class="py-2 px-3 text-right font-jetbrains font-semibold text-emerald-400">${s.completed} pts</td>
                    <td class="py-2 px-3 text-right font-jetbrains">
                      <span class="${s.reliability >= 80 ? 'text-emerald-400' : s.reliability >= 50 ? 'text-amber-400' : 'text-rose-400'} font-semibold">${s.reliability}%</span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div class="text-center py-4 text-text-muted text-body-xs">No sprint velocity history recorded yet.</div>
        `}
      </div>

      <!-- Footer Actions -->
      <div class="flex justify-end pt-2">
        <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-primary text-body-sm font-medium border border-border-subtle cursor-pointer transition-colors">Close</button>
      </div>
    </div>
  `;

  showModal(content, { title: 'Executive Engineering Flow & DORA Metrics', width: 'max-w-4xl' });
}
