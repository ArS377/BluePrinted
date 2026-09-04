# Workspace verification

Checked locally on September 4, 2026.

## Automated

- 59 Node tests pass, including HTTP saves, session isolation, rejected writes, expiry, manifest validation, encryption, pairing, and WebSocket ingestion.
- New regressions cover draft storage, stale snapshots, waiting-build guidance, safe runtime URLs, fragment-free WebSocket URLs, stale inspection errors, and publication without a returned URL.
- The production client builds successfully.
- After compatible updates to fast-uri and qs, npm audit reports no known vulnerabilities.

## Browser checks

Used an isolated headless browser at 1440px and 390px widths. No user Chrome session or Replit credits were used.

- Save a finding through the HTTP API, observe the saved list, and inspect its recorded events.
- Reject a write: the finding count does not increase, the draft remains, and the switch resets.
- Explain the failed trace through the rule-based fallback; citations select their corresponding events.
- Replay and manually step through the measured events. The graph identifies the selected boundary.
- Reload a creation draft and verify both name and prompt survive.
- Create, inspect, and update a project through a local fake MCP connector. The old snapshot stays labeled until reinspection.
- Enter an incomplete runtime URL without navigating or crashing the preview. Pairing a valid local URL loads the preview and shows bridge-installation guidance.
- Dismiss the guide with Escape and verify focus returns to its trigger.
- Verify mobile page width stays within the viewport. The architecture diagram has a separately scrollable region.

The fake connector is a QA fixture, not evidence of a live Replit build or deployment. Live OAuth, Agent completion, publication, and generated-app bridge installation still require a connected Replit environment. No claim is made that those external steps were completed during this refresh.

## Design and copy

Replaced Inter with bundled Source Sans 3 and IBM Plex Mono. Reduced heading scale, removed the forced tour, drew manifest connections, and kept the surrounding workspace neutral. The writing pass replaced slogans and indefinite waiting text with named actions, confirmed states, and recovery steps.
