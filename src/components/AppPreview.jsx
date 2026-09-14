import { useEffect, useRef } from "react";

import { ExternalIcon } from "../icons.jsx";
import { previewUrl } from "../workspace-state.js";

export function AppPreview({ project, pairing, onReady, onOpenWindow }) {
  const frame = useRef(null);
  const url = previewUrl(project.runtimeUrl);

  useEffect(() => {
    function receive(event) {
      if (!pairing || event.data?.type !== "lb.ready") return;
      if (event.origin !== pairing.runtimeOrigin || event.data.projectId !== project.id) return;
      if (event.source !== frame.current?.contentWindow) return;
      event.source.postMessage({ type: "lb.pair", projectId: project.id, code: pairing.code }, event.origin);
      onReady?.();
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [pairing, project.id, onReady]);

  if (!url) {
    return (
      <div className="preview-empty">
        <strong>{project.status === "publishing" ? "Waiting for the published URL" : "Your app preview will appear here"}</strong>
        <p>{project.status === "publishing" ? "Choose Check publish status to retrieve the app URL." : "Finish the build in Replit, then choose Publish app. The published app will load here; inspection and pairing are separate steps."}</p>
      </div>
    );
  }

  return (
    <section className="preview-shell">
      <header>
        <span>{url.hostname}</span>
        <button type="button" onClick={onOpenWindow}>Open app in a window <ExternalIcon /></button>
      </header>
      <iframe
        key={pairing?.code || "unpaired"}
        ref={frame}
        title={`${project.name} runtime`}
        src={url.href}
        sandbox="allow-forms allow-modals allow-popups allow-same-origin allow-scripts"
      />
      <footer>
        If the preview stays blank, open the app in a window. Its installed bridge must be paired to send events here.
      </footer>
    </section>
  );
}
