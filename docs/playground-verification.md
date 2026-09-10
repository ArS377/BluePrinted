# Playground verification

Verified locally on September 10, 2026.

## Automated checks

- `npm run check`: 64 tests passed; production build passed.
- Five new layout tests cover functional columns, phone layout, bounded movement after resizing, connected wires, missing boundaries, and empty manifests.
- `git diff --check`: passed.

## Browser checks

Used the Codex in-app browser, not a signed-in Chrome profile. No real Replit build, publication, or account changes were requested.

- Desktop/tablet preview: colored mini-app, connected block canvas, and activity panel render with Bricolage Grotesque / DM Sans. Wires attach to their blocks.
- Successful sample save: saved list updates; five real browser/server events appear; all four blocks are marked as seen in that trace.
- Failure test: one request returns the intentional 503, the draft and existing notes remain, and the failure switch resets.
- Explanation: local rule-based analysis cites the rejected write, API response, and preserved draft.
- Replay starts at the beginning; stepping and event selection highlight the corresponding block.
- Keyboard movement changes the block position; Reset layout restores the initial position.
- Pointer drag moves the block and its wires without losing selection.
- At 390px: compact navigation, three quick actions, full-width mini-app, vertical blocks, and Map / Activity switching.
- Save-to-map and selected-event-to-map shortcuts switch panels and bring the map into view.
- At 320px: document width equals viewport width; no page-level horizontal overflow.
- Guide opens, advances, and closes with Escape.
- Starter idea fills the project name and prompt; both survive reload. Test draft was returned to its original empty state afterward.
- Isolated local fixture on port 3418: create handoff, manifest inspection, shared block map, runtime setup screen, and version history render. This fixture stubs Replit and was stopped after verification.
- No JavaScript console errors were reported in the checked sample and fixture tabs.

Two sample notes were saved by these checks. They contain the built-in example text and use the sample's normal session retention.

## Iteration

The first phone pass used three tall action rows and a wrapping header. Those pushed the mini-app too far down. The revised phone layout has a two-row header, a Guide action in navigation, and three compact action controls. Added direct map shortcuts after identifying that selecting an event in the Activity panel otherwise required manually switching views.

## Known dependency notice

`npm audit` reports one moderate advisory group for the existing transitive `hono` dependency (versions below 4.13.5). The font changes do not add Hono; that dependency was not upgraded as part of this UI-only change.

## Delivery

The production build is served locally at port 3417. Source changes are committed locally. No push was retried after the earlier push-approval rejection.
