// Unit tests for Zero-State Logic and Sequential Onboarding Gating
import assert from 'node:assert';
import { calculatePassRate, calculateTraceCoverage, renderZeroStateBadge } from '../../src/utils/zeroState.js';
import { evaluateLifecycleGating } from '../../src/utils/onboardingGate.js';

console.log('--- [UNIT TESTS] Zero-State & Sequential Lifecycle Gating ---');

// 1. Zero-state pass rate
console.log('Testing calculatePassRate with 0 test runs...');
const zeroPass = calculatePassRate([]);
assert.strictEqual(zeroPass.rate, null);
assert.strictEqual(zeroPass.label, 'N/A');
assert.strictEqual(zeroPass.hasData, false);
console.log('✓ 0 test runs correctly returns rate: null and label: "N/A"');

console.log('Testing calculatePassRate with valid runs...');
const activePass = calculatePassRate([
  { result: 'Passed' },
  { result: 'Passed' },
  { result: 'Failed' },
  { result: 'Passed' }
]);
assert.strictEqual(activePass.rate, 75);
assert.strictEqual(activePass.label, '75%');
assert.strictEqual(activePass.hasData, true);
console.log('✓ Active test runs correctly calculate percentage (75%)');

// 2. Zero-state trace coverage
console.log('Testing calculateTraceCoverage with 0 requirements...');
const zeroCov = calculateTraceCoverage([], [], []);
assert.strictEqual(zeroCov.coverage, null);
assert.strictEqual(zeroCov.label, 'N/A');
assert.strictEqual(zeroCov.hasData, false);
console.log('✓ 0 requirements returns coverage: null and label: "N/A"');

// 3. Sequential Gating
console.log('Testing evaluateLifecycleGating upstream blocking...');
// Empty project
const emptyGating = evaluateLifecycleGating({
  members: [],
  reqs: [],
  tasks: [],
  testCases: [],
  pipelineRuns: [],
  releases: []
});
assert.strictEqual(emptyGating.steps[0].unlocked, true);
assert.strictEqual(emptyGating.steps[0].done, false);
assert.strictEqual(emptyGating.steps[1].unlocked, false, 'Step 2 must be locked when Step 1 is incomplete');
assert.strictEqual(emptyGating.steps[4].done, false, 'CI/CD cannot be marked complete when empty');
assert.strictEqual(emptyGating.completedCount, 0);
console.log('✓ Downstream stages are correctly locked and not falsely marked complete');

// Step 1 done, Step 2 done
const partialGating = evaluateLifecycleGating({
  members: [{ id: 'u1' }],
  reqs: [{ id: 'r1' }],
  tasks: [],
  testCases: [],
  pipelineRuns: [],
  releases: []
});
assert.strictEqual(partialGating.steps[0].done, true);
assert.strictEqual(partialGating.steps[1].unlocked, true);
assert.strictEqual(partialGating.steps[1].done, true);
assert.strictEqual(partialGating.steps[2].unlocked, true, 'Step 3 unlocked once Step 2 is done');
assert.strictEqual(partialGating.steps[4].unlocked, false, 'Step 5 locked because Step 3 & 4 not done');
console.log('✓ Sequential progression correctly unlocks step-by-step');

console.log('✓ All Zero-State and Gating tests PASSED!\n');

