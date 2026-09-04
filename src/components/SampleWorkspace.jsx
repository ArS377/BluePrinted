import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { sampleManifest, sampleProject } from "../sample-data.js";
import { Blueprint } from "./Blueprint.jsx";
import { EvidencePanel } from "./EvidencePanel.jsx";

export function SampleWorkspace({ onCreate }) {
  const [fault, setFault] = useState(false);
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
        setNotice("Finding saved. Replay the request, or reject the next save to see where it fails.");
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
    setError("");
    try {
      const result = await api.post("/api/investigate", { trace });
      if (mounted.current && selectedTrace.current === id) setDiagnosis(result);
    } catch (err) { if (mounted.current) setError(err.message); }
    finally { if (mounted.current) setDiagnosisBusy(false); }
  }

  const activeEvent = trace?.events[position];
  const evidence = trace?.events.slice(0, position + 1) || [];

  return (
    <div className="workspace-page sample-workspace">
      <section className="workspace-heading">
        <div>
          <span className="context-label">Interactive sample · No account needed</span>
          <h1>Follow a finding from form to storage.</h1>
          <p>Try a save below. Select any recorded event to see where it happened.</p>
        </div>
        <button className="button button-primary" type="button" onClick={onCreate}>Create your own app <span aria-hidden="true">→</span></button>
      </section>

      <section className="sample-app" aria-label="Research desk sample">
        <header className="sample-app-header"><h2>Research desk</h2><span>{persistence === "postgres" ? "PostgreSQL" : "Server memory"} · Session only</span></header>
        <form className="sample-action-bar" onSubmit={save}>
          <label className="sample-editor" htmlFor="finding-note">Finding
            <textarea id="finding-note" value={note} onChange={(event) => setNote(event.target.value)} rows={2} maxLength={1000} required disabled={busy} />
          </label>
          <div className="sample-actions">
            <label className={`fault-toggle ${fault ? "is-armed" : ""}`}>
              <input type="checkbox" checked={fault} disabled={busy} onChange={(event) => setFault(event.target.checked)} />
              <span>Reject the next save<small>Only this request. No saved data changes.</small></span>
            </label>
            <button className="button button-ink" type="submit" disabled={busy || !ready || !note.trim()}>{busy ? "Saving…" : "Save finding"} <span aria-hidden="true">↗</span></button>
          </div>
        </form>
        {error && <div className="inline-error" role="alert">{error}{!ready && <button type="button" onClick={load}>Retry connection</button>}</div>}
        {notice && <p className="sample-notice" role="status">{notice}</p>}
        <details className="saved-findings" open={findings.length > 0 ? true : undefined}>
          <summary>Saved findings <span>{findings.length}</span></summary>
          {findings.length ? <>
            <ul>{findings.slice(0, 3).map((finding) => <li key={finding.id}>{finding.note}</li>)}</ul>
            {findings.length > 3 && <details><summary>Show {findings.length - 3} more</summary><ul>{findings.slice(3).map((finding) => <li key={finding.id}>{finding.note}</li>)}</ul></details>}
            <button className="text-action" type="button" disabled={busy} onClick={clear}>Clear sample findings</button>
          </> : <p>Your saved notes will appear here. They expire after 24 hours{persistence === "memory" ? " or when the server restarts" : ""}.</p>}
        </details>
      </section>

      <div className="workspace-grid">
        <div className="workspace-main">
          <Blueprint manifest={sampleManifest(persistence)} evidence={evidence} activeNodeId={activeEvent?.nodeId} sample />
          <section className="replay-bar" aria-label="Trace replay">
            <button className="button button-secondary" type="button" disabled={!trace || busy} onClick={() => {
              if (playing) setPlaying(false);
              else { if (position >= trace.events.length - 1) setPosition(-1); setPlaying(true); }
            }}>{playing ? "Pause" : "Replay trace"}</button>
            <button className="icon-button" type="button" aria-label="Previous event" disabled={!trace || position <= 0} onClick={() => { setPlaying(false); setPosition((value) => value - 1); }}>←</button>
            <input type="range" min={0} max={Math.max(0, (trace?.events.length || 1) - 1)} value={Math.max(0, position)} disabled={!trace} aria-label="Replay event" aria-valuetext={activeEvent?.title || "No event"} onChange={(event) => { setPlaying(false); setPosition(Number(event.target.value)); }} />
            <button className="icon-button" type="button" aria-label="Next event" disabled={!trace || position >= trace.events.length - 1} onClick={() => { setPlaying(false); setPosition((value) => value + 1); }}>→</button>
            <span className="replay-position">{trace ? `${position + 1} / ${trace.events.length}` : "No trace yet"}</span>
            <small>Slowed for playback. Timings are measured.</small>
          </section>
        </div>
        <EvidencePanel project={sampleProject} traces={traces} activeTrace={trace}
          activeEventId={activeEvent?.id} onTrace={(id) => chooseTrace(traces.find((item) => item.id === id))}
          onEvent={(event) => { setPlaying(false); setPosition(trace.events.findIndex((item) => item.id === event.id)); }}
          diagnosis={diagnosis} diagnosisBusy={diagnosisBusy} onInvestigate={investigate} live={false} />
      </div>
    </div>
  );
}
