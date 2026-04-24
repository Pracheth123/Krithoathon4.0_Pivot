import React from 'react';
import { Database, Search, Network, LayoutGrid, Settings, ArrowLeft } from 'lucide-react';

export default function Sidebar({ onBack }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">
          <Network size={18} color="#00bfff" />
        </div>
        <div>
          <div className="sidebar-logo-text">HireLens</div>
          <div className="sidebar-logo-sub">AI Recruitment Platform</div>
        </div>
      </div>

      <div className="sidebar-section-label">Workspace</div>
      <nav className="nav-menu">
        <div className="nav-item active">
          <LayoutGrid size={16} className="nav-icon" />
          <span>Dashboard</span>
        </div>
        <div className="nav-item">
          <Database size={16} className="nav-icon" />
          <span>Ingest Resumes</span>
        </div>
        <div className="nav-item">
          <Search size={16} className="nav-icon" />
          <span>Candidate Search</span>
        </div>
        <div className="nav-item">
          <Network size={16} className="nav-icon" />
          <span>Skill Graph</span>
        </div>
      </nav>

      <div className="sidebar-section-label">Tools</div>
      <nav className="nav-menu">
        <div className="nav-item">
          <Settings size={16} className="nav-icon" />
          <span>Settings</span>
        </div>
      </nav>

      <div className="sidebar-footer">
        {onBack && (
          <div
            onClick={onBack}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              fontSize: '0.78rem', color: 'var(--text-muted)',
              cursor: 'pointer', marginBottom: 16,
              paddingBottom: 14, borderBottom: '1px solid var(--glass-border)',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--mint)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <ArrowLeft size={13} /> Back to Home
          </div>
        )}
        <div className="sidebar-footer-label">System</div>
        <div className="status-row">
          <div className="status-dot"></div>
          <span>Vector DB: Connected</span>
        </div>
        <div className="status-row">
          <div className="status-dot"></div>
          <span>GitHub API: Active</span>
        </div>
        <div className="status-row">
          <div className="status-dot warning"></div>
          <span>TCFE Engine: Monitoring</span>
        </div>
      </div>
    </aside>
  );
}
