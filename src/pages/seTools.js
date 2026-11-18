// DevTrack — Software Engineering Tools
// The toolchain behind this project, laid out by lifecycle phase.
// To add a link, set its `url` below. A link with an empty url shows as "Link pending".
import { escapeHtml } from '../ui.js';

const REPO = 'https://github.com/ShanmukhaAditya1056/CSA1001-SE';

const PHASES = [
  { id: 'plan', step: '01', title: 'Plan & Design', icon: 'edit_note', blurb: 'Backlog, specifications and UI design' },
  { id: 'build', step: '02', title: 'Build & Version', icon: 'code', blurb: 'Source control and automated checks' },
  { id: 'package', step: '03', title: 'Package & Orchestrate', icon: 'deployed_code', blurb: 'Containers and cluster manifests' },
  { id: 'deploy', step: '04', title: 'Deploy & Run', icon: 'rocket_launch', blurb: 'Hosted frontend and API' }
];

const TOOLS = [
  {
    phase: 'plan', name: 'Jira', mono: 'Ji', tint: '#2684FF',
    role: 'Sprint planning and issue tracking for the team backlog.',
    evidence: [],
    links: [{ label: 'Open Jira board', url: '' }]
  },
  {
    phase: 'plan', name: 'Confluence', mono: 'Co', tint: '#1868DB',
    role: 'Team space for requirements, meeting notes and design decisions.',
    evidence: ['docs/'],
    links: [{ label: 'Open Confluence space', url: '' }]
  },
  {
    phase: 'plan', name: 'Figma', mono: 'Fi', tint: '#A259FF',
    role: 'UI mockups and design system for the DevTrack screens.',
    evidence: [],
    links: [{ label: 'Open Figma file', url: 'https://www.figma.com/design/daHGaffh0usrPvEkU8qySX/Devtrack?node-id=0-1&t=sMpx0ZChi3Oi2QUO-0' }]
  },
  {
    phase: 'build', name: 'GitHub', mono: 'GH', tint: '#8B949E',
    role: 'Holds the frontend, API server, deployment files and documentation.',
    evidence: ['src/', 'server/', 'docs/', 'README.md'],
    links: [{ label: 'Open repository', url: REPO }]
  },
  {
    phase: 'build', name: 'GitHub Actions', mono: 'GA', tint: '#2088FF',
    role: 'CI workflow that installs, builds and runs the 11 test suites on every push.',
    evidence: ['.github/workflows/ci.yml', 'tests/runAllTests.js'],
    links: [
      { label: 'Workflow runs', url: `${REPO}/actions` },
      { label: 'ci.yml', url: `${REPO}/blob/main/.github/workflows/ci.yml` }
    ]
  },
  {
    phase: 'package', name: 'Docker', mono: 'Dk', tint: '#1D63ED',
    role: 'Alpine image for the API, plus Compose for the API with PostgreSQL 16.',
    evidence: ['Dockerfile', 'docker-compose.yml'],
    links: [
      { label: 'Dockerfile', url: `${REPO}/blob/main/Dockerfile` },
      { label: 'docker-compose.yml', url: `${REPO}/blob/main/docker-compose.yml` }
    ]
  },
  {
    phase: 'package', name: 'Kubernetes', mono: 'K8', tint: '#326CE5',
    role: 'Local demo cluster: 2 API replicas with health probes, PostgreSQL, NodePort 30080.',
    evidence: ['k8s/devtrack-api.yaml', 'k8s/postgres.yaml'],
    links: [{ label: 'Open k8s/ manifests', url: `${REPO}/tree/main/k8s` }]
  },
  {
    phase: 'deploy', name: 'Vercel', mono: 'Ve', tint: '#A1A1AA',
    role: 'Hosts the Vite frontend build.',
    evidence: ['vercel.json'],
    links: [
      { label: 'vercel.json', url: `${REPO}/blob/main/vercel.json` },
      { label: 'Live app', url: '' }
    ]
  },
  {
    phase: 'deploy', name: 'Render', mono: 'Re', tint: '#46E3B7',
    role: 'Runs the Node.js API container.',
    evidence: ['render.yaml'],
    links: [
      { label: 'render.yaml', url: `${REPO}/blob/main/render.yaml` },
      { label: 'Live API health', url: '' }
    ]
  }
];

function linkButton(link) {
  if (!link.url) {
    return `
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-dashed border-border-subtle text-text-muted text-[11px] font-jetbrains" title="Link not added yet">
        <span class="material-symbols-outlined text-[14px]">link_off</span>${escapeHtml(link.label)}
        <span class="text-[10px] uppercase tracking-wider opacity-70">· pending</span>
      </span>`;
  }
  return `
    <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer"
       class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-panel hover:bg-primary/15 border border-border-subtle hover:border-primary text-text-primary hover:text-primary text-[11px] font-jetbrains font-semibold transition-colors">
      ${escapeHtml(link.label)}<span class="material-symbols-outlined text-[14px]">north_east</span>
    </a>`;
}

function toolCard(tool) {
  const ready = tool.links.some(l => l.url);
  return `
    <article class="se-tool-card group relative rounded-xl bg-surface-base border border-border-subtle hover:border-primary/60 transition-colors overflow-hidden" data-name="${escapeHtml(tool.name.toLowerCase())}">
      <div class="absolute left-0 top-0 bottom-0 w-1" style="background:${tool.tint}"></div>
      <div class="p-4 pl-5 space-y-3">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg flex items-center justify-center font-jetbrains font-bold text-[13px] text-white shrink-0" style="background:${tool.tint}">${escapeHtml(tool.mono)}</div>
          <div class="min-w-0 flex-1">
            <h3 class="font-geist text-body-md font-bold text-text-primary leading-tight">${escapeHtml(tool.name)}</h3>
            <div class="text-[10px] font-jetbrains uppercase tracking-wider ${ready ? 'text-status-passed' : 'text-text-muted'}">${ready ? '● linked' : '○ awaiting link'}</div>
          </div>
        </div>
        <p class="text-body-sm text-text-secondary leading-snug">${escapeHtml(tool.role)}</p>
        ${tool.evidence.length ? `
          <div class="flex flex-wrap gap-1">
            ${tool.evidence.map(e => `<code class="px-1.5 py-0.5 rounded bg-surface-panel text-[10.5px] font-jetbrains text-text-muted">${escapeHtml(e)}</code>`).join('')}
          </div>` : ''}
        <div class="flex flex-wrap gap-1.5 pt-1">${tool.links.map(linkButton).join('')}</div>
      </div>
    </article>`;
}

export function renderSeTools(container) {
  const allLinks = TOOLS.flatMap(t => t.links);
  const linked = allLinks.filter(l => l.url).length;

  container.innerHTML = `
    <div class="w-full px-6 py-6">
      <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <div class="font-jetbrains text-mono-md text-text-muted mb-1">PROJECT / TOOLCHAIN</div>
          <h1 class="font-geist text-headline-lg font-bold text-text-primary">Software Engineering Tools</h1>
          <p class="text-body-md text-text-muted mt-1">The tools used across the DevTrack lifecycle, the files that show each one in use, and links to the work.</p>
        </div>
        <div class="flex items-center gap-2 font-jetbrains text-[12px]">
          <span class="px-3 py-1.5 rounded-lg bg-surface-panel border border-border-subtle text-text-secondary"><b class="text-text-primary">${TOOLS.length}</b> tools</span>
          <span class="px-3 py-1.5 rounded-lg bg-surface-panel border border-border-subtle text-text-secondary"><b class="text-status-passed">${linked}</b> / ${allLinks.length} links ready</span>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-2.5 top-1.5 text-text-muted text-[18px]">search</span>
            <input id="se-tools-filter" type="search" placeholder="Filter tools..."
              class="w-44 bg-surface-base text-text-primary text-body-sm pl-9 pr-3 py-1.5 rounded-lg border border-border-subtle focus:border-primary outline-none" />
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        ${PHASES.map((phase, i) => `
          <section class="flex flex-col gap-3" data-phase="${phase.id}">
            <header class="relative flex items-center gap-3 px-3 py-3 rounded-xl bg-surface-panel border border-border-subtle">
              <span class="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                <span class="material-symbols-outlined text-[18px]">${phase.icon}</span>
              </span>
              <div class="min-w-0">
                <div class="font-jetbrains text-[10px] text-text-muted tracking-wider">PHASE ${phase.step}</div>
                <div class="font-geist text-body-md font-bold text-text-primary leading-tight">${phase.title}</div>
                <div class="text-[11px] text-text-muted truncate">${phase.blurb}</div>
              </div>
              ${i < PHASES.length - 1 ? '<span class="material-symbols-outlined hidden xl:block absolute -right-[18px] top-1/2 -translate-y-1/2 text-text-muted text-[20px] z-10">chevron_right</span>' : ''}
            </header>
            ${TOOLS.filter(t => t.phase === phase.id).map(toolCard).join('')}
          </section>
        `).join('')}
      </div>
      <p id="se-tools-empty" class="hidden text-center text-body-sm text-text-muted py-10">No tools match that filter.</p>
    </div>
  `;

  const input = container.querySelector('#se-tools-filter');
  input?.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    let shown = 0;
    container.querySelectorAll('.se-tool-card').forEach(card => {
      const match = !q || card.dataset.name.includes(q) || card.textContent.toLowerCase().includes(q);
      card.classList.toggle('hidden', !match);
      if (match) shown++;
    });
    container.querySelector('#se-tools-empty').classList.toggle('hidden', shown > 0);
  });
}
