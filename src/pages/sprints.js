// DevTrack Sprint Board & Task Management + Sortable DnD + WIP Bottlenecks + Swimlanes
import { store } from '../store.js';
import { priorityChip, statusChip, avatar, formatDate, showToast, showModal, closeModal, showConfirm, escapeHtml } from '../ui.js';
import { TASK_TRANSITIONS, canTransitionTask, validateSprintDates } from '../rules.js';
import { teamCollab, getTeamPreferences } from '../collab.js';
import { generateBranchName, recordGitCommit, updatePullRequest } from '../gitops.js';
import Sortable from 'sortablejs';

let selectedSprintId = 'ALL';
let selectedGroupBy = 'none'; // 'none' | 'assignee' | 'epic'
let sortableInstances = [];

const DEFAULT_WIP_LIMITS = {
  'Backlog': 0,
  'To Do': 0,
  'In Progress': 3,
  'In Review': 2,
  'Done': 0
};

function getWipLimits(projectId) {
  try {
    const raw = localStorage.getItem(`devtrack_wip_${projectId}`);
    return raw ? { ...DEFAULT_WIP_LIMITS, ...JSON.parse(raw) } : { ...DEFAULT_WIP_LIMITS };
  } catch {
    return { ...DEFAULT_WIP_LIMITS };
  }
}

function saveWipLimits(projectId, limits) {
  try {
    localStorage.setItem(`devtrack_wip_${projectId}`, JSON.stringify(limits));
  } catch (err) {
    console.warn('[WIP] Failed to save WIP limits:', err);
  }
}

// Generate formatted unique task key e.g. DEV-101
function formatTaskKey(projectKey, task, allTasks) {
  const idx = allTasks.findIndex(t => t.id === task.id);
  const num = idx !== -1 ? 101 + idx : 101;
  const rawPrefix = (projectKey || 'TASK').replace(/[^a-zA-Z0-9]/g, '');
  const prefix = (rawPrefix.slice(0, 4) || 'DEV').toUpperCase();
  return `${prefix}-${num}`;
}

export function renderSprints(container) {
  // Clean up any previous sortable instances to prevent memory leaks
  sortableInstances.forEach(s => s.destroy());
  sortableInstances = [];

  const project = store.getActiveProject();
  if (!project) {
    container.innerHTML = `<div class="p-12 text-center text-text-muted">Select or create a project first.</div>`;
    return;
  }

  const sprints = store.getSprints(project.id);
  const allTasks = store.getTasks(project.id);
  const members = store.getMembers(project.id);
  const reqs = store.getRequirements(project.id);
  const wipLimits = getWipLimits(project.id);

  // If no sprint explicitly selected, pick first active sprint or first sprint
  if (selectedSprintId === 'ALL' && sprints.length > 0) {
    const active = sprints.find(s => s.status === 'Active');
    selectedSprintId = active ? active.id : sprints[0].id;
  }

  const currentSprint = sprints.find(s => s.id === selectedSprintId);
  const filteredTasks = selectedSprintId === 'BACKLOG'
    ? allTasks.filter(t => !t.sprintId)
    : selectedSprintId === 'ALL_SPRINTS'
    ? allTasks
    : allTasks.filter(t => t.sprintId === selectedSprintId);

  const columns = [
    { key: 'Backlog', label: 'Backlog', icon: 'inventory_2', color: 'text-text-muted' },
    { key: 'To Do', label: 'To Do', icon: 'pending_actions', color: 'text-text-secondary' },
    { key: 'In Progress', label: 'In Progress', icon: 'hourglass_top', color: 'text-status-in-progress' },
    { key: 'In Review', label: 'In Review', icon: 'rate_review', color: 'text-status-release' },
    { key: 'Done', label: 'Done', icon: 'task_alt', color: 'text-status-passed' }
  ];

  // Story point totals
  const totalPts = filteredTasks.reduce((acc, t) => acc + (t.estimate || 3), 0);
  const donePts = filteredTasks.filter(t => t.status === 'Done').reduce((acc, t) => acc + (t.estimate || 3), 0);
  const pct = totalPts > 0 ? Math.round((donePts / totalPts) * 100) : 0;

  // Build Swimlane groupings
  let swimlanes = [];
  if (selectedGroupBy === 'assignee') {
    // Group by Assignee
    members.forEach(m => {
      const memberTasks = filteredTasks.filter(t => t.assigneeId === m.userId);
      swimlanes.push({
        id: m.userId,
        title: m.userName,
        subtitle: m.role || 'Member',
        avatarHtml: avatar(m.userName, 'w-6 h-6 text-[10px]'),
        tasks: memberTasks
      });
    });
    // Unassigned swimlane
    const unassignedTasks = filteredTasks.filter(t => !t.assigneeId || !members.some(m => m.userId === t.assigneeId));
    if (unassignedTasks.length > 0 || members.length === 0) {
      swimlanes.push({
        id: 'unassigned',
        title: 'Unassigned Tasks',
        subtitle: 'Needs Owner',
        avatarHtml: `<span class="w-6 h-6 rounded-full bg-surface-elevated text-text-muted text-[10px] flex items-center justify-center font-jetbrains">?</span>`,
        tasks: unassignedTasks
      });
    }
  } else if (selectedGroupBy === 'epic') {
    // Group by Requirement / Epic
    reqs.forEach(r => {
      const epicTasks = filteredTasks.filter(t => t.requirementIds?.includes(r.id));
      swimlanes.push({
        id: r.id,
        title: r.title,
        subtitle: `MoSCoW: ${r.priority} | ID: ${r.id}`,
        avatarHtml: `<span class="material-symbols-outlined text-[18px] text-primary">rule</span>`,
        tasks: epicTasks
      });
    });
    // Technical Debt / Unlinked swimlane
    const unlinkedTasks = filteredTasks.filter(t => !t.requirementIds || t.requirementIds.length === 0);
    if (unlinkedTasks.length > 0 || reqs.length === 0) {
      swimlanes.push({
        id: 'unlinked',
        title: 'Technical Debt / Unlinked Tasks',
        subtitle: 'Independent engineering tasks',
        avatarHtml: `<span class="material-symbols-outlined text-[18px] text-text-muted">build</span>`,
        tasks: unlinkedTasks
      });
    }
  }

  container.innerHTML = `
    <div class="relative w-full px-6 py-6 pb-20">
      <!-- Ambient Glow -->
      <div class="absolute -top-32 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Action & Context Header -->
      <div class="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div class="flex items-center gap-2 font-jetbrains text-mono-md text-text-muted mb-1">
            <span>${escapeHtml(project.key)}</span>
            <span>/</span>
            <span class="text-secondary font-medium">LIFECYCLE PLANNING</span>
            <span>/</span>
            <span class="text-text-primary">AGILE SPRINT BOARD</span>
            <span class="px-2 py-0.5 rounded-full bg-surface-elevated text-text-muted text-[11px] font-semibold ml-2">
              ${filteredTasks.length} TASKS
            </span>
          </div>
          <h1 class="font-geist text-headline-xl font-bold text-text-primary tracking-tight">Sprint Board & Task Execution</h1>
          <p class="text-body-sm text-text-muted mt-1">Interactive Kanban board with WIP bottleneck detection, swimlanes, and smooth drag-and-drop</p>
        </div>

        <div class="flex items-center flex-wrap gap-2.5">
          <!-- Burndown Chart & Velocity Analytics Button -->
          <button id="open-burndown-btn" class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-primary font-inter text-label-md border border-border-subtle transition-all cursor-pointer shadow-sm active:scale-95" title="View Sprint Burndown & Velocity Analytics">
            <span class="material-symbols-outlined text-[18px] text-primary">show_chart</span>
            <span>Burndown Chart</span>
          </button>

          <!-- WIP Limits Config Button -->
          <button id="configure-wip-btn" class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-primary font-inter text-label-md border border-border-subtle transition-all cursor-pointer shadow-sm active:scale-95" title="Configure Work-In-Progress limits">
            <span class="material-symbols-outlined text-[18px] text-secondary">tune</span>
            <span>WIP Limits</span>
          </button>

          <!-- New Sprint Button -->
          <button id="add-sprint-btn" class="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-primary font-medium text-label-md border border-border-subtle transition-all cursor-pointer shadow-sm active:scale-95">
            <span class="material-symbols-outlined text-[18px]">calendar_add_on</span>
            <span>New Sprint</span>
          </button>

          <!-- Add Task Button -->
          <button id="add-task-btn" class="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-fixed text-on-primary font-semibold text-label-md transition-all shadow-md shadow-primary/20 active:scale-95 cursor-pointer">
            <span class="material-symbols-outlined text-[18px]">add_task</span>
            <span>+ Add Task</span>
          </button>
        </div>
      </div>

      <!-- Sprint Selector, Swimlanes & Status Banner -->
      <div class="relative z-10 bg-surface-canvas border border-border-subtle rounded-xl p-4 mb-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div class="flex items-center flex-wrap gap-3">
          <!-- Sprint Selector -->
          <div class="flex items-center gap-2">
            <label class="text-[12px] text-text-muted font-jetbrains uppercase">Sprint:</label>
            <select id="sprint-select" class="bg-surface-base text-text-primary font-semibold text-body-sm px-3 py-1.5 rounded-lg border border-border-subtle focus:border-primary outline-none cursor-pointer">
              ${sprints.map(s => `<option value="${s.id}" ${s.id === selectedSprintId ? 'selected' : ''}>${escapeHtml(s.name)} (${s.status})</option>`).join('')}
              <option value="BACKLOG" ${selectedSprintId === 'BACKLOG' ? 'selected' : ''}>Unassigned Backlog</option>
              <option value="ALL_SPRINTS" ${selectedSprintId === 'ALL_SPRINTS' ? 'selected' : ''}>All Tasks Across Sprints</option>
            </select>
          </div>

          <!-- Swimlanes Grouping Dropdown -->
          <div class="flex items-center gap-2 pl-2 border-l border-border-subtle">
            <label class="text-[12px] text-text-muted font-jetbrains uppercase">Swimlanes:</label>
            <select id="swimlane-select" class="bg-surface-base text-text-primary text-body-sm px-3 py-1.5 rounded-lg border border-border-subtle focus:border-primary outline-none cursor-pointer">
              <option value="none" ${selectedGroupBy === 'none' ? 'selected' : ''}>None (Standard 5 Columns)</option>
              <option value="assignee" ${selectedGroupBy === 'assignee' ? 'selected' : ''}>Group by Assignee</option>
              <option value="epic" ${selectedGroupBy === 'epic' ? 'selected' : ''}>Group by Epic / Requirement</option>
            </select>
          </div>

          ${currentSprint ? `
            <span class="font-jetbrains text-[10px] px-2 py-0.5 rounded-full ${currentSprint.status === 'Active' ? 'bg-status-in-progress-surface text-status-in-progress border border-status-in-progress/30' : 'bg-status-passed-surface text-status-passed border border-status-passed/30'} font-bold">
              ${currentSprint.status.toUpperCase()}
            </span>
            <span class="text-body-sm text-text-muted hidden xl:inline">
              ${formatDate(currentSprint.startDate)} &mdash; ${formatDate(currentSprint.endDate)}
            </span>
          ` : ''}
        </div>

        <!-- Velocity & Story Points -->
        <div id="velocity-banner-btn" class="flex items-center gap-4 font-jetbrains text-mono-md cursor-pointer hover:opacity-85 transition-opacity" title="Click to open Burndown & Velocity Analytics">
          <div class="flex items-center gap-2 text-[12px]">
            <span class="text-text-muted">Sprint Velocity:</span>
            <span class="font-bold text-text-primary">${donePts} / ${totalPts} pts</span>
            <span class="text-secondary font-semibold">(${pct}%)</span>
          </div>
          <div class="w-28 bg-surface-base h-2 rounded-full overflow-hidden border border-border-subtle">
            <div class="bg-secondary h-full rounded-full transition-all duration-300" style="width: ${pct}%"></div>
          </div>
        </div>
      </div>

      <!-- KANBAN BOARD CONTAINER -->
      ${selectedGroupBy === 'none' ? `
        <!-- Standard 5-Column Board with WIP Bottleneck Highlighting -->
        <div class="relative z-10 flex gap-4 items-start overflow-x-auto pb-6 scrollbar-thin">
          ${columns.map(col => {
            const colTasks = filteredTasks.filter(t => t.status === col.key);
            const colPts = colTasks.reduce((acc, t) => acc + (t.estimate || 3), 0);
            const limit = wipLimits[col.key] || 0;
            const isExceeded = limit > 0 && colTasks.length > limit;
            const isAtLimit = limit > 0 && colTasks.length === limit;

            return `
              <div class="w-[270px] min-w-[260px] flex-1 bg-surface-canvas/90 border ${isExceeded ? 'border-status-defect ring-2 ring-status-defect/40 bg-status-defect/[0.03]' : isAtLimit ? 'border-amber-500 ring-1 ring-amber-500/30' : 'border-border-subtle'} rounded-xl p-3 flex flex-col min-h-[550px] shadow-sm transition-all shrink-0" data-column="${col.key}">
                
                <!-- Column Header with WIP Status -->
                <div class="pb-3 mb-3 border-b ${isExceeded ? 'border-status-defect/40 bg-status-defect-surface -m-3 p-3 rounded-t-xl mb-3' : isAtLimit ? 'border-amber-500/30 bg-amber-500/10 -m-3 p-3 rounded-t-xl mb-3' : 'border-border-subtle'} flex items-center justify-between">
                  <div>
                    <div class="flex items-center gap-1.5">
                      <span class="material-symbols-outlined text-[18px] ${isExceeded ? 'text-status-defect animate-bounce' : col.color}">${col.icon}</span>
                      <span class="font-geist text-label-md font-bold text-text-primary">${col.label}</span>
                      <span class="font-jetbrains text-[10px] px-1.5 py-0.2 rounded-full ${isExceeded ? 'bg-status-defect text-on-error font-bold' : isAtLimit ? 'bg-amber-500 text-black font-bold' : 'bg-surface-panel text-text-muted font-bold'}">
                        ${colTasks.length}${limit > 0 ? ` / ${limit}` : ''}
                      </span>
                    </div>

                    <!-- Bottleneck Alert Badges -->
                    ${isExceeded ? `
                      <div class="text-[10px] font-jetbrains text-status-defect font-bold mt-1 flex items-center gap-1 animate-pulse">
                        <span class="material-symbols-outlined text-[13px]">warning</span>
                        <span>BOTTLENECK: WIP EXCEEDED</span>
                      </div>
                    ` : isAtLimit ? `
                      <div class="text-[10px] font-jetbrains text-amber-500 font-semibold mt-1">
                        At capacity limit (${limit})
                      </div>
                    ` : ''}
                  </div>

                  <span class="font-jetbrains text-[11px] text-text-muted font-semibold">${colPts} pts</span>
                </div>

                <!-- Sortable Drag & Drop Zone -->
                <div class="kanban-dropzone space-y-3 flex-1 min-h-[400px]" data-column="${col.key}">
                  ${colTasks.map(task => renderTaskCard(task, project, allTasks, members, reqs, columns)).join('')}
                  ${colTasks.length === 0 ? `
                    <div class="empty-drop-placeholder p-6 text-center text-text-muted text-[11px] font-jetbrains border border-dashed border-border-subtle/80 rounded-xl pointer-events-none">
                      Drop tasks here
                    </div>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : `
        <!-- Swimlanes Grouped Board -->
        <div class="relative z-10 space-y-6">
          ${swimlanes.map(lane => {
            const laneTasks = lane.tasks;
            const lanePts = laneTasks.reduce((acc, t) => acc + (t.estimate || 3), 0);

            return `
              <div class="bg-surface-canvas border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
                <!-- Swimlane Header -->
                <div class="p-4 bg-surface-panel/60 border-b border-border-subtle flex items-center justify-between gap-4">
                  <div class="flex items-center gap-3">
                    <div class="shrink-0 flex items-center justify-center">
                      ${lane.avatarHtml}
                    </div>
                    <div>
                      <h3 class="font-geist text-body-md font-bold text-text-primary">${escapeHtml(lane.title)}</h3>
                      <p class="text-[11px] text-text-muted font-jetbrains">${escapeHtml(lane.subtitle)}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-3 font-jetbrains text-[11px] text-text-muted">
                    <span class="px-2 py-0.5 rounded bg-surface-base font-semibold text-text-primary">${laneTasks.length} tasks</span>
                    <span class="px-2 py-0.5 rounded bg-primary-container/20 text-primary font-bold">${lanePts} pts</span>
                  </div>
                </div>

                <!-- 5 Swimlane Column Grid -->
                <div class="p-4 flex gap-3 overflow-x-auto pb-4 scrollbar-thin bg-surface-base/30">
                  ${columns.map(col => {
                    const colTasks = laneTasks.filter(t => t.status === col.key);

                    return `
                      <div class="w-[250px] min-w-[230px] flex-1 bg-surface-canvas/60 border border-border-subtle/70 rounded-xl p-2.5 flex flex-col min-h-[220px] shrink-0">
                        <div class="flex items-center justify-between pb-2 mb-2 border-b border-border-subtle/60 text-[11px] font-jetbrains">
                          <span class="text-text-muted font-semibold flex items-center gap-1">
                            <span class="material-symbols-outlined text-[14px] ${col.color}">${col.icon}</span>
                            ${col.label}
                          </span>
                          <span class="px-1.5 py-0.2 rounded bg-surface-panel text-text-muted text-[10px] font-bold">${colTasks.length}</span>
                        </div>

                        <!-- Dropzone for this swimlane & column -->
                        <div class="kanban-dropzone space-y-2 flex-1 min-h-[160px]" data-column="${col.key}" data-lane="${lane.id}">
                          ${colTasks.map(task => renderTaskCard(task, project, allTasks, members, reqs, columns)).join('')}
                          ${colTasks.length === 0 ? `
                            <div class="empty-drop-placeholder p-4 text-center text-text-muted/60 text-[10px] font-jetbrains border border-dashed border-border-subtle/50 rounded-lg pointer-events-none">
                              Empty
                            </div>
                          ` : ''}
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;

  // Attach Sprint select change
  const sprintSelect = container.querySelector('#sprint-select');
  sprintSelect?.addEventListener('change', (e) => {
    selectedSprintId = e.target.value;
    renderSprints(container);
  });

  // Attach Swimlane select change
  const swimlaneSelect = container.querySelector('#swimlane-select');
  swimlaneSelect?.addEventListener('change', (e) => {
    selectedGroupBy = e.target.value;
    renderSprints(container);
  });

  // Attach Burndown Modal trigger
  const triggerBurndown = () => {
    openBurndownModal(project, currentSprint, filteredTasks, allTasks);
  };
  container.querySelector('#open-burndown-btn')?.addEventListener('click', triggerBurndown);
  container.querySelector('#velocity-banner-btn')?.addEventListener('click', triggerBurndown);

  // Attach WIP Configuration trigger
  container.querySelector('#configure-wip-btn')?.addEventListener('click', () => {
    openWipConfigModal(project.id, () => renderSprints(container));
  });

  // Attach Add Task trigger
  container.querySelector('#add-task-btn')?.addEventListener('click', () => {
    openTaskModal(project.id, null, () => renderSprints(container));
  });

  // Attach Add Sprint trigger
  container.querySelector('#add-sprint-btn')?.addEventListener('click', () => {
    openSprintModal(project.id, () => renderSprints(container));
  });

  // Attach Task Card click to open Edit Modal
  container.querySelectorAll('.task-card-item').forEach(card => {
    card.addEventListener('click', (e) => {
      // Ignore if clicking dropdown or buttons
      if (e.target.closest('.no-card-click')) return;
      const taskId = card.dataset.id;
      const task = allTasks.find(t => t.id === taskId);
      if (task) openTaskModal(project.id, task, () => renderSprints(container));
    });
  });

  // Attach status change on individual tasks dropdown
  container.querySelectorAll('.task-status-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const taskId = sel.dataset.id;
      const newStatus = e.target.value;
      const res = store.updateTask(taskId, { status: newStatus });
      if (res.error) showToast(res.error, 'error');
      else showToast(`Task moved to ${newStatus}`, 'info');
      renderSprints(container);
    });
  });

  // Initialize Robust Sortable Drag and Drop
  initKanbanSortable(container, project);
}

// ===== RENDER TASK CARD =====
function renderTaskCard(task, project, allTasks, members, reqs, columns) {
  const assignee = members.find(m => m.userId === task.assigneeId);
  const req = reqs.find(r => task.requirementIds?.includes(r.id));
  const taskKey = formatTaskKey(project.key, task, allTasks);

  // Priority styling and icons
  let priorityBg = 'bg-surface-base text-text-muted border border-border-subtle';
  let priorityIcon = 'check';
  if (task.priority === 'High') {
    priorityBg = 'bg-status-defect-surface text-status-defect border border-status-defect/30 font-bold';
    priorityIcon = 'local_fire_department';
  } else if (task.priority === 'Medium') {
    priorityBg = 'bg-status-in-progress-surface text-status-in-progress border border-status-in-progress/30 font-semibold';
    priorityIcon = 'trending_up';
  }

  // Due date calculation
  const isOverdue = task.dueDate && new Date(task.dueDate).getTime() < Date.now() && task.status !== 'Done';

  return `
    <div class="task-card-item bg-surface-panel rounded-xl p-3 border border-border-subtle hover:border-primary/50 shadow-sm transition-all group cursor-grab active:cursor-grabbing hover:shadow-md select-none w-full overflow-hidden" data-id="${task.id}" data-status="${task.status}">
      
      <!-- Top Meta: Clean Short Task Key (e.g. MULE-101), Priority Chip & Story Points -->
      <div class="flex items-center justify-between gap-1.5 mb-2">
        <div class="flex items-center gap-1.5 min-w-0">
          <span class="font-jetbrains text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary-container/20 text-primary border border-primary/20 shrink-0">
            ${taskKey}
          </span>
          <span class="inline-flex items-center gap-0.5 text-[9px] font-jetbrains px-1.5 py-0.5 rounded ${priorityBg} shrink-0" title="Priority: ${task.priority}">
            <span class="material-symbols-outlined text-[12px]">${priorityIcon}</span>
            <span>${task.priority}</span>
          </span>
        </div>

        <span class="font-jetbrains text-[10px] px-1.5 py-0.5 rounded bg-surface-base text-text-primary font-bold border border-border-subtle shadow-xs shrink-0">
          ${task.estimate || 3} SP
        </span>
      </div>

      <!-- Task Title -->
      <h4 class="font-geist text-[13px] font-bold text-text-primary mb-1 break-words line-clamp-2 leading-snug group-hover:text-primary transition-colors">
        ${escapeHtml(task.title)}
      </h4>

      ${task.description ? `
        <p class="text-[11px] text-text-muted line-clamp-2 mb-2 leading-relaxed break-words">${escapeHtml(task.description)}</p>
      ` : ''}

      <!-- Linked Requirement Pill -->
      ${req ? `
        <div class="flex items-center gap-1 text-[10px] font-jetbrains px-2 py-0.5 rounded bg-secondary/10 text-secondary border border-secondary/20 mb-2 max-w-full overflow-hidden" title="${escapeHtml(req.title)}">
          <span class="material-symbols-outlined text-[12px] shrink-0">rule</span>
          <span class="truncate">${escapeHtml(req.title)}</span>
        </div>
      ` : ''}


      <!-- GitOps Branch & PR Badge -->
      ${task.gitBranch || task.pullRequest || (task.gitCommits && task.gitCommits.length > 0) ? `
        <div class="flex items-center gap-1.5 text-[10px] font-jetbrains px-2 py-0.5 rounded bg-surface-base border border-border-subtle mb-2 text-text-muted">
          <span class="material-symbols-outlined text-[13px] text-primary shrink-0">commit</span>
          <span class="truncate text-text-secondary font-medium" title="${escapeHtml(task.gitBranch || 'main')}">${escapeHtml(task.gitBranch || 'main')}</span>
          ${task.pullRequest ? `
            <span class="ml-auto inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-bold ${
              task.pullRequest.status === 'merged' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' :
              task.pullRequest.status === 'open' ? 'bg-status-passed-surface text-status-passed border border-status-passed/30' :
              'bg-surface-panel text-text-muted'
            }">
              <span class="material-symbols-outlined text-[11px]">${task.pullRequest.status === 'merged' ? 'call_merge' : 'call_split'}</span>
              #${task.pullRequest.id}
            </span>
          ` : (task.gitCommits && task.gitCommits.length > 0 ? `
            <span class="ml-auto text-[9px] text-text-muted shrink-0">${task.gitCommits.length} commits</span>
          ` : '')}
        </div>
      ` : ''}

      <!-- Card Footer: Assignee, Due Date & Fallback Dropdown -->
      <div class="pt-2 border-t border-border-subtle/60 flex items-center justify-between text-body-sm gap-1.5">
        <div class="flex items-center gap-1.5 min-w-0 flex-1">
          ${avatar(assignee ? assignee.userName : 'Unassigned', 'w-5 h-5 text-[9px] shrink-0')}
          <span class="text-[11px] text-text-secondary truncate font-inter font-medium">${assignee ? escapeHtml(assignee.userName.split(' ')[0]) : 'Unassigned'}</span>
        </div>

        <div class="flex items-center gap-1 shrink-0 no-card-click">
          ${task.dueDate ? `
            <span class="text-[9px] font-jetbrains px-1 py-0.2 rounded ${isOverdue ? 'bg-status-defect-surface text-status-defect font-bold' : 'text-text-muted bg-surface-base'}" title="Due Date">
              ${task.dueDate.slice(5)}
            </span>
          ` : ''}

          <!-- Fallback Move Dropdown (for Accessibility) -->
          <select class="task-status-select bg-surface-base text-text-muted hover:text-text-primary font-jetbrains text-[9px] py-0.5 px-1 rounded border border-border-subtle focus:border-primary outline-none cursor-pointer max-w-[72px]" data-id="${task.id}" title="Move task status">
            ${columns.filter(c => c.key === task.status || TASK_TRANSITIONS[task.status]?.includes(c.key)).map(c => `
              <option value="${c.key}" ${c.key === task.status ? 'selected' : ''}>${c.label}</option>
            `).join('')}
          </select>
        </div>
      </div>
    </div>
  `;
}

// ===== SORTABLE JS DRAG AND DROP INITIALIZER =====
function initKanbanSortable(container, project) {
  const dropzones = container.querySelectorAll('.kanban-dropzone');
  dropzones.forEach(zone => {
    const s = Sortable.create(zone, {
      group: 'kanban-tasks',
      animation: 180,
      ghostClass: 'opacity-30',
      chosenClass: 'ring-2',
      dragClass: 'rotate-1',
      filter: '.empty-drop-placeholder',
      onEnd: (evt) => {
        const itemEl = evt.item;
        const taskId = itemEl.dataset.id;
        const oldStatus = itemEl.dataset.status;
        const newStatus = evt.to.dataset.column;

        if (!taskId || !newStatus) return;

        // Same column reorder - nothing to change on backend status
        if (oldStatus === newStatus) return;

        // Validate transition
        if (!canTransitionTask(oldStatus, newStatus)) {
          showToast(`Invalid Kanban transition: Cannot move directly from ${oldStatus} to ${newStatus}`, 'error');
          renderSprints(container);
          return;
        }

        // Apply update
        const updates = { status: newStatus };

        // If swimlane mode is Assignee, check if dropped into a different lane
        const newLane = evt.to.dataset.lane;
        if (selectedGroupBy === 'assignee' && newLane) {
          updates.assigneeId = newLane === 'unassigned' ? null : newLane;
        } else if (selectedGroupBy === 'epic' && newLane) {
          updates.requirementIds = newLane === 'unlinked' ? [] : [newLane];
        }

        const res = store.updateTask(taskId, updates);
        if (res.error) {
          showToast(res.error, 'error');
        } else {
          showToast(`Task moved to ${newStatus}!`, 'info');
          teamCollab.broadcastAction({ action: 'TASK_MOVED', title: `Task moved to ${newStatus}`, details: `Task [${formatTaskKey(project.key, { id: taskId }, allTasks)}] moved to ${newStatus}` });
        }
        renderSprints(container);
      }
    });
    sortableInstances.push(s);
  });
}

// ===== WIP LIMITS MODAL =====
function openWipConfigModal(projectId, onSaved) {
  const currentLimits = getWipLimits(projectId);

  showModal(`
    <form id="wip-limits-form" class="space-y-4">
      <div class="p-3 rounded-lg bg-surface-base border border-secondary/30 flex items-start gap-2.5">
        <span class="material-symbols-outlined text-secondary text-[20px] shrink-0 mt-0.5">warning</span>
        <div class="text-[12px]">
          <span class="font-semibold text-text-primary block">Kanban Work-In-Progress (WIP) Limits</span>
          <span class="text-text-muted">Set capacity limits to detect bottlenecks. When tasks in a column exceed the limit, the column header turns yellow or red to signal a workflow impediment. Enter 0 for unlimited.</span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">To Do Limit</label>
          <input type="number" id="wip-todo" min="0" max="50" value="${currentLimits['To Do'] || 0}"
            class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none" />
        </div>
        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">In Progress Limit *</label>
          <input type="number" id="wip-inprog" min="0" max="20" required value="${currentLimits['In Progress'] || 3}"
            class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none" />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">In Review Limit *</label>
          <input type="number" id="wip-inrev" min="0" max="20" required value="${currentLimits['In Review'] || 2}"
            class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none" />
        </div>
        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">Backlog Limit</label>
          <input type="number" id="wip-backlog" min="0" max="100" value="${currentLimits['Backlog'] || 0}"
            class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none" />
        </div>
      </div>


      <div class="flex justify-between items-center pt-3 border-t border-border-subtle">
        <button type="button" id="reset-wip-btn" class="text-text-muted hover:text-text-primary text-[12px] font-jetbrains cursor-pointer">Reset Defaults</button>
        <div class="flex gap-2">
          <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-secondary hover:bg-surface-elevated text-body-md cursor-pointer">Cancel</button>
          <button type="submit" class="px-5 py-2 rounded-lg bg-primary text-on-primary font-semibold text-body-md hover:bg-primary-fixed shadow-md shadow-primary/20 cursor-pointer">Save WIP Limits</button>
        </div>
      </div>
    </form>
  `, { title: 'Configure Board WIP Bottlenecks' });

  document.getElementById('reset-wip-btn')?.addEventListener('click', () => {
    document.getElementById('wip-todo').value = 0;
    document.getElementById('wip-inprog').value = 3;
    document.getElementById('wip-inrev').value = 2;
    document.getElementById('wip-backlog').value = 0;
  });

  document.getElementById('wip-limits-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const newLimits = {
      'Backlog': parseInt(document.getElementById('wip-backlog').value, 10) || 0,
      'To Do': parseInt(document.getElementById('wip-todo').value, 10) || 0,
      'In Progress': parseInt(document.getElementById('wip-inprog').value, 10) || 0,
      'In Review': parseInt(document.getElementById('wip-inrev').value, 10) || 0,
      'Done': 0
    };
    saveWipLimits(projectId, newLimits);
    closeModal();
    showToast('WIP limits saved and applied to board!', 'success');
    if (onSaved) onSaved();
  });
}

// ===== TASK CREATE & EDIT MODAL =====
export function openTaskModal(projectId, existingTaskOrSprintId = null, onSaved = null) {
  const isEdit = existingTaskOrSprintId && typeof existingTaskOrSprintId === 'object' && existingTaskOrSprintId.id;
  const task = isEdit ? existingTaskOrSprintId : null;
  const defaultSprintId = !isEdit ? (existingTaskOrSprintId || selectedSprintId) : (task?.sprintId || '');

  const project = store.getProject(projectId) || store.getActiveProject();
  const allTasks = store.getTasks(projectId);
  const taskKey = task ? formatTaskKey(project?.key, task, allTasks) : 'TASK-NEW';
  const defaultBranch = task ? generateBranchName(project?.key, taskKey, task.title) : 'feat/task-branch';
  const sprints = store.getSprints(projectId);
  const members = store.getMembers(projectId);
  const reqs = store.getRequirements(projectId);

  showModal(`
    <form id="task-modal-form" class="space-y-4">
      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Task Title *</label>
        <input type="text" id="task-title" required value="${task ? escapeHtml(task.title) : ''}" placeholder="e.g. Implement refresh token rotation middleware"
          class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all" />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">Target Sprint</label>
          <select id="task-sprint" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none cursor-pointer">
            <option value="">Backlog (Unassigned)</option>
            ${sprints.map(s => `<option value="${s.id}" ${(task ? task.sprintId : defaultSprintId) === s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">Assignee</label>
          <select id="task-assignee" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none cursor-pointer">
            <option value="">Unassigned</option>
            ${members.map(m => `<option value="${m.userId}" ${task?.assigneeId === m.userId ? 'selected' : ''}>${escapeHtml(m.userName)} (${escapeHtml(m.role || 'Member')})</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-3">
        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">Priority</label>
          <select id="task-priority" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none cursor-pointer">
            <option value="High" ${task?.priority === 'High' ? 'selected' : ''}>High (Urgent)</option>
            <option value="Medium" ${!task || task.priority === 'Medium' ? 'selected' : ''}>Medium</option>
            <option value="Low" ${task?.priority === 'Low' ? 'selected' : ''}>Low</option>
          </select>
        </div>
        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">Story Points</label>
          <select id="task-estimate" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none cursor-pointer">
            <option value="1" ${task?.estimate === 1 ? 'selected' : ''}>1 pt (Trivial)</option>
            <option value="2" ${task?.estimate === 2 ? 'selected' : ''}>2 pts (Small)</option>
            <option value="3" ${!task || task.estimate === 3 ? 'selected' : ''}>3 pts (Medium)</option>
            <option value="5" ${task?.estimate === 5 ? 'selected' : ''}>5 pts (Complex)</option>
            <option value="8" ${task?.estimate === 8 ? 'selected' : ''}>8 pts (Large)</option>
            <option value="13" ${task?.estimate === 13 ? 'selected' : ''}>13 pts (Epic)</option>
          </select>
        </div>
        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">Due Date</label>
          <input type="date" id="task-duedate" value="${task?.dueDate || ''}" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none" />
        </div>
      </div>

      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Linked Requirement Specification</label>
        <select id="task-req" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none cursor-pointer">
          <option value="">None (Independent Technical Debt)</option>
          ${reqs.map(r => `<option value="${r.id}" ${task?.requirementIds?.includes(r.id) ? 'selected' : ''}>${escapeHtml(r.id)}: ${escapeHtml(r.title)}</option>`).join('')}
        </select>
      </div>

      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Implementation Notes</label>
        <textarea id="task-desc" rows="3" placeholder="Technical implementation scope, files, endpoints..."
          class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none">${task?.description ? escapeHtml(task.description) : ''}</textarea>
      </div>

      
      ${isEdit ? `
        <!-- GitOps & Version Control Automation Section -->
        <div class="p-3.5 rounded-xl bg-surface-base border border-border-subtle space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[18px] text-primary">commit</span>
              <span class="font-geist text-body-sm font-bold text-text-primary">GitOps & Developer Automation</span>
            </div>
            ${task.pullRequest ? `
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-jetbrains font-bold ${
                task.pullRequest.status === 'merged' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' :
                'bg-status-passed-surface text-status-passed border border-status-passed/30'
              }">
                <span class="material-symbols-outlined text-[13px]">${task.pullRequest.status === 'merged' ? 'call_merge' : 'call_split'}</span>
                PR #${task.pullRequest.id} (${task.pullRequest.status.toUpperCase()})
              </span>
            ` : ''}
          </div>

          <!-- Branch Name & Copy Command -->
          <div>
            <div class="flex items-center justify-between text-[11px] font-jetbrains text-text-muted mb-1">
              <span>Git Branch</span>
              <button type="button" id="copy-git-branch-btn" class="hover:text-primary transition-colors cursor-pointer flex items-center gap-1" data-branch="${task.gitBranch || defaultBranch}">
                <span class="material-symbols-outlined text-[12px]">content_copy</span>
                <span>Copy git checkout</span>
              </button>
            </div>
            <input type="text" id="task-git-branch" value="${escapeHtml(task.gitBranch || defaultBranch)}"
              class="w-full bg-surface-panel text-text-primary text-[12px] font-jetbrains px-3 py-1.5 rounded-lg border border-border-subtle focus:border-primary outline-none" />
          </div>

          <!-- Developer Quick Git Simulation Actions -->
          <div class="pt-1 border-t border-border-subtle/50">
            <div class="text-[10px] font-jetbrains uppercase text-text-muted tracking-wider mb-2">Simulate Developer Git Action</div>
            <div class="flex flex-wrap gap-2">
              <button type="button" id="gitops-commit-btn" class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-primary text-[11px] font-jetbrains border border-border-subtle hover:border-primary transition-all cursor-pointer shadow-xs" title="Simulates 'git commit' and auto-promotes to In Progress">
                <span class="material-symbols-outlined text-[14px] text-primary">add_task</span>
                <span>Push Commit</span>
              </button>

              <button type="button" id="gitops-pr-btn" class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-panel hover:bg-surface-elevated text-secondary text-[11px] font-jetbrains border border-secondary/30 hover:border-secondary transition-all cursor-pointer shadow-xs" title="Simulates opening PR and auto-promotes to In Review">
                <span class="material-symbols-outlined text-[14px]">call_split</span>
                <span>Open PR</span>
              </button>

              <button type="button" id="gitops-merge-btn" class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-panel hover:bg-purple-500/15 text-purple-400 text-[11px] font-jetbrains border border-purple-500/30 hover:border-purple-500 transition-all cursor-pointer shadow-xs" title="Simulates merging PR into main and auto-promotes to Done">
                <span class="material-symbols-outlined text-[14px]">call_merge</span>
                <span>Merge & Complete</span>
              </button>
            </div>
          </div>

          <!-- Commit History if any -->
          ${task.gitCommits && task.gitCommits.length > 0 ? `
            <div class="pt-1">
              <span class="text-[10px] font-jetbrains uppercase text-text-muted tracking-wider block mb-1.5">Linked Commits (${task.gitCommits.length})</span>
              <div class="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                ${task.gitCommits.map(c => `
                  <div class="p-1.5 rounded bg-surface-panel border border-border-subtle/50 text-[11px] font-jetbrains flex items-center justify-between">
                    <div class="flex items-center gap-1.5 min-w-0">
                      <span class="px-1.5 py-0.2 rounded bg-primary-container/20 text-primary font-bold shrink-0 text-[10px]">${escapeHtml(c.sha)}</span>
                      <span class="text-text-primary truncate">${escapeHtml(c.message)}</span>
                    </div>
                    <span class="text-[10px] text-text-muted shrink-0 ml-2">${escapeHtml(c.author)}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      ` : ''}

      <div class="flex justify-between items-center pt-3 border-t border-border-subtle">
        ${isEdit ? `
          <button type="button" id="delete-task-btn" class="flex items-center gap-1 text-status-defect hover:underline text-[12px] font-jetbrains cursor-pointer">
            <span class="material-symbols-outlined text-[16px]">delete</span>
            <span>Delete Task</span>
          </button>
        ` : '<div></div>'}

        <div class="flex gap-2">
          <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-secondary hover:bg-surface-elevated text-body-md cursor-pointer">Cancel</button>
          <button type="submit" class="px-5 py-2 rounded-lg bg-primary text-on-primary font-semibold text-body-md hover:bg-primary-fixed shadow-md shadow-primary/20 cursor-pointer">
            ${isEdit ? 'Save Task' : 'Add Task to Board'}
          </button>
        </div>
      </div>
    </form>
  `, { title: isEdit ? `Edit Task: ${task.id}` : 'Create Implementation Task' });

  // Delete task handler
  
  // Copy Git Branch command
  document.getElementById('copy-git-branch-btn')?.addEventListener('click', (e) => {
    const branch = e.currentTarget.dataset.branch;
    const cmd = `git checkout -b ${branch}`;
    navigator.clipboard?.writeText(cmd);
    showToast(`Copied: ${cmd}`, 'success');
  });

  // GitOps Commit Simulation
  document.getElementById('gitops-commit-btn')?.addEventListener('click', () => {
    if (!task) return;
    const branch = document.getElementById('task-git-branch')?.value.trim() || defaultBranch;
    const msg = prompt('Enter Git commit message:', `feat(${taskKey}): implement ${task.title.toLowerCase().slice(0, 30)}`);
    if (!msg) return;
    const res = recordGitCommit(task.id, { message: msg, branch });
    if (res.error) {
      showToast(res.error, 'error');
    } else {
      showToast(`Git commit [${res.commit.sha}] recorded! ${res.transitionMsg || ''}`, 'success');
      closeModal();
      if (onSaved) onSaved();
    }
  });

  // GitOps Open PR Simulation
  document.getElementById('gitops-pr-btn')?.addEventListener('click', () => {
    if (!task) return;
    const res = updatePullRequest(task.id, 'open');
    if (res.error) {
      showToast(res.error, 'error');
    } else {
      showToast('Pull request opened! Task promoted to In Review.', 'success');
      closeModal();
      if (onSaved) onSaved();
    }
  });

  // GitOps Merge PR Simulation
  document.getElementById('gitops-merge-btn')?.addEventListener('click', () => {
    if (!task) return;
    const res = updatePullRequest(task.id, 'merge');
    if (res.error) {
      showToast(res.error, 'error');
    } else {
      showToast('Pull request merged! Task completed and moved to Done.', 'success');
      closeModal();
      if (onSaved) onSaved();
    }
  });

  document.getElementById('delete-task-btn')?.addEventListener('click', () => {
    if (!task) return;
    showConfirm(`Delete task "${task.title}" permanently?`, () => {
      const res = store.deleteTask(task.id);
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        closeModal();
        showToast('Task deleted successfully.', 'info');
        if (onSaved) onSaved();
      }
    }, { title: 'Delete Task', destructive: true, confirmText: 'Delete' });
  });

  document.getElementById('task-modal-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('task-title').value.trim();
    const sprintId = document.getElementById('task-sprint').value || null;
    const assigneeId = document.getElementById('task-assignee').value || null;
    const priority = document.getElementById('task-priority').value;
    const estimate = parseInt(document.getElementById('task-estimate').value, 10);
    const dueDate = document.getElementById('task-duedate').value || null;
    const reqId = document.getElementById('task-req').value;
    const description = document.getElementById('task-desc').value.trim();

    const taskPayload = {
      title,
      sprintId,
      assigneeId,
      priority,
      estimate,
      dueDate,
      requirementIds: reqId ? [reqId] : [],
      gitBranch: document.getElementById('task-git-branch')?.value.trim() || undefined,
      description
    };

    let res;
    if (isEdit) {
      res = store.updateTask(task.id, taskPayload);
    } else {
      res = store.createTask(projectId, {
        ...taskPayload,
        status: sprintId ? 'To Do' : 'Backlog'
      });
    }

    if (res.error) {
      showToast(res.error, 'error');
      return;
    }

    closeModal();
    showToast(isEdit ? 'Task updated!' : 'Task added successfully!', 'success');
    if (onSaved) onSaved();
  });
}

function openSprintModal(projectId, onSaved) {
  showModal(`
    <form id="new-sprint-form" class="space-y-4">
      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Sprint Name *</label>
        <input type="text" id="sprint-name" required placeholder="e.g. Sprint 3 — Core Lifecycle"
          class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all" />
      </div>

      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Sprint Goal *</label>
        <textarea id="sprint-goal" rows="2" required placeholder="What is the key business/technical milestone for this cycle?"
          class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all"></textarea>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">Start Date *</label>
          <input type="date" id="sprint-start" required value="${new Date().toISOString().split('T')[0]}"
            class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all" />
        </div>
        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">End Date *</label>
          <input type="date" id="sprint-end" required value="${new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]}"
            class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all" />
        </div>
      </div>

      <div class="flex justify-end gap-3 pt-3">
        <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-secondary hover:bg-surface-elevated text-body-md cursor-pointer">Cancel</button>
        <button type="submit" class="px-5 py-2 rounded-lg bg-primary text-on-primary font-semibold text-body-md hover:bg-primary-fixed shadow-md shadow-primary/20 cursor-pointer">Create Sprint</button>
      </div>
    </form>
  `, { title: 'Start New Agile Sprint' });

  document.getElementById('new-sprint-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('sprint-name').value.trim();
    const goal = document.getElementById('sprint-goal').value.trim();
    const startDate = document.getElementById('sprint-start').value;
    const endDate = document.getElementById('sprint-end').value;

    const dates = validateSprintDates(startDate, endDate);
    if (!dates.valid) {
      showToast(dates.reason, 'error');
      return;
    }
    const hasActive = store.getSprints(projectId).some(s => s.status === 'Active');
    const res = store.createSprint(projectId, { name, goal, startDate, endDate, status: hasActive ? 'Planned' : 'Active' });
    if (res.error) {
      showToast(res.error, 'error');
      return;
    }
    selectedSprintId = res.data.id;
    closeModal();
    showToast(hasActive ? 'Sprint created as Planned (another sprint is active).' : 'Sprint created and active!', 'success');
    if (onSaved) onSaved();
  });
}

// ===== BURNDOWN & VELOCITY ANALYTICS MODAL =====
export function openBurndownModal(project, currentSprint, filteredTasks, allTasks) {
  const sprintTasks = currentSprint
    ? (allTasks || []).filter(t => t.sprintId === currentSprint.id)
    : (filteredTasks || []);

  const sprintName = currentSprint ? currentSprint.name : 'All Sprint Tasks';
  const sprintGoal = currentSprint?.goal || 'Deliver committed sprint backlog story points with verified test coverage.';

  const totalPts = sprintTasks.reduce((acc, t) => acc + (t.estimate || 3), 0);
  const donePts = sprintTasks.filter(t => t.status === 'Done').reduce((acc, t) => acc + (t.estimate || 3), 0);
  const inReviewPts = sprintTasks.filter(t => t.status === 'In Review').reduce((acc, t) => acc + (t.estimate || 3), 0);
  const inProgressPts = sprintTasks.filter(t => t.status === 'In Progress').reduce((acc, t) => acc + (t.estimate || 3), 0);
  const remainingPts = Math.max(0, totalPts - donePts);
  const velocityPct = totalPts > 0 ? Math.round((donePts / totalPts) * 100) : 0;

  // Timeline computation
  const startDateStr = currentSprint?.startDate || new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const endDateStr = currentSprint?.endDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const startMs = new Date(startDateStr).getTime();
  const endMs = new Date(endDateStr).getTime();
  const nowMs = Date.now();

  const totalDays = Math.max(1, Math.round((endMs - startMs) / 86400000));
  const elapsedDays = Math.min(totalDays, Math.max(0, Math.round((nowMs - startMs) / 86400000)));
  const remainingDays = Math.max(0, totalDays - elapsedDays);

  const idealBurnPerDay = totalDays > 0 ? (totalPts / totalDays).toFixed(1) : '0.0';
  const actualBurnRate = elapsedDays > 0 ? (donePts / elapsedDays).toFixed(1) : (donePts).toFixed(1);
  const neededBurnRate = remainingDays > 0 ? (remainingPts / remainingDays).toFixed(1) : remainingPts;

  // Health assessment
  let healthPill = '';
  let healthDesc = '';
  if (remainingPts === 0) {
    healthPill = `<span class="px-2.5 py-0.5 rounded-full bg-status-passed-surface text-status-passed text-[11px] font-jetbrains font-bold border border-status-passed/30">COMPLETED</span>`;
    healthDesc = `All ${totalPts} committed story points burned down. Sprint objectives met!`;
  } else if (parseFloat(actualBurnRate) >= parseFloat(idealBurnPerDay) * 0.9) {
    healthPill = `<span class="px-2.5 py-0.5 rounded-full bg-status-passed-surface text-status-passed text-[11px] font-jetbrains font-bold border border-status-passed/30">ON TRACK</span>`;
    healthDesc = `Velocity is pacing at ${actualBurnRate} pts/day, meeting the ideal burn trajectory.`;
  } else if (remainingDays === 0) {
    healthPill = `<span class="px-2.5 py-0.5 rounded-full bg-status-defect-surface text-status-defect text-[11px] font-jetbrains font-bold border border-status-defect/30">OVERDUE</span>`;
    healthDesc = `${remainingPts} pts remaining past the sprint end date. Consider rolling over.`;
  } else {
    healthPill = `<span class="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[11px] font-jetbrains font-bold border border-amber-500/30">AT RISK</span>`;
    healthDesc = `Burn rate (${actualBurnRate} pts/day) is behind target (${neededBurnRate} pts/day needed to finish).`;
  }

  // Generate SVG Burndown Chart
  const svgWidth = 620;
  const svgHeight = 240;
  const padL = 45;
  const padR = 25;
  const padT = 25;
  const padB = 35;
  const chartW = svgWidth - padL - padR;
  const chartH = svgHeight - padT - padB;

  const maxY = Math.max(10, Math.ceil((totalPts || 10) / 5) * 5);
  const getY = (val) => padT + chartH - (Math.max(0, val) / maxY) * chartH;
  const numSteps = Math.min(14, totalDays);
  const getX = (dayIdx) => padL + (dayIdx / numSteps) * chartW;

  // Ideal line coordinates
  const idealX1 = getX(0);
  const idealY1 = getY(totalPts);
  const idealX2 = getX(numSteps);
  const idealY2 = getY(0);

  // Generate Actual Data Points trajectory
  const actualPoints = [];
  const currentStep = Math.min(numSteps, Math.round((elapsedDays / totalDays) * numSteps));
  for (let s = 0; s <= currentStep; s++) {
    const fraction = currentStep > 0 ? (s / currentStep) : 0;
    const val = totalPts - Math.round(donePts * fraction);
    actualPoints.push({
      step: s,
      x: getX(s),
      y: getY(val),
      points: val,
      dayLabel: `Day ${Math.round((s / numSteps) * totalDays)}`
    });
  }

  const actualPathD = actualPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  // Projected line if sprint still running
  let projectedPathHtml = '';
  if (currentStep < numSteps && actualPoints.length > 0) {
    const lastP = actualPoints[actualPoints.length - 1];
    const projY = getY(Math.max(0, remainingPts - (parseFloat(actualBurnRate) * remainingDays)));
    projectedPathHtml = `
      <line x1="${lastP.x.toFixed(1)}" y1="${lastP.y.toFixed(1)}" x2="${idealX2.toFixed(1)}" y2="${projY.toFixed(1)}"
        stroke="#38bdf8" stroke-width="2" stroke-dasharray="4,4" stroke-opacity="0.6" />
    `;
  }

  // Y Grid lines
  const yTicks = [0, Math.round(maxY * 0.25), Math.round(maxY * 0.5), Math.round(maxY * 0.75), maxY];
  const gridHtml = yTicks.map(val => {
    const yPos = getY(val);
    return `
      <line x1="${padL}" y1="${yPos.toFixed(1)}" x2="${(padL + chartW).toFixed(1)}" y2="${yPos.toFixed(1)}" stroke="#334155" stroke-width="1" stroke-dasharray="3,3" opacity="0.4" />
      <text x="${padL - 8}" y="${(yPos + 4).toFixed(1)}" fill="#94a3b8" font-size="10" font-family="monospace" text-anchor="end">${val}</text>
    `;
  }).join('');

  // X axis day labels
  const xLabelsHtml = [0, Math.round(numSteps / 2), numSteps].map(s => {
    const dayNum = Math.round((s / numSteps) * totalDays);
    const xPos = getX(s);
    return `
      <text x="${xPos.toFixed(1)}" y="${svgHeight - 10}" fill="#94a3b8" font-size="10" font-family="monospace" text-anchor="middle">Day ${dayNum}</text>
    `;
  }).join('');

  // SVG Data circles
  const circlesHtml = actualPoints.map(p => `
    <g class="cursor-pointer group">
      <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="#38bdf8" stroke="#0f172a" stroke-width="2" class="hover:r-6 transition-all" />
      <title>${p.dayLabel}: ${p.points} pts remaining</title>
    </g>
  `).join('');

  showModal(`
    <div class="space-y-5">
      <!-- Sprint Banner & Health -->
      <div class="p-4 rounded-xl bg-surface-base border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="font-jetbrains text-[10px] font-bold px-2 py-0.5 rounded bg-primary-container/20 text-primary border border-primary/20">${project.key}</span>
            <span class="font-geist text-body-md font-bold text-text-primary">${escapeHtml(sprintName)}</span>
            ${healthPill}
          </div>
          <p class="text-[12px] text-text-muted font-jetbrains">${escapeHtml(sprintGoal)}</p>
        </div>
        <div class="text-right shrink-0">
          <div class="text-[11px] font-jetbrains text-text-muted">Sprint Timeline</div>
          <div class="text-body-sm font-jetbrains font-semibold text-text-primary">
            Day ${elapsedDays} of ${totalDays} (${formatDate(startDateStr)} &mdash; ${formatDate(endDateStr)})
          </div>
        </div>
      </div>

      <!-- 4 Key Metrics Cards -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 font-jetbrains">
        <div class="p-3 rounded-xl bg-surface-canvas border border-border-subtle">
          <span class="text-[10px] uppercase text-text-muted block mb-1">Committed Scope</span>
          <div class="text-headline-sm font-bold text-text-primary">${totalPts} <span class="text-[12px] text-text-muted font-normal">pts</span></div>
          <span class="text-[10px] text-text-muted">${sprintTasks.length} tasks in backlog</span>
        </div>

        <div class="p-3 rounded-xl bg-surface-canvas border border-border-subtle">
          <span class="text-[10px] uppercase text-status-passed block mb-1">Points Burned</span>
          <div class="text-headline-sm font-bold text-status-passed">${donePts} <span class="text-[12px] text-text-muted font-normal">pts</span></div>
          <span class="text-[10px] text-secondary font-semibold">${velocityPct}% completion</span>
        </div>

        <div class="p-3 rounded-xl bg-surface-canvas border border-border-subtle">
          <span class="text-[10px] uppercase text-status-in-progress block mb-1">Remaining Scope</span>
          <div class="text-headline-sm font-bold text-status-in-progress">${remainingPts} <span class="text-[12px] text-text-muted font-normal">pts</span></div>
          <span class="text-[10px] text-text-muted">${inProgressPts + inReviewPts} pts in-flight</span>
        </div>

        <div class="p-3 rounded-xl bg-surface-canvas border border-border-subtle">
          <span class="text-[10px] uppercase text-text-muted block mb-1">Burn Velocity</span>
          <div class="text-headline-sm font-bold text-text-primary">${actualBurnRate} <span class="text-[12px] text-text-muted font-normal">pts/day</span></div>
          <span class="text-[10px] text-text-muted">Target: ${idealBurnPerDay} pts/day</span>
        </div>
      </div>

      <!-- SVG Burndown Chart Container -->
      <div class="p-4 rounded-xl bg-surface-canvas border border-border-subtle">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-[18px]">analytics</span>
            <span class="font-geist text-body-md font-bold text-text-primary">Sprint Burndown Trajectory</span>
          </div>
          <!-- Legend -->
          <div class="flex items-center gap-4 text-[11px] font-jetbrains text-text-muted">
            <div class="flex items-center gap-1.5">
              <span class="w-4 h-0.5 border-t-2 border-dashed border-slate-400"></span>
              <span>Ideal Burn</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="w-3 h-3 rounded-full bg-sky-400"></span>
              <span class="text-sky-400 font-semibold">Actual Remaining</span>
            </div>
          </div>
        </div>

        <div class="w-full overflow-x-auto">
          <svg viewBox="0 0 ${svgWidth} ${svgHeight}" class="w-full max-w-[620px] mx-auto h-auto select-none overflow-visible">
            <!-- Gridlines & Y labels -->
            ${gridHtml}

            <!-- X Labels -->
            ${xLabelsHtml}

            <!-- Ideal Guideline -->
            <line x1="${idealX1.toFixed(1)}" y1="${idealY1.toFixed(1)}" x2="${idealX2.toFixed(1)}" y2="${idealY2.toFixed(1)}"
              stroke="#64748b" stroke-width="2" stroke-dasharray="6,6" opacity="0.8" />

            <!-- Projected Line -->
            ${projectedPathHtml}

            <!-- Actual Burndown Path -->
            ${actualPoints.length > 1 ? `
              <path d="${actualPathD}" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
            ` : ''}

            <!-- Data Circles -->
            ${circlesHtml}
          </svg>
        </div>

        <div class="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between text-[11px] font-jetbrains text-text-muted">
          <span>${healthDesc}</span>
          <span>Target End: ${formatDate(endDateStr)}</span>
        </div>
      </div>

      <div class="flex justify-end pt-2">
        <button type="button" onclick="window.__closeModal()" class="px-5 py-2 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-primary font-medium text-body-md transition-all cursor-pointer">
          Done
        </button>
      </div>
    </div>
  `, { title: 'Sprint Burndown & Velocity Analytics' });
}

