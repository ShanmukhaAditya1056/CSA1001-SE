// DevTrack Sequential Lifecycle Gating & Onboarding Engine
// Enforces that downstream stages cannot be completed before upstream prerequisites are satisfied.

/**
 * Evaluates the sequential onboarding workflow for a project.
 * @param {Object} projectData - Data snapshot { members, reqs, tasks, testCases, pipelineRuns, releases }
 * @returns {Object} Evaluated lifecycle steps with gating statuses
 */
export function evaluateLifecycleGating({
  members = [],
  reqs = [],
  tasks = [],
  testCases = [],
  pipelineRuns = [],
  releases = []
} = {}) {
  // Step 1: Team Membership & Role Permissions
  const step1Complete = members.length > 0;

  // Step 2: Requirements & MoSCoW Specifications (Gated by Step 1)
  const step2Unlocked = step1Complete;
  const step2Complete = step2Unlocked && reqs.length > 0;

  // Step 3: Agile Sprint & Kanban Tasks (Gated by Step 2)
  const step3Unlocked = step2Complete;
  const step3Complete = step3Unlocked && tasks.length > 0;

  // Step 4: QA Manual Verification Test Cases (Gated by Step 2: tests need specs)
  const step4Unlocked = step2Complete;
  const step4Complete = step4Unlocked && testCases.length > 0;

  // Step 5: CI/CD Pipeline Execution (Gated by Step 3 & Step 4)
  const step5Unlocked = step3Complete && step4Complete;
  const step5Complete = step5Unlocked && pipelineRuns.length > 0;

  // Step 6: Traceability Matrix Verification & Release (Gated by Steps 1-5)
  const step6Unlocked = step5Complete;
  const step6Complete = step6Unlocked && releases.length > 0;

  const rawSteps = [
    {
      id: 1,
      step: '01',
      title: 'Invite Project Team & Configure Roles',
      description: 'Add engineers and testers with Owner, Developer, Tester, or Viewer role permissions.',
      metricText: `${members.length} members joined`,
      unlocked: true,
      done: step1Complete,
      prerequisiteText: null,
      link: '#/team?tour=true&step=1',
      action: 'Manage Team'
    },
    {
      id: 2,
      step: '02',
      title: 'Elicit Requirements & MoSCoW Prioritization',
      description: 'Document user stories, acceptance criteria, and classify into Must, Should, Could, and Won\'t have.',
      metricText: `${reqs.length} specifications defined`,
      unlocked: step2Unlocked,
      done: step2Complete,
      prerequisiteText: !step2Unlocked ? 'Prerequisite: Add at least one team member in Step 01' : null,
      link: '#/requirements?tour=true&step=2',
      action: 'Open Requirements'
    },
    {
      id: 3,
      step: '03',
      title: 'Plan Agile Sprint & Kanban Tasks',
      description: 'Set sprint goals and break requirements down into estimated story point tasks.',
      metricText: `${tasks.length} tasks on board`,
      unlocked: step3Unlocked,
      done: step3Complete,
      prerequisiteText: !step3Unlocked ? 'Prerequisite: Create project specifications in Step 02' : null,
      link: '#/sprints?tour=true&step=3',
      action: 'Open Sprint Board'
    },
    {
      id: 4,
      step: '04',
      title: 'Design QA Verification Cases',
      description: 'Create test cases linked to specifications and record append-only test run executions.',
      metricText: `${testCases.length} test suites active`,
      unlocked: step4Unlocked,
      done: step4Complete,
      prerequisiteText: !step4Unlocked ? 'Prerequisite: Formalize requirements in Step 02 first' : null,
      link: '#/tests?tour=true&step=4',
      action: 'Open Test Suites'
    },
    {
      id: 5,
      step: '05',
      title: 'Trigger CI/CD Docker & Typecheck Validation',
      description: 'Simulate containerized build, linting, Vitest assertions, and cluster smoke check.',
      metricText: pipelineRuns.length > 0 ? `${pipelineRuns.length} runs executed` : '0 runs triggered',
      unlocked: step5Unlocked,
      done: step5Complete,
      prerequisiteText: !step5Unlocked ? 'Prerequisite: Complete Sprint tasks (03) and QA tests (04)' : null,
      link: '#/ci-cd?tour=true&step=5',
      action: 'View CI Pipeline'
    },
    {
      id: 6,
      step: '06',
      title: 'Verify Traceability Matrix & Cut Release',
      description: 'Ensure audit trace coverage with zero blocker defects before promoting to production.',
      metricText: `${releases.length} releases cut`,
      unlocked: step6Unlocked,
      done: step6Complete,
      prerequisiteText: !step6Unlocked ? 'Prerequisite: Successfully pass CI/CD pipeline validation in Step 05' : null,
      link: '#/releases?tour=true&step=6',
      action: 'Inspect Traceability'
    }
  ];

  const completedCount = rawSteps.filter(s => s.done).length;
  const progressPct = Math.round((completedCount / rawSteps.length) * 100);

  return {
    steps: rawSteps,
    completedCount,
    totalSteps: rawSteps.length,
    progressPct,
    currentActiveStep: rawSteps.find(s => !s.done && s.unlocked) || (completedCount === rawSteps.length ? rawSteps[rawSteps.length - 1] : rawSteps[0])
  };
}

