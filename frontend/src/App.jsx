import { useState } from 'react'
import Landing from './Landing'
import Sidebar from './components/Sidebar'
import PanelSetup from './components/PanelSetup'
import PanelIngestion from './components/PanelIngestion'
import PanelRanker from './components/PanelRanker'
import CandidateModal from './components/CandidateModal'
import StatusBar from './components/StatusBar'
import testData from './testData.json'
import { dummyGraphData } from './data'
import './index.css'

function App() {
  const [view, setView]         = useState('landing');
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [showGap, setShowGap] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

  const evaluateSingleCandidate = async (candidate) => {
    try {
      const payload = {
        candidate_id: candidate.id,
        job_description: jobDescription,
        pow_data: candidate.tcfe_metrics
      };
      
      const res = await fetch(`${API_BASE}/evaluate-candidate`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "69420"
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      const {
        scores,
        explanation,
        gap_analysis,
        graph_data,
        temporal_velocity
      } = data;

      setCandidates(prev => {
        const next = prev.map(c => {
          if (c.id === candidate.id) {
            return {
              ...c,
              score: temporal_velocity?.final_weighted_score || scores?.total_score || 0,
              xaiExplanation: explanation !== undefined ? explanation : c.xaiExplanation,
              skills: [
                { name: 'Semantic', match: `Score: ${scores?.semantic_skill_score_40 || 0}` },
                { name: 'PoW', match: `Score: ${scores?.pow_depth_score_30 || 0}` }
              ],
              graphData: graph_data,
              gapAnalysis: gap_analysis
            };
          }
          return c;
        });
        next.sort((a, b) => b.score - a.score);
        return next;
      });
    } catch (e) {
      console.error("Evaluation failed for candidate", candidate.id, e);
    }
  };

  const handleIngestSuccess = (parsedData, filename) => {
    const newCandidate = {
      id: parsedData.candidate_id || 'C-' + Math.floor(Math.random() * 1000),
      name: filename.replace('.pdf', '').replace('.docx', '') || 'New Applicant',
      score: 0,
      skills: [{ name: 'Parsed', match: 'System extracted structured data.' }],
      github_url:    parsedData.github_url,
      tcfe_metrics:  parsedData.tcfe_metrics,
      sanitized_text: parsedData.sanitized_text,
      xaiExplanation: 'Evaluating candidate against Job Description...',
    };
    
    // Add the candidate immediately in a "pending" state
    setCandidates(prev => [newCandidate, ...prev]);
    
    // Asynchronously evaluate the candidate against the global JD
    evaluateSingleCandidate(newCandidate);
  };

  if (view === 'landing') {
    return <Landing onEnterDashboard={() => setView('setup')} />;
  }

  if (view === 'setup') {
    return (
      <div className="app-shell">
        <StatusBar />
        <div className="dashboard-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <PanelSetup jdText={jobDescription} setJdText={setJobDescription} onInitialize={() => setView('dashboard')} />
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <StatusBar />
      <div className="dashboard-container">
        <Sidebar onBack={() => setView('setup')} />
        <div className="main-content">
          <PanelIngestion onIngestSuccess={handleIngestSuccess} />
          <PanelRanker 
            candidates={candidates} 
            onSelectCandidate={setSelectedCandidate} 
          />
        </div>
      </div>
      
      {/* Drill-down Modal Overlay */}
      <CandidateModal
        candidate={selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
        showGap={showGap}
        setShowGap={setShowGap}
      />
    </div>
  );
}

export default App
