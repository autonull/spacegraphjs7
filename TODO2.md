# TODO2 — From flagship to the full spatial-software vision (plan)

**Status:** Phases A–E are implemented and verified; Phase F remains; Phase G is external and cannot
be fabricated. TODO1's engineering is complete and verified (`TODO1.md:383-395`). **Date:**
2026-11-20. **Owner area:** `app/pi`, `app/demo`, `src/layout`, `src/vision` and `src/world` done
through Phase E; next `packages/renderer` + `src/motion` + `src/salience` for Phase F, promoted only
where a second host consumes them. Current progress and the exact next move are in §8 (Ledger). Two
small flagship follow-ups from Phase A are still open and listed there; they do not gate Phase F.

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

| Check                | Command / rule                                                                                                                                                                                                          |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Flagship             | `pnpm --filter pi test`, `test:e2e`, `verify:visual`, `verify`, `scale`, `build`, package `tsc --noEmit`                                                                                                                |
| Vision on new states | `verify:visual` asserts overlap, legibility, hierarchy, ergonomics and layout score on settled, playing, trace, zoom-ladder rungs and reduced-motion scenes; strategy recorded per capture                              |
| Domains              | `bun test` + `typecheck` + `build` in each of the four `packages/domain/*`; conformance included — Phase B green                                                                                                        |
| Composition + scenes | **Phase C green:** compositional trace (2), graph diff (1), flagship (1) specs; Pi annotation/report specs (2); `pnpm --filter demo build`, demo-error check (39), `video:flagship` recaptured                          |
| Runtime loop         | **Phase D green:** `test/vision-loop.test.ts` deterministic fixture; `createVisionAssert.record()` records gate/loop agreement or the explicit fixer-path note; `verify:visual` (14) covers toggle and `?visionLoop=on` |
| Adapter seams        | **Phase E green:** `test/world.test.ts` (6) + demo adapter spec/unit; Graph IDE page spec; no library implementation; `docs/world.md` and `docs/semantic-wrappers.md` updated; demo-error check (40)                    |
| Boundaries           | root `pnpm test` (`test/boundaries.test.ts`) + `pnpm --filter pi verify` after every phase                                                                                                                              |
| Study protocol       | `pnpm --filter pi test` — matrix, Latin square, recorder, negative reporting; participant run external                                                                                                                  |
| Full repo            | `pnpm test` from root; no `pnpm run check` script exists here (use package `tsc --noEmit`)                                                                                                                              |

Budgets (measure, then tighten; inherited from `TODO1.md:304-315`):

| Metric                                | Budget                        | Prior measured                   |
| ------------------------------------- | ----------------------------- | -------------------------------- |
| Model build, 300 msg / ~1.2k nodes    | < 50 ms                       | ~27 ms                           |
| Full pipeline, 5,001 msg / ~20k nodes | < 400 ms                      | 160–230 ms                       |
| Force layout, 60-turn window          | < 1.5 s                       | ~1.0–1.2 s                       |
| Lazy 3D chunk gzip                    | < 400 KB                      | 282 KB incl. `three`             |
| Play session, ≤ 120 borrowed bodies   | < 8 ms/frame; settles ≤ 5 s   | 0.83 ms/frame, settles — Phase A |
| Permalink encode/decode               | < 2 ms; round-trip stable     | 0.005 ms — Phase A               |
| Vision loop, one analyze→policy cycle | < 16 ms on the 60-turn window | 1.36 ms — Phase D (`scale`)      |

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

| `POSSIBILITIES.md` section   | Landed by                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------- |
| 1. Rectangle ladder          | Phase A (zoomable card ladder), Phase F (pure rung helper)                                        |
| 2. Physics as meaning        | Phase A (Playground), Phase F (`PhysicsPlaySession`)                                              |
| 3. Cinematics as cognition   | Phase A (`trace`), Phase F (camera handlers)                                                      |
| 4. Domains as workspaces     | **Landed — Phase B** (filesystem + data + profile); remaining domains via scaffold                |
| 5. Compositional worlds      | **Landed — Phases B+C** (four isolated domains, three links, cross-canvas trace, history diff)    |
| 6. Shareable scenes          | **Landed — Phases A+C** (full-state permalink, notes on node data, audit report)                  |
| 7. Self-verifying interfaces | **Landed — Phase D** (opt-in runtime loop, gate agreement record); Phase F promotes only on reuse |
| 8. Host-registered senses    | **Landed — Phase E** (registry seam, gating, console demo adapter; widget mounting unchanged)     |
| 9. Product forms             | **Landed — Phase E** (Graph IDE demo host + flagship observatory); others host work via scaffold  |
| 10. Horizons                 | This document's phases + Phase G research gate                                                    |
| 11. Boundaries               | Guardrails in the introduction and gates in §4                                                    |

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

### Next move (Phase F)

Phase F is **pull-only**: do not promote anything until a second host consumes it. In order, when
that consumer exists:

1. `flyTo`/`trace`/`sweep` from the flagship into `src/motion/createCameraMotionHandlers(adapter)`,
   with `reportUnsupported` for unregistered verbs. Pi's imports change, behavior does not.
2. The flagship play session into `src/world/PhysicsPlaySession`; the representation-ladder rung
   helper into `src/salience/` as a pure `(node, rung, activity, vision) → rung` function.
3. Renderer contract descriptors (`motionVerbs`, `sceneFeatures`, `sensorySeams`) beside
   `supports`/`supportsDepth`/`supportsEmphasis` only for capabilities a second renderer advertises;
   scope/physics fields wait for an implementing renderer. The zero-dependency contract stays behavior-free.
4. Measure before adding incremental `RenderModelPatch` consumption; fix `ForceCore.initializePositions`
   randomization through a plain-object seam; add parity coverage in `test/boundaries.test.ts` and
   document the two layout vocabularies in `docs/scopes.md`.

See §3 Phase F for the checklist and §4 for the gate. Phase G stays external: no study result,
release or deployment may be fabricated.

### Deferred inside Phase A (still open; do before calling the flagship finished)

1. Scope-portal glyph identity and portal zoom/breadcrumb navigation. Start at
   `app/pi/src/adapter.ts:89-92` (detail rung shows a `scope:` label) and the `#portalByNode` lookup in
   `app/pi/src/host.ts`; add a stable glyph plus a clickable breadcrumb back through parent scopes.
2. Bind `Trail`/minimap from `src/navigation` into the Pi rail. `Trail` gives back/forward over
   revealed nodes; `Navigation.project` maps `#positions` into a small overview box. Both are pure
   helpers — no library API change. Neither item blocks Phase F.

### Remaining phases

- **C — Compositional worlds and shareable scenes.** Landed. See the ledger entry above.
- **D — Runtime self-verifying loop.** Landed. See the ledger entry above.
- **E — Host senses and product forms.** Landed. See the ledger entry above.
- **F — Library consolidation.** Unstarted and pull-only. Promote a helper only after a second host
  consumes it: camera handlers, `PhysicsPlaySession`, the rung helper, then contract descriptors and
  parity tests. Pi behavior must not change.
- **G — Proof and delivery.** External: participants for the five-task study and credentials for the
  npm release. No result, release or deployment may be fabricated.

Phase F has its own gate in §4 and must stay green before Phase G starts. The two deferred Phase A
items remain open and belong to the flagship, not to a new phase. Baseline TODO1 evidence is in
`TODO1.md:383-395`.
