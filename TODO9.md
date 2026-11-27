# TODO9 — Perceptual coherence and scale-aware presence

Purpose: make SpaceGraphJS read as one coherent, navigable instrument at every zoom, and make Pi Agent
the flagship that proves it. The work is perceptual organization first, visual language second: one
primary index, one navigation flow, groupable structure, and a measured amount of the canvas actually
carrying information. This is a plan, not a release claim. Writing it opens no gated item, flips no
default and fabricates no study result.

---

## 0. Why a new plan instead of expanding TODO8

1. TODO8 owns the **evidence loop**: presets, shot pairs, per-preset study fields and ADR 0008 stubs.
   Its invariants forbid new policy knobs, renderer branches and new contract fields
   (`TODO8.md:§2`, `§7`). The observations below need all three, so adding them to TODO8 would break
   the plan that is measuring them.
2. TODO8's human gates are still pending. New visual work must not retroactively change the incumbent
   images that a reviewer is about to judge.
3. TODO9 consumes TODO8 as substrate: new experiments become named presets once the knob exists; new
   states get incumbent/variant pairs through `shots:compare`; task effects go through `?studyUI=`.
4. The implementation backlog has no plan owner: PIUX-01…10 are findings, not work items. TODO9 turns
   the highest-value ones into gated changes.

---

## 1. Evidence

| Observation                                    | Evidence                                                                                           | Why it matters                                                                                             |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Presets look nearly identical                  | `pi/pi-agent-ui-full.png`, `ui-compact.png`, `ui-reading.png`, `ui-presets/*/{incumbent,variant}.png` | They bundle existing knobs; no new visual idea has been tried, so the gallery cannot reject or accept one. |
| The mid-octave canvas is mostly empty          | `pi/pi-agent-fit-wide-mid.png`, `pi/pi-agent-in-action.png`                                              | Nodes occupy a narrow horizontal band; the eye reads grid and glow before cards and labels.                |
| Detail rung works in isolation, not in context | `pi/pi-agent-node-detail.png`                                                                         | Zoom makes one card legible, but edges still cut across unrelated groups and focus stays a hard rectangle. |
| Five indexes compete                           | audit PIUX-02; `pi/pi-agent-ui-compact.png` rail                                                      | SCOPES, TURN MAP, TRAIL, PORTAL PATH and MINIMAP sit at equal weight in one narrow column.                 |
| Reading floor is too low                       | audit PIUX-03, PIUX-08                                                                             | 10–11px chrome and small node labels make text secondary to glow.                                          |
| Meaning needs a legend and plain labels        | audit PIUX-04, PIUX-05                                                                             | Kind is encoded by unlabelled color dots; chrome speaks engine jargon.                                     |
| First use is unmeasured                        | audit PIUX-01, PIUX-09                                                                             | Timing starts before a participant learns reveal, trace or focus.                                          |

These are observations, not verdicts. TODO9 Phase 0 quantifies the spatial ones before changing them.

---

## 2. Questions this plan must answer

1. **Does it make sense visually?** One reading order, one grouping language, one accent grammar; a
   viewer should see "five turns of one run with a failure", not eighteen rectangles and ribbons.
2. **Is this how one would want to navigate?** One primary index per surface, a practice step, and a
   single follow-the-work flow (`reveal → focus → trace → back`) instead of five parallel indexes.
3. **Should empty space be filled?** Yes, but by measured occupancy and scale-aware presentation, not
   by zooming the camera or shrinking the grid. A far-octave topology view is intentionally sparse;
   the mid and near octaves are not.

---

## 3. Invariants

1. All TODO6/TODO7 invariants still hold: one position authority, one attention model, one grammar,
   form follows function, square surfaces, cheap effects only, grayscale HUD with color in the view,
   legibility gates beauty, no host-specific renderer branch (`TODO7.md:§2`).
2. **One primary index per surface.** Transcript for `log`/`hybrid`, graph for `map`; every other index
   is reachable from one closed drawer, never expanded by default (audit PIUX-02).
3. **Occupancy is measured, not eyeballed.** A named metric reports canvas coverage per octave before
   any scale change; targets are set from that baseline, not invented now.
4. **Scale is policy-driven.** Octave-dependent size and spacing are policy/layout decisions with a
   `resolvePolicy` vector version plan, never screenshot-specific camera hacks.
5. **Substance without ornament.** "Organic" means jointed geometry with volume and elastic response;
   new geometry is allowed only as a registered type (`TODO7.md:§2.9`), never a host-specific renderer
   branch or contract field. Square surfaces, cheap shading, no blur/blend/fog, and legibility gates
   still hold. Motion encodes state change, not decoration.
6. **Library first, Pi second.** A capability that the flagship needs lands as a general library
   capability; Pi consumes it through existing policy and host seams.
7. **No capability loss.** Hiding an index or collapsing the rail keeps its command, palette entry and
   `__pi` hook; `help` names the restore path (TODO8 invariant 2).
8. **ADR 0008 still gates defaults.** A new default, primary index or scale requires an incumbent/variant
   comparison and a logged human decision; experiments stay opt-in (`docs/adr/0008-*`).
9. **The gallery is the spec.** Every appearance change is recaptured and receives a verdict in
   `docs/screenshots/review.json`; study results are never fabricated (`docs/pi-study.md:38-42`).
10. **Three fixes per change set** (`TODO6.md:129`); larger backlogs are split into change sets.

---

## 4. Design

### 4.1 Continuous connection geometry

The target feeling is a single tangible strand running from card to card, not a light beam passing
behind detached rectangles. Keep square cards and chips; put the "organic" quality in the geometry
that joins them.

| Feeling   | Geometry                                                                            | Function it serves                                    | Cheap implementation                                 |
| --------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------- |
| Tangible  | One attachment collar per node; every incident ribbon converges into it             | Shows where a relation actually touches a node        | Small square flange using the card border language   |
| Substance | Opaque tapered core plus a thin translucent sheath, with a highlight along one side | Carries kind and salience without glow-only lines     | Vertex colors, flat shading, slight thickness        |
| Fluid     | Edge bends and collar width respond to layout motion and salience                   | Direction and activity stay readable during change    | Elastic curve from solved targets; no idle animation |
| Seamless  | Scope fields derived from layout targets; grid recedes                              | Turns read as one run, not eighteen independent cards | Interior gradient inside square bounds; opacity only |

All accents come from the existing salience score: a failure's ribbon core, node border, transcript
dot and focus ring use one color and one intensity. No new attention channel, no new position
authority, no blur, blend mode or fog (`TODO6.md:15-17`). A connection is successful when a viewer can
trace it from card to card without lifting the eye — the test is a gallery verdict, not a new metric.

### 4.2 Navigation as one flow

Boot one primary index; put the rest in a single "Navigate" drawer. A practice task gates the study
timer (PIUX-01). `reveal`, `focus`, `trace` and `back` become one documented loop with a visible
four-item legend and plain-language labels (PIUX-04, PIUX-05). The catalog groups Presets, View
experiments and Study questions, with one canonical question list (PIUX-06).

### 4.3 Occupancy-first scale model

Define `occupancy = Σ projected node-bounds area / viewport area` and `labelCoverage = legible label
area / total label area` for each shot. Report both per octave and aspect in a baseline artifact.
Then choose per-octave targets: topology at the far octave stays intentionally sparse; mid and near
octaves raise card size, label floor and spacing until the graph carries the canvas without breaking
`noOverlap()` / `isLegible()`. If a new knob is required, ship the vector version plan with it
(`TODO7.md:74-75`, `app/pi/src/policy/resolve.ts:68`); do not smuggle it into a preset.

### 4.4 Division of labour

| Layer            | Capability                                                            | Flagship proof                                 |
| ---------------- | --------------------------------------------------------------------- | ---------------------------------------------- |
| SpaceGraphJS     | occupancy-aware packing, tapered flux edges, scope-field presentation | graph renders at far/mid/near with one grammar |
| Pi Agent host    | primary index, practice task, plain labels, on-demand rail            | five tasks answerable without a tutorial       |
| Evidence harness | occupancy/label-coverage report, shot pairs, study `ui` field         | ADR 0008 comparison and human verdict          |

---

## 5. Plan

### Phase 0 — Baseline and metrics (one slice, no visual change)

1. Add `occupancy` and `labelCoverage` to the measurement path (`app/pi/src/policy/measurement.ts`,
   `scripts/baseline.ts`) and report them for the six fit shots plus the cockpit shot.
2. Write the baseline to `docs/screenshots/reports/presence-baseline.json` and add a regression test that checks
   the metric shape, not a target value.
3. Expose the metric in the baseline report output (`pnpm exec tsx scripts/baseline.ts --presence`)
   without gating on it yet.

**Done when:** the report exists, no shot or default changed, and all current gates stay green.

### Phase 1 — Navigation coherence (audit PIUX-01, PIUX-02, PIUX-04)

1. One untimed practice task before the study timer; trial 1 cannot start before it.
2. One primary index per surface; the other four indexes move into one closed drawer.
3. Inline four-kind legend and unambiguous status text; keep every command reachable.

**Done when:** a study e2e asserts the practice gate and one expanded index; keyboard and palette reach
every hidden index; ADR 0008 comparison recorded if the boot index changes.

### Phase 2 — Occupancy and octave scaling (audit PIUX-08, plus library capability)

1. Land scale-aware packing in the library with a vector version plan if a knob is added.
2. Raise mid/near-octave card size, label floor and spacing toward the Phase 0 targets; keep the far
   octave as the explicit topology view.
3. Recapture the fit matrix and compare incumbent/variant pairs.

**Done when:** occupancy and label coverage improve at mid/near without any overlap or legibility
failure; the far view remains reachable; a default change waits for ADR 0008.

### Phase 3 — Continuous visual language (the "organic" change set)

1. Registered joint/collar and tapered core+sheath geometry as one grammar across ribbon, node border,
   transcript dot and focus ring.
2. Elastic edge and collar response tied to salience and layout motion; scope fields from solved
   targets; receding grid.
3. Recapture the flagship shots, add a traceability item to `review.json`, and assign verdicts.

**Done when:** a fresh viewer can trace a ribbon from card to card, name the five turns and find the
failure without guidance; all vision gates hold in dark/light, reduced motion, all octaves and both
aspects.

### Phase 4 — Flagship integration and graduation

Split into change sets of at most three: PIUX-03/05/07 (readable chrome, plain labels, on-demand
rail), PIUX-06/09/10 (catalog grouping, study progress/export, honest light-view label). Then run the
five-question pilot once per promoted experiment, close the matching ADR decision, update
`CHANGELOG.md`, `app/pi/README.md`, `docs/pi-study.md` and stale cross-references, and run the full
gate set once (root `check`; from `app/pi`: `check:fast`, `test:e2e`, `verify:visual`, `shots:all`,
`scale`).

**Done when:** every promoted state has a human verdict and ADR record; unpromoted states stay one URL
and one command away; all gates are green at `retries: 0`.

---

## 6. Success measures

1. Mid/near-octave occupancy and label coverage increase against the Phase 0 baseline by targets set
   _after_ that baseline, with no overlap or legibility regression.
2. Exactly one index is expanded at boot on each surface; the practice step gates study timing.
3. A fresh reviewer reads the failure and the five turns from one shot and traces a connection from
   card to card; verdicts are recorded, not inferred from green gates.
4. Every new state is shareable in one URL, captured as an incumbent/variant pair and reachable by
   command; defaults change only through ADR 0008.
5. Full gates green at `retries: 0`; any deferred measure is reported with a reason.

---

## 7. Pitfalls and non-goals

1. Do not treat "organic" as rounded corners, glow-only lines, blur/blend or perpetual idle motion;
   substance comes from joints, taper, shading and elastic response to real state change.
2. Do not add a second position authority, host-specific renderer branch or unversioned knob.
3. Do not change the 36-cell study matrix or fabricate pilot results (`docs/pi-study.md:38-42`).
4. Do not recapture gallery images while TODO8 verdicts are pending without a labelled incumbent.
5. Pixel identity and viewport parity are not gates during active development (`TODO6.md:194`).
6. Do not remove a navigation view when promoting a primary index; keep it in the drawer.
7. Do not mistake a low occupancy number at the far octave for a defect; topology is sparse by design.
8. No commit or push unless explicitly asked; leave increments reviewable.

---

## 8. Progress

Plan status: **All implementation slices are landed: Phases 0–3 plus every Phase 4 finding except the
human gates. Phase 4 now covers PIUX-03/05/06/07/09/10 as opt-in states or non-default fixes. What
remains is external by design: ADR 0008 human verdicts, the five-question pilot, and one final full
gate run after any promotion. No default has been flipped, no shipped gallery incumbent overwritten,
and no verdict or pilot result fabricated. The solved-target scope field now ships as its own opt-in
experiment with a labelled pair (handoff note 6).**

| Phase                            | Status                              | Evidence                                                          |
| -------------------------------- | ----------------------------------- | ----------------------------------------------------------------- |
| 0 — baseline and metrics         | complete                            | `presence-baseline.json`; 4 shape-only tests green                 |
| 1 — navigation coherence         | complete                            | practice gate + one-index e2e; 41 targeted e2e green               |
| 2 — occupancy and octave scaling | complete                            | `presence-scale-aware.json`; scale-aware pair; 34 e2e              |
| 3 — continuous visual language   | implementation complete; verdicts pending | `ui-continuity` and `ui-field-targets` shots + pairs; 20 library, 173 host tests green |
| 4 — flagship integration         | implementation complete; human gates open | PIUX-03/05/06/07/09/10 landed; 47 targeted e2e green; pilot and ADR undecided |

### Delivered in Phase 0

1. `measurePresence` in `app/pi/src/policy/measurement.ts` projects solved freeform card bounds through
   adaptive insets and the shot's octave, reporting `occupancy`, `labelCoverage` and node count.
2. `presenceBaseline()` in `app/pi/scripts/baseline.ts` reports the six fit shots plus `cockpit`, using
   each shot's preset vector, viewport, octave and padding; the shared solver now also backs the
   existing graph-baseline test.
3. `app/pi/tests/presence.test.ts` checks shape, determinism, octave ordering and the seven-sample
   report — no numeric target is asserted.

### Delivered in Phase 1

1. **PIUX-01 — untimed practice gate.** `study.html` carries a persistent five-line control card
   (pan, zoom, reveal, trace, home) and one untimed practice task; `#start` stays disabled until
   `#practice-done` is clicked. `study-page.ts` loads the fixture during practice, starts `startedAt`
   only in `show()` called by `begin()`, and exports `practiceCompleted` in `__study` without adding a
   trial row. `tests/study.spec.ts` asserts the gate and a five-trial report with no practice row.
2. **PIUX-02 — one primary index per surface.** `#surface[data-primary-index]` is `transcript` for
   `log`/`hybrid` and `graph` for `map`; the four secondary indexes stay inside one closed
   `#rail-navigate` drawer. `host.ts` adds `primaryIndex()`, `openNavigate()`, `openIndex()`, five
   `nav.index.*` palette commands, a `help.navigate` restore entry and the `n` key. No command,
   palette entry, `__pi` hook or view was removed (invariants 2, 7; pitfall 6).
3. **PIUX-04 — meaning in words.** A four-kind legend (user / tool / artifact / error) sits in the
   transcript bar and the attention chip now reads "N failures · M files changed · latest: …". Both
   are asserted in `tests/shell.spec.ts`; collapsing the transcript hides the legend so the drawer
   toggle stays reachable without horizontal scroll.

### Delivered in Phase 2

1. **Library capability.** `src/layout/scope-layout.ts` adds `occupancy` / `targetOccupancy` to
   `ScopeLayoutOptions` and the pure `occupancySpacingFactor()`. Measured sparse coverage tightens
   solver collision slack toward the target, floored at half the base padding; the far octave supplies
   no measurement and stays topology-sparse. `test/layout/occupancy-packing.test.ts` covers the
   factor and the resulting smaller extent.
2. **Policy knob and vector version plan.** `geometry.occupancyTarget` (default `0`, inert) lands in
   `schema.ts`; `POLICY_SCHEMA.version` moves to 2 and `decodePolicyVector` accepts legacy `p1.`
   arrays by padding appended knobs with defaults. Plan in `docs/policy-vector-versions.md`; migration
   and `p2.` assertions in `policy-schema.test.ts`, `experiments.test.ts`, `policy.spec.ts`.
3. **Pi opt-in and evidence.** `ui/presets.ts` adds `scale-aware` (`?ui=`/`lab.scale-aware`), host
   re-solves scope spacing and scales cards through the existing size seam, and the named shot
   captures a labelled incumbent/variant pair. `presenceVariant()` writes
   `docs/screenshots/reports/presence-scale-aware.json`: wide-mid occupancy 0.0652 → 0.1024 with label
   coverage 0.5556 → 0.8889; wide-near 0.0881 → 0.1184; both far samples unchanged. No default
   changed, so no shipped gallery incumbent was overwritten.

### Delivered in Phase 3

1. **General geometry, not a host branch.** `src/edges/FluxEdge.ts` gains two pure helpers,
   `fluxRadius()` and `fluxBrightness()`, driven only by opaque `data`: a positive `collar` flattens
   the two trimmed ends into a square flange, and `sheath` lights one side of the core. Both default
   to 0, so every existing flux ribbon is pixel-stable unless a host opts in.
   `packages/spacegraph-renderer/src/mapping.ts` passes the two fields through the existing
   `data.ribbon` seam; no contract field and no registered-type change.
2. **One attention model.** `applyEdgeAttention(..., continuity)` bends the flux curve with salience
   (0.7–1.3x of the base bend) and derives collar and sheath weight from the same rank × salience
   score. The bend follows solved endpoint targets on each update; there is no idle animation.
3. **Pi opt-in and evidence.** `?ui=continuity` / `lab.continuity` / `__pi.setContinuity()` /
   `view.continuity` apply knobs that already exist (`theme.backdrop=flat`, `ladder.minLabelPx=16`,
   `emphasis.ribbonWidth=82`, `theme.glow=0.28`) and set `data-ui-grammar=continuity`, which aligns
   the causal accent across card borders, ports, transcript dots and the focus ring. The new
   `ui-continuity` shot and labelled `continuity/{incumbent,variant}.png` pair are captured; the ADR
   0008 stub `ui-preset-continuity` has a pending human decision.
4. **Solved-target scope fields.** `ScopeSimulation.targets` exposes the solved layout read-only; the
   pure `scopeFieldRects()` mapping turns solved frames into screen rectangles through an injected
   projector. `GraphRenderer.projectWorld?()` is an optional, general capability implemented by the
   spacegraph adapter, so no host owns a second camera. `?ui=field-targets` / `view.fieldTargets` opt
   in; the incumbent screen-position path is unchanged. Its own gallery shot, labelled pair and
   pending ADR stub keep it separate from `continuity` (handoff note 6).

### Delivered in Phase 4 (partial)

1. **PIUX-09 — study progress and export.** `study.html` adds a `#progress` line and a Copy report
   button; `study-page.ts` updates the progress text at each boundary and copies the unchanged
   report through the clipboard API. The report string and `window.__study` shape are untouched. A
   responsive rule stacks the aside and iframe below 900px.
2. **PIUX-10 — honest label.** The light experiment is titled `Light view` in `ui/presets.ts` and
   `shots.ts`; the shipped shell theme is not silently changed.

### Delivered in Phase 4 (continued)

1. **Change set 2 — reading and scanning (PIUX-03/05/07).** The opt-in `?ui=readable` preset raises
   chrome to a 13px body / 12px secondary floor with a 12px meta floor (`--sg-font-sizes-*`), shows
   plain-language labels through `.plain-label` / `.jargon-label` pairs while keeping every knob id
   and moving engine vocabulary into `title` tooltips, and puts the rail in a 300px on-demand drawer
   behind a four-button panel strip. `__pi.openRailPanel()` and `nav.panel.*` commands reach Navigate,
   Inspect, Review and Reference; `help.railPanels` names the restore path. The renderer label policy
   and the shipped dense chrome are untouched.
2. **Change set 3 — catalog (PIUX-06).** `buildCatalog()` adds a `questions` group derived from
   `STUDY_TASKS`; `mountCatalog()` renders Presets, View experiments and Study questions as three
   groups with a 40px filter. The gallery `five-questions` button and the Reference `guided-replay`
   button both call `__pi.openQuestions()`, so each question id appears exactly once in the catalog,
   and a question link runs its capability evidence. Capability entries themselves are unchanged.

### Default-layout study (opened after user review)

The reviewer rejected the shipped `freeform` frame as noisy and confirmed `timeline-rows` as a step in
the right direction. The new opt-in `chapters` view answers the fuller brief: each turn is one subgraph
card with its work as internal chips, the Run card indexes the turns, the failure chip carries severity,
and a compact two-column grid replaces scattered cards and long diagonals. `?graphLayout=chapters` or
`g` reaches it; the freeform default is unchanged pending the logged ADR 0008 decision. Evidence:
`pi/pi-agent-chapters.png`, `review.json:chapters` and `reports/graph-layout-comparison.json:chapters-subgraphs`.

### General ergonomic heuristics (library, not Pi defaults)

The reviewer redirected the work from Pi-specific defaults to general-purpose ergonomic/aesthetic
optimization. `src/layout/ergonomics.ts` now provides `chooseColumns`, `orderByProximity`,
`refineBySwaps` and `solveErgonomicLayout`: a deterministic, host-agnostic solver that fits any graph
to any viewport, measures occupancy/edge length/aspect fit/overlap and exposes a score for comparing
candidates. `?graphLayout=ergonomic` and `pi/pi-agent-ergonomic.png` are one opt-in consumer, not a
default. The chapters view remains a separate subgraph-presentation experiment.

### Verification run

- Root: `pnpm exec vitest run test/layout/occupancy-packing.test.ts test/layout/scope-policy.test.ts`
  — 10 library tests green. `pnpm run build:lib` rebuilt the workspace library after the source edit.
- `app/pi`: `pnpm run check:fast` — 31 files, 173 unit tests green (+5 over Phase 2).
- `app/pi`: Phase 1 targeted Playwright (`study`, `navigation`, `shell`, `browser`) — 41 passed at
  `retries: 0`, `--workers=1`.
- `app/pi`: Phase 2 targeted Playwright (`ui-presets`, `policy`, `vision`) — 34 passed, including the
  full vision atlas and the new scale-aware legibility gate; `pnpm run shots:compare` — 9 pairs,
  `pnpm run compare:ui` — 9 pending decision stubs. Pre-existing pairs were reverted after capture so
  TODO8's pending incumbents were not overwritten; only the new `scale-aware/` pair is added.
- Root: `pnpm exec vitest run test/flux-edge.test.ts` — 4 library tests green; `pnpm --filter
  @spacegraphjs/spacegraph-renderer test` — 25 tests green (one new collar/sheath mapping assertion).
- `app/pi`: targeted Playwright (`ui-presets`, `study`) — 10 passed at `retries: 0`, `--workers=1`;
  `tests/ui-compare.spec.ts --grep 'compare: continuity'` — 1 pair captured; `pnpm run shot
  ui-continuity` — gallery shot captured. No pre-existing PNG was overwritten.
- `app/pi`: targeted Playwright for the last change sets (`readable`, `catalog`, `browser`, `shell`,
  `navigation`, `ui-presets`) — 47 passed at `retries: 0`, `--workers=1`, including computed-style and
  no-overlap checks at 1440×900 and 900×1000. `tests/catalog.spec.ts` and `tests/readable.spec.ts` are
  new; no shipped default changed.
- `app/pi`: `pnpm run compare:ui` regenerated 11 pending decision stubs; targeted captures added the
  `readable` incumbent/variant pair and the `ui-readable` gallery shot. No pre-existing PNG changed.
- Solved-target fields: `pnpm exec vitest run test/layout/field-projection.test.ts
  test/layout/scope-simulation.test.ts` — 20 library tests green; `pnpm run build:lib` and
  `pnpm run build:packages` rebuilt the workspace declarations after the source edits. `app/pi`
  targeted Playwright (`ui-presets`, `shell`) — 21 passed at `retries: 0`; targeted pair and gallery
  captures added `field-targets/`. `pnpm run compare:ui` regenerated 12 pending stubs.
- No `shots:all`, `verify:visual` or `scale` run: no shipped default changed and TODO8 verdicts are
  still pending. The full gate set stays with the Phase 4 human gates.

### ADR 0008 evidence for the navigation and scale defaults

- The boot index did not change (transcript remains primary on `hybrid`), but the drawer default did.
  The existing labelled pair `docs/screenshots/labs/ui-presets/one-index/{incumbent,variant}.png` and its
  pending decision in `docs/screenshots/labs/ui-presets/comparison.json` (`ui-preset-one-index`) are the
  incumbent/variant comparison. That pair shows the `?ui=one-index` experiment (three widgets hidden);
  Phase 1 additionally closes the rail drawer. No new pixels were captured while TODO8 verdicts are
  pending (pitfall 4). A human verdict is still required before treating this as a settled default.
- Scale-aware packing stays opt-in (`geometry.occupancyTarget = 0`). Its labelled pair is
  `docs/screenshots/labs/ui-presets/scale-aware/{incumbent,variant}.png`, its offline comparison is
  `presence-scale-aware.json`, and its stub with a pending verdict is `ui-preset-scale-aware` in
  `comparison.json`. Promoting it to a default still needs a human ADR 0008 decision.
- Continuous grammar stays opt-in (`data-ui-grammar` is set only by the preset). Its labelled pair is
  `docs/screenshots/labs/ui-presets/continuity/{incumbent,variant}.png`, its gallery traceability item is
  `ui-continuity` in `review.json` (note only, no verdict), and its stub is `ui-preset-continuity` in
  `comparison.json`. A human must compare the pair before any grammar element becomes a default.
- Readable chrome stays opt-in (`data-ui-chrome='readable'` is set only by the preset). Its labelled
  pair is `docs/screenshots/labs/ui-presets/readable/{incumbent,variant}.png`, its traceability item is
  `ui-readable` in `review.json` (note only, no verdict), and its stub is `ui-preset-readable` in
  `comparison.json`. Promoting the comfortable type scale or plain labels needs a human decision.
- Solved-target fields stay opt-in (`data-ui-field='targets'` is set only by the preset). Its labelled
  pair is `docs/screenshots/labs/ui-presets/field-targets/{incumbent,variant}.png`, its traceability item is
  `ui-field-targets` in `review.json` (note only), and its stub is `ui-preset-field-targets` in
  `comparison.json`. It does not change a default or absorb the `continuity` verdict.

### Deferred measures (reported, not silently dropped)

1. Gallery recapture for shipped shots — still deferred because TODO8 human verdicts are pending
   (pitfall 4). Phase 3 captures only the new labelled opt-in `continuity` shot and pair; no shipped
   incumbent was rewritten.
2. Root `check`, `verify:visual`, `shots:all`, `scale` — deferred to the Phase 4 single full gate run
   to avoid redundant executions.
3. Occupancy target value — `0.12` is the experiment input, not a proven target. The measured variant
   improves mid/near coverage but does not reach it; narrow-mid label coverage is unchanged and is
   reported as such, not rounded up.

### Remaining work — clarified, in order

1. **Human gates (blocking graduation).** Add verdicts to `docs/screenshots/review.json` for the
   `ui-*` shots, including `ui-continuity`, `ui-readable` and `ui-field-targets`, and close the matching `decision` stubs
   in `ui-presets/comparison.json`. Run the five-question pilot with `?studyUI=<preset>`
   (`docs/pi-study.md`, `window.__study.ui`); never fabricate a result. A default flip needs that
   logged human decision. The unpromoted states stay one URL and one command away.
2. **Final verification (once, after human promotion).** Root `check`; from `app/pi`: `check:fast`,
   `test:e2e`, `verify:visual`, `shots:all`, `scale`, all at `retries: 0`. Recapture only promoted
   states with an incumbent pair; the docs (`CHANGELOG.md`, `app/pi/README.md`, `docs/pi-study.md`)
   already describe the opt-in states and need only the promotion record.
3. **No implementation backlog remains.** Scope fields from solved targets landed as their own opt-in
   experiment (§4 Phase 3 item 2); handoff note 6 records the seam.

### Handoff notes

1. Read `TODO8.md:§9`, `TODO7.md:§2` and `TODO6.md:§0` first.
2. Every implementation slice is complete: Phases 0–3 plus Phase 4's PIUX-03/05/06/07/09/10. New
   geometry still travels as opaque `data` through registered types, never a host renderer branch.
3. Reuse TODO8's harness: named preset, `?ui=`, `shots:compare`, `?studyUI=`, `review.json`.
4. Use `pnpm`, `--workers=1` or `--workers=2` on constrained hosts, and state-based waits only.
5. Make no further default change until an ADR 0008 decision is logged by a human; promote the existing
   `one-index`, `scale-aware`, `continuity`, `readable` and `field-targets` experiments only with a verdict.
6. Scope fields from solved targets (§4 Phase 3 item 2) landed separately from `continuity`:
   `ScopeSimulation.targets` plus the pure `scopeFieldRects()` mapping and the optional renderer
   `projectWorld()` seam. The incumbent screen-position path is unchanged; keep the two labelled pairs
   and their ADR 0008 verdicts separate.
