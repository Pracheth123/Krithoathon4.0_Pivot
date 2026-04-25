import { useState, useEffect } from 'react';
import './index.css';
import './App.css';
import LandingPage from './LandingPage';
import AppPage     from './AppPage';
import { ToastContainer, useToast } from './useToast';
import { healthCheck } from './api';

export default function App() {
  const [page, setPage]           = useState('landing');
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

  return (
    <>
      <ToastContainer toasts={toasts} />
      {page === 'landing'
        ? <LandingPage onLaunch={() => setPage('app')} showToast={showToast} />
        : <AppPage systemOnline={systemOnline} onHome={() => setPage('landing')} showToast={showToast} />}
    </>
  );
}
