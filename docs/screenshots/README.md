# Screenshots

One curated, tracked gallery under `pi/`. Generated experiment pairs under `labs/` and the local
contact sheet are disposable. Pending visual work is indexed in `experiments.json`.

## Directory layout

| Path | Contents | Git |
| ---- | -------- | --- |
| `pi/` | Curated flagship shots named by `app/pi/src/shots.ts` | tracked |
| `pi-durable/` | Core durable-workspace shots named by `app/pi-durable/src/shots.ts` | tracked |
| `labs/` | Generated incumbent/variant pairs (`ui-presets/`, `scenario-workflow-chapters/`, `scale-lab/`) | ignored |
| `reports/` | Comparison decisions and baselines with stable names (`graph-baseline.json`, `graph-layout-comparison.json`, `scenario-comparison.json`, `motion-comparison.json`, `edges-comparison.json`, `edges-decision.json`, `audit.json`) | tracked |
| `atlas/`, `demo-atlas/`, `inner-layout/`, `retro-style/`, `capture/` | Visual-gate output | ignored |
| `review.json`, `experiments.json` | Human verdicts and the pending-work index | tracked |
| `index.html` | Local contact sheet | ignored |

## Curated Pi shots

Every tracked Pi image comes from a named shot in `app/pi/src/shots.ts`. A shot is pure data: scenario,
preset, policy overrides, surface, camera framing and the evidence to show. `?shot=<id>` launches the
same state in a browser; no screenshot script encodes a special camera path.

| File                            | Shot            | What it shows                                                                              |
| ------------------------------- | --------------- | ------------------------------------------------------------------------------------------ |
| `pi/pi-agent-in-action.png`        | `cockpit`       | The dense multi-turn run as fluid flux filaments and merged field halos, with grid-packed scopes and the grayscale HUD. |
| `pi/pi-agent-node-detail.png`      | `node-detail`   | A camera fit onto one failing node: LOD detail rung, telemetry, per-kind accents and glow.   |
| `pi/pi-agent-deep-focus.png`       | `deep-focus`    | The opt-in focus lens: the node enlarges, context dims, and a fixed-size cockpit shows neighbors and actions. |
| `pi/pi-agent-fractal.png`          | `fractal`       | A two-level inner layout inside the focus lens — directed spokes with ports and status, without enlarging the node. |
| `pi/pi-agent-recursion.png`        | `recursion`     | Bounded depth-3 recursion: chips stay graph nodes with direction and status, and the lens autoscales with the host node. |
| `pi/pi-agent-fit-wide-far.png`     | `fit-wide-far`  | Adaptive fit at 2^-1× on a wide canvas — topology at the scale floor. |
| `pi/pi-agent-fit-wide-mid.png`     | `fit-wide-mid`  | Adaptive fit at 2^0× on a wide canvas — cards and labels at the ergonomic target. |
| `pi/pi-agent-fit-wide-near.png`    | `fit-wide-near` | Adaptive fit at 2^1× on a wide canvas — detail rung at the near octave. |
| `pi/pi-agent-fit-narrow-far.png`   | `fit-narrow-far`| The far octave on a narrow (900×1000) canvas. |
| `pi/pi-agent-fit-narrow-mid.png`   | `fit-narrow-mid`| The target octave on the narrow canvas — aspect-derived insets keep the graph framed. |
| `pi/pi-agent-fit-narrow-near.png`  | `fit-narrow-near`| The near octave on the narrow canvas. |
| `pi/pi-agent-dense-type.png`       | `dense-type`    | Opt-in denser cards: tighter interior padding, shorter card height and a raised label floor. |
| `pi/pi-agent-living-graph.png`     | `living-graph`  | The opt-in motion preset: longer activity tail and slower rung/camera blends; pulse evidence in `motion/`. |
| `pi/pi-agent-dynamic-range.png`    | `dynamic-range` | The same graph near the zoom-out floor, on a starfield backdrop — the scale dynamic range.   |
| `pi/pi-agent-octaves.png`          | `octaves`       | One hierarchy at 1x, 1/2x and 1/4x world scale in a single frame.                            |
| `pi/pi-agent-octaves-palette.png`  | `octaves-palette` | The same layout with step colouring per octave — opt-in, pending verdict.                  |
| `pi/pi-agent-octaves-near.png`     | `octaves-near`  | Zoom into one second-octave branch to promote its smallest cards to legible detail.          |
| `pi/pi-agent-layout-stacked.png`   | `layout-stacked`| Hybrid surface with the transcript below the graph (ember palette).                         |
| `pi/pi-agent-layout-floating.png`  | `layout-floating`| Floating transcript, collapsed to give the graph the full canvas (circuit palette).         |
| `pi/pi-agent-neon-cockpit.png`     | `neon-cockpit`  | The emissive palette with a grid backdrop; color in the view, not the chrome.               |
| `pi/pi-agent-aurora-map.png`       | `aurora-map`    | Full-scope map on the cool aurora palette and starfield backdrop.                            |
| `pi/pi-agent-light.png`            | `light-theme`   | The light theme variant on the canonical structure.                                         |
| `pi/pi-agent-catalog.png`          | `catalog`       | The proof surface: launchable presets and sampled experiments with their questions.          |
| `pi/pi-agent-preset.png`           | `policy`        | A launched `quiet` preset with provenance badges in the live policy panel.                   |
| `full_gui.png`                  | —               | Design reference: the dense rectangle workspace at the detail rung.                          |
| `graph_view.png`                | —               | Design reference: the same structure seen from far away.                                     |

## Curated Pi Durable shots

`app/pi-durable/src/shots.ts` derives its catalog from `src/scenarios.ts`. Each `?shot=<id>` boots the
same deterministic local feed, so no capture script carries a private camera path. `SG_DURABLE_SHOTS`
redirects output; `SG_DURABLE_SHOT` filters ids.

| File | Shot | Question |
| ---- | ---- | -------- |
| `pi-durable/basic-turn.png` | `basic-turn` | Can I finish a chat turn with no provider and no API key? |
| `pi-durable/sleeping-approval.png` | `sleeping-approval` | Can I see why a task sleeps and wake it? |
| `pi-durable/fork-tabs.png` | `fork-tabs` | Can two conversations stay open with independent state? |
| `pi-durable/resumed.png` | `resumed` | Does a retried request id produce one answer? |
| `pi-durable/task-graph.png` | `task-graph` | Can I see committed task owners and waits? |
| `pi-durable/timeline.png` | `timeline` | Can I read the committed transcript in order? |
| `pi-durable/typed-errors.png` | `typed-errors` | Does a run failure offer a recovery action? |
| `pi-durable/busy-inbox.png` | `busy-inbox` | Can steers queue while a run is busy? |
| `pi-durable/extension-section.png` | `extension-section` | Can an extension add sections and hooks? |
| `pi-durable/tool-call.png` | `tool-call` | Does a tool result become an action node? |
| `pi-durable/system-prompt.png` | `system-prompt` | Are instructions a committed entry? |
| `pi-durable/agent-settings.png` | `agent-settings` | Can a tab keep its own agent? |
| `pi-durable/configure.png` | `configure` | Can settings round-trip through the session? |
| `pi-durable/environment.png` | `environment` | Is the execution environment inspectable? |
| `pi-durable/reload-extension.png` | `reload-extension` | Can an installed extension be replaced? |
| `pi-durable/reset-handoff.png` | `reset-handoff` | Does a handoff keep its boundary id? |
| `pi-durable/compaction.png` | `compaction` | Can a compacted transcript stay navigable? |
| `pi-durable/agent-events.png` | `agent-events` | Are span events kept off the causal graph? |
| `pi-durable/subagent-report.png` | `subagent-report` | Does a child report back to its owner? |
| `pi-durable/checkout-children.png` | `checkout-children` | Can child tasks restart or abort independently? |
| `pi-durable/app-state.png` | `app-state` | Can host state be shown without becoming a fact? |
| `pi-durable/usage.png` | `usage` | Can token usage be inspected offline? |

Recapture the first four with `pnpm --filter pi-durable shots:focus`, the two scoped placements with
`shots:phase2`, or all rows with `shots:all`. `scripts/shot.ts` copies prior images to gitignored
`.prev` pairs and writes `pi-durable-index.html`, a local studio with a kept/rejected selector.
Verdicts stay in the browser until a human pastes them into a review file.

## Regenerate and iterate

From the repository root:

```
pnpm --filter pi shots:all            # all shots -> pi/
pnpm --filter pi shot node-detail     # one shot (comma-separate ids for a few)
pnpm --filter pi shot --watch         # recapture on source change, refresh the contact sheet
pnpm --filter pi shot --sheet         # refresh the contact sheet without recapturing
```

Pairs are regenerated from their owning test: `tests/ui-compare.spec.ts` writes
`labs/ui-presets/<id>/`, `app/demo/tests/scenario-compare.spec.ts` writes
`labs/scenario-workflow-chapters/`, and `app/demo/tests/scale-lab.spec.ts` writes
`labs/scale-lab/<candidate>/`. Each candidate has one hypothesis, one URL state and one
incumbent/variant pair in `experiments.json`. The contact sheet shows every pending entry so a
missing verdict is visible next to the images.

`pnpm --filter pi shots:all` runs `tests/screenshots.spec.ts`, which boots `?shot=<id>`, waits for
`__pi.shotReady()` and for the camera viewport to stop moving, then writes `<shot.file>` here. The
suite asserts there are no page errors. `SG_PI_SHOTS` redirects output; `SG_PI_SHOT` filters ids.

`scripts/shot.ts` also writes a local `index.html` contact sheet here with one auto-refreshing card
per shot, linking each to its launch URL. That sheet is gitignored; images are the tracked artifact.
The watch mode polls source mtimes and recaptures the selected shots, so the loop is: edit CSS/policy
→ sheet refreshes → keep or discard. No server restart and no manual browser driving.

Generated visual-gate output shares this root but stays out of git: `atlas/`, `demo-atlas/`,
`inner-layout/`, `retro-style/` from `pnpm run verify:visual`, and `capture/` from `pnpm run verify`.
