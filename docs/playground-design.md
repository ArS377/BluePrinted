# Builder playground

## Intent

Make BluePrinted feel like a place to try an app and look inside it. The sample should teach by doing, without an account or a mandatory tour. Preserve real server traces, explicit failures, and the separation between declared architecture and observed runtime behavior.

## Visual direction

Six core colors: canvas #F5F5FA, ink #292B40, blueprint #4F5DE4, lilac #D9CCFF, mint #C9EBD9, apricot #FFCF9E. White surfaces and a semantic error red support those colors. Color identifies interface, application, and storage; it is never the only indication of status.

Display: Bricolage Grotesque. Body and controls: DM Sans. Code and timings: IBM Plex Mono. Self-host the fonts. No Inter.

## Layout options

Option A puts a large app preview above the diagram. It is familiar, but the user cannot see a save and its path together on a typical laptop.

    [ app preview ------------------ ]
    [ architecture ------- ][ events ]

Option B is a builder's bench. The small working app stays beside its diagram and recorded actions. On narrower screens, the activity panel moves below the canvas; phones have explicit Map / Activity controls below the sample.

    [ Playground | Your apps              Guide / Replit ]
    [ Save a note. Watch it travel.        + Create an app ]
    [ 1 Try a save      2 Replay its path     3 Test a failure ]
    [ sample app ][ movable connected blocks ][ activity ]

Choose B. The signature interaction is a diagram made of colored blocks with ports and wires that follow each block when moved. Movement edits only this view, never app code. Arrow keys move a focused block; Reset layout restores positions. Mobile uses a vertical diagram instead of unreadably shrinking three columns.

## UX decisions

- Keep the sample usable before asking for Replit authorization.
- The three quick actions operate real controls: focus the note, start a recorded replay, or arm a one-request failure. Explain when a step is unavailable.
- Preserve the note after errors. Keep the save response next to the form.
- Separate the mini-app from its map and activity with visible headers and distinctive colors.
- Give the replay a current-event label and keep measured timings distinct from slowed playback.
- Keep provenance and retention details available without making them the first thing the user reads.
- Preserve creator drafts, build handoff guidance, runtime pairing, and project navigation.
- Use large touch targets, visible focus, reduced-motion support, and no page-level horizontal overflow.

## Critique and revision

Three pastel dashboard cards would still look generic. Give only the real app and architecture blocks strong color; use the dotted canvas to explain that blocks can move. Keep the activity panel quiet. Avoid badges everywhere, novelty cursors, decorative numbers, fake progress, or a marketing hero. The numbered actions represent an actual first-use sequence.

## Verification

Check desktop and phone screenshots, successful and failed saves, replay controls, event inspection, pointer and keyboard block movement, layout reset, creator draft retention, and guide navigation. Run the existing tests and new layout unit tests. Do not trigger a real Replit build during QA.
