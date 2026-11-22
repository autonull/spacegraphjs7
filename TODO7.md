# TODO7 — Graph-first layout and arrangement plan

Purpose: make the PI flagship graph more usable, useful and pretty, with emphasis on layouts and
arrangements. This is a plan, not a release claim, and not an implementation. Opening it does not
start any phase.

---

## 0. Why this plan exists

`TODO6.md` is complete. Its audit closed seven pixel-level findings (contrast, hit targets, label
truncation, lens occlusion, status tint, narrow header, inner-chip names) and the visual language
settled: dark quantum field, square surfaces, grayscale HUD, color in the view, form follows function.

The remaining complaint is structural, not cosmetic. Every gallery shot shows the same shape:

- 18 nodes settle into one thin horizontal band; the upper and lower canvas are empty.
- `Run → read` and `approve → Unit` cross the whole canvas and pass through unrelated cards.
- Packed child cards sit on their parents (`Turn 5` over `test failed`, `Turn 4` over `edit`).
- Scope rings float above cards with no label or boundary, so `scopes` is an abstract count, not a
  visible structure.
- One halo and one causal ribbon per node means nothing is visually dominant.

`docs/pi-study-ui-audit.md` (2026-11-22) covers the participant flow and chrome; this plan covers the
graph itself. The two documents do not overlap.

---

## 1. Current state (verified 2026-11-22)

| Area | State | Evidence |
| ---- | ----- | -------- |
| Prior plan | complete | `TODO6.md:232-247`; commits `28a2c8a`, `aaf9543`, `e197a7c`, `9c83535`, `8df5221` |
| Audit | closed | `docs/screenshots/audit.json`: 13 findings, 21 shot verdicts, all triaged and closed |
| Gallery | reviewed | all 21 verdicts in `docs/screenshots/review.json` |
| Position authority | one | `ScopeSimulation` springs chase solved targets; no in-memory tool loop |
| Root scope | freeform force | `app/pi/src/scopes.ts:183-203`; `ScopeSimulation` seeded zero-gravity, `seed 7` |
| Unit/delegate scopes | grid-packed | `app/pi/src/scopes.ts:183-203`; `scope-layout.ts:174-190` |
| Arrangement | transcript only | `surface.arrangement` is `side`/`stacked`/`floating`; graph positions unchanged (`host.ts:1411-1414`, `:2516-2519`, `:2738-2751`) |
| Available layouts | five unused strategies | `lanes`, `timeline`, `hierarchy`, `tree`, `force` in `src/layout/strategies.ts:18-26, 266-675`; PI imports none |
| Scope strategies | three | `force\|grid\|tree` in `src/layout/scope.ts:9-64` |
| Edges | registered `FluxEdge` | tapered ribbon + additive halo + arrowhead, configured through opaque `data` (`src/edges/FluxEdge.ts:9-107`) |
| Field | DOM radial halos | one `.field-node` per visible node, 120–320px, transform-only updates (`host.ts:1010-1040`) |
| Gates | green at last run | root `check`; `check:fast` 141/141; e2e 107; `verify:visual` 21/21; `shots:all` 23/23; `scale` budgets met |

### Known, accepted constraints

1. `geometry.gap` / `repulsion` are inert under camera fit; they cannot shorten diagonals or widen
   the apparent graph (`TODO4.md:114`, `TODO6.md:192-198`).
2. Long cross-unit `orders` diagonals encode real cross-scope relations. Removing them needs bundling
   or a fixture topology change, not a knob (`TODO6.md:40-42`, `TODO4.md:114`).
3. Source-scope ribbon tint closed traceability only; diagonal length is unchanged (`TODO6.md:269-270`).
4. The physical-GPU frame-time measurement is explicitly deferred; recorded numbers come from a
   software-GPU probe (`TODO6.md:297-312`). Do not claim a performance win from them.

---

## 2. Invariants and constraints

1. **One position authority.** Solved targets feed `ScopeSimulation`; no host-side in-memory layout
   loop and no second source of truth for node positions.
2. **One attention model.** Size, opacity, ribbon weight and label density stay channels of the single
   salience score. No component invents its own "important" flag.
3. **One grammar.** Type, spacing, color and motion stay policies, not component constants.
4. **Form follows function.** Every visual change must make a state, relation or action easier to read.
5. **Square surfaces.** No rounded rectangles in cards, chips, hulls or panels.
6. **Cheap effects only.** Gradients, flat borders and shadows are allowed. No fog, no
   `backdrop-filter`, no `mix-blend-mode`, no large blur radii.
7. **Grayscale HUD, color in the view.** Status and kind accents live on nodes and edges only.
8. **Legibility gates beauty.** Every state passes `noOverlap()` / `isLegible()` and the layout score
   in dark and light, reduced motion, at all three zoom octaves and two canvas aspects.
9. **No new contract field and no host-specific renderer branch.** New geometry travels as opaque
   `data` through registered types; new layout behavior is a general `src/layout` capability.
10. **Policy knobs need a version plan.** `resolvePolicy` checks vector length
    (`app/pi/src/policy/resolve.ts:68`); add knobs deliberately and update the expectation and tests.
11. **The gallery is the spec.** Appearance changes are not done until shots are recaptured and
    assigned verdicts in `docs/screenshots/review.json`.
12. **Default visual changes need an ADR 0008 comparison** with incumbent/variant images, comparison
    data and a logged human decision (`TODO6.md:261-272`).
13. **No commit or push unless explicitly asked.** Leave increments reviewable in the tree.
14. **Audit does not implement.** This file is a plan; findings stay in `docs/pi-study-ui-audit.md`.
15. **No view is removed when a default changes.** Every graph layout stays reachable by command and
    URL; a default flip is a policy change, not a deletion.

---

## 3. Plan

### Phase 0 — Baseline and vocabulary

**Goal:** agree on what "better layout" means in measurable terms before changing code.

1. Record the current graph shape from the canonical shots: occupied bounding box vs canvas, mean
   edge length, count of cross-scope diagonals, count of parent/child card overlaps at the mid octave.
   Use `__pi` hooks and DOM/geometry measurement, not visual memory.
2. Define the success measures:
   - occupied-height / occupied-width ratio moves away from the current thin band;
   - zero truncated primary labels and zero parent/child overlap in the fit matrix;
   - cross-scope causal ribbons either shorten or are contained in a dedicated corridor;
   - no regression against the recorded frame-time numbers in `docs/performance.md`.
3. Read this file, `TODO6.md:190-209` (pitfalls), ADR 0015/0016, `AGENTS.md`, `app/pi/README.md`.

**Done when:** baseline numbers are recorded in tracked data and the four success measures are accepted.

### Phase 1 — Timeline as the flexible default

**Goal:** make timeline the default graph view while keeping every other view as a first-class,
instantly switchable alternative. No view is removed.

1. Reuse the five strategies already in `src/layout/strategies.ts` (`timeline`, `lanes`, `hierarchy`,
   `tree`, `force`). Do not reimplement them as `ScopeStrategy` values in `src/layout/scope.ts`;
   duplicate engines drift. `timeline` encodes turn as X and sequence as Y; `lanes` encodes turn as X
   and semantic kind as Y.
2. Drive the experiment through the existing permalink/full-state link and `__pi` hooks first:
   `?graphLayout=timeline|lanes|tree|force`. No schema knob and no `resolvePolicy` vector bump while
   the view is an experiment (invariant 10).
3. PI host feeds the chosen `GraphLayout.positions` into `ScopeSimulation` as targets; the simulation
   stays the only position authority. Preserve node identity, selection and focus across a switch.
   `surface.arrangement` retains its transcript-only meaning; do not rename it.
4. Add the **aligned** variant: when the transcript is visible, align row *i* with the projection of
   node *i*, so a transcript row and its graph node form one reading unit. It works with every graph
   view, including timeline.
5. When the flexibility gate below passes, flip the default to `timeline` as one versioned policy
   change (schema default, vector expectation, tests). Keep `force`/freeform reachable in one command
   and by URL (invariant 15).
6. A default flip changes every gallery shot. Recapture the full gallery and assign verdicts in
   `docs/screenshots/review.json`; record the incumbent/variant pair under `docs/screenshots/` with a
   comparison and decision JSON (invariant 12). Confirm no study trials have been recorded before the
   flip — a mid-study default change invalidates them (`docs/pi-study.md`).

**Flexibility gate — all must hold before the default flips:**

1. Switching views preserves selection, focus, camera target and transcript scroll; the switch is one
   command and one URL parameter, not a code change.
2. A new turn appends to the timeline without reordering existing cards (warm start from `previous`);
   a live stream does not cause visible jumps.
3. All three transcript arrangements and all four depth modes work with timeline; graph view and
   transcript placement stay independent.
4. Trace, follow, focus and inner-graph re-entry work on timeline positions, not only on freeform.
5. `noOverlap()`, `isLegible()` and the layout score pass at all three octaves × two aspects, in dark
   and light, with reduced motion.
6. The five study questions remain answerable on the timeline view; a pilot preference penalty keeps
   it opt-in rather than default (`docs/pi-study.md:40-42`).
7. Freeform stays one command away in the palette and by URL; no view is gated behind a preset.

**Done when:** each view is reachable by URL and command, positions come from `ScopeSimulation`, all
vision gates pass for each view, and the default flip has a recorded decision and a recaptured gallery.

### Phase 2 — Visible structure for every graph view

**Goal:** make scopes, turns and parent/child relations readable in whichever view is active, without
hand-positioning nodes.

1. **Scope hulls:** render a square-cornered, flat-bordered frame around each unit/delegate cluster,
   using the bounds already composed in `scope-layout.ts:319-358` and the `clusters` field of
   `GraphLayout`. Put `unit-x4` and its status in the frame corner. Use the DOM overlay approach of the
   field layer; no renderer branch, no blend mode.
2. **Turn headers:** replace the unlabeled ring artifacts with a small `Turn 5 · complete` tab at the
   top of each turn cluster, derived from the turn node and its status.
3. **Reserved child lane:** move packed children off the parent card into a dedicated lane with a short
   connector. Tune `lanePitch` and frame offset only where `noOverlap()` actually fails, then re-run
   the fit matrix (`TODO6.md:145-146`).
4. Keep the hull layer behind cards and ribbons so it never competes with status color.

**Done when:** `scope-layout` bounds tests cover hull geometry; `cockpit`, `node-detail` and the fit
shots pass overlap/legibility gates; hulls are visible but do not reduce label contrast.

### Phase 3 — Cross-scope ribbons off the node field

**Goal:** preserve causal relations without letting two diagonals dominate the canvas.

1. Add an optional bundle path to `FluxEdge` through its existing opaque `data` (for example
   `data.ribbon.points` or a corridor id). Keep the registered edge type and the tapered-ribbon
   vocabulary; do not add a contract field (`docs/adr/0016-flux-edges-and-field.md:16-41`).
2. PI host routes cross-scope causal edges through a top or bottom corridor, keeping the source-scope
   tint and an arrowhead at the target. Within-scope causal edges keep the direct ribbon.
3. If bundling needs a new contract field or a second renderer path, **stop**: record the blocker and
   fall back to a fixture-topology change reviewed as its own decision (`TODO4.md:114`).
4. Add an intermediate-frame assertion if the bundle path animates during a flight.

**Done when:** `FluxEdge` unit tests cover the bundle path, the fit matrix passes, and `cockpit` /
`node-detail` show a shorter or contained diagonal with the relation still traceable.

### Phase 4 — Default polish behind comparisons

**Goal:** improve signal-to-noise in the view, with every default change evidenced.

1. Lower ambient `theme.glow` and render halos only for active, selected or failed nodes. Color and glow
   then mean something; the field layer stays opacity/transform only.
2. Make `emphasis.ribbonWidth` rank-driven: writes/delegates thick, reads/evidence thin
   (`app/pi/src/attention.ts:18-29`). The failing-call path should be the visually dominant line.
3. Offer a flat dark backdrop as the work default; keep grid and starfield as opt-in palettes.
4. Raise `ladder.minLabelPx` from 14 toward 16 together with the chrome type fix in
   `docs/pi-study-ui-audit.md` PIUX-03.
5. For each changed default, record an incumbent and variant image under `docs/screenshots/`, write a
   comparison JSON, and log a human decision before it becomes default (invariant 12).

**Done when:** each default has an ADR 0008 record; `shots:all` and `review.json` verdicts are current.

### Phase 5 — Verification and handoff

1. Full gates after the last slice: root `pnpm run check`; from `app/pi`: `check:fast`, `test:e2e`,
   `verify:visual`, `shots:all`, `scale`.
2. Re-run the frame-time recipe from `TODO6.md:307-310` only if a hardware measurement is now possible;
   otherwise compare against `docs/performance.md` and state that no new claim is made.
3. Update this status table, `docs/screenshots/review.json`, `CHANGELOG.md` and
   `docs/pi-study-ui-audit.md` only if a finding is actually closed.
4. Do not commit or push unless explicitly asked.

**Done when:** all gates green, every layout slice has a gallery verdict, and the four Phase 0 measures
are reported as met or explicitly deferred with a reason.

---

## 4. File map

| Concern | Files |
| ------- | ----- |
| Plans / audits | `TODO4.md`, `TODO5.md`, `TODO6.md`, `TODO7.md` (this file), `docs/pi-study-ui-audit.md`, `AGENTS.md` |
| Visual decisions | `docs/adr/0015-bounded-aspect-refit.md`, `docs/adr/0016-flux-edges-and-field.md`, `docs/motion.md` |
| Scope layout | `src/layout/scope.ts`, `scope-layout.ts`, `scope-simulation.ts`, `scope-policy.ts`, `grid.ts`, `LaneLayout.ts`, `strategies.ts` |
| PI host | `app/pi/src/host.ts`, `scopes.ts`, `attention.ts`, `shots.ts` |
| Policy | `app/pi/src/policy/{schema,resolve,density,host}.ts` |
| Edge / field | `src/edges/FluxEdge.ts`, `app/pi/src/host.ts` (field layer), `packages/spacegraph-renderer/src/mapping.ts` |
| Shots / gallery | `app/pi/src/shots.ts`, `app/pi/tests/screenshots.spec.ts`, `docs/screenshots/{review,audit}.json` |
| Gates | `src/vision/assert.ts`, `app/pi/tests/{vision,shell,browser,grammar,motion}.spec.ts`, `test/layout/*.test.ts`, `app/pi/scripts/scale.ts` |

---

## 5. Pitfalls already discovered

1. `arrangement` is transcript DOM only; changing it cannot change the graph (`host.ts:1411-1414`).
2. `geometry.gap` / `repulsion` are inert under fit; do not retry them for diagonal length or spread.
3. Pixel identity and viewport parity are not gates during active development (`TODO5.md:§1`).
4. Rounded rectangles, blur, fog and blend modes were explicitly rejected as default effects.
5. Cross-scope source tint closed traceability only; it did not shorten the diagonal (`TODO6.md:269-270`).
6. `TaperedEdge` / `FluxEdge` call `update()` before derived private fields initialize; use the plain
   `_initialized` guard (`TODO6.md:199-200`).
7. `FluxEdge` arrow geometry has no color attribute; only core and halo buffers may set
   `attributes.color.needsUpdate` (`TODO6.md:201-202`).
8. Boot helpers that wait for `simulation().settled` can hang on some presets; capture helpers call
   `__pi.settle()` (`TODO6.md:203-204`).
9. Tier the loop: `verify:fast`, `shots:focus`, `shot --watch`; `shots:all` only at a slice boundary.
10. `resolvePolicy` checks vector length; a new knob without the matching update fails the test.
11. New layout behavior belongs in `src/layout` as a general strategy, never as a host-specific
    renderer branch.
12. The study decision is governed by task performance, not visual appeal (`docs/pi-study.md:6-9`).
    Do not promote an arrangement to default on aesthetics alone.

---

## 6. Fresh-session handoff

Recommended resume order:

1. Read this file, `TODO6.md:190-209`, ADR 0015/0016, `AGENTS.md`, `app/pi/README.md`, and run
   `ctx_resume` if available.
2. Verify the baseline with `pnpm run check` and, from `app/pi`, `pnpm run verify:fast`.
3. Do Phase 0 before any layout change; a stale baseline would undermine the measures.
4. Keep `pnpm --filter pi dev` running so Playwright reuses the Vite and op servers.
5. Work one slice at a time, each with a failing-then-passing gate and a recaptured shot.
6. Do not commit or push unless explicitly asked.

**Definition of done:** graph arrangements are opt-in and reachable by URL; scope structure is visible;
cross-scope ribbons are contained without losing the relation; changed defaults have ADR 0008 records;
the gallery, verdicts and docs are current; all full gates are green.

---

## 7. Progress (2026-11-22 — increment 2)

Plan status: **in progress — code and gates landed; human decisions remain open**. The user asked to
continue the plan and commit this increment, which overrides invariant 13 for this commit only. No
default has been flipped; every new view stays opt-in.

| Phase | Status | Evidence |
| ----- | ------ | -------- |
| 0 — baseline and vocabulary | complete | `docs/screenshots/graph-baseline.json`; `app/pi/scripts/baseline.ts`; `app/pi/tests/graph-layout.test.ts` |
| 1 — graph arrangements | complete except the study gate | five views by URL/hook/permalink; automated flexibility gate green below; default flip still needs the study result and an ADR 0008 decision |
| 2 — visible structure | complete for this increment | square hulls and number + state-glyph tabs; reserved child lane clears the last parent/child overlap; baseline regenerated |
| 3 — cross-scope ribbons | complete for this increment | `FluxEdge` corridor via opaque `data`; `bundleCorridor()`; unit tests in `test/FluxEdge.test.ts`; gallery recaptured, human decision pending |
| 4 — default polish | blocked on human decision | `docs/screenshots/graph-layout/comparison.json`; no default changed, so no ADR 0008 decision is claimed |
| 5 — verification and handoff | gates green, verdicts pending | root `check`, `app/pi` `check:fast`, `test:e2e`, `verify:visual`, `shots:all` and `scale` all green; gallery recaptured but verdicts in `review.json` need a human |

### Gates run in this increment

- root `pnpm run check` — green.
- `app/pi` `pnpm run check:fast` — 29 files, 150 tests green.
- root `pnpm exec vitest run test/FluxEdge.test.ts` — 6 tests green.
- `app/pi` `pnpm exec playwright test --config playwright.config.ts tests/graph-layout.spec.ts --workers=2` — 4/4 green.
- `app/pi` `pnpm exec playwright test --config playwright.config.ts tests/vision.spec.ts --grep "graph arrangements pass" --workers=2 --retries=0` — green. This is the Phase 1 flexibility gate: 5 modes × 3 octaves × 2 aspects × dark/light (60 scenes) plus 5 reduced-motion scenes, each running `noOverlap()`, `isLegible()` and `expectedLayoutScore(35)`. The matrix test sets a 240 s timeout; the default 30 s timeout is insufficient.
- Full suite from `app/pi`: `pnpm run test:e2e` — 113/113; `pnpm run verify:visual` — 23/23;
  `pnpm run scale` — budgets met (60-turn force 954 ms); `pnpm run shots:all` — 23/23, gallery
  recaptured. Verdicts in `docs/screenshots/review.json` are intentionally left for a human.

### What landed in this increment

1. **Reserved child lane (Phase 2 item 3).** `app/pi/src/scopes.ts:199` now offsets packed frames by
   `y: -240` instead of `-260`. The recorded overlap (`unit-1` portal vs `pi:local:read`, 60 px
   separation against a 72 px card) clears; row 0 and row 1 both have 80 px clearance. The other four
   views are unchanged because their positions come from `setLayoutTargets`. `graph-baseline.json`
   was regenerated and `graph-layout.test.ts` now asserts zero overlaps in every view.
2. **Flexibility gate automated (Phase 1 item 5).** `app/pi/tests/vision.spec.ts` covers every view at
   all octaves × aspects × dark/light and under reduced motion. `app/pi/tests/graph-layout.spec.ts`
   adds arrangement/depth independence and trace-on-timeline coverage.
3. **Bundle path unit tests (Phase 3).** `test/FluxEdge.test.ts` covers the object waypoints emitted
   by `bundleCorridor()`, fixed topology and tint, arrowhead placement, the no-arrow-color pitfall,
   rerouting when the path is replaced, and graceful fallback for malformed waypoints.
4. **Docs consistency.** `app/pi/README.md` documents the opt-in controls; `comparison.json` records
   the zero-overlap baseline; `CHANGELOG.md` records the experiment and the lane fix.
5. **Full gates and gallery recapture.** Every gate in the suite is green. The 20 px lane shift is
   visible in the motion comparison centres and all recaptured shots; verdicts stay unassigned.

Earlier increment still in force: one position authority via `ScopeSimulation.setLayoutTargets()`;
five views reachable by URL, `__pi` and permalink; `graphShape()` baseline measured from solved
positions; aligned transcript; square scope hulls and turn tabs; opt-in corridor ribbons.

### Remaining work — clarified, in order

1. **Study gate (Phase 1 item 6 — human).** Confirm the five study questions remain answerable on
   timeline and run a pilot to check for a preference penalty; log the outcome. All automated gates
   now pass, but the default stays `freeform` until this decision and ADR 0008 close (invariants 12,
   15; pitfall 12).
2. **Gallery verdicts and ADR evidence (Phases 2–4 — human).** Shots are recaptured and current.
   Inspect the contact sheet at `docs/screenshots/index.html`, assign verdicts in
   `docs/screenshots/review.json`, and log human decisions in
   `docs/screenshots/graph-layout/comparison.json`. The `images` and `decision` fields there are still
   `pending`; do not auto-assign verdicts from green gates.
3. **Phase 4 defaults (human).** Lower ambient glow with selective halos, rank-driven ribbon width,
   flat dark backdrop and `ladder.minLabelPx` → 16. Each needs its own incumbent/variant pair and an
   ADR 0008 decision. None were changed here, so no decision is implied.
4. **Final docs pass (after items 1–3).** Update `docs/pi-study-ui-audit.md` only if a finding is
   actually closed; do not edit closed findings in `docs/screenshots/audit.json`.

### User decisions recorded

- The user liked the direction of the graph-focused proposal and asked for it as `TODO7.md`.
- Timeline may become the default **only if** it is flexible enough to keep the other views usable;
  it must not become the only view. The flexibility gate in Phase 1 defines "flexible enough" and is
  now automated and green; the study decision is still outstanding.
- Scope: graph visualization first; participant-flow findings in `docs/pi-study-ui-audit.md` stay a
  separate change set.
- The user asked to continue implementation, commit this increment and minimise redundant test runs.

### Handoff notes

1. Do not edit closed findings in `docs/screenshots/audit.json`; reopen work with a new entry.
2. A new arrangement is an opt-in experiment first. Promotion to default follows ADR 0008 and the
   study stop rule, never visual preference alone.
3. If a phase needs a new contract field, stop and record the blocker instead of adding a branch.
4. `dist/` is gitignored and stale declaration files break `app/pi` typecheck after a core API change;
   run `pnpm run build:lib` before `pnpm run check` in that case.
5. On memory-constrained hosts run the full Playwright suite with `--workers=2`.
6. The flexibility matrix needs `test.setTimeout(240_000)`; 60 scene navigations exceed the 30 s
   Playwright default.
