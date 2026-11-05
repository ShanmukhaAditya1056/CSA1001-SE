import fs from 'fs';

const filePath = 'src/pages/dashboard.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add import
if (!content.includes("from '../analytics.js'")) {
  content = content.replace(
    "import { openInvitationsInboxModal } from '../main.js';",
    "import { openInvitationsInboxModal } from '../main.js';\r\nimport { computeFlowMetrics } from '../analytics.js';"
  );
}

// 2. Add header button
const targetToolbar = '<!-- Cockpit Header Toolbar -->\r\n        <div class="flex items-center flex-wrap gap-2.5">';
const replacementToolbar = `<!-- Cockpit Header Toolbar -->
        <div class="flex items-center flex-wrap gap-2.5">
          <!-- Flow & DORA Analytics Suite -->
          <button id="open-flow-analytics-btn" class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 font-inter text-label-md transition-all shadow-sm active:scale-95 cursor-pointer" title="View DORA 4 Metrics, Flow Distribution & Velocity Analytics">
            <span class="material-symbols-outlined text-[18px]">monitoring</span>
            <span>Flow & DORA Analytics</span>
          </button>`;

if (!content.includes('id="open-flow-analytics-btn"')) {
  // Try CRLF first, if not try LF
  if (content.includes(targetToolbar)) {
    content = content.replace(targetToolbar, replacementToolbar);
  } else {
    content = content.replace(
      '<!-- Cockpit Header Toolbar -->\n        <div class="flex items-center flex-wrap gap-2.5">',
      replacementToolbar.replace(/\r\n/g, '\n')
    );
  }
}

// 3. Add listener
const targetListener = "container.querySelector('#dash-view-invites-btn')?.addEventListener('click', () => {";
const replacementListener = `container.querySelector('#open-flow-analytics-btn')?.addEventListener('click', () => {
    openFlowAnalyticsModal(project.id);
  });

  container.querySelector('#dash-view-invites-btn')?.addEventListener('click', () => {`;

if (!content.includes("openFlowAnalyticsModal(project.id)")) {
  if (content.includes(targetListener)) {
    content = content.replace(targetListener, replacementListener);
  } else {
    console.error('Target listener not found');
  }
}

// 4. Append openFlowAnalyticsModal
const modalFunc = `

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
    return \`<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border \${c}">\${rating}</span>\`;
  };

  const statusProgressColors = {
    'Backlog': 'bg-surface-elevated',
    'To Do': 'bg-secondary',
    'In Progress': 'bg-primary',
    'In Review': 'bg-amber-400',
    'Done': 'bg-emerald-400'
  };

  const content = \`
    <div class="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
      <!-- Header Overview Banner -->
      <div class="p-4 rounded-xl bg-surface-panel border border-border-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="font-jetbrains text-mono-xs text-text-muted uppercase">\${escapeHtml(metrics.projectKey)} PROGRAM FLOW</span>
            <span class="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">DevOps Research & Assessment</span>
          </div>
          <h3 class="font-geist text-title-lg font-bold text-text-primary">\${escapeHtml(metrics.projectName)} Engineering Throughput</h3>
          <p class="text-text-muted text-body-xs mt-0.5">Continuous Delivery cadence, lead time efficiency, and delivery reliability metrics.</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="text-right">
            <div class="text-title-md font-bold text-text-primary font-jetbrains">\${metrics.completedPoints} / \${metrics.totalPoints} pts</div>
            <div class="text-[11px] text-text-muted">\${metrics.completionPct}% Delivery Progress</div>
          </div>
          <div class="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary flex items-center justify-center font-jetbrains font-bold text-xs text-text-primary">
            \${metrics.completionPct}%
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
              \${getRatingBadge(metrics.dora.deploymentFrequency.rating)}
            </div>
            <div class="font-jetbrains text-headline-sm font-bold text-text-primary mb-1">
              \${escapeHtml(metrics.dora.deploymentFrequency.value)}
            </div>
            <div class="text-[11px] text-text-muted">Cadence of successful releases into production</div>
          </div>

          <!-- Lead Time for Changes -->
          <div class="p-3.5 rounded-xl bg-surface-base border border-border-subtle flex flex-col justify-between">
            <div class="flex items-center justify-between mb-2">
              <span class="text-body-xs text-text-muted font-medium">Lead Time for Changes</span>
              \${getRatingBadge(metrics.dora.leadTimeForChanges.rating)}
            </div>
            <div class="font-jetbrains text-headline-sm font-bold text-text-primary mb-1">
              \${escapeHtml(metrics.dora.leadTimeForChanges.value)}
            </div>
            <div class="text-[11px] text-text-muted">Commit to verified production code</div>
          </div>

          <!-- Change Failure Rate -->
          <div class="p-3.5 rounded-xl bg-surface-base border border-border-subtle flex flex-col justify-between">
            <div class="flex items-center justify-between mb-2">
              <span class="text-body-xs text-text-muted font-medium">Change Failure Rate</span>
              \${getRatingBadge(metrics.dora.changeFailureRate.rating)}
            </div>
            <div class="font-jetbrains text-headline-sm font-bold text-text-primary mb-1">
              \${escapeHtml(metrics.dora.changeFailureRate.value.split('%')[0])}%
            </div>
            <div class="text-[11px] text-text-muted">Critical defects following release deployment</div>
          </div>

          <!-- MTTR -->
          <div class="p-3.5 rounded-xl bg-surface-base border border-border-subtle flex flex-col justify-between">
            <div class="flex items-center justify-between mb-2">
              <span class="text-body-xs text-text-muted font-medium">Time to Restore (MTTR)</span>
              \${getRatingBadge(metrics.dora.timeToRestoreService.rating)}
            </div>
            <div class="font-jetbrains text-headline-sm font-bold text-text-primary mb-1">
              \${escapeHtml(metrics.dora.timeToRestoreService.value)}
            </div>
            <div class="text-[11px] text-text-muted">Mean time to mitigate critical defects</div>
          </div>
        </div>
      </div>

      <!-- Bottleneck Alert (if active) -->
      \${metrics.bottleneckAlert ? \`
        <div class="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <span class="material-symbols-outlined text-amber-400 text-[22px] shrink-0 mt-0.5">warning</span>
          <div>
            <div class="font-geist text-body-sm font-bold text-amber-300">Flow Constraint Detected in [\${escapeHtml(metrics.bottleneckAlert.stage)}]</div>
            <div class="text-body-xs text-amber-200/90 mt-0.5">\${escapeHtml(metrics.bottleneckAlert.message)}</div>
          </div>
        </div>
      \` : ''}

      <!-- Cycle Time vs Lead Time Breakdown -->
      <div class="p-4 rounded-xl bg-surface-base border border-border-subtle space-y-3">
        <div class="flex items-center justify-between">
          <h4 class="font-geist text-title-sm font-bold text-text-primary flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px] text-secondary">timelapse</span>
            <span>Cycle Time vs Lead Time Efficiency</span>
          </h4>
          <span class="font-jetbrains text-mono-sm text-text-secondary">Avg Cycle: <strong>\${metrics.cycleTime.avgCycleTimeDays}d</strong> / Lead: <strong>\${metrics.cycleTime.avgLeadTimeDays}d</strong></span>
        </div>
        <div class="space-y-1.5">
          <div class="flex items-center justify-between text-body-xs text-text-muted">
            <span>Active Development (~\${metrics.cycleTime.devTimeDays}d)</span>
            <span>Code Review & Verification (~\${metrics.cycleTime.reviewTimeDays}d)</span>
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
          <span class="text-body-xs text-text-muted">\${metrics.flowDistribution.reduce((a, c) => a + c.count, 0)} total active items</span>
        </div>
        <div class="w-full h-4 rounded-full bg-surface-elevated overflow-hidden flex">
          \${metrics.flowDistribution.map(col => {
            const pct = metrics.totalPoints > 0 ? (col.points / metrics.totalPoints) * 100 : 20;
            return \`<div class="\${statusProgressColors[col.status] || 'bg-surface-elevated'} h-full transition-all" style="width: \${pct}%" title="\${col.status}: \${col.points} pts (\${col.count} tasks)"></div>\`;
          }).join('')}
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
          \${metrics.flowDistribution.map(col => \`
            <div class="p-2.5 rounded-lg bg-surface-panel border border-border-subtle/50 text-center">
              <div class="text-[11px] font-medium text-text-muted mb-0.5">\${escapeHtml(col.status)}</div>
              <div class="font-jetbrains font-bold text-title-sm text-text-primary">\${col.count} <span class="text-[10px] text-text-muted font-normal">cards</span></div>
              <div class="text-[10px] text-text-secondary font-jetbrains">\${col.points} pts</div>
            </div>
          \`).join('')}
        </div>
      </div>

      <!-- Multi-Sprint Velocity & Reliability History -->
      <div class="p-4 rounded-xl bg-surface-base border border-border-subtle space-y-3">
        <div class="flex items-center justify-between">
          <h4 class="font-geist text-title-sm font-bold text-text-primary flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px] text-emerald-400">trending_up</span>
            <span>Multi-Sprint Velocity & Predictability</span>
          </h4>
          <span class="font-jetbrains text-mono-sm text-emerald-400 font-semibold">Rolling Velocity: \${metrics.avgVelocity} pts/sprint</span>
        </div>
        \${metrics.sprintHistory.length > 0 ? \`
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
                \${metrics.sprintHistory.map(s => \`
                  <tr class="hover:bg-surface-panel/50 transition-colors">
                    <td class="py-2 px-3 font-medium text-text-primary">\${escapeHtml(s.name)}</td>
                    <td class="py-2 px-3 text-center">
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold \${s.status === 'Active' ? 'bg-primary/20 text-primary' : 'bg-surface-elevated text-text-muted'}">\${s.status}</span>
                    </td>
                    <td class="py-2 px-3 text-right font-jetbrains text-text-secondary">\${s.planned} pts</td>
                    <td class="py-2 px-3 text-right font-jetbrains font-semibold text-emerald-400">\${s.completed} pts</td>
                    <td class="py-2 px-3 text-right font-jetbrains">
                      <span class="\${s.reliability >= 80 ? 'text-emerald-400' : s.reliability >= 50 ? 'text-amber-400' : 'text-rose-400'} font-semibold">\${s.reliability}%</span>
                    </td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          </div>
        \` : \`
          <div class="text-center py-4 text-text-muted text-body-xs">No sprint velocity history recorded yet.</div>
        \`}
      </div>

      <!-- Footer Actions -->
      <div class="flex justify-end pt-2">
        <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-primary text-body-sm font-medium border border-border-subtle cursor-pointer transition-colors">Close</button>
      </div>
    </div>
  \`;

  showModal(content, { title: 'Executive Engineering Flow & DORA Metrics', width: 'max-w-4xl' });
}
`;

if (!content.includes('function openFlowAnalyticsModal')) {
  content = content + modalFunc;
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully injected Flow Modal into dashboard.js');

