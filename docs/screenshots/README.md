# Screenshots

One curated, tracked gallery. Generated capture output and the local contact sheet are disposable.

## Curated Pi shots

Every tracked Pi image comes from a named shot in `app/pi/src/shots.ts`. A shot is pure data: scenario,
preset, policy overrides, surface, camera framing and the evidence to show. `?shot=<id>` launches the
same state in a browser; no screenshot script encodes a special camera path.

| File                            | Shot            | What it shows                                                                              |
| ------------------------------- | --------------- | ------------------------------------------------------------------------------------------ |
| `pi-agent-in-action.png`        | `cockpit`       | The dense multi-turn run, transcript spine with expanded detail, and the grayscale HUD.     |
| `pi-agent-node-detail.png`      | `node-detail`   | A camera fit onto one failing node: LOD detail rung, telemetry, per-kind accents and glow.   |
| `pi-agent-deep-focus.png`       | `deep-focus`    | The opt-in focus lens: the node enlarges, context dims, and a fixed-size cockpit shows neighbors and actions. |
| `pi-agent-fractal.png`          | `fractal`       | A two-level inner layout inside the focus lens — directed spokes with ports and status, without enlarging the node. |
| `pi-agent-recursion.png`        | `recursion`     | Bounded depth-3 recursion: chips stay graph nodes with direction and status, and the lens autoscales with the host node. |
| `pi-agent-fit-wide-far.png`     | `fit-wide-far`  | Adaptive fit at 2^-1× on a wide canvas — topology at the scale floor. |
| `pi-agent-fit-wide-mid.png`     | `fit-wide-mid`  | Adaptive fit at 2^0× on a wide canvas — cards and labels at the ergonomic target. |
| `pi-agent-fit-wide-near.png`    | `fit-wide-near` | Adaptive fit at 2^1× on a wide canvas — detail rung at the near octave. |
| `pi-agent-fit-narrow-far.png`   | `fit-narrow-far`| The far octave on a narrow (900×1000) canvas. |
| `pi-agent-fit-narrow-mid.png`   | `fit-narrow-mid`| The target octave on the narrow canvas — aspect-derived insets keep the graph framed. |
| `pi-agent-fit-narrow-near.png`  | `fit-narrow-near`| The near octave on the narrow canvas. |
| `pi-agent-dense-type.png`       | `dense-type`    | Opt-in denser cards: tighter interior padding, shorter card height and a raised label floor. |
| `pi-agent-living-graph.png`     | `living-graph`  | The opt-in motion preset: longer activity tail and slower rung/camera blends; pulse evidence in `motion/`. |
| `pi-agent-dynamic-range.png`    | `dynamic-range` | The same graph near the zoom-out floor, on a starfield backdrop — the scale dynamic range.   |
| `pi-agent-layout-stacked.png`   | `layout-stacked`| Hybrid surface with the transcript below the graph (ember palette).                         |
| `pi-agent-layout-floating.png`  | `layout-floating`| Floating transcript, collapsed to give the graph the full canvas (circuit palette).         |
| `pi-agent-neon-cockpit.png`     | `neon-cockpit`  | The emissive palette with a grid backdrop; color in the view, not the chrome.               |
| `pi-agent-aurora-map.png`       | `aurora-map`    | Full-scope map on the cool aurora palette and starfield backdrop.                            |
| `pi-agent-light.png`            | `light-theme`   | The light theme variant on the canonical structure.                                         |
| `pi-agent-catalog.png`          | `catalog`       | The proof surface: launchable presets and sampled experiments with their questions.          |
| `pi-agent-preset.png`           | `policy`        | A launched `quiet` preset with provenance badges in the live policy panel.                   |
| `full_gui.png`                  | —               | Design reference: the dense rectangle workspace at the detail rung.                          |
| `graph_view.png`                | —               | Design reference: the same structure seen from far away.                                     |

## Regenerate and iterate

From the repository root:

```
pnpm --filter pi shots:all            # all shots -> this directory
pnpm --filter pi shot node-detail     # one shot (comma-separate ids for a few)
pnpm --filter pi shot --watch         # recapture on source change, refresh the contact sheet
```

`pnpm --filter pi shots:all` runs `tests/screenshots.spec.ts`, which boots `?shot=<id>`, waits for
`__pi.shotReady()` and for the camera viewport to stop moving, then writes `<shot.file>` here. The
suite asserts there are no page errors. `SG_PI_SHOTS` redirects output; `SG_PI_SHOT` filters ids.

`scripts/shot.ts` also writes a local `index.html` contact sheet here with one auto-refreshing card
per shot, linking each to its launch URL. That sheet is gitignored; images are the tracked artifact.
The watch mode polls source mtimes and recaptures the selected shots, so the loop is: edit CSS/policy
→ sheet refreshes → keep or discard. No server restart and no manual browser driving.

Generated visual-gate output shares this root but stays out of git: `atlas/`, `demo-atlas/`,
`inner-layout/`, `retro-style/` from `pnpm run verify:visual`, and `capture/` from `pnpm run verify`.
