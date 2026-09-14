import { useEffect, useMemo, useRef, useState } from "react";

import { ExternalIcon } from "../icons.jsx";
import { AppPreview } from "./AppPreview.jsx";
import { Blueprint } from "./Blueprint.jsx";
import { EvidencePanel } from "./EvidencePanel.jsx";
import { Dialog } from "./Dialog.jsx";
import { buildGuidance, currentSnapshot, previewUrl } from "../workspace-state.js";

function statusCopy(project) {
  return {
    creating: "requesting app",
    agent_working: currentSnapshot(project) ? "Architecture inspected" : "Build requested",
    inspecting: "reading architecture",
    publishing: "publishing",
    published: "published",
    observable: "observable",
    updating: "updating",
    failed: "needs attention"
  }[project.status] || project.status;
}

export function ProjectWorkspace({
  project,
  busyAction,
  onInspect,
  onPublish,
  onPublishStatus,
  onUpdate,
  onPair,
  onRevokePairing,
  onDelete,
  onInvestigate,
  traces,
  evidence,
  activeTrace,
  onTrace,
  liveEvent,
  live,
  pairing,
  diagnosis,
  diagnosisBusy
}) {
  const [view, setView] = useState("blueprint");
  const [pane, setPane] = useState("app");
  const [runtimeUrl, setRuntimeUrl] = useState(project.runtimeUrl || "");
  const [change, setChange] = useState("");
  const [showUpdate, setShowUpdate] = useState(false);
  const [activeEvent, setActiveEvent] = useState(null);
  const [urlError, setUrlError] = useState("");
  const [now, setNow] = useState(Date.now);
  const runtimeWindow = useRef(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => setRuntimeUrl(project.runtimeUrl || ""), [project.runtimeUrl]);
  useEffect(() => setActiveEvent(null), [activeTrace?.id]);
  useEffect(() => {
    if (liveEvent) setActiveEvent(liveEvent);
  }, [liveEvent]);

  useEffect(() => {
    function receive(event) {
      if (!pairing || event.data?.type !== "lb.ready") return;
      if (event.origin !== pairing.runtimeOrigin || event.data.projectId !== project.id) return;
      if (event.source !== runtimeWindow.current) return;
      event.source.postMessage({ type: "lb.pair", projectId: project.id, code: pairing.code }, event.origin);
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [pairing, project.id]);

  const manifest = project.currentManifest?.manifest;
  const guidance = buildGuidance(project, now);
  const snapshotIsCurrent = currentSnapshot(project);
  const pairingExpired = pairing && pairing.expiresAt <= now;
  const currentTrace = useMemo(() => {
    if (!activeTrace) return null;
    if (liveEvent && liveEvent.traceId === activeTrace.id) {
      const exists = activeTrace.events?.some((event) => event.id === liveEvent.id);
      return exists ? activeTrace : { ...activeTrace, events: [...(activeTrace.events || []), liveEvent] };
    }
    return activeTrace;
  }, [activeTrace, liveEvent]);

  function openRuntime() {
    const url = previewUrl(project.runtimeUrl);
    if (!url) return;
    runtimeWindow.current = window.open(url.href, `blueprinted-${project.id}`);
  }

  async function submitPairing(event) {
    event.preventDefault();
    const url = previewUrl(runtimeUrl.trim());
    if (!url) { setUrlError("Enter a complete HTTPS URL, or a localhost URL for development."); return; }
    setUrlError("");
    await onPair(url.href);
  }

  function submitUpdate(event) {
    event.preventDefault();
    onUpdate(change).then((result) => {
      if (result) {
        setChange("");
        setShowUpdate(false);
      }
    });
  }

  return (
    <div className="workspace-page project-workspace">
      <section className="project-command">
        <div className="project-title-block">
          <span className={`project-state state-${project.status}`}><i></i>{statusCopy(project)}</span>
          <h1>{project.name}</h1>
          <details className="project-prompt"><summary>Original prompt</summary><p>{project.prompt}</p></details>
        </div>
        <div className="project-actions">
          {project.replUrl && (
            <a className="button button-paper" href={project.replUrl} target="_blank" rel="noreferrer">
              Open in Replit <ExternalIcon />
            </a>
          )}
          <button className="button button-paper" type="button" onClick={onInspect} disabled={Boolean(busyAction) || !project.replId}>
            {busyAction === "inspect" ? "Inspecting" : manifest ? "Inspect again" : "Inspect build"}
          </button>
          {project.status === "publishing" ? (
            <button className="button button-clay" type="button" onClick={onPublishStatus} disabled={Boolean(busyAction)}>Check publish status</button>
          ) : (
            <button className="button button-clay" type="button" onClick={onPublish} disabled={Boolean(busyAction) || !project.replId}>
              {busyAction === "publish" ? "Publishing" : project.runtimeUrl ? "Republish" : "Publish app"}
            </button>
          )}
        </div>
      </section>

      {project.lastError && (
        <div className={`project-notice ${project.outcomeUnknown ? "is-warning" : "is-error"}`}>
          <strong>{project.outcomeUnknown ? "The result is still unknown" : "This step needs attention"}</strong>
          <p>{project.lastError}</p>
        </div>
      )}

      <div className="project-update-bar"><button className="text-action" type="button" onClick={() => setShowUpdate(true)} disabled={Boolean(busyAction) || !project.replId}>Send an update to Replit →</button></div>
      <nav className="pane-switch" aria-label="Project panes">
        <button type="button" aria-pressed={pane === "app"} onClick={() => setPane("app")}>App preview</button>
        <button type="button" aria-pressed={pane === "inspector"} onClick={() => setPane("inspector")}>Inspector</button>
      </nav>
      <div className={`demo-workbench project-workbench pane-${pane}`}>
        <section className="preview-pane" aria-labelledby="project-preview-title">
          <header className="pane-heading"><h2 id="project-preview-title">App preview</h2><p>Use {project.name} here. Inspection and trace setup live in the inspector.</p></header>
          <AppPreview project={project} pairing={pairingExpired ? null : pairing} onOpenWindow={openRuntime} />
          <div className="preview-handoff"><button type="button" onClick={() => { setPane("inspector"); setView("activity"); }}>See recorded activity →</button></div>
        </section>
        <section className="inspector-pane" aria-labelledby="project-inspector-title">
          <header className="pane-heading"><h2 id="project-inspector-title">BluePrinted inspector</h2><p>Explore the architecture, recorded actions, and changes to your app.</p></header>
      <nav className="inspector-switch project-inspector-switch" aria-label="Inspector views">
        <button aria-pressed={view === "blueprint"} type="button" onClick={() => setView("blueprint")}>Map</button>
        <button aria-pressed={view === "activity"} type="button" onClick={() => setView("activity")}>Activity</button>
        <button aria-pressed={view === "app"} type="button" onClick={() => setView("app")}>Connection</button>
        <button aria-pressed={view === "changes"} type="button" onClick={() => setView("changes")}>Changes</button>
      </nav>

        <div className="workspace-main">
          <div hidden={view !== "blueprint"}>
          {(
            manifest ? (
              <>
              {!snapshotIsCurrent && <div className="project-notice"><strong>Showing the previous snapshot</strong><p>{guidance.detail}</p></div>}
              <Blueprint
                manifest={manifest}
                evidence={evidence}
                activeNodeId={activeEvent?.nodeId}
                diff={project.manifestDiff}
              />
              {snapshotIsCurrent && <section className="build-guidance"><h3>{guidance.title}</h3><p>{guidance.detail}</p>
                {project.runtimeUrl && <button className="text-action" type="button" onClick={() => setView("app")}>Set up trace connection →</button>}
              </section>}
              </>
            ) : (
              <section className="manifest-empty">
                <span className="context-label">Architecture not inspected</span>
                <h2>{guidance.title}</h2>
                <p>{guidance.detail}</p>
                {!previewUrl(project.runtimeUrl) && <ol>
                  <li className={project.replId ? "is-done" : ""}><span>{project.replId ? "✓" : "1"}</span> {project.replId ? "Replit returned a project" : "Awaiting a project from Replit"}</li>
                  <li><span>2</span> Run the app in Replit and resolve any setup questions</li>
                  <li><span>3</span> Return here to inspect the architecture</li>
                </ol>}
                <button className="button button-ink" type="button" onClick={onInspect} disabled={Boolean(busyAction) || !project.replId}>Inspect build</button>
                {!previewUrl(project.runtimeUrl) && <div className="build-guidance">
                  <h3>{guidance.waiting ? "Still on the build screen?" : "Where can I check progress?"}</h3>
                  <p>Open Replit to see the latest activity. If Agent stopped for an AI key, credits, or a question, continuing here will not resume it.</p>
                  {project.replUrl && <a href={project.replUrl} target="_blank" rel="noreferrer">Open this project in Replit ↗</a>}
                </div>}
                {Number.isFinite(Date.parse(guidance.lastRecordedAt)) && <time className="last-confirmed" dateTime={guidance.lastRecordedAt}>Last recorded update: {new Date(guidance.lastRecordedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}. No live Agent progress feed.</time>}
              </section>
            )
          )}
          </div>

          <div hidden={view !== "app"}>
            <div className="runtime-view">
              <form className="runtime-connect" onSubmit={submitPairing}>
                <div>
                  <span className="eyebrow">Runtime pairing</span>
                  <strong>{pairingExpired ? "Pairing code expired" : project.pairingStatus === "connected" ? "Runtime was paired" : "Connect the published app"}</strong>
                  <p>Pair to collect activity from the app. You can use App preview without pairing. The app needs the BluePrinted bridge to send events; the one-use code expires after five minutes.</p>
                  {pairing && !pairingExpired && <p>Code ready. The preview will send it to the matching app origin. If no events arrive, check that the bridge is installed.</p>}
                </div>
                <label>
                  Published URL
                  <input type="url" value={runtimeUrl} onChange={(event) => setRuntimeUrl(event.target.value)} placeholder="https://your-app.replit.app" required aria-describedby={urlError ? "runtime-url-error" : undefined} />
                </label>
                {urlError && <p className="inline-error" id="runtime-url-error" role="alert">{urlError}</p>}
                <div className="runtime-buttons">
                  <button className="button button-teal" type="submit" disabled={Boolean(busyAction)}>{busyAction === "pair" ? "Creating code…" : pairing || project.pairingStatus === "connected" ? "Create a new pairing" : "Pair runtime"}</button>
                  {(pairing || project.pairingStatus === "connected" || project.pairingStatus === "waiting") && <button className="button button-paper" type="button" disabled={Boolean(busyAction)} onClick={onRevokePairing}>Revoke runtime access</button>}
                </div>
              </form>
            </div>
          </div>

          {view === "changes" && (
            <section className="changes-view">
              <header>
                <span className="eyebrow">Version history</span>
                <h2>{project.versions.length} stored {project.versions.length === 1 ? "version" : "versions"}</h2>
              </header>
              <ol>
                {[...project.versions].reverse().map((version, index) => (
                  <li key={version.id}>
                    <span>v{project.versions.length - index}</span>
                    <div><strong>{version.kind}</strong><p>{version.prompt}</p></div>
                    <small>{version.status}</small>
                  </li>
                ))}
              </ol>
              {project.manifestDiff ? (
                <div className="change-summary">
                  <strong>Latest architecture change</strong>
                  <span>+{project.manifestDiff.nodes.added.length} added</span>
                  <span>{project.manifestDiff.nodes.changed.length} changed</span>
                  <span>−{project.manifestDiff.nodes.removed.length} removed</span>
                </div>
              ) : <p className="no-change">Inspect a second version to calculate the first architecture diff.</p>}
              <div className="project-danger">
                <div>
                  <strong>Remove this blueprint</strong>
                  <p>This deletes its manifests, stored traces, pairing codes, and local project history. The Replit app is not deleted.</p>
                </div>
                <button type="button" onClick={() => {
                  if (window.confirm("Remove this blueprint and its stored traces? The Replit app will stay in your workspace.")) onDelete();
                }}>Remove from BluePrinted</button>
              </div>
            </section>
          )}
        </div>

        <div hidden={view !== "activity"}>
        <EvidencePanel
          project={project}
          traces={traces}
          activeTrace={currentTrace}
          activeEventId={activeEvent?.id}
          onTrace={onTrace}
          onEvent={setActiveEvent}
          onViewMap={() => setView("blueprint")}
          diagnosis={diagnosis}
          diagnosisBusy={diagnosisBusy}
          onInvestigate={onInvestigate}
          live={live}
        />
        <button className="text-action" type="button" onClick={() => setView("app")}>Set up trace connection →</button>
        </div>
        </section>
      </div>

      <Dialog open={showUpdate} onClose={() => { if (busyAction !== "update") setShowUpdate(false); }} labelledBy="update-title" className="update-sheet">
          <form onSubmit={submitUpdate}>
            <h2 id="update-title">What should change?</h2>
            <p>Replit edits the current app. BluePrinted keeps this version's map and traces before asking for a new snapshot.</p>
            <label className="context-label" htmlFor="update-description">Describe the change</label>
            <textarea id="update-description" value={change} onChange={(event) => setChange(event.target.value)} minLength={10} maxLength={3000} placeholder="Add shared collections so two people can organize findings together." required autoFocus disabled={busyAction === "update"} />
            <footer>
              <button className="button button-paper" type="button" onClick={() => setShowUpdate(false)} disabled={busyAction === "update"}>Cancel</button>
              <button className="button button-clay" type="submit" disabled={change.trim().length < 10 || busyAction === "update"}>{busyAction === "update" ? "Sending update" : "Update on Replit"}</button>
            </footer>
          </form>
      </Dialog>
    </div>
  );
}
