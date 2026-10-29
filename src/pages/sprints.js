// DevTrack Sprint Board & Task Management
import { store } from '../store.js';
import { priorityChip, statusChip, avatar, formatDate, showToast, showModal, closeModal } from '../ui.js';

let selectedSprintId = 'ALL';

export function renderSprints(container) {
  const project = store.getActiveProject();
  if (!project) {
    container.innerHTML = `<div class="p-12 text-center text-text-muted">Select or create a project first.</div>`;
    return;
  }

  const sprints = store.getSprints(project.id);
  const tasks = store.getTasks(project.id);
  const members = store.getMembers(project.id);
  const reqs = store.getRequirements(project.id);

  // If no sprint explicitly selected, pick first active sprint or first sprint
  if (selectedSprintId === 'ALL' && sprints.length > 0) {
    const active = sprints.find(s => s.status === 'Active');
    selectedSprintId = active ? active.id : sprints[0].id;
  }

  const currentSprint = sprints.find(s => s.id === selectedSprintId);
  const filteredTasks = selectedSprintId === 'BACKLOG'
    ? tasks.filter(t => !t.sprintId)
    : selectedSprintId === 'ALL_SPRINTS'
    ? tasks
    : tasks.filter(t => t.sprintId === selectedSprintId);

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

  container.innerHTML = `
    <div class="relative w-full px-6 py-6">
      <!-- Header -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div class="flex items-center gap-2 font-jetbrains text-mono-md text-text-muted mb-1">
            <span>${project.key}</span>
            <span>/</span>
            <span class="text-secondary font-medium">LIFECYCLE PLANNING</span>
            <span>/</span>
            <span class="text-text-primary">AGILE SPRINT BOARD</span>
          </div>
          <h1 class="font-geist text-headline-xl font-bold text-text-primary tracking-tight">Sprint Board & Task Execution</h1>
          <p class="text-body-sm text-text-muted mt-1">Manage agile cycles, story points, status flows, and linked requirement delivery</p>
        </div>

        <div class="flex items-center flex-wrap gap-2.5">
          <button id="add-sprint-btn" class="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-primary font-medium text-body-md border border-border-subtle transition-all">
            <span class="material-symbols-outlined text-[18px]">calendar_add_on</span>
            <span>+ New Sprint</span>
          </button>
          <button id="add-task-btn" class="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-fixed text-on-primary font-semibold text-body-md transition-all shadow-md shadow-primary/20 active:scale-95">
            <span class="material-symbols-outlined text-[18px]">add_task</span>
            <span>+ Add Task</span>
          </button>
        </div>
      </div>

      <!-- Sprint Selector & Status Banner -->
      <div class="bg-surface-canvas border border-border-subtle rounded-xl p-4 mb-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div class="flex items-center flex-wrap gap-3">
          <label class="text-label-md text-text-muted font-jetbrains uppercase">Sprint:</label>
          <select id="sprint-select" class="bg-surface-base text-text-primary font-semibold text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none">
            ${sprints.map(s => `<option value="${s.id}" ${s.id === selectedSprintId ? 'selected' : ''}>${s.name} (${s.status})</option>`).join('')}
            <option value="BACKLOG" ${selectedSprintId === 'BACKLOG' ? 'selected' : ''}>Unassigned Backlog</option>
            <option value="ALL_SPRINTS" ${selectedSprintId === 'ALL_SPRINTS' ? 'selected' : ''}>All Tasks Across Sprints</option>
          </select>

          ${currentSprint ? `
            <span class="font-jetbrains text-[11px] px-2.5 py-1 rounded-full ${currentSprint.status === 'Active' ? 'bg-status-in-progress-surface text-status-in-progress' : 'bg-status-passed-surface text-status-passed'} font-semibold">
              ${currentSprint.status.toUpperCase()}
            </span>
            <span class="text-body-sm text-text-muted">
              ${formatDate(currentSprint.startDate)} &mdash; ${formatDate(currentSprint.endDate)}
            </span>
          ` : ''}
        </div>

        <div class="flex items-center gap-6 font-jetbrains text-mono-md">
          <div class="flex items-center gap-2">
            <span class="text-text-muted">Sprint Velocity:</span>
            <span class="font-bold text-text-primary">${donePts} / ${totalPts} pts</span>
            <span class="text-secondary font-semibold">(${pct}%)</span>
          </div>
          <div class="w-28 bg-surface-base h-2 rounded-full overflow-hidden">
            <div class="bg-secondary h-full rounded-full" style="width: ${pct}%"></div>
          </div>
        </div>
      </div>

      <!-- Kanban 5-Column Board -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
        ${columns.map(col => {
          const colTasks = filteredTasks.filter(t => t.status === col.key);
          const colPts = colTasks.reduce((acc, t) => acc + (t.estimate || 3), 0);

          return `
            <div class="bg-surface-canvas/90 border border-border-subtle rounded-xl p-3 flex flex-col min-h-[500px]">
              <!-- Column Header -->
              <div class="flex items-center justify-between pb-3 mb-3 border-b border-border-subtle">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-[18px] ${col.color}">${col.icon}</span>
                  <span class="font-geist text-label-md font-bold text-text-primary">${col.label}</span>
                  <span class="font-jetbrains text-[10px] px-2 py-0.5 rounded-full bg-surface-panel text-text-muted font-bold">${colTasks.length}</span>
                </div>
                <span class="font-jetbrains text-[11px] text-text-muted">${colPts} pts</span>
              </div>

              <!-- Task Cards -->
              <div class="space-y-3 flex-1">
                ${colTasks.map(task => {
                  const assignee = members.find(m => m.userId === task.assigneeId);
                  const req = reqs.find(r => task.requirementIds?.includes(r.id));

                  return `
                    <div class="bg-surface-panel rounded-xl p-3.5 border border-border-subtle hover:border-primary/40 shadow-sm transition-all group">
                      <div class="flex items-center justify-between gap-2 mb-2">
                        <span class="font-jetbrains text-mono-md font-bold text-secondary">${task.id}</span>
                        ${priorityChip(task.priority)}
                      </div>

                      <h4 class="font-inter text-body-md font-semibold text-text-primary mb-2 line-clamp-2">${task.title}</h4>
                      
                      ${task.description ? `<p class="text-body-sm text-text-muted line-clamp-2 mb-3">${task.description}</p>` : ''}

                      ${req ? `
                        <div class="flex items-center gap-1.5 text-[10px] font-jetbrains px-2 py-0.5 rounded bg-surface-base text-text-secondary mb-3 truncate" title="${req.title}">
                          <span class="material-symbols-outlined text-[12px] text-primary">rule</span>
                          <span class="truncate">${req.title}</span>
                        </div>
                      ` : ''}

                      <!-- Card Footer: Assignee, Estimate & Status Mover -->
                      <div class="pt-2.5 border-t border-border-subtle/60 flex items-center justify-between text-body-sm">
                        <div class="flex items-center gap-1.5">
                          ${avatar(assignee ? assignee.userName : 'Unassigned', 'w-5 h-5 text-[9px]')}
                          <span class="text-[11px] text-text-secondary truncate max-w-[80px]">${assignee ? assignee.userName.split(' ')[0] : 'Unassigned'}</span>
                        </div>

                        <div class="flex items-center gap-2">
                          <span class="font-jetbrains text-[10px] px-1.5 py-0.5 rounded bg-surface-elevated text-text-primary font-bold">${task.estimate || 3} pts</span>
                          <select class="task-status-select bg-surface-base text-text-primary font-jetbrains text-[10px] py-0.5 px-1 rounded border border-border-subtle focus:border-primary outline-none" data-id="${task.id}">
                            ${columns.map(c => `<option value="${c.key}" ${c.key === task.status ? 'selected' : ''}>${c.label}</option>`).join('')}
                          </select>
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}

                ${colTasks.length === 0 ? `
                  <div class="p-6 text-center text-text-muted text-[11px] font-jetbrains border border-dashed border-border-subtle rounded-lg">
                    Empty Column
                  </div>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  // Attach sprint selector change
  const sprintSelect = container.querySelector('#sprint-select');
  sprintSelect?.addEventListener('change', (e) => {
    selectedSprintId = e.target.value;
    renderSprints(container);
  });

  // Attach status change on individual tasks
  container.querySelectorAll('.task-status-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const taskId = sel.dataset.id;
      const newStatus = e.target.value;
      store.updateTask(taskId, { status: newStatus });
      showToast(`Task moved to ${newStatus}`, 'info');
      renderSprints(container);
    });
  });

  // Attach Add Task trigger
  container.querySelector('#add-task-btn')?.addEventListener('click', () => {
    openTaskModal(project.id, selectedSprintId, () => renderSprints(container));
  });

  // Attach Add Sprint trigger
  container.querySelector('#add-sprint-btn')?.addEventListener('click', () => {
    openSprintModal(project.id, () => renderSprints(container));
  });
}

function openTaskModal(projectId, defaultSprintId, onSaved) {
  const sprints = store.getSprints(projectId);
  const members = store.getMembers(projectId);
  const reqs = store.getRequirements(projectId);

  showModal(`
    <form id="new-task-form" class="space-y-4">
      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Task Title *</label>
        <input type="text" id="task-title" required placeholder="e.g. Implement refresh token rotation middleware"
          class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all" />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">Target Sprint</label>
          <select id="task-sprint" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none">
            <option value="">Backlog (Unassigned)</option>
            ${sprints.map(s => `<option value="${s.id}" ${s.id === defaultSprintId ? 'selected' : ''}>${s.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">Assignee</label>
          <select id="task-assignee" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none">
            <option value="">Unassigned</option>
            ${members.map(m => `<option value="${m.userId}">${m.userName} (${m.role})</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-3">
        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">Priority</label>
          <select id="task-priority" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none">
            <option value="High">High</option>
            <option value="Medium" selected>Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">Story Points</label>
          <select id="task-estimate" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none">
            <option value="1">1 pt (Trivial)</option>
            <option value="2">2 pts (Small)</option>
            <option value="3" selected>3 pts (Medium)</option>
            <option value="5">5 pts (Complex)</option>
            <option value="8">8 pts (Large)</option>
            <option value="13">13 pts (Epic)</option>
          </select>
        </div>
        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">Due Date</label>
          <input type="date" id="task-duedate" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none" />
        </div>
      </div>

      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Linked Requirement Specification</label>
        <select id="task-req" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none">
          <option value="">None (Independent Technical Debt)</option>
          ${reqs.map(r => `<option value="${r.id}">${r.id}: ${r.title}</option>`).join('')}
        </select>
      </div>

      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Implementation Notes</label>
        <textarea id="task-desc" rows="3" placeholder="Technical implementation scope, files, endpoints..."
          class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none"></textarea>
      </div>

      <div class="flex justify-end gap-3 pt-3">
        <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-secondary hover:bg-surface-elevated text-body-md">Cancel</button>
        <button type="submit" class="px-5 py-2 rounded-lg bg-primary text-on-primary font-semibold text-body-md hover:bg-primary-fixed shadow-md shadow-primary/20">Add Task to Board</button>
      </div>
    </form>
  `, { title: 'Create Implementation Task' });

  document.getElementById('new-task-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('task-title').value.trim();
    const sprintId = document.getElementById('task-sprint').value || null;
    const assigneeId = document.getElementById('task-assignee').value || null;
    const priority = document.getElementById('task-priority').value;
    const estimate = parseInt(document.getElementById('task-estimate').value, 10);
    const dueDate = document.getElementById('task-duedate').value || null;
    const reqId = document.getElementById('task-req').value;
    const description = document.getElementById('task-desc').value.trim();

    store.createTask(projectId, {
      title,
      sprintId,
      assigneeId,
      priority,
      status: sprintId ? 'To Do' : 'Backlog',
      estimate,
      dueDate,
      requirementIds: reqId ? [reqId] : [],
      description
    });

    closeModal();
    showToast('Task added successfully!', 'success');
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
        <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-secondary hover:bg-surface-elevated text-body-md">Cancel</button>
        <button type="submit" class="px-5 py-2 rounded-lg bg-primary text-on-primary font-semibold text-body-md hover:bg-primary-fixed shadow-md shadow-primary/20">Create Sprint</button>
      </div>
    </form>
  `, { title: 'Start New Agile Sprint' });

  document.getElementById('new-sprint-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('sprint-name').value.trim();
    const goal = document.getElementById('sprint-goal').value.trim();
    const startDate = document.getElementById('sprint-start').value;
    const endDate = document.getElementById('sprint-end').value;

    store.createSprint(projectId, { name, goal, startDate, endDate, status: 'Active' });
    closeModal();
    showToast('Sprint created and active!', 'success');
    if (onSaved) onSaved();
  });
}
