// DevTrack Requirements & MoSCoW Management + Audit History Diff
import { store } from '../store.js';
import { statusChip, priorityChip, formatDate, showToast, showModal, closeModal } from '../ui.js';

let currentFilterPriority = 'ALL';
let currentFilterStatus = 'ALL';
let searchQuery = '';

export function renderRequirements(container) {
  const project = store.getActiveProject();
  if (!project) {
    container.innerHTML = `<div class="p-12 text-center text-text-muted">Select or create a project first.</div>`;
    return;
  }

  const allReqs = store.getRequirements(project.id);
  const mCount = allReqs.filter(r => r.priority === 'Must').length;
  const sCount = allReqs.filter(r => r.priority === 'Should').length;
  const cCount = allReqs.filter(r => r.priority === 'Could').length;
  const wCount = allReqs.filter(r => r.priority === "Won't").length;

  let filtered = allReqs;
  if (currentFilterPriority !== 'ALL') {
    filtered = filtered.filter(r => r.priority === currentFilterPriority);
  }
  if (currentFilterStatus !== 'ALL') {
    filtered = filtered.filter(r => r.status === currentFilterStatus);
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(r => r.title.toLowerCase().includes(q) || (r.description && r.description.toLowerCase().includes(q)));
  }

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
            <span class="text-text-primary">SPECIFICATIONS</span>
          </div>
          <h1 class="font-geist text-headline-xl font-bold text-text-primary tracking-tight">Requirements & MoSCoW Management</h1>
          <p class="text-body-sm text-text-muted mt-1">Formalize elicitation, MoSCoW prioritization, acceptance criteria, and audit diff trails</p>
        </div>

        <div class="flex items-center gap-3">
          <button id="add-req-btn" class="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary-fixed text-on-primary font-semibold text-body-md transition-all shadow-md shadow-primary/20 active:scale-95">
            <span class="material-symbols-outlined text-[20px]">add</span>
            <span>New Requirement</span>
          </button>
        </div>
      </div>

      <!-- MoSCoW Filter Tabs & Stats -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <button class="moscow-tab p-3.5 rounded-xl border ${currentFilterPriority === 'ALL' ? 'border-primary bg-surface-canvas shadow-sm' : 'border-border-subtle bg-surface-panel/40 hover:bg-surface-panel'} text-left transition-all" data-priority="ALL">
          <div class="flex items-center justify-between text-text-muted text-[11px] font-jetbrains uppercase mb-1">
            <span>All Specs</span>
            <span class="material-symbols-outlined text-[16px]">list_alt</span>
          </div>
          <div class="font-geist text-headline-sm font-bold text-text-primary">${allReqs.length}</div>
        </button>

        <button class="moscow-tab p-3.5 rounded-xl border ${currentFilterPriority === 'Must' ? 'border-status-defect bg-surface-canvas shadow-sm' : 'border-border-subtle bg-surface-panel/40 hover:bg-surface-panel'} text-left transition-all" data-priority="Must">
          <div class="flex items-center justify-between text-status-defect text-[11px] font-jetbrains uppercase mb-1">
            <span class="font-bold">Must Have (M)</span>
            <span class="material-symbols-outlined text-[16px]">emergency</span>
          </div>
          <div class="font-geist text-headline-sm font-bold text-text-primary">${mCount}</div>
        </button>

        <button class="moscow-tab p-3.5 rounded-xl border ${currentFilterPriority === 'Should' ? 'border-status-in-progress bg-surface-canvas shadow-sm' : 'border-border-subtle bg-surface-panel/40 hover:bg-surface-panel'} text-left transition-all" data-priority="Should">
          <div class="flex items-center justify-between text-status-in-progress text-[11px] font-jetbrains uppercase mb-1">
            <span class="font-bold">Should Have (S)</span>
            <span class="material-symbols-outlined text-[16px]">trending_up</span>
          </div>
          <div class="font-geist text-headline-sm font-bold text-text-primary">${sCount}</div>
        </button>

        <button class="moscow-tab p-3.5 rounded-xl border ${currentFilterPriority === 'Could' ? 'border-secondary bg-surface-canvas shadow-sm' : 'border-border-subtle bg-surface-panel/40 hover:bg-surface-panel'} text-left transition-all" data-priority="Could">
          <div class="flex items-center justify-between text-secondary text-[11px] font-jetbrains uppercase mb-1">
            <span class="font-bold">Could Have (C)</span>
            <span class="material-symbols-outlined text-[16px]">lightbulb</span>
          </div>
          <div class="font-geist text-headline-sm font-bold text-text-primary">${cCount}</div>
        </button>

        <button class="moscow-tab p-3.5 rounded-xl border ${currentFilterPriority === "Won't" ? 'border-text-muted bg-surface-canvas shadow-sm' : 'border-border-subtle bg-surface-panel/40 hover:bg-surface-panel'} text-left transition-all" data-priority="Won't">
          <div class="flex items-center justify-between text-text-muted text-[11px] font-jetbrains uppercase mb-1">
            <span class="font-bold">Won't Have (W)</span>
            <span class="material-symbols-outlined text-[16px]">schedule</span>
          </div>
          <div class="font-geist text-headline-sm font-bold text-text-primary">${wCount}</div>
        </button>
      </div>

      <!-- Search & Status Toolbar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 bg-surface-canvas p-3 rounded-xl border border-border-subtle">
        <div class="relative flex-1 max-w-md">
          <span class="material-symbols-outlined absolute left-3 top-2.5 text-text-muted text-[18px]">search</span>
          <input type="text" id="req-search" value="${searchQuery}" placeholder="Filter by title or acceptance keyword..."
            class="w-full bg-surface-base text-text-primary text-body-md pl-10 pr-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all" />
        </div>

        <div class="flex items-center gap-2">
          <span class="text-label-md text-text-muted font-jetbrains">Status:</span>
          <select id="req-status-filter" class="bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none">
            <option value="ALL" ${currentFilterStatus === 'ALL' ? 'selected' : ''}>All Statuses</option>
            <option value="Draft" ${currentFilterStatus === 'Draft' ? 'selected' : ''}>Draft</option>
            <option value="Approved" ${currentFilterStatus === 'Approved' ? 'selected' : ''}>Approved</option>
            <option value="In Progress" ${currentFilterStatus === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Completed" ${currentFilterStatus === 'Completed' ? 'selected' : ''}>Completed</option>
            <option value="Rejected" ${currentFilterStatus === 'Rejected' ? 'selected' : ''}>Rejected</option>
          </select>
        </div>
      </div>

      <!-- Requirements List / Table -->
      <div class="space-y-4">
        ${filtered.length === 0 ? `
          <div class="bg-surface-canvas border border-border-subtle rounded-xl p-12 text-center">
            <span class="material-symbols-outlined text-text-muted text-[48px] mb-3">rule_folder</span>
            <h3 class="font-geist text-headline-sm font-bold text-text-primary mb-1">No Requirements Found</h3>
            <p class="text-text-muted text-body-sm max-w-sm mx-auto mb-4">No specifications matched your filter. Add your first requirement or adjust filters.</p>
            <button onclick="document.getElementById('add-req-btn').click()" class="px-4 py-2 bg-primary text-on-primary rounded-lg font-semibold text-body-md">Create Requirement</button>
          </div>
        ` : filtered.map(req => {
          const history = store.getRequirementHistory(req.id);
          const tasks = store.getTasks(project.id).filter(t => t.requirementIds?.includes(req.id));
          const testCases = store.getTestCases(project.id).filter(tc => tc.requirementIds?.includes(req.id));

          return `
            <div class="bg-surface-canvas border border-border-subtle rounded-xl p-5 hover:border-border-strong transition-all shadow-sm">
              <div class="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-3">
                <div class="flex-1">
                  <div class="flex items-center flex-wrap gap-2.5 mb-2">
                    <span class="font-jetbrains text-mono-md font-bold px-2 py-0.5 rounded bg-primary-container/20 text-primary">${req.id}</span>
                    ${priorityChip(req.priority)}
                    ${statusChip(req.status)}
                    <span class="font-jetbrains text-[11px] text-text-muted">Updated: ${formatDate(req.updatedAt)}</span>
                  </div>
                  <h3 class="font-geist text-headline-sm font-bold text-text-primary mb-1.5">${req.title}</h3>
                  <p class="text-body-md text-text-secondary mb-3">${req.description}</p>

                  <!-- Acceptance Criteria Box -->
                  ${req.acceptanceCriteria ? `
                    <div class="p-3 bg-surface-base/80 rounded-lg border border-border-subtle/80 mb-3">
                      <div class="flex items-center gap-1.5 text-text-muted text-[10px] font-jetbrains uppercase mb-1">
                        <span class="material-symbols-outlined text-[14px] text-secondary">fact_check</span>
                        <span>Acceptance Criteria</span>
                      </div>
                      <div class="text-body-sm text-text-primary font-jetbrains whitespace-pre-line">${req.acceptanceCriteria}</div>
                    </div>
                  ` : ''}

                  <!-- Linked Items badges -->
                  <div class="flex items-center flex-wrap gap-3 text-body-sm text-text-muted font-jetbrains text-[11px]">
                    <span class="flex items-center gap-1">
                      <span class="material-symbols-outlined text-[15px] text-secondary">task_alt</span>
                      <span>${tasks.length} Linked Tasks</span>
                    </span>
                    <span class="flex items-center gap-1">
                      <span class="material-symbols-outlined text-[15px] text-status-passed">verified</span>
                      <span>${testCases.length} Test Cases</span>
                    </span>
                    <button class="view-history-btn flex items-center gap-1 text-primary hover:underline ml-auto" data-id="${req.id}">
                      <span class="material-symbols-outlined text-[15px]">history</span>
                      <span>${history.length} Audit Revisions</span>
                    </button>
                  </div>
                </div>

                <!-- Actions menu -->
                <div class="flex items-center lg:flex-col gap-2 shrink-0">
                  <button class="edit-req-btn px-3 py-1.5 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-primary text-body-sm font-medium border border-border-subtle transition-colors flex items-center gap-1.5" data-id="${req.id}">
                    <span class="material-symbols-outlined text-[16px]">edit</span>
                    <span>Edit Status</span>
                  </button>
                  <button class="view-diff-btn px-3 py-1.5 rounded-lg bg-surface-panel hover:bg-surface-elevated text-secondary text-body-sm font-medium border border-border-subtle transition-colors flex items-center gap-1.5" data-id="${req.id}">
                    <span class="material-symbols-outlined text-[16px]">difference</span>
                    <span>View Diff</span>
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  // Attach search handler
  const searchInput = container.querySelector('#req-search');
  searchInput?.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderRequirements(container);
  });

  // Attach status filter
  const statusSelect = container.querySelector('#req-status-filter');
  statusSelect?.addEventListener('change', (e) => {
    currentFilterStatus = e.target.value;
    renderRequirements(container);
  });

  // Attach priority tab clicks
  container.querySelectorAll('.moscow-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      currentFilterPriority = tab.dataset.priority;
      renderRequirements(container);
    });
  });

  // Attach Add requirement trigger
  container.querySelector('#add-req-btn')?.addEventListener('click', () => {
    openRequirementModal(project.id, null, () => renderRequirements(container));
  });

  // Attach Edit requirement trigger
  container.querySelectorAll('.edit-req-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const rid = btn.dataset.id;
      const req = store.getRequirement(rid);
      if (req) openRequirementModal(project.id, req, () => renderRequirements(container));
    });
  });

  // Attach History & Diff triggers
  container.querySelectorAll('.view-history-btn, .view-diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const rid = btn.dataset.id;
      openRequirementHistoryModal(rid);
    });
  });
}

function openRequirementModal(projectId, existingReq = null, onSaved = null) {
  const isEdit = !!existingReq;
  const releases = store.getReleases(projectId);

  showModal(`
    <form id="req-modal-form" class="space-y-4">
      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Title *</label>
        <input type="text" id="modal-req-title" required value="${existingReq ? existingReq.title : ''}" placeholder="e.g. JWT Authentication with HttpOnly Cookies"
          class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all" />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">MoSCoW Priority *</label>
          <select id="modal-req-priority" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all">
            <option value="Must" ${existingReq?.priority === 'Must' ? 'selected' : ''}>Must Have (Critical)</option>
            <option value="Should" ${existingReq?.priority === 'Should' ? 'selected' : ''}>Should Have (Important)</option>
            <option value="Could" ${existingReq?.priority === 'Could' ? 'selected' : ''}>Could Have (Desirable)</option>
            <option value="Won't" ${existingReq?.priority === "Won't" ? 'selected' : ''}>Won't Have (Deferred)</option>
          </select>
        </div>

        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">Lifecycle Status *</label>
          <select id="modal-req-status" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all">
            <option value="Draft" ${existingReq?.status === 'Draft' ? 'selected' : ''}>Draft</option>
            <option value="Approved" ${existingReq?.status === 'Approved' ? 'selected' : ''}>Approved</option>
            <option value="In Progress" ${existingReq?.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Completed" ${existingReq?.status === 'Completed' ? 'selected' : ''}>Completed</option>
            <option value="Rejected" ${existingReq?.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
          </select>
        </div>
      </div>

      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Target Release</label>
        <select id="modal-req-release" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all">
          <option value="">Unassigned</option>
          ${releases.map(r => `<option value="${r.id}" ${existingReq?.targetRelease === r.id ? 'selected' : ''}>${r.name}</option>`).join('')}
        </select>
      </div>

      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Description *</label>
        <textarea id="modal-req-desc" rows="3" required placeholder="Functional scope and user requirement rationale..."
          class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all">${existingReq ? existingReq.description : ''}</textarea>
      </div>

      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Acceptance Criteria</label>
        <textarea id="modal-req-ac" rows="2" placeholder="Given... When... Then..."
          class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all">${existingReq?.acceptanceCriteria || ''}</textarea>
      </div>

      <div class="flex justify-end gap-3 pt-3">
        <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-secondary hover:bg-surface-elevated text-body-md">Cancel</button>
        <button type="submit" class="px-5 py-2 rounded-lg bg-primary text-on-primary font-semibold text-body-md hover:bg-primary-fixed shadow-md shadow-primary/20">
          ${isEdit ? 'Save Changes & Log Audit' : 'Create Requirement'}
        </button>
      </div>
    </form>
  `, { title: isEdit ? `Edit Requirement: ${existingReq.id}` : 'Create New Requirement' });

  document.getElementById('req-modal-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('modal-req-title').value.trim();
    const priority = document.getElementById('modal-req-priority').value;
    const status = document.getElementById('modal-req-status').value;
    const targetRelease = document.getElementById('modal-req-release').value || null;
    const description = document.getElementById('modal-req-desc').value.trim();
    const acceptanceCriteria = document.getElementById('modal-req-ac').value.trim();

    if (isEdit) {
      store.updateRequirement(existingReq.id, { title, priority, status, targetRelease, description, acceptanceCriteria });
      showToast('Requirement updated & audit record created!', 'success');
    } else {
      store.createRequirement(projectId, { title, priority, status, targetRelease, description, acceptanceCriteria });
      showToast('Requirement created!', 'success');
    }
    closeModal();
    if (onSaved) onSaved();
  });
}

function openRequirementHistoryModal(reqId) {
  const req = store.getRequirement(reqId);
  const history = store.getRequirementHistory(reqId);

  showModal(`
    <div class="space-y-4">
      <div class="p-3 bg-surface-panel/60 rounded-xl border border-border-subtle mb-4">
        <div class="flex items-center gap-2 mb-1">
          <span class="font-jetbrains text-mono-md font-bold text-primary">${req.id}</span>
          ${priorityChip(req.priority)}
          ${statusChip(req.status)}
        </div>
        <h4 class="font-geist text-headline-sm font-bold text-text-primary">${req.title}</h4>
      </div>

      <h5 class="font-jetbrains text-label-md uppercase text-text-muted">Chronological Audit History & Value Diff</h5>

      ${history.length === 0 ? `
        <div class="p-6 text-center text-text-muted text-body-sm">
          No field revisions have been logged yet for this specification.
        </div>
      ` : `
        <div class="space-y-3 max-h-80 overflow-y-auto pr-1">
          ${history.map((h, i) => {
            const author = store.getUser(h.changedBy) || (store.currentUser ? { name: store.currentUser.name } : { name: 'Workspace Author' });
            return `
              <div class="p-3 rounded-lg bg-surface-base border border-border-subtle font-jetbrains text-body-sm">
                <div class="flex items-center justify-between text-[11px] text-text-muted mb-2">
                  <span class="text-text-primary font-semibold">Change #${history.length - i} • Field: <code class="text-secondary">${h.field}</code></span>
                  <span>${formatDate(h.changedAt)}</span>
                </div>
                <div class="grid grid-cols-2 gap-2 text-mono-md">
                  <div class="p-2 rounded bg-status-defect-surface text-status-defect">
                    <span class="text-[10px] block uppercase opacity-75">- Previous</span>
                    <span class="line-through">${h.oldValue || '(empty)'}</span>
                  </div>
                  <div class="p-2 rounded bg-status-passed-surface text-status-passed">
                    <span class="text-[10px] block uppercase opacity-75">+ Modified</span>
                    <span>${h.newValue || '(empty)'}</span>
                  </div>
                </div>
                <div class="text-[10px] text-text-muted mt-2">Authorized by: <strong class="text-text-secondary">${author.name}</strong></div>
              </div>
            `;
          }).join('')}
        </div>
      `}

      <div class="flex justify-end pt-3 border-t border-border-subtle">
        <button onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-primary text-body-md hover:bg-surface-elevated">Close Audit Log</button>
      </div>
    </div>
  `, { title: 'Specification Audit Trail & Diffs' });
}
