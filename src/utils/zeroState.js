// DevTrack Centralized Zero-State & Telemetry Calculation Engine
// Provides consistent, mathematically sound metrics across Dashboard, QA, and Releases pages.

/**
 * Calculates QA verification pass rate.
 * Fixes zero-state bug where 0 test runs previously reported "100%".
 * @param {Array} testRuns - Array of executed test runs
 * @returns {{ rate: number|null, label: string, hasData: boolean, cssClass: string, passed: number, total: number }}
 */
export function calculatePassRate(testRuns = []) {
  const total = testRuns.length;
  if (total === 0) {
    return {
      rate: null,
      label: 'N/A',
      hasData: false,
      cssClass: 'text-text-muted',
      passed: 0,
      total: 0
    };
  }

  const passed = testRuns.filter(r => r.result === 'Passed').length;
  const rate = Math.round((passed / total) * 100);
  return {
    rate,
    label: `${rate}%`,
    hasData: true,
    cssClass: rate >= 80 ? 'text-status-passed' : 'text-status-defect',
    passed,
    total
  };
}

/**
 * Calculates Audit Trace Coverage across specifications, test cases, and open blockers.
 * Fixes zero-state bug where 0 requirements reported "100% Audit Trace Coverage".
 * @param {Array} reqs - Project requirements
 * @param {Array} testCases - Project test cases
 * @param {Array} bugs - Project bugs/defects
 * @returns {{ coverage: number|null, label: string, hasData: boolean, cssClass: string, coveredCount: number, totalCount: number, blockerCount: number }}
 */
export function calculateTraceCoverage(reqs = [], testCases = [], bugs = []) {
  const totalReqs = reqs.length;
  if (totalReqs === 0) {
    return {
      coverage: null,
      label: 'N/A',
      hasData: false,
      cssClass: 'text-text-muted',
      coveredCount: 0,
      totalCount: 0,
      blockerCount: 0
    };
  }

  // Count requirements that have at least one test case linked
  const coveredReqs = reqs.filter(r =>
    testCases.some(tc => tc.requirementIds?.includes(r.id))
  ).length;

  const openBlockers = bugs.filter(b =>
    (b.severity === 'Critical' || b.severity === 'High') &&
    !['Fixed', 'Verified', 'Closed'].includes(b.status)
  ).length;

  const rawCoverage = Math.round((coveredReqs / totalReqs) * 100);
  // If there are open critical blockers in the chain, penalty applies
  const effectiveCoverage = Math.max(0, rawCoverage - (openBlockers > 0 ? 15 : 0));

  return {
    coverage: effectiveCoverage,
    label: `${effectiveCoverage}%`,
    hasData: true,
    cssClass: effectiveCoverage >= 80 ? 'text-status-passed' : effectiveCoverage >= 50 ? 'text-status-in-progress' : 'text-status-defect',
    coveredCount: coveredReqs,
    totalCount: totalReqs,
    blockerCount: openBlockers
  };
}

/**
 * Renders an HTML pill/badge for Zero-State or active numeric metrics.
 * @param {{ label: string, hasData: boolean, cssClass: string }} metric
 * @param {string} [extraClasses='']
 * @returns {string} HTML snippet
 */
export function renderZeroStateBadge(metric, extraClasses = '') {
  if (!metric.hasData) {
    return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-panel text-text-muted text-[11px] font-jetbrains font-semibold border border-border-subtle ${extraClasses}">
      <span class="w-1.5 h-1.5 rounded-full bg-text-muted/60"></span>
      N/A (No Data)
    </span>`;
  }
  return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-panel ${metric.cssClass} text-[11px] font-jetbrains font-bold border border-border-subtle ${extraClasses}">
    <span class="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
    ${metric.label}
  </span>`;
}

