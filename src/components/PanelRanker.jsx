import React, { useState } from 'react';
import { Users, AlertTriangle, ChevronDown, ChevronUp, Activity, ExternalLink } from 'lucide-react';

const scoreClass = (s) => s >= 80 ? 'high' : s >= 60 ? 'mid' : 'low';

export default function PanelRanker({ candidates }) {
  const [selected, setSelected] = useState(null);

  const toggle = (id) => setSelected(prev => prev === id ? null : id);

  if (!candidates || candidates.length === 0) {
    return (
      <div className="panel-card">
        <div className="panel-header">
          <div className="panel-title"><Users size={13} className="panel-title-icon" />Candidate Ranker</div>
        </div>
        <div className="empty-state">
          <Users size={32} color="rgba(0,180,216,0.18)" />
          <div className="empty-state-title">No candidates yet</div>
          <div className="empty-state-sub">Upload resumes or run a JD query to populate this panel.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-card">
      <div className="panel-header">
        <div className="panel-title"><Users size={13} className="panel-title-icon" />Candidate Ranker</div>
        <span className="panel-badge">{candidates.length} results</span>
      </div>

      <div className="panel-body" style={{ padding: 0 }}>
        {/* ─ Table Header ─ */}
        <div className="candidate-table-header">
          <span className="col-header" style={{ textAlign: 'center' }}>#</span>
          <span className="col-header" style={{ textAlign: 'center' }}>Score</span>
          <span className="col-header">Candidate</span>
          <span className="col-header" style={{ textAlign: 'right' }}>Signals</span>
          <span className="col-header" style={{ textAlign: 'right' }}>Skills</span>
          <span />
        </div>

        <div className="candidate-table">
          {candidates.map((c, idx) => (
            <React.Fragment key={c.id}>
              {/* ─ Compact Row ─ */}
              <div
                className={`candidate-row ${selected === c.id ? 'selected' : ''}`}
                onClick={() => toggle(c.id)}
              >
                <span className="cell-rank">#{idx + 1}</span>

                <div className="cell-score">
                  <span className={`score-chip ${scoreClass(c.score)}`}>{c.score}%</span>
                </div>

                <div className="cell-info">
                  <div className="candidate-name">
                    {c.name}
                    {c.tcfe_metrics?.burst_detected && (
                      <div className="tooltip-container">
                        <span className="tcfe-badge">
                          <AlertTriangle size={8} /> TCFE
                        </span>
                        <div className="tooltip-content">
                          Burst-committing detected — Score: {c.tcfe_metrics.burst_score}. Continuity: {c.tcfe_metrics.continuity_score?.toFixed(2)}. Activity may be artificially inflated.
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="candidate-id">{c.id}</div>
                </div>

                {/* TCFE metrics column */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: 1 }}>
                  <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    cont: <span style={{ color: 'var(--cyan)' }}>{c.tcfe_metrics?.continuity_score?.toFixed(2) ?? '—'}</span>
                  </span>
                  <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    burst: <span style={{ color: c.tcfe_metrics?.burst_detected ? 'var(--amber)' : 'var(--text-secondary)' }}>
                      {c.tcfe_metrics?.burst_score ?? '—'}
                    </span>
                  </span>
                </div>

                {/* Skills */}
                <div className="cell-skills">
                  {c.skills?.slice(0, 2).map((sk, i) => (
                    <div key={i} className="tooltip-container">
                      <span className="skill-chip">{sk.name}</span>
                      <div className="tooltip-content">{sk.match}</div>
                    </div>
                  ))}
                  {(c.skills?.length ?? 0) > 2 && (
                    <span style={{ fontSize: '0.63rem', color: 'var(--text-muted)' }}>+{c.skills.length - 2}</span>
                  )}
                </div>

                <div className="cell-actions">
                  {selected === c.id
                    ? <ChevronUp size={13} color="var(--text-muted)" />
                    : <ChevronDown size={13} color="var(--text-muted)" />}
                </div>
              </div>

              {/* ─ Inline Drawer (stateful 2px cyan left accent) ─ */}
              {selected === c.id && (
                <div className="candidate-drawer">
                  <div className="drawer-row">
                    {/* XAI */}
                    <div className="drawer-section">
                      <div className="drawer-label">XAI Explanation</div>
                      <div className="drawer-text">{c.xaiExplanation}</div>
                    </div>

                    {/* GitHub / TCFE */}
                    <div className="drawer-section">
                      <div className="drawer-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Activity size={10} style={{ display: 'inline' }} /> GitHub Signal
                      </div>
                      <div className="metrics-row" style={{ marginBottom: 6 }}>
                        <span className="metric-item">Continuity: <strong>{c.tcfe_metrics?.continuity_score?.toFixed(2) ?? 'N/A'}</strong></span>
                        <span className="metric-item">Burst: <strong style={{ color: c.tcfe_metrics?.burst_detected ? 'var(--amber)' : 'inherit' }}>{c.tcfe_metrics?.burst_score ?? 'N/A'}</strong></span>
                        {c.github_url && (
                          <a href={c.github_url} target="_blank" rel="noreferrer"
                            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--cyan)', fontSize: '0.72rem', fontWeight: 600 }}>
                            Profile <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                      <div className="heatmap-bar" />
                    </div>
                  </div>

                  {/* PII preview */}
                  {c.sanitized_text && (
                    <div style={{ marginTop: 8 }}>
                      <div className="drawer-label">Parser Preview — PII Redacted</div>
                      <div className="pii-preview">
                        {c.sanitized_text.split(/(\[[A-Z]+\])/g).map((part, i) =>
                          part.match(/\[[A-Z]+\]/)
                            ? <span key={i} style={{ color: 'var(--cyan)', fontWeight: 700 }}>{part}</span>
                            : part
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
