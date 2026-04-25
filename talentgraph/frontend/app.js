/* ============================================================
   TalentGraph AI — Application Logic
   Connects to FastAPI backend at http://localhost:8000
   ============================================================ */

'use strict';

const BASE_URL = 'http://localhost:8000';

/* ── App State ────────────────────────────────────────────── */
const state = {
  phase: 1,
  candidateId: '',
  sanitizedText: '',
  tcfeMetrics: null,
  selectedFile: null,
  evaluationResult: null,
};

/* ─────────────────────────────────────────────────────────── */
/*  INIT                                                        */
/* ─────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  generateCandidateId();
  setupDropZone();
  startHealthPolling();
  setupFileInput();
});

function generateCandidateId() {
  const id = `CAND-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,5).toUpperCase()}`;
  state.candidateId = id;
  const inp = document.getElementById('candidate-id-input');
  if (inp) inp.value = id;
}

function regenerateCandidateId() {
  generateCandidateId();
  showToast('New Candidate ID generated', 'info');
}

/* ─────────────────────────────────────────────────────────── */
/*  HEALTH POLLING                                              */
/* ─────────────────────────────────────────────────────────── */
async function startHealthPolling() {
  await pollHealth();
  setInterval(pollHealth, 5000);
}

async function pollHealth() {
  const statusEl  = document.getElementById('system-status');
  const statusTxt = document.getElementById('status-text');
  try {
    const res  = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(4000) });
    const data = await res.json();
    if (data.status === 'online') {
      statusEl.className  = 'status-indicator status-online';
      statusTxt.textContent = 'System Online';
    } else { throw new Error('not online'); }
  } catch (_) {
    if (statusEl) {
      statusEl.className  = 'status-indicator status-offline';
      statusTxt.textContent = 'System Offline';
    }
  }
}

/* ─────────────────────────────────────────────────────────── */
/*  DROP ZONE & FILE INPUT                                      */
/* ─────────────────────────────────────────────────────────── */
function setupDropZone() {
  const zone = document.getElementById('drop-zone');
  if (!zone) return;

  ['dragenter', 'dragover'].forEach(evt =>
    zone.addEventListener(evt, e => { e.preventDefault(); zone.classList.add('drag-over'); }));
  ['dragleave', 'drop'].forEach(evt =>
    zone.addEventListener(evt, e => { e.preventDefault(); zone.classList.remove('drag-over'); }));

  zone.addEventListener('drop', e => {
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelected(file);
  });
}

function setupFileInput() {
  const inp = document.getElementById('resume-file-input');
  if (!inp) return;
  inp.addEventListener('change', () => {
    if (inp.files[0]) handleFileSelected(inp.files[0]);
  });
}

function handleFileSelected(file) {
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    showToast('Only PDF files are accepted.', 'error');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showToast('File exceeds 10MB limit.', 'error');
    return;
  }
  state.selectedFile = file;

  document.getElementById('file-name-display').textContent = file.name;
  document.getElementById('file-size-display').textContent = formatBytes(file.size);
  document.getElementById('file-info').classList.remove('hidden');
  document.getElementById('parse-btn').disabled = false;
}

function clearFile() {
  state.selectedFile = null;
  document.getElementById('resume-file-input').value = '';
  document.getElementById('file-info').classList.add('hidden');
  document.getElementById('parse-btn').disabled = true;
  document.getElementById('parse-result').classList.add('hidden');
}

/* ─────────────────────────────────────────────────────────── */
/*  PHASE 1: UPLOAD & PARSE RESUME                             */
/* ─────────────────────────────────────────────────────────── */
async function uploadResume() {
  if (!state.selectedFile) { showToast('Please select a PDF first.', 'error'); return; }

  // Read candidate ID from input (user may have edited it)
  const idInput = document.getElementById('candidate-id-input');
  if (idInput && idInput.value.trim()) state.candidateId = idInput.value.trim();

  setParseLoading(true, 'Parsing PDF…');

  const formData = new FormData();
  formData.append('file', state.selectedFile);

  try {
    const res = await fetch(`${BASE_URL}/parse-resume`, { method: 'POST', body: formData });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Parse failed');
    }
    const data = await res.json();
    setParseLoading(false, '');
    handleParseSuccess(data);
    showToast('Resume parsed successfully!', 'success');
  } catch (err) {
    setParseLoading(false, '');
    showToast(`Parse error: ${err.message}`, 'error');
  }
}

function handleParseSuccess(data) {
  state.sanitizedText = data.sanitized_text || '';
  state.tcfeMetrics   = data.tcfe_metrics   || null;

  // Show result card
  const resultEl = document.getElementById('parse-result');
  resultEl.classList.remove('hidden');

  // Message
  document.getElementById('parse-message').textContent = data.message || '';

  // Role badge
  const isTech = !data.message?.toLowerCase().includes('non-technical');
  document.getElementById('role-badge').innerHTML = isTech
    ? `<span class="badge badge-green">✓ Technical Role</span>`
    : `<span class="badge badge-amber">⚠ Non-Technical</span>`;

  // GitHub
  const ghEl = document.getElementById('github-display');
  if (data.github_url) {
    ghEl.innerHTML = `<a href="${data.github_url}" target="_blank" style="color:var(--accent-primary);">${data.github_url}</a>`;
  } else {
    ghEl.innerHTML = `<span style="color:var(--text-muted);">No GitHub URL detected</span>`;
  }

  // TCFE
  const tcfeSection = document.getElementById('tcfe-section');
  if (data.tcfe_metrics) {
    tcfeSection.classList.remove('hidden');
    const m = data.tcfe_metrics;
    renderMiniGauge('gauge-continuity', m.continuity_score, '#38bdf8');
    renderMiniGauge('gauge-burst',      m.burst_score,      '#a78bfa');
    renderMiniGauge('gauge-quality',    m.quality_multiplier, '#34d399');

    document.getElementById('tcfe-burst-badge').innerHTML = m.burst_detected
      ? `<span class="badge badge-green">⚡ Burst Detected</span>`
      : `<span class="badge badge-blue">Stable</span>`;
    document.getElementById('tcfe-bot-badge').innerHTML = m.bot_behavior_detected
      ? `<span class="badge badge-red">🤖 Bot Detected</span>`
      : `<span class="badge badge-green">✓ Clean</span>`;
  } else {
    tcfeSection.classList.add('hidden');
  }
}

function setParseLoading(loading, msg) {
  const btn     = document.getElementById('parse-btn');
  const spinner = document.getElementById('parse-spinner');
  const txt     = document.getElementById('parse-status-text');
  btn.disabled  = loading;
  spinner.classList.toggle('hidden', !loading);
  txt.textContent = msg;
}

function proceedToPhase2() {
  setPhase(2);
  const p2id = document.getElementById('phase2-cand-id');
  if (p2id) p2id.textContent = state.candidateId;
}

function backToPhase1() {
  setPhase(1);
}

/* ─────────────────────────────────────────────────────────── */
/*  PHASE 2: EMBED + EVALUATE                                   */
/* ─────────────────────────────────────────────────────────── */
async function runEvaluation() {
  const jd = document.getElementById('job-description').value.trim();
  if (!jd) { showToast('Please enter a Job Description.', 'error'); return; }
  if (!state.sanitizedText) { showToast('No resume text. Please upload again.', 'error'); return; }

  setEvalLoading(true, 'Embedding document…');

  try {
    // Step 1 — Embed
    const embedRes = await fetch(`${BASE_URL}/embed-store`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidate_id:    state.candidateId,
        sanitized_text:  state.sanitizedText,
        metadata:        {},
      }),
    });
    if (!embedRes.ok) {
      const err = await embedRes.json().catch(() => ({}));
      throw new Error(err.detail || 'Embedding failed');
    }

    setEvalLoading(true, 'Running LLM evaluation…');

    // Step 2 — Evaluate
    const evalRes = await fetch(`${BASE_URL}/evaluate-candidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidate_id:    state.candidateId,
        job_description: jd,
        pow_data:        state.tcfeMetrics || {},
      }),
    });
    if (!evalRes.ok) {
      const err = await evalRes.json().catch(() => ({}));
      throw new Error(err.detail || 'Evaluation failed');
    }

    state.evaluationResult = await evalRes.json();
    setEvalLoading(false, '');
    showToast('Evaluation complete!', 'success');
    renderResults(state.evaluationResult);
    setPhase(3);

  } catch (err) {
    setEvalLoading(false, '');
    showToast(`Evaluation error: ${err.message}`, 'error');
  }
}

function setEvalLoading(loading, msg) {
  const btn     = document.getElementById('evaluate-btn');
  const spinner = document.getElementById('eval-spinner');
  const txt     = document.getElementById('eval-status-text');
  btn.disabled  = loading;
  spinner.classList.toggle('hidden', !loading);
  txt.textContent = msg;
}

/* ─────────────────────────────────────────────────────────── */
/*  PHASE 3: RENDER RESULTS                                     */
/* ─────────────────────────────────────────────────────────── */
function renderResults(data) {
  const tv    = data.temporal_velocity;
  const score = tv.final_weighted_score;
  const scores = data.scores;

  // Candidate ID label
  const lbl = document.getElementById('result-cand-id-label');
  if (lbl) lbl.textContent = `Candidate: ${data.candidate_id}`;

  // Final score gauge
  const color = score >= 70 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171';
  renderMainGauge(score, color);
  const numEl = document.getElementById('final-score-number');
  if (numEl) { numEl.textContent = score.toFixed(1); numEl.style.color = color; }

  // Velocity badges
  const vbadge = document.getElementById('velocity-badge');
  const vmult  = document.getElementById('velocity-multiplier');
  if (tv.status === 'Accelerated') {
    vbadge.className = 'badge badge-green';
    vbadge.textContent = '⚡ Accelerated';
  } else {
    vbadge.className = 'badge badge-blue';
    vbadge.textContent = '🔵 Stable';
  }
  if (vmult) {
    vmult.textContent = tv.multiplier_applied > 0
      ? `+${(tv.multiplier_applied * 100).toFixed(1)}% velocity bonus`
      : 'No velocity bonus';
  }

  // Score breakdown
  const grid = document.getElementById('score-breakdown-grid');
  if (grid) {
    grid.innerHTML = '';
    const items = [
      { label: 'Semantic Skill',  value: scores.semantic_skill_score_40, max: 40, color: '#38bdf8' },
      { label: 'PoW Depth',       value: scores.pow_depth_score_30,      max: 30, color: '#a78bfa' },
      { label: 'Experience',      value: scores.experience_score_15,     max: 15, color: '#34d399' },
      { label: 'Keywords',        value: scores.keyword_score_15,        max: 15, color: '#fbbf24' },
    ];
    items.forEach(item => {
      const pct = Math.round((item.value / item.max) * 100);
      grid.innerHTML += `
        <div class="score-card">
          <div class="score-card-label">${item.label}</div>
          <div class="score-card-value" style="color:${item.color};">${item.value != null ? item.value.toFixed(1) : '—'}</div>
          <div class="score-card-max">out of ${item.max}</div>
          <div class="progress-bar-wrapper" style="margin-top: 0.75rem;">
            <div class="progress-bar-fill" style="width: ${pct}%; background: linear-gradient(90deg, ${item.color}88, ${item.color}); box-shadow: 0 0 8px ${item.color}44;"></div>
          </div>
        </div>`;
    });
  }

  // XAI
  const xaiEl = document.getElementById('xai-text');
  if (xaiEl) xaiEl.textContent = data.explanation || '—';

  // Gap Analysis
  const gap = data.gap_analysis;
  if (gap) {
    const barEl = document.getElementById('coverage-bar');
    const pctLbl = document.getElementById('coverage-pct-label');
    const pct = gap.coverage_percentage || 0;
    if (barEl) {
      barEl.style.width = `${pct}%`;
      barEl.className = 'progress-bar-fill ' +
        (pct >= 70 ? 'green' : pct >= 40 ? 'amber' : 'red');
    }
    if (pctLbl) pctLbl.textContent = `${pct}%`;

    renderTagList('gap-overlaps', gap.overlaps   || [], 'skill-tag-match');
    renderTagList('gap-gaps',     gap.gaps        || [], 'skill-tag-gap');
    renderTagList('gap-extras',   gap.extra_skills|| [], 'skill-tag-extra');
  }

  // D3 Graph
  if (data.graph_data) {
    setTimeout(() => renderD3Graph(data.graph_data), 100);
  }
}

function renderTagList(containerId, tags, cls) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!tags.length) { el.innerHTML = '<span style="color:var(--text-muted);font-size:0.8rem;">—</span>'; return; }
  el.innerHTML = tags.map(t => `<span class="skill-tag ${cls}">${t}</span>`).join('');
}

/* ─────────────────────────────────────────────────────────── */
/*  SVG GAUGES                                                  */
/* ─────────────────────────────────────────────────────────── */
function renderMainGauge(score, color) {
  const svg = document.getElementById('main-gauge');
  if (!svg) return;
  const r = 75, cx = 90, cy = 90, sw = 14;
  const circ = 2 * Math.PI * r;
  const pct  = Math.min(1, score / 100);
  svg.innerHTML = `
    <defs>
      <filter id="glow">
        <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
        <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
      stroke="rgba(255,255,255,0.05)" stroke-width="${sw}"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
      stroke="${color}" stroke-width="${sw}" stroke-linecap="round"
      stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - pct)}"
      transform="rotate(-90 ${cx} ${cy})"
      filter="url(#glow)"
      style="transition: stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1);"/>
  `;
}

function renderMiniGauge(svgId, value, color) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  const r = 36, cx = 50, cy = 50, sw = 8;
  const circ = 2 * Math.PI * r;
  const pct  = Math.min(1, Math.max(0, value || 0));
  const label = (pct * 100).toFixed(0) + '%';
  svg.innerHTML = `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
      stroke="rgba(255,255,255,0.06)" stroke-width="${sw}"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
      stroke="${color}" stroke-width="${sw}" stroke-linecap="round"
      stroke-dasharray="${circ}" stroke-dashoffset="${circ * (1 - pct)}"
      transform="rotate(-90 ${cx} ${cy})"
      style="filter:drop-shadow(0 0 4px ${color}); transition: stroke-dashoffset 1s ease;"/>
    <text x="${cx}" y="${cy + 5}" text-anchor="middle"
      fill="#e2e8f0" font-family="Outfit,sans-serif" font-size="13" font-weight="700">${label}</text>
  `;
}

/* ─────────────────────────────────────────────────────────── */
/*  D3.JS FORCE GRAPH                                           */
/* ─────────────────────────────────────────────────────────── */
function renderD3Graph(graphData) {
  const container = document.getElementById('graph-container');
  if (!container || typeof d3 === 'undefined') return;

  const width  = container.clientWidth  || 800;
  const height = container.clientHeight || 520;

  // Clear previous
  d3.select('#d3-graph').selectAll('*').remove();

  // Deep-clone to avoid D3 mutating original data
  const nodes = graphData.nodes.map(n => ({ ...n }));
  const linksRaw = (graphData.links || graphData.edges || []).map(l => ({ ...l }));

  // Build id->node map for link resolution
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const links = linksRaw.map(l => ({
    source: typeof l.source === 'object' ? l.source.id : l.source,
    target: typeof l.target === 'object' ? l.target.id : l.target,
  })).filter(l => nodeMap.has(l.source) && nodeMap.has(l.target));

  const svg = d3.select('#d3-graph')
    .attr('width',  width)
    .attr('height', height);

  // Zoom layer
  const g = svg.append('g');
  svg.call(
    d3.zoom()
      .scaleExtent([0.3, 3])
      .on('zoom', e => g.attr('transform', e.transform))
  );

  // Colour by group
  const colorMap = {
    central:        '#38bdf8',
    match:          '#34d399',
    candidate_only: '#7dd3fc',
    gap:            '#f87171',
  };
  const glowMap = {
    central:        'rgba(56,189,248,0.8)',
    match:          'rgba(52,211,153,0.6)',
    candidate_only: 'rgba(125,211,252,0.4)',
    gap:            'rgba(248,113,113,0.6)',
  };
  const nodeRadius = d => d.group === 'central' ? 22 : 12;

  // Defs — glows
  const defs = svg.append('defs');
  ['central','match','candidate_only','gap'].forEach(grp => {
    const f = defs.append('filter').attr('id', `glow-${grp}`).attr('x','-50%').attr('y','-50%').attr('width','200%').attr('height','200%');
    f.append('feGaussianBlur').attr('stdDeviation', grp === 'central' ? 6 : 3).attr('result','coloredBlur');
    const merge = f.append('feMerge');
    merge.append('feMergeNode').attr('in','coloredBlur');
    merge.append('feMergeNode').attr('in','SourceGraphic');
  });

  // Simulation
  const simulation = d3.forceSimulation(nodes)
    .force('link',    d3.forceLink(links).id(d => d.id).distance(90))
    .force('charge',  d3.forceManyBody().strength(-280))
    .force('center',  d3.forceCenter(width / 2, height / 2))
    .force('collide', d3.forceCollide(d => nodeRadius(d) + 10));

  // Links
  const linkGroup = g.append('g').attr('class', 'links');
  const linkEl = linkGroup.selectAll('line')
    .data(links)
    .join('line')
    .attr('stroke', 'rgba(148,163,184,0.2)')
    .attr('stroke-width', 1.5);

  // Nodes
  const nodeGroup = g.append('g').attr('class', 'nodes');
  const nodeEl = nodeGroup.selectAll('g')
    .data(nodes)
    .join('g')
    .attr('class', 'node-group')
    .call(
      d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on('drag',  (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on('end',   (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null; d.fy = null;
        })
    );

  // Background circle (glow ring for central)
  nodeEl.filter(d => d.group === 'central')
    .append('circle')
    .attr('r', d => nodeRadius(d) + 8)
    .attr('fill', 'none')
    .attr('stroke', d => colorMap[d.group] || '#38bdf8')
    .attr('stroke-width', 1)
    .attr('stroke-opacity', 0.3);

  // Main circle
  nodeEl.append('circle')
    .attr('r', nodeRadius)
    .attr('fill', d => colorMap[d.group] || '#94a3b8')
    .attr('filter', d => `url(#glow-${d.group})`)
    .attr('stroke', d => (colorMap[d.group] || '#94a3b8') + '66')
    .attr('stroke-width', 2)
    .style('cursor', 'grab');

  // Labels
  nodeEl.append('text')
    .attr('dy', d => d.group === 'central' ? -28 : -16)
    .attr('text-anchor', 'middle')
    .attr('font-family', 'JetBrains Mono, monospace')
    .attr('font-size',  d => d.group === 'central' ? 11 : 10)
    .attr('font-weight', d => d.group === 'central' ? '700' : '500')
    .attr('fill', d => colorMap[d.group] || '#94a3b8')
    .attr('pointer-events', 'none')
    .text(d => d.id);

  // Tick
  simulation.on('tick', () => {
    linkEl
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    nodeEl.attr('transform', d => `translate(${d.x},${d.y})`);
  });
}

/* ─────────────────────────────────────────────────────────── */
/*  PHASE NAVIGATION                                            */
/* ─────────────────────────────────────────────────────────── */
function setPhase(n) {
  state.phase = n;

  // Content sections
  [1, 2, 3].forEach(i => {
    const el = document.getElementById(`phase-${i}-content`);
    if (el) el.classList.toggle('hidden', i !== n);
  });

  // Stepper
  [1, 2, 3].forEach(i => {
    const step = document.getElementById(`step-${i}`);
    if (!step) return;
    step.classList.remove('active', 'done');
    if (i < n)      step.classList.add('done');
    else if (i === n) step.classList.add('active');
  });
  [1, 2].forEach(i => {
    const conn = document.getElementById(`connector-${i}`);
    if (!conn) return;
    conn.classList.remove('done', 'active');
    if (i < n)      conn.classList.add('done');
    else if (i === n) conn.classList.add('active');
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetApp() {
  state.phase          = 1;
  state.candidateId    = '';
  state.sanitizedText  = '';
  state.tcfeMetrics    = null;
  state.selectedFile   = null;
  state.evaluationResult = null;

  clearFile();
  document.getElementById('parse-result').classList.add('hidden');
  document.getElementById('job-description').value = '';
  generateCandidateId();
  setPhase(1);
}

/* ─────────────────────────────────────────────────────────── */
/*  TOAST NOTIFICATIONS                                         */
/* ─────────────────────────────────────────────────────────── */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span style="font-size: 1rem; flex-shrink: 0;">${icons[type] || 'ℹ'}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 4200);
}

/* ─────────────────────────────────────────────────────────── */
/*  HELPERS                                                     */
/* ─────────────────────────────────────────────────────────── */
function formatBytes(bytes) {
  if (bytes < 1024)        return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
