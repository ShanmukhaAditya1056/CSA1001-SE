import fs from 'fs';

const filePath = 'src/pages/manual.js';
let content = fs.readFileSync(filePath, 'utf8');

// Find SECTIONS array in manual.js
const sectionsStart = 'const SECTIONS = [';
const sectionsEnd = '];\r\n\r\nfunction figure(img)';
const altSectionsEnd = '];\n\nfunction figure(img)';

const newSections = `const SECTIONS = [
  {
    id: 'sign-in', icon: 'login', title: 'Signing in & creating an account',
    body: () => \`
      <p>Everyone needs their own DevTrack account. A teammate can only be invited to a project <strong>after</strong> they have created one.</p>
      \${steps([
        'Open DevTrack. Choose <strong>Continue with Google</strong>, or enter your email and password and select <strong>Sign In</strong>.',
        'New here? Select <strong>Create Account</strong>, enter your name, email and a password of at least 6 characters.',
        'Forgot your password? Use the <strong>Forgot password?</strong> link on the sign-in screen and follow the email we send you.',
        'You stay signed in on this browser until you choose <strong>Sign Out</strong> from your profile menu (top right).'
      ])}\`,
    images: [
      { name: 'login', caption: 'The sign-in screen. Google sign-in or email and password.' },
      { name: 'register', caption: 'Creating a new DevTrack account.' }
    ]
  },
  {
    id: 'tour', icon: 'explore', title: 'Finding your way around',
    body: () => \`
      <p>The <strong>left sidebar</strong> holds every module, grouped by lifecycle stage. The <strong>project switcher</strong> at the top of the sidebar changes which project you are working in.</p>
      <p class="mt-2">The <strong>top-right header bar</strong> features:</p>
      \${list([
        '<strong>Live Presence Roster:</strong> Shows the real-time count of connected teammates and an interactive avatar stack.',
        '<strong>Live Activity Stream:</strong> Click the stream icon to open the sliding activity drawer tracking teammate actions.',
        '<strong>Quick Search</strong> (<kbd class="font-jetbrains text-[11px] px-1 rounded bg-surface-panel border border-border-subtle">Ctrl</kbd> + <kbd class="font-jetbrains text-[11px] px-1 rounded bg-surface-panel border border-border-subtle">K</kbd>): search requirements, tasks, test runs, and defects instantly.',
        '<strong>Theme</strong> (<span class="material-symbols-outlined text-[15px] align-middle">light_mode</span> / <span class="material-symbols-outlined text-[15px] align-middle">dark_mode</span>): toggle between dark and light themes.',
        '<strong>Help</strong> (<span class="material-symbols-outlined text-[15px] align-middle">menu_book</span>): opens this user manual.',
        '<strong>Invitations inbox</strong> (<span class="material-symbols-outlined text-[15px] align-middle">mail</span>): badge indicates pending workspace invitations.',
        '<strong>Your profile</strong>: role in the active project, quick project switching, and sign out.'
      ])}\`,
    images: [
      { name: 'header', caption: 'Top-right controls: Quick Search, theme toggle, Help, Invitations inbox and your profile.' },
      { name: 'dashboard', caption: 'The Dashboard summarises requirements, sprint progress, test results, defects and releases.' },
      { name: 'dashboard-light', caption: 'The same Dashboard in the light theme.' }
    ]
  },
  {
    id: 'collab', icon: 'groups', title: 'Live presence & collaboration',
    body: () => \`
      <p>DevTrack features real-time distributed collaboration across tabs and teammates without requiring page refreshes.</p>
      \${list([
        '<strong>Live Presence Roster:</strong> The top navbar displays the real-time count of active teammates online in the project with an interactive avatar stack.',
        '<strong>Team Activity Feed Drawer:</strong> Click the live stream button in the header to slide out the activity drawer, streaming card moves, bug reports, and release promotions.',
        '<strong>Teammate Action Toasts:</strong> Live notification popups alert you when a colleague drops a card into <em>In Review</em> or logs a critical defect.',
        '<strong>Cross-Tab Sync:</strong> The peer bus synchronises data changes across all open browser windows and devices in real time.'
      ])}\`
  },
  {
    id: 'projects', icon: 'folder_data', title: 'Projects',
    body: () => \`
      \${steps([
        'Open <strong>Projects Directory</strong> from the sidebar to see every project you belong to.',
        'Select <strong>New Project</strong>. Enter a <strong>Project Name</strong>, a short <strong>Key Identifier</strong> (2–10 letters or digits, e.g. <code>ORION</code>) and a description.',
        'Select <strong>Create Project</strong>. You become its <strong>Owner</strong> and it becomes your active project.',
        'Switch projects at any time from the sidebar switcher or the profile menu.'
      ])}
      \${note('Project keys are unique. If a key is already taken, choose another.')}\`,
    images: [
      { name: 'projects', caption: 'Projects Directory: every project you are a member of.' },
      { name: 'create-project', caption: 'Creating a new project.' }
    ]
  },
  {
    id: 'roles', icon: 'manage_accounts', title: 'Team, roles & agreements',
    body: () => \`
      <p>Each person has one role per project. What each role can do:</p>
      \${roleTable()}
      \${note('Owners can change a member\\'s role or remove them from the <strong>Team & Roles</strong> page. A project always keeps at least one Owner.')}
      <p class="mt-4"><strong>Team Working Agreements.</strong> Configure sprint duration (1–4 weeks), story point scale (Fibonacci, Linear, T-Shirt), WIP limit enforcement mode (Warning vs Strict), and auto-assignment rules under the <strong>Team Working Agreements</strong> panel.</p>
      <p class="mt-2"><strong>Member profiles.</strong> Select a member\\'s name or <strong>Profile</strong> to see their role, when they joined, their open tasks and story points, defects assigned to them, test runs they recorded, and their recent activity in the project.</p>\`,
    images: [
      { name: 'team', caption: 'Team & Roles: current members, their roles and pending invitations.' },
      { name: 'member-profile', caption: 'A member profile: workload, assigned defects and recent activity.' }
    ]
  },
  {
    id: 'inviting', icon: 'person_add', title: 'Inviting teammates',
    body: () => \`
      \${steps([
        'Ask your teammate to <strong>create a DevTrack account first</strong>. Invitations can only be sent to registered accounts.',
        'Go to <strong>Team & Roles</strong> and select <strong>Invite Member</strong>.',
        'Enter their account email (<strong>Colleague Account Email</strong>) and choose the <strong>Assigned Role</strong>.',
        'Select <strong>Send Invitation</strong>. It appears in their DevTrack inbox straight away, with no link to share.',
        'Until they respond, it is listed under <strong>Pending Invitations</strong>, where you can revoke it. Invitations expire after 7 days.'
      ])}
      <p class="mt-3">If the invitation can\\'t be sent, you will see one of these messages:</p>
      \${list([
        \`<em>"\${UNREGISTERED_USER_MESSAGE}"</em>\`,
        \`<em>"\${ALREADY_MEMBER_MESSAGE}"</em>\`,
        \`<em>"\${PENDING_INVITATION_MESSAGE}"</em>\`,
        \`<em>"\${INVITE_FORBIDDEN_MESSAGE}"</em>\`
      ])}\`,
    images: [
      { name: 'invite-member', caption: 'Inviting a registered teammate and choosing their role.' },
      { name: 'invite-unregistered', caption: 'An email without a DevTrack account is rejected. No invitation is created.' }
    ]
  },
  {
    id: 'inbox', icon: 'mail', title: 'Accepting or declining an invitation',
    body: () => \`
      \${steps([
        'When someone invites you, a notification appears and the <strong>mail icon</strong> at the top right shows a number.',
        'Select the mail icon to open your <strong>Invitations Inbox</strong>. Each invitation shows the project, who invited you and your role.',
        'Select <strong>Accept</strong> to join. The project becomes your active project and you can start working immediately.',
        'Select <strong>Decline</strong> if you do not want to join. Nothing is added to the project.'
      ])}
      \${note('You must be signed in with the same email the invitation was sent to. If you were sent a link instead, opening it shows the same Accept / Decline screen.')}\`,
    images: [
      { name: 'inbox', caption: 'The Invitations Inbox with a pending invitation.' },
      { name: 'invite-accept', caption: 'An invitation opened from a link: review the role, then Accept or Decline.' }
    ]
  },
  {
    id: 'requirements', icon: 'rule', title: 'Requirements (MoSCoW)',
    body: () => \`
      \${steps([
        'Open <strong>Requirements / MoSCoW</strong> and select <strong>New Requirement</strong>.',
        'Enter a <strong>Title</strong>, <strong>Description</strong> and testable <strong>Acceptance Criteria</strong> (for example "Given… When… Then…").',
        'Choose a <strong>MoSCoW Priority</strong> and, optionally, the <strong>Target Release</strong> it ships in.',
        'Every change is recorded. Select <strong>View Diff</strong> or <strong>Audit Revisions</strong> on a requirement to see who changed what, and when.',
        'Use <strong>Edit Status</strong> to move a requirement forward as work progresses.'
      ])}
      <p class="mt-3"><strong>Priorities:</strong> \${chips(MOSCOW_PRIORITIES)}</p>
      <p><strong>Statuses:</strong> \${chips(REQUIREMENT_STATUSES)}</p>\`,
    images: [{ name: 'requirements', caption: 'Requirements with priority, status and linked work.' }]
  },
  {
    id: 'sprints', icon: 'view_kanban', title: 'Sprints, tasks & WIP limits',
    body: () => \`
      \${steps([
        'Open <strong>Sprints & Tasks Board</strong>. Select <strong>New Sprint</strong> and give it a name, goal, start and end date.',
        'A project has one <strong>Active</strong> sprint at a time; additional sprints are held as <strong>Planned</strong>.',
        'Select <strong>Add Task</strong>, link it to a requirement, assign it and estimate it in story points.',
        'Click <strong>WIP Limits</strong> in the top toolbar to configure maximum cards per column. In Strict mode, moves exceeding the capacity are blocked.',
        'Move a task by dragging or changing the status selector on its card.'
      ])}
      <p class="mt-3">Tasks follow the board in order; you can move one step forward or one step back:</p>
      \${flowTable(TASK_TRANSITIONS)}\`,
    images: [{ name: 'sprints', caption: 'The sprint board for the active sprint.' }]
  },
  {
    id: 'gitops', icon: 'terminal', title: 'GitOps & commit automation',
    body: () => \`
      <p>DevTrack links code changes directly to task cards to automate board movement:</p>
      \${steps([
        'Open any task card on the board to view the <strong>GitOps Automation Panel</strong>.',
        'Click <strong>Copy Branch</strong> to copy the generated branch name, e.g. <code>feat/KEY-101-auth-flow</code>.',
        'Pushing a branch or writing a commit matching <code>feat(KEY-101): ...</code> automatically moves the task from <strong>To Do</strong> to <strong>In Progress</strong>.',
        'Opening a Pull Request advances the task to <strong>In Review</strong>.',
        'Merging the PR into <code>main</code> transitions the card to <strong>Done</strong> and attaches the short commit SHA (e.g. <code>a1b2c3d</code>).'
      ])}
      <p class="mt-3">Use <strong>Simulate PR Merge</strong> in the task modal to test the automated Git progression interactively.</p>\`
  },
  {
    id: 'flow-analytics', icon: 'monitoring', title: 'Flow & DORA metrics suite',
    body: () => \`
      <p>Access the <strong>Executive Flow & DORA Analytics Suite</strong> directly from the Cockpit Header on the Dashboard (<strong>Flow & DORA Analytics</strong>):</p>
      \${list([
        '<strong>DORA 4 Core Metrics:</strong> Benchmarks for <em>Deployment Frequency</em>, <em>Lead Time for Changes</em>, <em>Change Failure Rate</em>, and <em>Time to Restore (MTTR)</em> with <strong>ELITE</strong>, <strong>HIGH</strong>, or <strong>MEDIUM</strong> ratings.',
        '<strong>Cycle Time vs Lead Time Breakdown:</strong> Visual progress split detailing active development coding duration (~65%) vs code review and verification wait time (~35%).',
        '<strong>Cumulative Flow Distribution (CFD):</strong> Live snapshot of work item counts and story point volume across all Kanban states.',
        '<strong>Automated Bottleneck Alerts:</strong> Real-time alerts when tasks stall in <em>In Review</em> or when <em>In Progress</em> WIP limits are exceeded.',
        '<strong>Multi-Sprint Rolling Velocity:</strong> Sprint history comparing planned vs delivered points, reliability %, and rolling team velocity.'
      ])}\`
  },
  {
    id: 'testing', icon: 'verified', title: 'Test cases & test runs',
    body: () => \`
      \${steps([
        'Open <strong>Test Runs & QA</strong> and select <strong>New Test Case</strong>. Link it to a requirement, choose the type and write the steps and expected result.',
        'Select <strong>Execute Test Run</strong>, pick the test case and record the outcome with notes.',
        'Runs are permanent records and can\\'t be edited. Run the test again to record a new result.',
        'For a <strong>Failed</strong> run, select <strong>Log Linked Bug</strong> to file a defect that is already linked to the run and requirement.'
      ])}
      <p class="mt-3"><strong>Test types:</strong> \${chips(TEST_TYPES)}</p>
      <p><strong>Outcomes:</strong> \${chips(TEST_RESULTS)}</p>\`,
    images: [
      { name: 'tests', caption: 'Test cases linked to requirements.' },
      { name: 'test-runs', caption: 'Execution history. Failed runs can be turned into a linked defect.' }
    ]
  },
  {
    id: 'defects', icon: 'pest_control', title: 'Defects (bugs)',
    body: () => \`
      \${steps([
        'Open <strong>Bug Tracker</strong> and select <strong>Log Defect</strong>, or log it directly from a failed test run.',
        'Choose a <strong>Severity</strong> (Critical, High, Medium, Low), describe the steps to reproduce and assign who should fix it.',
        'Developers move the defect to <strong>In Progress</strong> and then <strong>Fixed</strong>.',
        'A Tester or Owner confirms the fix by moving it to <strong>Verified</strong>, and then <strong>Closed</strong>.'
      ])}
      \${flowTable(BUG_TRANSITIONS)}\`,
    images: [{ name: 'bugs', caption: 'The Bug Tracker, filterable by severity and status.' }]
  },
  {
    id: 'releases', icon: 'account_tree', title: 'Releases, dual sign-off & changelog',
    body: () => \`
      \${steps([
        'Open <strong>Releases & Traceability</strong> and select <strong>Cut New Release</strong>. Names start with a SemVer version, e.g. <code>v1.2.0 — Bill Pay</code>.',
        'Promote releases from <strong>Planning</strong> to <strong>Staging</strong>.',
        '<strong>Two-Person Integrity Gate:</strong> Deploying to <strong>Production</strong> requires dual digital certification from both the <strong>Engineering Lead</strong> (code review, architecture integrity) and the <strong>QA Lead</strong> (test verification, zero blocker defects).',
        'Open <strong>Dual Sign-off</strong> on any milestone card to review compliance gates (0 Critical defects, passing tests) and record electronic signatures.',
        'Open <strong>Changelog</strong> or select <strong>Changelog Hub</strong> in the toolbar to generate Keep-a-Changelog Markdown notes with 1-click <em>Copy Markdown</em> and <em>Download .md</em>.'
      ])}
      <p class="mt-3"><strong>Release stages:</strong> \${chips(RELEASE_STATUSES)}</p>
      <p class="mt-2">The <strong>traceability matrix</strong> shows each requirement with its tasks, tests, latest results, defects and release. Use <strong>Export Matrix CSV</strong> or <strong>Export Audit PDF</strong> to share it.</p>\`,
    images: [
      { name: 'releases', caption: 'Release gates and their status.' },
      { name: 'traceability', caption: 'The traceability matrix: from each requirement through to its release.' }
    ]
  },
  {
    id: 'webhooks', icon: 'hub', title: 'Outbound webhooks & integrations',
    body: () => \`
      <p>Configure outbound webhooks in <strong>Settings</strong> to receive live alerts in your team\\'s collaboration tools:</p>
      \${steps([
        'Open <strong>Project Settings & Audit Trail</strong> and scroll to <strong>Outbound Webhooks & CI/CD Integrations</strong>.',
        'Select <strong>+ Register Webhook Endpoint</strong>, pick your platform (Slack, Discord, MS Teams, Custom HTTP), and paste the webhook URL.',
        'Select the event triggers to subscribe to: <code>defect.created</code>, <code>defect.resolved</code>, <code>release.promoted</code>, <code>release.signed_off</code>, <code>task.moved</code>, or <code>test.failed</code>.',
        'Click <strong>Test Ping</strong> on any endpoint to dispatch a simulated event and inspect the generated JSON payload.',
        'The <strong>Recent Webhook Delivery Audit</strong> stream logs outbound dispatches with exact timestamps.'
      ])}\`
  },
  {
    id: 'search', icon: 'search', title: 'Quick Search',
    body: () => \`<p>Press <strong>Ctrl + K</strong> (or select <strong>Quick Search</strong> at the top right) and type at least two characters. Results are grouped by requirements, tasks, defects and test cases. Select a result to jump to it.</p>\`,
    images: [{ name: 'search', caption: 'Quick Search across the whole project.' }]
  },
  {
    id: 'settings', icon: 'tune', title: 'Settings & audit trail',
    body: () => \`
      \${list([
        'Owners can update the project name, description and end date.',
        '<strong>Export Complete Workspace JSON</strong> downloads a backup of your workspace data.',
        'The audit trail lists sign-ins, membership changes, requirement edits, test runs and releases.',
        '<strong>Outbound Webhooks Hub:</strong> Connect Slack incoming webhooks, Discord bots, Microsoft Teams, or custom HTTP REST endpoints.',
        '<strong>Reset Data</strong> is limited to Owners and permanently clears the workspace in this browser.'
      ])}
      \${note('Reset cannot be undone. Export a backup first.', 'warn')}\`,
    images: [{ name: 'settings', caption: 'Project settings, data export and the audit trail.' }]
  },
  {
    id: 'faq', icon: 'help', title: 'Troubleshooting & FAQ',
    body: () => \`
      <dl class="space-y-3">
        \${[
          ['I invited someone but they say "User not registered"', 'They need to create a DevTrack account with that exact email first, then you can invite them.'],
          ['My teammate cannot see my invitation', 'Check they are signed in with the email you invited. Invitations arrive live; if a "Live invitations unavailable" warning is shown, check the internet connection. DevTrack reconnects automatically.'],
          ['"Invalid Kanban transition"', 'Tasks move one column at a time. See the board rules in <em>Sprints & the task board</em>.'],
          ['"WIP limit exceeded"', 'In Strict WIP mode, columns that have reached capacity cannot accept additional cards until existing cards are finished or moved.'],
          ['"Production release blocked: Dual digital sign-off required"', 'Promoting to Production requires both Engineering Lead and QA Lead electronic sign-offs. Click "Dual Sign-off" on the release card to record signatures.'],
          ['I can\\'t move a defect to Verified', 'Only Testers and Owners can verify or close defects.'],
          ['"Release gate blocked"', 'Resolve (Fix and Verify, or Close) every open Critical and High defect, then mark the release as Released.'],
          ['How do I test my Slack or Discord webhook?', 'Go to Settings > Outbound Webhooks, click "Test Ping" on the webhook, and click "Dispatch Test Ping". You will see the delivery status and can copy the raw JSON payload.'],
          ['Buttons do nothing or show "Forbidden"', 'Your role does not allow that action. See the table in <em>Team & roles</em>, or ask a project Owner.']
        ].map(([q, a]) => \`<div><dt class="font-semibold text-text-primary">\${q}</dt><dd class="text-text-secondary mt-0.5">\${a}</dd></div>\`).join('')}
      </dl>\`
  }
];`;

const startIdx = content.indexOf(sectionsStart);
let endIdx = content.indexOf(sectionsEnd);
if (endIdx === -1) {
  endIdx = content.indexOf(altSectionsEnd);
}

if (startIdx !== -1 && endIdx !== -1) {
  content = content.slice(0, startIdx) + newSections.replace(/\n/g, '\r\n') + content.slice(endIdx + 2);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated manual.js with comprehensive enterprise sections');
} else {
  console.error('Could not locate SECTIONS array boundaries in manual.js');
}

