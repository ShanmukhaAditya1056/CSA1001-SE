// DevTrack UI Utilities — toast, modal, shared components
import { store } from './store.js';

// ===== TOAST =====
export function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const colors = {
    success: 'bg-status-passed/20 border-status-passed/40 text-status-passed',
    error: 'bg-status-defect/20 border-status-defect/40 text-status-defect',
    info: 'bg-secondary/20 border-secondary/40 text-secondary',
    warning: 'bg-status-in-progress/20 border-status-in-progress/40 text-status-in-progress',
  };
  const icons = { success: 'check_circle', error: 'error', info: 'info', warning: 'warning' };
  const toast = document.createElement('div');
  toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl border ${colors[type]} animate-toast-in backdrop-blur-md min-w-[300px] max-w-md shadow-lg`;
  toast.innerHTML = `<span class="material-symbols-outlined text-[20px]">${icons[type]}</span><span class="font-inter text-body-md flex-1">${message}</span><button class="material-symbols-outlined text-[16px] opacity-60 hover:opacity-100" onclick="this.parentElement.remove()">close</button>`;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('animate-toast-out'); setTimeout(() => toast.remove(), 300); }, 4000);
}

// ===== MODAL =====
export function showModal(content, { title = '', width = 'max-w-lg' } = {}) {
  const backdrop = document.getElementById('modal-backdrop');
  const container = document.getElementById('modal-container');
  backdrop.classList.remove('hidden');
  container.classList.remove('hidden');
  container.innerHTML = `
    <div class="bg-surface-canvas border border-border-strong rounded-2xl ${width} w-full mx-4 animate-scale-in shadow-2xl overflow-hidden">
      ${title ? `<div class="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
        <h2 class="font-geist text-headline-sm text-text-primary">${title}</h2>
        <button onclick="window.__closeModal()" class="material-symbols-outlined text-text-muted hover:text-text-primary text-[20px] transition-colors">close</button>
      </div>` : ''}
      <div id="modal-body" class="p-6">${content}</div>
    </div>`;
  window.__closeModal = closeModal;
  backdrop.onclick = closeModal;
}

export function closeModal() {
  document.getElementById('modal-backdrop').classList.add('hidden');
  document.getElementById('modal-container').classList.add('hidden');
}

// ===== CONFIRM DIALOG =====
export function showConfirm(message, onConfirm, { title = 'Confirm Action', confirmText = 'Confirm', destructive = false } = {}) {
  const btnClass = destructive
    ? 'bg-status-defect/20 text-status-defect hover:bg-status-defect/30 border border-status-defect/30'
    : 'bg-primary text-on-primary hover:bg-primary-fixed';
  showModal(`
    <p class="text-text-secondary text-body-md mb-6">${message}</p>
    <div class="flex justify-end gap-3">
      <button onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-secondary border border-border-subtle hover:bg-surface-elevated transition-colors text-body-md">Cancel</button>
      <button id="modal-confirm-btn" class="px-4 py-2 rounded-lg ${btnClass} transition-colors text-body-md font-medium">${confirmText}</button>
    </div>
  `, { title });
  document.getElementById('modal-confirm-btn').onclick = () => { closeModal(); onConfirm(); };
}

// ===== STATUS CHIPS =====
const statusColors = {
  // Requirements
  'Draft': 'bg-surface-elevated text-text-secondary',
  'Approved': 'bg-secondary/15 text-secondary',
  'In Progress': 'bg-status-in-progress-surface text-status-in-progress',
  'Completed': 'bg-status-passed-surface text-status-passed',
  'Rejected': 'bg-status-defect-surface text-status-defect',
  // Tasks
  'Backlog': 'bg-surface-elevated text-text-muted',
  'To Do': 'bg-surface-elevated text-text-secondary',
  'In Review': 'bg-status-release-surface text-status-release',
  'Done': 'bg-status-passed-surface text-status-passed',
  // Sprint
  'Planned': 'bg-surface-elevated text-text-secondary',
  'Active': 'bg-status-in-progress-surface text-status-in-progress',
  // Test
  'Passed': 'bg-status-passed-surface text-status-passed',
  'Failed': 'bg-status-defect-surface text-status-defect',
  'Blocked': 'bg-status-in-progress-surface text-status-in-progress',
  'Skipped': 'bg-surface-elevated text-text-muted',
  // Bug
  'Open': 'bg-status-defect-surface text-status-defect',
  'Fixed': 'bg-status-passed-surface text-status-passed',
  'Retest': 'bg-status-in-progress-surface text-status-in-progress',
  'Closed': 'bg-surface-elevated text-text-muted',
  'Reopened': 'bg-status-defect-surface text-status-defect',
  // Release
  'Released': 'bg-status-passed-surface text-status-passed',
  'Cancelled': 'bg-status-defect-surface text-status-defect',
};

const priorityColors = {
  'Must': 'bg-status-defect-surface text-status-defect',
  'Should': 'bg-status-in-progress-surface text-status-in-progress',
  'Could': 'bg-secondary/15 text-secondary',
  "Won't": 'bg-surface-elevated text-text-muted',
  'Critical': 'bg-status-defect-surface text-status-defect',
  'High': 'bg-status-in-progress-surface text-status-in-progress',
  'Medium': 'bg-secondary/15 text-secondary',
  'Low': 'bg-surface-elevated text-text-muted',
};

const severityColors = {
  'Critical': 'bg-status-defect-surface text-status-defect',
  'High': 'bg-status-in-progress-surface text-status-in-progress',
  'Medium': 'bg-secondary/15 text-secondary',
  'Low': 'bg-surface-elevated text-text-muted',
};

export function statusChip(status) {
  const c = statusColors[status] || 'bg-surface-elevated text-text-muted';
  return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide font-jetbrains ${c}">${status}</span>`;
}

export function priorityChip(priority) {
  const c = priorityColors[priority] || 'bg-surface-elevated text-text-muted';
  return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide font-jetbrains ${c}">${priority}</span>`;
}

export function severityChip(severity) {
  const c = severityColors[severity] || 'bg-surface-elevated text-text-muted';
  return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide font-jetbrains ${c}">${severity}</span>`;
}

// ===== FORMATTING =====
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return dateStr; }
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return dateStr; }
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ===== LOADING / EMPTY / ERROR =====
export function loadingState(message = 'Loading...') {
  return `<div class="flex flex-col items-center justify-center py-16 animate-fade-in">
    <span class="material-symbols-outlined text-primary text-[32px] animate-spin mb-4">progress_activity</span>
    <span class="text-text-muted text-body-md">${message}</span>
  </div>`;
}

export function emptyState(icon, title, description, actionHtml = '') {
  return `<div class="flex flex-col items-center justify-center py-16 animate-fade-in">
    <div class="w-16 h-16 rounded-2xl bg-surface-panel flex items-center justify-center mb-4">
      <span class="material-symbols-outlined text-text-muted text-[28px]">${icon}</span>
    </div>
    <h3 class="font-geist text-headline-sm text-text-primary mb-1">${title}</h3>
    <p class="text-text-muted text-body-md mb-4 text-center max-w-sm">${description}</p>
    ${actionHtml}
  </div>`;
}

export function errorState(message = 'Something went wrong') {
  return `<div class="flex flex-col items-center justify-center py-16 animate-fade-in">
    <div class="w-16 h-16 rounded-2xl bg-status-defect-surface flex items-center justify-center mb-4">
      <span class="material-symbols-outlined text-status-defect text-[28px]">error</span>
    </div>
    <h3 class="font-geist text-headline-sm text-text-primary mb-1">Error</h3>
    <p class="text-text-muted text-body-md">${message}</p>
  </div>`;
}

// ===== USER AVATAR =====
export function avatar(name, size = 'w-8 h-8 text-[12px]', photoURL = null) {
  const safeName = (name || 'User').replace(/"/g, '&quot;');
  const initials = (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const colors = ['bg-primary-container/30 text-primary', 'bg-secondary/20 text-secondary', 'bg-tertiary/20 text-tertiary', 'bg-status-passed/20 text-status-passed', 'bg-status-in-progress/20 text-status-in-progress'];
  const c = colors[Math.abs(hashCode(name || '')) % colors.length];

  if (photoURL && typeof photoURL === 'string' && photoURL.trim().length > 0) {
    const cleanUrl = photoURL.replace(/"/g, '&quot;');
    return `<div class="${size} rounded-full overflow-hidden shrink-0 border border-primary/40 shadow-sm relative flex items-center justify-center bg-surface-elevated">
      <img src="${cleanUrl}" alt="${safeName}" class="w-full h-full object-cover" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" />
      <span class="hidden font-semibold font-inter text-[11px] text-text-primary uppercase w-full h-full items-center justify-center">${initials}</span>
    </div>`;
  }

  return `<div class="${size} rounded-full ${c} flex items-center justify-center font-semibold font-inter shrink-0">${initials}</div>`;
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0; }
  return hash;
}

// ===== INPUT FIELD =====
export function inputField(id, label, type = 'text', { placeholder = '', required = false, value = '', rows = 0, options = null } = {}) {
  const req = required ? 'required' : '';
  if (options) {
    return `<div class="flex flex-col gap-1.5">
      <label class="font-inter text-label-md text-text-primary" for="${id}">${label}</label>
      <select id="${id}" class="w-full bg-surface-base text-text-primary font-inter text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary focus:ring-2 focus:ring-primary/25 focus:outline-none transition-all" ${req}>
        ${options.map(o => `<option value="${o.value}" ${o.value === value ? 'selected' : ''}>${o.label}</option>`).join('')}
      </select>
    </div>`;
  }
  if (rows > 0) {
    return `<div class="flex flex-col gap-1.5">
      <label class="font-inter text-label-md text-text-primary" for="${id}">${label}</label>
      <textarea id="${id}" rows="${rows}" class="w-full bg-surface-base text-text-primary font-inter text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary focus:ring-2 focus:ring-primary/25 focus:outline-none transition-all resize-y" placeholder="${placeholder}" ${req}>${value}</textarea>
    </div>`;
  }
  return `<div class="flex flex-col gap-1.5">
    <label class="font-inter text-label-md text-text-primary" for="${id}">${label}</label>
    <input type="${type}" id="${id}" value="${value}" class="w-full bg-surface-base text-text-primary font-inter text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary focus:ring-2 focus:ring-primary/25 focus:outline-none transition-all" placeholder="${placeholder}" ${req} />
  </div>`;
}

// ===== PRIMARY BUTTON =====
export function primaryBtn(text, onclick, { icon = '', id = '', disabled = false } = {}) {
  return `<button ${id ? `id="${id}"` : ''} onclick="${onclick}" class="inline-flex items-center gap-2 bg-primary hover:bg-primary-fixed text-on-primary font-geist text-headline-sm py-2 px-4 rounded-lg transition-all duration-150 active:scale-[0.99] shadow-md shadow-primary/20 ${disabled ? 'opacity-50 pointer-events-none' : ''}" ${disabled ? 'disabled' : ''}>
    ${icon ? `<span class="material-symbols-outlined text-[18px]">${icon}</span>` : ''}${text}
  </button>`;
}

export function secondaryBtn(text, onclick, { icon = '' } = {}) {
  return `<button onclick="${onclick}" class="inline-flex items-center gap-2 bg-surface-panel hover:bg-surface-elevated text-text-primary font-inter text-body-md py-2 px-4 rounded-lg border border-border-subtle transition-colors">
    ${icon ? `<span class="material-symbols-outlined text-[18px]">${icon}</span>` : ''}${text}
  </button>`;
}

export function ghostBtn(text, onclick, { icon = '' } = {}) {
  return `<button onclick="${onclick}" class="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary hover:bg-white/[0.04] font-inter text-body-md py-2 px-3 rounded-lg transition-colors">
    ${icon ? `<span class="material-symbols-outlined text-[18px]">${icon}</span>` : ''}${text}
  </button>`;
}

export function dangerBtn(text, onclick, { icon = '' } = {}) {
  return `<button onclick="${onclick}" class="inline-flex items-center gap-2 bg-status-defect-surface text-status-defect hover:bg-status-defect/20 font-inter text-body-md py-2 px-4 rounded-lg border border-status-defect/30 transition-colors">
    ${icon ? `<span class="material-symbols-outlined text-[18px]">${icon}</span>` : ''}${text}
  </button>`;
}
