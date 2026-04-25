import { useState, useEffect } from 'react';
import './index.css';
import './App.css';
import LandingPage from './LandingPage';
import Dashboard   from './Dashboard';
import AppPage     from './AppPage';
import { ToastContainer, useToast } from './useToast';
import { healthCheck } from './api';

export default function App() {
  const [page, setPage]           = useState('landing'); // landing, dashboard, app
  const [activeRole, setActiveRole] = useState(null);
  const [systemOnline, setOnline] = useState(false);
  const { toasts, showToast }     = useToast();

  useEffect(() => {
    async function poll() {
      try { await healthCheck(); setOnline(true); }
      catch { setOnline(false); }
    }
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, []);

  const handleLaunchDashboard = () => setPage('dashboard');
  const handleSelectRole = (role) => {
    setActiveRole(role);
    setPage('app');
  };
  const handleLogout = () => setPage('landing');
  const handleBackToDashboard = () => {
    setActiveRole(null);
    setPage('dashboard');
  };

  return (
    <>
      <ToastContainer toasts={toasts} />
      {page === 'landing' && <LandingPage onLaunch={handleLaunchDashboard} showToast={showToast} />}
      {page === 'dashboard' && <Dashboard onSelectRole={handleSelectRole} onLogout={handleLogout} />}
      {page === 'app' && <AppPage systemOnline={systemOnline} role={activeRole} onHome={handleBackToDashboard} showToast={showToast} />}
    </>
  );
}
