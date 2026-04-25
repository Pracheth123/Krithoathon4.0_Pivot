import React, { useState, useRef } from 'react';
import { UploadCloud, HardDrive } from 'lucide-react';
import MagneticButton from './MagneticButton';

export default function PanelIngestion({ onIngestSuccess }) {
  const [isHovering, setIsHovering] = useState(false);
  const [logs, setLogs] = useState([
    { id: 1, text: "Ingestion engine ready.", type: "success" }
  ]);
  const fileInputRef = useRef(null);
  
  const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

  const processFile = async (file) => {
    if (!file) return;
    setLogs(prev => [...prev, { id: Date.now(), text: `$ parse-resume "${file.name}"`, type: "command" }]);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_BASE}/parse-resume`, {
        method: "POST",
        headers: { "ngrok-skip-browser-warning": "69420" },
        body: formData,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      setLogs(prev => [...prev,
        { id: Date.now(), text: `  → GitHub: ${data.github_url || 'Not found'}`, type: "info" }
      ]);

      if (data.tcfe_metrics?.burst_detected) {
        setLogs(prev => [...prev, { id: Date.now(), text: `  ⚠ TCFE: BURST DETECTED — score ${data.tcfe_metrics.burst_score}`, type: "warning" }]);
      } else if (data.tcfe_metrics) {
        setLogs(prev => [...prev, { id: Date.now(), text: `  ✓ TCFE: CLEAN — continuity ${data.tcfe_metrics.continuity_score?.toFixed(2)}`, type: "success" }]);
      } else {
        setLogs(prev => [...prev, { id: Date.now(), text: `  ○ TCFE: Skipped (no GitHub URL detected)`, type: "info" }]);
      }

      const generatedCandidateId = data.candidate_id || `C-${Date.now()}`;
      
      // Actually call /embed-store
      const embedResponse = await fetch(`${API_BASE}/embed-store`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "69420"
        },
        body: JSON.stringify({
          candidate_id: generatedCandidateId,
          sanitized_text: data.sanitized_text,
          metadata: { github_url: data.github_url }
        })
      });

      if (!embedResponse.ok) throw new Error(`Embed failed: ${embedResponse.status}`);

      setLogs(prev => [...prev, { id: Date.now(), text: `  → /embed-store 200 OK`, type: "success" }]);

      if (onIngestSuccess) {
        onIngestSuccess({...data, candidate_id: generatedCandidateId}, file.name);
      }
    } catch (error) {
      setLogs(prev => [...prev, { id: Date.now(), text: `  ✗ Error: ${error.message}`, type: "danger" }]);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsHovering(false);
    await processFile(e.dataTransfer?.files[0]);
  };

  const handleFileInput = async (e) => {
    await processFile(e.target.files[0]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="panel-card">
      <div className="panel-header">
        <div className="panel-title">
          <HardDrive size={15} className="panel-title-icon" />
          Ingestion Console
        </div>
        <span className="panel-badge">LIVE</span>
      </div>

      <div className="panel-body">
        <div
          className={`drop-zone ${isHovering ? 'active' : ''}`}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsHovering(true); }}
          onDragLeave={() => setIsHovering(false)}
        >
          <UploadCloud size={32} color="var(--cyan-blue)" />
          <div>
            <div className="drop-zone-title">Drag & drop resume files</div>
            <div className="drop-zone-sub">PDF or DOCX — Batch upload supported</div>
          </div>
          <MagneticButton variant="secondary" onClick={() => fileInputRef.current?.click()}>
            Browse Files
          </MagneticButton>
          <input
            type="file" ref={fileInputRef}
            style={{ display: 'none' }} accept=".pdf,.docx"
            onChange={handleFileInput}
          />
        </div>

        <div className="terminal-feed">
          {logs.map((log, index) => (
            <div key={`log-${index}-${log.id}`} className="terminal-line">
              <span className={`terminal-${log.type}`}>{log.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
