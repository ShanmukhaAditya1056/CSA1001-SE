// DevTrack — Master Application Shell & Client-Side Router
import { store } from './store.js';
import { avatar, showToast, showModal, closeModal, formatDate, showConfirm, escapeHtml } from './ui.js';

import { renderSignIn, renderRegister, renderForgotPassword } from './pages/auth.js';
import { subscribeFirebaseAuthState, firebaseLogout, waitForAuthReady } from './firebase.js';
import { renderDashboard, openNewRequirementModal, openNewDefectModal, openNewTestRunModal } from './pages/dashboard.js';
import { renderProjects, openCreateProjectModal } from './pages/projects.js';
import { renderRequirements } from './pages/requirements.js';
import { renderSprints, openTaskModal } from './pages/sprints.js';
import { renderTests } from './pages/tests.js';
import { renderBugs } from './pages/bugs.js';
import { renderReleases, openReleaseModal } from './pages/releases.js';
import { renderTeam } from './pages/team.js';
import { renderSettings } from './pages/settings.js';
import { renderCicd } from './pages/cicd.js';
import { renderGettingStarted } from './pages/gettingStarted.js';
import { renderInvite } from './pages/invite.js';
import { renderManual } from './pages/manual.js';
import { toggleTheme, themeToggleState } from './theme.js';
import { openMemberProfile } from './pages/memberProfile.js';
import { teamCollab } from './collab.js';
import { startInvitationSync, stopInvitationSync, respondToInvitation, describeDirectoryError } from './directory.js';


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
  '#/getting-started': { render: renderGettingStarted, nav: 'getting-started' },
  '#/help': { render: renderManual, nav: 'help' }
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
    <aside id="app-sidebar" class="fixed left-0 top-0 h-full w-64 bg-surface-canvas border-r border-border-subtle z-50 flex flex-col justify-between shadow-2xl transition-transform duration-300">
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

    <!-- Mobile Drawer Backdrop Overlay -->
    <div id="mobile-sidebar-backdrop" class="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 hidden transition-opacity lg:hidden"></div>

    <!-- Top Navigation Header -->
    <div id="content-shell" class="pl-0 lg:pl-64 flex flex-col min-h-screen transition-all duration-300">
      <header id="top-header" class="fixed top-0 left-0 lg:left-64 right-0 h-14 bg-surface-canvas/90 backdrop-blur-xl border-b border-border-subtle z-50 shadow-sm flex items-center justify-between px-4 lg:px-6 transition-all duration-300">
        <!-- Left: Mobile Hamburger + Project Indicator -->
        <div class="flex items-center gap-2 lg:gap-4">
          <button id="mobile-hamburger-btn" class="lg:hidden p-1.5 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-primary border border-border-subtle transition-colors cursor-pointer mr-1" title="Toggle Navigation Drawer" aria-label="Toggle Navigation Drawer">
            <span class="material-symbols-outlined text-[20px]">menu</span>
          </button>
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
          <!-- Unified Create New... Top Navigation Dropdown -->
          <div class="relative" id="global-create-dropdown-wrapper">
            <button id="global-create-btn" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-on-primary font-inter text-label-md font-semibold hover:brightness-110 active:scale-95 transition-all shadow-md shadow-primary/25 cursor-pointer">
              <span class="material-symbols-outlined text-[18px]">add_circle</span>
              <span class="hidden sm:inline">Create...</span>
              <span class="material-symbols-outlined text-[16px]">expand_more</span>
            </button>
            <div id="global-create-menu" class="absolute right-0 top-full mt-1.5 w-60 bg-surface-canvas border border-border-strong rounded-xl p-1.5 shadow-2xl hidden z-[100] animate-scale-in">
              <div class="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted font-jetbrains">Create New Artifact</div>
              <button id="global-act-req" class="w-full flex items-center gap-2.5 px-2.5 py-2 text-left rounded-lg hover:bg-surface-panel text-text-primary text-body-sm transition-colors cursor-pointer">
                <span class="material-symbols-outlined text-[18px] text-primary">rule</span>
                <div>
                  <div class="font-medium leading-tight">Requirement</div>
                  <div class="text-[11px] text-text-muted">MoSCoW prioritized spec</div>
                </div>
              </button>
              <button id="global-act-task" class="w-full flex items-center gap-2.5 px-2.5 py-2 text-left rounded-lg hover:bg-surface-panel text-text-primary text-body-sm transition-colors cursor-pointer">
                <span class="material-symbols-outlined text-[18px] text-secondary">assignment</span>
                <div>
                  <div class="font-medium leading-tight">Sprint Task</div>
                  <div class="text-[11px] text-text-muted">Kanban task item</div>
                </div>
              </button>
              <button id="global-act-defect" class="w-full flex items-center gap-2.5 px-2.5 py-2 text-left rounded-lg hover:bg-surface-panel text-text-primary text-body-sm transition-colors cursor-pointer">
                <span class="material-symbols-outlined text-[18px] text-status-defect">pest_control</span>
                <div>
                  <div class="font-medium leading-tight">Defect / Bug</div>
                  <div class="text-[11px] text-text-muted">Log & triage software issue</div>
                </div>
              </button>
              <button id="global-act-test" class="w-full flex items-center gap-2.5 px-2.5 py-2 text-left rounded-lg hover:bg-surface-panel text-text-primary text-body-sm transition-colors cursor-pointer">
                <span class="material-symbols-outlined text-[18px] text-status-passed">play_circle</span>
                <div>
                  <div class="font-medium leading-tight">QA Test Run</div>
                  <div class="text-[11px] text-text-muted">Record assertion run</div>
                </div>
              </button>
              <button id="global-act-release" class="w-full flex items-center gap-2.5 px-2.5 py-2 text-left rounded-lg hover:bg-surface-panel text-text-primary text-body-sm transition-colors cursor-pointer">
                <span class="material-symbols-outlined text-[18px] text-status-release">rocket_launch</span>
                <div>
                  <div class="font-medium leading-tight">Release Milestone</div>
                  <div class="text-[11px] text-text-muted">Package SemVer release cut</div>
                </div>
              </button>
              <div class="h-px bg-border-subtle my-1"></div>
              <button id="global-act-ci" class="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left rounded-lg hover:bg-surface-panel text-text-primary text-body-sm transition-colors cursor-pointer">
                <span class="material-symbols-outlined text-[18px] text-primary">terminal</span>
                <span class="text-[12px] font-medium">Run CI Validation</span>
              </button>
              <button id="global-act-project" class="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left rounded-lg hover:bg-surface-panel text-text-primary text-body-sm transition-colors cursor-pointer">
                <span class="material-symbols-outlined text-[18px] text-text-muted">add_box</span>
                <span class="text-[12px] font-medium">New Project Workspace</span>
              </button>
            </div>
          </div>

          <!-- Quick Search Button (Ctrl+K) -->
          <button id="quick-search-btn" class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-muted hover:text-text-primary border border-border-subtle transition-all">
            <span class="material-symbols-outlined text-[16px]">search</span>
            <span class="text-body-sm font-inter hidden sm:inline">Quick Search...</span>
            <kbd class="font-jetbrains text-[10px] bg-surface-base px-1.5 py-0.5 rounded text-text-secondary border border-border-subtle">Ctrl+K</kbd>
          </button>

          <!-- Light / Dark Theme -->
          <button id="theme-toggle-btn" class="flex items-center justify-center w-9 h-9 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-muted hover:text-text-primary border border-border-subtle transition-all cursor-pointer" title="${themeToggleState().label}" aria-label="${themeToggleState().label}">
            <span class="material-symbols-outlined text-[20px]">${themeToggleState().icon}</span>
          </button>

          
          <!-- Live Team Collab Stream Activity Button -->
          <div class="relative" id="team-stream-dropdown-wrapper">
            <button id="team-stream-btn" class="relative flex items-center justify-center w-9 h-9 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-muted hover:text-text-primary border border-border-subtle transition-all cursor-pointer" title="Live Team Activity Stream">
              <span class="material-symbols-outlined text-[20px] text-secondary">bolt</span>
              <span id="team-stream-badge" class="hidden absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-secondary animate-ping"></span>
            </button>
            <div id="team-stream-menu" class="absolute right-0 top-full mt-1.5 w-80 bg-surface-canvas border border-border-strong rounded-xl p-3 shadow-2xl hidden z-[100] animate-scale-in">
              <div class="flex items-center justify-between border-b border-border-subtle pb-2 mb-2">
                <div class="flex items-center gap-1.5 font-geist font-bold text-body-sm text-text-primary">
                  <span class="material-symbols-outlined text-[16px] text-secondary">bolt</span>
                  <span>Live Team Stream</span>
                </div>
                <span id="team-stream-count" class="text-[10px] font-jetbrains text-text-muted">Real-time sync</span>
              </div>
              <div id="team-stream-items" class="space-y-2 max-h-72 overflow-y-auto pr-1">
                <div class="text-[11px] font-jetbrains text-text-muted text-center py-4">No recent team activities. Move tasks or file defects to broadcast live!</div>
              </div>
            </div>
          </div>

          <!-- User Manual -->
          <a href="#/help" id="help-manual-btn" class="flex items-center gap-1.5 h-9 px-2.5 rounded-lg border transition-all ${activeNav === 'help' ? 'bg-primary/15 text-primary border-primary/40' : 'bg-surface-panel hover:bg-surface-elevated text-text-muted hover:text-text-primary border-border-subtle'}" title="User Manual">
            <span class="material-symbols-outlined text-[20px]">menu_book</span>
            <span class="text-body-sm font-inter hidden lg:inline">Help</span>
          </a>

          <!-- Central In-App Invitations Inbox Button -->
          <button id="inbox-invitations-btn" class="relative flex items-center justify-center w-9 h-9 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-muted hover:text-text-primary border border-border-subtle transition-all cursor-pointer" title="Project Invitations Inbox">
            ${inboxBadgeHtml(pendingInvsCount)}
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
              <button id="menu-profile-btn" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-body-sm text-text-secondary hover:bg-surface-panel hover:text-text-primary transition-colors text-left cursor-pointer">
                <span class="material-symbols-outlined text-[16px]">account_circle</span>
                <span>My Profile</span>
              </button>
              <a href="#/projects" class="flex items-center gap-2 px-3 py-2 rounded-lg text-body-sm text-text-secondary hover:bg-surface-panel hover:text-text-primary transition-colors">
                <span class="material-symbols-outlined text-[16px]">workspaces</span>
                <span>Switch Project</span>
              </a>
              <a href="#/team" class="flex items-center gap-2 px-3 py-2 rounded-lg text-body-sm text-text-secondary hover:bg-surface-panel hover:text-text-primary transition-colors">
                <span class="material-symbols-outlined text-[16px]">manage_accounts</span>
                <span>Team & Roles</span>
              </a>
              <a href="#/help" class="flex items-center gap-2 px-3 py-2 rounded-lg text-body-sm text-text-secondary hover:bg-surface-panel hover:text-text-primary transition-colors">
                <span class="material-symbols-outlined text-[16px]">menu_book</span>
                <span>User Manual</span>
              </a>
              <button id="menu-inbox-btn" class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-body-sm text-text-secondary hover:bg-surface-panel hover:text-text-primary transition-colors text-left cursor-pointer">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-[16px]">mail</span>
                  <span>Invitations Inbox</span>
                </div>
                <span id="menu-inbox-count">${menuInboxCountHtml(pendingInvsCount)}</span>
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

      <!-- Global Floating Action Button (FAB) Speed-Dial -->
      <div id="global-fab-container" class="fixed bottom-6 right-6 z-40 flex flex-col-reverse items-end gap-2.5">
        <button id="global-fab-main-btn" class="w-13 h-13 rounded-full bg-primary text-on-primary shadow-xl shadow-primary/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer group" title="Quick Actions">
          <span id="global-fab-icon" class="material-symbols-outlined text-[26px] transition-transform duration-300">add</span>
        </button>
        <div id="global-fab-speed-dial" class="hidden flex flex-col items-end gap-2 animate-scale-in">
          <button id="fab-act-req" class="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-canvas border border-border-strong text-text-primary text-body-sm shadow-lg hover:border-primary transition-all cursor-pointer">
            <span class="font-medium">Requirement</span>
            <span class="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center material-symbols-outlined text-[15px]">rule</span>
          </button>
          <button id="fab-act-task" class="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-canvas border border-border-strong text-text-primary text-body-sm shadow-lg hover:border-secondary transition-all cursor-pointer">
            <span class="font-medium">Sprint Task</span>
            <span class="w-7 h-7 rounded-full bg-secondary/20 text-secondary flex items-center justify-center material-symbols-outlined text-[15px]">assignment</span>
          </button>
          <button id="fab-act-defect" class="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-canvas border border-border-strong text-text-primary text-body-sm shadow-lg hover:border-status-defect transition-all cursor-pointer">
            <span class="font-medium">Log Defect</span>
            <span class="w-7 h-7 rounded-full bg-status-defect-surface text-status-defect flex items-center justify-center material-symbols-outlined text-[15px]">pest_control</span>
          </button>
          <button id="fab-act-test" class="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-canvas border border-border-strong text-text-primary text-body-sm shadow-lg hover:border-status-passed transition-all cursor-pointer">
            <span class="font-medium">Test Run</span>
            <span class="w-7 h-7 rounded-full bg-status-passed-surface text-status-passed flex items-center justify-center material-symbols-outlined text-[15px]">play_circle</span>
          </button>
        </div>
      </div>
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

  // Theme toggle: switches instantly; only the button itself needs updating.
  
  // Team Collab Stream Dropdown toggle
  const teamStreamBtn = document.getElementById('team-stream-btn');
  const teamStreamMenu = document.getElementById('team-stream-menu');
  teamStreamBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    teamStreamMenu?.classList.toggle('hidden');
    refreshTeamStream();
  });
  document.addEventListener('click', () => {
    teamStreamMenu?.classList.add('hidden');
  });
  refreshPresencePill();
  refreshTeamStream();

  document.getElementById('theme-toggle-btn')?.addEventListener('click', (e) => {
    const { icon, label } = themeToggleState(toggleTheme());
    const btn = e.currentTarget;
    btn.title = label;
    btn.setAttribute('aria-label', label);
    btn.querySelector('span').textContent = icon;
  });

  // My Profile: the signed-in user's profile in the active project
  document.getElementById('menu-profile-btn')?.addEventListener('click', () => {
    const me = activeProject.id && store.getMyMembership(activeProject.id);
    if (me) openMemberProfile(activeProject.id, me.id);
    else showToast('Join or create a project to see your profile.', 'info');
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


  // Global Action Menu (Top Dropdown & FAB Speed-dial)
  const activeProjId = activeProject.id;
  const createBtn = document.getElementById('global-create-btn');
  const createMenu = document.getElementById('global-create-menu');
  createBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    createMenu?.classList.toggle('hidden');
  });

  const fabBtn = document.getElementById('global-fab-main-btn');
  const fabMenu = document.getElementById('global-fab-speed-dial');
  const fabIcon = document.getElementById('global-fab-icon');
  fabBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isClosed = fabMenu?.classList.contains('hidden');
    if (isClosed) {
      fabMenu?.classList.remove('hidden');
      if (fabIcon) fabIcon.style.transform = 'rotate(45deg)';
    } else {
      fabMenu?.classList.add('hidden');
      if (fabIcon) fabIcon.style.transform = 'rotate(0deg)';
    }
  });

  document.addEventListener('click', () => {
    createMenu?.classList.add('hidden');
    fabMenu?.classList.add('hidden');
    if (fabIcon) fabIcon.style.transform = 'rotate(0deg)';
  });

  const triggerNewReq = () => {
    createMenu?.classList.add('hidden');
    fabMenu?.classList.add('hidden');
    if (activeProjId) openNewRequirementModal(activeProjId);
    else showToast('Select or create a project first.', 'info');
  };
  const triggerNewTask = () => {
    createMenu?.classList.add('hidden');
    fabMenu?.classList.add('hidden');
    if (activeProjId) openTaskModal(activeProjId, null, () => route());
    else showToast('Select or create a project first.', 'info');
  };
  const triggerLogDefect = () => {
    createMenu?.classList.add('hidden');
    fabMenu?.classList.add('hidden');
    if (activeProjId) openNewDefectModal(activeProjId);
    else showToast('Select or create a project first.', 'info');
  };
  const triggerTestRun = () => {
    createMenu?.classList.add('hidden');
    fabMenu?.classList.add('hidden');
    if (activeProjId) openNewTestRunModal(activeProjId);
    else showToast('Select or create a project first.', 'info');
  };
  const triggerRelease = () => {
    createMenu?.classList.add('hidden');
    fabMenu?.classList.add('hidden');
    if (activeProjId) openReleaseModal(activeProjId, () => route());
    else showToast('Select or create a project first.', 'info');
  };

  document.getElementById('global-act-req')?.addEventListener('click', triggerNewReq);
  document.getElementById('fab-act-req')?.addEventListener('click', triggerNewReq);

  document.getElementById('global-act-task')?.addEventListener('click', triggerNewTask);
  document.getElementById('fab-act-task')?.addEventListener('click', triggerNewTask);

  document.getElementById('global-act-defect')?.addEventListener('click', triggerLogDefect);
  document.getElementById('fab-act-defect')?.addEventListener('click', triggerLogDefect);

  document.getElementById('global-act-test')?.addEventListener('click', triggerTestRun);
  document.getElementById('fab-act-test')?.addEventListener('click', triggerTestRun);

  document.getElementById('global-act-release')?.addEventListener('click', triggerRelease);

  document.getElementById('global-act-ci')?.addEventListener('click', () => {
    createMenu?.classList.add('hidden');
    window.location.hash = '#/ci-cd';
  });

  document.getElementById('global-act-project')?.addEventListener('click', () => {
    createMenu?.classList.add('hidden');
    openCreateProjectModal(() => renderShell(contentRenderer));
  });

  // Mobile Hamburger Toggle & Backdrop handlers
  document.getElementById('mobile-hamburger-btn')?.addEventListener('click', toggleMobileDrawer);
  document.getElementById('mobile-sidebar-backdrop')?.addEventListener('click', closeMobileDrawer);

  // Close mobile drawer on resize if expanding to desktop
  window.addEventListener('resize', applySidebarState);

  // Explicit sidebar navigation click handler
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => { closeMobileDrawer(); });
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
  applySidebarState();
}

function inboxBadgeHtml(count) {
  return `
    <span class="material-symbols-outlined text-[20px] ${count > 0 ? 'text-primary' : ''}">mail</span>
    ${count > 0 ? `
      <span class="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-primary text-[10px] font-jetbrains font-bold text-on-primary animate-pulse shadow-sm shadow-primary/50">
        ${count}
      </span>
    ` : ''}`;
}

function menuInboxCountHtml(count) {
  return count > 0 ? `<span class="px-1.5 py-0.2 rounded-full bg-primary/20 text-primary text-[10px] font-jetbrains font-bold">${count}</span>` : '';
}

// Keep the inbox badge current without re-rendering the page underneath.
function refreshInboxBadge() {
  const user = store.currentUser;
  const btn = document.getElementById('inbox-invitations-btn');
  if (!user || !btn) return;
  const count = store.getPendingInvitationsCount(user.email);
  btn.innerHTML = inboxBadgeHtml(count);
  const menuCount = document.getElementById('menu-inbox-count');
  if (menuCount) menuCount.innerHTML = menuInboxCountHtml(count);
}

store.subscribe(refreshInboxBadge);

// Real-Time Team Presence & Activity Stream Handlers
function refreshPresencePill() {
  const container = document.getElementById('team-presence-avatars');
  const label = document.getElementById('team-presence-text');
  if (!container || !label) return;
  const online = teamCollab.getOnlineMembers();
  label.textContent = online.length === 1 ? '1 Online' : `${online.length} Online`;
  container.innerHTML = online.map(m => `
    <div class="w-5 h-5 rounded-full ring-2 ring-surface-canvas flex items-center justify-center text-[9px] font-bold font-jetbrains text-white ${m.isMe ? 'bg-primary' : 'bg-secondary'}" title="${m.name} (${m.isMe ? 'You' : 'Active'})">
      ${m.name.charAt(0).toUpperCase()}
    </div>
  `).join('');
}

function refreshTeamStream() {
  const listEl = document.getElementById('team-stream-items');
  const countEl = document.getElementById('team-stream-count');
  const badge = document.getElementById('team-stream-badge');
  if (!listEl) return;
  const activities = teamCollab.getRecentActivities();
  if (countEl) countEl.textContent = `${activities.length} recent`;
  if (badge && activities.length > 0) {
    badge.classList.remove('hidden');
    setTimeout(() => badge.classList.add('hidden'), 3000);
  }
  if (activities.length === 0) {
    listEl.innerHTML = `<div class="text-[11px] font-jetbrains text-text-muted text-center py-4">No recent team activities. Move tasks or file defects to broadcast live!</div>`;
    return;
  }
  listEl.innerHTML = activities.map(a => `
    <div class="p-2 rounded-lg bg-surface-base hover:bg-surface-panel/70 transition-colors border border-border-subtle/50 text-[11px] font-jetbrains">
      <div class="flex items-center justify-between text-text-muted mb-0.5">
        <span class="font-bold text-text-primary">${a.user.name}</span>
        <span>${new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div class="text-text-secondary leading-tight">${a.title}</div>
      <div class="text-[10px] text-text-muted mt-0.5 truncate">${a.details}</div>
    </div>
  `).join('');
}

teamCollab.onPresenceChange(refreshPresencePill);
teamCollab.onActivity(() => {
  refreshTeamStream();
});

window.addEventListener('devtrack:team-action', () => {
  // Re-route gently if on board or bugs to reflect changes without full reload
  const hash = window.location.hash || '';
  if (hash.startsWith('#/sprints') || hash.startsWith('#/board') || hash.startsWith('#/bugs')) {
    route();
  }
});


function syncInvitationsForCurrentUser() {
  const user = store.currentUser;
  if (!user) {
    stopInvitationSync();
    return;
  }
  startInvitationSync(user, {
    onNewInvitations: (invitations) => {
      if (invitations.length > 2) {
        showToast(`You have ${invitations.length} new project invitations. Open your inbox to respond.`, 'info');
        return;
      }
      invitations.forEach(inv => {
        showToast(`New project invitation: You have been invited to join ${inv.projectName} as ${inv.role}.`, 'info');
      });
    },
    onInvitationResponse: (inv) => {
      showToast(`${inv.inviteeName || inv.inviteeEmail} ${inv.status.toLowerCase()} your invitation to ${inv.projectName}.`, inv.status === 'Accepted' ? 'success' : 'info');
      if (inv.status === 'Accepted' && window.location.hash.startsWith('#/team')) route();
    },
    onError: (err) => {
      console.warn('[Invitations] Real-time sync error:', err);
      // Warn once per outage; the session keeps retrying in the background.
      if (invitationSyncDown) return;
      invitationSyncDown = true;
      showToast(`Live invitations unavailable: ${describeDirectoryError(err)} Retrying automatically.`, 'warning');
    },
    onConnected: () => {
      if (!invitationSyncDown) return;
      invitationSyncDown = false;
      showToast('Live invitations reconnected.', 'success');
    }
  });
}

let invitationSyncDown = false;

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
      btn.disabled = true;
      const res = await respondToInvitation(invId, 'accept');
      btn.disabled = false;
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        sessionStorage.removeItem('pending_invite_token');
        closeModal();
        showToast(`Welcome! You have joined ${btn.dataset.name} as ${btn.dataset.role}.`, 'success');
        window.location.hash = '#/dashboard';
        if (onChanged) onChanged();
      }
    });
  });

  document.querySelectorAll('.inbox-decline-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const invId = btn.dataset.id;
      showConfirm(`Decline invitation to join "${escapeHtml(btn.dataset.name)}"?`, async () => {
        const res = await respondToInvitation(invId, 'decline');
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


let isSidebarCollapsed = typeof localStorage !== 'undefined' && localStorage.getItem('devtrack_sidebar_collapsed') === 'true';

export function toggleSidebarCollapsed() {
  isSidebarCollapsed = !isSidebarCollapsed;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('devtrack_sidebar_collapsed', String(isSidebarCollapsed));
  }
  applySidebarState();
  showToast(isSidebarCollapsed ? 'Sidebar collapsed (press [ / ] to expand)' : 'Sidebar expanded', 'info');
}

let isMobileDrawerOpen = false;

export function toggleMobileDrawer() {
  isMobileDrawerOpen = !isMobileDrawerOpen;
  applySidebarState();
}

export function closeMobileDrawer() {
  if (isMobileDrawerOpen) {
    isMobileDrawerOpen = false;
    applySidebarState();
  }
}

export function applySidebarState() {
  const sidebar = document.getElementById('app-sidebar');
  const contentShell = document.getElementById('content-shell');
  const topHeader = document.getElementById('top-header');
  const backdrop = document.getElementById('mobile-sidebar-backdrop');

  if (!sidebar || !contentShell || !topHeader) return;

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  if (isMobile) {
    if (isMobileDrawerOpen) {
      sidebar.classList.remove('-translate-x-full');
      sidebar.classList.add('translate-x-0');
      backdrop?.classList.remove('hidden');
    } else {
      sidebar.classList.add('-translate-x-full');
      sidebar.classList.remove('translate-x-0');
      backdrop?.classList.add('hidden');
    }
    contentShell.classList.remove('pl-64');
    contentShell.classList.add('pl-0');
    topHeader.classList.remove('left-64');
    topHeader.classList.add('left-0');
  } else {
    // Desktop layout
    backdrop?.classList.add('hidden');
    if (isSidebarCollapsed) {
      sidebar.classList.add('-translate-x-full');
      sidebar.classList.remove('translate-x-0');
      contentShell.classList.remove('pl-64');
      contentShell.classList.add('pl-0');
      topHeader.classList.remove('left-64');
      topHeader.classList.add('left-0');
    } else {
      sidebar.classList.remove('-translate-x-full');
      sidebar.classList.add('translate-x-0');
      contentShell.classList.remove('pl-0');
      contentShell.classList.add('pl-64');
      topHeader.classList.remove('left-0');
      topHeader.classList.add('left-64');
    }
  }
}

/**
 * Guided Onboarding Tour Spotlight & Target Element Highlighting
 */
export function applyTourHighlight(step) {
  document.getElementById('tour-guide-banner')?.remove();
  document.querySelectorAll('.tour-highlight-active').forEach(el => {
    el.classList.remove('tour-highlight-active', 'ring-4', 'ring-primary', 'ring-offset-4', 'ring-offset-surface-canvas', 'animate-pulse');
  });

  let targetSelector = '';
  let stepTitle = '';
  if (step === '1') {
    targetSelector = '#add-member-btn';
    stepTitle = 'Step 1: Invite a colleague to establish your project roster';
  } else if (step === '2') {
    targetSelector = '#add-req-btn';
    stepTitle = 'Step 2: Define your first MoSCoW requirement specification';
  } else if (step === '3') {
    targetSelector = '#add-task-btn';
    stepTitle = 'Step 3: Create an agile task for the active sprint';
  } else if (step === '4') {
    targetSelector = '#add-test-btn';
    stepTitle = 'Step 4: Author a QA test case to verify specifications';
  } else if (step === '5') {
    targetSelector = '#trigger-ci-btn';
    stepTitle = 'Step 5: Trigger CI/CD validation to simulate staging build';
  } else if (step === '6') {
    targetSelector = '#add-release-btn, #export-pdf-btn';
    stepTitle = 'Step 6: Inspect audit gate and cut release milestone';
  }

  const targetEl = document.querySelector(targetSelector);
  if (targetEl) {
    targetEl.classList.add('tour-highlight-active', 'ring-4', 'ring-primary', 'ring-offset-4', 'ring-offset-surface-canvas', 'animate-pulse');
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const banner = document.createElement('div');
    banner.id = 'tour-guide-banner';
    banner.className = 'fixed top-18 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-xl bg-primary text-on-primary font-jetbrains text-[12px] font-bold shadow-2xl flex items-center gap-2.5 animate-bounce border border-primary-fixed';
    banner.innerHTML = `
      <span class="material-symbols-outlined text-[18px]">assistant_navigation</span>
      <span>${stepTitle}</span>
      <button id="dismiss-tour-btn" class="ml-2 hover:bg-black/20 p-1 rounded transition-colors cursor-pointer" title="Dismiss Guide">✕</button>
    `;
    document.body.appendChild(banner);

    const dismiss = () => {
      banner.remove();
      targetEl.classList.remove('tour-highlight-active', 'ring-4', 'ring-primary', 'ring-offset-4', 'ring-offset-surface-canvas', 'animate-pulse');
    };

    banner.querySelector('#dismiss-tour-btn')?.addEventListener('click', dismiss);
    targetEl.addEventListener('click', dismiss, { once: true });
    setTimeout(dismiss, 12000);
  }
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
  syncInvitationsForCurrentUser();
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
      if (isTour && tourStep) {
        setTimeout(() => applyTourHighlight(tourStep), 150);
      }
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
