import React from 'react';
import { Target } from 'lucide-react';
import MagneticButton from './MagneticButton';

export default function PanelSetup({ jdText, setJdText, onInitialize }) {
  return (
    <div className="setup-container">
      <div className="setup-card">
        <div className="setup-header">
          <Target size={24} color="var(--cyan)" />
          <h2>Initialize Requisition</h2>
          <p>Paste the Job Description to calibrate the evaluating models.</p>
        </div>
        
        <div className="setup-body">
          <textarea
            rows={10}
            placeholder="e.g. We are looking for a Senior Full-Stack Engineer with React and Python experience..."
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
          />
        </div>
        
        <div className="setup-footer">
          <MagneticButton
            variant="primary"
            onClick={onInitialize}
            disabled={!jdText.trim()}
          >
            Initialize Workspace
          </MagneticButton>
        </div>
      </div>
    </div>
  );
}
