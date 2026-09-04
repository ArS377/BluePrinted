export const draftKey = "blueprinted.create-draft.v1";

export function readDraft(storage) {
  try {
    const draft = JSON.parse(storage.getItem(draftKey) || "{}");
    return {
      name: typeof draft?.name === "string" ? draft.name.slice(0, 72) : "",
      prompt: typeof draft?.prompt === "string" ? draft.prompt.slice(0, 4000) : ""
    };
  } catch { return { name: "", prompt: "" }; }
}

export function writeDraft(storage, draft) {
  try { storage.setItem(draftKey, JSON.stringify(draft)); return true; }
  catch { return false; }
}

export function parseScreen(hash = "") {
  if (hash === "#new") return "create";
  const id = hash.match(/^#project=([a-f0-9-]{36})$/i)?.[1];
  return id || "sample";
}

export function currentSnapshot(project) {
  return Boolean(project.currentManifest && project.currentManifest.versionId === project.currentVersionId && project.manifestStatus === "valid");
}

export function buildGuidance(project, now = Date.now()) {
  const last = project.milestones?.at(-1);
  const elapsed = now - Date.parse(last?.at || project.createdAt);
  const waiting = elapsed >= 5 * 60 * 1000;
  const common = { waiting, lastRecordedAt: last?.at || project.createdAt };
  if (project.outcomeUnknown) return { ...common, title: "Check Replit before sending another request.",
    detail: "The connector did not confirm the result. The request may still have created or changed an app. Check your Replit workspace to avoid submitting it twice." };
  if (!project.replId) return { ...common, title: "No Replit project has been confirmed.",
    detail: "Check the connection and the build record. If Replit created an app, keep its editor link before trying the prompt again." };
  if (project.manifestStatus === "invalid") return { ...common, title: "The architecture snapshot could not be validated.",
    detail: "Open the app in Replit and check that it runs. Then inspect again. Any previous snapshot is kept, but it may not describe the current code." };
  if (project.status === "publishing") return { ...common, title: "Publication has been requested.",
    detail: "Check publication status for the app URL. If Replit needs deployment settings or credits, resolve that in its editor." };
  if (currentSnapshot(project)) return { ...common, title: project.runtimeUrl ? "The published app is ready to pair." : "The architecture snapshot is saved.",
    detail: project.runtimeUrl ? "Open App runtime, pair the published URL, and perform an instrumented action to collect events." : "Check the app in Replit, then publish it. Pair the published URL to collect runtime evidence." };
  return { ...common, title: waiting ? "Check whether Replit needs input." : "Open the build in Replit.",
    detail: "BluePrinted has an editor link, but cannot see whether Agent is running or waiting. Resolve any questions, AI setup, or credit limits there. When the app runs, return and inspect the build." };
}

export function previewUrl(value) {
  try {
    const url = new URL(value);
    if (url.username || url.password) return null;
    if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) return null;
    return url;
  } catch { return null; }
}
