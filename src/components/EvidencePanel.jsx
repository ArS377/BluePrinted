import { useEffect, useRef, useState } from "react";

function eventTime(event, first) {
  if (Number.isFinite(event.at)) return `+${event.at} ms`;
  const delta = new Date(event.timestamp).getTime() - new Date(first.timestamp).getTime();
  return Number.isFinite(delta) ? `+${Math.max(0, delta)} ms` : "";
}
function eventTitle(event) {
  return event.title || ({
    "ui.action": "Interface action", "http.client": "Browser request", "http.server": "Route handled",
    "db.query": "Storage operation", "ai.call": "Model call", "ws.publish": "Message sent",
    "ws.receive": "Message received", "fault.applied": "Test failure applied", error: "Error observed"
  }[event.kind] || event.kind);
}

export function EvidencePanel({ project, traces, activeTrace, activeEventId, onTrace, onEvent, diagnosis, diagnosisError, diagnosisBusy, onInvestigate, onViewMap, live }) {
  const [section, setSection] = useState("trace");
  const explanation = useRef(null);
  const events = activeTrace?.events || [];
  const first = events[0] || {};
  const selected = events.find((event) => event.id === activeEventId);
  const firstError = events.find((event) => event.kind === "error" || event.level === "error" || event.errorClass);
  const sample = project.id === "sample";
  const nodeName = (event) => event.nodeId?.split(":").slice(1).join(":") || event.node || event.kind;

  useEffect(() => {
    if (!diagnosis && !diagnosisError) return;
    const frame = window.requestAnimationFrame(() => {
      explanation.current?.focus({ preventScroll: true });
      explanation.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [diagnosis, diagnosisError]);

  return (
    <aside className="evidence-panel">
      <header className="evidence-head"><h2>{section === "trace" ? "Activity" : "Build record"}</h2>
        <span className={`live-signal ${live ? "is-live" : ""}`}><i />{sample ? "Sample" : live ? "Feed open" : "Offline"}</span>
      </header>
      <nav className="evidence-tabs" aria-label="Evidence views">
        <button aria-pressed={section === "trace"} className={section === "trace" ? "is-active" : ""} type="button" onClick={() => setSection("trace")}>Trace <span>{events.length}</span></button>
        {!sample && <button aria-pressed={section === "build"} className={section === "build" ? "is-active" : ""} type="button" onClick={() => setSection("build")}>Build <span>{project.milestones?.length || 0}</span></button>}
      </nav>
      {section === "build" ? (
        <ol className="build-ledger">{(project.milestones || []).map((item, index) => <li key={`${item.type}-${index}`}>
          <span>{String(index + 1).padStart(2, "0")}</span><div><strong>{item.type.replaceAll("_", " ")}</strong><p>{item.detail}</p>
            <time dateTime={item.at}>{Number.isFinite(Date.parse(item.at)) ? new Date(item.at).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : item.at}</time>
          </div>
        </li>)}</ol>
      ) : <>
        {traces.length > 1 && <label className="trace-select">Recorded action
          <select value={activeTrace?.id || ""} onChange={(event) => onTrace(event.target.value)}>
            {traces.map((trace, index) => <option value={trace.id} key={trace.id}>
              {sample ? `Save ${traces.length - index} · ${trace.status === "error" ? "Failed" : "Saved"} · ${trace.duration} ms` : `${trace.status} · ${trace.id.slice(0, 12)}`}
            </option>)}
          </select>
        </label>}
        {events.length ? <>
          <div className={`trace-summary ${firstError ? "is-error" : ""}`}>
            <strong>{firstError ? (sample ? "Save failed" : "Error recorded") : sample ? "Finding saved" : "No recorded errors"}</strong>
            {sample && <span>{activeTrace.duration} ms round trip</span>}
          </div>
          <ol className="trace-ledger">{events.map((event, index) => {
            const error = event.kind === "error" || event.level === "error" || event.errorClass;
            return <li className={`${event.id === activeEventId ? "is-active" : ""} ${error ? "is-error" : ""}`} key={event.id}>
              <button type="button" aria-pressed={event.id === activeEventId} onClick={() => onEvent(event)}>
                <span className="event-index">{String(index + 1).padStart(2, "0")}</span>
                <span className="event-copy"><strong>{eventTitle(event)}</strong><small>{nodeName(event)}</small></span>
                <time>{eventTime(event, first)}{event.clock && <small>{event.clock}</small>}</time>
              </button>
            </li>;
          })}</ol>
          {selected && <section className="event-detail" aria-label="Selected event">
            <strong>{eventTitle(selected)}</strong>
            <p>{selected.detail || [selected.operation, selected.routeTemplate, selected.status, selected.errorClass].filter(Boolean).join(" · ") || "This boundary was recorded without additional detail."}</p>
            <code>{selected.kind}</code>
            {onViewMap && <button className="mobile-map-jump" type="button" onClick={onViewMap}>Show this step on the map →</button>}
          </section>}
          {sample && <p className="timing-note">Server offsets start at request arrival; browser offsets start at submit. Replay preserves event order.</p>}
          <section className="investigator-result">
            <header><h3>Trace explanation</h3><button type="button" onClick={onInvestigate} disabled={diagnosisBusy}>{diagnosisBusy ? "Reading…" : diagnosisError ? "Try again" : diagnosis ? "Check again" : "Explain trace"}</button></header>
            <div ref={explanation} className="explanation-response" tabIndex={-1} aria-live="polite">
            {diagnosisError ? <p className="investigator-error" role="alert"><strong>Couldn’t explain this trace.</strong> {diagnosisError}</p> : diagnosis ? <div>
              <span className="diagnosis-mode">{diagnosis.mode === "local" ? "Rule-based · No AI call" : "AI-generated · Check the cited events"}</span>
              <h3>{diagnosis.summary}</h3><p>{diagnosis.cause}</p>
              <ol>{diagnosis.evidence.map((item) => {
                const event = events.find((entry) => entry.id === item.eventId);
                return <li key={item.eventId}><button type="button" disabled={!event} onClick={() => event && onEvent(event)}>
                  <span>Event {events.indexOf(event) + 1} ↗</span>{item.claim}
                </button></li>;
              })}</ol>
              <p className="next-step">{diagnosis.nextStep}</p>
            </div> : <p>{firstError ? "An error was recorded. Get an explanation with links to the events that support it." : "Get a summary of the recorded path with links to its evidence."}</p>}
            </div>
          </section>
        </> : <div className="trace-empty">
          <div className="empty-trace-lines" aria-hidden="true"><i /><i /><i /></div>
          <h3>{sample ? "Let's follow a request." : "No events received"}</h3>
          <p>{sample ? "Save a note in Research desk. The steps it takes through the app will appear here." : "Open Connection in the inspector to pair the published app, then use it in App preview. Instrumented actions will appear here."}</p>
          <small>{sample ? "Recorded from the working sample." : "An open feed does not confirm that the app is paired."}</small>
        </div>}
      </>}
    </aside>
  );
}
