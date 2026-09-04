import assert from "node:assert/strict";
import test from "node:test";
import { sampleManifest } from "../src/sample-data.js";
import { validateManifest } from "../lib/manifest.js";
import { buildGuidance, currentSnapshot, draftKey, parseScreen, previewUrl, readDraft, writeDraft, viewerSocketUrl } from "../src/workspace-state.js";

test("creation drafts survive navigation and malformed storage is safe", () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) };
  const draft = { name: "Reading desk", prompt: "Build a reading desk for shared research." };
  assert.equal(writeDraft(storage, draft), true);
  assert.deepEqual(readDraft(storage), draft);
  values.set(draftKey, "invalid JSON");
  assert.deepEqual(readDraft(storage), { name: "", prompt: "" });
  assert.equal(writeDraft({ setItem() { throw new Error("blocked"); } }, draft), false);
});

test("screen links accept only supported views and project IDs", () => {
  assert.equal(parseScreen("#new"), "create");
  assert.equal(parseScreen("#project=82b0bc48-5b62-4c02-ae76-1fb54f913b93"), "82b0bc48-5b62-4c02-ae76-1fb54f913b93");
  assert.equal(parseScreen("#project=../../another-route"), "sample");
});

test("the trace feed excludes page fragments and unrelated query parameters", () => {
  assert.equal(viewerSocketUrl("https://example.com/?replit=connected#project=project-one", "project-one"), "wss://example.com/ws/view?projectId=project-one");
  assert.equal(viewerSocketUrl("http://localhost:3417/#new", "one"), "ws://localhost:3417/ws/view?projectId=one");
});

test("old snapshots do not confirm an updated build", () => {
  const project = { replId: "known", manifestStatus: "valid", currentVersionId: "v2", currentManifest: { versionId: "v1" } };
  assert.equal(currentSnapshot(project), false);
  assert.match(buildGuidance(project).detail, /cannot see whether Agent/);
  project.currentManifest.versionId = "v2";
  assert.equal(currentSnapshot(project), true);
  assert.match(buildGuidance(project).title, /snapshot is saved/);
});

test("a long-running build offers recovery without claiming Agent is still active", () => {
  const now = Date.parse("2026-09-04T14:00:00Z");
  const project = { replId: "known", milestones: [{ at: "2026-09-04T13:00:00Z" }] };
  assert.match(buildGuidance(project, now).title, /needs input/);
  assert.equal(buildGuidance(project, now).waiting, true);
  assert.match(buildGuidance({ ...project, outcomeUnknown: true }, now).detail, /avoid submitting it twice/);
});

test("runtime preview accepts only complete HTTPS or local development URLs", () => {
  assert.equal(previewUrl("not-yet-a-url"), null);
  assert.equal(previewUrl("javascript:alert(1)"), null);
  assert.equal(previewUrl("https://user:password@example.com"), null);
  assert.equal(previewUrl("http://example.com"), null);
  assert.equal(previewUrl("https://example.com/app").hostname, "example.com");
  assert.equal(previewUrl("http://localhost:3000").port, "3000");
});

test("the sample uses the same architecture contract as generated apps", () => {
  const appId = "82b0bc48-5b62-4c02-ae76-1fb54f913b93";
  const versionId = "79164301-475f-4c50-bb8d-4c3db103c960";
  const manifest = validateManifest({ ...sampleManifest(), appId, versionId }, { appId, versionId });
  assert.equal(manifest.nodes.length, 4);
  assert.equal(manifest.edges.length, 3);
});
