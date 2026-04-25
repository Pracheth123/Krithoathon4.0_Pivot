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
      {[['1','Job Description'],['2','Batch Upload'],['3','Leaderboard']].map(([n, label], i) => (
        <div key={n} style={{ display: 'flex', alignItems: 'center' }}>
          <div className={`step-item ${s(+n)}`}>
            <div className="step-circle">{phase > +n ? '✓' : n}</div>
            <div className="step-label">{label}</div>
          </div>
          {i < 2 && <div className={`step-connector ${phase > i+1 ? 'done' : phase === i+1 ? 'active' : ''}`} />}
        </div>
      ))}
    </div>
  );
}

/* ── Multi-Drop Zone ───────────────────────────────────────── */
function MultiDropZone({ onFiles }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) onFiles(Array.from(e.dataTransfer.files));
  };

  return (
    <div
      className={`drop-zone ${dragging ? 'drag-over' : ''}`}
      onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      style={{ padding: '3rem', cursor: 'pointer' }}
    >
      <input ref={inputRef} type="file" accept=".pdf" multiple
        style={{ display: 'none' }}
        onChange={e => { if (e.target.files?.length) onFiles(Array.from(e.target.files)); e.target.value = null; }} />
      <span className="drop-zone-icon">☁️</span>
      <div className="drop-zone-title">Drag & Drop PDF Resumes</div>
      <div className="drop-zone-sub">
        or <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>click to browse</span> — You can select multiple files
      </div>
    </div>
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

/* ── Results Dashboard (Modal) ─────────────────────────────── */
function ResultsDashboard({ data, onClose }) {
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
    <div className="modal-backdrop" onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:1000, padding:'2rem', overflowY:'auto' }}>
      <div className="phase-content" onClick={e => e.stopPropagation()} style={{ background:'#fafafa', padding:'2rem', borderRadius:'12px', maxWidth:'1000px', margin:'0 auto', position:'relative' }}>
        <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ position:'absolute', top:'1rem', right:'1rem' }}>✕ Close</button>
        
        {/* Header */}
        <div className="result-actions" style={{ marginBottom: '2rem' }}>
          <div>
            <h2 style={{ fontFamily: 'Outfit', fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
              AI Matching Report
            </h2>
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Candidate: {data.candidate_id}
            </div>
          </div>
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
    </div>
  );
}

/* ── Main AppPage ──────────────────────────────────────────── */
export default function AppPage({ systemOnline, role, onHome, showToast }) {
  const [phase, setPhase] = useState(role ? 2 : 1);
  const [jd, setJd] = useState(role ? role.description : '');
  
  // Array of { id, file, status, parseData, evalData, score, errorMsg }
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const PLACEHOLDER = `We are looking for a Senior Backend Engineer proficient in Python, FastAPI, Docker, and Kubernetes. Experience with PostgreSQL, Redis, and AWS is required. Knowledge of LangChain, vector databases (Pinecone / ChromaDB), and LLM fine-tuning is a strong plus.`;

  /* Phase 1 — Submit JD */
  const handleJdSubmit = () => {
    if (!jd.trim()) return showToast('Please enter a Job Description.', 'error');
    setPhase(2);
  };

  /* Phase 2 & 3 — Add Files and Process */
  const handleFilesAdded = (files) => {
    const valid = files.filter(f => {
      if (!f.name.toLowerCase().endsWith('.pdf')) { showToast(`Skipped ${f.name} (not a PDF).`, 'error'); return false; }
      if (f.size > 10 * 1024 * 1024) { showToast(`Skipped ${f.name} (exceeds 10MB).`, 'error'); return false; }
      return true;
    });

    if (!valid.length) return;

    const newCands = valid.map(file => ({
      id: genCandidateId(),
      file,
      status: 'pending', // pending -> parsing -> evaluating -> done | error
      parseData: null,
      evalData: null,
      score: 0,
      errorMsg: null
    }));

    setCandidates(prev => [...prev, ...newCands]);
    setPhase(3); // Move to Leaderboard to show progress

    // Process them asynchronously
    newCands.forEach(processCandidate);
  };

  const processCandidate = async (cand) => {
    const updateCand = (updates) => setCandidates(prev => prev.map(c => c.id === cand.id ? { ...c, ...updates } : c));

    try {
      updateCand({ status: 'parsing' });
      const pData = await parseResume(cand.file);
      
      if (!pData.sanitized_text) throw new Error('No text extracted.');

      updateCand({ status: 'evaluating', parseData: pData });
      
      await embedStore(cand.id, pData.sanitized_text);
      
      // --- Frontend GitHub Extraction Logic ---
      let powData = pData.tcfe_metrics || {};
      const match = pData.sanitized_text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\s*\/\s*([a-zA-Z0-9_-]+)/i);
      if (match && match[1]) {
          const username = match[1];
          console.log("Extracted GitHub Username:", username);
          try {
              const token = import.meta.env.VITE_GITHUB_TOKEN;
              const headers = token ? { Authorization: `token ${token}` } : {};
              
              // Fetch repos to calculate stats
              const res = await fetch(`https://api.github.com/users/${username}/repos?per_page=100`, { headers });
              if (res.ok) {
                  const repos = await res.json();
                  // Calculate basic stats for the backend
                  const totalCommits = repos.length * 10; // Mock multiplier for hackathon speed
                  powData = {
                      ...powData,
                      github_user: username,
                      repo_count: repos.length,
                      commit_count: totalCommits, // Send to backend for Temporal Velocity math
                      top_languages: [...new Set(repos.map(r => r.language).filter(Boolean))]
                  };
                  console.log("GitHub PoW Data Generated:", powData);
              } else {
                  console.error("GitHub API Error:", res.status);
              }
          } catch (error) {
              console.error("Failed to fetch GitHub data:", error);
          }
      }
      // ------------------------------------------

      const eData = await evaluateCandidate(cand.id, jd, powData, role?.id);
      
      updateCand({ 
        status: 'done', 
        evalData: eData, 
        score: eData.temporal_velocity?.final_weighted_score || eData.scores?.total_score || 0 
      });
      
      showToast(`Finished evaluating ${cand.file.name}`, 'success');

    } catch (e) {
      updateCand({ status: 'error', errorMsg: e.message });
      showToast(`Error processing ${cand.file.name}: ${e.message}`, 'error');
    }
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
          <button className="btn btn-ghost btn-sm" onClick={onHome}>← Home / Logout</button>
        </div>
      </nav>

      <main className="app-layout">
        <Stepper phase={phase} />

        {/* ── Phase 1: JD (Skip if role provided) ─────────────── */}
        {phase === 1 && !role && (
          <div className="phase-content">
            <div className="glass-card">
              <div className="section-header">
                <div className="section-icon">📝</div>
                <div><div className="section-title">Job Description</div><div className="section-sub">Paste the full JD to evaluate against</div></div>
              </div>
              <textarea className="form-textarea" style={{ height: '250px' }} value={jd} onChange={e => setJd(e.target.value)} placeholder={PLACEHOLDER} />
              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary btn-lg" onClick={handleJdSubmit}>Next: Upload Resumes →</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Phase 2 & 3: Batch Upload & Leaderboard ─────────── */}
        {phase > 1 && (
          <div className="phase-content">
            
            {/* Top Row: Dropzone on left, JD summary on right? Or just Dropzone full width */}
            <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
              <div className="section-header" style={{ marginBottom: '1rem' }}>
                <div className="section-icon">📄</div>
                <div><div className="section-title">Add Candidates</div><div className="section-sub">Upload more PDFs to evaluate against the JD</div></div>
              </div>
              <MultiDropZone onFiles={handleFilesAdded} />
            </div>

            {/* Leaderboard */}
            {candidates.length > 0 && (
              <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontFamily: 'Outfit', fontSize: '1.25rem', fontWeight: 700 }}>Leaderboard</h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{candidates.filter(c => c.status === 'done').length} / {candidates.length} Processed</div>
                </div>
                
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: 'Inter, sans-serif' }}>
                    <thead style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      <tr>
                        <th style={{ padding: '1rem 1.5rem' }}>Candidate</th>
                        <th style={{ padding: '1rem 1.5rem' }}>Status</th>
                        <th style={{ padding: '1rem 1.5rem' }}>Parse Flags</th>
                        <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Score</th>
                        <th style={{ padding: '1rem 1.5rem' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Sort by score descending, pending/parsing at bottom if score is 0 */}
                      {[...candidates].sort((a,b) => b.score - a.score).map(c => (
                        <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.file.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{c.id}</div>
                          </td>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            {c.status === 'pending' && <span className="badge badge-blue">Queued</span>}
                            {c.status === 'parsing' && <><span className="spinner spinner-sm" style={{ marginRight: '6px' }}/> <span className="badge badge-amber">Parsing</span></>}
                            {c.status === 'evaluating' && <><span className="spinner spinner-sm" style={{ marginRight: '6px' }}/> <span className="badge badge-amber">Running LLM</span></>}
                            {c.status === 'done' && <span className="badge badge-green">✓ Complete</span>}
                            {c.status === 'error' && <span className="badge badge-red" title={c.errorMsg}>Error</span>}
                          </td>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            {c.parseData?.message?.toLowerCase().includes('non-technical') ? (
                              <span className="badge badge-amber">Non-Tech</span>
                            ) : c.parseData?.github_url ? (
                              <span className="badge badge-blue">GitHub Found</span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: 700, fontSize: '1.1rem', color: c.score >= 70 ? 'var(--accent-green)' : c.score >= 50 ? 'var(--accent-amber)' : 'var(--text-primary)' }}>
                            {c.status === 'done' ? c.score.toFixed(1) : '—'}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                            <button 
                              className="btn btn-sm btn-ghost" 
                              disabled={c.status !== 'done'}
                              onClick={() => setSelectedCandidate(c)}
                            >
                              View Report →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Detail Modal ────────────────────────────────────── */}
        {selectedCandidate && (
          <ResultsDashboard 
            data={selectedCandidate.evalData} 
            onClose={() => setSelectedCandidate(null)} 
          />
        )}
      </main>
    </div>
  );
}
