// DevTrack — Master Application Shell & Client-Side Router
import { store } from './store.js';
import { avatar, showToast, showModal, closeModal, formatDate, showConfirm, escapeHtml } from './ui.js';

import { renderSignIn, renderRegister, renderForgotPassword } from './pages/auth.js';
import { subscribeFirebaseAuthState, firebaseLogout, waitForAuthReady } from './firebase.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderProjects, openCreateProjectModal } from './pages/projects.js';
import { renderRequirements } from './pages/requirements.js';
import { renderSprints } from './pages/sprints.js';
import { renderTests } from './pages/tests.js';
import { renderBugs } from './pages/bugs.js';
import { renderReleases } from './pages/releases.js';
import { renderTeam } from './pages/team.js';
import { renderSettings } from './pages/settings.js';
import { renderCicd } from './pages/cicd.js';
import { renderGettingStarted } from './pages/gettingStarted.js';
import { renderInvite } from './pages/invite.js';


const app = document.getElementById('app');

const ROUTES = {
  '#/login': { render: renderSignIn, public: true },
  '#/register': { render: renderRegister, public: true },
  '#/forgot-password': { render: renderForgotPassword, public: true },
  '#/dashboard': { render: renderDashboard, nav: 'dashboard' },
  '#/projects': { render: renderProjects, nav: 'projects' },
  '#/requirements': { render: renderRequirements, nav: 'requirements' },
  '#/sprints': { render: renderSprints, nav: 'sprints' },
  '#/board': { render: renderSprints, nav: 'sprints' },
  '#/tests': { render: renderTests, nav: 'tests' },
  '#/bugs': { render: renderBugs, nav: 'bugs' },
  '#/releases': { render: renderReleases, nav: 'releases' },
  '#/matrix': { render: renderReleases, nav: 'releases' },
  '#/team': { render: renderTeam, nav: 'team' },
  '#/settings': { render: renderSettings, nav: 'settings' },
  '#/audit': { render: renderSettings, nav: 'settings' },
  '#/ci-cd': { render: renderCicd, nav: 'cicd' },
  '#/getting-started': { render: renderGettingStarted, nav: 'getting-started' }
};

function getActiveNavKey(hash) {
  if (ROUTES[hash]?.nav) return ROUTES[hash].nav;
  if (hash.startsWith('#/requirements')) return 'requirements';
  if (hash.startsWith('#/sprints') || hash.startsWith('#/board')) return 'sprints';
  if (hash.startsWith('#/tests')) return 'tests';
  if (hash.startsWith('#/bugs')) return 'bugs';
  if (hash.startsWith('#/releases') || hash.startsWith('#/matrix')) return 'releases';
  if (hash.startsWith('#/team')) return 'team';
  if (hash.startsWith('#/projects')) return 'projects';
  if (hash.startsWith('#/settings') || hash.startsWith('#/audit')) return 'settings';
  if (hash.startsWith('#/ci-cd')) return 'cicd';
  return 'dashboard';
}

function renderShell(contentRenderer) {
  const user = store.currentUser;
  const activeProject = store.getActiveProject() || { name: 'No Project', key: '—' };
  const project = { ...activeProject, name: escapeHtml(activeProject.name), key: escapeHtml(activeProject.key) };
  const allProjects = store.getProjects();
  const currentHash = window.location.hash || '#/dashboard';
  const activeNav = getActiveNavKey(currentHash);
  const userRole = store.getUserRole(project.id) || 'No Role';
  const userName = escapeHtml(user?.name || user?.email || 'User');
  const userEmail = escapeHtml(user?.email || '');
  const pendingInvsCount = user ? store.getPendingInvitationsCount(user.email) : 0;


  app.innerHTML = `
    <!-- Left Navigation Sidebar -->
    <aside class="fixed left-0 top-0 h-full w-64 bg-surface-canvas border-r border-border-subtle z-50 flex flex-col justify-between shadow-2xl">
      <div class="flex flex-col flex-1 min-h-0">
        <!-- Brand & Workspace Header -->
        <div class="h-14 px-5 flex items-center justify-between border-b border-border-subtle bg-surface-base/40">
          <a href="#/dashboard" class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold shadow-md shadow-primary/20">
              <span class="material-symbols-outlined text-[20px]">terminal</span>
            </div>
            <span class="font-geist text-headline-sm font-bold text-text-primary tracking-tight">DevTrack</span>
          </a>
          <div class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-status-passed animate-pulse"></span>
            <span class="font-jetbrains text-[10px] text-text-muted">v2.14</span>
          </div>
        </div>

        <!-- Project Switcher Pill in Sidebar -->
        <div class="px-3 py-2.5 border-b border-border-subtle/50 bg-surface-base/20">
          <div class="relative flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-surface-panel/60 border border-border-subtle hover:bg-surface-panel transition-colors">
            <div class="flex items-center gap-2 min-w-0 pointer-events-none">
              <span class="font-jetbrains text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary-container/20 text-primary">${project.key}</span>
              <span class="font-geist text-body-sm font-bold text-text-primary truncate">${project.name}</span>
            </div>
            <select id="sidebar-proj-select" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" title="Switch active project">
              ${allProjects.map(p => `<option value="${escapeHtml(p.id)}" ${p.id === project.id ? 'selected' : ''}>${escapeHtml(p.name)} (${escapeHtml(p.key)})</option>`).join('')}
            </select>
            <span class="material-symbols-outlined text-[16px] text-text-muted pointer-events-none">unfold_more</span>
          </div>
        </div>

        <!-- Navigation Links Container -->
        <div class="flex-1 overflow-y-auto px-3 py-3 space-y-4 font-jetbrains text-label-md">
          <!-- Group 1: Workspace -->
          <div class="space-y-1">
            <div class="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">Workspace</div>
            <nav class="space-y-0.5">
              <a href="#/dashboard" class="nav-item flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${activeNav === 'dashboard' ? 'bg-surface-panel text-primary font-semibold shadow-sm' : 'text-text-secondary hover:bg-surface-panel hover:text-text-primary'}">
                <span class="material-symbols-outlined text-[18px]">dashboard</span>
                <span>Dashboard</span>
              </a>
              <a href="#/projects" class="nav-item flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${activeNav === 'projects' ? 'bg-surface-panel text-primary font-semibold shadow-sm' : 'text-text-secondary hover:bg-surface-panel hover:text-text-primary'}">
                <span class="material-symbols-outlined text-[18px]">folder_data</span>
                <span>Projects Directory</span>
              </a>
            </nav>
          </div>

          <!-- Group 2: Lifecycle Planning -->
          <div class="space-y-1">
            <div class="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">Lifecycle Planning</div>
            <nav class="space-y-0.5">
              <a href="#/requirements" class="nav-item flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${activeNav === 'requirements' ? 'bg-surface-panel text-primary font-semibold shadow-sm' : 'text-text-secondary hover:bg-surface-panel hover:text-text-primary'}">
                <span class="material-symbols-outlined text-[18px]">rule</span>
                <span>Requirements / MoSCoW</span>
              </a>
              <a href="#/sprints" class="nav-item flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${activeNav === 'sprints' ? 'bg-surface-panel text-primary font-semibold shadow-sm' : 'text-text-secondary hover:bg-surface-panel hover:text-text-primary'}">
                <span class="material-symbols-outlined text-[18px]">view_kanban</span>
                <span>Sprints & Tasks Board</span>
              </a>
            </nav>
          </div>

          <!-- Group 3: Quality & Delivery -->
          <div class="space-y-1">
            <div class="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">Quality & Delivery</div>
            <nav class="space-y-0.5">
              <a href="#/tests" class="nav-item flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${activeNav === 'tests' ? 'bg-surface-panel text-primary font-semibold shadow-sm' : 'text-text-secondary hover:bg-surface-panel hover:text-text-primary'}">
                <span class="material-symbols-outlined text-[18px]">verified</span>
                <span>Test Runs & QA</span>
              </a>
              <a href="#/bugs" class="nav-item flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${activeNav === 'bugs' ? 'bg-surface-panel text-primary font-semibold shadow-sm' : 'text-text-secondary hover:bg-surface-panel hover:text-text-primary'}">
                <span class="material-symbols-outlined text-[18px]">pest_control</span>
                <span>Bug Tracker</span>
              </a>
              <a href="#/releases" class="nav-item flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${activeNav === 'releases' ? 'bg-surface-panel text-primary font-semibold shadow-sm' : 'text-text-secondary hover:bg-surface-panel hover:text-text-primary'}">
                <span class="material-symbols-outlined text-[18px]">account_tree</span>
                <span>Releases & Traceability</span>
              </a>
              <a href="#/ci-cd" class="nav-item flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${activeNav === 'cicd' ? 'bg-surface-panel text-primary font-semibold shadow-sm' : 'text-text-secondary hover:bg-surface-panel hover:text-text-primary'}">
                <span class="material-symbols-outlined text-[18px]">terminal</span>
                <span>CI/CD Pipeline</span>
              </a>
            </nav>
          </div>

          <!-- Group 4: Settings & Onboarding -->
          <div class="space-y-1">
            <div class="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">Settings & Guide</div>
            <nav class="space-y-0.5">
              <a href="#/team" class="nav-item flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${activeNav === 'team' ? 'bg-surface-panel text-primary font-semibold shadow-sm' : 'text-text-secondary hover:bg-surface-panel hover:text-text-primary'}">
                <span class="material-symbols-outlined text-[18px]">manage_accounts</span>
                <span>Team & Roles</span>
              </a>
              <a href="#/settings" class="nav-item flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${activeNav === 'settings' ? 'bg-surface-panel text-primary font-semibold shadow-sm' : 'text-text-secondary hover:bg-surface-panel hover:text-text-primary'}">
                <span class="material-symbols-outlined text-[18px]">tune</span>
                <span>Settings & Audit</span>
              </a>
              <a href="#/getting-started" class="nav-item flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${activeNav === 'getting-started' ? 'bg-surface-panel text-primary font-semibold shadow-sm' : 'text-text-secondary hover:bg-surface-panel hover:text-text-primary'}">
                <span class="material-symbols-outlined text-[18px]">flag</span>
                <span>Lifecycle Guide</span>
              </a>
            </nav>
          </div>
        </div>
      </div>

      <!-- Sidebar Bottom: System Ops Health -->
      <div class="p-3 border-t border-border-subtle bg-surface-base/60 font-jetbrains">
        <div class="flex items-center justify-between text-text-muted text-[11px] px-1">
          <span>ENGINEERING-OPS</span>
          <div class="flex items-center gap-1.5 text-status-passed">
            <span class="w-1.5 h-1.5 rounded-full bg-status-passed"></span>
            <span>SYNCED</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- Top Navigation Header -->
    <div class="pl-64 flex flex-col min-h-screen">
      <header class="fixed top-0 left-64 right-0 h-14 bg-surface-canvas/90 backdrop-blur-xl border-b border-border-subtle z-40 shadow-sm flex items-center justify-between px-6">
        <!-- Left: Project Indicator -->
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <span class="font-jetbrains text-[11px] font-bold px-2 py-0.5 rounded bg-primary-container/20 text-primary">${project.key}</span>
            <span class="font-geist text-body-md font-bold text-text-primary">${project.name}</span>
          </div>
          <div class="hidden sm:flex items-center gap-1 font-jetbrains text-[10px]">
            <span class="px-2 py-0.5 rounded-full bg-status-in-progress-surface text-status-in-progress font-semibold">STAGE</span>
            <span class="px-2 py-0.5 rounded-full bg-status-passed-surface text-status-passed font-semibold">PRODUCTION</span>
          </div>
        </div>

        <!-- Right: Search & User Profile Menu -->
        <div class="flex items-center gap-3">
          <!-- Quick Search Button (Ctrl+K) -->
          <button id="quick-search-btn" class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-muted hover:text-text-primary border border-border-subtle transition-all">
            <span class="material-symbols-outlined text-[16px]">search</span>
            <span class="text-body-sm font-inter hidden sm:inline">Quick Search...</span>
            <kbd class="font-jetbrains text-[10px] bg-surface-base px-1.5 py-0.5 rounded text-text-secondary border border-border-subtle">Ctrl+K</kbd>
          </button>

          <!-- Central In-App Invitations Inbox Button -->
          <button id="inbox-invitations-btn" class="relative flex items-center justify-center w-9 h-9 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-muted hover:text-text-primary border border-border-subtle transition-all cursor-pointer" title="Project Invitations Inbox">
            <span class="material-symbols-outlined text-[20px] ${pendingInvsCount > 0 ? 'text-primary' : ''}">mail</span>
            ${pendingInvsCount > 0 ? `
              <span class="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-primary text-[10px] font-jetbrains font-bold text-on-primary animate-pulse shadow-sm shadow-primary/50">
                ${pendingInvsCount}
              </span>
            ` : ''}
          </button>


          <!-- User Profile & Sign Out dropdown -->
          <div class="relative group">
            <div class="flex items-center gap-2.5 p-1 rounded-lg hover:bg-surface-panel transition-colors cursor-pointer">
              ${avatar(user?.name || user?.email || 'User', 'w-8 h-8 text-[12px]', user?.photoURL)}
              <div class="hidden md:flex flex-col text-left">
                <span class="font-geist text-body-sm font-bold text-text-primary leading-tight">${userName}</span>
                <span class="font-jetbrains text-[10px] text-text-muted leading-tight">${userRole}</span>
              </div>
              <span class="material-symbols-outlined text-[16px] text-text-muted">expand_more</span>
            </div>

            <!-- Dropdown Menu -->
            <div class="absolute right-0 top-full mt-1 w-56 bg-surface-canvas border border-border-strong rounded-xl p-2 shadow-2xl hidden group-hover:block z-50 animate-scale-in">
              <div class="px-3 py-2 border-b border-border-subtle mb-1">
                <div class="font-geist text-body-sm font-bold text-text-primary">${userName}</div>
                <div class="font-jetbrains text-[11px] text-text-muted truncate">${userEmail}</div>
              </div>
              <a href="#/projects" class="flex items-center gap-2 px-3 py-2 rounded-lg text-body-sm text-text-secondary hover:bg-surface-panel hover:text-text-primary transition-colors">
                <span class="material-symbols-outlined text-[16px]">workspaces</span>
                <span>Switch Project</span>
              </a>
              <a href="#/team" class="flex items-center gap-2 px-3 py-2 rounded-lg text-body-sm text-text-secondary hover:bg-surface-panel hover:text-text-primary transition-colors">
                <span class="material-symbols-outlined text-[16px]">manage_accounts</span>
                <span>Team & Roles</span>
              </a>
              <button id="menu-inbox-btn" class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-body-sm text-text-secondary hover:bg-surface-panel hover:text-text-primary transition-colors text-left cursor-pointer">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-[16px]">mail</span>
                  <span>Invitations Inbox</span>
                </div>
                ${pendingInvsCount > 0 ? `<span class="px-1.5 py-0.2 rounded-full bg-primary/20 text-primary text-[10px] font-jetbrains font-bold">${pendingInvsCount}</span>` : ''}
              </button>

              <div class="border-t border-border-subtle my-1"></div>
              <button id="signout-btn" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-body-sm text-status-defect hover:bg-status-defect-surface transition-colors text-left">
                <span class="material-symbols-outlined text-[16px]">logout</span>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Main Page Content Slot -->
      <main id="main-content" class="w-full pt-14 flex-1 bg-surface-base"></main>
    </div>
  `;

  // Project Switcher handler in sidebar
  const projSelect = document.getElementById('sidebar-proj-select');
  projSelect?.addEventListener('change', (e) => {
    store.setActiveProjectId(e.target.value);
    showToast('Active project changed!', 'info');
    renderShell(contentRenderer);
  });

  // Sign out handler
  document.getElementById('signout-btn')?.addEventListener('click', async () => {
    try {
      await firebaseLogout();
    } catch (e) {
      console.warn('[Firebase] Sign out:', e);
    }
    store.logout();
    showToast('Signed out of workspace', 'info');
    window.location.hash = '#/login';
  });

  // Quick search handler
  document.getElementById('quick-search-btn')?.addEventListener('click', openQuickSearchModal);

  // Central Invitation Inbox handlers
  document.getElementById('inbox-invitations-btn')?.addEventListener('click', () => {
    openInvitationsInboxModal(() => renderShell(contentRenderer));
  });
  document.getElementById('menu-inbox-btn')?.addEventListener('click', () => {
    openInvitationsInboxModal(() => renderShell(contentRenderer));
  });


  // Explicit sidebar navigation click handler
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const href = item.getAttribute('href');
      if (href) {
        if (window.location.hash === href) {
          route();
        } else {
          window.location.hash = href;
        }
      }
    });
  });

  // Render the specific page into main slot
  const mainContent = document.getElementById('main-content');
  contentRenderer(mainContent);
}

function openQuickSearchModal() {
  const project = store.getActiveProject();
  if (!project) return;

  const reqs = store.getRequirements(project.id);
  const tasks = store.getTasks(project.id);
  const bugs = store.getBugs(project.id);
  const testCases = store.getTestCases(project.id);

  showModal(`
    <div class="space-y-4">
      <div class="relative">
        <span class="material-symbols-outlined absolute left-3 top-3 text-text-muted text-[20px]">search</span>
        <input type="text" id="omni-search-input" autofocus placeholder="Search requirements, tasks, test cases, bugs..."
          class="w-full bg-surface-base text-text-primary text-body-md pl-10 pr-4 py-2.5 rounded-xl border border-border-subtle focus:border-primary outline-none transition-all font-inter" />
      </div>

      <div id="omni-results" class="space-y-2 max-h-80 overflow-y-auto pr-1">
        <div class="text-[11px] font-jetbrains text-text-muted px-2 py-1">Type at least 2 characters to search across lifecycle entities...</div>
      </div>
    </div>
  `, { title: 'Lifecycle Quick Search (Omni)' });

  const input = document.getElementById('omni-search-input');
  const resultsEl = document.getElementById('omni-results');

  input?.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (q.length < 2) {
      resultsEl.innerHTML = `<div class="text-[11px] font-jetbrains text-text-muted px-2 py-1">Type at least 2 characters to search...</div>`;
      return;
    }

    const matchedReqs = reqs.filter(r => r.title.toLowerCase().includes(q) || r.id.toLowerCase().includes(q));
    const matchedTasks = tasks.filter(t => t.title.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
    const matchedBugs = bugs.filter(b => b.title.toLowerCase().includes(q) || b.id.toLowerCase().includes(q));
    const matchedTests = testCases.filter(tc => tc.title.toLowerCase().includes(q) || tc.id.toLowerCase().includes(q));

    let html = '';

    if (matchedReqs.length > 0) {
      html += `<div class="text-[10px] font-jetbrains text-text-muted uppercase px-2 py-1">Requirements (${matchedReqs.length})</div>`;
      matchedReqs.forEach(r => {
        html += `
          <div class="p-2.5 rounded-lg bg-surface-base hover:bg-surface-panel cursor-pointer flex items-center justify-between border border-border-subtle transition-all" onclick="window.__closeModal(); window.location.hash='#/requirements'">
            <div class="flex items-center gap-2">
              <span class="font-jetbrains text-[11px] text-primary font-bold">${r.id}</span>
              <span class="text-body-sm text-text-primary font-medium">${escapeHtml(r.title)}</span>
            </div>
            <span class="text-[10px] font-jetbrains text-text-muted">${r.priority}</span>
          </div>
        `;
      });
    }

    if (matchedTasks.length > 0) {
      html += `<div class="text-[10px] font-jetbrains text-text-muted uppercase px-2 py-1 mt-2">Sprint Tasks (${matchedTasks.length})</div>`;
      matchedTasks.forEach(t => {
        html += `
          <div class="p-2.5 rounded-lg bg-surface-base hover:bg-surface-panel cursor-pointer flex items-center justify-between border border-border-subtle transition-all" onclick="window.__closeModal(); window.location.hash='#/sprints'">
            <div class="flex items-center gap-2">
              <span class="font-jetbrains text-[11px] text-secondary font-bold">${t.id}</span>
              <span class="text-body-sm text-text-primary font-medium">${escapeHtml(t.title)}</span>
            </div>
            <span class="text-[10px] font-jetbrains text-text-muted">${t.status}</span>
          </div>
        `;
      });
    }

    if (matchedBugs.length > 0) {
      html += `<div class="text-[10px] font-jetbrains text-text-muted uppercase px-2 py-1 mt-2">Defects (${matchedBugs.length})</div>`;
      matchedBugs.forEach(b => {
        html += `
          <div class="p-2.5 rounded-lg bg-surface-base hover:bg-surface-panel cursor-pointer flex items-center justify-between border border-border-subtle transition-all" onclick="window.__closeModal(); window.location.hash='#/bugs'">
            <div class="flex items-center gap-2">
              <span class="font-jetbrains text-[11px] text-status-defect font-bold">${b.id}</span>
              <span class="text-body-sm text-text-primary font-medium">${escapeHtml(b.title)}</span>
            </div>
            <span class="text-[10px] font-jetbrains text-status-defect font-semibold">${b.severity}</span>
          </div>
        `;
      });
    }

    if (matchedTests.length > 0) {
      html += `<div class="text-[10px] font-jetbrains text-text-muted uppercase px-2 py-1 mt-2">Test Cases (${matchedTests.length})</div>`;
      matchedTests.forEach(tc => {
        html += `
          <div class="p-2.5 rounded-lg bg-surface-base hover:bg-surface-panel cursor-pointer flex items-center justify-between border border-border-subtle transition-all" onclick="window.__closeModal(); window.location.hash='#/tests'">
            <div class="flex items-center gap-2">
              <span class="font-jetbrains text-[11px] text-status-passed font-bold">${tc.id}</span>
              <span class="text-body-sm text-text-primary font-medium">${escapeHtml(tc.title)}</span>
            </div>
            <span class="text-[10px] font-jetbrains text-text-muted">${tc.status}</span>
          </div>
        `;
      });
    }

    if (!html) {
      html = `<div class="p-6 text-center text-text-muted text-body-sm font-jetbrains">No matching items found for "${escapeHtml(q)}".</div>`;
    }

    resultsEl.innerHTML = html;
  });
}

export function openInvitationsInboxModal(onChanged) {
  const user = store.currentUser;
  if (!user) return;
  const invs = store.getUserInvitations(user.email).map(inv =>
    Object.fromEntries(Object.entries(inv).map(([k, v]) => [k, typeof v === 'string' ? escapeHtml(v) : v])));
  const nowMs = Date.now();
  const pendingInvs = invs.filter(i => i.status === 'Pending' && new Date(i.expiresAt).getTime() > nowMs);
  const historyInvs = invs.filter(i => i.status !== 'Pending' || new Date(i.expiresAt).getTime() <= nowMs);

  showModal(`
    <div class="space-y-4">
      <div class="p-3.5 rounded-xl bg-surface-base border border-secondary/30 flex items-start gap-3">
        <div class="w-8 h-8 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center shrink-0 mt-0.5">
          <span class="material-symbols-outlined text-[20px]">mail</span>
        </div>
        <div class="text-[12px]">
          <span class="font-semibold text-text-primary block text-body-sm">Central In-App Invitation Inbox</span>
          <span class="text-text-muted">Review, accept, or decline workspace invitations for <strong class="text-text-primary">${escapeHtml(user.email)}</strong>. Accepting grants immediate role-based membership.</span>
        </div>
      </div>

      <!-- Pending Invitations Section -->
      <div class="space-y-2.5">
        <div class="flex items-center justify-between text-[11px] font-jetbrains text-text-muted uppercase tracking-wider px-1">
          <span>Pending Invitations (${pendingInvs.length})</span>
          <span>Explicit Action Required</span>
        </div>

        ${pendingInvs.length === 0 ? `
          <div class="p-6 rounded-xl bg-surface-base/50 border border-border-subtle text-center text-text-muted text-body-sm font-jetbrains">
            <span class="material-symbols-outlined text-[28px] text-text-muted mb-1 block">drafts</span>
            No pending project invitations for your account.
          </div>
        ` : pendingInvs.map(inv => `
          <div class="p-4 rounded-xl bg-surface-base border border-secondary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:border-secondary transition-all">
            <div class="space-y-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-jetbrains text-[10px] font-bold px-2 py-0.5 rounded bg-primary-container/20 text-primary">${inv.projectKey}</span>
                <span class="font-geist text-body-md font-bold text-text-primary">${inv.projectName}</span>
                <span class="font-jetbrains text-[10px] font-bold px-2 py-0.5 rounded bg-secondary/15 text-secondary border border-secondary/30 uppercase">${inv.role}</span>
              </div>
              <div class="text-[12px] text-text-muted">
                Invited by <strong class="text-text-primary">${inv.inviterName}</strong> (${inv.inviterEmail})
              </div>
              <div class="text-[11px] font-jetbrains text-text-muted">
                Expires: ${formatDate(inv.expiresAt)}
              </div>
            </div>

            <div class="flex items-center gap-2 self-end sm:self-center">
              <button class="inbox-decline-btn px-3.5 py-1.5 rounded-lg bg-surface-panel hover:bg-status-defect-surface hover:text-status-defect text-text-muted text-[12px] font-medium border border-border-subtle transition-all cursor-pointer" data-id="${inv.id}" data-name="${inv.projectName}">
                Decline
              </button>
              <button class="inbox-accept-btn flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-fixed text-on-primary font-bold text-[12px] shadow-md shadow-primary/20 transition-all cursor-pointer" data-id="${inv.id}" data-name="${inv.projectName}" data-role="${inv.role}">
                <span class="material-symbols-outlined text-[16px]">check</span>
                <span>Accept</span>
              </button>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- History (Accepted / Declined / Expired) -->
      ${historyInvs.length > 0 ? `
        <div class="pt-3 border-t border-border-subtle/70">
          <span class="text-[11px] font-jetbrains text-text-muted uppercase block mb-2 px-1">Past Invitations (${historyInvs.length})</span>
          <div class="max-h-36 overflow-y-auto space-y-2 pr-1">
            ${historyInvs.map(inv => `
              <div class="p-2.5 rounded-lg bg-surface-base/40 border border-border-subtle/50 flex items-center justify-between text-[12px]">
                <div class="flex items-center gap-2">
                  <span class="font-jetbrains text-[10px] text-text-muted">${inv.projectKey}</span>
                  <span class="font-medium text-text-secondary">${inv.projectName}</span>
                  <span class="text-text-muted">(${inv.role})</span>
                </div>
                <span class="font-jetbrains text-[10px] px-2 py-0.5 rounded font-semibold ${
                  inv.status === 'Accepted' ? 'bg-status-passed-surface text-status-passed' :
                  inv.status === 'Declined' ? 'bg-surface-panel text-text-muted' :
                  'bg-status-defect-surface text-status-defect'
                }">${inv.status.toUpperCase()}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="flex justify-end pt-2">
        <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-secondary hover:bg-surface-elevated text-body-sm">Close</button>
      </div>
    </div>
  `, { title: 'Workspace Invitations Inbox' });

  // Attach inbox action listeners
  document.querySelectorAll('.inbox-accept-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const invId = btn.dataset.id;
      const res = store.acceptInvitation(invId);
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        sessionStorage.removeItem('pending_invite_token');
        closeModal();
        showToast(`Accepted invitation to join ${btn.dataset.name}!`, 'success');
        if (onChanged) onChanged();
      }
    });
  });

  document.querySelectorAll('.inbox-decline-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const invId = btn.dataset.id;
      showConfirm(`Decline invitation to join "${escapeHtml(btn.dataset.name)}"?`, () => {
        const res = store.declineInvitation(invId);
        if (res.error) {
          showToast(res.error, 'error');
        } else {
          sessionStorage.removeItem('pending_invite_token');
          showToast('Invitation declined.', 'info');
          openInvitationsInboxModal(onChanged);
        }
      }, { title: 'Decline Invitation', destructive: true, confirmText: 'Decline' });
    });
  });
}

// Global Ctrl+K shortcut

window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    openQuickSearchModal();
  }
});

export function extractInviteToken() {
  if (typeof window !== 'undefined') {
    // 1. Check URL query params (?token=...)
    if (window.location.search) {
      const urlParams = new URLSearchParams(window.location.search);
      const qToken = urlParams.get('token');
      if (qToken) return decodeURIComponent(qToken).trim();
    }
    // 2. Check URL hash (#/invite?token=... or #/invite/...)
    const hash = window.location.hash || '';
    if (hash.includes('token=')) {
      const match = hash.match(/[?&]token=([^&]+)/);
      if (match && match[1]) return decodeURIComponent(match[1]).trim();
    }
    if (hash.startsWith('#/invite/')) {
      const tokenPart = hash.replace('#/invite/', '').split('?')[0].split('&')[0];
      if (tokenPart) return decodeURIComponent(tokenPart).trim();
    }
  }
  // 3. Fallback to sessionStorage
  if (typeof sessionStorage !== 'undefined') {
    const stored = sessionStorage.getItem('pending_invite_token');
    if (stored) return stored.trim();
  }
  return '';
}

export function redirectAfterAuth() {
  const pendingToken = extractInviteToken();
  if (pendingToken) {
    window.location.hash = `#/invite?token=${encodeURIComponent(pendingToken)}`;
  } else {
    window.location.hash = '#/dashboard';
  }
}

function route() {
  const hash = window.location.hash || '#/dashboard';
  const detectedToken = extractInviteToken();

  if (detectedToken) {
    sessionStorage.setItem('pending_invite_token', detectedToken);
  }

  // Links of the form /?token=... would otherwise re-inject the token on every
  // navigation; move it into the hash route once and drop the query string.
  if (detectedToken && new URLSearchParams(window.location.search).has('token')) {
    window.history.replaceState(null, '', `${window.location.pathname}#/invite?token=${encodeURIComponent(detectedToken)}`);
    route();
    return;
  }

  // Handle Secure Invitation Links (#/invite?token=... or ?token=... or #/invite/...)
  if (hash.startsWith('#/invite') || (detectedToken && !store.currentUser && hash !== '#/login' && hash !== '#/register')) {
    const token = detectedToken || sessionStorage.getItem('pending_invite_token') || '';

    if (store.currentUser) {
      renderShell((container) => renderInvite(container, token));
    } else {
      renderInvite(app, token);
    }
    return;
  }

  const routeObj = ROUTES[hash];

  // If unauthenticated and route is private, redirect to login
  if (!store.currentUser && (!routeObj || !routeObj.public)) {
    window.location.hash = '#/login';
    return;
  }

  // If already authenticated and trying to view login/register, check pending invite or go to dashboard
  if (store.currentUser && routeObj?.public) {
    const pendingToken = sessionStorage.getItem('pending_invite_token');
    if (pendingToken) {
      window.location.hash = `#/invite?token=${encodeURIComponent(pendingToken)}`;
      return;
    }
    window.location.hash = '#/dashboard';
    return;
  }

  if (routeObj) {
    if (routeObj.public) {
      routeObj.render(app);
    } else {
      renderShell(routeObj.render);
    }
  } else {
    window.location.hash = '#/dashboard';
  }
}

window.addEventListener('hashchange', route);
window.addEventListener('devtrack:store-sync', route);
route();

// Real-time Firebase Authentication State Synchronizer with persistent refresh protection
let initialAuthResolved = false;

// Guarantee session persistence across page refreshes
waitForAuthReady().then((fbUser) => {
  initialAuthResolved = true;
  if (fbUser) {
    store.setFirebaseUser(fbUser);
    const hash = window.location.hash || '#/dashboard';
    if (hash === '#/login' || hash === '#/register' || hash === '#/forgot-password') {
      redirectAfterAuth();
    } else {
      route();
    }
  } else {
    // Only log out if Firebase confirmed auth check is complete and user has no active session
    if (store.currentUser?.isFirebase) {
      store.logout();
      if (!window.location.hash.startsWith('#/login') && 
          !window.location.hash.startsWith('#/register') && 
          !window.location.hash.startsWith('#/forgot-password')) {
        window.location.hash = '#/login';
      }
    }
  }
});

subscribeFirebaseAuthState((fbUser) => {
  if (fbUser) {
    store.setFirebaseUser(fbUser);
    const hash = window.location.hash || '#/dashboard';
    if (hash === '#/login' || hash === '#/register' || hash === '#/forgot-password') {
      redirectAfterAuth();
    } else {
      route();
    }
  } else if (initialAuthResolved) {
    // Only handle remote signout if initial auth resolution has completed
    if (store.currentUser?.isFirebase) {
      store.logout();
      if (!window.location.hash.startsWith('#/login') && 
          !window.location.hash.startsWith('#/register') && 
          !window.location.hash.startsWith('#/forgot-password')) {
        window.location.hash = '#/login';
      }
    }
  }
});
