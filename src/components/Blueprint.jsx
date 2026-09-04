import { useEffect, useId, useMemo, useRef, useState } from "react";

const groups = [
  { label: "Interface", kinds: ["component"], tone: "iris" },
  { label: "Application", kinds: ["route", "service"], tone: "clay" },
  { label: "Data & services", kinds: ["table", "ai", "websocket"], tone: "teal" }
];
const kindLabel = (kind) => ({ component: "UI", route: "API", service: "Service", table: "Storage", ai: "AI", websocket: "Socket" }[kind] || kind);

export function Blueprint({ manifest, evidence = [], activeNodeId, diff, sample = false }) {
  const [selectedId, setSelectedId] = useState(null);
  const [width, setWidth] = useState(760);
  const frame = useRef(null);
  const marker = useId().replaceAll(":", "");
  const observed = useMemo(() => new Set([
    ...evidence.map((item) => item.nodeId),
    ...manifest.nodes.filter((node) => node.evidence === "runtime_observed").map((node) => node.id)
  ]), [evidence, manifest]);
  const selected = manifest.nodes.find((node) => node.id === selectedId);
  const focusId = selected?.id || activeNodeId;
  const related = selected ? manifest.edges.filter((edge) => edge.source === selected.id || edge.target === selected.id) : manifest.edges;
  const added = new Set(diff?.nodes?.added || []);
  const changed = new Set(diff?.nodes?.changed || []);
  useEffect(() => { setSelectedId(null); }, [activeNodeId]);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(660, entry.contentRect.width)));
    if (frame.current) observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);

  const columnNodes = groups.map((group) => manifest.nodes.filter((node) => group.kinds.includes(node.kind)));
  const nodeWidth = (width - 120) / 3;
  const height = Math.max(290, Math.max(...columnNodes.map((nodes) => nodes.length)) * 132 + 100);
  const positions = new Map();
  columnNodes.forEach((nodes, column) => nodes.forEach((node, row) => {
    positions.set(node.id, { x: 24 + column * (nodeWidth + 36), y: 72 + row * 132, column });
  }));

  function edgePath(edge) {
    const source = positions.get(edge.source);
    const target = positions.get(edge.target);
    if (!source || !target) return "";
    if (source.column === target.column) {
      const x = source.x + nodeWidth;
      const y1 = source.y + 50, y2 = target.y + 50;
      return `M ${x} ${y1} C ${x + 28} ${y1}, ${x + 28} ${y2}, ${x} ${y2}`;
    }
    const forward = target.x > source.x;
    const x1 = source.x + (forward ? nodeWidth : 0);
    const x2 = target.x + (forward ? 0 : nodeWidth);
    const y1 = source.y + 48, y2 = target.y + 48;
    const middle = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${middle} ${y1}, ${middle} ${y2}, ${x2} ${y2}`;
  }

  return (
    <section className="blueprint" aria-label="Application architecture">
      <header className="blueprint-caption">
        <div><h2>Architecture</h2><p>{sample ? "Four boundaries in this sample. Select one to inspect it." : manifest.summary}</p></div>
        <div className="blueprint-legend">
          <span><i className="legend-mark observed" />Observed</span>
          <span><i className="legend-mark inferred" />{sample ? "Not run" : "Declared"}</span>
        </div>
      </header>
      <span className="map-scroll-hint">Scroll the diagram to see all boundaries →</span>
      <div className="map-viewport" ref={frame} tabIndex={0} role="region" aria-label="Scrollable architecture diagram">
        <div className="map-canvas" style={{ width, height }}>
          <svg className="map-edges" width={width} height={height} aria-hidden="true">
            <defs><marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" /></marker></defs>
            {manifest.edges.map((edge) => <path key={edge.id} d={edgePath(edge)}
              className={`map-edge ${edge.source === focusId || edge.target === focusId ? "is-active" : ""} ${edge.evidence === "runtime_observed" ? "is-observed" : ""}`}
              markerEnd={`url(#${marker})`} />)}
          </svg>
          {groups.map((group, column) => <div className={`map-group-label tone-${group.tone}`} style={{ left: 24 + column * (nodeWidth + 36), width: nodeWidth }} key={group.label}>
            <span>{group.label}</span><small>{columnNodes[column].length}</small>
          </div>)}
          {manifest.nodes.map((node) => {
            const position = positions.get(node.id);
            if (!position) return null;
            return <button type="button" key={node.id} style={{ left: position.x, top: position.y, width: nodeWidth }}
              className={`map-node tone-${groups[position.column].tone} ${observed.has(node.id) ? "is-observed" : "is-inferred"} ${node.id === activeNodeId ? "is-active" : ""} ${selectedId === node.id ? "is-selected" : ""} ${added.has(node.id) ? "is-added" : ""}`}
              aria-pressed={selectedId === node.id} onClick={() => setSelectedId(node.id === selectedId ? null : node.id)}>
              <span className="node-kind">{kindLabel(node.kind)}{added.has(node.id) && <span>Added</span>}{changed.has(node.id) && <span>Changed</span>}</span>
              <strong>{node.label}</strong>
              <span className="node-evidence"><i />{observed.has(node.id) ? "Observed in trace" : sample ? "Waiting for an action" : "Declared by Replit"}</span>
            </button>;
          })}
        </div>
      </div>
      <p className="map-note">Connections come from {sample ? "the sample code" : "the architecture snapshot"}. Highlighted boundaries follow the selected event.</p>
      {selected && <aside className="node-inspector" aria-label="Selected boundary">
        <div className="section-heading"><h3>{selected.label}</h3><button className="icon-button" type="button" onClick={() => setSelectedId(null)} aria-label="Close boundary detail">×</button></div>
        <code>{selected.id}</code>
        {selected.sourceFile && <p>Source <code>{selected.sourceFile}</code></p>}
        <dl>{Object.entries(selected.metadata || {}).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value)}</dd></div>)}</dl>
      </aside>}
      <details className="connection-register" key={selectedId || "all"} open={selected ? true : undefined}>
        <summary>{selected ? `Connections to ${selected.label}` : "All connections"} <span>{related.length}</span></summary>
        <div className="connection-lines">{related.map((edge) => <button type="button" key={edge.id} onClick={() => setSelectedId(edge.target)}>
          <span>{manifest.nodes.find((node) => node.id === edge.source)?.label || edge.source}</span>
          <i>{edge.relationship} →</i><span>{manifest.nodes.find((node) => node.id === edge.target)?.label || edge.target}</span>
        </button>)}
        {!related.length && <p>No connections declared.</p>}</div>
      </details>
      {diff && <footer className="diff-strip"><strong>Since the previous snapshot</strong><span>+{diff.nodes.added.length} added</span><span>{diff.nodes.changed.length} changed</span><span>−{diff.nodes.removed.length} removed</span></footer>}
    </section>
  );
}
