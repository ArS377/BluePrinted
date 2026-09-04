import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { api } from "./api.js";
import { ExternalIcon, MarkIcon } from "./icons.jsx";
import { Creator } from "./components/Creator.jsx";
import { ProjectWorkspace } from "./components/ProjectWorkspace.jsx";
import { SampleWorkspace } from "./components/SampleWorkspace.jsx";
import { Tutorial } from "./components/Tutorial.jsx";
import { parseScreen, readDraft } from "./workspace-state.js";

function viewerSocketUrl(projectId) {
  const url = new URL(window.location.href);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws/view";
  url.search = new URLSearchParams({ projectId }).toString();
  return url.toString();
}

function diagnosisTrace(trace) {
  if (!trace) return null;
  const events = (trace.events || []).map((event, index) => ({
    id: event.id,
    at: Number.isFinite(event.at) ? event.at : Math.max(0, Date.parse(event.timestamp) - Date.parse(trace.events[0]?.timestamp)) || 0,
    node: event.node || event.nodeId,
    kind: event.kind,
    level: event.level === "error" || event.kind === "error" || event.errorClass ? "error" : "info",
    title: event.title || event.kind.replaceAll(".", " "),
    detail: event.detail || [event.operation, event.routeTemplate, event.status, event.errorClass].filter(Boolean).join(" · ") || "Recorded runtime boundary."
  }));
  return {
    id: trace.id,
    status: events.some((event) => event.level === "error") ? "error" : "success",
    fault: null,
    duration: events.at(-1)?.at || 0,
    events
  };
}

export function App() {
  const [connection, setConnection] = useState({ connected: false, loading: true });
  const [projects, setProjects] = useState([]);
  const [screen, setScreen] = useState(() => {
    try {
      if (new URLSearchParams(window.location.search).has("replit") && readDraft(sessionStorage).prompt) return "create";
    } catch { /* Continue without browser storage. */ }
    return parseScreen(window.location.hash);
  });
  const [project, setProject] = useState(null);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [traces, setTraces] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [activeTrace, setActiveTrace] = useState(null);
  const [liveEvent, setLiveEvent] = useState(null);
  const [live, setLive] = useState(false);
  const [pairing, setPairing] = useState(null);
  const [diagnosis, setDiagnosis] = useState(null);
  const [diagnosisBusy, setDiagnosisBusy] = useState(false);
  const [connectionMenu, setConnectionMenu] = useState(false);
  const currentScreen = useRef(screen);
  const toastTimer = useRef(null);
  const currentTraceId = useRef(null);
  currentScreen.current = screen;
  currentTraceId.current = activeTrace?.id;

  useEffect(() => { setDiagnosis(null); }, [activeTrace?.id]);

  const selectedProjectId = screen !== "sample" && screen !== "create" ? screen : null;

  const showToast = useCallback((message) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 5000);
  }, []);

  const loadProjects = useCallback(async () => {
    const result = await api.get("/api/projects");
    setProjects(result.projects);
    return result.projects;
  }, []);

  const loadProject = useCallback(async (projectId) => {
    const result = await api.get(`/api/projects/${projectId}`);
    if (currentScreen.current === projectId) setProject(result.project);
    setProjects((current) => current.map((item) => item.id === projectId ? result.project : item));
    return result.project;
  }, []);

  const loadTraces = useCallback(async (projectId) => {
    const result = await api.get(`/api/projects/${projectId}/traces`);
    if (currentScreen.current !== projectId) return;
    setTraces(result.traces);
    setEvidence(result.evidence);
    if (result.traces[0]) {
      const detail = await api.get(`/api/projects/${projectId}/traces/${result.traces[0].id}`);
      if (currentScreen.current === projectId) setActiveTrace(detail.trace);
    } else {
      setActiveTrace(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Establish one session cookie before other API requests or the sample mount.
    api.get("/api/replit/connection").then(async (status) => {
      if (cancelled) return;
      setConnection({ ...status, loading: false });
      await loadProjects();
    }).catch((requestError) => {
      if (cancelled) return;
      setConnection({ connected: false, loading: false });
      setError(requestError.message);
    });

    const params = new URLSearchParams(window.location.search);
    const replit = params.get("replit");
    if (replit === "connected") showToast("Replit connected. You can create an app now.");
    if (replit === "error") setError(params.get("reason") || "Replit connection failed.");
    if (replit) window.history.replaceState({}, "", window.location.pathname + window.location.hash);
    return () => { cancelled = true; window.clearTimeout(toastTimer.current); };
  }, [loadProjects, showToast]);

  useEffect(() => {
    const hash = screen === "create" ? "#new" : screen === "sample" ? "#sample" : `#project=${screen}`;
    window.history.replaceState({}, "", window.location.pathname + window.location.search + hash);
  }, [screen]);

  useEffect(() => {
    const navigate = () => setScreen(parseScreen(window.location.hash));
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, []);

  useEffect(() => {
    if (!connectionMenu) return;
    const dismiss = (event) => { if (event.key === "Escape" || (event.type === "pointerdown" && !event.target.closest(".connection-menu"))) setConnectionMenu(false); };
    document.addEventListener("keydown", dismiss);
    document.addEventListener("pointerdown", dismiss);
    return () => { document.removeEventListener("keydown", dismiss); document.removeEventListener("pointerdown", dismiss); };
  }, [connectionMenu]);

  useEffect(() => {
    setProject(null);
    setTraces([]);
    setEvidence([]);
    setActiveTrace(null);
    setPairing(null);
    setLiveEvent(null);
    setLive(false);
    if (!selectedProjectId) {
      return;
    }
    if (connection.loading) return;
    setError("");
    setDiagnosis(null);
    Promise.all([loadProject(selectedProjectId), loadTraces(selectedProjectId)])
      .catch((requestError) => { if (currentScreen.current === selectedProjectId) setError(requestError.message); });
  }, [selectedProjectId, connection.loading, loadProject, loadTraces]);

  useEffect(() => {
    if (!selectedProjectId || connection.loading) return undefined;
    let socket, retry, stopped = false, attempts = 0;
    function openFeed() {
      if (stopped) return;
      socket = new WebSocket(viewerSocketUrl(selectedProjectId), ["lb-view-v1"]);
      socket.addEventListener("open", () => { if (!stopped) { attempts = 0; setLive(true); } });
      socket.addEventListener("close", (event) => {
        if (stopped) return;
        setLive(false);
        if (event.code !== 1008) retry = window.setTimeout(openFeed, Math.min(15000, 1500 * 2 ** attempts++));
      });
      socket.addEventListener("message", (message) => {
      if (stopped) return;
      let packet;
      try { packet = JSON.parse(message.data); } catch { return; }
      if (packet.type !== "trace.event") return;
      const event = packet.event;
      if (!event?.id || !event.traceId) return;
      const failed = event.kind === "error" || event.level === "error" || Boolean(event.errorClass);
      setLiveEvent(event);
      setEvidence((current) => current.some((item) => item.nodeId === event.nodeId)
        ? current
        : [...current, { nodeId: event.nodeId, observedAt: event.receivedAt, traceId: event.traceId }]);
      setTraces((current) => {
        const existing = current.find((trace) => trace.id === event.traceId);
        if (existing) return current.map((trace) => trace.id === event.traceId
          ? { ...trace, eventCount: trace.eventCount + 1, updatedAt: event.timestamp, status: failed ? "error" : trace.status }
          : trace);
        return [{ id: event.traceId, projectId: selectedProjectId, versionId: event.versionId, eventCount: 1, status: failed ? "error" : "running", startedAt: event.timestamp, updatedAt: event.timestamp }, ...current].slice(0, 50);
      });
      setActiveTrace((current) => {
        if (!current || current.id !== event.traceId) return { id: event.traceId, events: [event], status: failed ? "error" : "running" };
        if (current.events.some((item) => item.id === event.id)) return current;
        return { ...current, events: [...current.events, event].slice(-256), status: failed ? "error" : current.status };
      });
    });
    }
    openFeed();
    return () => { stopped = true; window.clearTimeout(retry); socket?.close(); };
  }, [selectedProjectId, connection.loading]);

  async function runAction(action, callback, successMessage) {
    setBusyAction(action);
    setError("");
    try {
      const result = await callback();
      if (successMessage) showToast(typeof successMessage === "function" ? successMessage(result) : successMessage);
      return result;
    } catch (requestError) {
      if (requestError.code === "REPLIT_CONNECTION_REQUIRED") {
        setConnection({ connected: false, loading: false });
      }
      setError(requestError.message);
      return null;
    } finally {
      setBusyAction("");
    }
  }

  function connect() {
    window.location.assign("/auth/replit/start");
  }

  async function disconnect() {
    await runAction("disconnect", async () => {
      await api.post("/api/replit/disconnect");
      setConnection({ connected: false, connectedAt: null, loading: false });
      setConnectionMenu(false);
    }, "Replit disconnected and runtime pairings revoked.");
  }

  async function create(input) {
    return runAction("create", async () => {
      const result = await api.post("/api/projects", input);
      setProjects((current) => [result.project, ...current.filter((item) => item.id !== result.project.id)]);
      setScreen(result.project.id);
      return result;
    }, (result) => result.project.outcomeUnknown ? "Replit did not confirm the result. Check its workspace before retrying." : "Request recorded. Open Replit to check the build.");
  }

  async function projectAction(action, path, body, successMessage) {
    return runAction(action, async () => {
      try {
        await api.post(`/api/projects/${project.id}/${path}`, body);
        return await loadProject(project.id);
      } catch (requestError) {
        // Failed inspections also update the build record on the server.
        await loadProject(project.id).catch(() => {});
        throw requestError;
      }
    }, (result) => result?.outcomeUnknown ? "The result is unknown. Check Replit before repeating the request." : successMessage);
  }

  async function selectTrace(traceId) {
    await runAction("trace", async () => {
      const result = await api.get(`/api/projects/${project.id}/traces/${traceId}`);
      if (currentScreen.current !== project.id) return;
      setActiveTrace(result.trace);
      setLiveEvent(null);
      setDiagnosis(null);
    });
  }

  async function pair(runtimeUrl) {
    return runAction("pair", async () => {
      const result = await api.post(`/api/projects/${project.id}/pairings`, { runtimeUrl });
      setPairing(result.pairing);
      await loadProject(project.id);
      return result;
    }, "Pairing code ready. Reload or open the app to connect it.");
  }

  async function revokePairing() {
    await runAction("pair", async () => {
      await api.delete(`/api/projects/${project.id}/pairings`);
      setPairing(null);
      await loadProject(project.id);
    }, "Runtime pairing revoked.");
  }

  async function deleteProject() {
    const removed = await runAction("delete", async () => {
      await api.delete(`/api/projects/${project.id}`);
      await loadProjects();
      return true;
    }, "Project data removed from BluePrinted.");
    if (removed) setScreen("sample");
  }

  async function investigate() {
    if (!activeTrace) return;
    const traceId = activeTrace.id;
    setDiagnosisBusy(true);
    setError("");
    try {
      const result = await api.post("/api/investigate", { trace: diagnosisTrace(activeTrace) });
      if (currentTraceId.current === traceId) setDiagnosis(result);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDiagnosisBusy(false);
    }
  }

  function closeTutorial() {
    setTutorialOpen(false);
    setTutorialStep(0);
  }

  const screenTitle = useMemo(() => {
    if (screen === "sample") return "Sample";
    if (screen === "create") return "New app";
    return project?.name || "Project";
  }, [screen, project]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to workspace</a>
      <header className="topbar">
        <button className="brand" type="button" onClick={() => setScreen("sample")} aria-label="BluePrinted sample">
          <MarkIcon />
          <span>BluePrinted</span>
        </button>
        <nav className="primary-nav" aria-label="Primary navigation">
          <button className={screen === "sample" ? "is-active" : ""} type="button" onClick={() => setScreen("sample")}>Sample</button>
          <button className={screen !== "sample" ? "is-active" : ""} type="button" onClick={() => setScreen(projects[0]?.id || "create")}>My blueprints</button>
        </nav>
        <div className="topbar-actions">
          <button className="help-button" type="button" onClick={() => setTutorialOpen(true)}>How it works</button>
          {connection.connected ? (
            <div className="connection-menu">
              <button className="connection-badge" type="button" onClick={() => setConnectionMenu((open) => !open)} aria-expanded={connectionMenu}>
                <i></i>Replit connected
              </button>
              {connectionMenu && (
                <div>
                  <strong>Replit workspace</strong>
                  <small>OAuth tokens stay encrypted on this server.</small>
                  <button type="button" onClick={disconnect} disabled={busyAction === "disconnect"}>Disconnect Replit</button>
                </div>
              )}
            </div>
          ) : (
            <button className="button button-ink compact" type="button" onClick={connect} disabled={connection.loading}>{connection.loading ? "Connecting…" : "Connect Replit"}</button>
          )}
        </div>
      </header>

      <div className="project-ribbon">
        <span className="ribbon-label">Open</span>
        <button className={screen === "sample" ? "is-active sample" : "sample"} type="button" onClick={() => setScreen("sample")}>
          <i></i>Research desk <small>sample</small>
        </button>
        {projects.map((item) => (
          <button className={screen === item.id ? "is-active" : ""} type="button" onClick={() => setScreen(item.id)} key={item.id}>
            <i className={`state-${item.status}`}></i>{item.name}<small>{item.status.replaceAll("_", " ")}</small>
          </button>
        ))}
        <button className={screen === "create" ? "new-project is-active" : "new-project"} type="button" onClick={() => setScreen("create")}>
          <span>+</span> New app
        </button>
        <span className="ribbon-current">{screenTitle}</span>
      </div>

      {error && (
        <div className="global-error" role="alert">
          <strong>Could not complete that step.</strong>
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="Dismiss error">×</button>
        </div>
      )}

      <main id="main-content">
        {screen === "sample" && !connection.loading && <SampleWorkspace onCreate={() => setScreen("create")} />}
        {screen === "sample" && connection.loading && <div className="page-loading" role="status">Opening the sample…</div>}
        {screen === "create" && (
          <Creator connected={connection.connected} busy={busyAction === "create"} onCreate={create} onConnect={connect} />
        )}
        {selectedProjectId && project?.id === selectedProjectId && (
          <ProjectWorkspace
            key={project.id}
            project={project}
            busyAction={busyAction}
            onInspect={() => projectAction("inspect", "inspect", {}, "Architecture snapshot validated.")}
            onPublish={() => projectAction("publish", "publish", {}, "Publication request sent to Replit.")}
            onPublishStatus={() => projectAction("publish", "publish-status", {}, "Publication status refreshed.")}
            onUpdate={(changeDescription) => projectAction("update", "update", { changeDescription }, "Replit accepted the update.")}
            onPair={pair}
            onRevokePairing={revokePairing}
            onDelete={deleteProject}
            onInvestigate={investigate}
            traces={traces}
            evidence={evidence}
            activeTrace={activeTrace}
            onTrace={selectTrace}
            liveEvent={liveEvent}
            live={live}
            pairing={pairing}
            diagnosis={diagnosis}
            diagnosisBusy={diagnosisBusy}
          />
        )}
        {selectedProjectId && !project && <div className="page-loading">Opening blueprint…</div>}
      </main>

      <footer className="site-foot">
        <span>Runtime events record allowed fields only. Sample traces exclude note content.</span>
        <a href="https://github.com/ArS377/BluePrinted" target="_blank" rel="noreferrer">Source <ExternalIcon /></a>
      </footer>

      <Tutorial open={tutorialOpen} step={tutorialStep} onStep={setTutorialStep} onClose={closeTutorial} onTry={() => { closeTutorial(); setScreen("sample"); }} />
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
