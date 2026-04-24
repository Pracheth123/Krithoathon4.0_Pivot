import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Network } from 'lucide-react';
import MagneticButton from './MagneticButton';

export default function PanelGraph({ graphData, gapAnalysis, showGap, setShowGap }) {
  const containerRef = useRef(null);
  const [zoom, setZoom]   = useState(1);

  useEffect(() => {
    if (!graphData?.nodes?.length || !containerRef.current) return;
    console.log("PanelGraph received gapAnalysis:", gapAnalysis);

    const el = containerRef.current;
    el.innerHTML = '';
    const W = el.clientWidth;
    const H = el.clientHeight;

    const svgRoot = d3.select(el).append('svg').attr('width', W).attr('height', H);

    // ── Defs ──
    const defs = svgRoot.append('defs');

    const addGlow = (id, color, stdDev) => {
      const f = defs.append('filter').attr('id', id)
        .attr('x', '-40%').attr('y', '-40%').attr('width', '180%').attr('height', '180%');
      f.append('feGaussianBlur').attr('stdDeviation', stdDev).attr('result', 'blur');
      const m = f.append('feMerge');
      m.append('feMergeNode').attr('in', 'blur');
      m.append('feMergeNode').attr('in', 'SourceGraphic');
    };

    addGlow('glow-cyan', '#00b4d8', 3);
    addGlow('glow-red',  '#FF3131', 4);

    // Zoom behaviour
    const g = svgRoot.append('g');
    const zoomBeh = d3.zoom()
      .scaleExtent([0.4, 3.5])
      .on('zoom', (evt) => {
        g.attr('transform', evt.transform);
        setZoom(evt.transform.k);
        // Show/hide labels based on zoom level
        g.selectAll('text.node-label')
          .attr('opacity', evt.transform.k >= 1.2 ? 1 : 0);
      });

    svgRoot.call(zoomBeh);

    const nodes = (graphData?.nodes || []).map(d => ({ ...d }));
    const links = (graphData?.edges || graphData?.links || []).map(d => ({ ...d }));

    const sim = d3.forceSimulation(nodes)
      .force('link',   d3.forceLink(links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-220))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide().radius(d => d.core ? 24 : 16));

    const isGap  = (d) => showGap && gapAnalysis?.missing_skills?.includes(d.id);
    const isCore = (d) => d.core;

    // ── Links — schematic style ──
    const linkEl = g.append('g').selectAll('line')
      .data(links).enter().append('line')
      .attr('class', 'link-flow');

    // ── Nodes — crisp technical dots ──
    const nodeG = g.append('g');
    const nodeSel = nodeG.selectAll('g.node')
      .data(nodes).enter().append('g').attr('class', 'node')
      .call(
        d3.drag()
          .on('start', (evt, d) => { if (!evt.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on('drag',  (evt, d) => { d.fx = evt.x; d.fy = evt.y; })
          .on('end',   (evt, d) => { if (!evt.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    // Outer ring
    nodeSel.append('circle')
      .attr('r', d => isCore(d) ? 14 : 8)
      .attr('fill', d => {
        if (isGap(d))  return 'rgba(255,49,49,0.12)';
        if (isCore(d)) return 'rgba(0,180,216,0.08)';
        return 'rgba(0,86,179,0.12)';
      })
      .attr('stroke', d => {
        if (isGap(d))  return '#FF3131';
        if (isCore(d)) return 'rgba(0,180,216,0.7)';
        return 'rgba(0,180,216,0.28)';
      })
      .attr('stroke-width', d => isCore(d) ? 1.2 : 0.8)
      .attr('filter', d => {
        if (isGap(d))  return 'url(#glow-red)';
        if (isCore(d)) return 'url(#glow-cyan)';
        return null;
      });

    // Core dot
    nodeSel.append('circle')
      .attr('r', d => isCore(d) ? 3.5 : 2)
      .attr('fill', d => {
        if (isGap(d))  return '#FF3131';
        if (isCore(d)) return '#00b4d8';
        return 'rgba(0,180,216,0.5)';
      })
      .attr('pointer-events', 'none');

    // Labels — hidden at default zoom, appear on zoom-in or node hover
    nodeSel.append('text')
      .attr('class', 'node-label')
      .attr('dy', d => (isCore(d) ? 14 : 8) + 12)
      .attr('text-anchor', 'middle')
      .attr('opacity', 0)   // default hidden
      .text(d => d.id)
      .attr('class', d => isCore(d) ? 'node-text-core node-label' : 'node-schematic node-label')
      .style('font-size', d => isCore(d) ? '10px' : '9px')
      .style('fill', d => {
        if (isGap(d))  return '#FF3131';
        if (isCore(d)) return 'rgba(0,180,216,0.9)';
        return 'rgba(91,141,184,0.75)';
      })
      .style('pointer-events', 'none');

    // Hover to reveal label
    nodeSel
      .on('mouseenter', function() {
        d3.select(this).select('text.node-label').attr('opacity', 1);
      })
      .on('mouseleave', function() {
        if (zoom < 1.2) d3.select(this).select('text.node-label').attr('opacity', 0);
      });

    sim.on('tick', () => {
      linkEl
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      nodeSel.attr('transform', d => `translate(${
        Math.max(18, Math.min(W - 18, d.x))},${
        Math.max(18, Math.min(H - 18, d.y))})`);
    });

    return () => sim.stop();
  }, [graphData, showGap]);

  const nodes = graphData?.nodes || [];
  const links = graphData?.edges || graphData?.links || [];

  if (nodes.length === 0) {
    return (
      <div className="panel-card">
        <div className="panel-header">
          <div className="panel-title"><Network size={13} className="panel-title-icon" />Skill Gap Topology</div>
        </div>
        <div className="empty-state">
          <Network size={32} color="rgba(0,180,216,0.18)" />
          <div className="empty-state-title">Awaiting graph data</div>
          <div className="empty-state-sub">Nodes populate once the backend provides skill taxonomy.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-card">
      <div className="panel-header">
        <div className="panel-title">
          <Network size={13} className="panel-title-icon" />
          Competitive Skill Gap Topology
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', marginLeft: 6 }}>Scroll to zoom · Drag nodes</span>
        </div>
        <MagneticButton
          variant={showGap ? 'primary' : 'secondary'}
          onClick={() => setShowGap(v => !v)}
          style={{ padding: '3px 10px', fontSize: '0.72rem' }}
        >
          {showGap ? 'Gap: ON' : 'Gap View'}
        </MagneticButton>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div ref={containerRef} className="graph-container" style={{ width: '100%', height: '100%' }} />
        <div style={{
          position: 'absolute', bottom: 8, right: 10,
          fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)',
          background: 'rgba(0,0,0,0.4)', padding: '2px 7px', borderRadius: 4,
        }}>
          {nodes.length}N · {links.length}L · {Math.round(zoom * 100)}%
        </div>
      </div>
    </div>
  );
}
