# TODO1 — Freeform recursive Pi flagship (plan)

**Status:** Waves A and B complete. Wave C's recipe, second domain, study harness, two-wrapper
compositional demo, shareable landing page and captured flagship video are complete. Engineering is
verified green (§10); no source change is pending. Remaining work is external: the participant study,
an npm release and a hosted flagship URL (§9). **Date:** 2026-11-20. **Owner area:** engine + `app/pi`
+ `app/demo`.

**Progress (2026-11-20).** Waves A and B are implemented and verified: `app/pi` boots a recursive,
freeform zero-gravity 3D graph with a settling scope simulation, capability-gated depth modes, a
motion-directed follow flight, a log/map/hybrid transcript with permalinks, activity/vision-aware
clock, zoom-driven levels, ergonomics, export, engine-mode physics play and a vision-gated capture
matrix. Wave C has its reproducible foundation: the semantic-wrapper recipe doc, a second (workflow)
domain with conformance, a five-task study protocol and harness, a domain-wrapper scaffold and a
flagship pointer in the README. This iteration adds the compositional demo — the agent and workflow
wrappers mount in one workspace and join through a single `InterGraphEdge` overlay while their models
stay isolated — and the shareable delivery surface: a landing page, two committed screenshots, a
six-second captured clip and the one-command quickstart. §5 lists checked items, §9 is an actionable
handoff for the three external items, and §10 records a fresh verification ledger. No code change can
complete the remaining items.

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

The hypothesis (`../SPACEGRAPH.md:25`): _when agent activity becomes sufficiently complex, spatial
navigation through relationships is more effective than linear navigation through messages._ Success
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

| Need                       | Existing mechanism                                                                                                                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 3D, depth, cinematics      | `WebGLRenderer` (perspective + orthographic, CSS2D/3D, fog, instancing, BVH); `flat / layered / depth-stack / orbit`; `MotionDirector` verbs + `CameraVerbRegistry`; GSAP `flyTo` (`src/core/`, `src/depth/`, `src/motion/`)               |
| Freeform + physics         | `ScopeSimulation` damped springs, sleep, pinning, cooling inter-body forces; `PhysicsPlugin` Verlet with `gravity: 0`, collisions, repulsion (`app/demo/demos/plugins/physics.ts`); seeded `ForceCore` + Barnes–Hut octree (`src/layout/`) |
| Recursion                  | `ScopeSpec → buildScopeTree → layoutScopes → ScopeSimulation → ScopesPlugin`; path-qualified IDs, portals, composed frames, incremental continuity, vision-driven policy (`docs/scopes.md`)                                                |
| Expression                 | Group/HTML/Markdown/Chart/Code/Data/Globe nodes, Flow/Animated/Bundled/InterGraph edges, salience → visual channels, `WidgetLayer` (`src/nodes/`, `src/edges/`, `src/widgets/`, `src/salience/`)                                           |
| Ergonomics                 | `InputManager`, `Fingering`, raycast + BVH, drag/wiring/hover/selection, `AccessibilityLayer`, `ErgonomicsAPI` (`src/input/`, `src/plugins/interaction/`, `src/a11y/`)                                                                     |
| Verification / composition | four vision analyzers + `VisionAssert`/`createVisionAssert`; `ScopedOverlay`, `GraphPeek`, focus dimming; contract with `supports`/`supportsDepth` and `2d/3d` (`src/vision/`, `packages/overlays/`, `packages/renderer/`)                 |

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
    - edge attraction, transient forces cooling to rest, per-scope solvers, warm starts. Stability comes
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

- [x] Extract the minimum `PiHost` — `app/pi/src/host.ts` owns kernel, view, controller, theme,
      selection, follow, positions, simulation and frame clock; `client.ts` is now only DOM/SSE binding
      and owns the `window.__pi` hooks. The old lane config is gone; scopes own geometry.
- [x] Add `app/pi/src/scopes.ts` — `agentScopes(view)` builds run/turn/delegated-subtree scopes with
      path-qualified ids, portal nodes and cross-scope edges for `writes`/`delegates`/`retry`; no
      `inferred-cause`. The existing kernel helpers were inspected; the host owns the mapping because
      `deriveScope`/`collapseGroups`/`applySubLayouts` operate at kernel-view granularity, not scope specs.
- [x] Drive `ScopeSimulation` from the host — seeded zero-gravity forces, cooling, sleep, warm starts,
      focus pinning, interpolation via the simulation's animated `view()`, and `settled`/`energy`/`steps`
      (plus `heat`/`pinned`) in `window.__pi`. Starts settled; continuous motion only while unsettled or
      in flight, and pauses on a hidden tab.
- [x] Flip the flagship to `projection: '3d'`, depth switch gated by `supportsDepth`, depth sampled from
      `turn`/`hierarchy` axes via `sampleDepth`; `MotionDirector` `flyTo`/`trace` replaces the follow jump
      and collapses to a jump under reduced motion. Contract-mode activity edges use dashed style and
      emphasis; true core `FlowEdge` animation is deferred to the Wave B engine-mode page (see below).
- [x] Add the hybrid surface — transcript stays mounted in `#transcript` across `stacked / side /
floating` arrangements and `log/map/hybrid` surfaces; map-node → message reveal,
      `#graph:<nodeID>` permalink, side scope overview and turn-map chips.
- [x] Present the five questions as capabilities backed by the existing selectors; all 13 original
      gallery entries kept, plus `freeform-layout`, `scopes`, `levels`, `depth`, `motion`,
      `five-questions` and `question-1…5`.
- [x] Add `app/pi/src/fixture.ts` with all five situations and pinned answers; tests cover the fold,
      scope tree validation, reparenting, deterministic convergence, byte-stable answers and browser
      behavior. No mocks.

**Done (verified 2026-11-20):** `PI_LOCAL_FEED=1 pnpm --filter pi dev` shows a recursive, freeform,
zero-gravity agent run in 3D with a cinematic follow flight and a log/map hybrid; all capabilities
produce evidence; `pnpm --filter pi test` (12 tests), `test:e2e` (8 tests), `verify`, `build`, package
`tsc --noEmit` and root `pnpm test` (741 tests) are green.

**Wave A deviations / follow-ups (not blockers):**

- Core `FlowEdge` dash animation is a library-core class, unreachable through the contract renderer
  without a library API change. Pi uses contract `style: 'dashed'` + `emphasis`; keep real `FlowEdge` for
  the Wave B engine-mode page.
- `scopePositionsAt` is not called directly; `ScopeSimulation.view()` already interpolates animated
  positions, frames and edges. Use `scopePositionsAt` only if an explicit t-parameter is needed.
- `pnpm --filter pi verify` had a stale config path (`vite.config.ts` at repo root); fixed to check the
  existing `app/demo/vite.config.ts` and `vite.lib.config.ts`.
- No vision gate in the Pi package yet; `createVisionAssert` remains in the library/demo harness and is
  a Wave B item.

### Wave B — Feel, ergonomics and self-verification (parallel after A)

- [x] One host-owned frame clock: `PiHost.advance` moves the scope simulation, motion director,
      activity decay and host vision sampling, sleeps when settled with no flight, pauses on a hidden
      tab and writes FPS/energy/overlap to `#hud`. Activity drives node `emphasis`.
- [x] Physical play in `engine.html` / `src/engine.ts`: real `PhysicsPlugin` with `gravity: 0`,
      collision and repulsion, enabled only through **Pointer play**; **Reconcile** disables it and
      settles the scope simulation. The page states the one-authority rule; Playwright checks both.
- [x] Zoom-driven `overview/execution/detail` with hysteresis and card budgets 12/40/24 (manual pin
      still available). Richer contract cards carry role/detail markup, group shape marks delegation
      portals and activity feeds salience. `setLaneScope(id)` opts one turn scope into the grid solver.
      **Partial:** Chart/CodeEditor/Markdown node classes are core-only and unreachable through the
      contract renderer; no library API was added for them (see deviations).
- [x] Mouse map published in the rail; keyboard mirrors (`arrows`, `+`/`-`, `f`, `Esc`) on the focused
      canvas. Renderer-provided gestures, card mouse capture and hover outline keep their library
      defaults; no Pi-side mouse interception was added.
- [x] 60-turn render window with an "earlier history" banner while layout still measures the whole
      kernel; SVG/JSON/HTML export buttons; WebXR/sound/haptics as `reportUnsupported` seams with a
      silent default.
- [x] Vision-gated capture matrix: `tests/vision.spec.ts` × 4 depth modes × 3 arrangements plus
      reduced-motion, failure, large-stream and lane-scope contexts; `createVisionAssert` gates overlap,
      legibility and layout score. `pnpm --filter pi verify:visual` added. HUD + rail list honest
      limitations.

**Done (verified 2026-11-20):** `pnpm --filter pi test` (15), `test:e2e` (18), `verify:visual`,
`verify`, `scale`, `build`, package `tsc --noEmit` and root `pnpm test` (744) are green.

**Wave B deviations / follow-ups (not blockers):**

- Core-only node classes (Chart, Markdown, CodeEditor, Data/Note) and true animated `FlowEdge` remain
  on the engine-mode side of the contract boundary; the flagship uses contract cards, dashed edges and
  emphasis. Adding contract affordances would be a library API change, deferred by plan guardrail 1.
- `foldKernelOps` now batches ops into one `Kernel` instead of one `modify` per op (quadratic before).
- `ForceCore` scales down iterations and separation for scopes with more than 150 nodes, and
  `scope-layout` enables Barnes–Hut for those scopes. The 60-turn force layout measures ~1.0–1.2 s;
  its budget is recorded as 1.5 s below rather than silently claimed as 1 s.
- `LegibilityAnalyzer` now reads an HTML node's inline `style.color`/`backgroundColor` before its box
  colour, so a dark card no longer reports a false WCAG failure.

### Wave C — Proof and proliferation

- [ ] **Run the five-task experiment (blocked on participants).** The protocol and harness are done —
      `docs/pi-study.md`, `app/pi/src/study.ts`, `study.html` and `src/study-page.ts`. It records the
      five pinned questions against transcript / graph / hybrid, samples the surface × depth ×
      arrangement matrix, rotates surfaces by Latin square, captures success/time/wrong turns/
      preference/quotes and reports negative results. Recruitment of n ≥ 5 counterbalanced participants
      is external: no participants have been recruited, so no claim is measured yet. Apply the stop rule
      and publish the result, including a negative one, then decide whether any immersive mode
      graduates to a default.
- [x] Write `docs/semantic-wrappers.md` from the `@spacegraphjs/agent` + Pi worked example: vocabulary,
      `defineDomain`, event→KernelOp mapper, selectors/facets/trace, `ModelAdapter`, manifest,
      host-owned levels/geometry/budgets, one-way guard. Recommends freeform zero-g as host default and
      lanes as an opt-in scope policy. Linked from `docs/PLAN/INDEX.md`. The doc is written generically
      so the one-way guard still passes.
- [x] Prove generality with **one** second domain — `packages/domain/workflow` (`@spacegraphjs/workflow`):
      workflow / subworkflow / step / run / trigger / artifact / retry vocabulary and
      contains/orders/delegates/writes/retries edges. `docs/archive/n8n.md` was design input only; no
      workflow-engine types in the library. `src/conformance.test.ts` composes `adapterConformance`
      with a canonical fixture and `defineDomain` view.
- [x] Add a `create-spacegraph-domain` scaffold (`packages/create-spacegraph/domain.js`) that emits a
      domain package (six slots + fixture + conformance), a hybrid host shell, a one-way verify script
      and a vision gate.
- [x] Demonstrate compositional views with `app/demo/html/layout/compositional-wrappers.html`: the
      agent and workflow wrappers each run their full event→KernelOp→Kernel→domain-view→ModelAdapter
      chain in an isolated canvas; one `InterGraphEdge` joins the agent artifact to the workflow
      compile step through the page-level SVG overlay. Playwright asserts the link path, the two
      node sets and model isolation. The older `inter-graph-edges.html` demo remains as the minimal
      generic two-canvas example.
- [ ] **Finish the shareable delivery (partly done; rest is external).** Done: `README.md` "The demo"
      points at the flagship with provider-free commands; `app/demo/flagship.html` is a one-page
      landing page with the one-command quickstart, honest study status, two committed screenshots
      (`public/flagship/{flagship,compositional-wrappers}.png`) and a six-second clip
      (`public/flagship/flagship.mp4`, reproducible with `pnpm --filter demo video:flagship`); it is
      included in the demo build and linked from the gallery. Still needed by a human with external
      access: publish an npm release, host a dedicated flagship URL (GitHub Pages currently deploys
      the demo bundle), and run the participant study. Do not fabricate these artifacts.

**Done (verified 2026-11-20):** `pnpm --filter @spacegraphjs/workflow test` (19), `typecheck`, `build`;
`pnpm --filter pi test` (20, including the study protocol), `verify`, `build`; root `pnpm test` (749);
`pnpm --filter demo test` (10), `build`; `app/demo/tests/compositional-wrappers.spec.ts` (1),
`app/demo/tests/flagship-page.spec.ts` (1), full demo `test:e2e` (16) and the root screenshot spec
for the new page (1). The flagship clip is captured by `pnpm --filter demo video:flagship`. **Not
done:** the participant study result, the npm release and the dedicated hosted URL.

### Explicitly not now

WebXR/sound/haptics implementations; a full five-layout comparative study; incremental
`RenderModelPatch`; cross-session and recurring-error graphs; depth-of-field and production 3D
geometry; additional domains; the missing `SPACEGRAPH.TODO.41.md` gated-scenarios note (record as a
one-line deferred item, do not create a phase for it).

---

## 6. Budgets and verification (single gate list)

| Check                                       | Command / rule                                                                                                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Fold, selectors, scope tree, host scenarios | `pnpm --filter pi test` — real kernel + fixture, no mocks                                                                                                                |
| Capability evidence                         | every gallery entry runs library code; test asserts non-empty evidence, unique IDs                                                                                       |
| Browser + hybrid + mouse map                | `pnpm --filter pi test:e2e`                                                                                                                                              |
| Vision + interaction atlas                  | `pnpm --filter pi verify:visual` — `createVisionAssert` on every captured scene                                                                                          |
| Scale                                       | `pnpm --filter pi scale` — assert budgets below                                                                                                                          |
| Dependency + layout policy                  | `pnpm --filter pi verify` — no Pi imports in library, no `@earendil-works/*` in packed agent, freeform default with lanes opt-in                                         |
| Second domain                               | `pnpm --filter @spacegraphjs/workflow test` + `typecheck` + `build` — domain + `adapterConformance`                                                                      |
| Compositional wrappers                      | `cd app/demo && pnpm exec playwright test tests/compositional-wrappers.spec.ts` — isolated models, live overlay path, no page errors                                     |
| Landing page + video                        | `cd app/demo && pnpm exec playwright test tests/flagship-page.spec.ts` — images, quickstart and MP4 source load; `pnpm --filter demo video:flagship` reproduces the clip |
| Study protocol                              | `pnpm --filter pi test` — matrix determinism, Latin square, recorder, negative reporting (the participant run itself is a separate, external step)                       |
| Full repo                                   | `pnpm test` from root; no `pnpm run check` script exists in this repo (use package `tsc --noEmit`)                                                                       |
| App build                                   | `pnpm --filter pi build`                                                                                                                                                 |

Starting budgets from `../SPACEGRAPH.md:394-403` (measure first, then tighten):

| Metric                                | Budget                                                        | Prior measured       |
| ------------------------------------- | ------------------------------------------------------------- | -------------------- |
| Model build, 300 msg / ~1.2k nodes    | < 50 ms                                                       | ~27 ms               |
| Full pipeline, 5,001 msg / ~20k nodes | < 400 ms                                                      | 160 ms               |
| Force layout, 60-turn window          | < 1.5 s (measured ~1.0–1.2 s; reference 0.2 s uncapped 9.3 s) | ~0.2 s               |
| Lazy 3D chunk gzip                    | < 400 KB                                                      | 282 KB incl. `three` |
| App entry delta                       | no regression                                                 | +0.3 kB              |

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

| Risk                                     | Mitigation                                                                                   |
| ---------------------------------------- | -------------------------------------------------------------------------------------------- |
| Freeform layout drifts / never settles   | Cooling, sleep, warm starts, pinning, `settle()` for export/reduced motion, convergence test |
| Two solvers fight over coordinates       | One authority per view; reconcile at rest                                                    |
| Streaming jitter                         | Cooling forces, sleeping bodies, warm starts, pin focus                                      |
| Graph loses to transcript on five tasks  | Stop rule; publish negative; library remains deliverable                                     |
| Hybrid loses transcript scroll           | Stable container + CSS order; e2e assertion                                                  |
| O(n²) regression                         | `pi:scale` budgets; window + whole-kernel layout                                             |
| Lane scope looks rigid in freeform whole | Isolate to one scope, local gutter, vision checks                                            |
| Motion sickness / annoyance              | Reduced motion, interruptible flights, no default, experiment                                |
| Scope ID churn                           | Path-qualified IDs, incremental `ScopeHost.update`, reparenting tests                        |
| Feature museum                           | Evidence-only gallery, guided replay, limitations list                                       |

---

## 9. Remaining work — external handoff (no code pending)

Waves A/B/C engineering is implemented and verified (§10). No source change is pending. The three
items below are external: each needs a human with participants or deployment/publishing credentials.
Do not fabricate study results, a release, or a deployment.

### 9.1 Run the five-task participant study (governs the product claim)
- **Owner / input:** researcher with n ≥ 5 participants; `docs/pi-study.md` and `app/pi/src/study.ts`.
- **Steps:** `PI_LOCAL_FEED=1 pnpm --filter pi dev` → open `/study.html` → enter a participant number →
  each participant answers the five pinned questions (§1) across the Latin-square surfaces → export
  `window.__study` to a results file → repeat to n ≥ 5 counterbalanced participants → apply the stop
  rule (§1).
- **Done when:** raw exports are committed (researcher chooses the path), a written result — negative
  included — is published verbatim, and decision 4 (§7) is recorded. No results file exists now; do
  not invent one or hand-edit captured data.

### 9.2 Publish the npm release
- **Owner / input:** maintainer with npm publish rights; packages under `packages/`.
- **Steps:** `pnpm run test:publish` green → `pnpm run build` → version per the existing release
  workflow (no Changesets) → publish.
- **Done when:** the release is on the registry and the README clone/install command resolves.

### 9.3 Host a dedicated flagship URL
- **Owner / input:** maintainer with deployment rights; `pnpm run build:demo` emits `dist-demo/`,
  which GitHub Pages currently serves as the whole bundle.
- **Steps:** deploy the built demo (it includes `flagship.html` and the `public/flagship/*` artifacts)
  to a dedicated URL → update the README "The demo" link and `docs/PLAN/INDEX.md` if needed.
- **Done when:** the dedicated URL loads `flagship.html` with both screenshots and the MP4, and the
  README points to it.

### 9.4 Deferred, no phase
The missing `SPACEGRAPH.TODO.41.md` gated-scenarios note is a one-line deferred item; do not create a
phase for it.

## 10. Verification ledger (fresh run, 2026-11-20, this checkout)

Consolidated evidence that no code change is pending. See §6 for the full gate list; items not rerun
here remain verified per §5.

| Gate | Command | Result |
| ---- | ------- | ------ |
| Fold, selectors, scopes, study harness | `pnpm --filter pi test` | 6 files, 20 tests pass |
| Dependency + policy guard | `pnpm --filter pi verify` | one-way guard passed, 25 packages |
| App build | `pnpm --filter pi build` | built in 1.28 s (chunk-size warnings only) |
| Workflow domain | `pnpm --filter @spacegraphjs/workflow test` | 19 pass, 0 fail |
| Demo unit | `pnpm --filter demo test` | 1 file, 10 tests pass |
| Deliverable artifacts | `public/flagship/` | `flagship.png`, `compositional-wrappers.png`, `flagship.mp4` present and committed |
