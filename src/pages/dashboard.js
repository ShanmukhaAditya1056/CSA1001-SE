import { store } from '../store.js';
import { statusChip, priorityChip, severityChip, formatDate, showToast, showModal, closeModal } from '../ui.js';
import { openInvitationsInboxModal } from '../main.js';


export function renderDashboard(container) {
  const project = store.getActiveProject();
  if (!project) {
    container.innerHTML = `
      <div class="p-12 text-center">
        <h2 class="text-headline-lg font-geist font-bold mb-4">No Project Found</h2>
        <a href="#/projects" class="px-4 py-2 bg-primary text-on-primary rounded-lg">Go to Projects</a>
      </div>
    `;
    return;
  }

  const dash = store.getDashboard(project.id);
  const reqs = store.getRequirements(project.id);
  const tasks = store.getTasks(project.id);
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

  // QA metrics
  const totalRuns = testRuns.length;
  const passedRuns = testRuns.filter(r => r.result === 'Passed').length;
  const failedRuns = testRuns.filter(r => r.result === 'Failed').length;
  const blockedRuns = testRuns.filter(r => r.result === 'Blocked').length;
  const skippedRuns = testRuns.filter(r => r.result === 'Skipped').length;
  const passRate = totalRuns > 0 ? Math.round((passedRuns / totalRuns) * 100) : 100;

  // Bug metrics
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

  // Real-time trace samples for the E2E lifecycle ribbon
  const sampleReq = reqs[0] || null;
  const sampleTask = tasks[0] || null;
  const sampleRun = testRuns[0] || null;
  const sampleBug = bugs[0] || null;
  const sampleRel = targetRelease;

  // Pending project invitations for current user
  const userEmail = store.currentUser?.email || '';
  const nowMs = Date.now();
  const pendingInvs = userEmail ? store.getUserInvitations(userEmail).filter(i => i.status === 'Pending' && new Date(i.expiresAt).getTime() > nowMs) : [];

  container.innerHTML = `
    <div class="relative w-full px-6 py-6 overflow-hidden">

      <!-- Glow ambient effects -->
      <div class="absolute -top-32 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute top-1/2 right-0 w-80 h-80 bg-status-defect/5 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Action & Context Header -->
      <div class="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div>
          <div class="flex items-center gap-2 font-jetbrains text-mono-md text-text-muted mb-1">
            <span>PROGRAM / ${project.key}-CORE</span>
            <span>/</span>
            <span class="text-secondary font-medium">LIFECYCLE INTELLIGENCE</span>
            <span class="px-2 py-0.5 rounded-full bg-status-passed-surface text-status-passed font-semibold ml-2">HEALTHY AUDIT</span>
          </div>
          <h1 class="font-geist text-headline-xl text-text-primary tracking-tight font-bold">Executive Release & Traceability Cockpit</h1>
        </div>

        <!-- Quick Actions Toolbar -->
        <div class="flex items-center flex-wrap gap-2.5">
          <button id="dash-new-req-btn" class="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-primary font-inter text-label-md transition-all border border-border-subtle shadow-sm active:scale-95">
            <span class="material-symbols-outlined text-[18px] text-primary">add_task</span>
            <span>+ New Requirement</span>
          </button>
          <button id="dash-log-defect-btn" class="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-status-defect-surface hover:bg-status-defect/20 text-status-defect font-inter text-label-md transition-all border border-status-defect/30 shadow-sm active:scale-95">
            <span class="material-symbols-outlined text-[18px]">bug_report</span>
            <span>+ Log Defect</span>
          </button>
          <button id="dash-exec-test-btn" class="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-primary font-inter text-label-md transition-all border border-border-subtle shadow-sm active:scale-95">
            <span class="material-symbols-outlined text-[18px] text-secondary">play_circle</span>
            <span>+ Execute Test Run</span>
          </button>
          <button id="dash-ci-btn" class="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-on-primary font-inter text-label-md font-semibold hover:brightness-110 active:scale-95 transition-all shadow-md shadow-primary/25">
            <span class="material-symbols-outlined text-[18px]">terminal</span>
            <span>Run CI Validation</span>
          </button>
        </div>
      </div>

      <!-- Pending Invitations Attention Banner -->
      ${pendingInvs.length > 0 ? `
        <div class="relative z-10 mb-8 p-4 rounded-xl bg-surface-canvas border border-secondary/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-secondary/5 animate-scale-in">
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
                Invited to join <strong class="text-text-primary">${pendingInvs[0].projectName}</strong> (${pendingInvs[0].role}) by ${pendingInvs[0].inviterName}${pendingInvs.length > 1 ? ` plus ${pendingInvs.length - 1} other invitation(s)` : ''}.
              </div>
            </div>
          </div>
          <button id="dash-view-invites-btn" class="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-on-secondary font-bold text-body-sm hover:brightness-110 shadow-md shadow-secondary/20 transition-all self-end sm:self-center shrink-0 cursor-pointer">
            <span class="material-symbols-outlined text-[18px]">mail</span>
            <span>Review & Respond</span>
          </button>
        </div>
      ` : ''}


      <!-- Top Summary Metrics Grid -->
      <div class="relative z-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
        <!-- 1. Requirements -->
        <div class="bg-surface-canvas border border-border-subtle rounded-xl p-5 flex flex-col justify-between shadow-sm hover:border-border-strong transition-all">
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
              <div class="bg-status-passed h-full" style="width: ${totalReqs ? (completedReqs / totalReqs) * 100 : 0}%" title="Implemented"></div>
              <div class="bg-status-in-progress h-full" style="width: ${totalReqs ? (inProgReqs / totalReqs) * 100 : 0}%" title="In Progress"></div>
              <div class="bg-text-muted h-full" style="width: ${totalReqs ? (draftReqs / totalReqs) * 100 : 0}%" title="Draft"></div>
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

        <!-- 2. Active Sprint -->
        <div class="bg-surface-canvas border border-border-subtle rounded-xl p-5 flex flex-col justify-between shadow-sm hover:border-border-strong transition-all">
          <div>
            <div class="flex items-center justify-between text-text-muted mb-2">
              <span class="text-label-sm font-semibold uppercase tracking-wider">Active Sprint</span>
              <span class="px-2 py-0.5 rounded-full bg-status-in-progress-surface text-status-in-progress font-jetbrains text-[10px] font-semibold">ACTIVE</span>
            </div>
            <div class="font-geist text-headline-sm font-bold text-text-primary truncate" title="${activeSprint ? activeSprint.name : 'Sprint 1'}">
              ${activeSprint ? activeSprint.name : 'Sprint 1'}
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

        <!-- 3. Test Pass Rate -->
        <div class="bg-surface-canvas border border-border-subtle rounded-xl p-5 flex flex-col justify-between shadow-sm hover:border-border-strong transition-all">
          <div>
            <div class="flex items-center justify-between text-text-muted mb-2">
              <span class="text-label-sm font-semibold uppercase tracking-wider">QA Verification</span>
              <span class="material-symbols-outlined text-[20px] text-status-passed">verified</span>
            </div>
            <div class="flex items-baseline gap-2 mb-2">
              <span class="font-geist text-headline-xl font-bold ${passRate >= 80 ? 'text-status-passed' : 'text-status-in-progress'}">${passRate}%</span>
              <span class="font-jetbrains text-mono-md text-text-muted">${totalRuns} Executed</span>
            </div>
            <div class="w-full bg-surface-base h-2 rounded-full overflow-hidden flex mb-4">
              <div class="bg-status-passed h-full" style="width: ${totalRuns ? (passedRuns / totalRuns) * 100 : 100}%"></div>
              <div class="bg-status-defect h-full" style="width: ${totalRuns ? (failedRuns / totalRuns) * 100 : 0}%"></div>
              <div class="bg-status-in-progress h-full" style="width: ${totalRuns ? (blockedRuns / totalRuns) * 100 : 0}%"></div>
              <div class="bg-text-muted h-full" style="width: ${totalRuns ? (skippedRuns / totalRuns) * 100 : 0}%"></div>
            </div>
          </div>
          <div class="flex items-center justify-between font-jetbrains text-[11px] bg-surface-base/80 rounded-lg px-2.5 py-1.5 border border-border-subtle">
            <span class="text-status-passed font-semibold">${passedRuns} Pass</span>
            <span class="text-status-defect font-semibold">${failedRuns} Fail</span>
            <span class="text-status-in-progress font-semibold">${blockedRuns} Blk</span>
            <span class="text-text-muted">${skippedRuns} Skp</span>
          </div>
        </div>

        <!-- 4. Open Defects -->
        <div class="bg-surface-canvas border border-border-subtle rounded-xl p-5 flex flex-col justify-between shadow-sm hover:border-border-strong transition-all">
          <div>
            <div class="flex items-center justify-between text-text-muted mb-2">
              <span class="text-label-sm font-semibold uppercase tracking-wider">Active Defects</span>
              <span class="material-symbols-outlined text-[20px] text-status-defect">pest_control</span>
            </div>
            <div class="flex items-baseline gap-2 mb-2">
              <span class="font-geist text-headline-xl font-bold text-status-defect">${openBugs.length}</span>
              ${critBugs > 0 ? `<span class="font-jetbrains text-mono-md bg-status-defect-surface text-status-defect px-1.5 py-0.5 rounded font-semibold">${critBugs} Critical</span>` : `<span class="font-jetbrains text-mono-md text-status-passed">0 Critical</span>`}
            </div>
            <p class="text-body-sm text-text-muted mb-3">Triage & QA verification in progress</p>
          </div>
          <div class="grid grid-cols-3 gap-1.5 text-center font-jetbrains text-[11px]">
            <div class="bg-status-defect/15 text-status-defect py-1 rounded font-semibold">${critBugs} Crit</div>
            <div class="bg-status-in-progress/15 text-status-in-progress py-1 rounded font-semibold">${highBugs} High</div>
            <div class="bg-surface-panel text-text-secondary py-1 rounded">${medBugs} Med</div>
          </div>
        </div>

        <!-- 5. Target Release -->
        <div class="bg-surface-canvas border border-border-subtle rounded-xl p-5 flex flex-col justify-between shadow-sm hover:border-border-strong transition-all cursor-pointer" onclick="window.location.hash='#/releases'">
          <div>
            <div class="flex items-center justify-between text-text-muted mb-2">
              <span class="text-label-sm font-semibold uppercase tracking-wider">Target Release</span>
              <span class="material-symbols-outlined text-[20px] text-status-release">rocket_launch</span>
            </div>
            <div class="font-geist text-headline-sm font-bold text-text-primary truncate">${targetRelease ? targetRelease.name : 'No Active Release'}</div>
            <div class="flex items-center gap-1.5 font-jetbrains text-mono-md text-text-muted mt-1 mb-2">
              <span class="material-symbols-outlined text-[15px]">event</span>
              <span>${targetRelease ? `Target: ${formatDate(targetRelease.targetDate)}` : 'Milestone not scheduled'}</span>
            </div>
          </div>
          <div class="bg-surface-base/80 rounded-lg p-2.5 flex items-center justify-between font-jetbrains text-mono-md border border-border-subtle">
            <span class="text-text-secondary">${targetRelease?.taskIds ? targetRelease.taskIds.length : 0} Linked Tasks</span>
            <span class="px-2 py-0.5 rounded ${failedRuns > 0 ? 'bg-status-defect-surface text-status-defect' : 'bg-status-passed-surface text-status-passed'} font-semibold text-[10px]">
              ${failedRuns > 0 ? `${failedRuns} QA ISSUES` : 'RELEASE READY'}
            </span>
          </div>
        </div>
      </div>

      <!-- 1. End-to-End Lifecycle Traceability Ribbon Diagram -->
      <div class="relative z-10 bg-surface-canvas border border-border-subtle rounded-xl p-6 mb-8 shadow-md">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary-container/20 text-primary flex items-center justify-center">
              <span class="material-symbols-outlined text-[22px]">account_tree</span>
            </div>
            <div>
              <h2 class="font-geist text-headline-md font-bold text-text-primary">E2E Lifecycle Traceability Graph</h2>
              <p class="text-body-sm text-text-muted">Live audit trace linking specification -> task -> QA execution -> bug -> release cut</p>
            </div>
          </div>
          <div class="flex items-center gap-2 bg-surface-base px-3 py-1.5 rounded-lg border border-border-subtle">
            <span class="w-2.5 h-2.5 rounded-full ${failedRuns > 0 ? 'bg-status-defect animate-pulse' : 'bg-status-passed'}"></span>
            <span class="font-jetbrains text-mono-md text-text-secondary">Trace Chain Status:</span>
            <span class="font-jetbrains text-mono-md font-semibold ${failedRuns > 0 ? 'text-status-defect' : 'text-status-passed'}">
              ${failedRuns > 0 ? 'ACTIVE DEFECT IN CHAIN' : 'ALL ASSERTIONS PASSED'}
            </span>
          </div>
        </div>

        <!-- Ribbon Step Container -->
        <div class="relative overflow-x-auto pb-2">
          <div class="min-w-[960px] grid grid-cols-5 gap-4 relative items-stretch">
            <!-- Step 1: Requirement -->
            <div class="bg-surface-panel rounded-xl p-4 flex flex-col justify-between border border-border-subtle hover:border-primary/50 transition-all relative group cursor-pointer" onclick="window.location.hash='#/requirements'">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="px-2 py-0.5 rounded font-jetbrains text-mono-md bg-secondary/15 text-secondary font-semibold">${sampleReq ? (sampleReq.key || sampleReq.id) : 'REQ-SPEC'}</span>
                  <span class="font-jetbrains text-[10px] px-2 py-0.5 rounded ${sampleReq?.status === 'Implemented' ? 'bg-status-passed-surface text-status-passed' : 'bg-status-in-progress-surface text-status-in-progress'} font-semibold">
                    ${sampleReq ? sampleReq.status.toUpperCase() : 'NO SPECS'}
                  </span>
                </div>
                <div class="font-inter text-body-md text-text-primary font-semibold line-clamp-2 mb-2">
                  ${sampleReq ? sampleReq.title : 'Author project requirements & specifications'}
                </div>
              </div>
              <div class="flex items-center justify-between pt-2 border-t border-border-subtle/50 font-jetbrains text-[11px] text-text-muted">
                <span>${sampleReq ? (sampleReq.category || 'Specification') : '+ New Requirement'}</span>
                <span class="${sampleReq?.priority === 'Must' ? 'text-status-defect font-semibold' : 'text-secondary'}">${sampleReq ? `${sampleReq.priority} Have` : 'Scope'}</span>
              </div>
              <div class="absolute -right-3 top-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center w-6 h-6 rounded-full bg-surface-base border border-border-subtle text-text-muted shadow">
                <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
              </div>
            </div>

            <!-- Step 2: Task -->
            <div class="bg-surface-panel rounded-xl p-4 flex flex-col justify-between border border-border-subtle hover:border-primary/50 transition-all relative group cursor-pointer" onclick="window.location.hash='#/sprints'">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="px-2 py-0.5 rounded font-jetbrains text-mono-md bg-secondary/15 text-secondary font-semibold">${sampleTask ? (sampleTask.key || sampleTask.id) : 'SPRINT-TASK'}</span>
                  <span class="font-jetbrains text-[10px] px-2 py-0.5 rounded ${sampleTask?.status === 'Done' ? 'bg-status-passed-surface text-status-passed' : 'bg-surface-elevated text-text-secondary'} font-semibold">
                    ${sampleTask ? sampleTask.status.toUpperCase() : 'NO TASKS'}
                  </span>
                </div>
                <div class="font-inter text-body-md text-text-primary font-semibold line-clamp-2 mb-2">
                  ${sampleTask ? sampleTask.title : 'Decompose specifications into sprint tasks'}
                </div>
              </div>
              <div class="flex items-center justify-between pt-2 border-t border-border-subtle/50 font-jetbrains text-[11px] text-text-muted">
                <span>${sampleTask ? `${sampleTask.estimate || 3} Story Pts` : '+ Plan Sprints'}</span>
                <span class="text-secondary font-semibold">${sampleTask ? (sampleTask.assigneeName || 'Sprint Team') : 'Backlog'}</span>
              </div>
              <div class="absolute -right-3 top-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center w-6 h-6 rounded-full bg-surface-base border border-border-subtle text-text-muted shadow">
                <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
              </div>
            </div>

            <!-- Step 3: Test Run -->
            <div class="bg-surface-panel rounded-xl p-4 flex flex-col justify-between border ${failedRuns > 0 ? 'border-status-defect/60 bg-status-defect-surface/30' : (sampleRun ? 'border-status-passed/60 bg-status-passed-surface/20' : 'border-border-subtle')} relative group cursor-pointer" onclick="window.location.hash='#/tests'">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="px-2 py-0.5 rounded font-jetbrains text-mono-md ${sampleRun?.result === 'Failed' ? 'bg-status-defect/20 text-status-defect' : 'bg-status-passed-surface text-status-passed'} font-semibold">
                    ${sampleRun ? sampleRun.id : 'QA-VERIFY'}
                  </span>
                  <span class="font-jetbrains text-[10px] px-2 py-0.5 rounded ${sampleRun?.result === 'Passed' ? 'bg-status-passed text-on-primary' : (sampleRun?.result === 'Failed' ? 'bg-status-defect text-on-error animate-pulse' : 'bg-surface-elevated text-text-secondary')} font-semibold">
                    ${sampleRun ? sampleRun.result.toUpperCase() : 'NO RUNS'}
                  </span>
                </div>
                <div class="font-inter text-body-md text-text-primary font-semibold line-clamp-2 mb-2">
                  ${sampleRun ? `Test verification for ${sampleRun.testCaseId}` : 'Execute quality test assertions & test cases'}
                </div>
              </div>
              <div class="flex items-center justify-between pt-2 border-t border-border-subtle/50 font-jetbrains text-[11px] text-text-muted">
                <span class="truncate">${sampleRun ? (sampleRun.notes || 'Execution recorded') : '+ Execute QA Test'}</span>
                <span class="text-text-primary font-semibold">${sampleRun ? (store.getUser(sampleRun.executedBy)?.name || store.currentUser?.name || 'QA') : 'Validation'}</span>
              </div>
              <div class="absolute -right-3 top-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center w-6 h-6 rounded-full bg-surface-base border border-border-subtle text-text-muted shadow">
                <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
              </div>
            </div>

            <!-- Step 4: Bug / Defect -->
            <div class="bg-surface-panel rounded-xl p-4 flex flex-col justify-between border border-border-subtle hover:border-primary/50 transition-all relative group cursor-pointer" onclick="window.location.hash='#/bugs'">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="px-2 py-0.5 rounded font-jetbrains text-mono-md bg-status-defect-surface text-status-defect font-semibold">
                    ${sampleBug ? sampleBug.id : 'DEFECTS'}
                  </span>
                  <span class="font-jetbrains text-[10px] px-2 py-0.5 rounded ${sampleBug ? (sampleBug.status === 'Fixed' ? 'bg-status-passed-surface text-status-passed' : 'bg-status-defect text-on-error') : 'bg-status-passed-surface text-status-passed'} font-semibold">
                    ${sampleBug ? sampleBug.status.toUpperCase() : '0 REPORTED'}
                  </span>
                </div>
                <div class="font-inter text-body-md text-text-primary font-semibold line-clamp-2 mb-2">
                  ${sampleBug ? sampleBug.title : 'No active defects logged for this project'}
                </div>
              </div>
              <div class="flex items-center justify-between pt-2 border-t border-border-subtle/50 font-jetbrains text-[11px] text-text-muted">
                <span class="${sampleBug ? 'text-status-defect font-semibold' : 'text-status-passed font-semibold'}">${sampleBug ? `${sampleBug.severity} (${sampleBug.priority})` : 'Clean Telemetry'}</span>
                <span class="text-text-secondary">${sampleBug ? (store.getUser(sampleBug.reporterId)?.name || store.currentUser?.name || 'Reporter') : 'Zero Bugs'}</span>
              </div>
              <div class="absolute -right-3 top-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center w-6 h-6 rounded-full bg-surface-base border border-border-subtle text-text-muted shadow">
                <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
              </div>
            </div>

            <!-- Step 5: Release Container -->
            <div class="bg-surface-panel rounded-xl p-4 flex flex-col justify-between border border-border-subtle hover:border-primary/50 transition-all cursor-pointer" onclick="window.location.hash='#/releases'">
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="px-2 py-0.5 rounded font-jetbrains text-mono-md bg-status-release-surface text-status-release font-semibold">
                    ${sampleRel ? sampleRel.name : 'RELEASE'}
                  </span>
                  <span class="font-jetbrains text-[10px] px-2 py-0.5 rounded bg-status-in-progress-surface text-status-in-progress font-semibold">
                    ${sampleRel ? sampleRel.status.toUpperCase() : 'UNSCHEDULED'}
                  </span>
                </div>
                <div class="font-inter text-body-md text-text-primary font-semibold line-clamp-2 mb-2">
                  ${sampleRel ? (sampleRel.description || 'Target Release Milestone') : 'Package verified features into production release'}
                </div>
              </div>
              <div class="flex items-center justify-between pt-2 border-t border-border-subtle/50 font-jetbrains text-[11px] text-text-muted">
                <span>${sampleRel ? `Target: ${formatDate(sampleRel.targetDate)}` : '+ Schedule Release'}</span>
                <span class="${failedRuns > 0 ? 'text-status-defect' : 'text-status-passed'} font-semibold">
                  ${failedRuns > 0 ? 'Blocked' : 'Ready'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Middle Split: Sprint Burndown & Defect/Telemetry Panel -->
      <div class="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        <!-- Sprint Burndown & Velocity Widget (7 Cols) -->
        <div class="lg:col-span-7 bg-surface-canvas border border-border-subtle rounded-xl p-6 flex flex-col justify-between shadow-md">
          <div>
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="font-geist text-headline-sm font-bold text-text-primary">${activeSprint ? activeSprint.name : 'Sprint 1'} Burndown & Velocity</h3>
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
                    <stop offset="0%" stop-color="#c0c1ff" stop-opacity="0.3"></stop>
                    <stop offset="100%" stop-color="#c0c1ff" stop-opacity="0.0"></stop>
                  </linearGradient>
                </defs>
                <!-- Grid Lines -->
                <line stroke="#334155" stroke-opacity="0.3" stroke-width="1" x1="40" x2="480" y1="20" y2="20"></line>
                <line stroke="#334155" stroke-opacity="0.3" stroke-width="1" x1="40" x2="480" y1="65" y2="65"></line>
                <line stroke="#334155" stroke-opacity="0.3" stroke-width="1" x1="40" x2="480" y1="110" y2="110"></line>
                <line stroke="#334155" stroke-opacity="0.3" stroke-width="1" x1="40" x2="480" y1="155" y2="155"></line>

                <!-- Ideal Burndown Line (Dashed) -->
                <line stroke="#64748B" stroke-dasharray="4 4" stroke-width="2" x1="40" x2="480" y1="20" y2="155"></line>

                <!-- Actual Velocity Area & Line -->
                <polygon fill="url(#velocityFill)" points="40,20 128,45 216,75 304,115 304,155 40,155"></polygon>
                <polyline fill="none" stroke="#c0c1ff" stroke-linecap="round" stroke-linejoin="round" stroke-width="3" points="40,20 128,45 216,75 304,115"></polyline>

                <!-- Data Points -->
                <circle cx="40" cy="20" r="4" fill="#c0c1ff"></circle>
                <circle cx="128" cy="45" r="4" fill="#c0c1ff"></circle>
                <circle cx="216" cy="75" r="4" fill="#c0c1ff"></circle>
                <circle cx="304" cy="115" r="5" fill="#7bd0ff" stroke="#0B0F19" stroke-width="2"></circle>
              </svg>
            </div>
          </div>

          <div class="flex items-center justify-between text-body-sm text-text-muted pt-2 border-t border-border-subtle">
            <span>Sprint Goal: <strong class="text-text-primary">${activeSprint ? activeSprint.goal : 'Core Infrastructure'}</strong></span>
            <a href="#/sprints" class="text-primary hover:underline font-medium flex items-center gap-1">
              <span>View Sprint Board</span>
              <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
            </a>
          </div>
        </div>

        <!-- Defect Severity & QA Health Gauges (5 Cols) -->
        <div class="lg:col-span-5 bg-surface-canvas border border-border-subtle rounded-xl p-6 flex flex-col justify-between shadow-md">
          <div>
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-geist text-headline-sm font-bold text-text-primary">Defect Health & Severity</h3>
              <a href="#/bugs" class="text-label-sm text-secondary hover:underline">All Defects (${bugs.length})</a>
            </div>

            <!-- Defect List -->
            <div class="space-y-3 mb-4">
              ${bugs.length === 0 ? `
                <div class="p-6 text-center text-text-muted text-body-sm bg-surface-base/40 rounded-lg border border-border-subtle/50">
                  <span class="material-symbols-outlined text-[32px] text-status-passed mb-1 block">verified</span>
                  Zero active defects reported for this project.
                </div>
              ` : bugs.slice(0, 3).map(bug => `
                <div class="p-3 rounded-lg bg-surface-panel border border-border-subtle flex items-start justify-between gap-3 hover:border-border-strong transition-all">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                      ${severityChip(bug.severity)}
                      <span class="font-jetbrains text-mono-md text-text-muted">${bug.id}</span>
                      ${statusChip(bug.status)}
                    </div>
                    <h4 class="font-inter text-body-md text-text-primary font-medium line-clamp-1">${bug.title}</h4>
                  </div>
                  <button onclick="window.location.hash='#/bugs'" class="text-text-muted hover:text-text-primary material-symbols-outlined text-[18px]">open_in_new</button>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="p-3 bg-surface-base/80 rounded-lg border border-border-subtle flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-status-passed text-[20px]">check_circle</span>
              <span class="text-body-sm text-text-secondary">Release Gate Readiness</span>
            </div>
            <span class="font-jetbrains text-mono-md font-bold ${failedRuns > 0 ? 'text-status-in-progress' : 'text-status-passed'}">
              ${failedRuns > 0 ? 'NEEDS RETEST' : 'PASSED'}
            </span>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach modal triggers
  container.querySelector('#dash-new-req-btn')?.addEventListener('click', () => openNewRequirementModal(project.id));
  container.querySelector('#dash-log-defect-btn')?.addEventListener('click', () => openNewDefectModal(project.id));
  container.querySelector('#dash-exec-test-btn')?.addEventListener('click', () => openNewTestRunModal(project.id));
  container.querySelector('#dash-ci-btn')?.addEventListener('click', () => { window.location.hash = '#/ci-cd'; });
  container.querySelector('#dash-view-invites-btn')?.addEventListener('click', () => openInvitationsInboxModal(() => renderDashboard(container)));
}


function openNewRequirementModal(projectId) {
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
        <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-secondary hover:bg-surface-elevated text-body-md">Cancel</button>
        <button type="submit" class="px-4 py-2 rounded-lg bg-primary text-on-primary font-semibold text-body-md hover:bg-primary-fixed">Create Requirement</button>
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

function openNewDefectModal(projectId) {
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
            ${reqs.map(r => `<option value="${r.id}">${r.title}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-label-md text-text-secondary mb-1">Linked Task</label>
          <select id="defect-task" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none">
            <option value="">None</option>
            ${tasks.map(t => `<option value="${t.id}">${t.title}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="flex justify-end gap-3 pt-2">
        <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-secondary hover:bg-surface-elevated text-body-md">Cancel</button>
        <button type="submit" class="px-4 py-2 rounded-lg bg-status-defect text-on-error font-semibold text-body-md hover:brightness-110">Log Defect</button>
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

function openNewTestRunModal(projectId) {
  const testCases = store.getTestCases(projectId);

  showModal(`
    <form id="new-testrun-form" class="space-y-4">
      <div>
        <label class="block text-label-md text-text-secondary mb-1">Select Test Case *</label>
        <select id="run-tc" required class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none">
          ${testCases.map(tc => `<option value="${tc.id}">${tc.title}</option>`).join('')}
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
        <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-secondary hover:bg-surface-elevated text-body-md">Cancel</button>
        <button type="submit" class="px-4 py-2 rounded-lg bg-primary text-on-primary font-semibold text-body-md hover:bg-primary-fixed">Record Test Run</button>
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
