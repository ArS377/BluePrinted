import assert from "node:assert/strict";
import test from "node:test";
import { createBluePrintedServer } from "../server.js";
import { MemoryDocumentStore } from "../server/document-store.js";

async function sampleServer(context, documents = new MemoryDocumentStore()) {
  const server = await createBluePrintedServer({
    documentStore: documents,
    config: { production: false, publicOrigin: "", sessionSecret: "sample-test-secret-at-least-32-characters", databaseUrl: "", sourceReplId: "" }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const initial = await fetch(`${base}/api/sample/findings`);
  const cookie = initial.headers.get("set-cookie").split(";")[0];
  return async (method = "GET", body, session = cookie) => {
    const response = await fetch(`${base}/api/sample/findings`, {
      method, headers: { cookie: session, "content-type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
  };
}

test("sample saves are persisted, session-scoped, and exclude note contents from traces", async (context) => {
  const request = await sampleServer(context);
  const saved = await request("POST", { note: "A private sample finding." });
  assert.equal(saved.status, 201);
  assert.equal(saved.data.persistence, "memory");
  assert.equal(saved.data.trace.events.length, 3);
  assert.equal(JSON.stringify(saved.data.trace).includes("private sample"), false);
  assert.ok(saved.data.trace.events.every((event) => event.clock === "server" && event.at >= 0));
  assert.equal((await request()).data.findings[0].note, "A private sample finding.");
  assert.equal((await request("GET", null, "")).data.findings.length, 0);
  assert.equal((await request("DELETE")).status, 204);
  assert.deepEqual((await request()).data.findings, []);
});

test("a rejected sample write produces evidence and does not affect the next request", async (context) => {
  const request = await sampleServer(context);
  const failed = await request("POST", { note: "Keep my draft", rejectWrite: true });
  assert.equal(failed.status, 503);
  assert.equal(failed.data.trace.fault, "reject_database_write");
  assert.deepEqual(failed.data.trace.events.map((event) => event.title), [
    "Request validated", "Test failure applied", "Write rejected", "Route returned 503"
  ]);
  assert.equal((await request()).data.findings.length, 0);
  assert.equal((await request("POST", { note: "Keep my draft" })).status, 201);
  assert.equal((await request()).data.findings.length, 1);
});

test("invalid notes and fault controls do not create records", async (context) => {
  const request = await sampleServer(context);
  for (const body of [{ note: "   " }, { note: "x".repeat(1001) }, { note: "ok", rejectWrite: "true" }, { note: "ok", sessionId: "another-session" }]) {
    assert.equal((await request("POST", body)).status, 400);
  }
  assert.equal((await request()).data.findings.length, 0);
});

test("expired sample findings disappear without changing another session's data", async (context) => {
  let clock = Date.now();
  const request = await sampleServer(context, new MemoryDocumentStore({ now: () => clock }));
  await request("POST", { note: "Expires tomorrow" });
  clock += 25 * 60 * 60 * 1000;
  assert.equal((await request()).data.findings.length, 0);
});
