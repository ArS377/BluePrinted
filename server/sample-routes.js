import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";

const submission = z.object({
  note: z.string().trim().min(1).max(1000),
  rejectWrite: z.boolean().default(false)
}).strict();
const retentionMs = 24 * 60 * 60 * 1000;
const storageNode = "table:sample.findings";
const routeNode = "route:POST:/api/sample/findings";

export function createSampleRouter(documents, { persistence = "memory" } = {}) {
  const router = Router();
  const namespace = (request) => `sample-findings:${request.bluePrintedSession.id}`;
  const list = async (request) => (await documents.list(namespace(request)))
    .map(({ value }) => value).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  router.get("/api/sample/findings", async (request, response) => {
    response.setHeader("cache-control", "no-store");
    response.json({ findings: await list(request), persistence });
  });

  router.post("/api/sample/findings", async (request, response) => {
    const parsed = submission.safeParse(request.body);
    if (!parsed.success) {
      return response.status(400).json({ error: "Write a finding between 1 and 1,000 characters." });
    }
    const started = performance.now();
    const trace = { id: randomUUID(), status: "success", fault: null, events: [] };
    const record = (nodeId, node, kind, title, detail, level = "info") => {
      trace.events.push({ id: randomUUID(), traceId: trace.id, nodeId, node, kind, title, detail, level,
        at: Math.round((performance.now() - started) * 10) / 10,
        timestamp: new Date().toISOString(), clock: "server" });
    };
    record(routeNode, "api", "http.server", "Request validated", "POST /api/sample/findings accepted a valid note.");
    response.setHeader("cache-control", "no-store");
    if (parsed.data.rejectWrite) {
      trace.status = "error";
      trace.fault = "reject_database_write";
      record(storageNode, "storage", "fault.applied", "Test failure applied", "This request asked the storage adapter to reject its write.");
      record(storageNode, "storage", "error", "Write rejected", "The test stopped this write before storage was called.", "error");
      record(routeNode, "api", "http.server", "Route returned 503", "No finding was saved. The next request is unaffected.", "error");
      return response.status(503).json({ error: "Test failure: your finding was not saved.", trace, persistence });
    }

    // One document per finding avoids lost updates from simultaneous requests.
    const findings = await list(request);
    if (findings.length >= 20) {
      return response.status(409).json({ error: "This session has 20 findings. Clear the sample to save another." });
    }
    const finding = { id: randomUUID(), note: parsed.data.note, createdAt: new Date().toISOString() };
    try {
      await documents.put(namespace(request), finding.id, finding, { expiresAt: Date.now() + retentionMs });
      record(storageNode, "storage", "db.query", "Finding stored", `One document was written to ${persistence === "postgres" ? "PostgreSQL" : "server memory"}. Note content is excluded from this trace.`);
      record(routeNode, "api", "http.server", "Route returned 201", "The response contains the saved finding.");
      response.status(201).json({ finding, trace, persistence });
    } catch {
      trace.status = "error";
      record(storageNode, "storage", "error", "Storage failed", "Storage did not confirm the write. Check the list before retrying.", "error");
      response.status(500).json({ error: "Storage could not confirm the save. Your draft is still in the form.", trace, persistence });
    }
  });

  router.delete("/api/sample/findings", async (request, response) => {
    for (const { key } of await documents.list(namespace(request))) {
      await documents.delete(namespace(request), key);
    }
    response.status(204).end();
  });
  return router;
}
