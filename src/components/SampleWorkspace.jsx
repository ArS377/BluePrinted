import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { investigatorFailureMessage } from "../investigator-feedback.js";
import { sampleManifest, sampleProject } from "../sample-data.js";
import { Blueprint } from "./Blueprint.jsx";
import { EvidencePanel } from "./EvidencePanel.jsx";

export function SampleWorkspace({ onCreate }) {
  const [fault, setFault] = useState(false);
  const [mobileView, setMobileView] = useState("map");
  const editor = useRef(null);
  const panels = useRef(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [note, setNote] = useState("Trees cool city streets by shading pavement and releasing water through their leaves.");
  const [findings, setFindings] = useState([]);
  const [persistence, setPersistence] = useState("memory");
  const [traces, setTraces] = useState([]);
  const [trace, setTrace] = useState(null);
  const [position, setPosition] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [diagnosis, setDiagnosis] = useState(null);
  const [diagnosisError, setDiagnosisError] = useState("");
  const [diagnosisBusy, setDiagnosisBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const mounted = useRef(true);
  const actionLock = useRef(false);
  const selectedTrace = useRef(null);

  async function load() {
    setError("");
    try {
      const result = await api.get("/api/sample/findings");
      if (!mounted.current) return;
      setFindings(result.findings);
      setPersistence(result.persistence);
      setReady(true);
    } catch (err) { if (mounted.current) setError(err.message); }
  }

  useEffect(() => {
    mounted.current = true;
    load();
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!playing || !trace) return;
    if (position >= trace.events.length - 1) { setPlaying(false); return; }
    // Replay is slowed to one event per 700ms; measured timings stay unchanged.
    const timer = window.setTimeout(() => setPosition((value) => value + 1), 700);
    return () => window.clearTimeout(timer);
  }, [playing, position, trace]);

  function chooseTrace(next) {
    selectedTrace.current = next.id;
    setTrace(next);
    setPosition(next.events.length - 1);
    setPlaying(false);
    setDiagnosis(null);
    setDiagnosisError("");
  }

  async function save(event) {
    event.preventDefault();
    if (actionLock.current || !note.trim()) return;
    actionLock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    setPlaying(false);
    const rejectWrite = fault;
    setFault(false);
    const started = performance.now();
    const first = { id: crypto.randomUUID(), at: 0, clock: "browser", timestamp: new Date().toISOString(),
      node: "browser", nodeId: "component:FindingEditor#save", kind: "ui.action", level: "info",
      title: "Save submitted", detail: "The form sent a note to the sample API. Note content is excluded from this trace." };
    try {
      const response = await fetch("/api/sample/findings", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ note, rejectWrite })
      });
      const result = await response.json();
      if (!mounted.current) return;
      if (!result.trace) throw new Error(result.error || "The server did not return a trace. Check the saved list before retrying.");
      setPersistence(result.persistence);
      if (response.ok) {
        setFindings((current) => [result.finding, ...current]);
        setNotice("Saved! Follow its path in the block map.");
      } else {
        setError(result.error);
      }
      const elapsed = Math.round((performance.now() - started) * 10) / 10;
      const last = { id: crypto.randomUUID(), at: elapsed, clock: "browser", timestamp: new Date().toISOString(),
        node: "browser", nodeId: response.ok ? "component:FindingList#render" : "component:FindingEditor#save",
        kind: "ui.action", level: response.ok ? "info" : "error",
        title: response.ok ? "Saved list updated" : "Draft kept in the form",
        detail: response.ok ? "The browser added the API's saved finding to its list." : "The response reported a failed save. The draft is unchanged." };
      const next = { ...result.trace, duration: elapsed, events: [
        { ...first, traceId: result.trace.id }, ...result.trace.events, { ...last, traceId: result.trace.id }
      ] };
      setTraces((current) => [next, ...current].slice(0, 10));
      chooseTrace(next);
    } catch (err) {
      if (mounted.current) setError(`${err.message} Your draft is still here.`);
    } finally {
      actionLock.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  async function clear() {
    setBusy(true);
    setError("");
    try {
      await api.delete("/api/sample/findings");
      setFindings([]);
      setNotice("This session's sample findings were cleared. Recorded traces contain no note content.");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function investigate() {
    if (!trace) return;
    const id = trace.id;
    setDiagnosisBusy(true);
    setDiagnosisError("");
    try {
      const result = await api.post("/api/investigate", { trace });
      if (mounted.current && selectedTrace.current === id) setDiagnosis(result);
    } catch (err) {
      if (mounted.current && selectedTrace.current === id) {
        setDiagnosisError(investigatorFailureMessage(err.message));
      }
    }
    finally { if (mounted.current) setDiagnosisBusy(false); }
  }

  const activeEvent = trace?.events[position];
  const evidence = trace?.events.slice(0, position + 1) || [];

  function showMap() {
    setMobileView("map");
    if (window.matchMedia("(max-width: 760px)").matches) {
      window.requestAnimationFrame(() => panels.current?.scrollIntoView({ block: "start" }));
    }
  }

  function replay() {
    if (!trace || busy) return;
    showMap();
    if (playing) setPlaying(false);
    else { if (position >= trace.events.length - 1) setPosition(-1); setPlaying(true); }
  }

  return (
    <div className="workspace-page sample-workspace">
      <section className="workspace-heading">
        <div>
          <span className="context-label"><i className="playground-dot" />BluePrinted playground</span>
          <h1>Use the demo app. <span>See what happens inside.</span></h1>
        </div>
        <button className="button button-secondary" type="button" onClick={onCreate}><span aria-hidden="true">+</span> Create your own app</button>
      </section>

      <div className="demo-workbench">
        <section className="preview-pane" aria-labelledby="app-preview-title">
          <header className="pane-heading"><h2 id="app-preview-title">App preview</h2><p>Research Desk is a demo note-taking app. Save a note to see how it works.</p></header>
          <div className="preview-stage">
        <section className="sample-app" aria-label="Research desk sample">
          <header className="sample-app-header"><span className="mini-app-icon" aria-hidden="true">▤</span><div><h2>Research desk</h2><span>A place for your notes</span></div></header>
          <form className="sample-action-bar" onSubmit={save}>
            <label className="sample-editor" htmlFor="finding-note">What did you find?
              <textarea ref={editor} id="finding-note" value={note} onChange={(event) => setNote(event.target.value)} rows={5} maxLength={1000} required disabled={busy} />
            </label>
            <div className="sample-actions">
              <button className="button button-ink sample-save" type="submit" disabled={busy || !ready || !note.trim()}>{busy ? "Saving…" : fault ? "Save with test failure" : "Save finding"} <span aria-hidden="true">↗</span></button>
              <label className={`fault-toggle ${fault ? "is-armed" : ""}`}>
                <input type="checkbox" checked={fault} disabled={busy} onChange={(event) => setFault(event.target.checked)} />
                <span>Reject the next save<small>A one-request test. Saved notes stay safe.</small></span>
              </label>
            </div>
          </form>
          {error && <div className="inline-error" role="alert">{error}{!ready && <button type="button" onClick={load}>Retry connection</button>}</div>}
          {notice && <p className="sample-notice" role="status">{notice}</p>}
          {trace && <button className="mobile-map-jump" type="button" onClick={showMap}>See this request in the map →</button>}
          <section className="saved-findings" aria-label="Saved findings">
            <div className="section-heading"><h3>Saved findings</h3><span className="finding-count">{findings.length}</span></div>
            {findings.length ? <>
              <ul>{findings.slice(0, 3).map((finding) => <li key={finding.id}>{finding.note}</li>)}</ul>
              {findings.length > 3 && <details><summary>Show {findings.length - 3} more</summary><ul>{findings.slice(3).map((finding) => <li key={finding.id}>{finding.note}</li>)}</ul></details>}
              <button className="text-action" type="button" disabled={busy} onClick={clear}>Clear sample findings</button>
            </> : <div className="notes-empty"><span aria-hidden="true">▧</span><p>A little empty in here.<br />Your first saved note goes here.</p></div>}
          </section>
          <details className="sample-storage"><summary>Where does this go?</summary><p>{persistence === "postgres" ? "PostgreSQL" : "Server memory"}, scoped to your browser session. Notes expire after 24 hours{persistence === "memory" ? " or a server restart" : ""}. Trace events do not include your note text.</p></details>
        </section>
          </div>
        </section>

        <section ref={panels} className="inspector-pane" aria-labelledby="inspector-title">
          <header className="pane-heading"><h2 id="inspector-title">BluePrinted inspector</h2><p>See the steps behind each action in the demo app.</p></header>
          <nav className="inspector-switch" aria-label="Inspector views">
            <button type="button" aria-pressed={mobileView === "map"} onClick={() => setMobileView("map")}>Map</button>
            <button type="button" aria-pressed={mobileView === "activity"} onClick={() => setMobileView("activity")}>Activity <span>{trace?.events.length || 0}</span></button>
          </nav>
          <div className="workspace-main" hidden={mobileView !== "map"}>
            <Blueprint manifest={sampleManifest(persistence)} evidence={evidence} activeNodeId={activeEvent?.nodeId} sample />
            <section className="replay-bar" aria-label="Trace replay">
              <div className="replay-current"><span aria-hidden="true">▷</span><strong>{activeEvent?.title || (trace ? "Ready to replay" : "Your request, step by step")}</strong></div>
              <button className="button button-secondary" type="button" disabled={!trace || busy} onClick={replay}>{playing ? "Pause" : "Replay trace"}</button>
              <button className="icon-button" type="button" aria-label="Previous event" disabled={!trace || position <= 0} onClick={() => { setPlaying(false); setPosition((value) => value - 1); }}>←</button>
              <input type="range" min={0} max={Math.max(0, (trace?.events.length || 1) - 1)} value={Math.max(0, position)} disabled={!trace} aria-label="Replay event" aria-valuetext={activeEvent?.title || "No event"} onChange={(event) => { setPlaying(false); setPosition(Number(event.target.value)); }} />
              <button className="icon-button" type="button" aria-label="Next event" disabled={!trace || position >= trace.events.length - 1} onClick={() => { setPlaying(false); setPosition((value) => value + 1); }}>→</button>
              <span className="replay-position">{trace ? `${position + 1} / ${trace.events.length}` : "0 / 0"}</span>
              <small>Replay is slowed down. Event timings are measured.</small>
            </section>
          </div>
          <div hidden={mobileView !== "activity"}>
          <EvidencePanel project={sampleProject} traces={traces} activeTrace={trace}
            activeEventId={activeEvent?.id} onTrace={(id) => chooseTrace(traces.find((item) => item.id === id))}
            onEvent={(event) => { setPlaying(false); setPosition(trace.events.findIndex((item) => item.id === event.id)); }}
            diagnosis={diagnosis} diagnosisError={diagnosisError} diagnosisBusy={diagnosisBusy} onInvestigate={investigate} onViewMap={showMap} live={false} />
          </div>
        </section>
      </div>
    </div>
  );
}
