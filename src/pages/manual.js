// DevTrack Client User Manual — illustrated, searchable, printable.
// Rules shown here (roles, workflows, messages) are read from rules.js so the
// manual always matches what the app enforces.
import { showModal, escapeHtml } from '../ui.js';
import {
  ROLES, PERMISSIONS, TASK_TRANSITIONS, BUG_TRANSITIONS, MOSCOW_PRIORITIES, REQUIREMENT_STATUSES,
  TEST_TYPES, TEST_RESULTS, RELEASE_STATUSES, UNREGISTERED_USER_MESSAGE, ALREADY_MEMBER_MESSAGE,
  PENDING_INVITATION_MESSAGE, INVITE_FORBIDDEN_MESSAGE
} from '../rules.js';

const IMG = (name) => `/manual/${name}.webp`;

const PERMISSION_LABELS = {
  'project.update': 'Edit project settings',
  'team.manage': 'Invite, remove & change roles of members',
  'requirement.write': 'Create & edit requirements',
  'sprint.write': 'Create sprints',
  'task.write': 'Create & move tasks on the board',
  'testcase.write': 'Write test cases',
  'testrun.create': 'Record test runs',
  'bug.create': 'Log defects',
  'bug.update': 'Work on defects (In Progress, Fixed)',
  'bug.verify': 'Verify & close defects',
  'release.write': 'Create & ship releases',
  'data.reset': 'Reset workspace data'
};

function list(items) {
  return `<ul class="list-disc pl-5 space-y-1.5">${items.map(i => `<li>${i}</li>`).join('')}</ul>`;
}

function steps(items) {
  return `<ol class="space-y-2">${items.map((s, i) => `
    <li class="flex gap-3">
      <span class="shrink-0 w-6 h-6 rounded-full bg-primary/15 text-primary font-jetbrains text-[11px] font-bold flex items-center justify-center">${i + 1}</span>
      <span class="pt-0.5">${s}</span>
    </li>`).join('')}</ol>`;
}

function chips(values) {
  return values.map(v => `<span class="inline-block px-2 py-0.5 mr-1 mb-1 rounded bg-surface-panel border border-border-subtle font-jetbrains text-[11px] text-text-primary">${escapeHtml(v)}</span>`).join('');
}

function note(text, tone = 'info') {
  const tones = {
    info: 'border-secondary/30 bg-secondary/10 text-text-secondary',
    warn: 'border-status-in-progress/30 bg-status-in-progress-surface text-text-secondary'
  };
  return `<div class="mt-3 p-3 rounded-lg border ${tones[tone]} text-body-sm flex gap-2">
    <span class="material-symbols-outlined text-[18px] shrink-0">${tone === 'warn' ? 'warning' : 'lightbulb'}</span><span>${text}</span></div>`;
}

function flowTable(transitions) {
  return `<table class="w-full text-body-sm mt-2 border border-border-subtle rounded-lg overflow-hidden">
    <thead class="bg-surface-panel text-text-muted font-jetbrains text-[11px] uppercase"><tr><th class="text-left px-3 py-2">From</th><th class="text-left px-3 py-2">Can move to</th></tr></thead>
    <tbody>${Object.entries(transitions).map(([from, to]) => `
      <tr class="border-t border-border-subtle"><td class="px-3 py-2 font-medium text-text-primary">${from}</td><td class="px-3 py-2">${chips(to)}</td></tr>`).join('')}
    </tbody></table>`;
}

function roleTable() {
  const mark = (ok) => ok
    ? '<span class="material-symbols-outlined text-status-passed text-[18px]">check_circle</span>'
    : '<span class="material-symbols-outlined text-text-muted text-[18px] opacity-40">remove</span>';
  return `<div class="overflow-x-auto"><table class="w-full text-body-sm mt-2 border border-border-subtle rounded-lg overflow-hidden">
    <thead class="bg-surface-panel text-text-muted font-jetbrains text-[11px] uppercase">
      <tr><th class="text-left px-3 py-2">Action</th>${ROLES.map(r => `<th class="px-3 py-2">${r}</th>`).join('')}</tr>
    </thead>
    <tbody>
      <tr class="border-t border-border-subtle"><td class="px-3 py-2">View dashboard, board, matrix & audit trail</td>${ROLES.map(() => `<td class="text-center">${mark(true)}</td>`).join('')}</tr>
      ${Object.keys(PERMISSIONS).map(action => `
        <tr class="border-t border-border-subtle"><td class="px-3 py-2">${PERMISSION_LABELS[action] || action}</td>
        ${ROLES.map(r => `<td class="text-center">${mark(PERMISSIONS[action].includes(r))}</td>`).join('')}</tr>`).join('')}
    </tbody></table></div>`;
}

const SECTIONS = [
  {
    id: 'sign-in', icon: 'login', title: 'Signing in & creating an account',
    body: () => `
      <p>Everyone needs their own DevTrack account. A teammate can only be invited to a project <strong>after</strong> they have created one.</p>
      ${steps([
        'Open DevTrack. Choose <strong>Continue with Google</strong>, or enter your email and password and select <strong>Sign In</strong>.',
        'New here? Select <strong>Create Account</strong>, enter your name, email and a password of at least 6 characters.',
        'Forgot your password? Use the <strong>Forgot password?</strong> link on the sign-in screen and follow the email we send you.',
        'You stay signed in on this browser until you choose <strong>Sign Out</strong> from your profile menu (top right).'
      ])}`,
    images: [
      { name: 'login', caption: 'The sign-in screen. Google sign-in or email and password.' },
      { name: 'register', caption: 'Creating a new DevTrack account.' }
    ]
  },
  {
    id: 'tour', icon: 'explore', title: 'Finding your way around',
    body: () => `
      <p>The <strong>left sidebar</strong> holds every module, grouped by lifecycle stage. The <strong>project switcher</strong> at the top of the sidebar changes which project you are working in.</p>
      <p class="mt-2">The <strong>top-right corner</strong> of every screen has:</p>
      ${list([
        '<strong>Quick Search</strong> (or press <kbd class="font-jetbrains text-[11px] px-1 rounded bg-surface-panel border border-border-subtle">Ctrl</kbd> + <kbd class="font-jetbrains text-[11px] px-1 rounded bg-surface-panel border border-border-subtle">K</kbd>): find any requirement, task, test or defect.',
        '<strong>Theme</strong> (<span class="material-symbols-outlined text-[15px] align-middle">light_mode</span> / <span class="material-symbols-outlined text-[15px] align-middle">dark_mode</span>): switches between the dark and light theme. Your choice is remembered on this browser.',
        '<strong>Help</strong> (<span class="material-symbols-outlined text-[15px] align-middle">menu_book</span>): opens this manual.',
        '<strong>Invitations inbox</strong> (<span class="material-symbols-outlined text-[15px] align-middle">mail</span>): the number badge shows invitations waiting for your answer.',
        '<strong>Your profile</strong>: shows your role in the current project, and lets you switch project or sign out.'
      ])}`,
    images: [
      { name: 'header', caption: 'Top-right controls: Quick Search, theme toggle, Help, Invitations inbox and your profile.' },
      { name: 'dashboard', caption: 'The Dashboard summarises requirements, sprint progress, test results, defects and releases.' },
      { name: 'dashboard-light', caption: 'The same Dashboard in the light theme.' }
    ]
  },
  {
    id: 'projects', icon: 'folder_data', title: 'Projects',
    body: () => `
      ${steps([
        'Open <strong>Projects Directory</strong> from the sidebar to see every project you belong to.',
        'Select <strong>New Project</strong>. Enter a <strong>Project Name</strong>, a short <strong>Key Identifier</strong> (2–10 letters or digits, e.g. <code>ORION</code>) and a description.',
        'Select <strong>Create Project</strong>. You become its <strong>Owner</strong> and it becomes your active project.',
        'Switch projects at any time from the sidebar switcher or the profile menu.'
      ])}
      ${note('Project keys are unique. If a key is already taken, choose another.')}`,
    images: [
      { name: 'projects', caption: 'Projects Directory: every project you are a member of.' },
      { name: 'create-project', caption: 'Creating a new project.' }
    ]
  },
  {
    id: 'roles', icon: 'manage_accounts', title: 'Team & roles',
    body: () => `
      <p>Each person has one role per project. What each role can do:</p>
      ${roleTable()}
      ${note('Owners can change a member\'s role or remove them from the <strong>Team & Roles</strong> page. A project always keeps at least one Owner.')}
      <p class="mt-4"><strong>Member profiles.</strong> Select a member's name or <strong>Profile</strong> to see their role, when they joined, their open tasks and story points, defects assigned to them, test runs they recorded, and their recent activity in the project. Every member of the project can view profiles. Open your own from <strong>My Profile</strong> in the profile menu (top right).</p>`,
    images: [
      { name: 'team', caption: 'Team & Roles: current members, their roles and pending invitations.' },
      { name: 'member-profile', caption: 'A member profile: workload, assigned defects and recent activity.' }
    ]
  },
  {
    id: 'inviting', icon: 'person_add', title: 'Inviting teammates',
    body: () => `
      ${steps([
        'Ask your teammate to <strong>create a DevTrack account first</strong>. Invitations can only be sent to registered accounts.',
        'Go to <strong>Team & Roles</strong> and select <strong>Invite Member</strong>.',
        'Enter their account email (<strong>Colleague Account Email</strong>) and choose the <strong>Assigned Role</strong>.',
        'Select <strong>Send Invitation</strong>. It appears in their DevTrack inbox straight away, with no link to share.',
        'Until they respond, it is listed under <strong>Pending Invitations</strong>, where you can revoke it. Invitations expire after 7 days.'
      ])}
      <p class="mt-3">If the invitation can't be sent, you will see one of these messages:</p>
      ${list([
        `<em>"${UNREGISTERED_USER_MESSAGE}"</em>`,
        `<em>"${ALREADY_MEMBER_MESSAGE}"</em>`,
        `<em>"${PENDING_INVITATION_MESSAGE}"</em>`,
        `<em>"${INVITE_FORBIDDEN_MESSAGE}"</em>`
      ])}`,
    images: [
      { name: 'invite-member', caption: 'Inviting a registered teammate and choosing their role.' },
      { name: 'invite-unregistered', caption: 'An email without a DevTrack account is rejected. No invitation is created.' }
    ]
  },
  {
    id: 'inbox', icon: 'mail', title: 'Accepting or declining an invitation',
    body: () => `
      ${steps([
        'When someone invites you, a notification appears and the <strong>mail icon</strong> at the top right shows a number.',
        'Select the mail icon to open your <strong>Invitations Inbox</strong>. Each invitation shows the project, who invited you and your role.',
        'Select <strong>Accept</strong> to join. The project becomes your active project and you can start working immediately.',
        'Select <strong>Decline</strong> if you do not want to join. Nothing is added to the project.'
      ])}
      ${note('You must be signed in with the same email the invitation was sent to. If you were sent a link instead, opening it shows the same Accept / Decline screen.')}`,
    images: [
      { name: 'inbox', caption: 'The Invitations Inbox with a pending invitation.' },
      { name: 'invite-accept', caption: 'An invitation opened from a link: review the role, then Accept or Decline.' }
    ]
  },
  {
    id: 'requirements', icon: 'rule', title: 'Requirements (MoSCoW)',
    body: () => `
      ${steps([
        'Open <strong>Requirements / MoSCoW</strong> and select <strong>New Requirement</strong>.',
        'Enter a <strong>Title</strong>, <strong>Description</strong> and testable <strong>Acceptance Criteria</strong> (for example "Given… When… Then…").',
        'Choose a <strong>MoSCoW Priority</strong> and, optionally, the <strong>Target Release</strong> it ships in.',
        'Every change is recorded. Select <strong>View Diff</strong> or <strong>Audit Revisions</strong> on a requirement to see who changed what, and when.',
        'Use <strong>Edit Status</strong> to move a requirement forward as work progresses.'
      ])}
      <p class="mt-3"><strong>Priorities:</strong> ${chips(MOSCOW_PRIORITIES)}</p>
      <p><strong>Statuses:</strong> ${chips(REQUIREMENT_STATUSES)}</p>`,
    images: [{ name: 'requirements', caption: 'Requirements with priority, status and linked work.' }]
  },
  {
    id: 'sprints', icon: 'view_kanban', title: 'Sprints & the task board',
    body: () => `
      ${steps([
        'Open <strong>Sprints & Tasks Board</strong>. Select <strong>New Sprint</strong> and give it a name, goal, start and end date. The end date must be after the start date.',
        'A project has one <strong>Active</strong> sprint at a time; additional sprints are created as <strong>Planned</strong>.',
        'Select <strong>Add Task</strong>, link it to a requirement, assign it and estimate it in story points.',
        'Move a task by changing the status selector on its card.'
      ])}
      <p class="mt-3">Tasks follow the board in order; you can move one step forward or one step back:</p>
      ${flowTable(TASK_TRANSITIONS)}`,
    images: [{ name: 'sprints', caption: 'The sprint board for the active sprint.' }]
  },
  {
    id: 'testing', icon: 'verified', title: 'Test cases & test runs',
    body: () => `
      ${steps([
        'Open <strong>Test Runs & QA</strong> and select <strong>New Test Case</strong>. Link it to a requirement, choose the type and write the steps and expected result.',
        'Select <strong>Execute Test Run</strong>, pick the test case and record the outcome with notes.',
        'Runs are permanent records and can\'t be edited. Run the test again to record a new result.',
        'For a <strong>Failed</strong> run, select <strong>Log Linked Bug</strong> to file a defect that is already linked to the run and requirement.'
      ])}
      <p class="mt-3"><strong>Test types:</strong> ${chips(TEST_TYPES)}</p>
      <p><strong>Outcomes:</strong> ${chips(TEST_RESULTS)}</p>`,
    images: [
      { name: 'tests', caption: 'Test cases linked to requirements.' },
      { name: 'test-runs', caption: 'Execution history. Failed runs can be turned into a linked defect.' }
    ]
  },
  {
    id: 'defects', icon: 'pest_control', title: 'Defects (bugs)',
    body: () => `
      ${steps([
        'Open <strong>Bug Tracker</strong> and select <strong>Log Defect</strong>, or log it directly from a failed test run.',
        'Choose a <strong>Severity</strong> (Critical, High, Medium, Low), describe the steps to reproduce and assign who should fix it.',
        'Developers move the defect to <strong>In Progress</strong> and then <strong>Fixed</strong>.',
        'A Tester or Owner confirms the fix by moving it to <strong>Verified</strong>, and then <strong>Closed</strong>.'
      ])}
      ${flowTable(BUG_TRANSITIONS)}`,
    images: [{ name: 'bugs', caption: 'The Bug Tracker, filterable by severity and status.' }]
  },
  {
    id: 'releases', icon: 'account_tree', title: 'Releases & traceability',
    body: () => `
      ${steps([
        'Open <strong>Releases & Traceability</strong> and select <strong>Cut New Release</strong>. Names start with a version number, e.g. <code>v1.2.0 — Bill Pay</code>.',
        'Promote a release through each stage. Owners approve releases.',
        'A release <strong>cannot be marked Released</strong> while any Critical or High defect in the project is unresolved.',
        'The <strong>traceability matrix</strong> shows each requirement with its tasks, tests, latest results, defects and release. Use <strong>Export Matrix CSV</strong> to share it.'
      ])}
      <p class="mt-3"><strong>Release stages:</strong> ${chips(RELEASE_STATUSES)}</p>`,
    images: [
      { name: 'releases', caption: 'Release gates and their status.' },
      { name: 'traceability', caption: 'The traceability matrix: from each requirement through to its release.' }
    ]
  },
  {
    id: 'search', icon: 'search', title: 'Quick Search',
    body: () => `<p>Press <strong>Ctrl + K</strong> (or select <strong>Quick Search</strong> at the top right) and type at least two characters. Results are grouped by requirements, tasks, defects and test cases. Select a result to jump to it.</p>`,
    images: [{ name: 'search', caption: 'Quick Search across the whole project.' }]
  },
  {
    id: 'settings', icon: 'tune', title: 'Settings & audit trail',
    body: () => `
      ${list([
        'Owners can update the project name, description and end date.',
        '<strong>Export Complete Workspace JSON</strong> downloads a backup of your workspace data.',
        'The audit trail lists sign-ins, membership changes, requirement edits, test runs and releases.',
        '<strong>Reset Data</strong> is limited to Owners and permanently clears the workspace in this browser.'
      ])}
      ${note('Reset cannot be undone. Export a backup first.', 'warn')}`,
    images: [{ name: 'settings', caption: 'Project settings, data export and the audit trail.' }]
  },
  {
    id: 'faq', icon: 'help', title: 'Troubleshooting',
    body: () => `
      <dl class="space-y-3">
        ${[
          ['I invited someone but they say "User not registered"', 'They need to create a DevTrack account with that exact email first, then you can invite them.'],
          ['My teammate cannot see my invitation', 'Check they are signed in with the email you invited. Invitations arrive live; if a "Live invitations unavailable" warning is shown, check the internet connection. DevTrack reconnects automatically.'],
          ['"Invalid Kanban transition"', 'Tasks move one column at a time. See the board rules in <em>Sprints & the task board</em>.'],
          ['I can\'t move a defect to Verified', 'Only Testers and Owners can verify or close defects.'],
          ['"Release gate blocked"', 'Resolve (Fix and Verify, or Close) every open Critical and High defect, then mark the release as Released.'],
          ['Buttons do nothing or show "Forbidden"', 'Your role does not allow that action. See the table in <em>Team & roles</em>, or ask a project Owner.']
        ].map(([q, a]) => `<div><dt class="font-semibold text-text-primary">${q}</dt><dd class="text-text-secondary mt-0.5">${a}</dd></div>`).join('')}
      </dl>`
  }
];

function figure(img) {
  return `
    <figure class="mt-4">
      <button type="button" class="manual-zoom block w-full rounded-xl overflow-hidden border border-border-subtle bg-surface-base hover:border-primary/60 transition-colors cursor-zoom-in" data-src="${IMG(img.name)}" data-caption="${escapeHtml(img.caption)}" title="Click to enlarge">
        <img src="${IMG(img.name)}" alt="${escapeHtml(img.caption)}" loading="lazy" class="w-full h-auto block" />
      </button>
      <figcaption class="mt-1.5 text-[12px] text-text-muted">${img.caption}</figcaption>
    </figure>`;
}

export function renderManual(container) {
  container.innerHTML = `
    <div class="w-full px-6 py-6 manual-page">
      <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <div class="font-jetbrains text-mono-md text-text-muted mb-1">HELP / USER MANUAL</div>
          <h1 class="font-geist text-headline-lg font-bold text-text-primary">DevTrack User Manual</h1>
          <p class="text-body-md text-text-muted mt-1">Step-by-step guidance for every part of DevTrack, with screenshots.</p>
        </div>
        <div class="flex items-center gap-2 no-print">
          <div class="relative">
            <span class="material-symbols-outlined absolute left-2.5 top-2 text-text-muted text-[18px]">search</span>
            <input id="manual-search" type="search" placeholder="Search the manual..."
              class="w-64 bg-surface-base text-text-primary text-body-sm pl-9 pr-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none" />
          </div>
          <button id="manual-print-btn" class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-primary text-body-sm border border-border-subtle">
            <span class="material-symbols-outlined text-[18px]">print</span><span>Print / PDF</span>
          </button>
        </div>
      </div>

      <div class="flex gap-6 items-start">
        <nav id="manual-toc" class="no-print hidden lg:block w-56 shrink-0 sticky top-20 space-y-0.5 font-jetbrains text-[12px]">
          ${SECTIONS.map(s => `
            <button type="button" class="manual-toc-link w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-text-secondary hover:bg-surface-panel hover:text-text-primary" data-target="${s.id}">
              <span class="material-symbols-outlined text-[16px]">${s.icon}</span><span>${s.title}</span>
            </button>`).join('')}
        </nav>

        <div class="flex-1 min-w-0 space-y-5">
          ${SECTIONS.map(s => `
            <section id="manual-${s.id}" class="manual-section p-5 rounded-2xl bg-surface-canvas border border-border-subtle scroll-mt-20">
              <h2 class="flex items-center gap-2 font-geist text-headline-sm font-bold text-text-primary mb-3">
                <span class="material-symbols-outlined text-primary text-[22px]">${s.icon}</span>${s.title}
              </h2>
              <div class="text-body-md text-text-secondary leading-relaxed">${s.body()}</div>
              ${s.images ? `<div class="grid gap-4 ${s.images.length > 1 ? 'xl:grid-cols-2' : ''}">${s.images.map(figure).join('')}</div>` : ''}
            </section>`).join('')}
          <div id="manual-empty" class="hidden p-10 text-center text-text-muted">No help topics match your search.</div>
        </div>
      </div>
    </div>`;

  // In-page navigation must not touch location.hash (the router owns it).
  container.querySelectorAll('.manual-toc-link').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(`manual-${btn.dataset.target}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  container.querySelectorAll('.manual-zoom').forEach(btn => {
    btn.addEventListener('click', () => {
      showModal(`
        <img src="${escapeHtml(btn.dataset.src)}" alt="${escapeHtml(btn.dataset.caption)}" class="w-full h-auto rounded-lg border border-border-subtle" />
        <p class="mt-2 text-[12px] text-text-muted">${escapeHtml(btn.dataset.caption)}</p>`, { title: 'Screenshot', width: 'max-w-6xl' });
    });
  });

  const search = container.querySelector('#manual-search');
  search?.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    let shown = 0;
    container.querySelectorAll('.manual-section').forEach(section => {
      const match = !q || section.textContent.toLowerCase().includes(q);
      section.classList.toggle('hidden', !match);
      if (match) shown++;
    });
    container.querySelector('#manual-empty').classList.toggle('hidden', shown > 0);
  });

  container.querySelector('#manual-print-btn')?.addEventListener('click', () => window.print());
}
