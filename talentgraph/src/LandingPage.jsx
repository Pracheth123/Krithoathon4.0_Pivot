import { useState, useEffect } from 'react';
import { loginUser, registerUser, setToken } from './api';

/* ── HireLens Logo — Magnifying Glass with Spark ────────────── */
function HireLensLogo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="mgGrad" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FCD34D"/>
          <stop offset="100%" stopColor="#F59E0B"/>
        </linearGradient>
        <linearGradient id="handleGrad" x1="28" y1="28" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D97706"/>
          <stop offset="100%" stopColor="#92400E"/>
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Outer ring */}
      <circle cx="18" cy="18" r="14.5" stroke="url(#mgGrad)" strokeWidth="3" fill="white"/>
      {/* Inner fill */}
      <circle cx="18" cy="18" r="11.5" fill="#FFFBEB"/>
      {/* Lightning bolt / spark inside */}
      <path
        d="M20 10L14 19H18.5L17 28L23.5 18H19L20 10Z"
        fill="url(#mgGrad)"
        filter="url(#glow)"
        strokeLinejoin="round"
      />

      {/* Handle */}
      <line x1="29" y1="29" x2="40" y2="40" stroke="url(#handleGrad)" strokeWidth="4.5" strokeLinecap="round"/>

      {/* Accent dots */}
      <circle cx="11" cy="13" r="1.2" fill="#FCD34D" opacity="0.7"/>
      <circle cx="14" cy="9"  r="0.9" fill="#F59E0B" opacity="0.5"/>
      <circle cx="24" cy="10" r="0.9" fill="#FCD34D" opacity="0.5"/>
    </svg>
  );
}

/* ── Typewriter ─────────────────────────────────────────────── */
const PHRASES = [
  'AI-Powered Hiring.',
  'Bias-Free Screening.',
  'Skills-First Recruiting.',
  'Smarter Talent Decisions.',
];

function Typewriter() {
  const [text, setText]           = useState('');
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [deleting, setDeleting]   = useState(false);

  useEffect(() => {
    const current = PHRASES[phraseIdx];
    let timer;
    if (!deleting) {
      if (text.length < current.length)
        timer = setTimeout(() => setText(current.slice(0, text.length + 1)), 75);
      else
        timer = setTimeout(() => setDeleting(true), 2400);
    } else {
      if (text.length > 0)
        timer = setTimeout(() => setText(text.slice(0, -1)), 45);
      else { setDeleting(false); setPhraseIdx(i => (i + 1) % PHRASES.length); }
    }
    return () => clearTimeout(timer);
  }, [text, deleting, phraseIdx]);

  return <span className="typewriter-text">{text || '\u00A0'}</span>;
}

/* ── Dashboard Mockup ───────────────────────────────────────── */
function DashboardMockup() {
  const bars   = [40, 60, 45, 72, 90, 65, 88, 75, 62, 85];
  const colors = ['#F59E0B','#FCD34D','#F59E0B','#10B981','#F59E0B','#3B82F6','#FBBF24','#10B981','#F59E0B','#FBBF24'];

  return (
    <div className="hero-mockup-wrap">
      <div className="hero-mockup-glow" />

      {/* ── Left floating cards ── */}
      <div className="floating-cards left">
        <div className="floating-card">
          <div className="fc-icon">📄</div>
          <div>
            <div className="fc-label">Full-Stack Engineer</div>
            <div className="fc-sub">Resume parsed</div>
          </div>
        </div>
        <div className="floating-card">
          <div className="fc-icon">🎯</div>
          <div>
            <div className="fc-label">Data Scientist</div>
            <div className="fc-sub">92 pts matched</div>
          </div>
        </div>
        <div className="floating-card">
          <div className="fc-icon">⚡</div>
          <div>
            <div className="fc-label">10 Challenges</div>
            <div className="fc-sub">TCFE verified</div>
          </div>
        </div>
      </div>

      {/* ── Central window mockup ── */}
      <div className="hero-mockup">
        {/* Browser chrome */}
        <div className="mockup-topbar">
          <div className="mockup-dot" style={{ background: '#F87171' }} />
          <div className="mockup-dot" style={{ background: '#FBBF24' }} />
          <div className="mockup-dot" style={{ background: '#34D399' }} />
          <div style={{ flex:1, background:'#F3F4F6', borderRadius:4, height:20, marginLeft:10, display:'flex', alignItems:'center', paddingLeft:8 }}>
            <span style={{ fontSize:'0.6rem', color:'#9CA3AF', fontFamily:'JetBrains Mono,monospace' }}>
              hirelens.app/dashboard
            </span>
          </div>
        </div>

        <div className="mockup-body">
          {/* Sidebar */}
          <div className="mockup-sidebar">
            {['⬛','📊','👤','⚡','🕸️'].map((icon, i) => (
              <div key={i} className={`sidebar-icon ${i === 1 ? 'active' : ''}`}>{icon}</div>
            ))}
          </div>

          {/* Main content */}
          <div className="mockup-content">
            <div className="mockup-filters">
              <div className="filter-chip active">All</div>
              <div className="filter-chip">Pass</div>
              <div className="filter-chip">Review</div>
            </div>

            <div className="mockup-grid">
              {[
                { val: '94.2', label: 'Avg Score' },
                { val: '38',   label: 'Screened' },
                { val: '87.5%',label: 'Coverage' },
              ].map(s => (
                <div className="mockup-stat" key={s.label}>
                  <div className="mockup-stat-val">{s.val}</div>
                  <div className="mockup-stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="mockup-chart-label">Score Distribution</div>
            <div className="mockup-chart">
              {bars.map((h, i) => (
                <div key={i} className="chart-bar"
                  style={{ height:`${h}%`, background:colors[i], opacity:0.85, borderRadius:'3px 3px 0 0' }} />
              ))}
            </div>

            <div className="mockup-candidates">
              {[
                { id:'CAND-A1B2', score:91.4, status:'Pass',   color:'#059669', bg:'#D1FAE5' },
                { id:'CAND-C3D4', score:76.8, status:'Review', color:'#1D4ED8', bg:'#DBEAFE' },
              ].map(c => (
                <div key={c.id} className="candidate-row">
                  <span className="cand-id">{c.id}</span>
                  <span className="cand-score" style={{ color:c.color }}>{c.score}</span>
                  <span className="cand-badge"
                    style={{ color:c.color, background:c.bg, border:`1px solid ${c.color}40` }}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right floating cards ── */}
      <div className="floating-cards right">
        <div className="floating-card accent-card">
          <div className="fc-icon">✅</div>
          <div>
            <div className="fc-label" style={{ color:'#065F46' }}>Pass</div>
            <div className="fc-sub">Score ≥ 70</div>
          </div>
        </div>
        <div className="floating-card">
          <div className="fc-icon">📋</div>
          <div>
            <div className="fc-label">AI Skills Gap</div>
            <div className="fc-sub">3 gaps found</div>
          </div>
        </div>
        <div className="floating-card accent-card red">
          <div className="fc-icon">❌</div>
          <div>
            <div className="fc-label" style={{ color:'#991B1B' }}>Fail</div>
            <div className="fc-sub">Score &lt; 50</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage({ onLaunch, showToast }) {
  const [scrolled, setScrolled]   = useState(false);
  const [email, setEmail]         = useState('');
  const [activeTab, setActiveTab] = useState(0);
  
  // Auth Modal State
  const [authModal, setAuthModal] = useState(null); // 'login', 'register', or null
  const [authForm, setAuthForm]   = useState({ email: '', password: '' });
  const [authLoading, setAuthLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!authForm.email || !authForm.password) return showToast('Please enter credentials.', 'error');
    setAuthLoading(true);
    try {
      if (authModal === 'login') {
        const data = await loginUser(authForm.email, authForm.password);
        setToken(data.access_token);
        showToast('Login successful!', 'success');
        onLaunch();
      } else {
        await registerUser(authForm.email, authForm.password);
        showToast('Registration successful! Please log in.', 'success');
        setAuthModal('login');
      }
    } catch (e) {
      showToast(`Auth error: ${e.message}`, 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  const tabs = ['Assessments', 'GitHub TCFE', 'Knowledge Graph', 'Gap Analysis', 'AI Insights'];

  return (
    <div className="app-wrapper">

      {/* ── Navbar ──────────────────────────────────────────── */}
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <span className="nav-logo">
          <HireLensLogo size={36} />
          <span className="logo-wordmark">Hire<span className="logo-accent">Lens</span></span>
        </span>
        <ul className="nav-links">
          {/* Removed links for UX cleanup */}
        </ul>
        <div className="nav-right">
          {/* Removed redundant login buttons */}
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="hero-section" id="hero">
        <div className="hero-content">
          <span className="hero-eyebrow">
            <span className="eyebrow-dot" />
            Powered by Llama 3.2 · ChromaDB · D3.js
          </span>

          <h1 className="hero-title">
            Screen, interview, and upskill
            <br />
            your <span className="highlight">AI-powered</span> workforce
          </h1>

          <p className="hero-sub" style={{ marginBottom: '2.5rem' }}>
            Transform your hiring pipeline into a Multi-Tenant ATS. Create roles, upload resumes, and let the Local Llama 3.2 AI instantly score candidates based on dynamic contexts and GitHub Proof-of-Work.
          </p>

          <div className="hero-cta-group" style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="btn btn-primary btn-lg" onClick={() => setAuthModal('login')} style={{ padding: '1rem 3rem', fontSize: '1.1rem' }}>
              Log In to Workspace
            </button>
            <button className="btn btn-free-trial btn-lg" onClick={() => setAuthModal('register')} style={{ padding: '1rem 3rem', fontSize: '1.1rem' }}>
              Create HR Account
            </button>
          </div>

          <p className="hero-cta-sub">No credit card required · Free forever for up to 5 candidates</p>

          <div className="hero-cta-alt">
            <a href="#pipeline" className="btn btn-ghost">Learn How It Works ↓</a>
          </div>
        </div>

        <DashboardMockup />
      </section>

      {/* ── Trusted by ──────────────────────────────────────── */}
      <div className="trusted-bar">
        <div className="trusted-inner">
          <div className="trusted-heading">
            Trusted by <strong>3,000+</strong> brands, startups, bootcamps, &amp; staffing agencies
          </div>
          <div className="trusted-logos">
            {['FastAPI', 'LangChain', 'ChromaDB', 'Ollama', 'NetworkX', 'HuggingFace'].map(l => (
              <div className="trusted-logo" key={l}>{l}</div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Feature Tabs / Pipeline ──────────────────────────── */}
      <section className="section" id="assessments">
        <div style={{ textAlign:'center', marginBottom:'2.5rem' }}>
          <p className="section-label">Capabilities</p>
          <h2 className="section-heading">Everything you need to hire smarter</h2>
          <p style={{ color:'var(--text-secondary)', maxWidth:560, margin:'0 auto', fontSize:'0.95rem' }}>
            HireLens combines LLM-powered semantic evaluation with real GitHub commit analysis
            to give you an objective, explainable candidate score.
          </p>
        </div>

        <div className="feature-tabs">
          {tabs.map((t, i) => (
            <button key={t} className={`feature-tab ${activeTab === i ? 'active' : ''}`}
              onClick={() => setActiveTab(i)}>{t}</button>
          ))}
        </div>

        <div id="pipeline">
          <div className="pipeline-grid">
            {[
              { step:'Phase 01', icon:'📄', title:'Parse & Sanitize',   desc:'PyPDF2 extracts text. spaCy NER redacts PERSON, ORG, GPE and DATE entities for fully blind screening.' },
              { step:'Phase 02', icon:'⚡', title:'GitHub TCFE',        desc:'3-pronged anti-cheat: biological rate limiting, code impact filter & LLM commit semantic scoring.' },
              { step:'Phase 03', icon:'🧠', title:'Semantic Embedding', desc:'HuggingFace MiniLM-L6-v2 chunks the resume into ChromaDB with cosine similarity indexing.' },
              { step:'Phase 04', icon:'⚖️', title:'LLM Evaluation',    desc:'Llama 3.2 scores: Semantic (40) + PoW (30) + Experience (15) + Keywords (15) = 100 pts.' },
              { step:'Phase 05', icon:'🕸️', title:'Knowledge Graph',   desc:'NetworkX + D3.js renders a force-directed skill topology: matches, gaps, and extra competencies.' },
            ].map(c => (
              <div className="pipeline-card" key={c.step}>
                <div className="pipeline-step">{c.step}</div>
                <span className="pipeline-icon">{c.icon}</span>
                <div className="pipeline-title">{c.title}</div>
                <div className="pipeline-desc">{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────── */}
      <section className="section section-alt" id="how-it-works">
        <div style={{ textAlign:'center' }}>
          <p className="section-label">Workflow</p>
          <h2 className="section-heading">Three steps to a ranked shortlist</h2>
          <p style={{ color:'var(--text-secondary)', maxWidth:500, margin:'0 auto', fontSize:'0.95rem' }}>
            From raw PDF to a detailed AI report in under 30 seconds — no manual review required.
          </p>
        </div>
        <div className="how-steps">
          {[
            { n:'1', title:'Upload PDF Resume',     desc:'Drop a PDF. HireLens extracts text, auto-redacts PII, detects the GitHub profile URL, and fetches live TCFE commit metrics.' },
            { n:'2', title:'Paste Job Description', desc:'Enter the JD. The resume is chunked into ChromaDB vector embeddings and the LLM retrieves the most semantically relevant passages.' },
            { n:'3', title:'Review AI Report',      desc:'Get a full report: weighted final score, XAI explanation, skill gap analysis, and an interactive D3 knowledge graph you can drag.' },
          ].map(s => (
            <div className="how-step" key={s.n}>
              <div className="how-number">{s.n}</div>
              <div className="how-title">{s.title}</div>
              <div className="how-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Scoring model ───────────────────────────────────── */}
      <section className="section" style={{ background:'var(--bg-secondary)' }}>
        <div className="scoring-layout">
          <div>
            <p className="section-label">Scoring Model</p>
            <h2 className="section-heading">Objective, explainable scoring</h2>
            <p style={{ color:'var(--text-secondary)', margin:'1.25rem 0 2rem', lineHeight:1.7 }}>
              A four-component rubric enforced by the LLM with a Temporal Velocity multiplier applied
              when recent GitHub burst activity is detected.
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.625rem' }}>
              {[
                ['🧠 Semantic Skill Match',    '40 pts', 'badge-amber'],
                ['⚡ Proof-of-Work Depth',     '30 pts', 'badge-amber'],
                ['📅 Experience Depth',        '15 pts', 'badge-amber'],
                ['🔑 Keyword Alignment',       '15 pts', 'badge-amber'],
                ['🚀 Temporal Velocity Bonus', '+Burst ×10%', 'badge-green'],
              ].map(([label, pts, cls]) => (
                <div className="score-row" key={label}>
                  <span style={{ fontSize:'0.9rem', fontWeight:label.startsWith('🚀')?700:500, color:label.startsWith('🚀')?'#D97706':'inherit' }}>{label}</span>
                  <span className={`badge ${cls}`}>{pts}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sample score card */}
          <div className="glass-card" style={{ textAlign:'center', padding:'3rem 2rem', background:'#fff' }}>
            <div style={{ fontSize:'0.75rem', fontWeight:700, letterSpacing:1, textTransform:'uppercase', color:'var(--text-muted)', marginBottom:'1rem' }}>
              Example Report
            </div>
            <svg width="180" height="180" viewBox="0 0 180 180" style={{ display:'block', margin:'0 auto 1.25rem', overflow:'visible' }}>
              {(() => {
                const r=75,cx=90,cy=90,sw=14,score=83.1,circ=2*Math.PI*r,pct=score/100;
                return (<>
                  <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F3F4F6" strokeWidth={sw}/>
                  <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F59E0B" strokeWidth={sw}
                    strokeLinecap="round"
                    strokeDasharray={circ} strokeDashoffset={circ*(1-pct)}
                    transform={`rotate(-90 ${cx} ${cy})`}
                    style={{ filter:'drop-shadow(0 0 6px rgba(245,158,11,0.5))' }}/>
                  <text x={cx} y={cy-5} textAnchor="middle" fill="#1C1917" fontFamily="Outfit,sans-serif" fontSize="28" fontWeight="800">83.1</text>
                  <text x={cx} y={cy+16} textAnchor="middle" fill="#9CA3AF" fontFamily="Inter,sans-serif" fontSize="12">/ 100</text>
                </>);
              })()}
            </svg>
            <div style={{ fontFamily:'Outfit', fontSize:'1.1rem', fontWeight:700, color:'var(--text-primary)' }}>Final Weighted Score</div>
            <div style={{ marginTop:'0.75rem', display:'flex', gap:'0.5rem', justifyContent:'center', flexWrap:'wrap' }}>
              <span className="badge badge-green">⚡ Accelerated</span>
              <span className="badge badge-amber">87.5% Coverage</span>
            </div>
            <div style={{ marginTop:'1.25rem', fontSize:'0.78rem', color:'#78716C', fontFamily:'JetBrains Mono,monospace', textAlign:'left', background:'#FFFBEB', borderRadius:'var(--radius-sm)', padding:'0.75rem', border:'1px solid rgba(245,158,11,0.15)' }}>
              <span style={{ color:'#D97706' }}>&gt;</span> Burst bonus applied: +5.6 pts<br/>
              <span style={{ color:'#D97706' }}>&gt;</span> 7 matched skills / 8 required<br/>
              <span style={{ color:'#D97706' }}>&gt;</span> No bot behavior detected
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────────────────────── */}
      <section className="cta-banner" id="pricing">
        <h2 className="section-heading" style={{ fontSize:'2.25rem', color:'#78350F' }}>
          Start screening smarter today
        </h2>
        <p style={{ color:'#92400E', marginBottom:'2.5rem', fontSize:'1rem' }}>
          No setup required. Just a PDF and a job description.
        </p>
        <button className="btn btn-free-trial btn-lg" onClick={() => setAuthModal('register')}
          style={{ fontSize:'1rem', padding:'1rem 2.5rem', borderRadius:'var(--radius-sm)' }}>
          Launch HireLens Free →
        </button>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer>
        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
          <HireLensLogo size={30} />
          <div>
            <div className="logo-wordmark" style={{ fontSize:'1.15rem' }}>
              Hire<span className="logo-accent">Lens</span>
            </div>
            <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginTop:'0.2rem' }}>
              Screen, interview, and upskill your AI-powered workforce
            </div>
          </div>
        </div>
        <div className="footer-right">
          <span className="hackathon-badge">🏆 Hackathon 4.0</span>
          <span>Built with FastAPI · LangChain · D3.js · React</span>
        </div>
      </footer>

      {/* ── Auth Modal ──────────────────────────────────────────── */}
      {authModal && (
        <div className="modal-backdrop" onClick={() => setAuthModal(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
          <div className="glass-card" onClick={e => e.stopPropagation()} style={{ width:'100%', maxWidth:400, background:'#fff', padding:'2rem', position:'relative' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setAuthModal(null)} style={{ position:'absolute', top:'1rem', right:'1rem' }}>✕</button>
            <h2 style={{ fontFamily:'Outfit', fontSize:'1.5rem', fontWeight:800, marginBottom:'0.5rem' }}>
              {authModal === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p style={{ color:'var(--text-secondary)', fontSize:'0.9rem', marginBottom:'1.5rem' }}>
              {authModal === 'login' ? 'Sign in to evaluate candidates.' : 'Register to start your free trial.'}
            </p>
            
            <form onSubmit={handleAuth} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              <div>
                <label style={{ display:'block', fontSize:'0.8rem', fontWeight:600, marginBottom:'0.25rem', color:'var(--text-secondary)' }}>Email</label>
                <input type="email" className="form-textarea" style={{ height:'40px', minHeight:'40px', padding:'0 0.75rem', overflow:'hidden', resize:'none' }}
                  value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:'0.8rem', fontWeight:600, marginBottom:'0.25rem', color:'var(--text-secondary)' }}>Password</label>
                <input type="password" className="form-textarea" style={{ height:'40px', minHeight:'40px', padding:'0 0.75rem', overflow:'hidden', resize:'none' }}
                  value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={authLoading} style={{ marginTop:'0.5rem' }}>
                {authLoading ? <span className="spinner"/> : (authModal === 'login' ? 'Sign In' : 'Sign Up')}
              </button>
            </form>
            
            <div style={{ marginTop:'1.5rem', textAlign:'center', fontSize:'0.85rem', color:'var(--text-secondary)' }}>
              {authModal === 'login' ? "Don't have an account? " : "Already have an account? "}
              <button className="btn btn-ghost btn-sm" style={{ display:'inline', padding:0, color:'var(--accent-primary)' }} onClick={() => setAuthModal(authModal === 'login' ? 'register' : 'login')}>
                {authModal === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
