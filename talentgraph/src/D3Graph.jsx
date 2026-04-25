import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const COLOR = {
  central:        '#38bdf8',
  match:          '#34d399',
  candidate_only: '#7dd3fc',
  gap:            '#f87171',
};

export default function D3Graph({ graphData }) {
  const svgRef = useRef(null);
  const simRef = useRef(null);

  useEffect(() => {
    if (!graphData || !svgRef.current) return;

    const container = svgRef.current.parentElement;
    const width  = container.clientWidth  || 800;
    const height = container.clientHeight || 520;

    const svg = d3.select(svgRef.current)
      .attr('width',  width)
      .attr('height', height);

    svg.selectAll('*').remove();

    // Deep clone data so D3 can mutate freely
    const nodes = graphData.nodes.map(n => ({ ...n }));
    const linksRaw = (graphData.links || graphData.edges || []).map(l => ({ ...l }));
    const nodeById = new Map(nodes.map(n => [n.id, n]));
    const links = linksRaw
      .map(l => ({
        source: typeof l.source === 'object' ? l.source.id : l.source,
        target: typeof l.target === 'object' ? l.target.id : l.target,
      }))
      .filter(l => nodeById.has(l.source) && nodeById.has(l.target));

    // Zoom layer
    const g = svg.append('g');
    svg.call(
      d3.zoom().scaleExtent([0.3, 3]).on('zoom', e => g.attr('transform', e.transform))
    );

    // Defs — glow filters
    const defs = svg.append('defs');
    Object.keys(COLOR).forEach(grp => {
      const f = defs.append('filter')
        .attr('id', `glow-${grp}`)
        .attr('x', '-50%').attr('y', '-50%')
        .attr('width', '200%').attr('height', '200%');
      f.append('feGaussianBlur')
        .attr('stdDeviation', grp === 'central' ? 6 : 3)
        .attr('result', 'coloredBlur');
      const m = f.append('feMerge');
      m.append('feMergeNode').attr('in', 'coloredBlur');
      m.append('feMergeNode').attr('in', 'SourceGraphic');
    });

    const rOf = d => d.group === 'central' ? 22 : 12;

    // Simulation
    simRef.current = d3.forceSimulation(nodes)
      .force('link',    d3.forceLink(links).id(d => d.id).distance(90))
      .force('charge',  d3.forceManyBody().strength(-280))
      .force('center',  d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(d => rOf(d) + 10));

    // Links
    const linkEl = g.append('g')
      .selectAll('line').data(links).join('line')
      .attr('stroke', 'rgba(148,163,184,0.2)')
      .attr('stroke-width', 1.5);

    // Node groups
    const nodeEl = g.append('g')
      .selectAll('g').data(nodes).join('g')
      .call(
        d3.drag()
          .on('start', (event, d) => {
            if (!event.active) simRef.current.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on('end',  (event, d) => {
            if (!event.active) simRef.current.alphaTarget(0);
            d.fx = null; d.fy = null;
          })
      );

    // Glow ring for central
    nodeEl.filter(d => d.group === 'central')
      .append('circle')
      .attr('r', d => rOf(d) + 8)
      .attr('fill', 'none')
      .attr('stroke', d => COLOR[d.group] || '#38bdf8')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.35);

    // Main circle
    nodeEl.append('circle')
      .attr('r', rOf)
      .attr('fill',   d => COLOR[d.group] || '#94a3b8')
      .attr('filter', d => `url(#glow-${d.group})`)
      .attr('stroke', d => (COLOR[d.group] || '#94a3b8') + '55')
      .attr('stroke-width', 2)
      .style('cursor', 'grab');

    // Labels
    nodeEl.append('text')
      .attr('dy',           d => d.group === 'central' ? -28 : -16)
      .attr('text-anchor',  'middle')
      .attr('font-family',  'JetBrains Mono, monospace')
      .attr('font-size',    d => d.group === 'central' ? 11 : 10)
      .attr('font-weight',  d => d.group === 'central' ? '700' : '500')
      .attr('fill',         d => COLOR[d.group] || '#94a3b8')
      .attr('pointer-events','none')
      .text(d => d.id);

    simRef.current.on('tick', () => {
      linkEl
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      nodeEl.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => { if (simRef.current) simRef.current.stop(); };
  }, [graphData]);

  return <svg ref={svgRef} />;
}
