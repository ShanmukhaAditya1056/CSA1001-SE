import fs from 'fs';

const filePath = 'src/pages/settings.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add import
if (!content.includes("from '../webhooks.js'")) {
  content = content.replace(
    "import { formatDate, formatDateTime, showToast, showModal, closeModal } from '../ui.js';",
    "import { formatDate, formatDateTime, showToast, showModal, closeModal, escapeHtml } from '../ui.js';\r\nimport { getWebhooks, saveWebhook, deleteWebhook, toggleWebhook, testWebhook, getWebhookDeliveries, WEBHOOK_EVENT_TYPES, SERVICE_PRESETS } from '../webhooks.js';"
  );
}

// 2. Add the Webhooks section into the HTML
const targetGridEnd = '        </div>\r\n      </div>\r\n    </div>\r\n  `;';
const altTargetGridEnd = '        </div>\n      </div>\n    </div>\n  `;';

const webhooksSectionHtml = `        </div>
      </div>

      <!-- Integrations & Outbound Webhooks Hub -->
      <div class="mt-8 bg-surface-canvas border border-border-subtle rounded-xl p-6 shadow-sm" id="webhooks-hub-container">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-border-subtle">
          <div>
            <h2 class="font-geist text-headline-sm font-bold text-text-primary flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-[22px]">hub</span>
              <span>Outbound Webhooks & CI/CD Integrations</span>
            </h2>
            <p class="text-body-xs text-text-muted mt-0.5">
              Dispatch real-time event payloads to Slack channels, Discord bots, Microsoft Teams, and custom DevOps pipelines.
            </p>
          </div>
          <button id="add-webhook-btn" class="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary hover:bg-primary-fixed text-on-primary font-semibold text-body-xs transition-all shadow-sm cursor-pointer active:scale-95 self-start sm:self-center">
            <span class="material-symbols-outlined text-[16px]">add_link</span>
            <span>+ Register Webhook Endpoint</span>
          </button>
        </div>

        <!-- Webhook Roster List -->
        <div class="space-y-3 mb-6" id="webhooks-roster-list"></div>

        <!-- Recent Delivery Stream -->
        <div class="pt-4 border-t border-border-subtle">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-geist text-label-md font-bold text-text-primary flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px] text-secondary">history</span>
              <span>Recent Webhook Delivery Audit</span>
            </h3>
            <span class="text-[11px] font-mono text-text-muted">Live outbound event dispatch log</span>
          </div>
          <div id="webhook-deliveries-list" class="space-y-2"></div>
        </div>
      </div>
    </div>
  \`;`;

if (!content.includes('id="webhooks-hub-container"')) {
  if (content.includes(targetGridEnd)) {
    content = content.replace(targetGridEnd, webhooksSectionHtml.replace(/\n/g, '\r\n'));
  } else if (content.includes(altTargetGridEnd)) {
    content = content.replace(altTargetGridEnd, webhooksSectionHtml);
  }
}

// 3. Add controller initialization call in renderSettings
const targetInitHook = "container.querySelector('#project-settings-form')?.addEventListener('submit', (e) => {";
const replacementInitHook = `initWebhooksHub(container, project.id);

  container.querySelector('#project-settings-form')?.addEventListener('submit', (e) => {`;

if (!content.includes('initWebhooksHub(container, project.id);')) {
  content = content.replace(targetInitHook, replacementInitHook);
}

// 4. Append controller and modals at the end of file
const webhooksControllerCode = `

// =============================================================
// WEBHOOKS HUB CONTROLLER & MODALS
// =============================================================

function initWebhooksHub(container, projectId) {
  renderWebhooksRoster(container, projectId);
  renderDeliveriesStream(container, projectId);

  container.querySelector('#add-webhook-btn')?.addEventListener('click', () => {
    openWebhookEditModal(projectId, null, () => {
      renderWebhooksRoster(container, projectId);
      renderDeliveriesStream(container, projectId);
    });
  });
}

function renderWebhooksRoster(container, projectId) {
  const listEl = container.querySelector('#webhooks-roster-list');
  if (!listEl) return;

  const webhooks = getWebhooks(projectId);
  if (webhooks.length === 0) {
    listEl.innerHTML = \`
      <div class="p-8 text-center border border-border-subtle border-dashed rounded-xl font-jetbrains text-body-xs text-text-muted">
        No webhook endpoints registered yet. Click <span class="text-primary font-semibold">+ Register Webhook Endpoint</span> to connect Slack, Discord, or Teams.
      </div>
    \`;
    return;
  }

  const serviceBadges = {
    slack: { name: 'Slack', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: 'forum' },
    discord: { name: 'Discord', color: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30', icon: 'smart_toy' },
    teams: { name: 'MS Teams', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30', icon: 'groups' },
    custom: { name: 'Custom HTTP', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30', icon: 'http' }
  };

  listEl.innerHTML = webhooks.map(wh => {
    const s = serviceBadges[wh.serviceType] || serviceBadges.custom;
    const urlDisplay = wh.url.length > 45 ? wh.url.slice(0, 32) + '...' + wh.url.slice(-10) : wh.url;

    return \`
      <div class="p-4 rounded-xl bg-surface-base border border-border-subtle hover:border-border-strong transition-all font-jetbrains">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div class="flex items-start gap-3 min-w-0">
            <div class="w-9 h-9 rounded-lg bg-surface-panel flex items-center justify-center shrink-0 mt-0.5 border border-border-subtle">
              <span class="material-symbols-outlined text-[20px] text-primary">\${s.icon}</span>
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap mb-1">
                <span class="font-inter font-bold text-body-md text-text-primary">\${escapeHtml(wh.name)}</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold border \${s.color}">\${s.name}</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold \${wh.active ? 'bg-status-passed-surface text-status-passed border border-status-passed/30' : 'bg-surface-elevated text-text-muted border border-border-subtle'}">
                  \${wh.active ? 'ACTIVE' : 'PAUSED'}
                </span>
              </div>
              <div class="text-[11px] text-text-muted font-mono truncate" title="\${escapeHtml(wh.url)}">
                Endpoint: <span class="text-text-secondary">\${escapeHtml(urlDisplay)}</span>
              </div>
              <div class="flex items-center gap-1.5 flex-wrap mt-2">
                \${wh.events.map(evt => \`
                  <span class="px-2 py-0.5 rounded bg-surface-panel text-text-muted text-[10px] font-mono border border-border-subtle">
                    \${evt}
                  </span>
                \`).join('')}
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 self-end md:self-center shrink-0">
            <button class="btn-test-webhook flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-primary text-[11px] font-medium border border-border-subtle transition-all cursor-pointer active:scale-95" data-id="\${wh.id}" title="Send simulated test ping">
              <span class="material-symbols-outlined text-[14px] text-secondary">send</span>
              <span>Test Ping</span>
            </button>
            <button class="btn-toggle-webhook flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-secondary text-[11px] font-medium border border-border-subtle transition-all cursor-pointer active:scale-95" data-id="\${wh.id}" data-active="\${wh.active}">
              <span class="material-symbols-outlined text-[14px]">\${wh.active ? 'pause' : 'play_arrow'}</span>
              <span>\${wh.active ? 'Pause' : 'Resume'}</span>
            </button>
            <button class="btn-edit-webhook p-1.5 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-secondary hover:text-text-primary border border-border-subtle transition-all cursor-pointer active:scale-95" data-id="\${wh.id}" title="Edit Webhook">
              <span class="material-symbols-outlined text-[16px]">edit</span>
            </button>
            <button class="btn-delete-webhook p-1.5 rounded-lg bg-status-defect-surface hover:bg-status-defect/20 text-status-defect border border-status-defect/30 transition-all cursor-pointer active:scale-95" data-id="\${wh.id}" title="Delete Webhook">
              <span class="material-symbols-outlined text-[16px]">delete</span>
            </button>
          </div>
        </div>

        <div class="flex items-center justify-between text-[10px] text-text-muted pt-2.5 mt-2.5 border-t border-border-subtle/50">
          <span>Created \${formatDate(wh.createdAt)}</span>
          <span class="flex items-center gap-1.5">
            <span>Last Delivery:</span>
            <strong class="text-text-secondary">\${wh.lastStatus || 'No dispatches yet'}</strong>
            \${wh.lastTriggeredAt ? \`(\${formatDateTime(wh.lastTriggeredAt)})\` : ''}
          </span>
        </div>
      </div>
    \`;
  }).join('');

  // Attach action handlers
  listEl.querySelectorAll('.btn-test-webhook').forEach(btn => {
    btn.addEventListener('click', () => {
      openWebhookTestModal(projectId, btn.dataset.id, () => {
        renderWebhooksRoster(container, projectId);
        renderDeliveriesStream(container, projectId);
      });
    });
  });

  listEl.querySelectorAll('.btn-toggle-webhook').forEach(btn => {
    btn.addEventListener('click', () => {
      const isCurrentlyActive = btn.dataset.active === 'true';
      toggleWebhook(projectId, btn.dataset.id, !isCurrentlyActive);
      showToast(isCurrentlyActive ? 'Webhook paused' : 'Webhook activated', 'info');
      renderWebhooksRoster(container, projectId);
    });
  });

  listEl.querySelectorAll('.btn-edit-webhook').forEach(btn => {
    btn.addEventListener('click', () => {
      openWebhookEditModal(projectId, btn.dataset.id, () => {
        renderWebhooksRoster(container, projectId);
        renderDeliveriesStream(container, projectId);
      });
    });
  });

  listEl.querySelectorAll('.btn-delete-webhook').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Delete this webhook endpoint configuration?')) {
        deleteWebhook(projectId, btn.dataset.id);
        showToast('Webhook deleted', 'info');
        renderWebhooksRoster(container, projectId);
        renderDeliveriesStream(container, projectId);
      }
    });
  });
}

function renderDeliveriesStream(container, projectId) {
  const deliveriesEl = container.querySelector('#webhook-deliveries-list');
  if (!deliveriesEl) return;

  const deliveries = getWebhookDeliveries(projectId);
  if (deliveries.length === 0) {
    deliveriesEl.innerHTML = \`
      <div class="p-3 rounded-lg bg-surface-base text-center text-[11px] font-mono text-text-muted">
        No webhook delivery transactions recorded in this session.
      </div>
    \`;
    return;
  }

  deliveriesEl.innerHTML = deliveries.slice(0, 5).map(d => \`
    <div class="p-2.5 rounded-lg bg-surface-base border border-border-subtle flex items-center justify-between gap-3 text-body-xs font-jetbrains">
      <div class="flex items-center gap-2 min-w-0">
        <span class="w-2 h-2 rounded-full bg-status-passed shrink-0"></span>
        <span class="font-bold text-text-primary truncate">\${escapeHtml(d.webhookName)}</span>
        <span class="px-1.5 py-0.2 rounded bg-surface-panel text-text-muted text-[10px] font-mono">\${escapeHtml(d.eventType)}</span>
      </div>
      <div class="flex items-center gap-3 shrink-0 text-[11px]">
        <span class="text-status-passed font-semibold">\${escapeHtml(d.status)}</span>
        <span class="text-text-muted">\${formatDateTime(d.timestamp)}</span>
      </div>
    </div>
  \`).join('');
}

export function openWebhookEditModal(projectId, webhookId = null, onSaved) {
  const isEdit = Boolean(webhookId);
  const webhooks = getWebhooks(projectId);
  const existing = isEdit ? webhooks.find(w => w.id === webhookId) : null;

  const currentType = existing?.serviceType || 'slack';
  const currentEvents = existing?.events || ['defect.created', 'release.promoted'];

  const content = \`
    <form id="webhook-edit-form" class="space-y-4">
      <div>
        <label class="block text-label-sm text-text-secondary mb-1">Integration Target Platform *</label>
        <select id="wh-service-type" class="w-full bg-surface-base text-text-primary text-body-sm px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none">
          \${SERVICE_PRESETS.map(p => \`
            <option value="\${p.id}" \${currentType === p.id ? 'selected' : ''}>\${p.name}</option>
          \`).join('')}
        </select>
      </div>

      <div>
        <label class="block text-label-sm text-text-secondary mb-1">Integration Name *</label>
        <input type="text" id="wh-name" required value="\${escapeHtml(existing?.name || '')}" placeholder="e.g. Slack #incident-response"
          class="w-full bg-surface-base text-text-primary text-body-sm px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none" />
      </div>

      <div>
        <label class="block text-label-sm text-text-secondary mb-1">Webhook Target URL *</label>
        <input type="url" id="wh-url" required value="\${escapeHtml(existing?.url || '')}" placeholder="https://hooks.slack.com/services/..."
          class="w-full bg-surface-base text-text-primary font-jetbrains text-body-xs px-3 py-2 rounded-lg border border-border-subtle focus:border-primary outline-none" />
      </div>

      <div>
        <label class="block text-label-sm text-text-secondary mb-1">Subscribed Event Triggers</label>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          \${WEBHOOK_EVENT_TYPES.map(evt => \`
            <label class="flex items-center gap-2 p-2 rounded-lg bg-surface-base border border-border-subtle text-body-xs cursor-pointer hover:bg-surface-panel transition-colors">
              <input type="checkbox" name="wh-events" value="\${evt.id}" \${currentEvents.includes(evt.id) ? 'checked' : ''}
                class="rounded border-border-subtle text-primary focus:ring-primary w-4 h-4 cursor-pointer" />
              <div>
                <div class="font-medium text-text-primary">\${evt.label}</div>
                <div class="text-[10px] text-text-muted">\${evt.description}</div>
              </div>
            </label>
          \`).join('')}
        </div>
      </div>

      <div class="flex justify-end gap-2.5 pt-3 border-t border-border-subtle">
        <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel text-text-secondary hover:bg-surface-elevated text-body-sm cursor-pointer">Cancel</button>
        <button type="submit" class="px-4 py-2 rounded-lg bg-primary hover:bg-primary-fixed text-on-primary font-semibold text-body-sm transition-all shadow-sm cursor-pointer active:scale-95">
          \${isEdit ? 'Save Changes' : 'Register Webhook'}
        </button>
      </div>
    </form>
  \`;

  showModal(content, { title: isEdit ? 'Configure Webhook Endpoint' : 'Register New Outbound Webhook', width: 'max-w-2xl' });

  const form = document.getElementById('webhook-edit-form');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const serviceType = document.getElementById('wh-service-type').value;
    const name = document.getElementById('wh-name').value.trim();
    const url = document.getElementById('wh-url').value.trim();
    const checkedEvents = Array.from(form.querySelectorAll('input[name="wh-events"]:checked')).map(el => el.value);

    const res = saveWebhook(projectId, {
      ...(existing || {}),
      name,
      url,
      serviceType,
      events: checkedEvents
    });

    if (res.error) {
      showToast(res.error, 'error');
      return;
    }

    closeModal();
    showToast(isEdit ? 'Webhook configuration saved!' : 'Webhook endpoint registered!', 'success');
    if (onSaved) onSaved();
  });
}

export function openWebhookTestModal(projectId, webhookId, onCompleted) {
  const webhooks = getWebhooks(projectId);
  const wh = webhooks.find(w => w.id === webhookId);
  if (!wh) {
    showToast('Webhook not found', 'error');
    return;
  }

  showModal(\`
    <div class="space-y-4 max-h-[80vh] overflow-y-auto pr-1" id="webhook-test-container">
      <div class="p-3.5 rounded-xl bg-surface-panel border border-border-subtle flex items-center justify-between gap-3 font-jetbrains">
        <div>
          <div class="text-[11px] text-text-muted uppercase">TESTING OUTBOUND WEBHOOK</div>
          <div class="text-body-md font-bold text-text-primary">\${escapeHtml(wh.name)}</div>
        </div>
        <button id="btn-fire-test-ping" class="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-fixed text-on-primary text-body-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm transition-all">
          <span class="material-symbols-outlined text-[16px]">send</span>
          <span>Dispatch Test Ping</span>
        </button>
      </div>

      <div id="test-results-area" class="space-y-3">
        <div class="p-6 text-center text-text-muted text-body-xs font-jetbrains">
          Click <strong>Dispatch Test Ping</strong> to transmit a simulated live quality gate event to this endpoint.
        </div>
      </div>

      <div class="flex justify-end pt-2 border-t border-border-subtle">
        <button type="button" onclick="window.__closeModal()" class="px-4 py-2 rounded-lg bg-surface-panel hover:bg-surface-elevated text-text-primary text-body-sm cursor-pointer">Close</button>
      </div>
    </div>
  \`, { title: 'Webhook Dispatcher & Payload Inspector', width: 'max-w-2xl' });

  const btn = document.getElementById('btn-fire-test-ping');
  const resultsArea = document.getElementById('test-results-area');

  btn?.addEventListener('click', async () => {
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined text-[16px] animate-spin">refresh</span> Dispatching...';

    const testRes = await testWebhook(projectId, webhookId, 'defect.created');

    resultsArea.innerHTML = \`
      <div class="p-3.5 rounded-xl bg-status-passed-surface/30 border border-status-passed/40 space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-status-passed font-jetbrains text-label-sm font-bold flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[16px]">check_circle</span>
            <span>Delivery Successful: \${testRes.status}</span>
          </span>
          <span class="text-[11px] font-mono text-text-muted">\${formatDateTime(testRes.timestamp)}</span>
        </div>
        <p class="text-body-xs text-text-secondary">Payload successfully encoded in \${wh.serviceType.toUpperCase()} format and dispatched.</p>
      </div>

      <div>
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-label-sm font-bold text-text-primary">Transmitted JSON Payload</span>
          <button id="copy-test-payload-btn" class="text-primary hover:underline text-[11px] font-mono cursor-pointer">Copy JSON</button>
        </div>
        <pre class="p-3 rounded-xl bg-surface-base border border-border-subtle font-jetbrains text-[11px] text-text-secondary overflow-x-auto max-h-[240px] whitespace-pre-wrap select-all">\${escapeHtml(JSON.stringify(testRes.payload, null, 2))}</pre>
      </div>
    \`;

    document.getElementById('copy-test-payload-btn')?.addEventListener('click', () => {
      navigator.clipboard?.writeText(JSON.stringify(testRes.payload, null, 2)).then(() => {
        showToast('Payload copied to clipboard!', 'success');
      });
    });

    btn.disabled = false;
    btn.innerHTML = '<span class="material-symbols-outlined text-[16px]">check</span> Dispatched!';
    if (onCompleted) onCompleted();
  });
}
`;

if (!content.includes('function initWebhooksHub')) {
  content = content + webhooksControllerCode;
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully injected Webhooks Hub into settings.js');

