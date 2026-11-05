import fs from 'fs';

// 1. Fix src/pages/gettingStarted.js
{
  const filePath = 'src/pages/gettingStarted.js';
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix prerequisite yellow box styling & contrast
  content = content.replace(
    'cardBorder = \'border-border-subtle/60 bg-surface-canvas/40 opacity-70\';',
    'cardBorder = \'border-border-subtle/60 bg-surface-canvas/50\';'
  );

  content = content.replace(
    '<div class="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-jetbrains flex items-center gap-2 mb-3">',
    '<div class="p-2.5 rounded-lg bg-amber-500/15 dark:bg-amber-500/20 border border-amber-500/40 text-amber-800 dark:text-amber-300 text-[11px] font-jetbrains font-semibold flex items-center gap-2 mb-3">'
  );

  content = content.replace(
    '<span class="material-symbols-outlined text-[15px] shrink-0">lock</span>',
    '<span class="material-symbols-outlined text-[16px] text-amber-700 dark:text-amber-400 shrink-0">lock</span>'
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✓ Fixed gettingStarted.js prerequisite yellow box contrast');
}

// 2. Fix src/pages/dashboard.js bottleneck amber alert contrast
{
  const filePath = 'src/pages/dashboard.js';
  let content = fs.readFileSync(filePath, 'utf8');

  content = content.replace(
    '<div class="font-geist text-body-sm font-bold text-amber-300">Flow Constraint Detected in [${escapeHtml(metrics.bottleneckAlert.stage)}]</div>',
    '<div class="font-geist text-body-sm font-bold text-amber-800 dark:text-amber-300">Flow Constraint Detected in [${escapeHtml(metrics.bottleneckAlert.stage)}]</div>'
  );

  content = content.replace(
    '<div class="text-body-xs text-amber-200/90 mt-0.5">${escapeHtml(metrics.bottleneckAlert.message)}</div>',
    '<div class="text-body-xs text-amber-700 dark:text-amber-200 mt-0.5">${escapeHtml(metrics.bottleneckAlert.message)}</div>'
  );

  content = content.replace(
    '<span class="material-symbols-outlined text-amber-400 text-[22px] shrink-0 mt-0.5">warning</span>',
    '<span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[22px] shrink-0 mt-0.5">warning</span>'
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✓ Fixed dashboard.js bottleneck alert contrast');
}

// 3. Fix src/pages/releases.js amber badge contrast
{
  const filePath = 'src/pages/releases.js';
  let content = fs.readFileSync(filePath, 'utf8');

  content = content.replace(
    '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">',
    '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 dark:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-500/40">'
  );

  content = content.replace(
    '<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-bold tracking-wide">',
    '<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 dark:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-500/40 text-[11px] font-bold tracking-wide">'
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✓ Fixed releases.js amber badge contrast');
}

// 4. Fix src/releaseChangelog.js amber badge contrast
{
  const filePath = 'src/releaseChangelog.js';
  let content = fs.readFileSync(filePath, 'utf8');

  content = content.replace(
    '${status.isFullyCertified ? \'✅ 2/2 SIGN-OFFS COMPLETE\' : (status.engSigned || status.qaSigned ? \'⚠️ 1/2 SIGN-OFFS RECORDED\' : \'⏳ 0/2 SIGN-OFFS\')}',
    '${status.isFullyCertified ? \'✅ 2/2 SIGN-OFFS COMPLETE\' : (status.engSigned || status.qaSigned ? \'⚠️ 1/2 SIGN-OFFS RECORDED\' : \'⏳ 0/2 SIGN-OFFS\')}'
  );

  content = content.replace(
    'class="font-jetbrains text-label-sm ${status.isFullyCertified ? \'text-status-passed font-bold\' : \'text-amber-400 font-semibold\'}">',
    'class="font-jetbrains text-label-sm ${status.isFullyCertified ? \'text-status-passed font-bold\' : \'text-amber-700 dark:text-amber-400 font-semibold\'}">'
  );

  content = content.replace(
    '<div class="text-[11px] ${status.passRate >= 80 ? \'text-status-passed\' : \'text-amber-400\'}">',
    '<div class="text-[11px] ${status.passRate >= 80 ? \'text-status-passed\' : \'text-amber-700 dark:text-amber-400\'}">'
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✓ Fixed releaseChangelog.js amber contrast');
}

