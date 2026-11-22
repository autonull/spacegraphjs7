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
4. The implementation backlog already exists and has no plan owner: `docs/pi-study-ui-audit.md`
   PIUX-01…10 are findings, not work items. TODO9 turns the highest-value ones into gated changes.

---

## 1. Evidence

| Observation                                    | Evidence                                                                                           | Why it matters                                                                                             |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Presets look nearly identical                  | `pi-agent-ui-full.png`, `ui-compact.png`, `ui-reading.png`, `ui-presets/*/{incumbent,variant}.png` | They bundle existing knobs; no new visual idea has been tried, so the gallery cannot reject or accept one. |
| The mid-octave canvas is mostly empty          | `pi-agent-fit-wide-mid.png`, `pi-agent-in-action.png`                                              | Nodes occupy a narrow horizontal band; the eye reads grid and glow before cards and labels.                |
| Detail rung works in isolation, not in context | `pi-agent-node-detail.png`                                                                         | Zoom makes one card legible, but edges still cut across unrelated groups and focus stays a hard rectangle. |
| Five indexes compete                           | audit PIUX-02; `pi-agent-ui-compact.png` rail                                                      | SCOPES, TURN MAP, TRAIL, PORTAL PATH and MINIMAP sit at equal weight in one narrow column.                 |
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
2. Write the baseline to `docs/screenshots/presence-baseline.json` and add a regression test that checks
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

Plan status: **Phase 0 and Phase 1 complete. Phase 1 changed one boot default — the Navigate drawer
is closed and one primary index is declared per surface — but no screenshot, policy vector or study
protocol changed, and no ADR 0008 verdict or pilot result was fabricated.**

| Phase                            | Status      | Evidence                                             |
| -------------------------------- | ----------- | ---------------------------------------------------- |
| 0 — baseline and metrics         | complete    | `presence-baseline.json`; 4 shape-only tests green   |
| 1 — navigation coherence         | complete    | practice gate + one-index e2e; 41 targeted e2e green |
| 2 — occupancy and octave scaling | not started | no vector version plan for scale                     |
| 3 — continuous visual language   | not started | no new accent/field experiment captured              |
| 4 — flagship integration         | not started | no pilot, ADR decision or doc update                 |

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

### Verification run

- `app/pi`: `pnpm run check:fast` — 31 files, 166 unit tests green (count unchanged).
- `app/pi`: targeted Playwright run (`study`, `navigation`, `shell`, `browser`) — 41 passed at
  `retries: 0`, `--workers=1`.
- No `shots:all`, `verify:visual` or `scale` run: the appearance change is structural (rail disclosure
  and a text legend) and TODO8 verdicts are still pending. The full gate set stays a Phase 4 item.

### ADR 0008 evidence for the navigation default

- The boot index did not change (transcript remains primary on `hybrid`), but the drawer default did.
  The existing labelled pair `docs/screenshots/ui-presets/one-index/{incumbent,variant}.png` and its
  pending decision in `docs/screenshots/ui-presets/comparison.json` (`ui-preset-one-index`) are the
  incumbent/variant comparison. That pair shows the `?ui=one-index` experiment (three widgets hidden);
  Phase 1 additionally closes the rail drawer. No new pixels were captured while TODO8 verdicts are
  pending (pitfall 4). A human verdict is still required before treating this as a settled default.

### Deferred measures (reported, not silently dropped)

1. Gallery recapture and the `review.json` traceability item — deferred to Phase 3 with a labelled
   incumbent, because TODO8 human verdicts are still pending (pitfall 4).
2. Root `check`, `verify:visual`, `shots:all`, `scale` — deferred to the Phase 4 single full gate run
   to avoid redundant executions.
3. Occupancy targets — still unset; the Phase 0 offline projection is not a pixel readback.

### Handoff notes

1. Read `TODO8.md:§9`, `TODO7.md:§2`, `TODO6.md:§0` and `docs/pi-study-ui-audit.md` first.
2. Phase 1 is done. Phase 2 needs a vector version plan before any scale knob: use
   `presence-baseline.json` for the baseline, then set targets from that comparison (invariant 4).
3. Reuse TODO8's harness: named preset, `?ui=`, `shots:compare`, `?studyUI=`, `review.json`.
4. Use `pnpm`, `--workers=1` or `--workers=2` on constrained hosts, and state-based waits only.
5. Make no further default change until an ADR 0008 decision is logged by a human; promote the existing
   `one-index` experiment only with a verdict.
