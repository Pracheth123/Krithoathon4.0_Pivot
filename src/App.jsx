import { useState } from 'react'
import Landing from './Landing'
import Sidebar from './components/Sidebar'
import PanelIngestion from './components/PanelIngestion'
import PanelQuery from './components/PanelQuery'
import PanelRanker from './components/PanelRanker'
import PanelGraph from './components/PanelGraph'
import StatusBar from './components/StatusBar'
import testData from './testData.json'
import { dummyGraphData } from './data'
import './index.css'

function App() {
  const [view, setView]         = useState('landing');
  const [candidates, setCandidates] = useState([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const [showGap, setShowGap]   = useState(false);
  const [jdText, setJdText]     = useState('');

  const handleAnalyze = () => {
    setIsQuerying(true);
    setTimeout(() => {
      if (candidates.length === 0) setCandidates([testData]);
      setIsQuerying(false);
    }, 2000);
  };

  const handleIngestSuccess = (parsedData, filename) => {
    const newCandidate = {
      id: 'C-' + Math.floor(Math.random() * 1000),
      name: filename.replace('.pdf', '').replace('.docx', '') || 'New Applicant',
      score: 85,
      skills: [{ name: 'Parsed', match: 'System extracted structured data.' }],
      github_url:    parsedData.github_url,
      tcfe_metrics:  parsedData.tcfe_metrics,
      sanitized_text: parsedData.sanitized_text,
      xaiExplanation: 'Candidate automatically parsed from ingestion system. Awaiting LLM evaluation.',
    };
    setCandidates(prev => [newCandidate, ...prev]);
  };

  if (view === 'landing') {
    return <Landing onEnterDashboard={() => setView('dashboard')} />;
  }

  return (
    <div className="app-shell">
      <StatusBar />
      <div className="dashboard-container">
        <Sidebar onBack={() => setView('landing')} />
        <div className="main-content">
          <PanelIngestion onIngestSuccess={handleIngestSuccess} />
          <PanelQuery
            onAnalyze={handleAnalyze}
            isQuerying={isQuerying}
            jdText={jdText}
            setJdText={setJdText}
          />
          <PanelRanker candidates={candidates} />
          <PanelGraph
            graphData={dummyGraphData}
            showGap={showGap}
            setShowGap={setShowGap}
          />
        </div>
      </div>
    </div>
  );
}

export default App
