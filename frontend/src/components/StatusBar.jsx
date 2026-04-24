import React from 'react';

export default function StatusBar() {
  const [latency, setLatency] = React.useState(null);
  const [time, setTime]       = React.useState(new Date());

  React.useEffect(() => {
    // Ping backend for latency
    const ping = async () => {
      const t0 = Date.now();
      try {
        await fetch('http://127.0.0.1:8000/health', { method: 'GET', signal: AbortSignal.timeout(2000) });
        setLatency(Date.now() - t0);
      } catch {
        setLatency(null);
      }
    };
    ping();
    const interval = setInterval(ping, 15000);
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = (d) => d.toLocaleTimeString('en-US', { hour12: false });

  return (
    <div className="status-bar">
      <div className="sb-item">
        <div className="sb-dot online" />
        <span className="sb-label">VectorDB</span>
        <span className="sb-active">ONLINE</span>
      </div>

      <div className="sb-item">
        <div className="sb-dot online" />
        <span className="sb-label">GitHub API</span>
        <span className="sb-active">ACTIVE</span>
      </div>

      <div className="sb-item">
        <div className="sb-dot warn" />
        <span className="sb-label">TCFE Engine</span>
        <span className="sb-value">v2.1.0 · MONITORING</span>
      </div>

      <div className="sb-item">
        <span className="sb-label">Latency</span>
        <span className="sb-value">
          {latency !== null ? `${latency}ms` : '—'}
        </span>
      </div>

      <div className="sb-item right">
        <span className="sb-label">HireLens</span>
        <span className="sb-value">v1.0.0</span>
        <span className="sb-label" style={{ marginLeft: 12 }}>{fmt(time)}</span>
      </div>
    </div>
  );
}
