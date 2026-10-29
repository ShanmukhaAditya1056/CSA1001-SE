// DevTrack Projects Directory & Management
import { store } from '../store.js';
import { formatDate, showToast, showModal, closeModal, avatar } from '../ui.js';

export function renderProjects(container) {
  const projects = store.getProjects();
  const activeProjectId = store.getActiveProjectId();

  container.innerHTML = `
    <div class="relative w-full px-6 py-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div class="flex items-center gap-2 font-jetbrains text-mono-md text-text-muted mb-1">
            <span>WORKSPACE</span>
            <span>/</span>
            <span class="text-secondary font-medium">PROJECT DIRECTORY</span>
          </div>
          <h1 class="font-geist text-headline-xl font-bold text-text-primary tracking-tight">Software Engineering Projects</h1>
          <p class="text-body-sm text-text-muted mt-1">Manage project workspaces, keys, and team membership</p>
        </div>

        <div class="flex items-center gap-3">
          <button id="new-project-btn" class="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary-fixed text-on-primary font-semibold text-body-md transition-all shadow-md shadow-primary/20 active:scale-95">
            <span class="material-symbols-outlined text-[20px]">add</span>
            <span>New Project</span>
          </button>
        </div>
      </div>

      <!-- Projects Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${projects.map(proj => {
          const isActive = proj.id === activeProjectId;
          const members = store.getMembers(proj.id);
          const reqs = store.getRequirements(proj.id);
          const tasks = store.getTasks(proj.id);
          const userRole = store.getUserRole(proj.id) || 'Member';
          const completedReqs = reqs.filter(r => r.status === 'Completed').length;
          const progress = reqs.length > 0 ? Math.round((completedReqs / reqs.length) * 100) : 0;

          return `
            <div class="bg-surface-canvas border ${isActive ? 'border-primary ring-1 ring-primary/40' : 'border-border-subtle'} rounded-xl p-6 flex flex-col justify-between shadow-sm hover:border-border-strong transition-all group">
              <div>
                <div class="flex items-start justify-between gap-3 mb-3">
                  <div class="flex items-center gap-2">
                    <span class="font-jetbrains text-mono-md px-2 py-0.5 rounded bg-primary-container/20 text-primary font-bold tracking-wider">${proj.key}</span>
                    <span class="font-jetbrains text-[10px] px-2 py-0.5 rounded bg-surface-panel text-text-secondary">${userRole}</span>
                  </div>
                  ${isActive ? `
                    <span class="flex items-center gap-1 font-jetbrains text-[11px] text-status-passed bg-status-passed-surface px-2 py-0.5 rounded-full font-semibold">
                      <span class="w-1.5 h-1.5 rounded-full bg-status-passed"></span>
                      ACTIVE
                    </span>
                  ` : `
                    <button class="set-active-btn text-text-muted hover:text-primary text-[11px] font-jetbrains px-2 py-0.5 rounded bg-surface-panel hover:bg-surface-elevated transition-colors" data-id="${proj.id}">
                      Set Active
                    </button>
                  `}
                </div>

                <h3 class="font-geist text-headline-sm font-bold text-text-primary mb-2 group-hover:text-primary transition-colors">${proj.name}</h3>
                <p class="text-body-sm text-text-muted line-clamp-2 mb-4">${proj.description || 'No description provided.'}</p>

                <!-- Progress Bar -->
                <div class="mb-4">
                  <div class="flex items-center justify-between text-body-sm text-text-muted mb-1.5">
                    <span>Requirements Delivery</span>
                    <span class="font-jetbrains text-mono-md text-text-primary font-semibold">${progress}%</span>
                  </div>
                  <div class="w-full bg-surface-base h-2 rounded-full overflow-hidden">
                    <div class="bg-secondary h-full rounded-full transition-all duration-300" style="width: ${progress}%"></div>
                  </div>
                </div>

                <!-- Stats Row -->
                <div class="grid grid-cols-3 gap-2 p-2.5 bg-surface-base/80 rounded-lg border border-border-subtle text-center font-jetbrains text-mono-md mb-4">
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

              <!-- Footer with Dates & Open Button -->
              <div class="pt-4 border-t border-border-subtle flex items-center justify-between">
                <div class="flex items-center -space-x-1.5">
                  ${members.slice(0, 3).map(m => avatar(m.userName, 'w-6 h-6 text-[10px] ring-2 ring-surface-canvas')).join('')}
                  ${members.length > 3 ? `<span class="w-6 h-6 rounded-full bg-surface-elevated text-text-secondary text-[10px] flex items-center justify-center font-jetbrains font-bold ring-2 ring-surface-canvas">+${members.length - 3}</span>` : ''}
                </div>

                <button class="open-proj-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-primary font-inter text-label-md border border-border-subtle transition-all" data-id="${proj.id}">
                  <span>Open</span>
                  <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          `;
        }).join('')}

        <!-- Add Project Placeholder Card -->
        <div id="new-project-card" class="bg-surface-panel/30 border-2 border-dashed border-border-subtle hover:border-primary/50 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-surface-panel/50 min-h-[300px]">
          <div class="w-12 h-12 rounded-xl bg-surface-panel flex items-center justify-center text-text-muted mb-3 group-hover:text-primary">
            <span class="material-symbols-outlined text-[28px]">add_circle</span>
          </div>
          <h4 class="font-geist text-headline-sm font-semibold text-text-primary mb-1">Create New Project</h4>
          <p class="text-text-muted text-body-sm max-w-xs">Initialize a new engineering workspace with requirements, board, and automated QA</p>
        </div>
      </div>
    </div>
  `;

  // Attach button triggers
  container.querySelector('#new-project-btn')?.addEventListener('click', openCreateProjectModal);
  container.querySelector('#new-project-card')?.addEventListener('click', openCreateProjectModal);

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

export function openCreateProjectModal() {
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
        <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-secondary hover:bg-surface-elevated text-body-md">Cancel</button>
        <button type="submit" class="px-5 py-2 rounded-lg bg-primary text-on-primary font-semibold text-body-md hover:bg-primary-fixed shadow-md shadow-primary/20">Create Project</button>
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
      window.location.hash = '#/dashboard';
    }
  });
}
