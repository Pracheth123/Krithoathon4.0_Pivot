import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import MagneticButton from './MagneticButton';

const TAXONOMY_LINES = [
  { cls: 'tax-sys',    text: '[SYS] Normalizing Job Requirements...' },
  { cls: 'tax-detect', text: '> Detected: "Coordinated Delivery"' },
  { cls: 'tax-map',    text: '  → Taxonomy: Agile Project Management, Scrum' },
  { cls: 'tax-detect', text: '> Detected: "RESTful backends"' },
  { cls: 'tax-map',    text: '  → Taxonomy: API Development, Backend Engineering' },
  { cls: 'tax-sys',    text: '[SYS] Normalization complete. Running semantic search...' },
];

export default function PanelQuery({ onAnalyze, isQuerying, jdText, setJdText }) {
  const [candidatesCount, setCandidatesCount] = useState(10);
  const [tcfeEnabled, setTcfeEnabled] = useState(true);
  const [showTaxonomy, setShowTaxonomy] = useState(false);

  const handleSubmit = () => {
    if (!jdText.trim()) return;
    setShowTaxonomy(true);
    setTimeout(() => onAnalyze(), 1600);
  };

  return (
    <div className="panel-card">
      <div className="panel-header">
        <div className="panel-title">
          <Search size={15} className="panel-title-icon" />
          Query Terminal
        </div>
      </div>

      <div className="panel-body">
        <textarea
          rows={4}
          placeholder="Paste the full Job Description here to begin semantic matching..."
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
          style={{ flexShrink: 0 }}
        />

        {showTaxonomy && (
          <div className="taxonomy-box">
            {TAXONOMY_LINES.map((l, i) => (
              <div key={i} className={l.cls}>{l.text}</div>
            ))}
          </div>
        )}

        <div className="control-row" style={{ flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 120 }}>
            <div className="control-label">Top Results: {candidatesCount}</div>
            <input
              type="range" min="5" max="25" step="5"
              value={candidatesCount}
              onChange={(e) => setCandidatesCount(e.target.value)}
            />
          </div>

          <div className="toggle-wrap" onClick={() => setTcfeEnabled(v => !v)}>
            <div className={`toggle-track ${tcfeEnabled ? 'on' : ''}`}>
              <div className="toggle-thumb" />
            </div>
            <span className="toggle-label">TCFE Strict</span>
          </div>

          <MagneticButton
            onClick={handleSubmit}
            disabled={isQuerying || !jdText.trim()}
            variant="primary"
          >
            {isQuerying ? <Loader2 size={14} className="spinner" /> : <Search size={14} />}
            Analyze
          </MagneticButton>
        </div>
      </div>
    </div>
  );
}
