import React, { useEffect } from 'react';
import { X, Activity, ExternalLink } from 'lucide-react';
import PanelGraph from './PanelGraph';

export default function CandidateModal({ candidate, onClose, showGap, setShowGap }) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  if (!candidate) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <span className="modal-candidate-name">{candidate.name}</span>
            <span className="modal-candidate-id">{candidate.id}</span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-left-col">
            {/* XAI Explanation */}
            <div className="modal-section">
              <div className="modal-section-label">XAI Explanation</div>
              <div className="modal-section-text">{candidate.xaiExplanation || 'Awaiting evaluation...'}</div>
            </div>

            {/* GitHub / TCFE Signals */}
            <div className="modal-section">
              <div className="modal-section-label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Activity size={12} /> GitHub Signal
              </div>
              <div className="metrics-row" style={{ marginBottom: 10 }}>
                <span className="metric-item">Continuity: <strong>{candidate.tcfe_metrics?.continuity_score?.toFixed(2) ?? 'N/A'}</strong></span>
                <span className="metric-item">Burst: <strong style={{ color: candidate.tcfe_metrics?.burst_detected ? 'var(--amber)' : 'inherit' }}>{candidate.tcfe_metrics?.burst_score ?? 'N/A'}</strong></span>
                {candidate.github_url && (
                  <a href={candidate.github_url} target="_blank" rel="noreferrer"
                    style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--cyan)', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}>
                    Profile <ExternalLink size={12} />
                  </a>
                )}
              </div>
              <div className="heatmap-bar" />
            </div>

            {/* PII Preview */}
            {candidate.sanitized_text && (
              <div className="modal-section" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="modal-section-label">Parser Preview — PII Redacted</div>
                <div className="pii-preview" style={{ flex: 1, maxHeight: 'none' }}>
                  {candidate.sanitized_text.split(/(\[[A-Z]+\])/g).map((part, i) =>
                    part.match(/\[[A-Z]+\]/)
                      ? <span key={i} style={{ color: 'var(--cyan)', fontWeight: 700 }}>{part}</span>
                      : part
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="modal-right-col">
            <PanelGraph
              graphData={candidate.graphData || { nodes: [], links: [] }}
              gapAnalysis={candidate.gapAnalysis}
              showGap={showGap}
              setShowGap={setShowGap}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
