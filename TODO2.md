# TODO2 — From flagship to the full spatial-software vision (plan)

**Status:** Phases A–E are implemented and verified. Both flagship follow-ups deferred from Phase A
are landed, as are the unblocked Phase F items. The three Phase F promotions that had a real second
consumer are now landed: `representationRung` → `src/salience`, `createPhysicsPlaySession` →
`src/world`, and `createCameraMotionHandlers` (+ the pure point interpolation) → `src/motion`. The
second consumer is `app/demo/second-host.ts`, a working host whose behavior and tests are in the
repo; Pi imports the same helpers and its behavior is unchanged (38 unit, 28 e2e green). Parity
coverage landed in `test/boundaries.test.ts`. Two Phase F items remain genuinely gated: renderer
contract descriptors need a second renderer to advertise them, and `RenderModelPatch` consumption
needs a budget-crossing measurement. `createVisionLoop` was already a library helper (Phase D).
Phase G's `docs/not-decided.md` note is landed; its study and release need participants and
credentials and cannot be fabricated. TODO1's engineering is complete (`TODO1.md:383-395`).
**Date:** 2026-11-20. Current progress is in the dashboard below; the exact next move and unblock
contract are in §8 (Ledger).

## Progress dashboard

Every gate was re-run on 2026-11-20; results are in §8 "Verification log". A phase is either landed
or blocked on a condition this repository cannot create without participants, credentials, a second
renderer or a budget-crossing measurement.

| Phase              | State       | Evidence                                                          | Outstanding                              |
| ------------------ | ----------- | ----------------------------------------------------------------- | ---------------------------------------- |
| A — flagship       | Landed      | pi test 38, e2e 28, visual 12, `verify`, `scale`, build           | none                                     |
| A — follow-ups     | Landed      | portal glyph/breadcrumb, Trail/minimap, 2 extra e2e               | none                                     |
| B — domains        | Landed      | filesystem + data, four-domain composition, root test 761         | none                                     |
| C — worlds/scenes  | Landed      | compositional (2), graph diff (1), flagship (1), report/notes (2) | none                                     |
| D — vision loop    | Landed      | `vision-loop.test.ts` (4), visual 14, root test 776               | none                                     |
| E — senses/forms   | Landed      | `world.test.ts` (6), Graph IDE, root test 782                     | none                                     |
| F — unblocked      | Landed      | `force-core.test.ts` (2), `docs/scopes.md`, root test 786         | none                                     |
| F — promotions     | **Partial** | 3 helpers promoted; second host + parity tests, root test 793     | renderer descriptors, `RenderModelPatch` |
| G — proof/delivery | **Partial** | `docs/not-decided.md` settled section                             | study n ≥ 5, npm release credentials     |

**Destination.** The full design space is mapped in [`docs/POSSIBILITIES.md`](docs/POSSIBILITIES.md).
This plan turns it into a sequence: first a runnable flagship (Phase A), then domain generality (B),
then compositional worlds and shareable scenes (C), a runtime self-verifying loop (D), host senses
and product forms (E), library consolidation (F), and proof/delivery (G). Phase A is the
fast path already agreed; B–G are the expansion needed to ultimately achieve the vision. Each phase is
independently demonstrable and keeps all gates green before the next starts.

**Efficiency rule.** Ship the flagship slice with _zero new library API_. Prove generality with two
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

| Need                | Present                                                                                                                                | Gap → first move                                                                                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Recursion           | `ScopeSpec → buildScopeTree → layoutScopes → ScopeSimulation`; path-qualified ids, portals, cross-scope edges (`src/layout/scope*.ts`) | None for the flagship. Keep the solver untouched.                                                                                                                  |
| Physics play        | Working Play/Reconcile in `app/pi/src/engine.ts:43-56` with `PhysicsPlugin({gravity:0})`                                               | Only on a side page. Extract to `app/pi/src/play.ts` and mount in the flagship; reuse the code.                                                                    |
| Motion              | Pure `MotionDirector` + `CameraVerbRegistry`, host-bound `flyTo` (`app/pi/src/host.ts:534-543`)                                        | `trace` is a no-op (`:544`). Implement it in Pi; promote later.                                                                                                    |
| Aesthetic channels  | Salience→emphasis, widgets, depth continuum; `RenderNode.html` accepts host markup (`packages/renderer/src/index.ts:74-93`)            | Bridge under-reports `emphasis`/`widgetSlots` (`spacegraph-renderer/src/index.ts:22-34`). Two-line fix + test. No core node class is needed for a live instrument. |
| Zoomable rectangles | Scope portals recurse; zoom swaps card budgets 12/40/24                                                                                | Card content is static at every rung (`app/pi/src/adapter.ts:53-59`). Make representation a function of `(node, zoom, activity, vision)`.                          |
| Vision              | Four analyzers, `createVisionAssert`, capture matrix, honest strategy, opt-in `createVisionLoop` (`src/vision/vision-loop.ts`)         | None for Phase D. A second host may consume the loop; Phase F promotes it only on reuse.                                                                           |
| Shareability        | `#graph:<id>` reveal anchor (`host.ts:287`)                                                                                            | No viewport/surface state, diffs or annotations. Full-state hash → graph diffs → annotated review.                                                                 |
| Domains             | Four wrappers: `agent`, `workflow`, `filesystem`, `data`; scaffold for the rest                                                        | None of the recipe. Remaining domains in `POSSIBILITIES.md` are host work through the scaffold.                                                                    |
| Composition         | Four isolated canvases with three `InterGraphEdge` links (`app/demo/html/layout/compositional-wrappers.html`)                          | No cross-canvas trace, two-run diff or shared review scene (Phase C).                                                                                              |
| Senses / widgets    | `SCENE_FEATURES`, `SENSORY_SEAMS`, `WidgetLayer`, host registry + console demo adapter (`src/world/world.ts`, `app/demo`)              | None for Phase E. Renderer-level scene descriptors are Phase F work; no input defaults.                                                                            |
| Library kit         | Mechanisms are host-assembled                                                                                                          | Promote only reused helpers; no speculative contract fields.                                                                                                       |

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
- [x] Scope-portal glyph identity and portal zoom/breadcrumb navigation: `portalGlyph` gives each
      child scope a stable glyph carried at every rung with a `data-portal` identity; `portalChain`
      walks parent links root-first; the rail renders a clickable breadcrumb that reveals a parent
      scope's portal node. Units in `adapter.test.ts` / `scopes.test.ts`, e2e in `browser.spec.ts`.
- [x] Guided replay from existing evidence: `walkthrough()` = five questions × three surfaces;
      `replay()` runs the question capabilities and flies the trace across changed artifacts. Wired to
      the rail.
- [x] Bind `Trail` and `Navigation.project` from `src/navigation` into the rail: back/forward plus a
      clickable history list, and an SVG minimap that projects `#positions` and draws the viewport
      rectangle. Back/forward/history and minimap dots are asserted in `browser.spec.ts`.
- [x] Extend `app/pi/tests/vision.spec.ts` with play, trace, permalink, rung and replay states; add
      play-session and permalink frame budgets to `app/pi/scripts/scale.ts`. Also hardened a
      feed-timing race in `browser.spec.ts` and fixed a pre-existing `Frame.taskID` type error in
      `study-page.ts` that blocked the `tsc` gate.

**Gate:** `pnpm --filter pi test` (38), `test:e2e` (28, including the two follow-ups), `verify:visual`
(12), `verify`, `scale`, `build`, package `tsc --noEmit`; root `pnpm test` (786) — all green. The
flagship is complete; the two follow-ups above closed the last Phase A items.

### Phase B — Domain generality (no library changes) — DONE

Two domains prove the recipe once; two visibly different additions make it general.

- [x] Add `@spacegraphjs/filesystem` (commit / file / symbol / change / artifact): selectors for
      "what produced this change" (`changeProducers`, `changeOrigins`) and "which symbols depend on
      it" (`symbolDependents`/`symbolDependencies`); six slots, fixture, `adapterConformance`, README;
      no provider or host import.
- [x] Add `@spacegraphjs/data` (pipeline / dataset / step / run / model / metric): `lineage` and
      derived `regressions` selectors; six slots, fixture, conformance, README.
- [x] Compose **four** domains (agent + workflow + filesystem + data) in one workspace with three
      `InterGraphEdge` overlays and isolated models, extending
      `app/demo/html/layout/compositional-wrappers.html` and its Playwright spec. Probe now exposes
      `domains`, `nodes`, `links` and `endpoints`.
- [x] Add the **domain aesthetic/ergonomics profile** to `docs/semantic-wrappers.md` §5: wrapper
      contributes vocabulary + selectors; host owns levels, geometry, budgets, theme and play policy.
      The scaffold emits the same profile and its `verify:visual` vision gate. This is the mechanism
      that makes the remaining domains in `POSSIBILITIES.md` host work, not scheduled work.
- [x] Add per-domain evidence entries to `app/demo/src/gallery.ts` (four entries; `EXPECTED_MODULES`
      extended in `app/demo/tests/host.test.ts`); run `pnpm run generate:registry` (registry unchanged:
      3 hosts / 38 pages / 45 modules). Fix the dead `gallery.html` links in `showcase.html`/`learn.html`
      (now `#capabilities`), `app/demo/README.md`, and the stale `docs/performance.md` commands.

**Gate (green):** each new domain `bun test` (19), `typecheck`, `build`; `pnpm --filter demo test`
(10) and `build`; compositional Playwright (1); root `pnpm test` (761); `pnpm --filter pi verify`;
`pnpm run generate:registry`. No library API was added.

### Phase C — Compositional worlds and shareable scenes — DONE

- [x] Add a **cross-domain `trace`** in `app/demo`: `app/demo/src/cross-trace.ts` walks the three
      `InterGraphEdge` links (with same-scope peers inside a domain) backward from the data metric.
      The compositional page has a Trace button; each step focuses a node and moves that canvas's
      camera. Playwright asserts path order, camera movement, overlay count and model isolation.
- [x] Add a **graph diff** between two kernel snapshots: `app/demo/src/graph-diff-view.ts` derives
      added/removed/changed nodes and edges from `GraphHistory` captures via `diffKernels`;
      `app/demo/html/layout/graph-diff.html` shows both runs and recomputes the diff from the same
      snapshots. **Correction to the original wording:** `@spacegraphjs/diff` only types code-patch
      sources and diff tones; it does not diff graphs. The real graph differ is `diffKernels` in
      `packages/kernel/src/diff.ts`, so that is the dependency the view uses.
- [x] Add **annotations** on `RenderNode.data` through the widget layer: `app/pi/src/annotations.ts`
      stores reviewer notes, pins them on rendered nodes and mounts them with `WidgetLayer`;
      `PermalinkState.annotations` round-trips them. Notes appear in the shareable report.
- [x] Produce a shareable report from `exportJSON`/`exportSVG`/`exportHTML` plus the permalink:
      `app/pi/src/report.ts` builds one escaped, self-contained HTML audit file with geometry,
      exports, notes and a replay link; the Pi rail downloads it.
- [x] Add zoom-ladder and multi-domain sections to `app/demo/flagship.html`; recapture both flagship
      screenshots and the clip with `pnpm --filter demo video:flagship`; assert with
      `tests/flagship-page.spec.ts` and the new compositional/graph-diff specs.

**Gate (green):** compositional (2), graph-diff (1) and flagship (1) Playwright specs plus all 18
demo e2e tests; `pnpm --filter demo test` (16), `pnpm --filter demo build`, root 39-page demo-error
check, root `pnpm test` (771); media recaptured. No page errors.

### Phase D — Runtime self-verifying loop — DONE

- [x] Extend `scopePolicy` inputs with `hierarchy` and `ergonomics` scores
      (`src/layout/scope-policy.ts`); keep the module vision-type-free. Hierarchy widens `depthStep`,
      ergonomics joins legibility in `nodePadding`, and absence keeps the old layout unchanged.
- [x] Add an opt-in host helper `createVisionLoop(analyzers, policy)` under `src/vision/`
      (`vision-loop.ts`): analyze → map to `scopePolicy` scores → host applies policy → measure again.
      Exposes `strategy`, `lastReport`, `reportUnsupported` and `retargeted`. The loop owns no state
      and never mutates layout; all mutation is in the host callback.
- [x] Wire the loop into `app/pi/src/host.ts` behind `setVisionLoop` / the rail toggle / `?visionLoop=on`.
      The rail shows overlap, legibility, hierarchy, ergonomics and the retargeted score list; the
      capability gallery reports the active strategy. Analyzers use the gate's strategy through the
      pure `visionSystem.analyze` path, so no autonomous fixer runs during a cycle.
- [x] Keep `createVisionAssert` as the test gate; `record()` compares the gate report with the loop's
      latest report and records an explicit note when they differ (the gate's `analyzeVision` runs the
      library fixer; the loop analyzes without mutating). Deterministic unit fixture added.

**Gate (green):** `test/vision-loop.test.ts` (4) + extended `test/layout/scope-policy.test.ts`;
`verify:visual` (14, including toggle and opt-in URL scenes); `pnpm --filter pi test:e2e` (27);
`pnpm test` (776); `pnpm --filter pi verify`, `test`, `build`, `scale`, package `tsc --noEmit`.

### Phase E — Host senses and product forms — DONE

- [x] Add a host **adapter registration seam** in `src/world/world.ts`: `registerSensory(adapter)`
      records a host-owned `SensoryAdapter` and returns a disposer; `sensoryAdapter(seam)` looks it up
      and `supportsSensory` consults the registry. No implementation ships in the library; WebXR/sound/
      haptics stay off by default. `enabledSceneFeatures` filters declared features through
      `supportsSceneFeature`.
- [x] Add a console-only demo adapter (`app/demo/src/console-sensory.ts`) registered on the Graph IDE
      page to prove registration, emission and gating. `docs/world.md` states that the host owns the
      device and no headset is assumed; `docs/semantic-wrappers.md` lists the two gates. The flagship
      now reports a seam as unsupported only while no adapter is registered.
- [x] Gate scene features through the `WorldCapabilities` descriptors: the Graph IDE enables only
      `supportsSceneFeature`-approved treatments and the gallery reports the gated set. Renderer-level
      `sceneFeatures` descriptors remain Phase F work — the flagship has no fog/lights implementation,
      so nothing is fabricated there.
- [x] Build the **Graph IDE** reference host in the demo (filesystem domain + live file/diff panels in
      rectangles, probe and Playwright spec). The **session observatory** is the flagship, already
      built. War room, learning atlas, research notebook and GraphOS are achievable host work through
      the same recipe, recorded here as not scheduled.
- [x] No host needs gamepad/gesture input yet; `InputManager`/`Fingering` stay the only route and the
      library has no input defaults.

**Gate (green):** `test/world.test.ts` (6), `app/demo/tests/console-sensory.test.ts` and
`graph-ide.test.ts` (4), `pnpm --filter pi test` (36 incl. dynamic unsupported seams), demo e2e (19
incl. Graph IDE), demo-error check (40 pages), `pnpm test` (782), both builds, Pi `verify`/`verify:visual`
and package `tsc --noEmit`.

### Phase F — Library consolidation (pull, not push)

Promotions are pull-only (Decision 3 in §5). Three helpers now have a real second consumer
(`app/demo/second-host.ts`) and are promoted; the remaining items stay gated on a renderer or a
measurement. `sweep` was never implemented by Pi, so only `flyTo`/`trace` were promoted.

**Landed (unblocked):**

- [x] Fix `ForceCore.initializePositions` (`src/layout/force-core.ts`) to assign plain `x`/`y`/`z`
      instead of calling `Vector3.set`, so the declared `{ position: { x, y, z } }` seam holds. Focused
      test: `test/layout/force-core.test.ts` (deterministic seed, `previous` restore, no `set` method).
- [x] Document the two layout vocabularies (`ScopeStrategy` vs `LaneLayoutStrategy`) and their
      subpath-only exports in `docs/scopes.md`.

**Landed (pulled by the second host):**

- [x] `src/motion/camera-handlers.ts`: `createCameraMotionHandlers(director, adapter)` registers
      `flyTo`/`trace`, interpolates camera points (`interpolatePoint`, `pointOnTrace`) and reports every
      other verb through `reportUnsupported`. Pi imports it; `app/demo/second-host.ts` drives real
      camera moves and asserts them in `app/demo/tests/second-host.test.ts`. Hosts keep viewport state
      and the trace polyline; the library owns only interpolation.
- [x] `src/world/PhysicsPlaySession.ts`: one-authority play/reconcile with the proven presets and
      lifecycle. Pi imports it (`app/pi/src/play.ts` removed); the second host asserts energy, settings
      and restore after reconcile. The one-authority rule stays in `docs/world.md`.
- [x] `src/salience/representation.ts`: pure `representationRung({ level, activity, legibility })`;
      hosts still own the HTML. Pi and the second host both compute rungs with it.
- [x] `createVisionLoop` — already a library helper since Phase D; the second host now adopts it and
      asserts its unsupported report and cycle scores.
- [x] Parity coverage in `test/boundaries.test.ts`: one library definition and two host callers for
      each promoted helper, and no local redefinition inside `app/pi`.
- Evidence: root `pnpm test` (793), `pnpm --filter demo test` (24), `pnpm --filter pi test` (38),
  `test:e2e` (28), both builds, package `tsc --noEmit` — green. Pi behavior is unchanged.

**Pending (genuinely gated — see §8 "Unblock contract"):**

- [ ] Add contract descriptors **only for gated capabilities a second renderer must advertise**
      (`motionVerbs`, `sceneFeatures`, `sensorySeams` beside `supports/supportsDepth/supportsEmphasis`);
      leave scope/physics fields out until a renderer implements them. No behavior in the zero-dep contract.
      **Unblock:** a second renderer package advertises the descriptor in `RendererCapabilities` and a
      test asserts a host gate reads it. None of the renderer packages declares these today.
- [ ] Add incremental `RenderModelPatch` consumption in the flagship/demo only if measurement shows
      streamed updates still rebuild the full model. Measured model build is 2–4 ms for 300 messages /
      ~1.2k nodes against a 50 ms budget, so there is no present need. **Unblock:** a `scale` run
      shows a rebuild exceeding the 50 ms budget; re-measure before adding anything.

**Gate:** root `pnpm test` (793), `pnpm --filter demo test` (24), `pnpm --filter pi verify`,
`pnpm --filter pi test:e2e` (28), `pnpm --filter pi build`, `pnpm --filter demo build`, package
`tsc --noEmit` — green. Pi's behavior is unchanged — only its imports moved. `scale` passes in
isolation (~1.28–1.49 s against the 1.5 s 60-turn budget) but exceeds it under concurrent load
(up to ~3.1 s); run it alone. Root `tsc` reports pre-existing test-only errors; the package
`tsc --noEmit` gate is the source of truth here.

### Phase G — Proof and delivery (two external items, one landed)

- [ ] Run the five-task study (`docs/pi-study.md`, `app/pi/src/study.ts`): n ≥ 5 counterbalanced,
      commit raw exports, publish the verbatim result (negative included), apply the stop rule and
      record TODO1 decision 4. **Participants required; do not fabricate a result.**
- [ ] Publish the npm release (`pnpm run test:publish` → `pnpm run build` → existing workflow, no
      Changesets) and host the dedicated flagship URL; update the README "The demo" link.
      **Credentials required.**
- [x] Update `docs/not-decided.md` with what graduated; keep honest study status and report-only
      sensory seams. Done: a "Settled by the flagship work (2026-11-20)" section records the guardrails
      that graduated to host policy; all numbered questions and the `n >= 5` study stay open, with no
      claimed result and no immersive default.

### Explicitly not now

Sound/haptics/WebXR implementations and gamepad as library defaults; post-processing, DOF and
production 3D geometry; cross-session graphs; a full five-layout comparative study; a general
game-engine API; additional domains beyond the four until a host needs them; the missing
`SPACEGRAPH.TODO.41.md` note (one-line deferred item, no phase).

---

## 4. Verification — one gate list

| Check                | Command / rule                                                                                                                                                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Flagship             | `pnpm --filter pi test` (38), `test:e2e` (28), `verify:visual` (12), `verify`, `scale`, `build`, package `tsc --noEmit` — green incl. portal glyph/breadcrumb and Trail/minimap                                                                 |
| Vision on new states | `verify:visual` asserts overlap, legibility, hierarchy, ergonomics and layout score on settled, playing, trace, zoom-ladder rungs and reduced-motion scenes; strategy recorded per capture                                                      |
| Domains              | `bun test` + `typecheck` + `build` in each of the four `packages/domain/*`; conformance included — Phase B green                                                                                                                                |
| Composition + scenes | **Phase C green:** compositional trace (2), graph diff (1), flagship (1) specs; Pi annotation/report specs (2); `pnpm --filter demo build`, demo-error check (39), `video:flagship` recaptured                                                  |
| Runtime loop         | **Phase D green:** `test/vision-loop.test.ts` deterministic fixture; `createVisionAssert.record()` records gate/loop agreement or the explicit fixer-path note; `verify:visual` (14) covers toggle and `?visionLoop=on`                         |
| Adapter seams        | **Phase E green:** `test/world.test.ts` (6) + demo adapter spec/unit; Graph IDE page spec; no library implementation; `docs/world.md` and `docs/semantic-wrappers.md` updated; demo-error check (40)                                            |
| Boundaries           | root `pnpm test` (`test/boundaries.test.ts`) + `pnpm --filter pi verify` after every phase                                                                                                                                                      |
| Library kit          | **Phase F green:** `force-core.test.ts` (2), `docs/scopes.md`, three promoted helpers with a second host (`app/demo/second-host.ts`), `second-host.test.ts` (4), `boundaries.test.ts` parity (3); descriptors and `RenderModelPatch` stay gated |
| Study protocol       | `pnpm --filter pi test` — matrix, Latin square, recorder, negative reporting; participant run external                                                                                                                                          |
| Full repo            | `pnpm test` from root; no `pnpm run check` script exists here (use package `tsc --noEmit`)                                                                                                                                                      |

Budgets (measure, then tighten; inherited from `TODO1.md:304-315`):

| Metric                                | Budget                        | Prior measured                     |
| ------------------------------------- | ----------------------------- | ---------------------------------- |
| Model build, 300 msg / ~1.2k nodes    | < 50 ms                       | ~27 ms                             |
| Full pipeline, 5,001 msg / ~20k nodes | < 400 ms                      | 160–230 ms                         |
| Force layout, 60-turn window          | < 1.5 s                       | ~1.0–1.2 s (1.28–1.49 s idle here) |
| Lazy 3D chunk gzip                    | < 400 KB                      | 282 KB incl. `three`               |
| Play session, ≤ 120 borrowed bodies   | < 8 ms/frame; settles ≤ 5 s   | 0.83 ms/frame, settles — Phase A   |
| Permalink encode/decode               | < 2 ms; round-trip stable     | 0.005 ms — Phase A                 |
| Vision loop, one analyze→policy cycle | < 16 ms on the 60-turn window | 1.36 ms — Phase D (`scale`)        |

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

| Risk                                     | Mitigation                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Flagship work becomes a one-off          | Phase B forces reuse across four domains; Phase F promotes only reused pieces                     |
| Two solvers fight during play            | Borrowed set + one authority + reconcile at rest; e2e asserts both states                         |
| Physics inert under on-demand rendering  | Play session drives frames while active, sleeps at rest; HUD shows energy                         |
| Vision loop mutates layout silently      | Explicit host toggle, `reportUnsupported`, recorded strategy and score provenance                 |
| Silent no-op verbs                       | `reportUnsupported` for unregistered verbs; evidence asserts verbs animate                        |
| Domain wrapper leaks host/provider types | Six-slot recipe, `defineDomain`, conformance, `verify` guard                                      |
| Feature museum / unproven claim          | Evidence-only gallery, guided replay, limitations list, published result including negative       |
| Long arc stalls after Phase A            | Each phase has a demonstrable artifact and its own gate; no phase depends on external credentials |
| Stale links and counts                   | Registry regeneration plus the cheap doc fixes in Phase B                                         |

---

## 7. Vision coverage

| `POSSIBILITIES.md` section   | Landed by                                                                                             |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1. Rectangle ladder          | **Landed — Phases A+F** (card ladder + stable portal glyph/breadcrumb; `representationRung` promoted) |
| 2. Physics as meaning        | **Landed — Phases A+F** (Playground + `ForceCore` seam fix; `PhysicsPlaySession` promoted)            |
| 3. Cinematics as cognition   | **Landed — Phases A+F** (`trace` + Trail/minimap; camera handlers promoted)                           |
| 4. Domains as workspaces     | **Landed — Phase B** (filesystem + data + profile); remaining domains via scaffold                    |
| 5. Compositional worlds      | **Landed — Phases B+C** (four isolated domains, three links, cross-canvas trace, history diff)        |
| 6. Shareable scenes          | **Landed — Phases A+C** (full-state permalink, notes on node data, audit report)                      |
| 7. Self-verifying interfaces | **Landed — Phase D** (opt-in runtime loop, gate agreement record); Phase F promotes only on reuse     |
| 8. Host-registered senses    | **Landed — Phase E** (registry seam, gating, console demo adapter; widget mounting unchanged)         |
| 9. Product forms             | **Landed — Phase E** (Graph IDE demo host + flagship observatory); others host work via scaffold      |
| 10. Horizons                 | This document's phases + Phase G research gate                                                        |
| 11. Boundaries               | Guardrails in the introduction and gates in §4                                                        |

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

### Landed (Phase A follow-ups)

- `app/pi/src/adapter.ts`: `portalGlyph(scope)` maps a child scope to a stable glyph shown at every
  rung alongside a `data-portal` identity; portal nodes keep the same glyph across rebuilds.
- `app/pi/src/scopes.ts`: `portalChain(scope, specs)` returns the root-first parent chain with a cycle
  guard. `app/pi/src/host.ts` renders it as a clickable rail breadcrumb: each crumb reveals that
  scope's portal node (or the scope's first node for the root).
- `app/pi/src/host.ts` / `index.html`: `Trail` tracks revealed nodes with back/forward plus a
  clickable history list, reconciled against the view on refresh; `Navigation.project` projects
  `#positions` into an SVG minimap with a viewport rectangle, throttled to 5 Hz. Clicking a dot
  reveals its node. Both use pure core helpers — no library API change.
- Evidence: `pnpm --filter pi test` 38, `test:e2e` 28 (new trail/portal/minimap spec), `verify:visual`
  (12), `verify`, `build`, package `tsc --noEmit`, root `pnpm test` 786 — all green. `scale` passes
  (~1.28–1.49 s for the 60-turn window in isolation; exceeds budget under concurrent load).

### Landed (Phase B)

- `packages/domain/filesystem` and `packages/domain/data`: six slots each, fixture, adapter,
  `adapterConformance`, README, no provider or host import. 19 tests each.
- `app/demo/html/layout/compositional-wrappers.html`: four isolated renderers, three `InterGraphEdge`
  links (agent→workflow→filesystem→data), page probe and Playwright spec updated.
- `docs/semantic-wrappers.md` §5 domain profile; `packages/create-spacegraph/domain.js` emits the
  same profile alongside its existing `verify:visual` gate.
- `app/demo/src/gallery.ts` four evidence entries; `vitest.config.ts` domain source aliases;
  `app/demo/vite.config.ts` aliases; demo package deps. Registry regenerated (unchanged).
- Dead `gallery.html` links redirected to `learn.html#capabilities`; `docs/performance.md` benchmark
  commands point at `pnpm --filter pi scale`.
- Evidence: new domains 19/19 tests each + typecheck + build; demo 10 tests; compositional spec 1;
  root `pnpm test` 761; `pnpm --filter demo build`; `pnpm --filter pi verify` passed.

### Landed (Phase C)

- `app/demo/src/cross-trace.ts`: pure link walk with same-scope peer bridging. The compositional page
  traces backward from `data:p1:auc` through the three `InterGraphEdge` links, focuses each canvas and
  moves its camera while the probe still reports `isolated: true`. Spec: 2 Playwright tests.
- `app/demo/src/graph-diff-view.ts` + `app/demo/html/layout/graph-diff.html`: two-run view from
  `GraphHistory` + `diffKernels`, recomputed from the same snapshots so the diff cannot drift from
  history. `@spacegraphjs/diff` is a code-patch/tone package, not a graph differ (§3 Phase C).
  Spec: 1 Playwright test; 3 unit tests.
- `app/pi/src/annotations.ts`: `NoteStore`, notes on `RenderNode.data`, a `WidgetLayer`-mounted rail
  widget, and optional `PermalinkState.annotations`. `app/pi/src/report.ts` bundles permalink,
  exports and notes into one escaped standalone HTML report; the rail downloads it.
- `app/demo/flagship.html`: zoom-ladder and multi-domain sections with links to the new pages;
  `flagship-page.spec.ts` asserts both. Screenshots and the 72-frame clip recaptured with
  `pnpm --filter demo video:flagship`.
- Evidence: root `pnpm test` 771; `pnpm --filter demo test` 16; `pnpm --filter pi test` 36; demo e2e
  18; Pi e2e 25; `verify:visual` 12; `verify`, `scale`, `tsc`, both builds, registry regeneration
  (3 hosts / 39 pages / 45 modules), demo-error check 39 — all green.

### Landed (Phase D)

- `src/layout/scope-policy.ts`: `ScopeVisionSignal` gains `hierarchy` and `ergonomics`; hierarchy →
  `depthStep`, ergonomics + legibility → `nodePadding`, overlap → `gap`. Absent scores preserve the
  previous layout exactly; the module still imports no vision types.
- `src/vision/vision-loop.ts` (+ `src/vision/index.ts`): `createVisionLoop(analyzers, policy)` maps a
  `VisionReport` to four normalized scores, calls the host policy, measures again and records
  `{ before, after, scores, retargeted }`. It owns no state, exposes `strategy` / `lastReport` /
  `reportUnsupported`, and returns `undefined` without calling policy when no analyzers exist.
- `app/pi/src/host.ts` / `index.html` / `capabilities.ts`: rail toggle, `setVisionLoop`, `?visionLoop=on`,
  HUD lines for all four scores plus retargeted list, gallery strategy. Analyzers call the gate's
  strategy via pure `visionSystem.analyze`; no autonomous fixer runs during a cycle.
- `src/vision/assert.ts`: `record()` returns a capture record with gate summary, latest loop summary
  and either agreement or an explicit note that `analyzeVision` runs the fixer while the loop does not.
- Evidence: `test/vision-loop.test.ts` (4) + `test/layout/scope-policy.test.ts` (6); root `pnpm test`
  776; `pnpm --filter pi test` 36, `test:e2e` 27, `verify:visual` 14, `verify`, `build`, `scale`
  (vision loop 1.36 ms/cycle against the 16 ms budget), package `tsc --noEmit` — all green.

### Landed (Phase E)

- `src/world/world.ts` / `src/world/index.ts`: `SensoryAdapter` (id/label/emit), module registry with
  `registerSensory` disposer and `sensoryAdapter` lookup, `supportsSensory` gating (`none` stays true),
  and `enabledSceneFeatures` filtered through `supportsSceneFeature`. No library ships a device.
- `app/demo/src/console-sensory.ts`: host-owned console sink; `app/demo/html/layout/graph-ide.html`
  registers it on demand, gates scene-feature treatments and exposes `__graphIde` (files, changes,
  dependencies, features, sensory support, events). The Graph IDE uses the filesystem domain's
  fixture, adapter and selectors; file/diff panels are plain rectangles. Registered in the demo
  registry (3 hosts / 40 pages / 45 modules) and linked from the demo index and learn pages.
- `app/pi/src/policy.ts` / `host.ts` / `capabilities.ts`: `unsupportedSeams()` filters out registered
  seams instead of reporting every seam unsupported forever; the gallery and probe use it.
- `docs/world.md` and `docs/semantic-wrappers.md` updated: registration, disposer, gating and the
  console-only demo; no headset assumed, no input defaults.
- Evidence: `test/world.test.ts` (6), demo unit 20 (console + graph IDE), demo e2e 19 (Graph IDE),
  demo-error check 40, root `pnpm test` 782, Pi `test` 36 / `test:e2e` 27 / `verify:visual` 14 /
  `verify`, both builds, package `tsc --noEmit` — all green.

### Landed (Phase F — unblocked)

- `src/layout/force-core.ts`: `initializePositions` randomizes with plain `x`/`y`/`z` assignments,
  honoring its declared `{ position: { x, y, z } }` seam instead of requiring `Vector3.set`.
- `test/layout/force-core.test.ts` (2): plain-object randomization, determinism for a fixed seed and
  restoration from `previous`.
- `docs/scopes.md`: `ScopeStrategy` vs `LaneLayoutStrategy` and the `spacegraphjs/layout` subpath-only
  export rule.
- Evidence: root `pnpm test` 786, `pnpm --filter pi verify`, `pnpm --filter pi build`, package
  `tsc --noEmit` — green. No promotion, so Pi behavior is unchanged.

### Landed (Phase F — promotions)

- `src/motion/camera-handlers.ts`: `createCameraMotionHandlers` registers `flyTo`/`trace` on a host
  `MotionDirector`, interpolates camera points and reports every other verb as unsupported.
  `interpolatePoint`/`pointOnTrace` are pure. `app/pi/src/host.ts` and `app/demo/second-host.ts` both
  register it; hosts keep viewport state, flight target and trace polyline.
- `src/world/PhysicsPlaySession.ts`: one-authority play/reconcile with `PLAY_PRESETS`, promoted from
  `app/pi/src/play.ts` (now removed). Both hosts drive it; `docs/world.md` keeps the authority rule.
- `src/salience/representation.ts`: pure `representationRung({ level, activity, legibility })`,
  promoted from `app/pi/src/adapter.ts`. Both hosts compute rungs with it; hosts still own the HTML.
- Second consumer: `app/demo/second-host.ts` drives real camera moves, play/reconcile, rung selection
  and the vision loop; `app/demo/tests/second-host.test.ts` (4) asserts each path. No token import.
- Parity: `test/boundaries.test.ts` (3) asserts one library definition, two host callers and no local
  redefinition in `app/pi`.
- Evidence: root `pnpm test` 793, demo test 24, Pi test 38 / e2e 28 / `verify`, lib/Pi/demo builds,
  package `tsc --noEmit` — green. Pi behavior unchanged (only import specifiers moved).

### Landed (Phase G — documentation)

- `docs/not-decided.md`: a "Settled by the flagship work (2026-11-20)" section records the guardrails
  that graduated to host policy (freeform zero-g default, one position authority, `supports(...)`
  gating, host-owned policy, legibility gates spectacle, report-only sensory seams). The numbered
  questions, the `n >= 5` study and immersive defaults stay open; no result is claimed.
- The two genuinely external Phase G items (study participants, npm release credentials) are not
  fabricated and remain in §3.

### Next move (Phase F)

The pull gate was satisfied for the three helpers that had a real second consumer, and they are
promoted (ledger entry below). `app/demo/second-host.ts` is that consumer: it drives camera verbs,
play/reconcile, a legibility-gated rung and the vision loop through the library helpers, and
`app/demo/tests/second-host.test.ts` asserts each path. Pi imports the same helpers; its 38 unit and
28 e2e results are unchanged. `test/boundaries.test.ts` asserts one library definition and two host
callers per helper, with no local redefinition inside `app/pi`.

What remains is gated on conditions this repository cannot create on its own, in this order:

1. Renderer contract descriptors (`motionVerbs`, `sceneFeatures`, `sensorySeams`) beside
   `supports`/`supportsDepth`/`supportsEmphasis` — only when a second renderer advertises one and a
   test reads the gate. The zero-dependency contract stays behavior-free; scope/physics fields wait
   for an implementing renderer.
2. Incremental `RenderModelPatch` consumption — only when a `scale` run shows a rebuild exceeding
   the 50 ms budget (current model build 2–4 ms for 300 messages / ~1.2k nodes). Re-measure first.

No other Phase F work is scheduled. The `ForceCore` fix, layout docs, three promotions, parity
coverage and the Phase G `docs/not-decided.md` note are landed. Phase G's study and release stay
external: no result, release or deployment may be fabricated.

#### Unblock contract (what counts as a real consumer)

The pull-only rule is a quality gate, not a checklist. The three promotions that landed were held to
all of the following, met by `app/demo/second-host.ts`; the same test applies to any future promotion:

1. **Distinct host.** The importing module is not `app/pi` (for helpers) or not the renderer that
   already declares the capability (for descriptors). `app/demo`, `app/docs` or a third app qualify;
   a new module inside `app/pi` does not.
2. **Behavior path.** The helper drives an observable behavior — a rendered rung, a camera move, a
   play/reconcile cycle, a gated affordance — not a type-only or dead import.
3. **Test evidence.** A unit or Playwright assertion covers the consumer's use of the helper, so the
   promotion is proven by two callers with one implementation.
4. **No behavior change in Pi.** After a promotion, Pi's test/e2e results are byte-for-byte the same;
   only its import specifiers move.

A change that fails any of these is speculative API and stays out of the library (Decision 3, §5).
The same rule applies in reverse to `RenderModelPatch`: promote consumption only after a measurement
crosses the stated budget, never to pre-empt one.

#### Verification log (2026-11-20)

Re-run against this worktree before closing this plan; all gates green:

| Command                                          | Result                                                      |
| ------------------------------------------------ | ----------------------------------------------------------- |
| `pnpm test` (root)                               | 100 files, 793 tests passed                                 |
| `pnpm --filter demo test`                        | 6 files, 24 tests passed                                    |
| `pnpm --filter pi test`                          | 12 files, 38 tests passed                                   |
| `pnpm --filter pi test:e2e`                      | 28 passed (browser + vision atlas)                          |
| `pnpm --filter pi verify`                        | one-way dependency guard passed (27 packages)               |
| `pnpm run build:lib`, `pi build`, `demo build`   | built; only pre-existing chunk-size/dynamic-import warnings |
| `pnpm exec tsc --noEmit -p app/pi/tsconfig.json` | clean (exit 0)                                              |

Root `pnpm exec tsc --noEmit -p tsconfig.json` still reports pre-existing `this` implicit-`any` errors
in `test/spacegraph.test.ts`; the package gate above is the source of truth for Phase F, as recorded
in §3 and §4. `scale` must be run alone (~1.28–1.49 s against the 1.5 s budget; concurrent load pushes
it to ~3.1 s).

### Remaining phases

- **C — Compositional worlds and shareable scenes.** Landed. See the ledger entry above.
- **D — Runtime self-verifying loop.** Landed. See the ledger entry above.
- **E — Host senses and product forms.** Landed. See the ledger entry above.
- **F — Library consolidation.** Unblocked items, three pull-gated promotions, `createVisionLoop`
  adoption and parity tests are landed (ledger entries above). Remaining: renderer contract
  descriptors need a second renderer to advertise them; `RenderModelPatch` consumption needs a
  budget-crossing measurement. See §8 "Unblock contract" for the four conditions a consumer had to
  satisfy. Pi behavior did not change.
- **G — Proof and delivery.** Two external items remain: participants for the five-task study and
  credentials for the npm release. The `docs/not-decided.md` graduation note is landed (§8). No result,
  release or deployment may be fabricated.

Phase F has its own gate in §4 and must stay green before Phase G starts. The two Phase A follow-ups
are closed and recorded above; they belonged to the flagship, not to a new phase. Baseline TODO1
evidence is in `TODO1.md:383-395`.
