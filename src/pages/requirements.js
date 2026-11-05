// DevTrack Requirements & MoSCoW Management + Audit History Diff + CSV Data Portability
import { store } from '../store.js';
import { statusChip, priorityChip, formatDate, showToast, showModal, closeModal, showConfirm, escapeHtml } from '../ui.js';

let currentFilterPriority = 'ALL';
let currentFilterStatus = 'ALL';
let searchQuery = '';
let selectedReqIds = new Set();
let expandedReqIds = new Set();

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

  // Filter
  let filtered = allReqs;
  if (currentFilterPriority !== 'ALL') {
    filtered = filtered.filter(r => r.priority === currentFilterPriority);
  }
  if (currentFilterStatus !== 'ALL') {
    filtered = filtered.filter(r => r.status === currentFilterStatus);
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(r =>
      (r.title && r.title.toLowerCase().includes(q)) ||
      (r.id && r.id.toLowerCase().includes(q)) ||
      (r.description && r.description.toLowerCase().includes(q)) ||
      (r.acceptanceCriteria && r.acceptanceCriteria.toLowerCase().includes(q))
    );
  }

  // Cleanup selection of non-existent IDs
  const allReqIdSet = new Set(allReqs.map(r => r.id));
  for (const id of selectedReqIds) {
    if (!allReqIdSet.has(id)) selectedReqIds.delete(id);
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every(r => selectedReqIds.has(r.id));
  const someSelected = selectedReqIds.size > 0;

  container.innerHTML = `
    <div class="relative w-full px-6 py-6 pb-28">
      <!-- Ambient Background Glow -->
      <div class="absolute -top-32 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Header -->
      <div class="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div class="flex items-center gap-2 font-jetbrains text-mono-md text-text-muted mb-1">
            <span>${escapeHtml(project.key)}</span>
            <span>/</span>
            <span class="text-secondary font-medium">LIFECYCLE PLANNING</span>
            <span>/</span>
            <span class="text-text-primary">SPECIFICATIONS</span>
            <span class="px-2 py-0.5 rounded-full bg-surface-elevated text-text-muted text-[11px] font-semibold ml-2">
              ${allReqs.length} SPECIFICATIONS
            </span>
          </div>
          <h1 class="font-geist text-headline-xl font-bold text-text-primary tracking-tight">Requirements & MoSCoW Management</h1>
          <p class="text-body-sm text-text-muted mt-1">Formalize elicitation, MoSCoW prioritization, acceptance criteria, and audit diff trails</p>
        </div>

        <div class="flex items-center flex-wrap gap-2.5">
          <!-- Data Portability: Import/Export Buttons -->
          <button id="export-reqs-csv-btn" class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-primary font-inter text-label-md border border-border-subtle transition-all cursor-pointer shadow-sm active:scale-95" title="Export current project requirements as CSV">
            <span class="material-symbols-outlined text-[18px] text-secondary">download</span>
            <span>Export CSV</span>
          </button>

          <button id="import-reqs-csv-btn" class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-primary font-inter text-label-md border border-border-subtle transition-all cursor-pointer shadow-sm active:scale-95" title="Import specifications from CSV file">
            <span class="material-symbols-outlined text-[18px] text-primary">upload_file</span>
            <span>Import CSV</span>
          </button>

          <button id="add-req-btn" class="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-fixed text-on-primary font-semibold text-label-md transition-all shadow-md shadow-primary/20 active:scale-95 cursor-pointer">
            <span class="material-symbols-outlined text-[18px]">add</span>
            <span>New Requirement</span>
          </button>
        </div>
      </div>

      <!-- MoSCoW Filter Tabs & Stats (Interactive Instant Click Filters) -->
      <div class="relative z-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <!-- ALL TAB -->
        <button class="moscow-tab group p-3.5 rounded-xl border text-left transition-all cursor-pointer ${currentFilterPriority === 'ALL' ? 'border-primary bg-primary/10 shadow-md ring-1 ring-primary/40' : 'border-border-subtle bg-surface-canvas hover:bg-surface-panel/60'}" data-priority="ALL">
          <div class="flex items-center justify-between text-text-muted text-[11px] font-jetbrains uppercase mb-1">
            <span class="group-hover:text-primary transition-colors">All Specs</span>
            <span class="material-symbols-outlined text-[16px] ${currentFilterPriority === 'ALL' ? 'text-primary' : 'text-text-muted'}">list_alt</span>
          </div>
          <div class="flex items-baseline justify-between">
            <span class="font-geist text-headline-sm font-bold text-text-primary">${allReqs.length}</span>
            ${currentFilterPriority === 'ALL' ? `<span class="text-[10px] font-jetbrains text-primary font-bold">FILTERED</span>` : ''}
          </div>
        </button>

        <!-- MUST HAVE TAB -->
        <button class="moscow-tab group p-3.5 rounded-xl border text-left transition-all cursor-pointer ${currentFilterPriority === 'Must' ? 'border-status-defect bg-status-defect-surface shadow-md ring-1 ring-status-defect/40' : 'border-border-subtle bg-surface-canvas hover:bg-surface-panel/60'}" data-priority="Must">
          <div class="flex items-center justify-between text-status-defect text-[11px] font-jetbrains uppercase mb-1">
            <span class="font-bold">Must Have (M)</span>
            <span class="material-symbols-outlined text-[16px]">emergency</span>
          </div>
          <div class="flex items-baseline justify-between">
            <span class="font-geist text-headline-sm font-bold text-text-primary">${mCount}</span>
            ${currentFilterPriority === 'Must' ? `<span class="text-[10px] font-jetbrains text-status-defect font-bold">FILTERED</span>` : ''}
          </div>
        </button>

        <!-- SHOULD HAVE TAB -->
        <button class="moscow-tab group p-3.5 rounded-xl border text-left transition-all cursor-pointer ${currentFilterPriority === 'Should' ? 'border-status-in-progress bg-status-in-progress-surface shadow-md ring-1 ring-status-in-progress/40' : 'border-border-subtle bg-surface-canvas hover:bg-surface-panel/60'}" data-priority="Should">
          <div class="flex items-center justify-between text-status-in-progress text-[11px] font-jetbrains uppercase mb-1">
            <span class="font-bold">Should Have (S)</span>
            <span class="material-symbols-outlined text-[16px]">trending_up</span>
          </div>
          <div class="flex items-baseline justify-between">
            <span class="font-geist text-headline-sm font-bold text-text-primary">${sCount}</span>
            ${currentFilterPriority === 'Should' ? `<span class="text-[10px] font-jetbrains text-status-in-progress font-bold">FILTERED</span>` : ''}
          </div>
        </button>

        <!-- COULD HAVE TAB -->
        <button class="moscow-tab group p-3.5 rounded-xl border text-left transition-all cursor-pointer ${currentFilterPriority === 'Could' ? 'border-secondary bg-secondary/10 shadow-md ring-1 ring-secondary/40' : 'border-border-subtle bg-surface-canvas hover:bg-surface-panel/60'}" data-priority="Could">
          <div class="flex items-center justify-between text-secondary text-[11px] font-jetbrains uppercase mb-1">
            <span class="font-bold">Could Have (C)</span>
            <span class="material-symbols-outlined text-[16px]">lightbulb</span>
          </div>
          <div class="flex items-baseline justify-between">
            <span class="font-geist text-headline-sm font-bold text-text-primary">${cCount}</span>
            ${currentFilterPriority === 'Could' ? `<span class="text-[10px] font-jetbrains text-secondary font-bold">FILTERED</span>` : ''}
          </div>
        </button>

        <!-- WON'T HAVE TAB -->
        <button class="moscow-tab group p-3.5 rounded-xl border text-left transition-all cursor-pointer ${currentFilterPriority === "Won't" ? 'border-text-muted bg-surface-panel shadow-md ring-1 ring-border-strong' : 'border-border-subtle bg-surface-canvas hover:bg-surface-panel/60'}" data-priority="Won't">
          <div class="flex items-center justify-between text-text-muted text-[11px] font-jetbrains uppercase mb-1">
            <span class="font-bold">Won't Have (W)</span>
            <span class="material-symbols-outlined text-[16px]">schedule</span>
          </div>
          <div class="flex items-baseline justify-between">
            <span class="font-geist text-headline-sm font-bold text-text-primary">${wCount}</span>
            ${currentFilterPriority === "Won't" ? `<span class="text-[10px] font-jetbrains text-text-muted font-bold">FILTERED</span>` : ''}
          </div>
        </button>
      </div>

      <!-- Search & Controls Toolbar -->
      <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 bg-surface-canvas p-3 rounded-xl border border-border-subtle shadow-sm">
        <div class="flex items-center gap-3 flex-1">
          <!-- Master Select All Checkbox -->
          <label class="flex items-center gap-2 text-label-sm text-text-muted font-jetbrains cursor-pointer select-none">
            <input type="checkbox" id="master-select-all" ${allFilteredSelected ? 'checked' : ''} class="w-4 h-4 rounded text-primary focus:ring-primary bg-surface-base border-border-subtle cursor-pointer" />
            <span class="hidden sm:inline">Select All (${filtered.length})</span>
          </label>

          <!-- Search Input -->
          <div class="relative flex-1 max-w-md">
            <span class="material-symbols-outlined absolute left-3 top-2 text-text-muted text-[18px]">search</span>
            <input type="text" id="req-search" value="${escapeHtml(searchQuery)}" placeholder="Search by title, ID, acceptance keywords..."
              class="w-full bg-surface-base text-text-primary text-body-sm pl-9 pr-8 py-1.5 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all" />
            ${searchQuery ? `
              <button id="clear-req-search" class="absolute right-2.5 top-2 text-text-muted hover:text-text-primary text-[16px] cursor-pointer" title="Clear">✕</button>
            ` : ''}
          </div>
        </div>

        <div class="flex items-center gap-2.5 shrink-0">
          <!-- Status Filter Dropdown -->
          <div class="flex items-center gap-1.5">
            <span class="text-[12px] text-text-muted font-jetbrains hidden sm:inline">Status:</span>
            <select id="req-status-filter" class="bg-surface-base text-text-primary text-body-sm px-3 py-1.5 rounded-lg border border-border-subtle focus:border-primary outline-none cursor-pointer">
              <option value="ALL" ${currentFilterStatus === 'ALL' ? 'selected' : ''}>All Statuses</option>
              <option value="Draft" ${currentFilterStatus === 'Draft' ? 'selected' : ''}>Draft</option>
              <option value="Approved" ${currentFilterStatus === 'Approved' ? 'selected' : ''}>Approved</option>
              <option value="In Development" ${currentFilterStatus === 'In Development' ? 'selected' : ''}>In Development</option>
              <option value="Implemented" ${currentFilterStatus === 'Implemented' ? 'selected' : ''}>Implemented</option>
              <option value="Rejected" ${currentFilterStatus === 'Rejected' ? 'selected' : ''}>Rejected</option>
            </select>
          </div>

          <!-- Expand/Collapse All Toggle -->
          <button id="toggle-expand-all-btn" class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-muted hover:text-text-primary text-label-sm border border-border-subtle cursor-pointer transition-colors" title="Expand or collapse acceptance criteria & audits">
            <span class="material-symbols-outlined text-[16px]">${expandedReqIds.size === filtered.length && filtered.length > 0 ? 'unfold_less' : 'unfold_more'}</span>
            <span class="hidden sm:inline">${expandedReqIds.size === filtered.length && filtered.length > 0 ? 'Collapse All' : 'Expand All'}</span>
          </button>
        </div>
      </div>

      <!-- Requirements List / Table -->
      <div class="relative z-10 space-y-3">
        ${filtered.length === 0 ? `
          <div class="bg-surface-canvas border border-border-subtle rounded-xl p-12 text-center shadow-sm">
            <span class="material-symbols-outlined text-text-muted text-[48px] mb-3">rule_folder</span>
            <h3 class="font-geist text-headline-sm font-bold text-text-primary mb-1">No Requirements Found</h3>
            <p class="text-text-muted text-body-sm max-w-sm mx-auto mb-4">No specifications matched your filter. Add your first requirement or adjust filters.</p>
            <button id="empty-add-req-btn" class="px-4 py-2 bg-primary text-on-primary rounded-lg font-semibold text-body-md cursor-pointer hover:bg-primary-fixed">Create Requirement</button>
          </div>
        ` : filtered.map(req => {
          const isSelected = selectedReqIds.has(req.id);
          const isExpanded = expandedReqIds.has(req.id);
          const history = store.getRequirementHistory(req.id);
          const tasks = store.getTasks(project.id).filter(t => t.requirementIds?.includes(req.id));
          const testCases = store.getTestCases(project.id).filter(tc => tc.requirementIds?.includes(req.id));

          return `
            <div class="bg-surface-canvas border ${isSelected ? 'border-primary ring-1 ring-primary/40 bg-primary/[0.02]' : 'border-border-subtle'} rounded-xl transition-all shadow-sm hover:border-border-strong overflow-hidden" id="req-card-${req.id}">
              
              <!-- Main Compact Summary Row -->
              <div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                  <!-- Row Checkbox -->
                  <input type="checkbox" class="req-row-checkbox w-4 h-4 rounded text-primary focus:ring-primary bg-surface-base border-border-subtle cursor-pointer mt-1 sm:mt-0 shrink-0" data-id="${req.id}" ${isSelected ? 'checked' : ''} />

                  <div class="min-w-0 flex-1">
                    <div class="flex items-center flex-wrap gap-2 mb-1">
                      <span class="font-jetbrains text-mono-md font-bold px-2 py-0.5 rounded bg-primary-container/20 text-primary text-[12px]">${escapeHtml(req.id)}</span>
                      ${priorityChip(req.priority)}
                      ${statusChip(req.status)}
                      <span class="font-jetbrains text-[11px] text-text-muted ml-auto sm:ml-0">Updated: ${formatDate(req.updatedAt)}</span>
                    </div>

                    <div class="flex items-center gap-2">
                      <h3 class="font-geist text-body-md sm:text-headline-sm font-bold text-text-primary truncate">${escapeHtml(req.title)}</h3>
                    </div>

                    <!-- Compact snippet when collapsed -->
                    ${!isExpanded && req.description ? `
                      <p class="text-body-sm text-text-muted truncate mt-0.5 max-w-2xl">${escapeHtml(req.description)}</p>
                    ` : ''}
                  </div>
                </div>

                <!-- Action Controls & Expand Accordion Button -->
                <div class="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <!-- Edit Requirement Button -->
                  <button class="edit-req-btn px-2.5 py-1.5 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-primary text-label-sm border border-border-subtle transition-colors flex items-center gap-1 cursor-pointer" data-id="${req.id}" title="Edit specification">
                    <span class="material-symbols-outlined text-[16px]">edit</span>
                    <span class="hidden md:inline">Edit</span>
                  </button>

                  <!-- View Diff / History Button -->
                  <button class="view-diff-btn px-2.5 py-1.5 rounded-lg bg-surface-panel hover:bg-surface-elevated text-secondary text-label-sm border border-border-subtle transition-colors flex items-center gap-1 cursor-pointer" data-id="${req.id}" title="Audit trail & diffs">
                    <span class="material-symbols-outlined text-[16px]">difference</span>
                    <span class="hidden md:inline">Diff</span>
                  </button>

                  <!-- Expand / Collapse Details Drawer -->
                  <button class="toggle-expand-btn px-2 py-1.5 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-secondary hover:text-text-primary text-label-sm border border-border-subtle transition-colors flex items-center gap-1 cursor-pointer" data-id="${req.id}" title="${isExpanded ? 'Hide acceptance criteria & audit' : 'Show acceptance criteria & audit'}">
                    <span class="material-symbols-outlined text-[18px] transition-transform duration-200 ${isExpanded ? 'rotate-180 text-primary' : ''}">expand_more</span>
                    <span class="text-[11px] font-jetbrains hidden lg:inline">${isExpanded ? 'Details' : 'Details'}</span>
                  </button>
                </div>
              </div>

              <!-- Expandable Details Accordion Drawer -->
              ${isExpanded ? `
                <div class="px-5 pb-5 pt-2 border-t border-border-subtle/80 bg-surface-base/40 animate-slide-in space-y-3.5">
                  <!-- Full Description -->
                  <div>
                    <div class="text-[11px] font-jetbrains uppercase tracking-wider text-text-muted mb-1 font-semibold">Specification Description</div>
                    <p class="text-body-sm text-text-primary leading-relaxed">${escapeHtml(req.description || 'No detailed description provided.')}</p>
                  </div>

                  <!-- Acceptance Criteria Box -->
                  ${req.acceptanceCriteria ? `
                    <div class="p-3.5 bg-surface-base rounded-xl border border-border-subtle">
                      <div class="flex items-center gap-1.5 text-text-muted text-[11px] font-jetbrains uppercase mb-1.5 font-bold">
                        <span class="material-symbols-outlined text-[16px] text-secondary">fact_check</span>
                        <span>Formal Acceptance Criteria</span>
                      </div>
                      <div class="text-body-sm text-text-primary font-jetbrains whitespace-pre-line leading-relaxed bg-surface-canvas/60 p-2.5 rounded-lg border border-border-subtle/60">${escapeHtml(req.acceptanceCriteria)}</div>
                    </div>
                  ` : `
                    <div class="text-[12px] text-text-muted italic flex items-center gap-1.5">
                      <span class="material-symbols-outlined text-[14px]">info</span>
                      <span>No acceptance criteria formalization attached.</span>
                    </div>
                  `}

                  <!-- Linked Lifecycle Artifacts & Audit Info -->
                  <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border-subtle/60">
                    <div class="flex items-center flex-wrap gap-3 font-jetbrains text-[11px]">
                      <span class="flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary/10 text-secondary border border-secondary/20">
                        <span class="material-symbols-outlined text-[14px]">task_alt</span>
                        <span>${tasks.length} Linked Sprint Tasks</span>
                      </span>
                      <span class="flex items-center gap-1 px-2.5 py-1 rounded-md bg-status-passed-surface text-status-passed border border-status-passed/20">
                        <span class="material-symbols-outlined text-[14px]">verified</span>
                        <span>${testCases.length} QA Assertions</span>
                      </span>
                      ${req.targetRelease ? `
                        <span class="flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary-container/20 text-primary border border-primary/20">
                          <span class="material-symbols-outlined text-[14px]">rocket_launch</span>
                          <span>Release Tagged</span>
                        </span>
                      ` : ''}
                    </div>

                    <button class="view-history-btn flex items-center gap-1 text-primary hover:underline text-[12px] font-jetbrains cursor-pointer" data-id="${req.id}">
                      <span class="material-symbols-outlined text-[16px]">history</span>
                      <span>${history.length} Audit Revisions Recorded</span>
                    </button>
                  </div>
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>

      <!-- Sticky Floating Bulk Action Bar (Visible when >= 1 requirement selected) -->
      ${someSelected ? `
        <div id="bulk-action-bar" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-4xl bg-surface-canvas/95 backdrop-blur-md border border-primary/40 rounded-2xl p-3.5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 animate-slide-in ring-2 ring-primary/20">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-jetbrains font-bold text-mono-md shrink-0">
              ${selectedReqIds.size}
            </div>
            <div>
              <div class="font-geist text-body-md font-bold text-text-primary">
                ${selectedReqIds.size} requirement${selectedReqIds.size > 1 ? 's' : ''} selected
              </div>
              <div class="text-[11px] text-text-muted font-jetbrains">
                Apply batch updates or remove selected items
              </div>
            </div>
          </div>

          <div class="flex items-center flex-wrap gap-2 shrink-0">
            <!-- Bulk Update Status -->
            <select id="bulk-status-select" class="bg-surface-base text-text-primary text-body-sm px-3 py-1.5 rounded-lg border border-border-subtle focus:border-primary outline-none cursor-pointer">
              <option value="">Bulk Status...</option>
              <option value="Draft">Set Draft</option>
              <option value="Approved">Set Approved</option>
              <option value="In Development">Set In Development</option>
              <option value="Implemented">Set Implemented</option>
              <option value="Rejected">Set Rejected</option>
            </select>

            <!-- Bulk Change Priority -->
            <select id="bulk-priority-select" class="bg-surface-base text-text-primary text-body-sm px-3 py-1.5 rounded-lg border border-border-subtle focus:border-primary outline-none cursor-pointer">
              <option value="">Bulk MoSCoW...</option>
              <option value="Must">Set Must Have (M)</option>
              <option value="Should">Set Should Have (S)</option>
              <option value="Could">Set Could Have (C)</option>
              <option value="Won't">Set Won't Have (W)</option>
            </select>

            <!-- Bulk Delete -->
            <button id="bulk-delete-btn" class="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-status-defect-surface text-status-defect hover:bg-status-defect hover:text-on-error border border-status-defect/30 text-label-sm font-semibold transition-all cursor-pointer">
              <span class="material-symbols-outlined text-[16px]">delete</span>
              <span>Delete</span>
            </button>

            <!-- Deselect All -->
            <button id="bulk-clear-btn" class="px-3 py-1.5 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-muted hover:text-text-primary text-label-sm border border-border-subtle transition-colors cursor-pointer">
              Deselect
            </button>
          </div>
        </div>
      ` : ''}
    </div>
  `;

  // Attach search handler
  const searchInput = container.querySelector('#req-search');
  searchInput?.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderRequirements(container);
  });

  // Clear search
  container.querySelector('#clear-req-search')?.addEventListener('click', () => {
    searchQuery = '';
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
      const priority = tab.dataset.priority;
      currentFilterPriority = currentFilterPriority === priority && priority !== 'ALL' ? 'ALL' : priority;
      renderRequirements(container);
    });
  });

  // Master Select All checkbox
  const masterSelect = container.querySelector('#master-select-all');
  masterSelect?.addEventListener('change', (e) => {
    if (e.target.checked) {
      filtered.forEach(r => selectedReqIds.add(r.id));
    } else {
      filtered.forEach(r => selectedReqIds.delete(r.id));
    }
    renderRequirements(container);
  });

  // Row Checkbox clicks
  container.querySelectorAll('.req-row-checkbox').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const id = cb.dataset.id;
      if (e.target.checked) {
        selectedReqIds.add(id);
      } else {
        selectedReqIds.delete(id);
      }
      renderRequirements(container);
    });
  });

  // Expand / Collapse Accordion single toggle
  container.querySelectorAll('.toggle-expand-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if (expandedReqIds.has(id)) {
        expandedReqIds.delete(id);
      } else {
        expandedReqIds.add(id);
      }
      renderRequirements(container);
    });
  });

  // Expand All / Collapse All toggle
  container.querySelector('#toggle-expand-all-btn')?.addEventListener('click', () => {
    if (expandedReqIds.size === filtered.length && filtered.length > 0) {
      expandedReqIds.clear();
    } else {
      filtered.forEach(r => expandedReqIds.add(r.id));
    }
    renderRequirements(container);
  });

  // Bulk Operations Handlers
  container.querySelector('#bulk-clear-btn')?.addEventListener('click', () => {
    selectedReqIds.clear();
    renderRequirements(container);
  });

  // Bulk Status Update
  const bulkStatusSelect = container.querySelector('#bulk-status-select');
  bulkStatusSelect?.addEventListener('change', (e) => {
    const newStatus = e.target.value;
    if (!newStatus) return;
    const targetIds = Array.from(selectedReqIds);
    let successCount = 0;
    targetIds.forEach(id => {
      const res = store.updateRequirement(id, { status: newStatus });
      if (!res.error) successCount++;
    });
    showToast(`Updated status to ${newStatus} for ${successCount} requirement${successCount > 1 ? 's' : ''}.`, 'success');
    selectedReqIds.clear();
    renderRequirements(container);
  });

  // Bulk Priority Update
  const bulkPrioritySelect = container.querySelector('#bulk-priority-select');
  bulkPrioritySelect?.addEventListener('change', (e) => {
    const newPriority = e.target.value;
    if (!newPriority) return;
    const targetIds = Array.from(selectedReqIds);
    let successCount = 0;
    targetIds.forEach(id => {
      const res = store.updateRequirement(id, { priority: newPriority });
      if (!res.error) successCount++;
    });
    showToast(`Updated priority to ${newPriority} for ${successCount} requirement${successCount > 1 ? 's' : ''}.`, 'success');
    selectedReqIds.clear();
    renderRequirements(container);
  });

  // Bulk Delete
  container.querySelector('#bulk-delete-btn')?.addEventListener('click', () => {
    const targetIds = Array.from(selectedReqIds);
    showConfirm(
      `Are you sure you want to delete ${targetIds.length} requirement${targetIds.length > 1 ? 's' : ''}? This operation will remove associated audit records.`,
      () => {
        let deletedCount = 0;
        targetIds.forEach(id => {
          const res = store.deleteRequirement(id);
          if (!res.error) deletedCount++;
        });
        showToast(`Permanently deleted ${deletedCount} requirement${deletedCount > 1 ? 's' : ''}.`, 'info');
        selectedReqIds.clear();
        renderRequirements(container);
      },
      { title: 'Bulk Delete Requirements', destructive: true, confirmText: 'Delete All' }
    );
  });

  // CSV Export Handler
  container.querySelector('#export-reqs-csv-btn')?.addEventListener('click', () => {
    exportRequirementsCSV(project, allReqs);
  });

  // CSV Import Handler
  container.querySelector('#import-reqs-csv-btn')?.addEventListener('click', () => {
    openImportCSVModal(project.id, () => renderRequirements(container));
  });

  // Attach Add requirement trigger
  container.querySelector('#add-req-btn')?.addEventListener('click', () => {
    openRequirementModal(project.id, null, () => renderRequirements(container));
  });
  container.querySelector('#empty-add-req-btn')?.addEventListener('click', () => {
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

// ===== CSV EXPORT =====
function exportRequirementsCSV(project, reqs) {
  if (!reqs.length) {
    showToast('No requirements to export.', 'info');
    return;
  }

  const headers = ['ID', 'Title', 'Priority', 'Status', 'Target Release', 'Description', 'Acceptance Criteria', 'Created At', 'Updated At'];
  
  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = reqs.map(r => [
    escapeCsv(r.id),
    escapeCsv(r.title),
    escapeCsv(r.priority),
    escapeCsv(r.status),
    escapeCsv(r.targetRelease || ''),
    escapeCsv(r.description || ''),
    escapeCsv(r.acceptanceCriteria || ''),
    escapeCsv(r.createdAt || ''),
    escapeCsv(r.updatedAt || '')
  ].join(','));

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.key}_Requirements_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`Exported ${reqs.length} specifications to CSV!`, 'success');
}

// ===== CSV IMPORT =====
function openImportCSVModal(projectId, onImported) {
  showModal(`
    <div class="space-y-4">
      <div class="p-3.5 rounded-xl bg-surface-base border border-primary/30 flex items-start gap-3">
        <span class="material-symbols-outlined text-primary text-[22px] shrink-0 mt-0.5">upload_file</span>
        <div class="text-[12px]">
          <span class="font-bold text-text-primary block">Bulk CSV Requirement Ingestion</span>
          <span class="text-text-muted">Import external product backlogs into this workspace. Columns supported: <code>Title</code> (required), <code>Priority</code> (Must/Should/Could/Won't), <code>Status</code>, <code>Description</code>, <code>Acceptance Criteria</code>.</span>
        </div>
      </div>

      <!-- File Upload Dropzone -->
      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1.5">Upload CSV File</label>
        <div id="csv-dropzone" class="p-5 border-2 border-dashed border-border-subtle hover:border-primary/60 rounded-xl bg-surface-panel/30 text-center cursor-pointer transition-all">
          <span class="material-symbols-outlined text-text-muted text-[32px] mb-1">cloud_upload</span>
          <div class="text-body-sm font-semibold text-text-primary">Click to select CSV or drag file here</div>
          <div class="text-[11px] text-text-muted mt-0.5 font-jetbrains">Supports .csv (RFC 4180)</div>
          <input type="file" id="csv-file-input" accept=".csv,text/csv" class="hidden" />
        </div>
      </div>

      <!-- Or Paste Direct CSV Text -->
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="block text-label-md font-medium text-text-secondary">Or Paste CSV Plaintext</label>
          <button type="button" id="insert-sample-csv-btn" class="text-[11px] text-primary hover:underline font-jetbrains cursor-pointer">Insert Sample Template</button>
        </div>
        <textarea id="csv-raw-input" rows="4" placeholder="Title,Priority,Status,Description,Acceptance Criteria&#10;User MFA Verification,Must,Draft,Enable 2FA via TOTP authenticator app,Given valid TOTP code When entered Then login succeeds"
          class="w-full bg-surface-base text-text-primary font-jetbrains text-[12px] p-2.5 rounded-lg border border-border-subtle focus:border-primary outline-none"></textarea>
      </div>

      <!-- Parsed Preview Box -->
      <div id="csv-preview-container" class="hidden">
        <div class="flex items-center justify-between mb-1.5 text-label-sm font-jetbrains">
          <span class="text-text-primary font-bold flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[16px] text-status-passed">check_circle</span>
            <span id="csv-preview-count">0 requirements detected</span>
          </span>
          <span class="text-text-muted text-[11px]">Ready to ingest</span>
        </div>
        <div class="max-h-36 overflow-y-auto border border-border-subtle rounded-lg bg-surface-base divide-y divide-border-subtle" id="csv-preview-list"></div>
      </div>

      <div id="csv-error-box" class="hidden p-3 rounded-lg bg-status-defect-surface border border-status-defect/30 text-status-defect text-body-sm flex items-center gap-2">
        <span class="material-symbols-outlined text-[18px]">error</span>
        <span id="csv-error-text"></span>
      </div>

      <div class="flex justify-end gap-3 pt-2 border-t border-border-subtle">
        <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-secondary hover:bg-surface-elevated text-body-md cursor-pointer">Cancel</button>
        <button type="button" id="confirm-import-btn" disabled class="px-5 py-2 rounded-lg bg-primary text-on-primary font-semibold text-body-md hover:bg-primary-fixed shadow-md shadow-primary/20 disabled:opacity-50 cursor-pointer">
          Import Requirements
        </button>
      </div>
    </div>
  `, { title: 'Import Specifications from CSV' });

  const dropzone = document.getElementById('csv-dropzone');
  const fileInput = document.getElementById('csv-file-input');
  const rawInput = document.getElementById('csv-raw-input');
  const insertSampleBtn = document.getElementById('insert-sample-csv-btn');
  const previewContainer = document.getElementById('csv-preview-container');
  const previewList = document.getElementById('csv-preview-list');
  const previewCount = document.getElementById('csv-preview-count');
  const errorBox = document.getElementById('csv-error-box');
  const errorText = document.getElementById('csv-error-text');
  const confirmBtn = document.getElementById('confirm-import-btn');

  let parsedRecords = [];

  const parseCsvText = (text) => {
    errorBox.classList.add('hidden');
    parsedRecords = [];

    if (!text.trim()) {
      previewContainer.classList.add('hidden');
      confirmBtn.disabled = true;
      return;
    }

    try {
      // RFC-4180 parser
      const lines = [];
      let row = [''];
      let inQuotes = false;

      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        const next = text[i + 1];
        if (c === '"') {
          if (inQuotes && next === '"') {
            row[row.length - 1] += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (c === ',' && !inQuotes) {
          row.push('');
        } else if ((c === '\r' || c === '\n') && !inQuotes) {
          if (c === '\r' && next === '\n') i++;
          if (row.length > 1 || row[0].trim() !== '') lines.push(row);
          row = [''];
        } else {
          row[row.length - 1] += c;
        }
      }
      if (row.length > 1 || row[0].trim() !== '') lines.push(row);

      if (lines.length < 2) {
        throw new Error('CSV must contain a header row and at least one data row.');
      }

      const headers = lines[0].map(h => h.trim().toLowerCase());
      const titleIdx = headers.findIndex(h => h.includes('title') || h === 'name' || h === 'requirement');
      const priorityIdx = headers.findIndex(h => h.includes('priority') || h.includes('moscow'));
      const statusIdx = headers.findIndex(h => h.includes('status'));
      const descIdx = headers.findIndex(h => h.includes('desc'));
      const acIdx = headers.findIndex(h => h.includes('acceptance') || h.includes('criteria') || h === 'ac');

      if (titleIdx === -1) {
        throw new Error('Missing required column: "Title" or "Requirement" was not found in headers.');
      }

      for (let i = 1; i < lines.length; i++) {
        const r = lines[i];
        const title = (r[titleIdx] || '').trim();
        if (!title) continue;

        let priority = priorityIdx !== -1 ? (r[priorityIdx] || '').trim() : 'Should';
        // Normalize priority
        if (/^m/i.test(priority)) priority = 'Must';
        else if (/^s/i.test(priority)) priority = 'Should';
        else if (/^c/i.test(priority)) priority = 'Could';
        else if (/^w/i.test(priority)) priority = "Won't";
        else priority = 'Should';

        let status = statusIdx !== -1 ? (r[statusIdx] || '').trim() : 'Draft';
        if (!['Draft', 'Approved', 'In Development', 'Implemented', 'Rejected'].includes(status)) {
          status = 'Draft';
        }

        const description = descIdx !== -1 ? (r[descIdx] || '').trim() : 'Imported specification.';
        const acceptanceCriteria = acIdx !== -1 ? (r[acIdx] || '').trim() : '';

        parsedRecords.push({ title, priority, status, description, acceptanceCriteria });
      }

      if (!parsedRecords.length) {
        throw new Error('No valid requirement rows found in CSV.');
      }

      // Render preview
      previewCount.textContent = `${parsedRecords.length} requirement${parsedRecords.length > 1 ? 's' : ''} detected`;
      previewList.innerHTML = parsedRecords.map((r, i) => `
        <div class="p-2.5 flex items-center justify-between gap-3 text-[11px] font-jetbrains">
          <div class="flex items-center gap-2 truncate">
            <span class="text-text-muted">#${i + 1}</span>
            <span class="font-bold text-text-primary truncate">${escapeHtml(r.title)}</span>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <span class="px-1.5 py-0.5 rounded bg-surface-panel text-text-secondary">${r.priority}</span>
            <span class="px-1.5 py-0.5 rounded bg-surface-elevated text-text-muted">${r.status}</span>
          </div>
        </div>
      `).join('');

      previewContainer.classList.remove('hidden');
      confirmBtn.disabled = false;
      confirmBtn.textContent = `Import ${parsedRecords.length} Requirements`;
    } catch (err) {
      errorText.textContent = err.message || 'Failed to parse CSV.';
      errorBox.classList.remove('hidden');
      previewContainer.classList.add('hidden');
      confirmBtn.disabled = true;
    }
  };

  dropzone?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      rawInput.value = text;
      parseCsvText(text);
    };
    reader.readAsText(file);
  });

  rawInput?.addEventListener('input', () => parseCsvText(rawInput.value));

  insertSampleBtn?.addEventListener('click', () => {
    const sample = `Title,Priority,Status,Description,Acceptance Criteria\r\n"Biometric Bi-Factor Authentication",Must,Approved,"Hardware-backed security key verification for root accounts","Given FIDO2 key When user taps key Then grant admin session"\r\n"Automated Daily Audit Telemetry",Should,Draft,"Export daily compliance report for SOX standards","Given midnight trigger When cron executes Then deliver PDF report to sec-ops"\r\n"Dark Mode Palette Customizer",Could,Draft,"Allow engineering teams to choose custom syntax highlighting themes","Given settings opened When palette changed Then re-render instantly"\r\n"Legacy XML Export Support",Won't,Rejected,"Backward compatibility with legacy XML ticketing tool","Deferred indefinitely in favor of OpenAPI JSON"`;
    rawInput.value = sample;
    parseCsvText(sample);
  });

  confirmBtn?.addEventListener('click', () => {
    if (!parsedRecords.length) return;
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Importing...';

    let successCount = 0;
    parsedRecords.forEach(rec => {
      const res = store.createRequirement(projectId, rec);
      if (!res.error) successCount++;
    });

    closeModal();
    showToast(`Successfully imported ${successCount} specifications!`, 'success');
    if (onImported) onImported();
  });
}

// ===== REQUIREMENT EDIT & CREATE MODAL =====
export function openRequirementModal(projectId, existingReq = null, onSaved = null) {
  const isEdit = !!existingReq;
  const releases = store.getReleases(projectId);

  showModal(`
    <form id="req-modal-form" class="space-y-4">
      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Title *</label>
        <input type="text" id="modal-req-title" required value="${existingReq ? escapeHtml(existingReq.title) : ''}" placeholder="e.g. JWT Authentication with HttpOnly Cookies"
          class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all" />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">MoSCoW Priority *</label>
          <select id="modal-req-priority" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all cursor-pointer">
            <option value="Must" ${existingReq?.priority === 'Must' ? 'selected' : ''}>Must Have (Critical)</option>
            <option value="Should" ${existingReq?.priority === 'Should' ? 'selected' : ''}>Should Have (Important)</option>
            <option value="Could" ${existingReq?.priority === 'Could' ? 'selected' : ''}>Could Have (Desirable)</option>
            <option value="Won't" ${existingReq?.priority === "Won't" ? 'selected' : ''}>Won't Have (Deferred)</option>
          </select>
        </div>

        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">Lifecycle Status *</label>
          <select id="modal-req-status" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all cursor-pointer">
            <option value="Draft" ${existingReq?.status === 'Draft' ? 'selected' : ''}>Draft</option>
            <option value="Approved" ${existingReq?.status === 'Approved' ? 'selected' : ''}>Approved</option>
            <option value="In Development" ${existingReq?.status === 'In Development' ? 'selected' : ''}>In Development</option>
            <option value="Implemented" ${existingReq?.status === 'Implemented' ? 'selected' : ''}>Implemented</option>
            <option value="Rejected" ${existingReq?.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
          </select>
        </div>
      </div>

      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Target Release</label>
        <select id="modal-req-release" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all cursor-pointer">
          <option value="">Unassigned</option>
          ${releases.map(r => `<option value="${r.id}" ${existingReq?.targetRelease === r.id ? 'selected' : ''}>${escapeHtml(r.name)}</option>`).join('')}
        </select>
      </div>

      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Description *</label>
        <textarea id="modal-req-desc" rows="3" required placeholder="Functional scope and user requirement rationale..."
          class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all">${existingReq ? escapeHtml(existingReq.description) : ''}</textarea>
      </div>

      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Acceptance Criteria</label>
        <textarea id="modal-req-ac" rows="2" placeholder="Given... When... Then..."
          class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all">${existingReq?.acceptanceCriteria ? escapeHtml(existingReq.acceptanceCriteria) : ''}</textarea>
      </div>

      <div class="flex justify-end gap-3 pt-3">
        <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-secondary hover:bg-surface-elevated text-body-md cursor-pointer">Cancel</button>
        <button type="submit" class="px-5 py-2 rounded-lg bg-primary text-on-primary font-semibold text-body-md hover:bg-primary-fixed shadow-md shadow-primary/20 cursor-pointer">
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

    const fields = { title, priority, status, targetRelease, description, acceptanceCriteria };
    const res = isEdit ? store.updateRequirement(existingReq.id, fields) : store.createRequirement(projectId, fields);
    if (res.error) {
      showToast(res.error, 'error');
      return;
    }
    showToast(isEdit ? 'Requirement updated & audit record created!' : 'Requirement created!', 'success');
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
        <h4 class="font-geist text-headline-sm font-bold text-text-primary">${escapeHtml(req.title)}</h4>
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
                  <span class="text-text-primary font-semibold">Change #${history.length - i} • Field: <code class="text-secondary">${escapeHtml(h.field)}</code></span>
                  <span>${formatDate(h.changedAt)}</span>
                </div>
                <div class="grid grid-cols-2 gap-2 text-mono-md">
                  <div class="p-2 rounded bg-status-defect-surface text-status-defect">
                    <span class="text-[10px] block uppercase opacity-75">- Previous</span>
                    <span class="line-through">${escapeHtml(h.oldValue || '(empty)')}</span>
                  </div>
                  <div class="p-2 rounded bg-status-passed-surface text-status-passed">
                    <span class="text-[10px] block uppercase opacity-75">+ Modified</span>
                    <span>${escapeHtml(h.newValue || '(empty)')}</span>
                  </div>
                </div>
                <div class="text-[10px] text-text-muted mt-2">Authorized by: <strong class="text-text-secondary">${escapeHtml(author.name)}</strong></div>
              </div>
            `;
          }).join('')}
        </div>
      `}

      <div class="flex justify-end pt-3 border-t border-border-subtle">
        <button onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-primary text-body-md hover:bg-surface-elevated cursor-pointer">Close Audit Log</button>
      </div>
    </div>
  `, { title: 'Specification Audit Trail & Diffs' });
}
