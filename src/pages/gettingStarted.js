// DevTrack Project Getting Started & Zero State Guide
import { store } from '../store.js';

export function renderGettingStarted(container) {
  const project = store.getActiveProject();
  if (!project) {
    container.innerHTML = `<div class="p-12 text-center text-text-muted">Select or create a project first.</div>`;
    return;
  }

  const members = store.getMembers(project.id);
  const reqs = store.getRequirements(project.id);
  const tasks = store.getTasks(project.id);
  const testCases = store.getTestCases(project.id);
  const releases = store.getReleases(project.id);

  const steps = [
    {
      step: '01',
      title: 'Invite Project Team & Configure Roles',
      description: 'Add engineers and testers with Owner, Developer, Tester, or Viewer role permissions.',
      count: members.length,
      unit: 'members joined',
      done: members.length > 0,
      link: '#/team',
      action: 'Manage Team'
    },
    {
      step: '02',
      title: 'Elicit Requirements & MoSCoW Prioritization',
      description: 'Document user stories, acceptance criteria, and classify into Must, Should, Could, and Won\'t have.',
      count: reqs.length,
      unit: 'specifications defined',
      done: reqs.length > 0,
      link: '#/requirements',
      action: 'Open Requirements'
    },
    {
      step: '03',
      title: 'Plan First Agile Sprint & Kanban Tasks',
      description: 'Set sprint goals and break requirements down into estimated story point tasks.',
      count: tasks.length,
      unit: 'tasks on board',
      done: tasks.length > 0,
      link: '#/sprints',
      action: 'Open Sprint Board'
    },
    {
      step: '04',
      title: 'Design Manual QA Verification Cases',
      description: 'Create test cases linked to specifications and record append-only test run executions.',
      count: testCases.length,
      unit: 'test suites active',
      done: testCases.length > 0,
      link: '#/tests',
      action: 'Open Test Suites'
    },
    {
      step: '05',
      title: 'Trigger CI/CD Docker & Typecheck Validation',
      description: 'Simulate containerized build, linting, Vitest assertions, and cluster smoke check.',
      count: '6 / 6',
      unit: 'stages passed',
      done: true,
      link: '#/ci-cd',
      action: 'View CI Pipeline'
    },
    {
      step: '06',
      title: 'Verify Traceability Matrix & Cut Release',
      description: 'Ensure 100% test coverage with zero blocker defects before promoting to production.',
      count: releases.length,
      unit: 'release cut',
      done: releases.length > 0,
      link: '#/releases',
      action: 'Inspect Traceability'
    }
  ];

  const completedSteps = steps.filter(s => s.done).length;
  const progressPct = Math.round((completedSteps / steps.length) * 100);

  container.innerHTML = `
    <div class="relative w-full px-6 py-6 max-w-5xl mx-auto">
      <!-- Header -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-jetbrains text-mono-md mb-3 font-semibold">
          <span class="material-symbols-outlined text-[16px]">rocket</span>
          <span>SOFTWARE ENGINEERING LIFECYCLE BLUEPRINT</span>
        </div>
        <h1 class="font-geist text-headline-xl font-bold text-text-primary tracking-tight mb-2">Getting Started with ${project.name}</h1>
        <p class="text-body-md text-text-muted max-w-xl mx-auto">Follow this 6-step lifecycle workflow to take your project from initial elicitation to production release.</p>

        <!-- Progress Indicator -->
        <div class="mt-6 max-w-md mx-auto">
          <div class="flex items-center justify-between text-body-sm font-jetbrains mb-2">
            <span class="text-text-secondary">Onboarding Progress</span>
            <span class="text-primary font-bold">${completedSteps} of 6 Completed (${progressPct}%)</span>
          </div>
          <div class="w-full bg-surface-canvas h-2.5 rounded-full overflow-hidden border border-border-subtle">
            <div class="bg-primary h-full rounded-full transition-all duration-500" style="width: ${progressPct}%"></div>
          </div>
        </div>
      </div>

      <!-- Step Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        ${steps.map(s => `
          <div class="bg-surface-canvas border ${s.done ? 'border-status-passed/40 bg-surface-canvas' : 'border-border-subtle'} rounded-xl p-5 flex flex-col justify-between shadow-sm hover:border-border-strong transition-all">
            <div>
              <div class="flex items-center justify-between mb-3">
                <span class="font-jetbrains text-mono-md font-bold px-2 py-0.5 rounded bg-surface-panel text-secondary">STEP ${s.step}</span>
                <span class="flex items-center gap-1 font-jetbrains text-[11px] px-2 py-0.5 rounded-full ${s.done ? 'bg-status-passed-surface text-status-passed' : 'bg-surface-elevated text-text-muted'} font-semibold">
                  <span class="material-symbols-outlined text-[14px]">${s.done ? 'check_circle' : 'pending'}</span>
                  <span>${s.done ? 'COMPLETE' : 'INCOMPLETE'}</span>
                </span>
              </div>

              <h3 class="font-geist text-headline-sm font-bold text-text-primary mb-1.5">${s.title}</h3>
              <p class="text-body-sm text-text-muted mb-4">${s.description}</p>
            </div>

            <div class="pt-3 border-t border-border-subtle flex items-center justify-between font-jetbrains text-[11px]">
              <span class="text-text-secondary font-medium">${s.count} ${s.unit}</span>
              <a href="${s.link}" class="px-3 py-1.5 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-primary hover:text-primary font-medium border border-border-subtle transition-all flex items-center gap-1">
                <span>${s.action}</span>
                <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
              </a>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="text-center">
        <a href="#/dashboard" class="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary hover:bg-primary-fixed text-on-primary font-semibold text-body-md transition-all shadow-lg shadow-primary/25">
          <span>Enter Executive Dashboard</span>
          <span class="material-symbols-outlined text-[18px]">dashboard</span>
        </a>
      </div>
    </div>
  `;
}
