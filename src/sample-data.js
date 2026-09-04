export const sampleProject = {
  id: "sample", name: "Research desk", sourceMode: "prepared_sample",
  status: "observable", milestones: []
};

export function sampleManifest(persistence = "memory") {
  return {
    schemaVersion: "1", name: "Research desk",
    summary: "Save a finding, then follow the request through the app.",
    nodes: [
      { id: "component:FindingEditor#save", kind: "component", label: "Finding editor", evidence: "agent_declared", sourceFile: "src/components/SampleWorkspace.jsx", metadata: { action: "submit" } },
      { id: "component:FindingList#render", kind: "component", label: "Saved findings", evidence: "agent_declared", sourceFile: "src/components/SampleWorkspace.jsx", metadata: { action: "render" } },
      { id: "route:POST:/api/sample/findings", kind: "route", label: "Save endpoint", evidence: "agent_declared", sourceFile: "server/sample-routes.js", metadata: { method: "POST", path: "/api/sample/findings" } },
      { id: "table:sample.findings", kind: "table", label: persistence === "postgres" ? "PostgreSQL store" : "Session memory", evidence: "agent_declared", sourceFile: "server/document-store.js", metadata: { retention: "24 hours", scope: "this browser session" } }
    ],
    edges: [
      { id: "save|calls|route", source: "component:FindingEditor#save", target: "route:POST:/api/sample/findings", relationship: "calls", evidence: "agent_declared" },
      { id: "route|writes|findings", source: "route:POST:/api/sample/findings", target: "table:sample.findings", relationship: "writes", evidence: "agent_declared" },
      { id: "route|renders|list", source: "route:POST:/api/sample/findings", target: "component:FindingList#render", relationship: "renders", evidence: "agent_declared" }
    ]
  };
}

export const promptExamples = [
  "Build a local event planner where friends vote on dates and places.",
  "Build a visual reading journal that maps themes across books.",
  "Build a studio inventory that tracks borrowed gear and return dates."
];
