# app/pi

The Pi reference app: a private pnpm workspace consumer that embeds Pi in a Node process, turns its
events into `KernelOp`s and renders them through an unmodified SpaceGraphJS. SpaceGraphJS has no
knowledge of this app; see `pnpm --filter pi verify`.

```bash
pnpm --filter pi dev         # Node op server + Vite client, one command
pnpm --filter pi test        # translation, fold and capability tests (no provider needed)
pnpm --filter pi test:e2e    # Playwright against the app's own Vite with PI_LOCAL_FEED=1
pnpm --filter pi test:publish # packed agent consumed outside the workspace, without Pi
pnpm --filter pi verify      # one-way dependency guard
pnpm --filter pi verify:visual # vision-gated capture matrix (depth × arrangement × context)
pnpm --filter pi scale       # measured scale budgets
pnpm --filter pi build
```

The browser check starts both processes itself and replays the local op feed, so no test reaches a
provider. The publish check packs the library and runs its selectors from a clean consumer; the packed
agent must have no `@earendil-works/*` dependency.

Tier the loop instead of running the full matrix per change:

```bash
pnpm --filter pi check:fast      # types + unit tests (~2s)
pnpm --filter pi e2e:chrome      # shell and instrument browser checks
pnpm --filter pi verify:fast     # both of the above, one command; no screenshots written
pnpm --filter pi shots:focus     # four representative shots with before/after pairs
pnpm --filter pi shots:all       # full gallery only at a slice boundary
```

Keep `pnpm --filter pi dev` running so Playwright reuses the Vite and op servers.

## Layout

- `src/server.ts` — Node HTTP server: `/events` (SSE) and `POST /prompt`. This is the only file that
  imports Pi packages; it translates `AgentSessionEvent`s through `src/pi-events.ts` into the generic
  `AgentEvent` type from `@spacegraphjs/agent`.
- `src/client.ts` — thin DOM/SSE binding: `EventSource` → `decodeOp` → `PiHost.consume`.
- `src/host.ts` — host-owned policy: kernel, view, controller, contract renderer, `ScopeSimulation`
  (seeded zero-gravity forces, cooling, sleep, warm starts), camera flight, frame clock, levels,
  depth gating and the log/map/hybrid transcript. Exposes the `window.__pi` hooks.
- `src/scopes.ts` — `agentScopes(view)` maps run → turn → delegated subtree → leaves to validated
  `ScopeSpec[]` with path-qualified ids, portals and cross-scope edges.
- `src/capabilities.ts` — gallery evidence, including the five investigative questions, backed by
  `@spacegraphjs/agent` selectors.
- `src/fixture.ts` — provider-free canonical run containing all five situations, with pinned answers.
- `src/policy.ts` — pure host policy: vision scores, 60-turn window, zoom→level with hysteresis,
  activity decay, export formats and report-only sensory seams.
- `src/engine.ts` + `engine.html` — engine-mode page: `SpaceGraph.create({ scopes: ... })` with a
  zero-gravity `PhysicsPlugin` enabled only for pointer play and reconciled at rest. One position
  authority per view: the scope simulation owns layout.
- `src/theme.ts` — host CSS tokens → `RenderTheme`.
- `playwright.config.ts`, `tests/browser.spec.ts` — browser checks for the 3D graph, scope tree,
  depth gating, hybrid transcript, permalink, gallery, prompt form and follow/attention hooks.
- `scripts/publish-check.ts` — packed-library consumer check.

## Ergonomics and gates

The frame clock advances the scope simulation, camera director, activity decay and vision sampling,
then sleeps when settled and no flight is active. Zoom selects `overview/execution/detail` (DOM card
budgets 12/40/24) unless a level is pinned; one unit scope can opt into a grid policy while the parent
stays freeform. The transcript is always mounted; use the surface buttons and arrangement selector to
switch views, click a graph node to reveal its message, or follow `#graph:<nodeID>`.

Mouse: right-drag pan, wheel zoom, middle-drag orbit, click select, node drag, shift-drag box-select.
Keyboard mirrors: arrows pan, `+`/`-` zoom, `f` focus the revealed node, `Esc` clears selection.
Export produces JSON, SVG or HTML; WebXR, sound and haptics stay report-only seams.

`verify:visual` runs the vision-gated capture matrix (depth modes × arrangements, reduced motion,
failure, large stream and lane-scope contexts). It also gates the adaptive fit across three zoom
octaves × two canvas aspects, the opt-in dense typography preset over the same matrix, and settled plus
intermediate frames of bounded inner-graph re-entry. `scale` measures model build, pipeline, 60-turn
force layout and the gzipped 3D chunk; the measured force-layout budget is 1.5 s for the scope solver.

The view uses registered flux edges (`FluxEdge`) and a host field layer of merged node halos (ADR 0016).
Unit and delegate scopes are grid-packed; the root scope stays freeform. The camera refits only when the
canvas aspect changes materially (ADR 0015); `window.__pi.adaptiveFit()`
exposes the last insets and refit count. The `dense-type` preset raises `ladder.minLabelPx` to 18 and
tightens card interiors without changing a default. The `recursion` shot opens the inner graph tab at
depth 3; `fractal` keeps the detail tab.

## Provider

Live mode needs a model and credentials for that provider (for example `ANTHROPIC_API_KEY`). With no
model available, `createAgentSession()` succeeds but the page reports that no provider is configured
and prompting returns 503. `PI_LOCAL_FEED=1 pnpm --filter pi dev` replays a deterministic op feed
instead of starting a session; this is the same feed the tests use.

## SDK notes (version 1.5.2)

The packages are scoped: `@earendil-works/pi-coding-agent`, `@earendil-works/pi-agent-core` and
`@earendil-works/pi-ai` (there are no unscoped `pi-agent-core` / `pi-ai` packages on npm).
`session.subscribe()` emits `compaction_start`/`compaction_end` and `thinking_level_changed`;
`model_change` is a persisted session entry, not a subscribe event. `stopReason` and `usage` live on
the message payload, not on the event. A prompt sent while the session is streaming must declare
`streamingBehavior: "steer" | "followUp"`.
