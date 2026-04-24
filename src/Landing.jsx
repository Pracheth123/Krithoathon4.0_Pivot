import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import {
  Network, Shield, Brain, BarChart3, GitBranch, FileText,
  ArrowRight, CheckCircle, ChevronRight, Globe, Lock, Zap
} from 'lucide-react';

/* ─────────────────────────── Constants ─────────────────────────── */
const C = {
  navyBase:   '#051923',
  navyMid:    '#071e38',
  royal:      '#0056b3',
  cyan:       '#00bfff',
  cyanDim:    'rgba(0,191,255,0.12)',
  cyanGlow:   'rgba(0,191,255,0.35)',
  amber:      '#FFB300',
  glass:      'rgba(5,25,50,0.45)',
  glassBorder:'rgba(255,255,255,0.10)',
  textPrimary:'#ddeeff',
  textMid:    '#6baed6',
  textMuted:  '#2e6899',
};

const stats = [
  { value: "94%", label: "Match Accuracy" },
  { value: "3.2x", label: "Faster Screening" },
  { value: "60%", label: "Bias Reduction" },
  { value: "10K+", label: "Resumes Processed" },
];

const features = [
  { icon: Brain,     title: "Semantic Skill Matching",       desc: "Maps real-world experience to standardized taxonomy using LLM — no keyword guessing, no missed talent." },
  { icon: Shield,    title: "TCFE Fairness Engine",           desc: "Detects burst-committing and artificial inflation so your shortlist reflects genuine expertise." },
  { icon: Network,   title: "Skill Gap Topology",             desc: "Interactive D3 force graph reveals your talent pool's capability landscape at a glance." },
  { icon: FileText,  title: "PII-Safe Processing",            desc: "spaCy NER strips all personally identifiable information before any data is stored or compared." },
  { icon: BarChart3, title: "XAI Explainability",             desc: "Every rank comes with a human-readable reason. No black boxes — just clear, auditable decisions." },
  { icon: GitBranch, title: "GitHub Signal Intelligence",     desc: "Validates technical claims by analysing commit continuity and repository diversity independently." },
];

const steps = [
  { num: "01", title: "Upload Resumes",        desc: "PDF or DOCX via drag-and-drop. PII is stripped automatically before indexing." },
  { num: "02", title: "Paste Job Description", desc: "The AI normalises requirements into standardised skill taxonomy for exact comparison." },
  { num: "03", title: "Rank & Hire",            desc: "Receive an explainable ranked list with GitHub credibility flags and gap insights." },
];

/* ─────────────────────────── Magnetic Button ─────────────────────────── */
function MagBtn({ children, onClick, style = {}, dark = false }) {
  const ref = useRef(null);

  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width  / 2)) * 0.28;
    const dy = (e.clientY - (r.top  + r.height / 2)) * 0.28;
    ref.current.style.transform = `translate(${dx}px,${dy}px) scale(1.07)`;
  };

  const onLeave = () => { ref.current.style.transform = ''; };

  return (
    <button
      ref={ref}
      onClick={onClick}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '13px 28px', borderRadius: 9, border: 'none',
        fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: '0.95rem',
        cursor: 'pointer',
        background: dark
          ? 'rgba(0,191,255,0.06)'
          : `linear-gradient(135deg, ${C.royal}, #0077cc)`,
        color: dark ? C.cyan : '#fff',
        border: dark ? `1.5px solid rgba(0,191,255,0.3)` : 'none',
        boxShadow: dark ? 'none' : '0 4px 20px rgba(0,86,179,0.45)',
        transition: 'transform 0.12s ease, box-shadow 0.2s ease, background 0.2s',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/* ─────────────────────────── Background D3 CSGT Tease ─────────────────────────── */
function D3Background() {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const W = el.clientWidth || 1200;
    const H = el.clientHeight || 600;

    // Lightweight node set — decorative only
    const nodes = [
      { id: 'AI/ML',              core: true  },
      { id: 'Backend',            core: true  },
      { id: 'Frontend',           core: true  },
      { id: 'React',              core: false },
      { id: 'Python',             core: false },
      { id: 'Node.js',            core: false },
      { id: 'Docker',             core: false },
      { id: 'AWS',                core: false },
      { id: 'SQL',                core: false },
      { id: 'Scrum',              core: false },
      { id: 'Deep Learning',      core: false },
      { id: 'TypeScript',         core: false },
    ];

    const links = [
      { source: 'AI/ML',    target: 'Python'      },
      { source: 'AI/ML',    target: 'Deep Learning'},
      { source: 'Backend',  target: 'Node.js'     },
      { source: 'Backend',  target: 'Docker'      },
      { source: 'Backend',  target: 'AWS'         },
      { source: 'Backend',  target: 'SQL'         },
      { source: 'Frontend', target: 'React'       },
      { source: 'Frontend', target: 'TypeScript'  },
      { source: 'Backend',  target: 'Scrum'       },
      { source: 'AI/ML',    target: 'Backend'     },
    ];

    const svg = d3.select(el)
      .append('svg')
      .attr('width', '100%').attr('height', '100%')
      .style('overflow', 'visible');

    const defs = svg.append('defs');
    const glow = defs.append('filter').attr('id', 'bg-glow');
    glow.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur');
    const merge = glow.append('feMerge');
    merge.append('feMergeNode').attr('in', 'blur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    const sim = d3.forceSimulation(nodes)
      .force('link',   d3.forceLink(links).id(d => d.id).distance(130))
      .force('charge', d3.forceManyBody().strength(-250))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .alphaDecay(0.02);

    // Animated data-flow links
    const linkEl = svg.append('g').selectAll('line')
      .data(links).enter().append('line')
      .attr('stroke', 'rgba(0,191,255,0.18)')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '6 5')
      .style('animation', 'data-flow 2s linear infinite');

    // Outer transparent sphere
    const outerCircle = svg.append('g').selectAll('circle.outer')
      .data(nodes).enter().append('circle')
      .attr('class', 'outer')
      .attr('r', d => d.core ? 20 : 12)
      .attr('fill', d => d.core ? 'rgba(0,191,255,0.08)' : 'rgba(0,86,179,0.12)')
      .attr('stroke', d => d.core ? 'rgba(0,191,255,0.6)' : 'rgba(0,191,255,0.25)')
      .attr('stroke-width', d => d.core ? 1.5 : 1)
      .attr('filter', d => d.core ? 'url(#bg-glow)' : null);

    // Bright core dot
    const coreDot = svg.append('g').selectAll('circle.dot')
      .data(nodes).enter().append('circle')
      .attr('class', 'dot')
      .attr('r', d => d.core ? 5 : 3)
      .attr('fill', d => d.core ? '#00bfff' : 'rgba(0,191,255,0.5)');

    // Labels
    const labels = svg.append('g').selectAll('text')
      .data(nodes).enter().append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', d => (d.core ? 20 : 12) + 14)
      .text(d => d.id)
      .style('fill', d => d.core ? 'rgba(0,191,255,0.7)' : 'rgba(221,238,255,0.35)')
      .style('font-family', "'Inter', sans-serif")
      .style('font-size', d => d.core ? '11px' : '10px')
      .style('pointer-events', 'none');

    sim.on('tick', () => {
      linkEl
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      outerCircle
        .attr('cx', d => d.x).attr('cy', d => d.y);
      coreDot
        .attr('cx', d => d.x).attr('cy', d => d.y);
      labels
        .attr('x', d => d.x).attr('y', d => d.y);
    });

    return () => { sim.stop(); el.innerHTML = ''; };
  }, []);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute', inset: 0,
        opacity: 0.55, pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}

/* ─────────────────────────── Main Landing ─────────────────────────── */
export default function Landing({ onEnterDashboard }) {
  return (
    <div style={{
      fontFamily: "'Inter', sans-serif",
      background: `radial-gradient(ellipse at 20% 20%, #0a2a45 0%, ${C.navyBase} 50%, #030f1a 100%)`,
      backgroundAttachment: 'fixed',
      color: C.textPrimary,
      overflowY: 'auto',
      height: '100vh',
    }}>
      {/* ── Global data-flow keyframe ── */}
      <style>{`@keyframes data-flow { to { stroke-dashoffset: -22; } }`}</style>

      {/* ══════════════════ NAV ══════════════════ */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 5%', height: 64,
        background: 'rgba(3,15,26,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,191,255,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: `linear-gradient(135deg, ${C.royal}, ${C.cyan})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 16px ${C.cyanDim}`,
          }}>
            <Network size={17} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff', letterSpacing: '-0.3px', lineHeight: 1 }}>HireLens</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.6rem', color: C.textMuted, lineHeight: 1, marginTop: 2, letterSpacing: '0.05em' }}>AI RECRUITMENT PLATFORM</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 28, fontSize: '0.85rem', color: C.textMid, fontWeight: 500 }}>
          {['Features', 'How it Works', 'About'].map(l => (
            <span key={l} style={{ cursor: 'pointer', transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = C.cyan}
              onMouseLeave={e => e.target.style.color = C.textMid}
            >{l}</span>
          ))}
        </div>

        <MagBtn onClick={onEnterDashboard} style={{ padding: '8px 18px', fontSize: '0.82rem' }}>
          Open Dashboard <ChevronRight size={14} />
        </MagBtn>
      </nav>

      {/* ══════════════════ HERO ══════════════════ */}
      <section style={{
        minHeight: '90vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        padding: '80px 5% 60px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background D3 tease */}
        <D3Background />

        {/* Hero Glass Container */}
        <div style={{
          position: 'relative', zIndex: 2,
          maxWidth: 820, width: '100%',
          background: 'rgba(5,25,50,0.4)',
          backdropFilter: 'blur(25px)',
          WebkitBackdropFilter: 'blur(25px)',
          borderRadius: 20, padding: '52px 56px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
          /* Gradient border */
          outline: '1px solid transparent',
          backgroundClip: 'padding-box',
          border: '1px solid rgba(255,255,255,0.10)',
        }}>
          {/* Gradient border overlay */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 20, padding: 1,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(0,191,255,0.15) 50%, transparent 100%)',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            maskComposite: 'exclude',
            pointerEvents: 'none',
          }} />

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(0,191,255,0.08)',
            border: '1px solid rgba(0,191,255,0.25)',
            borderRadius: 20, padding: '4px 14px',
            fontSize: '0.72rem', fontWeight: 700, color: C.cyan,
            letterSpacing: '0.06em', marginBottom: 24,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            <Zap size={12} /> AI-POWERED RECRUITMENT · VNRVJIET HACKATHON 2026
          </div>

          <h1 style={{
            fontSize: 'clamp(2.2rem, 4.5vw, 3.6rem)', fontWeight: 800,
            lineHeight: 1.08, letterSpacing: '-0.04em', marginBottom: 18, color: '#fff',
          }}>
            Stop Letting <span style={{ color: C.cyan }}>ATS Systems</span><br />
            Filter Out Your Best Talent
          </h1>

          <p style={{
            fontSize: 'clamp(0.95rem, 1.4vw, 1.08rem)', color: C.textMid,
            maxWidth: 580, margin: '0 auto 36px', lineHeight: 1.75,
          }}>
            HireLens replaces brittle keyword matching with semantic understanding, GitHub credibility analysis, and explainable AI scoring — structured as a real-time command center.
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <MagBtn onClick={onEnterDashboard}>
              Launch Dashboard <ArrowRight size={16} />
            </MagBtn>
            <MagBtn dark>
              View Demo
            </MagBtn>
          </div>

          <div style={{
            display: 'flex', gap: 24, marginTop: 36, justifyContent: 'center',
            flexWrap: 'wrap', color: C.textMuted, fontSize: '0.78rem', fontWeight: 500,
          }}>
            {["No keyword bias", "GitHub TCFE scoring", "PII-safe by default", "XAI explainability"].map(t => (
              <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 5, color: C.textMid }}>
                <CheckCircle size={13} color={C.cyan} /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════ STATS BAR ══════════════════ */}
      <section style={{
        background: 'rgba(0,86,179,0.15)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(0,191,255,0.1)',
        borderBottom: '1px solid rgba(0,191,255,0.1)',
        padding: '28px 5%',
        display: 'flex', justifyContent: 'center', gap: '8%', flexWrap: 'wrap',
      }}>
        {stats.map(s => (
          <div key={s.label} style={{ textAlign: 'center', padding: '6px 0' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: C.cyan, letterSpacing: '-0.04em', textShadow: `0 0 20px ${C.cyanGlow}` }}>{s.value}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', color: C.textMuted, marginTop: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{s.label}</div>
          </div>
        ))}
      </section>

      {/* ══════════════════ FEATURES ══════════════════ */}
      <section style={{ padding: '90px 5%', background: 'rgba(5,25,50,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', fontWeight: 700, color: C.cyan, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
            Platform Capabilities
          </div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: 800, letterSpacing: '-0.03em', color: '#fff' }}>
            Built for fairness. Engineered for precision.
          </h2>
          <p style={{ color: C.textMid, maxWidth: 500, margin: '14px auto 0', lineHeight: 1.65, fontSize: '0.95rem' }}>
            Every feature surfaces the most capable candidates — not just the most keyword-optimised ones.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 18, maxWidth: 1100, margin: '0 auto',
        }}>
          {features.map(f => (
            <FloatingCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      {/* ══════════════════ HOW IT WORKS ══════════════════ */}
      <section style={{ padding: '80px 5%' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', fontWeight: 700, color: C.cyan, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
            Workflow
          </div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: 800, letterSpacing: '-0.03em', color: '#fff' }}>
            Three steps to smarter hiring
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 20, maxWidth: 900, margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
          {steps.map(s => (
            <div key={s.num} style={{
              flex: '1 1 240px', textAlign: 'center',
              padding: '32px 24px',
              background: 'rgba(5,25,50,0.4)', backdropFilter: 'blur(16px)',
              borderRadius: 14,
              border: '1px solid rgba(0,191,255,0.1)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 20px 50px rgba(0,0,0,0.4), 0 0 24px rgba(0,191,255,0.07)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
            >
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '2.4rem', fontWeight: 900, color: C.cyan, opacity: 0.18, letterSpacing: '-0.05em', lineHeight: 1 }}>{s.num}</div>
              <h3 style={{ fontSize: '0.97rem', fontWeight: 700, margin: '12px 0 8px', color: '#fff' }}>{s.title}</h3>
              <p style={{ fontSize: '0.83rem', color: C.textMid, lineHeight: 1.65 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════ CTA ══════════════════ */}
      <section style={{
        padding: '80px 5%', textAlign: 'center',
        background: 'rgba(0,86,179,0.12)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(0,191,255,0.1)',
        borderBottom: '1px solid rgba(0,191,255,0.08)',
      }}>
        <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: 14 }}>
          Ready to find your best candidates?
        </h2>
        <p style={{ color: C.textMid, marginBottom: 36, fontSize: '0.97rem', maxWidth: 480, margin: '0 auto 36px' }}>
          Upload resumes, run a semantic JD search, and see real results — in under 60 seconds.
        </p>
        <MagBtn onClick={onEnterDashboard}>
          Open Dashboard <ArrowRight size={17} />
        </MagBtn>
      </section>

      {/* ══════════════════ FOOTER ══════════════════ */}
      <footer style={{
        padding: '26px 5%',
        background: 'rgba(3,10,20,0.85)',
        borderTop: '1px solid rgba(0,191,255,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: `linear-gradient(135deg, ${C.royal}, ${C.cyan})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Network size={13} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.88rem' }}>HireLens AI</span>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', color: C.textMuted, letterSpacing: '0.04em' }}>
          VNRVJIET HACKATHON '26 · KR0466 · HIRELENS TEAM
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: '0.78rem', color: C.textMuted }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Lock size={12} /> Privacy First</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Globe size={12} /> Open Source</span>
        </div>
      </footer>

    </div>
  );
}

/* ─────────────────────────── Floating Glass Card ─────────────────────────── */
function FloatingCard({ icon: Icon, title, desc }) {
  const lift = (e) => {
    e.currentTarget.style.transform = 'translateY(-8px)';
    e.currentTarget.style.boxShadow = '0 28px 60px rgba(0,0,0,0.45), 0 0 28px rgba(0,191,255,0.07)';
    e.currentTarget.style.borderColor = 'rgba(0,191,255,0.2)';
  };
  const drop = (e) => {
    e.currentTarget.style.transform = '';
    e.currentTarget.style.boxShadow = '';
    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
  };

  return (
    <div
      onMouseEnter={lift}
      onMouseLeave={drop}
      style={{
        background: 'rgba(5,25,50,0.5)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.08)',
        padding: '28px 24px',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
        cursor: 'default',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Gradient border top-left */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 14, padding: 1,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.16) 0%, transparent 60%)',
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        maskComposite: 'exclude',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: 'rgba(0,191,255,0.08)',
        border: '1px solid rgba(0,191,255,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 18,
        boxShadow: '0 0 14px rgba(0,191,255,0.1)',
      }}>
        <Icon size={22} color="#00bfff" />
      </div>
      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 10, color: '#ddeeff' }}>{title}</h3>
      <p style={{ fontSize: '0.83rem', color: '#6baed6', lineHeight: 1.65 }}>{desc}</p>
    </div>
  );
}
