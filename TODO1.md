# TODO1 — Freeform recursive Pi flagship (plan)

**Status:** proposal. **Date:** 2026-11-20. **Owner area:** engine + `app/pi`.

**Goal.** Make `app/pi` the flagship proof of immersive, animated, physically-interactive,
recursive-subgraph, video-game-like graph experiences, then turn that proof into a repeatable recipe
for semantic graph wrappers (agentic orchestration first).

**Settled direction.** Freeform, zero-gravity, self-adapting layout is the default. No global lane
grid or fixed coordinate schedule. Lanes and other geometries stay available as **opt-in per-scope
policies**, so one tidy subgraph can sit inside a larger freeform whole. No new library API unless the
contract cannot express a need; host owns all policy.

**Efficiency rule.** Ship a runnable flagship slice first, then add feel, then proof and proliferation.
Do not stage work as horizontal layers that only produce a demo at the end. Reuse the existing
`app/demo` examples and `@spacegraphjs/agent` selectors rather than rebuilding them.

---

## 1. Why / what must be true

The hypothesis (`../SPACEGRAPH.md:25`): *when agent activity becomes sufficiently complex, spatial
navigation through relationships is more effective than linear navigation through messages.* Success
is measured task performance on five investigative questions, not visual appeal:

1. Why did the agent change `src/auth/session.ts`?
2. Which tool calls led to the failing test?
3. What did the subagent contribute?
4. Which changes were made after the failing test?
5. Where did the agent retry or change direction?

`packages/domain/agent` already has the selectors (`why`, `ledHere`, `downstream`, `failureDetails`,
`changedFiles`, `delegationContributions`). The flagship must present their answers and measure
whether the graph beats the log. n ≥ 5 counterbalanced users; if the graph loses, **stop immersive
work, publish the result, keep the library** (`../SPACEGRAPH.md:485-487`). Run this experiment after a
demo exists — it governs the product claim, not construction.

The experience must express: low cognitive load (spatial memory over recall), approachable onboarding,
constant orientation, active exploration, delight (floating nodes, cinematic transitions), and
shareable artifacts (`../SPACEGRAPH.md:33-44`). The **hybrid** is the ergonomic bridge: keep the
transcript mounted; users choose a question, not a mode (`../SPACEGRAPH.md:42`).

Alignment: `README.md:628-635` — fractal ZUI, semantic navigation, compositional views, spatial
shells, "extends the same model ... and a contract that keeps hosts in control."
`docs/not-decided.md:8,10` leaves immersion and the flagship renderer undecided; `docs/world.md:30`
keeps sound/haptics/WebXR unsupported until a host registers an adapter. None become library defaults.

---

## 2. Current state — what is already free

| Need | Existing mechanism |
| --- | --- |
| 3D, depth, cinematics | `WebGLRenderer` (perspective + orthographic, CSS2D/3D, fog, instancing, BVH); `flat / layered / depth-stack / orbit`; `MotionDirector` verbs + `CameraVerbRegistry`; GSAP `flyTo` (`src/core/`, `src/depth/`, `src/motion/`) |
| Freeform + physics | `ScopeSimulation` damped springs, sleep, pinning, cooling inter-body forces; `PhysicsPlugin` Verlet with `gravity: 0`, collisions, repulsion (`app/demo/demos/plugins/physics.ts`); seeded `ForceCore` + Barnes–Hut octree (`src/layout/`) |
| Recursion | `ScopeSpec → buildScopeTree → layoutScopes → ScopeSimulation → ScopesPlugin`; path-qualified IDs, portals, composed frames, incremental continuity, vision-driven policy (`docs/scopes.md`) |
| Expression | Group/HTML/Markdown/Chart/Code/Data/Globe nodes, Flow/Animated/Bundled/InterGraph edges, salience → visual channels, `WidgetLayer` (`src/nodes/`, `src/edges/`, `src/widgets/`, `src/salience/`) |
| Ergonomics | `InputManager`, `Fingering`, raycast + BVH, drag/wiring/hover/selection, `AccessibilityLayer`, `ErgonomicsAPI` (`src/input/`, `src/plugins/interaction/`, `src/a11y/`) |
| Verification / composition | four vision analyzers + `VisionAssert`/`createVisionAssert`; `ScopedOverlay`, `GraphPeek`, focus dimming; contract with `supports`/`supportsDepth` and `2d/3d` (`src/vision/`, `packages/overlays/`, `packages/renderer/`) |

Constraints:

- The core three.js renderer and the dependency-free `packages/renderer` contract are decoupled;
  `packages/spacegraph-renderer` is the only bridge. The contract already supports `3d` and all depth
  modes but not scopes or physics. Keep Pi on the contract; run scopes as a host-side
  `ScopeHost`/`ScopeSimulation` writing `RenderNode.position`. Keep a switchable engine-mode page using
  `SpaceGraph.create({ scopes: ... })` for the full plugin.
- Three solvers exist by intent (seeded force for snapshots, live `PhysicsPlugin` for interaction,
  scope springs for transitions). **One position authority per view**; scope simulation wins, physics
  is isolated and reconciled at rest.
- `app/pi` today is a disciplined but flat 2D viewer: `client.ts:144` mounts `projection: '2d'`,
  `client.ts:60-64` uses a static lane layout, `client.ts:68` hardcodes `'execution'`, and shapes are
  only panel/badge/dot/card. State is module-level `let`s. No scopes, physics, 3D, motion, vision,
  hybrid, level switch, permalink or investigative-question UI.
- Ready to copy: `app/demo/demos/plugins/physics.ts`, `layout/fractal.ts`, `layout/layout-force.ts`,
  `rendering/multi-agent-workflow.ts`, `plugins/edge-flow.ts`, `html/interaction/scopes.html` +
  `tests/scopes.spec.ts`. The OpenCode record (`../SPACEGRAPH.md`) contributes the hybrid surfaces,
  mouse map, level budgets and measured budgets — but not its lane-as-default model.

---

## 3. Guardrails (compact)

1. **Host owns policy; one-way dependency.** Keep Pi types out of `src/`, `packages/`, and every
   published domain package (`app/pi/scripts/verify.ts` enforces this today). Vocabulary, levels,
   geometry, budgets, motion and stop rules are host or domain policy.
2. **Freeform by default, lanes optional.** `ScopeSimulation`/`ForceCore` with `gravity: 0`, repulsion
   + edge attraction, transient forces cooling to rest, per-scope solvers, warm starts. Stability comes
   from sleep, focus pinning, stable path-qualified IDs and spatial memory
   (`packages/kernel/src/spatial-memory.ts`), not frozen coordinates. Determinism = same seed and event
   stream converge to the same rest state within tolerance. A scope may opt into lanes/grid/tree via
   `ScopeSpec.strategy`; never the global default.
3. **Contract first, registry not branches.** Gate every affordance with `supports(...)` /
   `supportsDepth(...)`; no `renderer === '...'` paths. Move the old lane config into opt-in geometry.
4. **One position authority per view.** Scope simulation is authoritative; `PhysicsPlugin` (gravity 0)
   is pointer play only, reconciled at rest. Never run both on one node.
5. **Motion and immersion are reversible.** Reduced-motion from the start (`settle()` / `instant`),
   interruptible flights, sound/haptics/WebXR as `reportUnsupported` seams only. Flag risky behavior;
   four-rung diff (pure model → host → thin app wiring → affordance); keep rollback.
6. **Legibility gates spectacle.** Vision overlap/legibility/hierarchy/ergonomics checks on every
   captured scene, including settled and reduced-motion states. Never present a capability claim
   without measured evidence.

---

## 4. Target shape

```
Pi translator → generic AgentEvent → KernelOp → Kernel
      → agentScopes(view) → ScopeHost + ScopeSimulation (freeform, zero-g)
      → PiHost (clock, levels, geometry, selection, follow, a11y)
      → ModelAdapter → RenderModel → renderer registry → SpaceGraph (2d/3d)
      → surfaces: log | map | hybrid | turn-map overlay | side overview

Vision scores → scopePolicy → simulation targets → renderer → measured again
```

Three seams do the work: the **translator** keeps Pi out of the library, the **contract + registry**
removes backend branches, the **hybrid bridge** keeps the transcript mounted while the map answers a
question (`../SPACEGRAPH.md:260-263`). The vision → policy → motion → measurement loop is what makes
the graph self-adapting rather than merely animated (`docs/scopes.md:91-100`).

---

## 5. Execution — three waves, then proliferation

Each wave is independently demonstrable. Consolidate work into as few PRs as the diff allows; run
wave items in parallel where they touch different files.

### Wave A — Runnable flagship slice (do first)

One vertical slice that proves the whole thesis with the provider-free local feed. Copy patterns from
`app/demo`; add no library API.

- [ ] Extract the minimum `PiHost` from `app/pi/src/client.ts:45-54`: kernel, view, controller, theme,
      selection, follow, positions, and later simulation/clock. Keep `client.ts` a thin DOM/SSE binding
      with `window.__pi` hooks. Move the lane config into an opt-in geometry module.
- [ ] Add `app/pi/src/scopes.ts`: `agentScopes(view)` maps run → turn → delegated subtree →
      artifact/state leaves to `ScopeSpec[]` with path-qualified IDs and portal nodes; `contains` nests,
      `orders` is intra-scope, `writes`/`delegates`/`retry` project across scopes. Never emit
      `inferred-cause`. Reuse `deriveScope`, `collapseGroups`, `applySubLayouts` from `packages/kernel`
      before writing new code.
- [ ] Drive `ScopeHost`/`ScopeSimulation` from the host: seeded zero-gravity forces, cooling, sleep,
      warm starts on append, focus pinning, `scopePositionsAt` interpolation, `settled`/`energy`/`steps`
      in `window.__pi`. Start settled/2D to isolate correctness, then enable continuous motion.
- [ ] Flip the flagship to `projection: '3d'`, add the depth-mode switch gated by `supportsDepth`, and
      sample depth from `turn`/`hierarchy` axes. Replace the follow jump with a `MotionDirector`
      `flyTo`/`trace` flight; collapse duration under reduced motion. Use activity-driven `FlowEdge`s.
- [ ] Add the hybrid surface: transcript stays mounted in a stable container, arrangements
      `stacked / side / floating` by CSS order, map-node → message reveal, `#graph:<nodeID>` permalink;
      add a scoped turn-map overlay and side overview if cheap.
- [ ] Present the five questions as capabilities backed by the existing selectors; keep the existing
      13 capability entries. One gallery item per new surface (`freeform-layout`, `scopes`, `levels`,
      depth, motion, five-questions).
- [ ] Add the canonical provider-free fixture with all five situations and pinned answers; test the
      fold, the scope tree, reparenting, convergence within tolerance, and byte-stable answers. No mocks.

**Done:** `PI_LOCAL_FEED=1 pnpm --filter pi dev` shows a recursive, freeform, zero-gravity agent run in
3D with one cinematic follow flight and a log/map hybrid; all capabilities produce evidence;
`pnpm --filter pi test`, `test:e2e`, `verify` green.

### Wave B — Feel, ergonomics and self-verification (parallel after A)

- [ ] Add one host-owned frame clock: advance simulation + camera director + activity decay + vision
      sampling; drop to `on-demand` when `settled` and no flight is active; pause on hidden tab; show
      FPS/energy in the HUD.
- [ ] Add physical play with `PhysicsPlugin` at `gravity: 0` (drag with inertia, throw, collide, bounce)
      in the engine-mode scope; reconcile to solved targets at rest; document the one-authority rule.
- [ ] Replace the hardcoded level with a zoom-driven policy: `overview / execution / detail` with
      DOM card budgets 12 / 40 / 24 and ladder degradation. Upgrade expression: Markdown/Html for
      messages, Chart for tokens, Data/Note for files, CodeEditor for tool payloads, Group portals for
      delegation, salience on active nodes. Keep opt-in lane scopes available for a turn subgraph.
- [ ] Publish the mouse map (right-drag pan, background-drag pan, pointer wheel zoom, middle-click
      frame, middle-drag 3D orbit, click select, node drag, shift-drag box-select); controls inside
      cards take the mouse; hover is an outline, not a move; keyboard/a11y routes mirror each gesture.
- [ ] Apply a 60-turn render window with an "earlier history" banner while layout measures the whole
      kernel; add SVG/JSON/HTML export; add `reportUnsupported` sensory seams with a silent default.
- [ ] Add a vision-gated capture matrix (depth modes × geometries, including a lane-scope inside a
      freeform parent × settled/flight/reduced-motion/failure/large-stream/hybrid contexts), assert the
      committed set, and expose `pnpm --filter pi verify:visual`. Add the HUD readout and an honest
      "known limitations, not lowered" list.

**Done:** responsive and ergonomic flagship that settles, passes vision gates, and can be shared or
exported; `pi:scale` budgets from §6 asserted in CI.

### Wave C — Proof and proliferation

- [ ] Run the five-task experiment (n ≥ 5 counterbalanced) against transcript / graph / hybrid and the
      geometry axes; record success, time, wrong turns, preference and quotes. Apply the stop rule and
      publish the result, including a negative one. Decide whether any immersive mode graduates to a
      default; do not block Waves A/B on this.
- [ ] Write `docs/semantic-wrappers.md` from the `@spacegraphjs/agent` + Pi worked example: vocabulary,
      `defineDomain`, event→KernelOp mapper, selectors/facets/trace, `ModelAdapter`, manifest,
      host-owned levels/geometry/budgets, one-way guard. Recommend freeform zero-g as host default and
      lanes as an opt-in scope policy. Link from `docs/PLAN/INDEX.md`.
- [ ] Prove generality with **one** second domain — workflow / agentic orchestration (workflow,
      subworkflow, step, run, trigger, artifact; contains/orders/delegates/writes/retries). Use
      `docs/archive/n8n.md` as design input only; no n8n types in the library. Compose a wrapper
      conformance test from `adapterConformance` + `defineDomain` + the fixture pattern.
- [ ] Add a `create-spacegraph` scaffold for a domain wrapper (domain package + host shell + hybrid
      surface + gallery + freeform policy + verify script + vision gate). Demonstrate compositional
      views by connecting two wrappers with `InterGraphEdge` in one workspace.
- [ ] Produce the shareable delivery: one clone, one install, one URL, one doc, one video, one npm
      release; provider-free demo, canonical fixture, landing page, compelling screenshot. Update
      `README.md` "The demo" section to point at the Pi flagship.

**Done:** the product claim is measured, a second domain proves the recipe, and a new domain can adopt
the stack by filling in a scaffold.

### Explicitly not now

WebXR/sound/haptics implementations; a full five-layout comparative study; incremental
`RenderModelPatch`; cross-session and recurring-error graphs; depth-of-field and production 3D
geometry; additional domains; the missing `SPACEGRAPH.TODO.41.md` gated-scenarios note (record as a
one-line deferred item, do not create a phase for it).

---

## 6. Budgets and verification (single gate list)

| Check | Command / rule |
| --- | --- |
| Fold, selectors, scope tree, host scenarios | `pnpm --filter pi test` — real kernel + fixture, no mocks |
| Capability evidence | every gallery entry runs library code; test asserts non-empty evidence, unique IDs |
| Browser + hybrid + mouse map | `pnpm --filter pi test:e2e` |
| Vision + interaction atlas | `pnpm --filter pi verify:visual` — `createVisionAssert` on every captured scene |
| Scale | `pnpm --filter pi scale` — assert budgets below |
| Dependency + layout policy | `pnpm --filter pi verify` — no Pi imports in library, no `@earendil-works/*` in packed agent, freeform default with lanes opt-in |
| Full repo | `pnpm run check` |

Starting budgets from `../SPACEGRAPH.md:394-403` (measure first, then tighten):

| Metric | Budget | Prior measured |
| --- | --- | --- |
| Model build, 300 msg / ~1.2k nodes | < 50 ms | ~27 ms |
| Full pipeline, 5,001 msg / ~20k nodes | < 400 ms | 160 ms |
| Force layout, 60-turn window | < 1 s | ~0.2 s (9.3 s uncapped) |
| Lazy 3D chunk gzip | < 400 KB | 282 KB incl. `three` |
| App entry delta | no regression | +0.3 kB |

Mechanisms: linear pipeline, sleeping simulation, 60-turn draw window, instancing at overview rungs.
Never hide nodes to fix a slow stream without measuring.

---

## 7. Decisions to settle early (five only)

1. Flagship as an **additional** mode in `app/pi` (recommended) or a replacement of the 2D gallery?
2. Use the contract renderer for the default view and engine mode as a switchable page (recommended)?
3. Scope simulation authoritative with `PhysicsPlugin` isolated and reconciled at rest (recommended)?
4. Promote any immersive mode to default? Decide only after the Wave C experiment; default to none.
5. Continue with workflow/orchestration as the second domain (recommended)?

**Settled:** freeform zero-gravity self-adapting layout is the default; lanes and fixed-coordinate
schedules are opt-in per-scope policies, never the only geometry.

---

## 8. Risks

| Risk | Mitigation |
| --- | --- |
| Freeform layout drifts / never settles | Cooling, sleep, warm starts, pinning, `settle()` for export/reduced motion, convergence test |
| Two solvers fight over coordinates | One authority per view; reconcile at rest |
| Streaming jitter | Cooling forces, sleeping bodies, warm starts, pin focus |
| Graph loses to transcript on five tasks | Stop rule; publish negative; library remains deliverable |
| Hybrid loses transcript scroll | Stable container + CSS order; e2e assertion |
| O(n²) regression | `pi:scale` budgets; window + whole-kernel layout |
| Lane scope looks rigid in freeform whole | Isolate to one scope, local gutter, vision checks |
| Motion sickness / annoyance | Reduced motion, interruptible flights, no default, experiment |
| Scope ID churn | Path-qualified IDs, incremental `ScopeHost.update`, reparenting tests |
| Feature museum | Evidence-only gallery, guided replay, limitations list |

---

## 9. Immediate next actions

1. **`feat(pi): freeform recursive flagship slice`** — Wave A in one PR: minimal `PiHost`,
      `agentScopes`, seeded zero-gravity `ScopeSimulation`, 3D + depth + one cinematic flight, hybrid
      transcript/map, five-question capabilities, canonical fixture. Reuse existing demo patterns; no
      library API changes.
2. **`feat(pi): feel, mouse map and vision gates`** — Wave B: game clock, gravity-0 physics play,
      levels + budgets, expressive nodes/edges, mouse map, capture matrix, `pi:scale`, HUD.

Wave C starts only after the slice is demonstrable.
