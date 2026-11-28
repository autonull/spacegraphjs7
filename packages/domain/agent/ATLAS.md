# Pattern card — `SessionAtlas`, `ReplayScrubber`, `EventWindow`

| Field          | Value                                                                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Metaphor       | A session is a graph you can replay and steer; the prefix is a read model over committed events.                                                                          |
| Inputs         | `AtlasEvent[]` (id, kind, status, role, text, turn, at, label, parent), `AtlasState` (total, prefix, playing, selected, window, travel).                                  |
| Outputs        | `sessionAtlasHTML` chrome, `replayScrubberHTML` control, `atlasModel`/`atlasStats` aggregates, `reduceAtlas` transitions, `atlasTravel` interpolation.                    |
| Facts          | Chapters group committed turns; causal edges come from parent ids; the prefix reveals stable ids. No event is created, removed or rewritten by replay.                    |
| Invariants     | One committed fold; stable ids; text stays text; escaped markup; square corners; one catalog of `data-atlas-*` selectors; reduced motion snaps playback.                  |
| Keyboard       | Native scrubber and buttons; chapter, focus, window, travel and close actions are buttons; hosts bind global keys to the same prefix/window actions.                      |
| Reduced motion | `atlas.css` drops transitions; hosts pass `reducedMotion` to `playTerminalReplay` so playback jumps to the final prefix.                                                  |
| Failure modes  | Empty session yields zero stats; prefix clamps to `1..total`; missing id is a no-op; canceled replay keeps the current prefix; unsafe text is escaped.                    |
| Consumers      | Demo: `app/demo/html/layout/dev-session.html`. Pi Durable: `?labs=1` atlas panel (`a`). E2E: `test/e2e/dev-session.spec.ts`, `app/pi-durable/tests/labs-session.spec.ts`. |

The package owns the read model and chrome only. Hosts keep the camera, node placement and commit
paths. Pi Durable derives events from `#consoleLines(tabKernel)` and binds the prefix to `scrubTo`
(the existing time-travel view), so replay never creates a second timeline.
