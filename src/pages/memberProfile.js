// DevTrack Team Member Profile — workload, quality work and recent activity
// for one member of the active project. Read-only; opened from the Team page
// roster or "My Profile" in the user menu.
import { store } from '../store.js';
import { avatar, showModal, showToast, statusChip, priorityChip, severityChip, formatDate, timeAgo, escapeHtml } from '../ui.js';

const ROLE_STYLES = {
  Owner: 'bg-primary-container/20 text-primary',
  Developer: 'bg-secondary/15 text-secondary',
  Tester: 'bg-status-passed-surface text-status-passed',
  Viewer: 'bg-surface-panel text-text-secondary'
};

const JOINED_VIA = {
  invitation: 'Joined by accepting an invitation',
  direct: 'Added by a project owner',
  'invite-snapshot': 'Listed from a shared invitation'
};

function statTile(label, value, sub, tone = 'text-text-primary') {
  return `
    <div class="p-3 rounded-xl bg-surface-base border border-border-subtle">
      <div class="font-jetbrains text-[10px] uppercase tracking-wider text-text-muted">${label}</div>
      <div class="font-geist text-headline-md font-bold ${tone} mt-0.5">${value}</div>
      <div class="text-[11px] text-text-muted">${sub}</div>
    </div>`;
}

function section(title, icon, body) {
  return `
    <div>
      <div class="flex items-center gap-1.5 font-jetbrains text-[11px] uppercase tracking-wider text-text-muted mb-2">
        <span class="material-symbols-outlined text-[16px]">${icon}</span><span>${title}</span>
      </div>
      ${body}
    </div>`;
}

const emptyRow = (text) => `<div class="p-3 rounded-lg bg-surface-base/60 border border-border-subtle text-[12px] text-text-muted">${text}</div>`;

export function openMemberProfile(projectId, memberId) {
  const res = store.getMemberProfile(projectId, memberId);
  if (res.error) {
    showToast(res.error, 'error');
    return;
  }
  const { member, isMe, stats, tasks, bugs, reportedCount, requirementsCount, activity } = res.data;
  const name = escapeHtml(member.userName);
  const first = escapeHtml((member.userName || '').split(' ')[0] || 'This member');

  showModal(`
    <div class="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
      <!-- Identity -->
      <div class="flex items-start gap-4">
        ${avatar(member.userName, 'w-16 h-16 text-[22px]', member.photoURL)}
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <h3 class="font-geist text-headline-md font-bold text-text-primary">${name}</h3>
            <span class="font-jetbrains text-[11px] font-bold px-2 py-0.5 rounded ${ROLE_STYLES[member.role] || ROLE_STYLES.Viewer}">${escapeHtml(member.role).toUpperCase()}</span>
            ${isMe ? '<span class="px-1.5 py-0.5 rounded bg-primary-container/20 text-primary text-[10px] font-jetbrains font-semibold">YOU</span>' : ''}
          </div>
          <a href="mailto:${escapeHtml(member.userEmail)}" class="font-jetbrains text-body-sm text-secondary hover:underline break-all">${escapeHtml(member.userEmail)}</a>
          <div class="text-[12px] text-text-muted mt-1">
            Member since ${formatDate(member.addedAt)}${JOINED_VIA[member.addedVia] ? ` · ${JOINED_VIA[member.addedVia]}` : ''}
          </div>
        </div>
      </div>

      <!-- Workload at a glance -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        ${statTile('Open tasks', stats.openTasks, `${stats.openPoints} story pts · ${stats.doneTasks} done`)}
        ${statTile('Open defects', stats.openBugs, `assigned to ${isMe ? 'you' : first}`, stats.openBugs ? 'text-status-defect' : 'text-text-primary')}
        ${statTile('Test runs', stats.testRuns, stats.passRate === null ? 'none recorded' : `${stats.passRate}% passed`)}
        ${statTile('Authored', requirementsCount, `requirements · ${reportedCount} defects reported`)}
      </div>

      ${section('Current tasks', 'view_kanban', tasks.length ? `
        <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          ${tasks.map(t => `
            <div class="p-2.5 rounded-lg bg-surface-base border border-border-subtle flex items-center justify-between gap-3">
              <div class="min-w-0">
                <div class="text-body-sm font-medium text-text-primary truncate">${escapeHtml(t.title)}</div>
                <div class="font-jetbrains text-[10px] text-text-muted">${escapeHtml(t.sprintName)} · ${Number(t.estimate) || 0} pts</div>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">${priorityChip(t.priority)}${statusChip(t.status)}</div>
            </div>`).join('')}
        </div>` : emptyRow('No open tasks assigned.'))}

      ${section('Assigned defects', 'pest_control', bugs.length ? `
        <div class="space-y-1.5 max-h-40 overflow-y-auto pr-1">
          ${bugs.map(b => `
            <div class="p-2.5 rounded-lg bg-surface-base border border-border-subtle flex items-center justify-between gap-3">
              <div class="text-body-sm font-medium text-text-primary truncate min-w-0">${escapeHtml(b.title)}</div>
              <div class="flex items-center gap-1.5 shrink-0">${severityChip(b.severity)}${statusChip(b.status)}</div>
            </div>`).join('')}
        </div>` : emptyRow('No open defects assigned.'))}

      ${section('Recent activity', 'history', activity.length ? `
        <ol class="space-y-2">
          ${activity.map(a => `
            <li class="flex items-start gap-2.5">
              <span class="material-symbols-outlined text-[16px] text-primary mt-0.5">${a.icon}</span>
              <div class="min-w-0">
                <div class="text-body-sm text-text-secondary">${escapeHtml(a.text)}</div>
                <div class="font-jetbrains text-[10px] text-text-muted">${timeAgo(a.at)}</div>
              </div>
            </li>`).join('')}
        </ol>` : emptyRow('No activity recorded in this project yet.'))}

      <div class="flex justify-end pt-1">
        <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-secondary hover:bg-surface-elevated text-body-sm">Close</button>
      </div>
    </div>
  `, { title: isMe ? 'My Profile' : 'Team Member Profile', width: 'max-w-2xl' });
}
