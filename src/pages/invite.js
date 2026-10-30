// DevTrack Secure Project Invitation View
// Implements secure invitation links with explicit Accept/Decline workflow
import { store } from '../store.js';
import { formatDate, showToast, showConfirm, escapeHtml } from '../ui.js';
import { extractInviteToken } from '../main.js';
import { firebaseLogout } from '../firebase.js';

function clearPendingInvite() {
  sessionStorage.removeItem('pending_invite_token');
}

export function renderInvite(container, token) {
  const cleanToken = (token || extractInviteToken() || '').trim();
  const stored = store.getInvitationByToken(cleanToken);
  const currentUser = store.currentUser;

  if (!cleanToken || !stored) {
    // A dead token must not keep hijacking every post-login redirect.
    clearPendingInvite();
    container.innerHTML = `
      <div class="min-h-[70vh] flex items-center justify-center px-4 py-12">
        <div class="max-w-md w-full p-8 rounded-2xl bg-surface-canvas border border-border-subtle shadow-2xl text-center">
          <div class="w-16 h-16 rounded-2xl bg-status-defect-surface text-status-defect flex items-center justify-center mx-auto mb-4 border border-status-defect/30">
            <span class="material-symbols-outlined text-[32px]">link_off</span>
          </div>
          <h2 class="font-geist text-headline-md font-bold text-text-primary mb-2">Invalid or Expired Link</h2>
          <p class="text-body-sm text-text-muted mb-6">
            This invitation link is invalid, has expired, or was revoked by the project owner. Please request a new invitation.
          </p>
          <a href="#/dashboard" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-panel hover:bg-surface-elevated text-text-primary text-body-md font-medium border border-border-subtle transition-all">
            <span class="material-symbols-outlined text-[18px]">home</span>
            <span>Return to Workspace</span>
          </a>
        </div>
      </div>
    `;
    return;
  }

  // Every field below is rendered into HTML; escape once up front.
  const invitation = Object.fromEntries(Object.entries(stored).map(([k, v]) => [k, typeof v === 'string' ? escapeHtml(v) : v]));

  const isExpired = invitation.status === 'Expired' || new Date(invitation.expiresAt).getTime() <= Date.now();
  const isAccepted = invitation.status === 'Accepted';
  const isDeclined = invitation.status === 'Declined';
  const isRevoked = invitation.status === 'Revoked';
  const isPending = invitation.status === 'Pending' && !isExpired;
  if (!isPending) clearPendingInvite();

  // Authentication & Identity matching
  const isAuthenticated = !!currentUser;
  const isCorrectEmail = isAuthenticated && (currentUser.email || '').toLowerCase() === invitation.inviteeEmail.toLowerCase();

  const roleDescriptions = {
    Owner: 'Full administrative control over project settings, members, releases, and lifecycle data.',
    Developer: 'Author requirements, manage sprint board tasks, implement fixes, and transition bugs.',
    Tester: 'Create and run test cases, record append-only execution telemetry, and file defects.',
    Viewer: 'Read-only audit access to project dashboard, traceability matrix, and audit logs.'
  };

  container.innerHTML = `
    <div class="min-h-[80vh] flex items-center justify-center px-4 py-10 font-inter">
      <div class="max-w-lg w-full bg-surface-canvas border border-border-strong rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <!-- Ambient Header Glow -->
        <div class="absolute -top-20 -right-20 w-56 h-56 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

        <!-- Brand Indicator -->
        <div class="flex items-center justify-between border-b border-border-subtle pb-4 mb-6">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold shadow-md shadow-primary/20">
              <span class="material-symbols-outlined text-[20px]">terminal</span>
            </div>
            <span class="font-geist text-headline-sm font-bold text-text-primary tracking-tight">DevTrack</span>
          </div>

          <!-- Status Badge -->
          <div>
            ${isPending ? `
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/15 text-secondary text-[11px] font-jetbrains font-semibold border border-secondary/30">
                <span class="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
                INVITATION PENDING
              </span>
            ` : isAccepted ? `
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-status-passed-surface text-status-passed text-[11px] font-jetbrains font-semibold border border-status-passed/30">
                <span class="material-symbols-outlined text-[14px]">check_circle</span>
                ACCEPTED
              </span>
            ` : isDeclined ? `
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-panel text-text-muted text-[11px] font-jetbrains font-semibold border border-border-subtle">
                <span class="material-symbols-outlined text-[14px]">cancel</span>
                DECLINED
              </span>
            ` : `
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-status-defect-surface text-status-defect text-[11px] font-jetbrains font-semibold border border-status-defect/30">
                <span class="material-symbols-outlined text-[14px]">timer_off</span>
                ${isRevoked ? 'REVOKED' : 'EXPIRED'}
              </span>
            `}
          </div>
        </div>

        <!-- Main Invitation Info -->
        <div class="text-center sm:text-left mb-6">
          <span class="font-jetbrains text-[11px] uppercase tracking-wider text-text-muted block mb-1">Project Workspace Invitation</span>
          <h1 class="font-geist text-headline-lg font-bold text-text-primary mb-1">
            Join <span class="text-primary">${invitation.projectName}</span>
          </h1>
          <div class="flex items-center justify-center sm:justify-start gap-2 text-body-sm text-text-muted">
            <span class="font-jetbrains text-[11px] px-2 py-0.5 rounded bg-primary-container/20 text-primary font-bold">${invitation.projectKey}</span>
            <span>•</span>
            <span>Invited by <strong class="text-text-primary">${invitation.inviterName}</strong></span>
          </div>
        </div>

        <!-- Role & Scope Details Card -->
        <div class="p-4 rounded-xl bg-surface-base border border-border-subtle space-y-3 mb-6">
          <div class="flex items-center justify-between">
            <span class="text-[12px] text-text-muted font-jetbrains uppercase">Assigned Project Role</span>
            <span class="font-jetbrains text-[12px] font-bold px-2.5 py-0.5 rounded bg-secondary/15 text-secondary border border-secondary/30 uppercase">
              ${invitation.role}
            </span>
          </div>
          <p class="text-body-sm text-text-secondary">
            ${roleDescriptions[invitation.role] || 'Full access according to your assigned project role permissions.'}
          </p>
          <div class="pt-2 border-t border-border-subtle/60 flex items-center justify-between text-[11px] font-jetbrains text-text-muted">
            <span>Sent to: <strong class="text-text-primary">${invitation.inviteeEmail}</strong></span>
            <span>Expires: ${formatDate(invitation.expiresAt)}</span>
          </div>
        </div>

        <!-- Context & Action Area -->
        ${!isAuthenticated ? `
          <!-- Unauthenticated State -->
          <div class="p-4 rounded-xl bg-surface-panel/40 border border-border-subtle text-center mb-6">
            <span class="material-symbols-outlined text-[28px] text-primary mb-1">lock</span>
            <h4 class="font-geist text-body-md font-bold text-text-primary mb-1">Authentication Required</h4>
            <p class="text-[12px] text-text-muted mb-4">
              Please sign in or register with <strong class="text-text-primary">${invitation.inviteeEmail}</strong> to accept this invitation.
            </p>
            <div class="flex flex-col sm:flex-row gap-2 justify-center">
              <button id="invite-login-btn" class="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-semibold text-body-sm hover:bg-primary-fixed shadow-md shadow-primary/20 transition-all">
                Sign In to Accept
              </button>
              <button id="invite-register-btn" class="px-5 py-2.5 rounded-xl bg-surface-panel hover:bg-surface-elevated text-text-primary font-medium text-body-sm border border-border-subtle transition-all">
                Create Account
              </button>
            </div>
          </div>
        ` : !isCorrectEmail ? `
          <!-- Account Mismatch State -->
          <div class="p-4 rounded-xl bg-status-defect-surface border border-status-defect/30 mb-6">
            <div class="flex items-start gap-3">
              <span class="material-symbols-outlined text-[22px] text-status-defect shrink-0 mt-0.5">warning</span>
              <div class="text-[12px]">
                <span class="font-bold text-text-primary block mb-0.5">Account Mismatch</span>
                <span class="text-text-muted">
                  This invitation was sent to <strong class="text-text-primary">${invitation.inviteeEmail}</strong>, but you are currently signed in as <strong class="text-text-primary">${escapeHtml(currentUser.email)}</strong>.
                </span>
                <div class="mt-3">
                  <button id="invite-switch-account-btn" class="px-3.5 py-1.5 rounded-lg bg-surface-canvas hover:bg-surface-elevated text-text-primary text-[12px] font-medium border border-border-subtle transition-all">
                    Sign Out & Switch Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        ` : isPending ? `
          <!-- Active Pending State: Explicit Accept / Decline Buttons -->
          <div class="space-y-3">
            <button id="accept-invite-btn" class="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary hover:bg-primary-fixed text-on-primary font-bold text-body-md transition-all shadow-lg shadow-primary/25 active:scale-98">
              <span class="material-symbols-outlined text-[20px]">check_circle</span>
              <span>Accept Invitation & Join Team</span>
            </button>
            <button id="decline-invite-btn" class="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-surface-panel hover:bg-status-defect-surface hover:text-status-defect text-text-muted font-medium text-body-sm border border-border-subtle transition-all">
              <span class="material-symbols-outlined text-[18px]">close</span>
              <span>Decline Invitation</span>
            </button>
          </div>
        ` : isAccepted ? `
          <!-- Already Accepted -->
          <div class="text-center">
            <p class="text-body-sm text-text-secondary mb-4">You are already an active member of this project workspace.</p>
            <a href="#/dashboard" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-semibold text-body-sm shadow-md shadow-primary/20 hover:bg-primary-fixed transition-all">
              <span class="material-symbols-outlined text-[18px]">dashboard</span>
              <span>Open Project Dashboard</span>
            </a>
          </div>
        ` : `
          <!-- Inactive / Declined / Expired -->
          <div class="text-center">
            <p class="text-body-sm text-text-muted mb-4">This invitation is no longer active.</p>
            <a href="#/dashboard" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-panel hover:bg-surface-elevated text-text-primary text-body-sm border border-border-subtle transition-all">
              <span>Go to Workspace Dashboard</span>
            </a>
          </div>
        `}
      </div>
    </div>
  `;

  // Event handlers
  document.getElementById('invite-login-btn')?.addEventListener('click', () => {
    sessionStorage.setItem('pending_invite_token', cleanToken);
    window.location.hash = '#/login';
  });

  document.getElementById('invite-register-btn')?.addEventListener('click', () => {
    sessionStorage.setItem('pending_invite_token', cleanToken);
    window.location.hash = '#/register';
  });

  document.getElementById('invite-switch-account-btn')?.addEventListener('click', async () => {
    sessionStorage.setItem('pending_invite_token', cleanToken);
    // Sign out of Firebase too, otherwise the persisted session logs the wrong
    // account straight back in on the next auth-state event.
    await firebaseLogout();
    store.logout();
    window.location.hash = '#/login';
  });

  // Accept button handler
  document.getElementById('accept-invite-btn')?.addEventListener('click', () => {
    const btn = document.getElementById('accept-invite-btn');
    if (btn) btn.disabled = true;

    // Call store method
    const res = store.acceptInvitation(cleanToken);
    if (res.error) {
      showToast(res.error, 'error');
      if (btn) btn.disabled = false;
      return;
    }

    clearPendingInvite();
    showToast(`Welcome! You have joined "${stored.projectName}" as ${stored.role}.`, 'success');
    window.location.hash = '#/dashboard';
  });

  // Decline button handler
  document.getElementById('decline-invite-btn')?.addEventListener('click', () => {
    showConfirm(`Are you sure you want to decline this invitation to join "${invitation.projectName}"?`, () => {
      const res = store.declineInvitation(cleanToken);
      if (res.error) {
        showToast(res.error, 'error');
        return;
      }

      clearPendingInvite();
      showToast('Invitation declined.', 'info');
      window.location.hash = '#/dashboard';
    }, { title: 'Decline Invitation', destructive: true, confirmText: 'Decline' });
  });
}
