// DevTrack Projects Directory & Management
import { store } from '../store.js';
import { formatDate, showToast, showModal, closeModal, avatar, escapeHtml } from '../ui.js';

let projectSearchQuery = '';
let projectFilterScope = 'all'; // 'all' | 'mine'
let projectSortBy = 'recently-active'; // 'recently-active' | 'name-asc' | 'progress-desc' | 'reqs-desc'

export function renderProjects(container) {
  const allProjects = store.getProjects();
  const activeProjectId = store.getActiveProjectId();
  const currentUser = store.currentUser;
  const currentEmail = (currentUser?.email || '').toLowerCase();
  const currentUserId = currentUser?.id;

  // Filter by Scope (All vs My Projects)
  let filtered = allProjects.filter(p => {
    if (projectFilterScope === 'mine') {
      const role = store.getUserRole(p.id);
      const isMember = role !== null || store.getMembers(p.id).some(m =>
        m.userId === currentUserId || (m.userEmail && m.userEmail.toLowerCase() === currentEmail)
      );
      if (!isMember) return false;
    }
    // Search query
    if (projectSearchQuery.trim()) {
      const q = projectSearchQuery.toLowerCase();
      const matchName = p.name?.toLowerCase().includes(q);
      const matchKey = p.key?.toLowerCase().includes(q);
      const matchDesc = p.description?.toLowerCase().includes(q);
      if (!matchName && !matchKey && !matchDesc) return false;
    }
    return true;
  });

  // Calculate stats for each project for sorting and display
  const projectStats = new Map();
  allProjects.forEach(proj => {
    const reqs = store.getRequirements(proj.id);
    const tasks = store.getTasks(proj.id);
    const members = store.getMembers(proj.id);
    const completedReqs = reqs.filter(r => r.status === 'Implemented').length;
    const progress = reqs.length > 0 ? Math.round((completedReqs / reqs.length) * 100) : 0;
    projectStats.set(proj.id, { reqs, tasks, members, completedReqs, progress });
  });

  // Sort
  filtered.sort((a, b) => {
    const statsA = projectStats.get(a.id);
    const statsB = projectStats.get(b.id);

    if (projectSortBy === 'recently-active') {
      if (a.id === activeProjectId) return -1;
      if (b.id === activeProjectId) return 1;
      return (b.startDate || b.id || '').localeCompare(a.startDate || a.id || '');
    }
    if (projectSortBy === 'name-asc') {
      return a.name.localeCompare(b.name);
    }
    if (projectSortBy === 'progress-desc') {
      return statsB.progress - statsA.progress;
    }
    if (projectSortBy === 'reqs-desc') {
      return statsB.reqs.length - statsA.reqs.length;
    }
    return 0;
  });

  const myProjectsCount = allProjects.filter(p => {
    const role = store.getUserRole(p.id);
    return role !== null || store.getMembers(p.id).some(m =>
      m.userId === currentUserId || (m.userEmail && m.userEmail.toLowerCase() === currentEmail)
    );
  }).length;

  container.innerHTML = `
    <div class="relative w-full px-6 py-6">
      <!-- Ambient Glow -->
      <div class="absolute -top-32 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Header -->
      <div class="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div class="flex items-center gap-2 font-jetbrains text-mono-md text-text-muted mb-1">
            <span>WORKSPACE</span>
            <span>/</span>
            <span class="text-secondary font-medium">PROJECT DIRECTORY</span>
            <span class="px-2 py-0.5 rounded-full bg-surface-elevated text-text-muted text-[11px] font-semibold ml-2">
              ${allProjects.length} WORKSPACES
            </span>
          </div>
          <h1 class="font-geist text-headline-xl font-bold text-text-primary tracking-tight">Software Engineering Projects</h1>
          <p class="text-body-sm text-text-muted mt-1">Manage project workspaces, delivery progress, and engineering teams</p>
        </div>

        <div class="flex items-center gap-3">
          <button id="new-project-btn" class="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary-fixed text-on-primary font-semibold text-body-md transition-all shadow-md shadow-primary/20 active:scale-95 cursor-pointer">
            <span class="material-symbols-outlined text-[20px]">add</span>
            <span>New Project</span>
          </button>
        </div>
      </div>

      <!-- Toolbar: Scope Filter, Search & Sort -->
      <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 bg-surface-canvas p-3 rounded-xl border border-border-subtle shadow-sm">
        <!-- Filter Tabs (All Projects vs My Projects) -->
        <div class="flex items-center p-1 bg-surface-base rounded-lg border border-border-subtle shrink-0">
          <button id="filter-all-projects-btn" class="px-3 py-1.5 rounded-md text-label-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${projectFilterScope === 'all' ? 'bg-surface-canvas text-text-primary shadow-sm border border-border-subtle' : 'text-text-muted hover:text-text-primary'}">
            <span>All Projects</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] ${projectFilterScope === 'all' ? 'bg-primary-container/20 text-primary' : 'bg-surface-panel text-text-muted'}">${allProjects.length}</span>
          </button>
          <button id="filter-my-projects-btn" class="px-3 py-1.5 rounded-md text-label-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${projectFilterScope === 'mine' ? 'bg-surface-canvas text-text-primary shadow-sm border border-border-subtle' : 'text-text-muted hover:text-text-primary'}">
            <span>My Projects</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] ${projectFilterScope === 'mine' ? 'bg-primary-container/20 text-primary' : 'bg-surface-panel text-text-muted'}">${myProjectsCount}</span>
          </button>
        </div>

        <!-- Search and Sort controls -->
        <div class="flex items-center flex-wrap gap-2.5 flex-1 justify-end">
          <!-- Search Input -->
          <div class="relative flex-1 min-w-[200px] max-w-sm">
            <span class="material-symbols-outlined absolute left-3 top-2 text-text-muted text-[18px]">search</span>
            <input type="text" id="project-search-input" value="${escapeHtml(projectSearchQuery)}" placeholder="Search by name, key, or scope..."
              class="w-full bg-surface-base text-text-primary text-body-sm pl-9 pr-8 py-1.5 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all" />
            ${projectSearchQuery ? `
              <button id="clear-project-search" class="absolute right-2.5 top-2 text-text-muted hover:text-text-primary text-[16px] cursor-pointer" title="Clear search">✕</button>
            ` : ''}
          </div>

          <!-- Sort Dropdown -->
          <div class="flex items-center gap-1.5 shrink-0">
            <span class="text-[12px] text-text-muted font-jetbrains hidden sm:inline">Sort:</span>
            <select id="project-sort-select" class="bg-surface-base text-text-primary text-body-sm px-3 py-1.5 rounded-lg border border-border-subtle focus:border-primary outline-none cursor-pointer">
              <option value="recently-active" ${projectSortBy === 'recently-active' ? 'selected' : ''}>Recently Active</option>
              <option value="name-asc" ${projectSortBy === 'name-asc' ? 'selected' : ''}>Alphabetical (A-Z)</option>
              <option value="progress-desc" ${projectSortBy === 'progress-desc' ? 'selected' : ''}>Highest Delivery %</option>
              <option value="reqs-desc" ${projectSortBy === 'reqs-desc' ? 'selected' : ''}>Most Requirements</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Projects Grid -->
      <div class="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${filtered.length === 0 ? `
          <div class="col-span-full bg-surface-canvas border border-border-subtle rounded-xl p-12 text-center">
            <span class="material-symbols-outlined text-text-muted text-[48px] mb-3">folder_off</span>
            <h3 class="font-geist text-headline-sm font-bold text-text-primary mb-1">No Projects Found</h3>
            <p class="text-text-muted text-body-sm max-w-sm mx-auto mb-4">No workspaces matched your search and filter criteria. Adjust filters or create a new project.</p>
            <button id="reset-project-filters-btn" class="px-4 py-2 bg-surface-panel hover:bg-surface-elevated text-text-primary rounded-lg text-body-sm font-medium border border-border-subtle cursor-pointer">
              Reset Filters
            </button>
          </div>
        ` : filtered.map(proj => {
          const isActive = proj.id === activeProjectId;
          const stats = projectStats.get(proj.id) || { reqs: [], tasks: [], members: [], completedReqs: 0, progress: 0 };
          const { reqs, tasks, members, completedReqs, progress } = stats;
          const userRole = store.getUserRole(proj.id) || 'Viewer';

          // SVG progress calculation: circle radius 26, circumference ~ 163.36
          const circumference = 163.36;
          const strokeOffset = circumference - (circumference * progress) / 100;

          return `
            <div class="bg-surface-canvas border ${isActive ? 'border-primary ring-2 ring-primary/40 shadow-xl shadow-primary/10' : 'border-border-subtle'} rounded-xl p-6 flex flex-col justify-between shadow-sm hover:border-border-strong transition-all group relative">
              
              <!-- Subtle Active Badge Corner Glow -->
              ${isActive ? `
                <div class="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-3.5 w-3.5 bg-primary"></span>
                </div>
              ` : ''}

              <div>
                <div class="flex items-start justify-between gap-3 mb-3">
                  <div class="flex items-center gap-2">
                    <span class="font-jetbrains text-mono-md px-2 py-0.5 rounded bg-primary-container/20 text-primary font-bold tracking-wider">${escapeHtml(proj.key)}</span>
                    <span class="font-jetbrains text-[10px] px-2 py-0.5 rounded bg-surface-panel text-text-secondary border border-border-subtle">${escapeHtml(userRole)}</span>
                  </div>
                  ${isActive ? `
                    <span class="flex items-center gap-1.5 font-jetbrains text-[11px] text-status-passed bg-status-passed-surface border border-status-passed/30 px-2.5 py-0.5 rounded-full font-semibold">
                      <span class="w-1.5 h-1.5 rounded-full bg-status-passed animate-pulse"></span>
                      ACTIVE WORKSPACE
                    </span>
                  ` : `
                    <button class="set-active-btn text-text-muted hover:text-primary text-[11px] font-jetbrains px-2.5 py-0.5 rounded bg-surface-panel hover:bg-surface-elevated border border-border-subtle transition-all cursor-pointer" data-id="${proj.id}">
                      Set Active
                    </button>
                  `}
                </div>

                <h3 class="font-geist text-headline-sm font-bold text-text-primary mb-1.5 group-hover:text-primary transition-colors">${escapeHtml(proj.name)}</h3>
                <p class="text-body-sm text-text-muted line-clamp-2 mb-4">${escapeHtml(proj.description || 'No description provided.')}</p>

                <!-- Requirements Delivery with Circular Progress Ring -->
                <div class="mb-4 p-3.5 rounded-xl bg-surface-base/80 border border-border-subtle/80 flex items-center justify-between gap-3">
                  <div class="flex-1">
                    <div class="flex items-center gap-1.5 text-text-muted text-[11px] font-jetbrains uppercase mb-1">
                      <span class="material-symbols-outlined text-[15px] text-secondary">donut_large</span>
                      <span>Requirements Delivery</span>
                    </div>
                    <div class="text-body-sm font-geist font-semibold text-text-primary">
                      ${completedReqs} of ${reqs.length} Done
                    </div>
                    <div class="text-[11px] text-text-muted font-jetbrains mt-0.5">
                      ${reqs.length - completedReqs} specifications pending
                    </div>
                  </div>

                  <!-- SVG Circular Progress Ring -->
                  <div class="relative w-14 h-14 shrink-0 flex items-center justify-center">
                    <svg class="w-14 h-14 transform -rotate-90" viewBox="0 0 64 64">
                      <!-- Background Track -->
                      <circle cx="32" cy="32" r="26" stroke="currentColor" stroke-width="4.5" fill="transparent" class="text-surface-panel" />
                      <!-- Dynamic Ring -->
                      <circle cx="32" cy="32" r="26" stroke="currentColor" stroke-width="4.5" fill="transparent"
                        stroke-dasharray="${circumference}" stroke-dashoffset="${strokeOffset}"
                        stroke-linecap="round"
                        class="${progress === 100 ? 'text-status-passed' : progress > 0 ? 'text-secondary' : 'text-text-muted/30'} transition-all duration-500" />
                    </svg>
                    <div class="absolute inset-0 flex items-center justify-center">
                      <span class="font-jetbrains text-[11px] font-bold text-text-primary">${progress}%</span>
                    </div>
                  </div>
                </div>

                <!-- Stats Row -->
                <div class="grid grid-cols-3 gap-2 p-2.5 bg-surface-base/50 rounded-lg border border-border-subtle text-center font-jetbrains text-mono-md mb-4">
                  <div>
                    <div class="text-text-muted text-[10px]">REQS</div>
                    <div class="font-bold text-text-primary">${reqs.length}</div>
                  </div>
                  <div>
                    <div class="text-text-muted text-[10px]">TASKS</div>
                    <div class="font-bold text-text-primary">${tasks.length}</div>
                  </div>
                  <div>
                    <div class="text-text-muted text-[10px]">MEMBERS</div>
                    <div class="font-bold text-text-primary">${members.length}</div>
                  </div>
                </div>
              </div>

              <!-- Footer with Member Avatars (with Tooltips) & Open Button -->
              <div class="pt-4 border-t border-border-subtle flex items-center justify-between">
                <div class="flex items-center -space-x-1.5">
                  ${members.slice(0, 4).map(m => `
                    <div class="relative group/avatar cursor-pointer">
                      ${avatar(m.userName, 'w-7 h-7 text-[10px] ring-2 ring-surface-canvas shadow-sm')}
                      <!-- Avatar Tooltip -->
                      <div class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/avatar:flex flex-col items-center z-50 animate-scale-in">
                        <div class="bg-surface-elevated text-text-primary text-[11px] font-sans px-2.5 py-1.5 rounded-lg shadow-xl border border-border-strong whitespace-nowrap">
                          <div class="font-bold text-text-primary">${escapeHtml(m.userName)}</div>
                          <div class="text-[10px] text-text-muted font-jetbrains">${escapeHtml(m.userEmail || '')}</div>
                          <div class="text-[9px] text-secondary font-jetbrains uppercase tracking-wider font-semibold mt-0.5">${escapeHtml(m.role || 'Member')}</div>
                        </div>
                        <div class="w-2 h-2 bg-surface-elevated rotate-45 -mt-1 border-r border-b border-border-strong"></div>
                      </div>
                    </div>
                  `).join('')}
                  ${members.length > 4 ? `
                    <div class="relative group/more cursor-pointer">
                      <span class="w-7 h-7 rounded-full bg-surface-elevated text-text-secondary text-[10px] flex items-center justify-center font-jetbrains font-bold ring-2 ring-surface-canvas shadow-sm">+${members.length - 4}</span>
                      <!-- More Members Tooltip -->
                      <div class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/more:flex flex-col items-center z-50 animate-scale-in">
                        <div class="bg-surface-elevated text-text-primary text-[11px] font-sans px-3 py-2 rounded-lg shadow-xl border border-border-strong whitespace-nowrap max-h-36 overflow-y-auto">
                          <div class="text-[10px] font-bold text-text-muted uppercase font-jetbrains mb-1">Additional Members</div>
                          ${members.slice(4).map(m => `
                            <div class="text-text-primary text-[11px] py-0.5">${escapeHtml(m.userName)} (${escapeHtml(m.role || 'Member')})</div>
                          `).join('')}
                        </div>
                        <div class="w-2 h-2 bg-surface-elevated rotate-45 -mt-1 border-r border-b border-border-strong"></div>
                      </div>
                    </div>
                  ` : ''}
                </div>

                <button class="open-proj-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-primary font-inter text-label-md border border-border-subtle transition-all cursor-pointer hover:border-primary" data-id="${proj.id}">
                  <span>Open</span>
                  <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          `;
        }).join('')}

        <!-- Add Project Placeholder Card -->
        <div id="new-project-card" class="bg-surface-panel/20 border-2 border-dashed border-border-subtle hover:border-primary/60 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-surface-panel/40 min-h-[300px] group">
          <div class="w-12 h-12 rounded-xl bg-surface-panel flex items-center justify-center text-text-muted mb-3 group-hover:text-primary group-hover:scale-110 transition-all shadow-sm">
            <span class="material-symbols-outlined text-[28px]">add_circle</span>
          </div>
          <h4 class="font-geist text-headline-sm font-semibold text-text-primary mb-1 group-hover:text-primary transition-colors">Create New Project</h4>
          <p class="text-text-muted text-body-sm max-w-xs">Initialize a new engineering workspace with requirements, board, and automated QA</p>
        </div>
      </div>
    </div>
  `;

  // Attach button triggers
  container.querySelector('#new-project-btn')?.addEventListener('click', openCreateProjectModal);
  container.querySelector('#new-project-card')?.addEventListener('click', openCreateProjectModal);

  // Search input event
  const searchInput = container.querySelector('#project-search-input');
  searchInput?.addEventListener('input', (e) => {
    projectSearchQuery = e.target.value;
    renderProjects(container);
  });

  // Clear search button
  container.querySelector('#clear-project-search')?.addEventListener('click', () => {
    projectSearchQuery = '';
    renderProjects(container);
  });

  // Scope filter tabs
  container.querySelector('#filter-all-projects-btn')?.addEventListener('click', () => {
    projectFilterScope = 'all';
    renderProjects(container);
  });

  container.querySelector('#filter-my-projects-btn')?.addEventListener('click', () => {
    projectFilterScope = 'mine';
    renderProjects(container);
  });

  // Sort dropdown
  container.querySelector('#project-sort-select')?.addEventListener('change', (e) => {
    projectSortBy = e.target.value;
    renderProjects(container);
  });

  // Reset filters
  container.querySelector('#reset-project-filters-btn')?.addEventListener('click', () => {
    projectSearchQuery = '';
    projectFilterScope = 'all';
    projectSortBy = 'recently-active';
    renderProjects(container);
  });

  container.querySelectorAll('.set-active-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pid = btn.dataset.id;
      store.setActiveProjectId(pid);
      showToast('Active project changed!', 'info');
      renderProjects(container);
    });
  });

  container.querySelectorAll('.open-proj-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pid = btn.dataset.id;
      store.setActiveProjectId(pid);
      window.location.hash = '#/dashboard';
    });
  });
}

export function openCreateProjectModal(onCreated) {
  showModal(`
    <form id="create-project-form" class="space-y-4">
      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1" for="proj-name">Project Name *</label>
        <input type="text" id="proj-name" required placeholder="e.g. Cloud Logistics API Platform"
          class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all" />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1" for="proj-key">Key Identifier *</label>
          <input type="text" id="proj-key" required maxlength="10" placeholder="e.g. LOGIST"
            class="w-full bg-surface-base text-text-primary font-jetbrains uppercase text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all" />
          <p class="text-[10px] text-text-muted mt-0.5 font-jetbrains">Unique 2-10 char prefix</p>
        </div>
        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1" for="proj-start">Target Start Date</label>
          <input type="date" id="proj-start" value="${new Date().toISOString().split('T')[0]}"
            class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all" />
        </div>
      </div>

      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1" for="proj-desc">Project Scope & Purpose *</label>
        <textarea id="proj-desc" rows="3" required placeholder="Describe core problem statement, system boundaries, and deliverables..."
          class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all"></textarea>
      </div>

      <div id="proj-error" class="hidden p-3 rounded-lg bg-status-defect-surface border border-status-defect/30 text-status-defect text-body-sm flex items-center gap-2">
        <span class="material-symbols-outlined text-[18px]">error</span>
        <span id="proj-error-text"></span>
      </div>

      <div class="flex justify-end gap-3 pt-3">
        <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-secondary hover:bg-surface-elevated text-body-md cursor-pointer">Cancel</button>
        <button type="submit" class="px-5 py-2 rounded-lg bg-primary text-on-primary font-semibold text-body-md hover:bg-primary-fixed shadow-md shadow-primary/20 cursor-pointer">Create Project</button>
      </div>
    </form>
  `, { title: 'Initialize New Engineering Project' });

  // Auto-generate key from name
  const nameInput = document.getElementById('proj-name');
  const keyInput = document.getElementById('proj-key');
  nameInput?.addEventListener('input', () => {
    if (!keyInput.dataset.manual) {
      const words = nameInput.value.trim().split(/\s+/).filter(Boolean);
      let key = words.map(w => w[0]).join('').slice(0, 5).toUpperCase();
      if (!key && words[0]) key = words[0].slice(0, 4).toUpperCase();
      keyInput.value = key;
    }
  });
  keyInput?.addEventListener('input', () => {
    keyInput.dataset.manual = 'true';
  });

  const form = document.getElementById('create-project-form');
  const errorBox = document.getElementById('proj-error');
  const errorText = document.getElementById('proj-error-text');

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');
    const name = nameInput.value.trim();
    const key = keyInput.value.trim().toUpperCase();
    const description = document.getElementById('proj-desc').value.trim();
    const startDate = document.getElementById('proj-start').value;

    const res = store.createProject({ name, key, description, startDate });
    if (res.error) {
      errorText.textContent = res.error;
      errorBox.classList.remove('hidden');
    } else {
      closeModal();
      showToast(`Project ${key} created successfully!`, 'success');
      if (typeof onCreated === 'function') {
        onCreated(res.data);
      } else {
        window.location.hash = '#/dashboard';
      }
    }
  });
}
