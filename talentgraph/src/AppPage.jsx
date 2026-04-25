import { useState, useCallback, useRef } from 'react';
import { parseResume, embedStore, evaluateCandidate } from './api';
import { CircularGauge, MainGauge } from './Gauges';
import D3Graph from './D3Graph';

function genCandidateId() {
  return `CAND-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / (1024 * 1024)).toFixed(1) + ' MB';
}

/* ── Phase Stepper ─────────────────────────────────────────── */
function Stepper({ phase }) {
  const s = (n) => phase > n ? 'done' : phase === n ? 'active' : '';
  return (
    <div className="phase-stepper">
      {[['1','Upload Resume'],['2','Job Description'],['3','AI Report']].map(([n, label], i) => (
        <>
          <div className={`step-item ${s(+n)}`} key={n}>
            <div className="step-circle">{phase > +n ? '✓' : n}</div>
            <div className="step-label">{label}</div>
          </div>
          {i < 2 && <div className={`step-connector ${phase > i+1 ? 'done' : phase === i+1 ? 'active' : ''}`} key={`conn-${i}`} />}
        </>
      ))}
    </div>
  );
}

/* ── Drop Zone ─────────────────────────────────────────────── */
function DropZone({ file, onFile, onClear }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  return (
    <>
      <div
        className={`drop-zone ${dragging ? 'drag-over' : ''}`}
        onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept=".pdf"
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%', zIndex:1 }}
          onChange={e => { if (e.target.files[0]) onFile(e.target.files[0]); }} />
        <span className="drop-zone-icon">☁️</span>
        <div className="drop-zone-title">Drag & Drop PDF here</div>
        <div className="drop-zone-sub">
          or <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>click to browse</span> — PDF only, max 10MB
        </div>
      </div>

      {file && (
        <div className="file-info-bar">
          <span style={{ fontSize: '1.5rem' }}>📎</span>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--accent-primary)', fontSize: '0.9rem' }}>{file.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatBytes(file.size)}</div>
          </div>
          <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }}
            onClick={(e) => { e.stopPropagation(); onClear(); }}>✕ Clear</button>
        </div>
      )}
    </>
  );
}

/* ── TCFE Metrics Panel ────────────────────────────────────── */
function TcfePanel({ metrics }) {
  if (!metrics) return null;
  return (
    <div>
      <div className="section-header" style={{ marginBottom: '1rem' }}>
        <div className="section-icon">⚡</div>
        <div>
          <div className="section-title">TCFE Metrics</div>
          <div className="section-sub">Temporal Commit Flow Engine</div>
        </div>
      </div>

      <div className="tcfe-gauge-row">
        <div className="mini-gauge-wrap">
          <CircularGauge value={metrics.continuity_score} max={1} color="#38bdf8" size={100} />
          <div className="mini-gauge-label">Continuity</div>
        </div>
        <div className="mini-gauge-wrap">
          <CircularGauge value={metrics.burst_score} max={1} color="#a78bfa" size={100} />
          <div className="mini-gauge-label">Burst Score</div>
        </div>
        <div className="mini-gauge-wrap">
          <CircularGauge value={metrics.quality_multiplier} max={1} color="#34d399" size={100} />
          <div className="mini-gauge-label">Quality ×</div>
        </div>
      </div>

      <div className="tcfe-stat-grid">
        <div className="tcfe-stat-item">
          <div className="tcfe-stat-label">Burst Detected</div>
          {metrics.burst_detected
            ? <span className="badge badge-green">⚡ Detected</span>
            : <span className="badge badge-blue">Stable</span>}
        </div>
        <div className="tcfe-stat-item">
          <div className="tcfe-stat-label">Bot Behavior</div>
          {metrics.bot_behavior_detected
            ? <span className="badge badge-red">🤖 Bot Detected</span>
            : <span className="badge badge-green">✓ Clean</span>}
        </div>
      </div>
    </div>
  );
}

/* ── Results Dashboard ────────────────────────────────────── */
function ResultsDashboard({ data, onReset }) {
  const tv    = data.temporal_velocity;
  const score = tv.final_weighted_score;
  const scoreColor = score >= 70 ? '#34d399' : score >= 50 ? '#fbbf24' : '#f87171';
  const gap   = data.gap_analysis;

  const scoreDefs = [
    { label: 'Semantic Skill', value: data.scores.semantic_skill_score_40, max: 40, color: '#38bdf8' },
    { label: 'PoW Depth',      value: data.scores.pow_depth_score_30,      max: 30, color: '#a78bfa' },
    { label: 'Experience',     value: data.scores.experience_score_15,     max: 15, color: '#34d399' },
    { label: 'Keywords',       value: data.scores.keyword_score_15,        max: 15, color: '#fbbf24' },
  ];

  const coveragePct = gap?.coverage_percentage || 0;
  const coverageCls = coveragePct >= 70 ? 'green' : coveragePct >= 40 ? 'amber' : 'red';

  return (
    <div className="phase-content">
      {/* Header */}
      <div className="result-actions">
        <div>
          <h2 style={{ fontFamily: 'Outfit', fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
            AI Matching Report
          </h2>
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Candidate: {data.candidate_id}
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onReset}>↺ New Evaluation</button>
      </div>

      {/* Final score hero */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', padding: 0 }}>
        <div className="final-score-section">
          <MainGauge score={score} color={scoreColor} />
          <div className="final-score-number" style={{ color: scoreColor }}>{score.toFixed(1)}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px', marginTop: '0.25rem' }}>
            Final Weighted Score
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <span className={`badge ${tv.status === 'Accelerated' ? 'badge-green' : 'badge-blue'}`}>
              {tv.status === 'Accelerated' ? '⚡ Accelerated' : '🔵 Stable'}
            </span>
            {tv.multiplier_applied > 0 && (
              <span className="badge badge-blue">+{(tv.multiplier_applied * 100).toFixed(1)}% velocity bonus</span>
            )}
          </div>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <div className="section-header">
          <div className="section-icon">📊</div>
          <div><div className="section-title">Score Breakdown</div><div className="section-sub">Four-component LLM evaluation</div></div>
        </div>
        <div className="score-cards-grid">
          {scoreDefs.map(s => {
            const pct = Math.round(((s.value || 0) / s.max) * 100);
            return (
              <div className="score-card" key={s.label}>
                <div className="score-card-label">{s.label}</div>
                <div className="score-card-value" style={{ color: s.color }}>{s.value != null ? s.value.toFixed(1) : '—'}</div>
                <div className="score-card-max">out of {s.max}</div>
                <div className="progress-bar-wrapper" style={{ marginTop: '0.75rem' }}>
                  <div className="progress-bar-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg,${s.color}88,${s.color})`, boxShadow: `0 0 8px ${s.color}44` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* XAI */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <div className="section-header">
          <div className="section-icon">🔍</div>
          <div><div className="section-title">XAI Explanation</div><div className="section-sub">Explainable AI reasoning</div></div>
        </div>
        <div className="xai-card">
          <div className="xai-card-header">&gt; AI Assessment</div>
          <div style={{ color: 'var(--text-primary)' }}>{data.explanation || '—'}</div>
        </div>
      </div>

      {/* Gap analysis */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <div className="section-header">
          <div className="section-icon">🎯</div>
          <div><div className="section-title">Skill Gap Analysis</div><div className="section-sub">Set-theoretic skill coverage</div></div>
        </div>
        <div className="coverage-wrap">
          <span className="coverage-label">JD Coverage</span>
          <div className="progress-bar-wrapper" style={{ flex: 1 }}>
            <div className={`progress-bar-fill ${coverageCls}`} style={{ width: `${coveragePct}%` }} />
          </div>
          <span className="coverage-pct">{coveragePct}%</span>
        </div>
        <div className="gap-grid">
          <div>
            <div className="gap-col-title" style={{ color: 'var(--accent-green)' }}>✅ Matched Skills</div>
            <div className="tags-container">
              {(gap?.overlaps || []).length ? gap.overlaps.map(t => <span key={t} className="skill-tag skill-tag-match">{t}</span>) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>}
            </div>
          </div>
          <div>
            <div className="gap-col-title" style={{ color: 'var(--accent-red)' }}>❌ Skill Gaps</div>
            <div className="tags-container">
              {(gap?.gaps || []).length ? gap.gaps.map(t => <span key={t} className="skill-tag skill-tag-gap">{t}</span>) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>}
            </div>
          </div>
          <div>
            <div className="gap-col-title" style={{ color: 'var(--accent-blue-lt)' }}>➕ Extra Skills</div>
            <div className="tags-container">
              {(gap?.extra_skills || []).length ? gap.extra_skills.map(t => <span key={t} className="skill-tag skill-tag-extra">{t}</span>) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>}
            </div>
          </div>
        </div>
      </div>

      {/* D3 Knowledge Graph */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <div className="section-header">
          <div className="section-icon">🕸️</div>
          <div><div className="section-title">Skill Knowledge Graph</div><div className="section-sub">D3.js force-directed topology — drag nodes to explore</div></div>
        </div>
        <div className="graph-container">
          {data.graph_data && <D3Graph graphData={data.graph_data} />}
        </div>
        <div className="graph-legend">
          {[['#38bdf8','Central Node','0 0 6px #38bdf8'],['#34d399','Matched Skill','0 0 6px #34d399'],['#7dd3fc','Candidate Only','none'],['#f87171','Gap (JD Only)','0 0 6px #f87171']].map(([c,l,glow]) => (
            <div className="legend-item" key={l}>
              <div className="legend-dot" style={{ background: c, boxShadow: glow }} />
              {l}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main AppPage ──────────────────────────────────────────── */
export default function AppPage({ systemOnline, onHome, showToast }) {
  const [phase, setPhase] = useState(1);
  const [candidateId, setCandidateId] = useState(genCandidateId);
  const [file, setFile] = useState(null);
  const [parseData, setParseData] = useState(null);   // {github_url, tcfe_metrics, sanitized_text, message}
  const [evalData,  setEvalData]  = useState(null);   // full evaluate-candidate response
  const [loading, setLoading]     = useState(false);
  const [loadMsg, setLoadMsg]     = useState('');

  /* Phase 1 — Upload */
  const handleFile = useCallback((f) => {
    if (!f.name.toLowerCase().endsWith('.pdf')) { showToast('Only PDF files accepted.', 'error'); return; }
    if (f.size > 10 * 1024 * 1024)             { showToast('File exceeds 10MB.', 'error'); return; }
    setFile(f);
    setParseData(null);
  }, [showToast]);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true); setLoadMsg('Parsing PDF…');
    try {
      const data = await parseResume(file);
      setParseData(data);
      showToast('Resume parsed successfully!', 'success');
    } catch (e) {
      showToast(`Parse error: ${e.message}`, 'error');
    } finally {
      setLoading(false); setLoadMsg('');
    }
  };

  /* Phase 2 — Evaluate */
  const handleEvaluate = async (jd) => {
    if (!jd.trim())             { showToast('Please enter a Job Description.', 'error'); return; }
    if (!parseData?.sanitized_text) { showToast('Missing resume text.', 'error'); return; }
    setLoading(true); setLoadMsg('Embedding document…');
    try {
      await embedStore(candidateId, parseData.sanitized_text);
      setLoadMsg('Running LLM evaluation…');
      const result = await evaluateCandidate(candidateId, jd, parseData.tcfe_metrics || {});
      setEvalData(result);
      showToast('Evaluation complete!', 'success');
      setPhase(3);
    } catch (e) {
      showToast(`Evaluation error: ${e.message}`, 'error');
    } finally {
      setLoading(false); setLoadMsg('');
    }
  };

  const handleReset = () => {
    setPhase(1); setFile(null); setParseData(null); setEvalData(null);
    setCandidateId(genCandidateId());
  };

  return (
    <div className="app-wrapper">
      {/* Navbar */}
      <nav className="navbar">
        <span className="nav-logo" style={{ cursor: 'pointer' }} onClick={onHome}>
          Hire<span className="logo-accent">Lens</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className={`status-indicator ${systemOnline ? 'status-online' : 'status-offline'}`}>
            <span className="status-dot" />
            <span>{systemOnline ? 'System Online' : 'System Offline'}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onHome}>← Home</button>
        </div>
      </nav>

      <main className="app-layout">
        <Stepper phase={phase} />

        {/* ── Phase 1 ─────────────────────────────────────── */}
        {phase === 1 && (
          <div className="phase-content">
            {/* Candidate ID */}
            <div className="candidate-id-bar">
              <span className="candidate-id-label">Candidate ID</span>
              <span className="candidate-id-value">{candidateId}</span>
              <button className="btn btn-sm btn-ghost" title="Regenerate" onClick={() => setCandidateId(genCandidateId())}>↻</button>
            </div>

            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <div className="section-header">
                <div className="section-icon">📄</div>
                <div><div className="section-title">Upload PDF Resume</div><div className="section-sub">Supports single and multi-page PDFs</div></div>
              </div>

              <DropZone file={file} onFile={handleFile} onClear={() => { setFile(null); setParseData(null); }} />

              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button className="btn btn-primary btn-lg" disabled={!file || loading} onClick={handleUpload}>
                  {loading ? <><span className="spinner" />Parsing…</> : 'Parse Resume'}
                </button>
                {loadMsg && <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{loadMsg}</span>}
              </div>
            </div>

            {/* Parse result */}
            {parseData && (
              <div className="glass-card" style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ fontFamily: 'Outfit', fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.25rem' }}>Parse Complete</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{parseData.message}</p>
                  </div>
                  {parseData.message?.toLowerCase().includes('non-technical')
                    ? <span className="badge badge-amber">⚠ Non-Technical</span>
                    : <span className="badge badge-green">✓ Technical Role</span>}
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>GitHub Detected</span>
                  {parseData.github_url
                    ? <a href={parseData.github_url} target="_blank" rel="noreferrer" style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.875rem', color: 'var(--accent-primary)' }}>{parseData.github_url}</a>
                    : <span style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono,monospace', fontSize: '0.875rem' }}>No GitHub URL detected</span>}
                </div>

                <TcfePanel metrics={parseData.tcfe_metrics} />

                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={() => setPhase(2)}>Continue to Evaluation →</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Phase 2 ─────────────────────────────────────── */}
        {phase === 2 && <Phase2 candidateId={candidateId} onBack={() => setPhase(1)} onEvaluate={handleEvaluate} loading={loading} loadMsg={loadMsg} />}

        {/* ── Phase 3 ─────────────────────────────────────── */}
        {phase === 3 && evalData && <ResultsDashboard data={evalData} onReset={handleReset} />}

        {phase === 3 && loading && (
          <div className="loading-state">
            <span className="spinner spinner-lg" />
            <div className="loading-text">{loadMsg}</div>
          </div>
        )}
      </main>
    </div>
  );
}

function Phase2({ candidateId, onBack, onEvaluate, loading, loadMsg }) {
  const [jd, setJd] = useState('');

  const PLACEHOLDER = `We are looking for a Senior Backend Engineer proficient in Python, FastAPI, Docker, and Kubernetes. Experience with PostgreSQL, Redis, and AWS is required. Knowledge of LangChain, vector databases (Pinecone / ChromaDB), and LLM fine-tuning is a strong plus.`;

  return (
    <div className="phase-content">
      <div className="glass-card">
        <div className="section-header">
          <div className="section-icon">📝</div>
          <div><div className="section-title">Job Description</div><div className="section-sub">Paste the full JD to evaluate against</div></div>
        </div>

        <div className="candidate-id-bar" style={{ marginBottom: '1.25rem' }}>
          <span className="candidate-id-label">Candidate</span>
          <span className="candidate-id-value">{candidateId}</span>
        </div>

        <textarea className="form-textarea" value={jd} onChange={e => setJd(e.target.value)} placeholder={PLACEHOLDER} />

        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={onBack}>← Back</button>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {loading && <span className="spinner" />}
            {loadMsg && <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{loadMsg}</span>}
            <button className="btn btn-primary btn-lg" disabled={!jd.trim() || loading} onClick={() => onEvaluate(jd)}>
              {loading ? 'Processing…' : 'Run AI Evaluation ✦'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
