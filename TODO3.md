# TODO3 — The Crystallized Plan

**SpaceGraphJS: from mechanisms to a perfectible spatial-software system.**
Self-contained. No time estimates. Ordered by dependency, not duration.

---

## Progress (updated 2026-11-21 — sixth increment)

**Workstream A — Configuration Spine: implemented.**

| Item                       | Status | Evidence                                                                                                                                                                                                                                                                                                                                |
| -------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1 policy schema           | done   | `app/pi/src/policy/schema.ts`: 30 typed knobs across all 13 families; each has id, range/options, default, description, rationale link.                                                                                                                                                                                                 |
| A2 resolution + provenance | done   | `app/pi/src/policy/resolve.ts`: fixed precedence `defaults → preset → experiment → url → panel`, per-knob source, `policy:change` event, merged layers.                                                                                                                                                                                 |
| A3 live panel              | done   | `app/pi/src/policy/panel.ts` + WidgetLayer `pinned` mount in `host.ts`; auto-generated per-family controls, provenance badges, reset + copy-URL, hot apply with no remount.                                                                                                                                                             |
| A4 permalink v2            | done   | `PermalinkState.policy` (compact `p1.<base64url>` vector) + `.fixture`; preset gallery data in `policy/presets.ts`; applying a link clears live overrides so the URL wins.                                                                                                                                                              |
| A5 recorder / replay       | done   | `app/pi/src/recorder.ts`: neutral events stamped with the resolved vector, deterministic replay, `counterfactual()` re-score. `host.ts` records `reveal`, `answer`/`wrong-turn`, `policy:change` with vision scores, exposes `recording()`, `recordEvent()`, `replayRecording()` and `counterfactual()` hooks with an ergonomic scorer. |

**Workstream B — Ergonomic Navigation & Continuity: core implemented.**

| Item                  | Status | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| B1 navigation grammar | done   | `host.ts`: `traverseEdge` (double-click `edgeClick` → `flyTo` over the existing camera handler), `descend`/`ascend`, `trace`, `survey`, `follow`, `returnHome`; keyboard bindings `Enter`, `PgDn`/`PgUp`, `t`, `s`, `Home`/`Esc`. Touch gestures bind through `app/pi/src/touch.ts` (pure `TouchRecognizer` + DOM adapter) to the same verb methods, with `navigation.touch` (`default`/`minimal`/`off`) as preset data. All verbs interruptible, reduced-motion aware and recorded as neutral events. |
| B2 continuity         | done   | Portal dissolve animates the child frame origin with the policy `flyTo` duration and holds `[data-descending]` on the portal card through repaints. True two-rung compositing: pure `representationLayers` (`src/salience/representation.ts`) yields the two neighbouring rungs with normalized opacity; `composedCardMarkup` (`app/pi/src/adapter.ts`) keeps both in the DOM and crossfades them in place under `ladder.blendMs`. Node ids, glyphs and positions never change.                        |
| B3 instrumentation    | done   | `recorder.ts` `ERGO_SIGNALS`/`ergonomicCounters`/`ergonomicProfile`; host records zoom reversals, trail backtracks, escape-hatch use, hover dwell, traverse, descend/ascend, trace, survey, and `choices` per reveal; `__pi.ergonomics()` exposes event counts plus derived `time-to-first-relevant`, `choice-count`, `travel-distance`.                                                                                                                                                               |

Every schema knob has a live host consumer: bands → `levelForZoom`, ladder → `representationRung`/`representationWeights` + blur duration, salience → activity decay, emphasis → emphasis caps, camera → flight durations, depth → simulation + renderer, widgets → dock attribute, geometry → `setBaseLayout`/`setForces`, guardrails → budgets/window, surface → surface state, navigation → orientation aids, orchestration → gallery, theme → renderer theme.

**Workstream C — Living Rectangles & Pi Orchestration: core implemented.**

| Item                   | Status | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1 instrument kit      | done   | Promoted to `src/widgets/instrument-kit.ts` after Graph IDE became the second consumer. Sparkline, meter, status, log-tail, diff, tabs and action controls as `WidgetLayer` `attached` descriptors; DOM APIs only, no raw `innerHTML`, so the widget security gate stays green. Pi mounts it in `#instrument-kit`; Graph IDE mounts it in `#instrument-kit` on the detail rung. `test/boundaries.test.ts` enforces one library definition and two host consumers. |
| C2 orchestration verbs | done   | `host.ts`: `sendPrompt` (prompt/steer/followUp through the existing `POST /prompt` + SDK `streamingBehavior` seam), `approve`/`reject` as first-class nodes with `gates` edges using only the six kernel ops, `retry`, `compareRuns` via `diffKernels`, plus graph action buttons that set the prompt mode or drive approval. Every action records a neutral event and writes an evidence line for transcript parity.                                             |

**Workstream D — One World & Proliferation: implemented.**

| Item                         | Status | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| World scope composition      | done   | `app/demo/src/world-scopes.ts` builds one root with isolated domain child scopes and one path-qualified id space; `worldTrace` collapses a cross-domain trace into one ordered path for a single camera. Unit test in `app/demo/tests/world-scopes.test.ts`.                                                                                                                                                                                      |
| D host binding               | done   | `app/demo/src/world-host.ts` composes the four domains into one `ScopeSimulation` and one path-qualified `RenderModel`; cross-domain links are ordinary intra-model edges, never `InterGraphEdge`. `app/demo/src/world-fixture.ts` is the shared four-domain fixture. Demo `app/demo/html/layout/one-world.html` + `app/demo/tests/one-world.spec.ts`; unit tests `world-host.test.ts` (6) and `cross-trace.test.ts` (lift into one camera path). |
| Born-experimentable scaffold | done   | `create-spacegraph-domain` now emits `host/src/spine.ts` (knobs, resolver with provenance, presets, recorder, permalink codec, auto-generated panel) plus `host/tests/spine.test.ts`, and wires them into the generated host. Templates live in `packages/create-spacegraph/templates/`.                                                                                                                                                          |

D is complete: one canvas holds four isolated domain scopes under one root, one `ScopeSimulation` owns every position, and one camera flies the qualified cross-domain trace. The four-canvas `compositional-wrappers.html` stays as the separate-surface embedding case and now shares the same fixture module; `InterGraphEdge` remains screen-space across two cameras and is never used for the world root.

**Workstream E — Experimentation Program: implemented (three tiers; geometry re-simulation is an optional refinement).**

| Item                                | Status       | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1 axes and sampling                | done         | `app/pi/src/policy/experiments.ts`: `sampleExperiment` reuses the seeded pairwise `cartesianMatrix` over any knob families; every sampled cell carries a `p1.` vector that launches exactly that alternative.                                                                                                                                                                                                                                                                                                                                                                     |
| E2 layers and exposure              | done         | Host `assignExperiment(cell)` writes the `experiment` layer between preset and URL; exposure is a neutral recorded event. Three declared experiments include metrics and decision rules.                                                                                                                                                                                                                                                                                                                                                                                          |
| E3 decision rules                   | done as data | Each experiment declares a stop rule: graduate only with a recorded comparison and a human decision; negative results publish verbatim. Nothing auto-promotes.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| E4 measurement tiers + artifacts    | done         | `app/pi/src/policy/measurement.ts`: offline `measureExperiment` replays one recording under every sampled cell, scores with the neutral scorer, and shortlists strict Pareto improvements; `recordDecision` attaches the human decision; `experimentReportMarkdown` publishes the full comparison and negative results verbatim. `exportOnlineOutcomes` exports exposure + outcome counts with no raw prompt text/targets. Wired into host hooks (`measureExperiment`, `experimentReportMarkdown`, `exportOnlineOutcomes`). Unit tests in `app/pi/tests/measurement.test.ts` (5). |
| E5 simulation-backed offline replay | done         | `app/pi/src/policy/simulate.ts`: `simulateFixture` rebuilds the deterministic fixture under a vector, settles a fresh `ScopeSimulation`, and re-runs the vision-feedback retarget; `simulateAndScore` overrides the scored legibility while success/wrong turns/travel stay tied to the human event. `measureExperiment` takes an injectable `ReplayStrategy`; the host hook uses it and exposes `replaySimulated`. A `geometry-x-depth` experiment is launchable. Tests in `app/pi/tests/simulate.test.ts` (6) and `tests/policy.spec.ts`.                                       |

The offline tier re-simulates the deterministic fixture under every cell: `simulateFixture` (`app/pi/src/policy/simulate.ts`) rebuilds the kernel, settles a fresh `ScopeSimulation` with the variant's geometry/depth knobs, and re-runs the analyze → retarget → analyze vision-feedback seam before scoring. `simulateAndScore` feeds the re-simulated legibility into the neutral event score while success, wrong turns and travel stay tied to the recorded human events; `measureExperiment` accepts it as an injectable replay strategy. Legibility is measured in a flat x/y projection because depth is a renderer capability unavailable offline. Human validation is represented by `recordDecision`; the actual participant study is Workstream G.

**Workstream F — Truth pass: implemented.** `docs/ROADMAP.md` regenerated from reality; `docs/not-decided.md` maps every open question to a knob family, preset and ADR; `Ergonomics.layout` uses plugin ids.

| Item                        | Status         | Evidence                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1 durable decision records | done           | `docs/adr/`: 13 ADRs promote the settled TODO1/TODO2/not-decided decisions; `docs/adr/README.md` is the index and `docs/not-decided.md` links each open question to its family and preset.                                                                                                                                                                                                  |
| F2 docs reconciliation      | done           | `docs/ROADMAP.md` regenerated (A–E done, F done, G external; verified test counts); `docs/glossary.md` unifies band / level / rung / scope; `README.md` path drift fixed (`docs/…`, `app/demo`) and `FractalZoomPlugin` marked deprecated; `CHANGELOG.md` added.                                                                                                                            |
| F3 API stability            | done as policy | `docs/contract-versioning.md` states the freeze rule (additive axes only; `supports(...)` is the sole negotiation path) and separates the published one-minor alias rule from the fork's delete-in-same-bump policy; ADR 0013 records it. `LIBRARY_CONTRACT_VERSION` is `1.4.0`. Naming pass and beta → 1.0 remain with G.                                                                  |
| F4 truthful gates           | done           | Root `tsc` clean: 95 → 0 errors. Fixed 4 genuine source errors (typed input event names, an orthographic-camera guard, and a real `sizeArea(current.size)` widget bug) and 91 type-only errors in tests and `app/demo` with no runtime behavior change. `.github/workflows/ci.yml` runs `scale` in a dedicated job; `app/pi/scripts/scale.ts` warms up and keeps the fastest of three runs. |

**Workstream G — Proof & delivery: code-side proof surface implemented; external steps pending.**

| Item                     | Status   | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| G1 public proof surface  | done     | `app/pi/src/catalog.ts`: pure `buildCatalog` turns `POLICY_PRESETS` and seeded `sampleExperiment` cells into launchable `?preset=` / `?policy=` links with the question and decision rule, never a recommendation; `mountCatalog` renders them into `#catalog` beside the existing capability `#gallery`. `app/pi/index.html` styles both as one catalog. Unit tests `catalog.test.ts` (2) and an e2e assertion cover round-tripping and launch links. |
| G2 decision seams        | done     | `recordDecision`, `experimentReportMarkdown`, `exportOnlineOutcomes`, `replaySimulated` and `measureExperiment` reach the `__pi` hook surface; no winner is inferred from them.                                                                                                                                                                                                                                                                        |
| G3 participant study     | external | n ≥ 5 counterbalanced participants, raw exports committed and published verbatim (negative included). Cannot be fabricated; `docs/pi-study.md` marks recruitment pending.                                                                                                                                                                                                                                                                              |
| G4 release & hosted flag | external | `test:publish` → build → npm, dedicated hosted URL, README links updated. No release or deployment is claimed in code.                                                                                                                                                                                                                                                                                                                                 |
| G5 naming pass / 1.0     | gated    | Follows G3/G4. Current version is `8.5.0` alpha; `LIBRARY_CONTRACT_VERSION` is `1.4.0`. Contract truth drift (`CONTRACT_VERSION` / `negotiateContract`) was removed from `README.md`, `packages/renderer/README.md` and `docs/host-integration.md` this increment.                                                                                                                                                                                     |

**Verification:** root `pnpm test` 852 passed; `app/pi pnpm test` 74 passed; `app/pi pnpm test:e2e` 42 passed; `app/demo pnpm test` 34 passed; `app/demo pnpm test:e2e` 21 passed; `pnpm run verify:visual` green; `pnpm --filter pi scale` passes (60-turn layout 1015.6 ms against the 1500 ms budget); root `tsc -p tsconfig.json --noEmit` clean (0 errors); package `tsc -p app/pi/tsconfig.json --noEmit` clean after `pnpm run build:lib`.

**Completed this increment:** the code-side proof surface for G. The Pi flagship now renders one catalog: the capability gallery plus a launchable list of all seven presets and every seeded cell of the three experiments (`app/pi/src/catalog.ts`). Each link is a URL that launches exactly that alternative (`?preset=` for a named layer, `?policy=` for a sampled vector); entries show the question or decision rule and never a recommendation or a winner. The increment also removed the documented-yet-absent `CONTRACT_VERSION` / `negotiateContract` API from the public docs and reconciled the roadmap's stale workstream and test counts. The previous increment delivered the E geometry re-simulation; earlier increments delivered the F truth pass, B/C polish, the D one-canvas binding, and the E measurement tiers.

**Remaining work, in order:**

1. **G3 — Participant study (external; cannot be fabricated):** n ≥ 5 counterbalanced participants on the canonical fixture; commit raw exports and publish verbatim, negative included; record the defaults decision. The code-side seams are ready.
2. **G4 — Release and hosting (external):** `test:publish` → build → npm, a dedicated hosted flagship URL, and updated README links. No release or deployment is claimed in code.
3. **G5 — Naming pass and beta → 1.0:** follows the study and release; the public contract versioning story is now accurate (`LIBRARY_CONTRACT_VERSION`, `supports(...)`).

All code-side workstreams (A–F) are implemented, and G's code-side proof surface is done. No further library work is scheduled without a measured demand or a recorded experiment.

**Deliberate non-goals for this increment:** no contract change, no renderer branches, no new domain scheduled, no immersive or visual default promoted (presets remain examples, never recommendations), and no study result, npm release or hosted URL fabricated. The catalog only launches alternatives and shows their questions; it does not rank them. Docs were corrected where they described an API the contract does not export. Earlier increments added `representationLayers`, `composedCardMarkup`, `TouchRecognizer`/`bindTouchVerbs`, `worldScopes`/`worldTrace`, `createWorldHost`, `ergonomicProfile`, `measureExperiment`/`exportOnlineOutcomes`, `representationRung`/`representationWeights`, `ScopeSimulation.setBaseLayout/setForces`.

---

## 0. Context

SpaceGraphJS is a zoomable UI engine: interfaces are navigable graphs of nodes, edges, and recursive scopes, rendered through a dependency-free contract (`@spacegraphjs/renderer`) over swappable adapters (WebGL 2D/3D, Cytoscape, SVG). Landed and verified: the recursive scope engine (`ScopeSpec → buildScopeTree → layoutScopes → ScopeHost → ScopeSimulation`) with portals, path-qualified IDs, pinning, warm starts, and sleep; representation rungs (`representationRung`); camera verbs (`flyTo`, `trace`); physics play with one position authority (`PhysicsPlaySession`); the opt-in vision loop (`createVisionLoop` → `scopePolicy`); capability-gated sensory/scene/motion seams; incremental patch transport (`createPatchPainter`); four conforming domains (agent, workflow, filesystem, data) built on the six-slot wrapper recipe; full-state permalinks, annotations, audit reports, graph diffs (`diffKernels`); the Pi flagship observatory with a five-task study harness; and a11y/reduced-motion parity. Remaining external items: the participant study, npm release, hosted flagship.

What exists is the **mechanism layer**, complete and disciplined. What remains is not more mechanism. It is: **continuity of experience, ergonomic intuition, living action surfaces, and — above all — the ability to try every alternative without rebuilding anything.** We do not yet know the best bands, ladders, weights, gestures, depths, or defaults. The architecture's job is to make every one of those a runtime decision with recorded consequences, so the system can _find_ its best form rather than freeze a guess.

---

## 1. Destination (operational definition of perfection)

Perfection is not a fixed look. It is five capacities plus one evidence rule:

1. **Any configuration is data.** Every aesthetic, geometric, navigational, and behavioral choice is a named, typed, serializable knob — resolvable at runtime, shareable as a URL, swappable without remount.
2. **Any experiment is a URL.** A scene + a policy vector + a fixture = one link that launches exactly that alternative on any machine.
3. **Any session is a replay.** Recorded human interaction can be replayed deterministically — including under _different_ policies (counterfactual replay), so alternatives can be compared without re-recruiting humans for each.
4. **Any domain is six slots.** New application domains remain vocabulary + mapping + selectors + adapter + host policy + verification — never library changes.
5. **Any surface is alive.** Every rectangle is a portal, an instrument, and (where the domain allows) an action surface; the graph is a cockpit, not a report.
6. **Every default is evidence.** No immersive mode, ladder, or gesture map becomes a default without a recorded comparison and a human decision. Negative results publish verbatim.

Experiential bar: one unbroken descent through all scales (session → run → turn → tool → artifact → file → symbol) that never strands the user, never pops, never illegible — and always offers one keystroke back to a familiar view.

---

## 2. Invariants (the elegance contract)

These are settled; everything below composes them, never re-litigates them.

| #   | Invariant                                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **One model.** Nodes, edges, scopes. Every rectangle is a portal. Representation is a pure function of `(node, scale, activity, legibility, policy)`.                                       |
| 2   | **One position authority.** `ScopeSimulation` owns coordinates; physics borrows a bounded set and reconciles at rest.                                                                       |
| 3   | **One policy source.** All choices resolve through one schema with provenance. No hidden constants inside consumers.                                                                        |
| 4   | **One clock.** The host frame clock advances simulation, motion, activity decay, vision sampling; sleeps at rest; pauses hidden.                                                            |
| 5   | **One event log.** Neutral events + the resolved-policy snapshot that produced them. Measurement and replay read the same log.                                                              |
| 6   | **One direction.** host → domain → kernel → shared. Core never imports the contract. Devices are registered adapters, gated by `supports(...)`, never renderer branches.                    |
| 7   | **Mechanisms pure, policies data.** Library helpers are headless and testable; hosts own every choice; promotion is pull-only with a real second consumer and unchanged flagship behavior.  |
| 8   | **Legibility gates spectacle.** Vision assertions gate every new visual state, including intermediate zoom frames. Reduced motion and keyboard parity are first-class, never afterthoughts. |

**Performance stance (explicit):** the existing measured budgets in `scale.ts` remain as _regression smoke gates only_. No new performance work is scheduled. Workerization, text-rendering swaps, and realtime transport are deferred until a measurement or an experiment demands them. Correctness, continuity, and configurability come first; the mechanisms that make them cheap (instancing, LOD, sleep, append-only placement, patch diffs) already exist and are simply used.

---

## 3. Workstream A — The Configuration Spine (centerpiece; everything plugs into it)

**Goal:** turn `docs/not-decided.md` from a list of open questions into a runtime instrument. Every question becomes a knob family; every answer becomes a preset; every comparison becomes a recorded experiment.

### A1. The policy schema

A typed, serializable `PolicySchema` (host-side first, in `app/pi/src/policy.ts` grown into a `policy/` module; pure helpers promoted only on second-host consumption). Knob families, mapped to the open questions:

| Family            | Example knobs                                                                          | Open question it answers                             |
| ----------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **Bands**         | band edges, hysteresis width, zoom→band mapping (linear / log / scope-depth)           | which scales feel like fractal zoom                  |
| **Ladder**        | rung thresholds in screen-px, per-kind ladders, blend duration, promote/demote weights | which ladder suits which kind                        |
| **Salience**      | signals (activity, recency, failure, degree, focus-distance), weights, decay           | which signals matter                                 |
| **Emphasis**      | channel assignment (size / opacity / edge thickness / color), caps                     | which channel carries emphasis safely                |
| **Camera**        | verb duration, easing, interruptibility, follow lead/lag, trace sweep speed            | whether flights help or annoy                        |
| **Depth**         | treatment per axis, fog/parallax/facing params, depth step                             | which depth deserves a default                       |
| **Widgets**       | slot rules (inside / attached / pinned), density                                       | where widgets belong                                 |
| **Geometry**      | per-scope strategy, force params, gap/padding multipliers, pinning rules               | layout feel                                          |
| **Guardrails**    | DOM card budgets, draw window, body caps                                               | budget values (tunable for experiments, not targets) |
| **Theme**         | full resolved token set, type scale, direction                                         | aesthetics                                           |
| **Surface**       | log/map/hybrid default, arrangement, transcript coupling                               | ergonomic bridge                                     |
| **Navigation**    | gesture map (fingering), edge-traversal behavior, breadcrumb/minimap visibility        | intuition                                            |
| **Orchestration** | which verbs appear at which rung/kind, approval placement                              | cockpit ergonomics                                   |

Each knob: `{ id, type, range/options, default, description, rationale-link }`. The schema is the single source of truth; the control panel, permalinks, presets, and experiment assignments are all _views of it_.

### A2. Resolution with provenance

One pure `resolvePolicy(schema, layers)` with a fixed precedence: **defaults → preset → experiment assignment → URL → live panel**. The resolved vector carries per-knob provenance. Consumers (`representationRung`, `scopePolicy`, motion handlers, salience, adapter card budgets) receive it explicitly — they already are pure functions, so this is threading, not redesign. A `policy:change` event triggers re-resolution and repaint through existing `setModel`/`setTheme`/`setDepth` paths. **Zero contract changes: the entire experimentation system is host policy plus small pure helpers.** That is the elegance test passing.

### A3. The live panel

An auto-generated control widget (mounted via `WidgetLayer`, pinned slot) exposing every knob with its description and current provenance; changes apply hot, no remount; "copy as URL", "save as preset", "reset to default" on every family. The panel is itself policy-gated (hideable, dockable) so it never violates the ergonomics it measures.

### A4. Permalink v2 — the URL is the experiment

Extend `PermalinkState` with the compressed policy vector and fixture ID. Any configuration becomes one shareable link; the existing round-trip unit/e2e gates extend to the full vector. Presets are data files (`presets/*.json`), each a named policy vector + fixture + description — a **preset gallery** where every entry is launchable and every entry declares what question it explores. The evidence-only capability gallery and the preset gallery merge into one catalog: proof surface and experiment launcher.

### A5. The session recorder and counterfactual replay

Generalize the study recorder into a host `SessionRecorder`: neutral interaction events (`surfaceOpen`, `lensSwitch`, `reveal`, `descend`, `why`, `answer`, `wrong-turn`, …) each stamped with the resolved-policy snapshot. Because fixtures are deterministic and simulations seeded, a recorded session can be **replayed under a different policy vector** and re-scored by the vision loop and ergonomic counters — comparing alternatives without new participants. Guided replay already exists; this extends it from "replay the evidence" to "replay the human, counterfactually." Human studies then validate the shortlist that offline replay proposes.

**Gate:** schema round-trips; every knob demonstrably changes behavior hot; two hosts consume the resolver before any promotion; permalink v2 e2e; a recorded session replays byte-identically under its own policy and re-scores under another.

**Corner avoided:** no aesthetic, ladder, gesture, or default is ever baked into code again — only into presets, which are replaceable data.

---

## 4. Workstream B — Ergonomic Navigation & Continuity

**Goal:** the interface is intuitive by construction: stable identity, progressive disclosure, always-visible exits, and one continuous scale-space.

### B1. The navigation grammar

A small, closed verb set, mapped consistently across mouse, keyboard, and touch via `InputManager`/`Fingering`, all registered through the existing camera-verb registry:

| Verb                 | Meaning                        | Binding (default preset, configurable)                                                  |
| -------------------- | ------------------------------ | --------------------------------------------------------------------------------------- |
| `reveal`             | show me this node's content    | click / Enter                                                                           |
| `descend` / `ascend` | enter / leave a portal scope   | double-click portal / breadcrumb, `PgDn`/`PgUp`                                         |
| `traverse`           | cross a relationship spatially | **double-click an edge → fly to its target** (the long-open "semantic edge navigation") |
| `trace`              | show me how I got here         | existing cinematic provenance walk                                                      |
| `follow`             | narrate the live stream        | toggle; camera leads/lags per policy                                                    |
| `survey`             | sweep this scope               | one verb, host-registered                                                               |
| `return`             | home / back / transcript       | `Esc` to familiar view, Trail back/forward, `Home`                                      |

Every verb is interruptible, reduced-motion-aware, and policy-parameterized. **Never strand the user:** every immersive state has a one-keystroke escape to the hybrid transcript; the transcript stays mounted in every surface.

### B2. Continuity choreography (host-side, over existing geometry)

- **Portal dissolve:** descending animates the child frame's `origin + scale·local` up _through_ the parent rectangle while the parent collapses to its stable glyph; ascending reverses it. The scope engine already provides the geometry — this is camera + opacity choreography, not new mechanism.
- **Rung crossfade:** representation blends between rungs (weights from a pure extension of `representationRung`) instead of swapping; hysteresis retained; stable glyphs and append-only placement preserve spatial memory throughout.
- **Orientation aids always available:** breadcrumb, Trail, minimap, "you-are-here" scope highlight — each individually toggleable by policy so experiments can measure their value rather than assume it.

### B3. Ergonomic instrumentation (measure, don't guess)

Extend the recorder with neutral ergonomic signals: time-to-first-relevant-node, wrong turns, zoom oscillation ("lost in space"), trail backtracks, escape-hatch usage, hover dwell. Extend the ergonomics analyzer's vocabulary beyond target size/Fitts to choice count and navigation travel distance. These are _measurements for the experiment program_, never silent auto-fixes.

**Gate:** vision assertions (`createVisionAssert`) on **intermediate** descent frames, not just settled rungs; keyboard-only and reduced-motion e2e for the full verb set; the five-task protocol runnable under any navigation preset.

**Corner avoided:** gestures, bindings, and orientation aids are preset data; no interaction pattern is privileged in code.

---

## 5. Workstream C — Living Rectangles & Pi Orchestration

**Goal:** the detail rung is a working panel; the graph is where agency happens.

### C1. Instrument kit

Host-side components rendered as sanitized `RenderNode.html` + `WidgetLayer` slots: sparkline, log-tail, status strip, diff strip, tabs, meter. Built in **Pi and Graph IDE simultaneously** so promotion to the library is pull-legal from day one. No new node classes; the rectangle ladder (overview line → mini-instrument → full panel → portal) becomes the `full_gui.png` reference design realized.

### C2. Orchestration verbs (Pi host policy over the existing server seam)

Commands are events → `KernelOp`s through the mapper; **never `inferred-cause`**; transcript parity for every action.

| Verb              | Surface                                           | Mechanism                                                                        |
| ----------------- | ------------------------------------------------- | -------------------------------------------------------------------------------- |
| prompt / delegate | widget slot on run/turn nodes                     | existing `POST /prompt`; delegation subtrees already scoped                      |
| steer / followUp  | input on the streaming turn                       | SDK `streamingBehavior` (documented, currently unused)                           |
| interrupt / retry | button affordance → op                            | ordinary `retry` edges                                                           |
| approve / reject  | **approval as a first-class node** gating a scope | human-in-the-loop; ergonomics analyzer enforces target size                      |
| follow            | camera narrates the stream                        | motion registry + salience                                                       |
| compare runs      | root "sessions" scope                             | `GraphHistory` + `diffKernels` — cross-session is host work, zero library change |

Multi-agent orchestration falls out of the scope tree: concurrent runs as sibling scopes, delegation as child scopes, salience promoting the scope that needs a human. **Which verbs appear at which rung/kind is itself a policy family** — cockpit ergonomics stay experimental.

**Gate:** e2e drives prompt → steer → approve → retry entirely from graph affordances with transcript parity; one-way guard, conformance, and study harness stay green; instrument kit promoted only after both hosts consume it.

---

## 6. Workstream D — One World & General-Purpose Proliferation

- **World scope:** mount the four domains as child scopes of one root in **one canvas** — the scope engine already gives per-domain solvers and isolation within one graph; kernels stay separate host-side. Cross-domain trace becomes a single camera flight. `InterGraphEdge` remains for genuinely separate surfaces (embedding in other apps). Isolation is preserved by construction, not by canvas count.
- **Proliferation by recipe, not schedule:** knowledge atlas, incident war room, research notebook, music workspace, GraphOS-style shells remain _host work_ through the six-slot scaffold (`create-spacegraph`). Ship one more exemplar (processes/tools as nodes, filesystem-domain pattern) to keep the OS claim "achievable by construction." The scaffold emits the policy schema, panel, recorder, and preset gallery alongside the existing vision gate — **every new domain is born experimentable.**
- **Shared scenes:** permalinks v2 + annotations + reports already cover async collaboration. Realtime sync (host-owned, over `RenderModelPatch`) is deferred until a product or experiment demands it — then it is host work, not contract work.

---

## 7. Workstream E — The Experimentation Program ("try them all", made tractable)

**Goal:** systematic exploration of the design space with honest decision rules.

1. **Axes and sampling.** The knob families define the space; full cartesian is infeasible, so reuse the study harness's seeded pairwise-coverage sampling (already implemented for surface × depth × arrangement) generalized to any policy families. Every sampled cell is a launchable URL.
2. **Three measurement tiers.**
    - _Offline:_ counterfactual replay of recorded sessions under variant policies, scored by the vision loop + ergonomic counters. Cheap, deterministic, proposes a shortlist.
    - _Online:_ opt-in variant assignment via the resolver's experiment layer; exposure and outcomes logged to the same event log; exportable, privacy-conscious, host-owned.
    - _Human:_ the five-task protocol (and per-knob successors) validates the shortlist. The original protocol stays intact as the primary product claim; policy exploration is secondary analysis.
3. **Decision rules (the stop rule, generalized per knob).** A variant graduates to a preset default only if it beats the incumbent on task success and time **without a preference penalty**, with the comparison recorded and a human decision logged. Negative results publish verbatim. The system proposes; humans decide; nothing auto-promotes.
4. **Vision as online instrument.** `createVisionLoop` scores every variant's settled and intermediate states; legibility/ergonomics scores join task metrics in the experiment record. ONNX weights are trained from the existing capture atlases (heuristics as weak labels, human-verified holdout, model cards) **when the heuristic plateau is measured** — not before; `hybrid` activates only where models beat heuristics on the holdout, strategy recorded per capture.

**Gate:** an experiment is fully specified by `{ families, variants, sampling seed, metrics, decision rule }` as data; any result is reproducible from its URL + recorder export.

---

## 8. Workstream F — Elegance & Truth Pass (continuous)

- **Docs reconciliation:** regenerate `docs/ROADMAP.md` from reality; fix `PLAN`/`ROADMAP` path drift; mark/remove deprecated `FractalZoomPlugin` from the README table; one glossary unifying bands / levels / rungs / scopes vocabulary.
- **Truthful gates:** root `tsc` clean (test-only errors fixed) so it is a real gate; `scale` runs in an isolated CI job — fixing the _measurement_, not optimizing the code.
- **API stability → freeze:** naming pass, deprecation policy, `CHANGELOG.md`; contract freeze at `LIBRARY_CONTRACT_VERSION` with capability negotiation as the only extension path; beta → 1.0.
- **Decision records:** promote the settled decisions scattered across TODO1/TODO2/not-decided into durable ADRs; keep `not-decided.md` as the living index of _open_ questions — each now linked to its knob family and experiment.
- **Pattern discipline:** every mechanism = pure core + thin host binding + conformance test + two consumers before promotion. Delete dead paths rather than deprecating forever.

---

## 9. Workstream G — Proof & Delivery (external; start immediately, runs in parallel)

- **Run the study:** n ≥ 5 counterbalanced participants on the canonical fixture; commit raw exports; publish verbatim, negative included; record the defaults decision.
- **Release:** `test:publish` → build → npm via the existing workflow; dedicated hosted flagship URL; README links updated.
- **Public proof surface:** the landing page grows the preset gallery and the experiment catalog — the published study, the replayable sessions, and the launchable alternatives _are_ the marketing. Distribution follows evidence.

---

## 10. Sequencing (dependencies, not dates)

```
G (proof/delivery) ──────────────────────────────► runs in parallel throughout
F (elegance/truth) ──────────────────────────────► continuous
A (configuration spine) ──► B (ergonomics/continuity) ──► C (living rectangles/orchestration)
        │                          │                            │
        └──────────► E (experimentation program) ◄──────────────┘
                              │
                     D (one world) ──► defaults decisions (gated by G's study + E's records)
```

A comes first because B, C, D, and E all express their choices through it. Each workstream is independently demonstrable and keeps every existing gate green before the next begins.

---

## 11. Anti-goals (explicit)

- No premature optimization: no worker/text-renderer/realtime work without a measured demand; budgets are smoke gates, not targets.
- No speculative contract fields or library APIs; descriptors wait for an implementing renderer; promotion waits for a second consumer.
- No ten domains scheduled; the scaffold makes them host work.
- No library XR/sound/haptics/gamepad defaults; seams stay host-registered and report-only.
- No second position authority; no `inferred-cause`; no hiding nodes to fix a slow stream without measuring.
- No immersive default, ladder, or gesture map promoted without a recorded comparison and a human decision; no fabricated study, release, or deployment.
- No rewrite of the solver, contract, or scope engine — they are the proven foundation.

---

## 12. Definition of done

The system is "perfect" in the only sense available to a design space this open:

- Every choice in `not-decided.md` is a live knob with a preset, an experiment, and a recorded comparison.
- One continuous, legible, interruptible descent through all scales, with a one-keystroke escape, on every input modality.
- Pi is a cockpit: the full agent loop (prompt → steer → approve → retry → compare) driven from the graph, transcript parity intact.
- One world canvas, isolated domains, single-flight cross-domain trace; any new domain born experimentable from the scaffold.
- Any configuration = a URL; any session = a replay; any alternative = a counterfactual; any default = evidence.
- The study is published (either outcome), the release is live, the docs are true, the gates are green — and the architecture can still become anything the experiments discover next.

**The deliverable is not a finished interface. It is an interface that can finish itself — repeatedly, honestly, and without ever being painted into a corner.**
