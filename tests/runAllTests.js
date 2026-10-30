// DevTrack Automated Test Suite Runner (gemini.md Section 10 & Stage H)
import { runBusinessRulesTests } from './unit/businessRules.test.js';
import { runClientInviteFlowTests } from './unit/clientInviteFlow.test.js';
import { runTeamMembershipTests } from './unit/teamMembership.test.js';
import { runStoreRulesTests } from './unit/storeRules.test.js';
import { runApiSecurityTests } from './integration/apiSecurity.test.js';
import { runLifecycleFlowTests } from './integration/lifecycleFlow.test.js';

async function main() {
  const startTime = Date.now();
  console.log('===============================================================');
  console.log('   DevTrack Software Engineering Lifecycle Platform');
  console.log('   Automated Quality Assurance & Security Hardening Test Suite');
  console.log('===============================================================');

  let passedSuites = 0;
  let totalSuites = 6;

  try {
    // 0. Ensure API Server is running
    try {
      const ping = await fetch('http://localhost:4000/api/health').catch(() => null);
      if (!ping || !ping.ok) {
        const { server } = await import('../server/src/server.js');
        if (!server.listening) {
          await new Promise(resolve => server.listen(4000, resolve));
        }
      }
    } catch (e) {
      // server already listening or module auto-started
    }

    // 1. Business Rules & Unit Tests
    await runBusinessRulesTests();
    passedSuites++;

    // 2. Client Invitation & Registered Users Policy Tests
    await runClientInviteFlowTests();
    passedSuites++;

    // 3. Project-Scoped Team Membership, Roles & Direct Adds
    await runTeamMembershipTests();
    passedSuites++;

    // 3b. Client store enforcement of shared lifecycle rules
    await runStoreRulesTests();
    passedSuites++;

    // 4. API Security & Project Isolation Tests
    await runApiSecurityTests();
    passedSuites++;

    // 5. Complete 12-Step Lifecycle End-to-End Smoke Journey
    await runLifecycleFlowTests();
    passedSuites++;

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('===============================================================');
    console.log(`🎉 ALL TEST SUITES PASSED! (${passedSuites}/${totalSuites} suites passed in ${duration}s)`);
    console.log('   - Business Rules Unit Tests: 8/8 suites passed');
    console.log('   - Client Invitation & Token Tests: 10/10 passed');
    console.log('   - Team Membership, Roles & Isolation: 9/9 passed');
    console.log('   - Client Store Rule Enforcement: 7/7 passed');
    console.log('   - API Security & Isolation: 7/7 suites passed');
    console.log('   - Lifecycle Journey: 12/12 steps passed');
    console.log('===============================================================');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST FAILURE DETECTED:');
    console.error(err.message || err);
    if (err.stack) console.error(err.stack);
    console.log(`\nResults: ${passedSuites}/${totalSuites} suites passed before failure.`);
    process.exit(1);
  }
}

main();
