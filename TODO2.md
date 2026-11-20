# TODO2 — From flagship to the full spatial-software vision (plan)

**Status:** Phase A is implemented and verified; Phases B–G remain. TODO1's engineering is complete
and verified (`TODO1.md:383-395`); its only remaining items are external (Phase G). **Date:**
2026-11-20. **Owner area:** `app/pi` first, then `app/demo` + domain wrappers, then the library kit
and reference hosts. Current progress and the exact next move are in §8 (Ledger).

**Destination.** The full design space is mapped in [`docs/POSSIBILITIES.md`](docs/POSSIBILITIES.md).
This plan turns it into a sequence: first a runnable flagship (Phase A), then domain generality (B),
then compositional worlds and shareable scenes (C), a runtime self-verifying loop (D), host senses
and product forms (E), library consolidation (F), and proof/delivery (G). Phase A is the
fast path already agreed; B–G are the expansion needed to ultimately achieve the vision. Each phase is
independently demonstrable and keeps all gates green before the next starts.

**Efficiency rule.** Ship the flagship slice with *zero new library API*. Prove generality with two
new domains, not ten. Promote Pi/demo code into library helpers only when a second host consumes it,
and add contract descriptors only for capabilities a second renderer must advertise. Everything else
in `POSSIBILITIES.md` becomes host work through the scaffold — achievable by construction without
further library changes. This is what keeps the long arc from becoming a menu of special cases.

**Goal.** Make `app/pi` the flagship demonstration of immersive, animated, physically-interactive,
recursive-subgraph, video-game-like graph experiences, then extend the same contract, scope engine
and six-slot wrapper recipe until every workspace in `POSSIBILITIES.md` is buildable by a host.

**Unchanged guardrails.** Host owns policy; one-way dependency; freeform zero-g default with
lanes/grid/tree opt-in per scope; one position authority (`ScopeSimulation` owns coordinates,
physics borrows a bounded node set and reconciles at rest); register and gate via `supports(...)`,
never renderer branches; legibility gates spectacle; reduced motion and the five-task stop rule stay
first-class (`../SPACEGRAPH.md:25,485-487`).

---

## 1. Done criteria

Pi demonstrates real cinematic `trace`, an in-app Playground with one position authority, zoomable
rectangles that change representation at each rung, a shareable full-state URL and honest vision
status. Four domains pass conformance and compose in one isolated workspace with cross-domain trace
and graph diffs. A runtime vision loop retargets layout and representation. Host-registered sensory
and widget adapters work without library defaults. Every helper reused by a second host has been
promoted behind capability gates. `pnpm test`, `pnpm --filter pi verify` and all builds are green, and
the study result is published (negative included) before any immersive mode becomes default.

---

## 2. Where the code stands — gap and first move

| Need | Present | Gap → first move |
| ---- | ------- | ---------------- |
| Recursion | `ScopeSpec → buildScopeTree → layoutScopes → ScopeSimulation`; path-qualified ids, portals, cross-scope edges (`src/layout/scope*.ts`) | None for the flagship. Keep the solver untouched. |
| Physics play | Working Play/Reconcile in `app/pi/src/engine.ts:43-56` with `PhysicsPlugin({gravity:0})` | Only on a side page. Extract to `app/pi/src/play.ts` and mount in the flagship; reuse the code. |
| Motion | Pure `MotionDirector` + `CameraVerbRegistry`, host-bound `flyTo` (`app/pi/src/host.ts:534-543`) | `trace` is a no-op (`:544`). Implement it in Pi; promote later. |
| Aesthetic channels | Salience→emphasis, widgets, depth continuum; `RenderNode.html` accepts host markup (`packages/renderer/src/index.ts:74-93`) | Bridge under-reports `emphasis`/`widgetSlots` (`spacegraph-renderer/src/index.ts:22-34`). Two-line fix + test. No core node class is needed for a live instrument. |
| Zoomable rectangles | Scope portals recurse; zoom swaps card budgets 12/40/24 | Card content is static at every rung (`app/pi/src/adapter.ts:53-59`). Make representation a function of `(node, zoom, activity, vision)`. |
| Vision | Four analyzers, `createVisionAssert`, capture matrix | `modelsLoaded = true` forced (`host.ts:139-143`); gates are test-time only. Runtime loop + honest strategy missing. |
| Shareability | `#graph:<id>` reveal anchor (`host.ts:287`) | No viewport/surface state, diffs or annotations. Full-state hash → graph diffs → annotated review. |
| Domains | `@spacegraphjs/agent` + `@spacegraphjs/workflow`, scaffold, two-domain composition | Only two. Add `filesystem` + `data`; remaining domains come from the scaffold. |
| Composition | `InterGraphEdge` overlay demo with isolated models (`app/demo/html/layout/compositional-wrappers.html`) | No cross-canvas trace, two-run diff or shared review scene. |
| Senses / widgets | `SCENE_FEATURES`, `SENSORY_SEAMS`, `WidgetLayer` descriptors (`src/world/world.ts`, `src/widgets/`) | Descriptors are inert; no host adapter registration. Add a register seam, no implementation. |
| Library kit | Mechanisms are host-assembled | Promote only reused helpers; no speculative contract fields. |

**Design reference — `docs/spacegraphj_screenshots/`.** `full_gui.png` shows a workspace built
entirely from rectangles: task strip, button rail, oscilloscope, multi-track charts, statistics rows
and a `rangeDurs` slider. `graph_view.png` shows the same structure at distance: one-line rectangles,
large `&&&` glyph nodes and thick tapered magenta flows. The lesson is the representation ladder:
**every rectangle is a portal**. Overview = one line; execution = mini-instrument; detail = full
panel; scope = nested graph. Pi can build this today from `RenderNode.html` + portals + `emphasis`.

---

## 3. Sequence — seven phases, each with its own gate

### Phase A — Ship the flagship experience (host-side; one bridge fix)

One vertical slice, ordered so each step is visible in the browser as it lands. No new library API.

- [x] Fix `packages/spacegraph-renderer/src/index.ts:22-34`: `emphasis` (`size`/`opacity`/
      `edgeThickness`) and `widgetSlots` are declared; `edgeSpec` widens emphasized edges. Unit tests
      in `index.test.ts` and `mapping.test.ts`.
- [x] Extract Play/Reconcile into `app/pi/src/play.ts` (`createPlaySession`) and mount the Playground
      in `host.ts`/`index.html` with `zero-g / orbit / gravity-well` presets, energy readout and the
      one-authority note. `engine.html` keeps the real `PhysicsPlugin` path; both print the rule. E2E:
      play → reconcile → settled. **Caveat:** the flagship Playground drives the bounded
      (`maxBodies: 120`) `ScopeSimulation` set; it does not attach a WebGL physics plugin. The real
      physics path remains the engine page.
- [x] Implement `trace` (`app/pi/src/trace.ts` + `host.ts`): ordered provenance walk, emphasis
      highlight and a reduced-motion-aware, interruptible camera sweep on the `flyTo` lerp. E2E
      asserts path order, camera move and legibility.
- [x] Replace forced `modelsLoaded = true` with an honest strategy. Default is explicit
      `strategy: 'heuristics'`; a real ONNX load is opt-in via `?vision=onnx` and falls back if no
      session loads (the bundled `.onnx` files are placeholders in this runtime). The strategy is
      exposed through `visionStrategy()` and read by `createVisionAssert.strategy()` for each capture.
      No fabricated scores.
- [x] Full-state permalink (`app/pi/src/permalink.ts`): hash-encode `{surface, arrangement, depth,
      depthAxis, level, focus, viewport, filter}`, restore on boot; `#graph:<id>` stays reveal-only.
      Unit round-trip + E2E URL round-trip green.
- [x] Zoomable rectangle ladder (`app/pi/src/adapter.ts`): one-line `overview`, mini-instrument
      `execution`, full panel `detail`, all escaped; `representationRung` lets activity promote and
      poor legibility demote. Edge emphasis widens causal ribbons. E2E checks every rung is legible.
      **Remaining within Phase A:** scope-portal glyph identity and portal zoom/breadcrumb navigation.
- [x] Guided replay from existing evidence: `walkthrough()` = five questions × three surfaces;
      `replay()` runs the question capabilities and flies the trace across changed artifacts. Wired to
      the rail. **Remaining within Phase A:** bind `Trail`/minimap from `src/navigation` into the rail.
- [x] Extend `app/pi/tests/vision.spec.ts` with play, trace, permalink, rung and replay states; add
      play-session and permalink frame budgets to `app/pi/scripts/scale.ts`. Also hardened a
      feed-timing race in `browser.spec.ts` and fixed a pre-existing `Frame.taskID` type error in
      `study-page.ts` that blocked the `tsc` gate.

**Gate:** `pnpm --filter pi test` (32), `test:e2e` (23), `verify:visual` (12), `verify`, `scale`,
`build`, package `tsc --noEmit`; root `pnpm test` (761) — all green. The flagship is complete after
this phase, apart from the two explicitly deferred sub-items above.

### Phase B — Domain generality (no library changes)

Two domains prove the recipe once; two visibly different additions make it general.

- [ ] Add `@spacegraphjs/filesystem` (file / symbol / change / commit / artifact): selectors for
      "what produced this change" and "which symbols depend on it"; six slots, fixture,
      `adapterConformance`, README; no provider or host import.
- [ ] Add `@spacegraphjs/data` (pipeline / dataset / step / run / model / metric): lineage and
      regression selectors; six slots, fixture, conformance, README.
- [ ] Compose **four** domains (agent + workflow + filesystem + data) in one workspace with
      `InterGraphEdge` overlays and isolated models, extending
      `app/demo/html/layout/compositional-wrappers.html` and its Playwright spec.
- [ ] Add a short **domain aesthetic/ergonomics profile** to `docs/semantic-wrappers.md`: wrapper
      contributes vocabulary + selectors; host owns levels, geometry, budgets, theme and play policy.
      Emit the same profile from `packages/create-spacegraph/domain.js` with its vision gate. This is
      the mechanism that makes the remaining domains in `POSSIBILITIES.md` host work, not scheduled work.
- [ ] Add per-domain evidence entries to `app/demo/src/gallery.ts`; run `pnpm run generate:registry`.
      Fix the dead `gallery.html` links in `showcase.html`/`learn.html` and the stale
      `docs/performance.md` path found during analysis.

**Gate:** new domains' `test`/`typecheck`/`build`; `pnpm --filter demo test` + `build` + compositional
Playwright; `pnpm --filter pi verify` still green; evidence non-empty for every gallery entry.

### Phase C — Compositional worlds and shareable scenes

- [ ] Add a **cross-domain `trace`** in `app/demo`: follow `InterGraphEdge` links across canvases so
      one action answers "metric → step → tool call → commit → file". Assert the camera follows and
      models stay isolated.
- [ ] Add a **graph diff** between two kernel snapshots using `@spacegraphjs/diff` + kernel history:
      annotate added/removed/changed nodes, expose a two-run view in `app/demo`, and assert the diff
      is derived from history, not hand-authored.
- [ ] Add **annotations** on `RenderNode.data` through the widget layer: reviewer notes pinned to a
      node, included in exports and the full-state permalink from Phase A.
- [ ] Produce a shareable report from `exportJSON`/`exportSVG`/`exportHTML` plus the permalink so a
      spatial argument is auditable without running the app.
- [ ] Add zoom-ladder and multi-domain sections to `app/demo/flagship.html`; recapture screenshots and
      the clip with `pnpm --filter demo video:flagship`; assert with `tests/flagship-page.spec.ts`.

**Gate:** compositional and flagship Playwright specs; `pnpm --filter demo build`; no page errors.

### Phase D — Runtime self-verifying loop

- [ ] Extend `scopePolicy` inputs with `hierarchy` and `ergonomics` scores
      (`src/layout/scope-policy.ts:40-48`); keep the module vision-type-free.
- [ ] Add an opt-in host helper `createVisionLoop(analyzers, policy)` under `src/vision/`: analyze →
      map scores to `scopePolicy` and representation rungs → measure again; expose `strategy`,
      `lastReport` and `reportUnsupported` when models are absent. No silent mutation.
- [ ] Wire the loop into `app/pi/src/host.ts` behind a host toggle; HUD shows overlap, legibility,
      hierarchy and ergonomics, and records which scores actually retargeted layout.
- [ ] Keep `createVisionAssert` as the test gate; assert that the runtime loop and the captured gate
      agree on the same scene, or explain the difference in the capture record.

**Gate:** vision-loop unit test with a deterministic fixture; `verify:visual` green including the
loop's settled state; `pnpm test` and `pnpm --filter pi verify` green.

### Phase E — Host senses and product forms

- [ ] Add a host **adapter registration seam** in `src/world/world.ts`: `registerSensory(adapter)`
      and `supportsSensory` consult registered adapters instead of always reporting unsupported;
      define the adapter interface, ship no implementation. WebXR/sound/haptics stay off by default.
- [ ] Add a console-only demo adapter under `app/demo` to prove registration and gating; document in
      `docs/world.md` that a host owns the implementation and no headset is assumed.
- [ ] Gate scene features (`fog/lights/parallax/trails/instancing`) through the contract descriptors
      from Phase F; apply them in the flagship and demo only where `supportsSceneFeature` is true.
- [ ] Build two thin reference hosts with the scaffold: a **Graph IDE** (filesystem domain + live
      file/diff panels in rectangles) and a **session observatory** (Pi itself, already built). Other
      forms in `POSSIBILITIES.md` — war room, learning atlas, research notebook, GraphOS — are then
      host work using the same recipe; record them as achievable, not scheduled.
- [ ] Bind gamepad/gesture input, if a host needs it, through `InputManager`/`Fingering` only; keep
      the library free of input defaults.

**Gate:** adapter registration test; demo page Playwright; `docs/world.md` and `docs/semantic-wrappers.md`
updated; all builds green.

### Phase F — Library consolidation (pull, not push)

- [ ] Promote `flyTo`/`trace`/`sweep` handlers from `app/pi/src/host.ts` into `src/motion/` as
      `createCameraMotionHandlers(adapter)`, with explicit `reportUnsupported` for unregistered verbs
      (`src/motion/director.ts:134-150`). Pi then imports it.
- [ ] Promote `app/pi/src/play.ts` into `src/world/PhysicsPlaySession` with the body cap and frame
      lifecycle proven in Phase A; keep the one-authority rule in `docs/world.md`.
- [ ] Promote the representation-ladder helper from `app/pi/src/adapter.ts` into `src/salience/` as a
      pure `(node, rung, activity, vision) → rung` function; hosts still own the HTML.
- [ ] Promote `createVisionLoop` if a second host uses it; otherwise leave it in Pi.
- [ ] Add contract descriptors **only for gated capabilities a second renderer must advertise**
      (`motionVerbs`, `sceneFeatures`, `sensorySeams` beside `supports/supportsDepth/supportsEmphasis`);
      leave scope/physics fields out until a renderer implements them. No behavior in the zero-dep contract.
- [ ] Add incremental `RenderModelPatch` consumption in the flagship/demo if streamed updates still
      rebuild the full model; measure before adding. Fix `ForceCore.initializePositions` randomize path
      (`src/layout/force-core.ts:331-335`) to use a plain-object position seam; add a focused test.
- [ ] Add parity coverage to `test/boundaries.test.ts` for everything promoted; document the two
      layout vocabularies (`ScopeStrategy` vs `LaneLayoutStrategy`) and subpath-only exports in
      `docs/scopes.md`.

**Gate:** root `pnpm test`, promoted-module unit tests, `pnpm --filter pi verify`, all builds. Pi's
behavior is unchanged — only its imports move.

### Phase G — Proof and delivery (external; no source work)

- [ ] Run the five-task study (`docs/pi-study.md`, `app/pi/src/study.ts`): n ≥ 5 counterbalanced,
      commit raw exports, publish the verbatim result (negative included), apply the stop rule and
      record TODO1 decision 4. **Participants required; do not fabricate a result.**
- [ ] Publish the npm release (`pnpm run test:publish` → `pnpm run build` → existing workflow, no
      Changesets) and host the dedicated flagship URL; update the README "The demo" link.
      **Credentials required.**
- [ ] Update `docs/not-decided.md` with what graduated; keep honest study status and report-only
      sensory seams.

### Explicitly not now

Sound/haptics/WebXR implementations and gamepad as library defaults; post-processing, DOF and
production 3D geometry; cross-session graphs; a full five-layout comparative study; a general
game-engine API; additional domains beyond the four until a host needs them; the missing
`SPACEGRAPH.TODO.41.md` note (one-line deferred item, no phase).

---

## 4. Verification — one gate list

| Check | Command / rule |
| ----- | -------------- |
| Flagship | `pnpm --filter pi test`, `test:e2e`, `verify:visual`, `verify`, `scale`, `build`, package `tsc --noEmit` |
| Vision on new states | `verify:visual` asserts overlap, legibility, hierarchy, ergonomics and layout score on settled, playing, trace, zoom-ladder rungs and reduced-motion scenes; strategy recorded per capture |
| Domains | `pnpm --filter @spacegraphjs/{agent,workflow,filesystem,data} test` + conformance + `typecheck` |
| Composition + scenes | `cd app/demo && pnpm exec playwright test tests/compositional-wrappers.spec.ts tests/flagship-page.spec.ts`; cross-domain trace, diff and annotation specs; `pnpm --filter demo video:flagship` reproduces the clip |
| Runtime loop | deterministic vision-loop fixture; runtime scores agree with captured gate or difference is recorded |
| Adapter seams | registration/gating test; no implementation defaults; `docs/world.md` updated |
| Boundaries | root `pnpm test` (`test/boundaries.test.ts`) + `pnpm --filter pi verify` after every phase |
| Study protocol | `pnpm --filter pi test` — matrix, Latin square, recorder, negative reporting; participant run external |
| Full repo | `pnpm test` from root; no `pnpm run check` script exists here (use package `tsc --noEmit`) |

Budgets (measure, then tighten; inherited from `TODO1.md:304-315`):

| Metric | Budget | Prior measured |
| ------ | ------ | -------------- |
| Model build, 300 msg / ~1.2k nodes | < 50 ms | ~27 ms |
| Full pipeline, 5,001 msg / ~20k nodes | < 400 ms | 160–230 ms |
| Force layout, 60-turn window | < 1.5 s | ~1.0–1.2 s |
| Lazy 3D chunk gzip | < 400 KB | 282 KB incl. `three` |
| Play session, ≤ 120 borrowed bodies | < 8 ms/frame; settles ≤ 5 s | 0.83 ms/frame, settles — Phase A |
| Permalink encode/decode | < 2 ms; round-trip stable | 0.005 ms — Phase A |
| Vision loop, one analyze→policy cycle | < 16 ms on the 60-turn window | new — Phase D |

Sleeping simulation, 60-turn draw window, body cap and overview instancing are the mechanisms.
Never hide nodes to fix a slow stream without measuring.

---

## 5. Decisions (five)

1. Keep the flagship host-side and defer broad contract expansion until a second renderer needs it
   (**recommended**) vs add all descriptors up front? The latter adds release surface with no visible gain.
2. Two new domains — filesystem and data (**recommended**) vs all ten in `POSSIBILITIES.md`? The
   scaffold makes the rest host work; scheduling them adds work, not capability.
3. Promote Pi/demo helpers only when a second host consumes them (**recommended**) vs build a general
   kit first? Promotion is a mechanical import change; speculative API is not.
4. Host adapter seams for senses/widgets (**recommended**) vs library implementations? The library
   declares capability; hosts own hardware and defaults.
5. Keep immersive modes non-default until the study publishes (**recommended**), or promote earlier?
   The stop rule governs the product claim.

**Settled and not reopened:** freeform zero-g default; lanes/grid/tree opt-in; one position authority;
contract + registry over branches; host owns policy; legibility gates spectacle.

---

## 6. Risks

| Risk | Mitigation |
| ---- | ---------- |
| Flagship work becomes a one-off | Phase B forces reuse across four domains; Phase F promotes only reused pieces |
| Two solvers fight during play | Borrowed set + one authority + reconcile at rest; e2e asserts both states |
| Physics inert under on-demand rendering | Play session drives frames while active, sleeps at rest; HUD shows energy |
| Vision loop mutates layout silently | Explicit host toggle, `reportUnsupported`, recorded strategy and score provenance |
| Silent no-op verbs | `reportUnsupported` for unregistered verbs; evidence asserts verbs animate |
| Domain wrapper leaks host/provider types | Six-slot recipe, `defineDomain`, conformance, `verify` guard |
| Feature museum / unproven claim | Evidence-only gallery, guided replay, limitations list, published result including negative |
| Long arc stalls after Phase A | Each phase has a demonstrable artifact and its own gate; no phase depends on external credentials |
| Stale links and counts | Registry regeneration plus the cheap doc fixes in Phase B |

---

## 7. Vision coverage

| `POSSIBILITIES.md` section | Landed by |
| -------------------------- | --------- |
| 1. Rectangle ladder | Phase A (zoomable card ladder), Phase F (pure rung helper) |
| 2. Physics as meaning | Phase A (Playground), Phase F (`PhysicsPlaySession`) |
| 3. Cinematics as cognition | Phase A (`trace`), Phase F (camera handlers) |
| 4. Domains as workspaces | Phase B (filesystem, data + recipe note); remaining domains via scaffold |
| 5. Compositional worlds | Phase B (four domains), Phase C (cross-domain trace, diff) |
| 6. Shareable scenes | Phase A (permalink), Phase C (annotations, report) |
| 7. Self-verifying interfaces | Phase D (runtime loop), Phase F (promotion if reused) |
| 8. Host-registered senses | Phase E (adapter seam, widget mounting) |
| 9. Product forms | Phase E (Graph IDE + observatory); others host work via scaffold |
| 10. Horizons | This document's phases + Phase G research gate |
| 11. Boundaries | Guardrails in the introduction and gates in §4 |

---

## 8. Ledger

### Landed (Phase A)

- Renderer bridge declares `emphasis`/`widgetSlots`; emphasized edges widen. Tests: `bun test` in
  `packages/spacegraph-renderer` (22 pass) + typecheck.
- Flagship: `app/pi/src/play.ts`, `permalink.ts`, `trace.ts`; representation ladder in `adapter.ts`;
  honest vision strategy in `host.ts`/`engine.ts`/`src/vision/assert.ts`; guided replay and Playground
  controls in `host.ts`/`index.html`; one-authority note in both pages.
- Evidence: `pnpm --filter pi test` 32, `test:e2e` 23, `verify:visual` 12, `verify`, `scale`, `build`,
  `app/pi tsc --noEmit`, root `pnpm test` 761 — all green. Budgets measured in §4.

### Next move (Phase B)

Start with `@spacegraphjs/filesystem`: six slots, fixture, `adapterConformance`, README, no provider
or host import — then `@spacegraphjs/data`, then compose all four domains in
`app/demo/html/layout/compositional-wrappers.html`. See §3 Phase B for the full checklist.

### Deferred inside Phase A (do before closing the flagship)

1. Scope-portal glyph identity and portal zoom/breadcrumb navigation (`adapter.ts`/`host.ts`).
2. Bind `Trail`/minimap from `src/navigation` into the Pi rail (pure helpers, no API).

### Remaining phases

B–F are unstarted; each has its own gate in §4 and must stay green before the next starts. Phase G
depends on participants and credentials; no result, release or deployment may be fabricated.
Baseline TODO1 evidence is in `TODO1.md:383-395`.
