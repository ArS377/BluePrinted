import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createMapLayout, mapGroups as groups, moveBlock, wirePath } from "../map-layout.js";
const kindLabel = (kind) => ({ component: "UI", route: "API", service: "Service", table: "Storage", ai: "AI", websocket: "Socket" }[kind] || kind);

export function Blueprint({ manifest, evidence = [], activeNodeId, diff, sample = false }) {
  const [selectedId, setSelectedId] = useState(null);
  const [width, setWidth] = useState(760);
  const [moves, setMoves] = useState({});
  const [dragging, setDragging] = useState(null);
  const [announcement, setAnnouncement] = useState("");
  const drag = useRef(null);
  const suppressClick = useRef(false);
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
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setWidth(entry.contentRect.width);
    });
    if (frame.current) observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);

  const layout = createMapLayout(manifest.nodes, width, moves);
  const { nodeWidth, height, positions, columns: columnNodes, compact } = layout;
  const move = (id, x, y) => setMoves((current) => ({ ...current, [id]: moveBlock(layout, id, x, y) }));

  function startDrag(event, node) {
    suppressClick.current = false;
    if (event.button !== 0 || event.pointerType === "touch") return;
    const position = positions.get(node.id);
    drag.current = { id: node.id, clientX: event.clientX, clientY: event.clientY, ...position, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function onDrag(event) {
    const current = drag.current;
    if (!current) return;
    const dx = event.clientX - current.clientX, dy = event.clientY - current.clientY;
    if (!current.moved && Math.hypot(dx, dy) < 5) return;
    current.moved = true;
    setDragging(current.id);
    move(current.id, current.x + dx, current.y + dy);
  }
  function endDrag() {
    suppressClick.current = Boolean(drag.current?.moved);
    if (drag.current?.moved) setAnnouncement("Block moved. Only this map layout changed.");
    drag.current = null;
    setDragging(null);
  }
  function keyMove(event, node) {
    const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    const position = positions.get(node.id), distance = event.shiftKey ? 32 : 8;
    move(node.id, position.x + direction[0] * distance, position.y + direction[1] * distance);
    setAnnouncement(`${node.label} moved ${event.key.slice(5).toLowerCase()}. Only this map layout changed.`);
  }

  return (
    <section className="blueprint" aria-label="Application architecture">
      <header className="blueprint-caption">
        <div><h2>Inside the app</h2><p>{sample ? "Each block is a part of the working sample." : manifest.summary}</p></div>
        <div className="blueprint-legend">
          <span><i className="legend-mark observed" />Observed</span>
          <span><i className="legend-mark inferred" />{sample ? "Not run" : "Declared"}</span>
        </div>
      </header>
      <div className="canvas-toolbar"><span>{compact ? "Tap a block to look inside" : "Drag to arrange · Click to inspect"}</span>
        <button type="button" className="canvas-reset" disabled={!Object.keys(moves).length} onClick={() => { setMoves({}); setAnnouncement("Map layout reset."); }}>↺ Reset layout</button>
      </div>
      <p className="sr-only" id={`map-help-${marker}`}>Focus a block and use arrow keys to move it, Shift for larger steps. Enter opens details. Moving blocks changes this view only.</p>
      <span className="sr-only" role="status">{announcement}</span>
      <div className="map-viewport" ref={frame} role="region" aria-label="Architecture canvas">
        <div className={`map-canvas ${compact ? "is-compact" : ""}`} style={{ width: layout.width, height }}>
          <svg className="map-edges" width={layout.width} height={height} aria-hidden="true">
            <defs><marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" /></marker></defs>
            {manifest.edges.map((edge) => <path key={edge.id} d={wirePath(layout, edge)}
              className={`map-edge ${edge.source === focusId || edge.target === focusId ? "is-active" : ""} ${edge.evidence === "runtime_observed" ? "is-observed" : ""}`}
              markerEnd={`url(#${marker})`} />)}
          </svg>
          {!compact && groups.map((group, column) => <div className={`map-group-label tone-${group.tone}`} style={{ left: 24 + column * (nodeWidth + 32), width: nodeWidth }} key={group.label}>
            <span>{group.label}</span><small>{columnNodes[column].length}</small>
          </div>)}
          {manifest.nodes.map((node) => {
            const position = positions.get(node.id);
            if (!position) return null;
            return <button type="button" key={node.id} style={{ left: position.x, top: position.y, width: nodeWidth }}
              className={`map-node tone-${groups[position.column].tone} ${observed.has(node.id) ? "is-observed" : "is-inferred"} ${node.id === activeNodeId ? "is-active" : ""} ${selectedId === node.id ? "is-selected" : ""} ${added.has(node.id) ? "is-added" : ""} ${dragging === node.id ? "is-dragging" : ""}`}
              aria-pressed={selectedId === node.id} aria-describedby={`map-help-${marker}`}
              onPointerDown={(event) => startDrag(event, node)} onPointerMove={onDrag} onPointerUp={endDrag} onPointerCancel={endDrag}
              onKeyDown={(event) => keyMove(event, node)}
              onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } setSelectedId(node.id === selectedId ? null : node.id); }}>
              <span className="node-kind"><span className="block-symbol" aria-hidden="true">{node.kind === "component" ? "▤" : node.kind === "table" ? "▥" : "⇄"}</span>{kindLabel(node.kind)}{added.has(node.id) && <span>Added</span>}{changed.has(node.id) && <span>Changed</span>}<span className="block-grip" aria-hidden="true">⠿</span></span>
              <strong>{node.label}</strong>
              <span className="node-evidence"><i />{observed.has(node.id) ? "Seen in this trace" : sample ? "Not run yet" : "Declared by Replit"}</span>
            </button>;
          })}
        </div>
      </div>
      <p className="map-note">Wires follow {sample ? "the sample code" : "the architecture snapshot"}. Moving blocks changes this view, not your app.</p>
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
