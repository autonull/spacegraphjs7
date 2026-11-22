# TODO5 — Adaptive, dense, recursive flagship (handoff plan)

Purpose: one coherent plan for all demands collected in the 2026-11-22 audit session. A fresh session
should be able to resume from this file alone. This is a plan, not a release claim; no gated item is
opened by writing it.

---

## 0. Demands collected

From the original audit request:

1. Audit UI/UX usability, ergonomics and aesthetics; use the screenshots as visual feedback.
2. Imagine the capabilities and the work a user must do to get a result.
3. Eliminate awkward UI/UX patterns **without sacrificing ultimate capability**.
4. Eliminate awkward, illegible, poorly laid-out styling.
5. Refactor with progressive disclosure; simplify without losing capability.
6. Give widgets the right focus for the current task: size, font size, color.
7. Make the development loop faster (less screenshot generation and test time).
8. Read `README.md` / docs; follow `AGENTS.md`.

Follow-up directives, in order given:

9. Continue with the **Motion Track** (explicitly chosen; the gate demand half is now recorded in
   `TODO4.md:267`).
10. **Adaptive sizing and reaction**: graph layout, node sizes and related elements should reach an
    ideal ergonomic state; items should autoscale across a **wide, multi-octave dynamic range of
    scales**; aspect ratios may vary; it should **make it all fit, within reason**, and enable a
    **fractal nature**.
11. **Reduce wasted space in a view.**
12. **Pack objects closer but use bigger fonts**, etc.
13. **Enable graph-within-a-graph, via the inner node subgraphs.**
14. Organize all demands into a coherent plan; consider completing it in a fresh session.

Demands 10–13 are one coherent product direction: a dense, adaptive, recursive graph. The plan below
treats them as such rather than as four independent tickets.

---

## 1. Current state (verified 2026-11-22)

### Landed and green

| Change | Evidence |
| ------ | -------- |
| Detail cards read `Kind · Status`; raw fields on hover | `app/pi/src/anatomy.ts:98,104,189`; `tests/anatomy.test.ts:91` |
| `verify:fast` one-command loop | `app/pi/package.json:15`; `app/pi/README.md:27` |
| HUD diagnostics demoted to hover + settings toggle + `?debug` | `app/pi/src/host.ts:326,2314,2762`; `index.html:1721`; `tests/shell.spec.ts:62` |
| Type hierarchy: 10/11px floor, status badge and headings promoted, redundant inspector title removed | `app/pi/src/shell/tokens.ts:31`; `index.html:197,1257,140,1110` |
| Catalog cards disclose question and links only on expand | `app/pi/src/catalog.ts:60,64`; `index.html:1633`; `tests/browser.spec.ts:52` |
| Gallery recaptured; full browser suite green | 136 unit tests, 88 e2e, 18 vision gates passed |

### In flight — motion track, partially implemented

- **Demand recorded**: `TODO4.md:267`. Gate half one is satisfied.
- **L1 pulse implemented**: a one-shot, capped CSS brightness pulse on active cards; alternating keyframe
  names restart it; duration comes from the existing `ladder.blendMs` knob
  (`index.html:511,515`; `host.ts:834,940`). No new subsystem, renderer branch, contract field or policy knob.
- **L3 choreography**: pulse and rung crossfade share the `ladder.blendMs` clock. Camera verbs still use
  the existing `MotionDirector` with `camera.verbMs` / `camera.traceMs`.
- **Comparison artifacts exist**: `docs/screenshots/motion/{with.png,without.png,comparison.json}` and
  `app/pi/tests/motion.spec.ts` (2 tests pass).
- **Not done**: L2 ribbon flow; opt-in preset promotion with provenance; TODO4 motion row still parked.

### Pixel identity is not a gate

The comparison frames differ in framing because `emulateMedia({ reducedMotion: 'reduce' })` changes the
one-time `renderer.fit`. The user explicitly rejected pixel identity as a gate during active UI
development. `app/pi/tests/motion.spec.ts` is now an **evidence harness**: it asserts that active cards
pulse, reduced motion disables the pulse, both variants settle, and it records the variants, viewport
state and PNGs in `docs/screenshots/motion/` for visual review. Do not reintroduce byte-identity or
viewport-parity assertions; this is a deliberate decision, not an unfinished test.

### Investigated and rejected

`geometry.gap` 190→140 and `showcase` repulsion 200→0 each produced **byte-identical** shots: the
cockpit shot pins `geometry.gap: 40`, repulsion fades before rest, and `renderer.fit` normalizes uniform
scale. Recorded at `TODO4.md:114`. Do not retry knob tweaks for edge length; a real fix needs a fixture
topology change or an explicit edge-style policy.

---

## 2. Invariants and constraints

Inherited from `TODO4.md:3` and the repo rules; apply to every phase.

1. **One grammar.** Type, spacing, color and motion are policies, not component constants.
2. **One attention model.** Salience is scored once; size, opacity, ribbon weight and label density are
   channels of it. No component invents its own "important" flag.
3. **One focus, many rungs.** The focused object changes representation, not identity or position.
4. **Progressive disclosure by default.** Advanced controls, instruments and proof stay behind one
   affordance.
5. **Legibility gates beauty.** Every new visual state passes vision assertions at settled and
   intermediate frames, in dark and light themes, under reduced motion.
6. **Motion is optional and semantic.** It communicates state change; no decoration; reduced motion
   reaches the same settled state. Pixel identity is explicitly not a gate during active development.
7. **No renderer branch and no new contract field.** New visuals use existing contract data and host
   DOM/CSS.
8. **No new policy knob without a version plan.** `resolvePolicy` checks vector length
   (`app/pi/src/policy/resolve.ts:68`); adding a knob breaks old `p1.` permalinks. Reuse existing knobs
   (`ladder.blendMs`, `camera.verbMs`, `emphasis.innerDepth`, `bands.*`, `theme.*`) or bump the version
   deliberately.
9. **The gallery is the spec.** Appearance changes are not done until shots are recaptured, reviewed and
   asserted.
10. **One fit at startup is a settled invariant** (`TODO4.md:354`). Demand 10 may require revisiting it;
    that is an explicit decision in Phase 2, not an implicit change.
11. **Bounded recursion:** `innerDepth ≤ 3`, hard chip cap, navigation-based re-entry; no self-similar DOM
    growth and no `RenderNode.children` (TODO4 K4).
12. **No commits or pushes unless asked.** No Changesets in this repo.

---

## 3. Plan

### Progress (2026-11-22)

| Phase | Status | Evidence | Remaining |
| ----- | ------ | -------- | --------- |
| 1 — Motion gate | complete | `living-graph` preset/shot with provenance; `tests/motion.spec.ts` evidence harness; L2 deferred in `docs/motion.md`; `TODO4.md` gate row opened; ADR 0008 still blocks a default | A human comparison decision before any default change |
| 2 — Adaptive fit | complete | `app/pi/src/policy/adaptive-fit.ts`; aspect insets + bounded refit in `host.ts`; ADR 0015; six `fit-*` shots; shell refit test; vision gate over 3 octaves × 2 aspects | Optional: revisit the quarter-octave threshold with real resize telemetry |
| 3 — Density | complete | Opt-in `dense-type` preset/shot; CSS-variable card padding and label scale; height-only footprint reduction; unit test; vision gate over the fit matrix | Promote to default only after a recorded comparison (ADR 0008) |
| 4 — Recursion | complete | Directed spokes/ports/status in every lens layout; autoscaling lens; `recursion` shot; settled + intermediate-frame vision gate; `focus-lens.spec.ts` passes | Second consumer stays gated at `TODO4.md:265` (out of scope) |
| 5 — Verification | complete (2026-11-22) | `pnpm run check` green; e2e 103 passed + 1 pre-existing navigation flake; `verify:visual` 21/21; `scale` budgets met; `shots:all` 23/23; gallery reviewed | Commit, then leave the two external decisions (§7) untouched |
| Style revision | complete (2026-11-22) | ADR 0016: registered `FluxEdge`, field halos, ring artifacts, grid-packed unit scopes, aurora defaults. Mockup refinement (dark navy gradient, arrowheads, square cards/status, no blur/blend, glow 0.2). `check` green; e2e 104/104; visual 21/21; scale met; `shots:all` 23/23 | Commit; long cross-unit `orders` diagonals remain by topology, not as sticks |

Decisions resolved in §7; gate results and review verdicts belong in `docs/screenshots/review.json`.

### Phase 1 — Stabilize and close the motion gate

**Status: complete (2026-11-22).**

**Goal:** turn the in-flight motion work into an honest, green, gated increment.

1. Keep the comparison harness as evidence only: the test asserts pulse presence/absence and that both
   variants settle, then records variants, viewport state and PNGs for visual review. Do not add pixel
   or viewport parity assertions.
2. Confirm reduced-motion behavior at the semantic level: animation property is `none` and the final
   state is settled. Framing differences from the one-time camera fit are expected and acceptable.
3. Decide L2 explicitly. `FlowEdge` dash animation belongs to the engine-mode page
   (`index.html` reference notes); making it render Pi ribbons would be a renderer branch, which
   constraint 7 forbids. Record the decision as "deferred with reason", not as done.
4. Promote one **opt-in preset** as data with provenance: add a `preset(...)` entry to
   `app/pi/src/policy/presets.ts` reusing existing knobs (longer `salience.decayRate`, longer
   `ladder.blendMs`, longer `camera.verbMs`). Assert provenance via the `policy()` hook and the
   existing shot provenance test pattern (`tests/screenshots.spec.ts:56`). Do **not** change a default.
5. Update `TODO4.md:264` motion row only when the comparison is genuinely green; add a CHANGELOG entry.

**Done when:** `tests/motion.spec.ts` passes as an evidence harness (pulse present/absent, both settle);
preset is opt-in with a question; TODO4 gate row updated; no new knob, renderer branch or contract field.

### Phase 2 — Adaptive ergonomic fitting (foundation for 3 and 4)

**Status: complete (2026-11-22).** ADR 0015 records the refit decision; the acceptance matrix is 3 octaves
(fit × 2^-1/2^0/2^1) on 1600×1000 and 900×1000 canvases. At the far octave core LOD hides card interiors by
design, so that frame reads as topology; legibility and no-overlap gates still pass.

**Goal:** make the graph fit an ergonomic target across a multi-octave zoom range and varying aspect
ratios, within reason.

1. Map the current chain precisely: `fitView()` (`host.ts:2459`) → `renderer.fit(ids, { padding })`;
   zoom bands (`bands.*` in `schema.ts:88-91`); level selection
   (`ladder.*`, `applyAutoLevel`); label sizing (`labelFontPx`, `host.ts:876`);
   node footprints (`CARD_SIZES`, `adapter.ts:28`). Read the `dynamic-range` shot as the scale-floor
   reference.
2. Define an **ergonomic target** in data, not magic numbers: a target on-screen card width/label size
   band, a padding ratio derived from canvas aspect, and a scale range expressed as powers of two
   (multi-octave). Reuse `ladder.minLabelPx` and `bands.*`; avoid new knobs (constraint 8).
3. Make the fit **aspect-aware**: compute padding from the canvas bounding box and apply it at the
   existing fit points (startup, shot apply, explicit `frame`/`fit` action). Decide explicitly whether
   to keep one-fit-at-startup (constraint 10) or add a bounded refit on aspect change; if changed,
   record the ADR in `docs/` and update `shell.spec.ts` bounds tests.
4. Prove the range: add shots/tests at several octaves (e.g. `dynamic-range` plus two new zoom
   factors) and at a wide and a narrow aspect ratio. Capture them and review contact sheets.
5. Keep "within reason": clamp the adaptive response so extreme zoom never produces sub-legible text or
   overlapping cards; vision gates must pass at every sampled octave.

**Done when:** a documented target and clamps exist; shots cover ≥3 octaves and ≥2 aspect ratios; all
vision and shell bounds gates green; no renderer branch or new policy knob.

### Phase 3 — Density and typography

**Status: complete (2026-11-22), opt-in only.** The dense treatment is selected by the existing
`ladder.minLabelPx >= 18` knob, so it stays a preset with provenance. Card widths are intentionally
unchanged: an earlier 0.88× width shrink truncated raised labels in `dense-type`, so only height and
interior padding tighten. Gap/repulsion remain inert under camera fit (`TODO4.md:114`).

**Goal:** demand 11 and 12 — reduce wasted space, pack objects closer, use bigger fonts.

1. Audit card interior: `anatomyCard` box padding is `6% 8%` (`anatomy.ts:168`); label sizes come from
   `labelFontPx` and `ladder.minLabelPx` (14px default, `schema.ts:96`); body/meta rows use 11px tokens.
   Screenshots show small text in cards with large empty interiors — this is the concrete waste.
2. Tighten the card box (smaller percentage padding and `--sg-spacing` gaps) and reduce `CARD_SIZES`
   footprints enough to pack nodes closer **without** reducing legibility.
3. Raise the on-screen label floor (`ladder.minLabelPx`) and promote body/meta rows one token step, so
   the denser cards carry larger text. This completes the type hierarchy started in Phase 0 of the
   audit (status badge/headings already promoted).
4. Verify that packing closer does not increase overlap: `createVisionAssert` `noOverlap()` and the
   legibility gate run at every sampled octave from Phase 2. Note that gap/repulsion knobs are inert under
   camera fit (`TODO4.md:114`) — card footprint and padding are the real levers here.
5. Recapture the gallery; review `cockpit`, `node-detail`, `light` and `dynamic-range` specifically.

**Done when:** measured reduction in card area or increase in visible nodes at the same viewport;
font floor raised; no legibility/overlap regression; gallery recaptured.

### Phase 4 — Graph-within-a-graph (fractal recursion)

**Status: complete (2026-11-22).** Directed boundary-anchored spokes, ports and status live in host SVG;
the lens sizing derives from the focused node's on-screen footprint with clamps. Radial chips scale for
small vs large fan-outs because a six-chip lane layout was too short to read. Navigation re-entry rebuilds
the lens; DOM stays bounded.

**Goal:** demand 13 and the "fractal nature" part of demand 10.

1. Start from the existing bounded inner topology: `innerTree` (`inner.ts:83`),
   `innerPlacements` / `innerConnectors` (`inner.ts:148`), and the SVG spoke layer in `anatomyLens`
   (`anatomy.ts:223`). Today this is chips plus connector lines at depth ≤ 3.
2. Promote it to a readable **mini-graph**: treat chips as graph nodes and connectors as edges with
   visible direction, ports and status; make radial/lane placement read as a graph layout rather than a
   grid of labels. Keep all of it host DOM/SVG — no renderer branch, no `RenderNode.children`.
3. Compose with Phase 2/3: the mini-graph must autoscale with the focused node and inherit the denser
   card/typography treatment, so a graph inside a node stays legible at its own scale.
4. Exercise recursion through **navigation-based re-entry** (the existing `focus` action on a chip),
   keeping the chip cap and `innerDepth ≤ 3`. Never grow DOM recursively in place.
5. Add an opt-in preset or shot (e.g. extend `fractal`) so the feature is discoverable and asserted;
   add intermediate-frame vision assertions for the descend transition (`vision.spec.ts:130` pattern).
6. Consider a second consumer only after Phase 4 is green; proliferation (O5–O7) stays gated at
   `TODO4.md:265` and is **out of scope** for this plan.

**Done when:** the inner subgraph reads as a graph, scales with its host node, stays bounded, and has
settled + intermediate-frame gates.

### Phase 5 — Verification, dev loop and handoff

**Status: complete (2026-11-22).** Root `pnpm run check`, `check:fast`, e2e (103 passed, 1 known navigation
flake), `verify:visual` (21/21), `scale` (all budgets met) and `shots:all` (23/23) are green. Review
verdicts are in `docs/screenshots/review.json`; the commit is the final step.

1. Keep the tiered loop: `verify:fast` (types + 136 unit + 15 chrome e2e), `shots:focus` (4 shots),
   `shots:all` (full gallery only at a slice boundary), `shot --watch` for visual iteration.
2. Full gates after each phase: `pnpm --filter pi test:e2e` (88 tests), `pnpm --filter pi verify:visual`
   (18 vision gates), `pnpm run check` at the end, `pnpm --filter pi scale` (frame-time budget: play
   frame < 8 ms; `grammar.spec.ts:154` rAF p95 < 80 ms during a flight).
3. Review regenerated PNGs visually — the gallery is the spec. Add verdict/note entries to
   `docs/screenshots/review.json` (tracked data, not prose in code) for motion and recursion.
4. Update `CHANGELOG.md`, `TODO4.md` gate rows and this file's status section as each phase closes.

---

## 4. File map

| Concern | Files |
| ------- | ----- |
| Host policy, paint, fit, motion, follow | `app/pi/src/host.ts` (paint 828–966, renderPositions 968–994, fitView 2459, registerMotion 2153, activity 327/804–810) |
| Card markup and inner lens | `app/pi/src/anatomy.ts`, `app/pi/src/inner.ts`, `app/pi/src/adapter.ts` (`CARD_SIZES:28`, `cardMarkup:105`, `focusCardMarkup:119`) |
| Chrome CSS and keyframes | `app/pi/index.html` (style block 7–1647, body 1649+) |
| Type/spacing tokens | `app/pi/src/shell/tokens.ts`, `packages/shared/src/tokens.ts` (defaults) |
| Policy schema, presets, resolve | `app/pi/src/policy/{schema,presets,resolve}.ts` |
| Shots and capture | `app/pi/src/shots.ts`, `app/pi/tests/screenshots.spec.ts`, `app/pi/scripts/shot.ts` |
| Motion library | `src/motion/{director,easing,camera-handlers}.ts` |
| Gates | `app/pi/tests/{shell,motion,vision,grammar,browser}.spec.ts`, `app/pi/scripts/scale.ts` |
| Plans / records | `TODO4.md`, `TODO5.md` (this file), `docs/screenshots/review.json`, `CHANGELOG.md` |

---

## 5. Pitfalls already discovered

1. **Camera fit cancels uniform spacing changes** (`TODO4.md:114`); gap/repulsion tweaks are inert in
   fitted shots.
2. **Per-frame `emphasis` writes are a no-op** for node visuals: `nodeSpec()` does not read
   `RenderNode.emphasis` (`packages/spacegraph-renderer/src/mapping.ts:53-113`). Use `data.style`
   standard CSS properties (applied by `HtmlNode.updateSpec` via `Object.assign`) for host-side visual
   channels; custom `--var` keys need `style.setProperty`.
3. **New policy knobs change vector length** and break old `p1.` permalinks
   (`app/pi/src/policy/resolve.ts:68`).
4. **Playwright `animations: 'disabled'` fast-forwards CSS animations**, so one-shot pulses do not
   perturb still captures; this is desirable and no parity assertion is needed.
5. **`emulateMedia({ reducedMotion: 'reduce' })` changes camera fit timing**. Framing differs between the
   motion variants by design; pixel identity and viewport parity are explicitly not gates.
6. **Catalog drawer is closed during `boot`** — open it via `#proof-line` before clicking a card summary
   (`tests/browser.spec.ts:52`).
7. **Tier the loop.** Do not run `shots:all` for small typography edits; use `shots:focus`.
8. **No new contract field, renderer branch or gated feature** without an explicit decision.

---

## 6. Fresh-session handoff

Recommended resume order:

1. Read this file, `TODO4.md:259-280` (gates), `AGENTS.md`, `app/pi/README.md`, and the screenshot
   gallery (`docs/screenshots/pi-agent-*.png`). Run `ctx_resume` if the session tool is available.
2. Stabilize Phase 1 first. Verify with:
   ```
   pnpm --filter pi check:fast
   pnpm --filter pi test:e2e
   pnpm --filter pi verify:visual
   ```
3. Then execute Phases 2 → 3 → 4 in order; each phase ends with a gallery recapture and visual review.
4. Use `pnpm --filter pi shot <ids>` for single shots, `shots:focus` for four, `shots:all` only at a
   phase boundary. Keep `pnpm --filter pi dev` running so Playwright reuses the servers.
5. The user explicitly requested a commit on 2026-11-22. Commit the completed increment; do not push
   unless separately asked. Future resumes still default to no commit without an explicit request.

**Definition of done for the overall plan:** the motion gate is honestly green (evidence harness, opt-in
preset with provenance, L2 decision recorded); the graph fits and stays legible across
≥3 octaves and ≥2 aspect ratios; cards are denser with larger text and no overlap regression; the inner
subgraph reads as a bounded, scaling graph; all gates are green; gallery and docs are updated.

**Status: met (2026-11-22).** The only deferred items are the explicit external decisions above, not
unfinished work in this plan.

---

## 7. Decisions — resolved 2026-11-22

The user confirmed all four recommended options before implementation:

1. **Bounded refit on aspect change** (not one-fit-at-startup). Implemented with a quarter-octave
   threshold and 120 ms debounce; recorded in ADR 0015.
2. **L2 ribbon flow stays deferred with reason.** No renderer branch; promotion needs a measured demand
   and a second consumer. Recorded in `docs/motion.md`.
3. **Acceptance matrix: 3 octaves × 2 aspects** — fit × 2^-1/2^0/2^1 on 1600×1000 and 900×1000.
   Shots `fit-{wide,narrow}-{far,mid,near}` and a vision gate cover every cell.
4. **Dense/typography stays an opt-in preset** until a recorded comparison (ADR 0008). Select it with
   `ladder.minLabelPx >= 18`; no default changed.

Remaining open decisions are external: a human comparison before promoting any preset to default, and a
second real host before lifting the proliferation gate (`TODO4.md:265`). Neither is work for this plan.
