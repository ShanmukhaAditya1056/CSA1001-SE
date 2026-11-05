import fs from 'fs';

const filePath = 'src/pages/releases.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add import
if (!content.includes("from '../releaseChangelog.js'")) {
  content = content.replace(
    "import html2canvas from 'html2canvas';",
    "import html2canvas from 'html2canvas';\r\nimport { checkReleaseSignoffStatus, generateSemanticChangelog, openDualSignoffModal, openChangelogModal } from '../releaseChangelog.js';"
  );
}

// 2. Add header button in toolbar
const targetToolbar = '<div class="flex items-center flex-wrap gap-2.5">\r\n          <button id="export-pdf-btn"';
const altTargetToolbar = '<div class="flex items-center flex-wrap gap-2.5">\n          <button id="export-pdf-btn"';

const replacementToolbar = `<div class="flex items-center flex-wrap gap-2.5">
          <button id="release-hub-changelog-btn" class="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-status-release-surface text-status-release hover:brightness-110 font-medium text-body-md border border-status-release/40 transition-all shadow-sm cursor-pointer" title="View Semantic Changelog for Latest Milestone">
            <span class="material-symbols-outlined text-[18px]">history_edu</span>
            <span>Changelog Hub</span>
          </button>
          <button id="export-pdf-btn"`;

if (!content.includes('id="release-hub-changelog-btn"')) {
  if (content.includes(targetToolbar)) {
    content = content.replace(targetToolbar, replacementToolbar);
  } else if (content.includes(altTargetToolbar)) {
    content = content.replace(altTargetToolbar, replacementToolbar.replace(/\r\n/g, '\n'));
  }
}

// 3. Update release milestone cards
const targetCardMap = `            \${releases.map(rel => {
              const isReleased = rel.status === 'Released';

              return \`
                <div class="bg-surface-canvas border border-border-subtle rounded-xl p-5 flex flex-col justify-between shadow-sm hover:border-border-default transition-all">
                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <span class="font-jetbrains text-mono-md font-bold px-2 py-0.5 rounded bg-status-release-surface text-status-release">\${rel.name.split(' ')[0]}</span>
                      \${statusChip(rel.status)}
                    </div>
                    <h3 class="font-geist text-headline-sm font-bold text-text-primary mb-1">\${rel.name}</h3>
                    <p class="text-body-sm text-text-secondary mb-4">\${rel.summary || 'Release build cut.'}</p>
                  </div>

                  <div class="pt-3 border-t border-border-subtle flex items-center justify-between font-jetbrains text-[11px] text-text-muted">
                    <div class="flex items-center gap-1.5">
                      <span class="material-symbols-outlined text-[15px]">event</span>
                      <span>Target: \${formatDate(rel.targetDate)}</span>
                      \${rel.actualDate ? \`<span class="text-status-passed ml-2">Shipped: \${formatDate(rel.actualDate)}</span>\` : ''}
                    </div>

                    \${!isReleased ? \`
                      <button class="mark-released-btn px-3 py-1 rounded bg-status-passed-surface hover:bg-status-passed/20 text-status-passed font-semibold transition-all border border-status-passed/30" data-id="\${rel.id}" data-next="\${rel.status === 'Staging' ? 'Released' : 'Staging'}">
                        \${rel.status === 'Staging' ? 'Mark Released' : 'Promote to Staging'}
                      </button>
                    \` : ''}
                  </div>
                </div>
              \`;
            }).join('')}`;

const replacementCardMap = `            \${releases.map(rel => {
              const isReleased = rel.status === 'Released';
              const signoffState = checkReleaseSignoffStatus(rel);

              return \`
                <div class="bg-surface-canvas border border-border-subtle rounded-xl p-5 flex flex-col justify-between shadow-sm hover:border-border-default transition-all">
                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <div class="flex items-center gap-2">
                        <span class="font-jetbrains text-mono-md font-bold px-2 py-0.5 rounded bg-status-release-surface text-status-release">\${rel.name.split(' ')[0]}</span>
                        \${signoffState.isFullyCertified ? \`
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-status-passed-surface text-status-passed border border-status-passed/30">
                            <span class="material-symbols-outlined text-[12px]">verified</span> 2/2 Sign-offs
                          </span>
                        \` : (signoffState.engSigned || signoffState.qaSigned ? \`
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            <span class="material-symbols-outlined text-[12px]">pending</span> 1/2 Sign-offs
                          </span>
                        \` : \`
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-text-muted bg-surface-elevated border border-border-subtle">
                            0/2 Sign-offs
                          </span>
                        \`)}
                      </div>
                      \${statusChip(rel.status)}
                    </div>
                    <h3 class="font-geist text-headline-sm font-bold text-text-primary mb-1">\${rel.name}</h3>
                    <p class="text-body-sm text-text-secondary mb-4">\${rel.summary || 'Release build cut.'}</p>
                  </div>

                  <div class="space-y-3 pt-3 border-t border-border-subtle font-jetbrains text-[11px] text-text-muted">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-[15px]">event</span>
                        <span>Target: \${formatDate(rel.targetDate)}</span>
                      </div>
                      \${rel.actualDate ? \`<span class="text-status-passed font-semibold">Shipped: \${formatDate(rel.actualDate)}</span>\` : ''}
                    </div>

                    <div class="flex items-center gap-2 pt-1 border-t border-border-subtle/40">
                      <button class="btn-open-signoff flex items-center gap-1 px-2.5 py-1 rounded bg-surface-panel hover:bg-surface-elevated text-text-primary text-[11px] font-medium border border-border-subtle transition-all cursor-pointer active:scale-95" data-id="\${rel.id}" title="Dual Digital Signoff Gate">
                        <span class="material-symbols-outlined text-[14px] text-primary">draw</span>
                        <span>\${signoffState.isFullyCertified ? 'Sign-off Certified' : 'Dual Sign-off'}</span>
                      </button>
                      <button class="btn-open-changelog flex items-center gap-1 px-2.5 py-1 rounded bg-surface-panel hover:bg-surface-elevated text-text-primary text-[11px] font-medium border border-border-subtle transition-all cursor-pointer active:scale-95" data-id="\${rel.id}" title="View Semantic Changelog">
                        <span class="material-symbols-outlined text-[14px] text-status-release">notes</span>
                        <span>Changelog</span>
                      </button>
                      <div class="flex-1"></div>
                      \${!isReleased ? \`
                        <button class="mark-released-btn px-3 py-1 rounded bg-status-passed-surface hover:bg-status-passed/20 text-status-passed font-semibold text-[11px] transition-all border border-status-passed/30 cursor-pointer active:scale-95" data-id="\${rel.id}" data-next="\${rel.status === 'Staging' ? 'Released' : 'Staging'}">
                          \${rel.status === 'Staging' ? 'Deploy to Production' : 'Promote to Staging'}
                        </button>
                      \` : \`
                        <span class="text-[11px] text-status-passed font-jetbrains font-bold flex items-center gap-1">
                          <span class="material-symbols-outlined text-[14px]">check_circle</span>
                          <span>Shipped</span>
                        </span>
                      \`}
                    </div>
                  </div>
                </div>
              \`;
            }).join('')}`;

// Try replacing card map
const normalize = s => s.replace(/\r\n/g, '\n');
if (normalize(content).includes(normalize(targetCardMap))) {
  // Replace using regex or normalized match
  const normContent = normalize(content);
  const normTarget = normalize(targetCardMap);
  const normReplacement = normalize(replacementCardMap);
  const idx = normContent.indexOf(normTarget);
  if (idx !== -1) {
    content = normContent.slice(0, idx) + normReplacement + normContent.slice(idx + normTarget.length);
  }
} else {
  console.log('Target card map not matched directly');
}

// 4. Update click listeners
const targetListeners = `  // Attach mark released button
  container.querySelectorAll('.mark-released-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const relId = btn.dataset.id;
      const next = btn.dataset.next;
      // Release gate: production cut is blocked while Critical/High defects are unresolved.
      const openBlockers = store.getBugs(project.id).filter(b => !BUG_RESOLVED_STATES.includes(b.status) && ['Critical', 'High'].includes(b.severity)).length;
      if (next === 'Released' && openBlockers > 0) {
        showToast(\`Release gate blocked: \${openBlockers} unresolved Critical/High defect(s).\`, 'error');
        return;
      }
      const res = store.updateRelease(relId, { status: next });
      if (res.error) {
        showToast(res.error, 'error');
        return;
      }
      showToast(next === 'Released' ? 'Release cut marked as Released to production!' : 'Release promoted to Staging.', 'success');
      renderReleases(container);
    });
  });`;

const replacementListeners = `  // Attach mark released button
  container.querySelectorAll('.mark-released-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const relId = btn.dataset.id;
      const next = btn.dataset.next;
      // Release gate: production cut is blocked while Critical/High defects are unresolved.
      const openBlockers = store.getBugs(project.id).filter(b => !BUG_RESOLVED_STATES.includes(b.status) && ['Critical', 'High'].includes(b.severity)).length;
      if (next === 'Released' && openBlockers > 0) {
        showToast(\`Release gate blocked: \${openBlockers} unresolved Critical/High defect(s).\`, 'error');
        return;
      }
      if (next === 'Released') {
        const signoffState = checkReleaseSignoffStatus(store.getRelease(relId));
        if (!signoffState.isFullyCertified) {
          showToast('Dual digital sign-off (Engineering + QA) required before production release.', 'warning');
          openDualSignoffModal(relId, () => renderReleases(container));
          return;
        }
      }
      const res = store.updateRelease(relId, { status: next });
      if (res.error) {
        showToast(res.error, 'error');
        return;
      }
      showToast(next === 'Released' ? '🎉 Release cut marked as Released to production!' : 'Release promoted to Staging.', 'success');
      renderReleases(container);
    });
  });

  // Attach Dual Signoff Gate triggers
  container.querySelectorAll('.btn-open-signoff').forEach(btn => {
    btn.addEventListener('click', () => {
      openDualSignoffModal(btn.dataset.id, () => renderReleases(container));
    });
  });

  // Attach Semantic Changelog triggers
  container.querySelectorAll('.btn-open-changelog').forEach(btn => {
    btn.addEventListener('click', () => {
      openChangelogModal(btn.dataset.id);
    });
  });

  // Attach Top Changelog Hub trigger
  container.querySelector('#release-hub-changelog-btn')?.addEventListener('click', () => {
    const target = releases.find(r => r.status === 'Released') || releases[0];
    if (target) {
      openChangelogModal(target.id);
    } else {
      showToast('No releases created yet', 'info');
    }
  });`;

if (normalize(content).includes(normalize(targetListeners))) {
  const normContent = normalize(content);
  const normTarget = normalize(targetListeners);
  const normReplacement = normalize(replacementListeners);
  const idx = normContent.indexOf(normTarget);
  if (idx !== -1) {
    content = normContent.slice(0, idx) + normReplacement + normContent.slice(idx + normTarget.length);
  }
} else {
  console.log('Target listeners not matched directly');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated releases.js');

