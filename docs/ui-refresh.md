# Workspace refresh

## Intent

Keep the original loop: build an app, inspect its structure, use it, follow a recorded action, explain a failure, and compare an update. Make the sample usable before connecting Replit. Distinguish measured events from declared architecture and slow-motion replay from live activity.

## Design

Use a compact engineering workbench. The connected architecture drawing is the signature: selected events light up their corresponding boundary, with the evidence alongside. Avoid a marketing hero inside the workspace.

Palette: canvas `#F5F7F6`, surface `#FFFFFF`, ink `#26332F`, teal `#137A6E`, clay `#B44F2C`, iris `#7457A6`. Borders and muted text use neutral shades; success and failure always have text labels as well as color.

Typography: Source Sans 3 for headings, body, and controls; IBM Plex Mono for event indices, durations, and source identifiers. Body 16px, controls 15px, workspace heading 30px at weight 600. No Inter, giant headings, or uppercase section labels.

Layout options considered:

- Stacked cards: easy to scan, but separates the app action from its trace.
- Three equal columns: keeps everything visible, but compresses the graph.
- Selected: a small editable sample above a broad connected map and a narrower event inspector. On mobile, stack the inspector below the map and allow the diagram itself to scroll.

```text
BluePrinted     Sample / My blueprints                 Guide / Connection
Research desk                                         Create an app
[ editable finding                  ] [fault] [Save finding]
[ saved findings                                              ]
Architecture                                  Recorded events
  Form -------- API -------- Storage          01 Save clicked
  Saved list ---/                             02 Route accepted
[ Replay / step / event position              ]
[ selected node: source and related edges     ] [Explain trace]
```

## Implementation and checks

1. Replace the sample's fixed event fixtures with session-scoped server saves. Reject only the submitted test write; retain the draft. Keep note content out of traces. Clearly label memory versus PostgreSQL storage.
2. Draw actual manifest edges, expose event details and replay controls, and let diagnosis citations select their evidence. Restyle the entire workspace and make the guide keyboard accessible and opt-in.
3. Preserve creation drafts across navigation and connection. Explain what Replit's last response confirms, provide a recovery path for a waiting build, and prevent runtime URL drafts from navigating the preview.
4. Run API and model tests, production build, and desktop/mobile browser checks. A local test cannot establish that a third-party Replit build or publication succeeded.

## Remaining integration limits

The public Replit connector does not stream Agent progress or expose arbitrary server spans. A returned project URL is not proof that its build is complete. Runtime observation still needs a published app with the bridge installed and paired. Do not label a viewer WebSocket as evidence that the app is connected.
