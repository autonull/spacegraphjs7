# Screenshots

One curated, tracked gallery. Generated capture output is disposable and gitignored.

| File                     | What it shows                                                                                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pi-agent-in-action.png` | Pi flagship cockpit: startup-fitted graph with per-kind node/edge variety, transcript spine with expanded detail and scroll overview, instruments and HUD. |
| `pi-agent-catalog.png`   | The proof surface: launchable presets and experiment cells beside the capabilities.                                                                        |
| `pi-agent-preset.png`    | A launched `quiet` preset with provenance badges in the live policy panel.                                                                                 |
| `full_gui.png`           | Design reference: the dense rectangle workspace at the detail rung.                                                                                        |
| `graph_view.png`         | Design reference: the same structure seen from far away.                                                                                                   |

Regenerate the Pi shots with `pnpm --filter pi test:e2e -- tests/screenshots.spec.ts` from the
repository root, or `pnpm exec playwright test --config playwright.config.ts tests/screenshots.spec.ts`
from `app/pi`. The spec writes into this directory; set `SG_PI_SHOTS` to redirect it.

Generated captures share this root but stay out of git: `atlas/`, `demo-atlas/`, `inner-layout/`,
`retro-style/` from `pnpm run verify:visual`, `capture/` from `pnpm run verify`, and the demo shots
(`screenshots/verified-*.png` via `pnpm run test:screenshots`). Only the five files above are tracked.
