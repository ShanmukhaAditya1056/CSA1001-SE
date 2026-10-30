// DevTrack Team & Roles Management
import { store } from '../store.js';
import { avatar, formatDate, showToast, showModal, closeModal, showConfirm } from '../ui.js';
import { sendProjectInvitation, revokeProjectInvitation } from '../directory.js';

export function renderTeam(container) {
  const project = store.getActiveProject();
  if (!project) {
    container.innerHTML = `<div class="p-12 text-center text-text-muted">Select or create a project first.</div>`;
    return;
  }

  const members = store.getMembers(project.id);
  const currentUserRole = store.getUserRole(project.id);
  const isOwner = currentUserRole === 'Owner';
  const projectInvs = store.getProjectInvitations(project.id);
  const nowMs = Date.now();
  const pendingInvs = projectInvs.filter(i => i.status === 'Pending' && new Date(i.expiresAt).getTime() > nowMs);
  const historyInvs = projectInvs.filter(i => i.status !== 'Pending' || new Date(i.expiresAt).getTime() <= nowMs);


  container.innerHTML = `
    <div class="relative w-full px-6 py-6">
      <!-- Header -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div class="flex items-center gap-2 font-jetbrains text-mono-md text-text-muted mb-1">
            <span>${project.key}</span>
            <span>/</span>
            <span class="text-secondary font-medium">SETTINGS & ACCESS</span>
            <span>/</span>
            <span class="text-text-primary">PROJECT ROLES</span>
          </div>
          <h1 class="font-geist text-headline-xl font-bold text-text-primary tracking-tight">Team Members & Access Control</h1>
          <p class="text-body-sm text-text-muted mt-1">Manage project members and role-based permissions (Owner, Developer, Tester, Viewer)</p>
        </div>

        <div class="flex items-center gap-3">
          ${isOwner ? `
            <button id="add-member-btn" class="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary hover:bg-primary-fixed text-on-primary font-semibold text-body-md transition-all shadow-md shadow-primary/20 active:scale-95 cursor-pointer">
              <span class="material-symbols-outlined text-[20px]">person_add</span>
              <span>+ Invite Member</span>
            </button>
          ` : `
            <span class="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-panel border border-border-subtle text-text-muted text-body-sm font-jetbrains">
              <span class="material-symbols-outlined text-[16px]">lock</span>
              <span>Owner-only team management</span>
            </span>
          `}
        </div>

      </div>

      <!-- Role Permissions Summary Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div class="p-4 rounded-xl bg-surface-canvas border border-border-subtle shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <span class="font-jetbrains text-[11px] font-bold px-2 py-0.5 rounded bg-primary-container/20 text-primary">OWNER</span>
            <span class="material-symbols-outlined text-primary text-[18px]">verified_user</span>
          </div>
          <h4 class="font-geist text-body-md font-bold text-text-primary mb-1">Full Control</h4>
          <p class="text-[12px] text-text-muted">Manage settings, invite members, modify roles, and sign off releases.</p>
        </div>

        <div class="p-4 rounded-xl bg-surface-canvas border border-border-subtle shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <span class="font-jetbrains text-[11px] font-bold px-2 py-0.5 rounded bg-secondary/15 text-secondary">DEVELOPER</span>
            <span class="material-symbols-outlined text-secondary text-[18px]">code</span>
          </div>
          <h4 class="font-geist text-body-md font-bold text-text-primary mb-1">Implementation</h4>
          <p class="text-[12px] text-text-muted">Create/edit requirements, manage sprint board tasks, and resolve bugs.</p>
        </div>

        <div class="p-4 rounded-xl bg-surface-canvas border border-border-subtle shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <span class="font-jetbrains text-[11px] font-bold px-2 py-0.5 rounded bg-status-passed-surface text-status-passed">TESTER</span>
            <span class="material-symbols-outlined text-status-passed text-[18px]">bug_report</span>
          </div>
          <h4 class="font-geist text-body-md font-bold text-text-primary mb-1">Quality Assurance</h4>
          <p class="text-[12px] text-text-muted">Author test cases, record execution telemetry, and file defects.</p>
        </div>

        <div class="p-4 rounded-xl bg-surface-canvas border border-border-subtle shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <span class="font-jetbrains text-[11px] font-bold px-2 py-0.5 rounded bg-surface-panel text-text-secondary">VIEWER</span>
            <span class="material-symbols-outlined text-text-muted text-[18px]">visibility</span>
          </div>
          <h4 class="font-geist text-body-md font-bold text-text-primary mb-1">Read-Only Audit</h4>
          <p class="text-[12px] text-text-muted">Audit dashboards, inspect traceability matrix, and view audit history.</p>
        </div>
      </div>

      <!-- Members Roster -->
      <div class="bg-surface-canvas border border-border-subtle rounded-xl overflow-hidden shadow-sm">
        <div class="p-4 border-b border-border-subtle flex items-center justify-between">
          <h2 class="font-geist text-headline-sm font-bold text-text-primary">Project Roster (${members.length})</h2>
          <span class="text-body-sm text-text-muted font-jetbrains">Role changes take effect immediately</span>
        </div>

        <div class="divide-y divide-border-subtle">
          ${members.map(member => {
            const isMe = store.currentUser?.id === member.userId ||
              (store.currentUser?.email && member.userEmail && store.currentUser.email.toLowerCase() === member.userEmail.toLowerCase());
            const memberUser = store.getUser(member.userId);
            const photo = isMe ? store.currentUser?.photoURL : memberUser?.photoURL;

            return `
              <div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-panel/30 transition-colors">
                <div class="flex items-center gap-3">
                  ${avatar(member.userName, 'w-10 h-10 text-[14px]', photo)}
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-geist text-body-md font-bold text-text-primary">${member.userName}</span>
                      <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-status-passed-surface text-status-passed text-[10px] font-jetbrains font-semibold border border-status-passed/20">
                        <span class="material-symbols-outlined text-[12px]">verified</span> VERIFIED
                      </span>
                      ${isMe ? `<span class="px-1.5 py-0.2 rounded bg-primary-container/20 text-primary text-[10px] font-jetbrains font-semibold">YOU</span>` : ''}
                    </div>
                    <span class="text-body-sm text-text-muted font-jetbrains">${member.userEmail}</span>
                  </div>
                </div>

                <div class="flex items-center gap-4">
                  <span class="text-body-sm text-text-muted font-jetbrains text-[11px] hidden md:inline">Joined: ${formatDate(member.addedAt)}</span>

                  ${isOwner ? `
                    <!-- Role Selector -->
                    <select class="member-role-select bg-surface-base text-text-primary font-jetbrains text-body-sm py-1.5 px-3 rounded-lg border border-border-subtle focus:border-primary outline-none" data-id="${member.id}">
                      <option value="Owner" ${member.role === 'Owner' ? 'selected' : ''}>Owner</option>
                      <option value="Developer" ${member.role === 'Developer' ? 'selected' : ''}>Developer</option>
                      <option value="Tester" ${member.role === 'Tester' ? 'selected' : ''}>Tester</option>
                      <option value="Viewer" ${member.role === 'Viewer' ? 'selected' : ''}>Viewer</option>
                    </select>

                    <button class="remove-member-btn text-text-muted hover:text-status-defect p-1.5 rounded-lg hover:bg-surface-panel transition-colors" data-id="${member.id}" data-name="${member.userName}">
                      <span class="material-symbols-outlined text-[18px]">person_remove</span>
                    </button>
                  ` : `
                    <span class="font-jetbrains text-[11px] font-semibold px-2.5 py-1 rounded-full bg-surface-panel border border-border-subtle text-text-secondary">${member.role}</span>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Pending Invitations Table -->
      <div class="mt-8 bg-surface-canvas border border-border-subtle rounded-xl overflow-hidden shadow-sm">
        <div class="p-4 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center">
              <span class="material-symbols-outlined text-[18px]">outgoing_mail</span>
            </div>
            <div>
              <h2 class="font-geist text-headline-sm font-bold text-text-primary">Pending Invitations (${pendingInvs.length})</h2>
              <p class="text-[12px] text-text-muted">Awaiting explicit acceptance via recipient's in-app inbox or secure link</p>
            </div>
          </div>
          <span class="text-[11px] font-jetbrains text-text-muted">Links valid for 7 days</span>
        </div>

        ${pendingInvs.length === 0 ? `
          <div class="p-8 text-center text-text-muted text-body-sm font-jetbrains">
            <span class="material-symbols-outlined text-[28px] text-text-muted mb-1 block">forward_to_inbox</span>
            No pending invitations. Click <strong>+ Invite Member</strong> above to invite a collaborator.
          </div>
        ` : `
          <div class="divide-y divide-border-subtle">
            ${pendingInvs.map(inv => {
              const inviteLink = `${window.location.origin}${window.location.pathname}#/invite?token=${inv.token}`;
              return `
                <div class="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-surface-panel/30 transition-colors">
                  <div class="space-y-1">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-geist text-body-md font-bold text-text-primary">${inv.inviteeEmail}</span>
                      <span class="font-jetbrains text-[10px] font-bold px-2 py-0.5 rounded bg-secondary/15 text-secondary border border-secondary/30 uppercase">${inv.role}</span>
                      <span class="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-surface-panel text-secondary text-[10px] font-jetbrains">
                        <span class="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span> PENDING
                      </span>
                    </div>
                    <div class="text-[11px] font-jetbrains text-text-muted">
                      Invited by ${inv.inviterName} • Expires: ${formatDate(inv.expiresAt)}
                    </div>
                  </div>

                  <div class="flex items-center gap-2 self-start md:self-center">
                    <button class="copy-invite-link-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-primary text-[12px] font-jetbrains border border-border-subtle transition-all cursor-pointer" data-link="${inviteLink}">
                      <span class="material-symbols-outlined text-[15px]">link</span>
                      <span>Copy Link</span>
                    </button>
                    ${isOwner ? `
                      <button class="revoke-invite-btn text-text-muted hover:text-status-defect p-1.5 rounded-lg hover:bg-surface-panel transition-colors cursor-pointer" data-id="${inv.id}" data-email="${inv.inviteeEmail}" title="Revoke Invitation">
                        <span class="material-symbols-outlined text-[18px]">cancel</span>
                      </button>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}

        ${historyInvs.length > 0 ? `
          <div class="p-3 bg-surface-base/40 border-t border-border-subtle/60">
            <details class="text-[12px]">
              <summary class="font-jetbrains text-text-muted cursor-pointer hover:text-text-primary">
                View Past Invitations (${historyInvs.length})
              </summary>
              <div class="mt-2 divide-y divide-border-subtle/50">
                ${historyInvs.map(h => `
                  <div class="py-2 flex items-center justify-between text-[11px] font-jetbrains">
                    <span class="text-text-secondary">${h.inviteeEmail} (${h.role})</span>
                    <span class="px-2 py-0.5 rounded ${
                      h.status === 'Accepted' ? 'bg-status-passed-surface text-status-passed' :
                      h.status === 'Declined' ? 'bg-surface-panel text-text-muted' :
                      'bg-status-defect-surface text-status-defect'
                    }">${h.status.toUpperCase()}</span>
                  </div>
                `).join('')}
              </div>
            </details>
          </div>
        ` : ''}
      </div>
    </div>
  `;


  // Attach role change
  container.querySelectorAll('.member-role-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const memberId = sel.dataset.id;
      const newRole = e.target.value;
      const res = store.updateMemberRole(memberId, newRole);
      if (res.error) {
        showToast(res.error, 'error');
        renderTeam(container);
      } else {
        showToast(`Role updated to ${newRole}!`, 'success');
      }
    });
  });

  // Attach remove member
  container.querySelectorAll('.remove-member-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const memberId = btn.dataset.id;
      const memberName = btn.dataset.name;
      showConfirm(`Are you sure you want to remove ${memberName} from this project?`, () => {
        const res = store.removeMember(memberId);
        if (res.error) {
          showToast(res.error, 'error');
        } else {
          showToast(`${memberName} removed from project`, 'info');
          renderTeam(container);
        }
      }, { title: 'Remove Team Member', destructive: true, confirmText: 'Remove' });
    });
  });

  // Copy invite link trigger
  container.querySelectorAll('.copy-invite-link-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const link = btn.dataset.link;
      try {
        await navigator.clipboard.writeText(link);
        showToast('Invitation link copied to clipboard!', 'success');
      } catch {
        prompt('Copy invitation link:', link);
      }
    });
  });

  // Revoke invitation trigger
  container.querySelectorAll('.revoke-invite-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const invId = btn.dataset.id;
      const email = btn.dataset.email;
      showConfirm(`Revoke invitation for "${email}"? The recipient will no longer be able to use this link.`, async () => {
        const res = await revokeProjectInvitation(invId);
        if (res.error) {
          showToast(res.error, 'error');
        } else {
          showToast(`Invitation for ${email} revoked.`, 'info');
          renderTeam(container);
        }
      }, { title: 'Revoke Invitation', destructive: true, confirmText: 'Revoke' });
    });
  });

  // Add Member / Invite trigger
  container.querySelector('#add-member-btn')?.addEventListener('click', () => {
    openAddMemberModal(project.id, () => renderTeam(container));
  });
}


function openAddMemberModal(projectId, onSaved) {
  const allUsers = store.getAllUsers();
  const currentMembers = store.getMembers(projectId);
  const normalize = (value) => (value || '').trim().toLowerCase();
  const nonMembers = allUsers.filter(u =>
    !currentMembers.some(m => m.userId === u.id || (m.userEmail && u.email && normalize(m.userEmail) === normalize(u.email)))
  );

  showModal(`
    <form id="add-member-form" class="space-y-4">
      <!-- Team Membership Banner -->
      <div class="p-3 rounded-lg bg-surface-base border border-secondary/30 flex items-start gap-2.5">
        <span class="material-symbols-outlined text-secondary text-[20px] shrink-0 mt-0.5">group_add</span>
        <div class="text-[12px]">
          <span class="font-semibold text-text-primary block">Invite a Registered DevTrack User</span>
          <span class="text-text-muted">The invitation is delivered straight to their in-app inbox. They join once they accept. The person must already have a DevTrack account.</span>
        </div>
      </div>

      ${nonMembers.length > 0 ? `
        <div>
          <label class="block text-label-md font-medium text-text-secondary mb-1">Select Registered User</label>
          <select id="mem-user-select" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none">
            <option value="">-- Choose an account seen on this device or enter an email below --</option>
            ${nonMembers.map(u => `
              <option value="${u.email}">${u.name} (${u.email})</option>
            `).join('')}
          </select>
        </div>

        <div>
          <span class="text-[11px] font-jetbrains text-text-muted uppercase tracking-wider block mb-1.5">Accounts Seen On This Device (${nonMembers.length})</span>
          <div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 bg-surface-base/50 rounded-lg border border-border-subtle">
            ${nonMembers.map(u => `
              <button type="button" class="quick-fill-email group flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-surface-canvas hover:bg-surface-elevated border border-border-subtle hover:border-secondary transition-all text-left" data-email="${u.email}">
                <div class="w-5 h-5 rounded-full bg-secondary/20 text-secondary text-[10px] font-bold flex items-center justify-center font-jetbrains">
                  ${u.name.charAt(0).toUpperCase()}
                </div>
                <div class="text-[11px] font-medium text-text-primary group-hover:text-secondary flex items-center gap-1">
                  <span>${u.name}</span>
                  <span class="material-symbols-outlined text-[12px] text-secondary">verified</span>
                </div>
              </button>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Colleague Account Email *</label>
        <input type="email" id="mem-email" list="verified-users-datalist" required placeholder="colleague@company.com"
          class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none transition-all" />
        <datalist id="verified-users-datalist">
          ${nonMembers.map(u => `<option value="${u.email}">${u.name} (Verified)</option>`).join('')}
        </datalist>
        <p class="text-[11px] text-text-muted mt-1 font-jetbrains">Invitations stay valid for 7 days.</p>
      </div>

      <div>
        <label class="block text-label-md font-medium text-text-secondary mb-1">Assigned Role *</label>
        <select id="mem-role" class="w-full bg-surface-base text-text-primary text-body-md px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none">
          <option value="Developer">Developer</option>
          <option value="Tester">Tester</option>
          <option value="Viewer">Viewer</option>
          <option value="Owner">Owner</option>
        </select>
      </div>

      <div id="add-mem-error" class="hidden p-3 rounded-lg bg-status-defect-surface border border-status-defect/30 text-status-defect text-body-sm flex items-center gap-2">
        <span class="material-symbols-outlined text-[18px]">error</span>
        <span id="add-mem-error-text"></span>
      </div>

      <div class="flex justify-end gap-3 pt-3">
        <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-secondary hover:bg-surface-elevated text-body-md">Cancel</button>
        <button type="submit" id="add-member-submit" class="px-5 py-2 rounded-lg bg-primary text-on-primary font-semibold text-body-md hover:bg-primary-fixed shadow-md shadow-primary/20 disabled:opacity-60">Send Invitation</button>
      </div>
    </form>
  `, { title: 'Invite Member to Project Team' });

  const emailInput = document.getElementById('mem-email');
  const userSelect = document.getElementById('mem-user-select');
  const submitBtn = document.getElementById('add-member-submit');
  const errorBox = document.getElementById('add-mem-error');
  const errorText = document.getElementById('add-mem-error-text');

  userSelect?.addEventListener('change', (e) => {
    if (e.target.value) emailInput.value = e.target.value;
  });

  // Quick fill email buttons
  document.querySelectorAll('.quick-fill-email').forEach(btn => {
    btn.addEventListener('click', () => {
      emailInput.value = btn.dataset.email;
      if (userSelect) userSelect.value = btn.dataset.email;
    });
  });

  const form = document.getElementById('add-member-form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.add('hidden');
    const email = emailInput.value.trim();
    const role = document.getElementById('mem-role').value;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Checking account...';
    const res = await sendProjectInvitation(projectId, email, role);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send Invitation';

    // Unregistered, duplicate or invalid: keep the modal open so the owner can fix the email.
    if (res.error) {
      errorText.textContent = res.error;
      errorBox.classList.remove('hidden');
      return;
    }

    closeModal();
    showToast(`Invitation sent successfully to ${res.data.inviteeEmail}.`, 'success');
    if (onSaved) onSaved();
  });
}

