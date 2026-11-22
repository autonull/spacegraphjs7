# TODO6 — Fresh UI/UX audit and function-first follow-up

Purpose: take a fresh, evidence-led look at the flagship after the style overhaul, measure the new
visuals honestly, and turn only the highest-value findings into small, gated changes. This is a plan,
not a release claim. Writing it does not open any gated item.

---

## 0. Why this plan exists

The user reviewed the gallery and supplied mockups in `docs/screenshots/mockup/` (local-only, gitignored).
From those, the chosen direction was: **dark quantum field, borrowed loosely, form follows function**.
Explicit constraints from that review:

1. No rounded rectangles. Cards and status chips stay square.
2. No default special effects such as fog, blur or expensive compositing. Gradients, flat shadows and
   the small node-core dot are acceptable because they are cheap.
3. The HUD stays grayscale; color belongs to the view.

`TODO5.md` is complete and committed (`dd39f30`, `643185c`, `16a378e`). All gates are green, and every
gallery shot now has a verdict in `docs/screenshots/review.json`. The remaining uncertainty is whether
the new visual language actually works for a user who has not watched it being built. That is what a
fresh-session audit is for.

---

## 1. Current state (verified 2026-11-22)

| Area | State | Evidence |
| ---- | ----- | -------- |
| Plan TODO5 | complete | `TODO5.md` status table and §6 "Status: met" |
| Gates | green | root `check`; e2e 104/104; `verify:visual` 21/21; `scale` budgets met; `shots:all` 23/23 |
| Gallery | reviewed | verdicts for all 21 shots in `docs/screenshots/review.json` |
| Visual language | ADR 0016 | registered `FluxEdge`, field halos, ring artifacts, deep navy gradient, square cards, arrowheads, glow 0.2 |
| Fit and recursion | ADR 0015 + TODO5 phases 2/4 | bounded aspect refit, 3 octaves x 2 aspects, bounded depth-3 inner graph |
| Mockups | local reference only | `docs/screenshots/mockup/` ignored via `docs/screenshots/.gitignore` |

### Known, accepted limitations

1. Long cross-unit `orders` diagonals remain: they encode real cross-scope relations. Fit normalizes
   uniform scale, so `geometry.gap` / `repulsion` cannot shorten them (`TODO4.md:114`). Shortening them
   needs bundling or a fixture topology change (Phase 4 candidate).
2. The two opt-in presets (`dense-type`, `living-graph`) are not defaults. Promotion needs a recorded
   comparison and human decision under ADR 0008 (`TODO5.md:§7`).
3. L2 ribbon flow is deferred with reason (renderer branch, no second consumer; `docs/motion.md`).
4. Proliferation (O5-O7) is gated at `TODO4.md:265` and stays out of scope.

---

## 2. Invariants and constraints

1. **Form follows function.** Every visual change must make a state, relation or action easier to read.
   No decoration for its own sake.
2. **Square surfaces.** Do not reintroduce rounded rectangles in cards, chips or panels.
3. **Cheap effects only.** Gradients, flat shadows and the small core dot are allowed. No fog, no
   `backdrop-filter`, no `mix-blend-mode`, no large blur radii. Reject any proposal that needs them.
4. **One attention model.** Salience is scored once; size, opacity, ribbon weight and label density are
   channels of it. No component invents its own "important" flag.
5. **One grammar.** Type, spacing, color and motion stay policies, not component constants.
6. **Legibility gates beauty.** Every visual state passes vision assertions, dark and light, reduced
   motion, at every sampled octave.
7. **No new policy knob without a version plan.** `resolvePolicy` checks vector length
   (`app/pi/src/policy/resolve.ts:68`); reuse existing knobs or bump deliberately.
8. **No host-specific renderer branch and no new contract field.** New visuals use registered core types
   and opaque `data`, as `FluxEdge` does (ADR 0014/0016).
9. **The gallery is the spec.** Appearance changes are not done until shots are recaptured, reviewed and
   assigned verdicts in `docs/screenshots/review.json`.
10. **Pixel identity is not a gate.** Camera framing differences under reduced motion are expected.
11. **Audit does not implement.** The fresh audit produces evidence and findings; fixes happen in a
    separate, reviewed change set.
12. **No commit or push unless explicitly asked.** Restore this default for the fresh session.

---

## 3. Plan

### Phase 1 — Baseline and frame-time evidence

**Goal:** know the real per-frame cost of flux edges and the field layer before judging the UI.

1. Read `TODO5.md`, `TODO4.md:259-280` (gates), `docs/adr/0015-*.md`, `docs/adr/0016-*.md`,
   `AGENTS.md`, `app/pi/README.md` and the gallery.
2. Run the canonical gates once to confirm the baseline: `pnpm run check`, then from `app/pi`:
   `check:fast`, `test:e2e`, `verify:visual`, `scale`.
3. Measure browser frame time with the `strobe` skill on the cockpit shot and during a play flight.
   Record play-frame ms and rAF p95 in tracked data (`docs/performance.md` or a dedicated measured
   JSON), including the command and date. Do not write prose claims without numbers.
4. If either budget is missed (play frame < 8 ms; rAF p95 < 80 ms during a flight per
   `grammar.spec.ts:154`), stop and fix the hot path before opening the audit. Most likely causes are
   per-frame field DOM writes and flux geometry buffer updates; both are host-side and measurable.

**Done when:** baseline gates are green and one recorded frame-time measurement exists for the new
visual language.

### Phase 2 — Fresh-session UI/UX audit

**Goal:** an honest, structured review from a session that did not build the feature.

1. Launch a fresh session (subagent with a clean context) with this brief:
   - Inputs: this file, `TODO5.md`, ADR 0015/0016, `docs/screenshots/review.json`, the current gallery,
     and a running app (`PI_LOCAL_FEED=1 pnpm --filter pi dev`).
   - Method: inspect every gallery shot and drive the live app; verify findings against DOM/hooks rather
     than memory. Use `createVisionAssert`, `__pi` hooks and Playwright where useful.
   - Focus: legibility and overlap after grid packing (`cockpit`, `node-detail`, `light-theme`, narrow
     `fit-*`); whether status, direction and causality read without explanation; wasted space and the
     remaining diagonals; interaction affordances (focus lens, tabs, catalog, keyboard, transcript);
     light theme and reduced-motion states.
   - Out of scope: re-litigating settled ADRs, pixel identity, the two external decisions in
     `TODO5.md:§7`, and implementing fixes.
2. Require findings as tracked data, for example `docs/screenshots/audit.json`: one entry per finding
   with `id`, `severity`, `shot`/`route`, `observation`, `evidence` path, and `suggested_change`. Use
   "no finding" entries where a focus area is clean; absence of an entry means it was not checked.
3. Require a short verdict per gallery shot that disagrees with the existing review only when there is
   evidence. Do not overwrite `review.json` from the audit; keep audit data separate.

**Done when:** `docs/screenshots/audit.json` exists, every focus area has an entry, and every finding
has evidence a different session could reproduce.

### Phase 3 — Triage and decision

**Goal:** choose a small, high-value change set rather than a broad redesign.

1. Group findings by root cause: layout/topology, typography/status clarity, interaction affordance,
   color/contrast, performance.
2. Rank by severity x confidence, then discard anything that violates an invariant in §2.
3. For each accepted finding, write a one-line change contract: exact user-visible outcome, files
   likely touched, gate that proves it, and whether it needs an ADR 0008 comparison.
4. Leave rejected findings in the audit data with a reason. Do not silently drop them.
5. Confirm the accepted set with the user before implementation. Default decision: fix at most three
   findings per change set.

**Done when:** the audit has `accepted` / `rejected` markers and a recorded user decision.

### Phase 4 — Implement the accepted fixes

**Goal:** ship the smallest changes that clear the accepted findings.

Work each item as its own slice with its own gate and recapture. Likely candidates, not pre-approved:

1. **Long diagonals:** if accepted, try edge bundling or a fixture topology change that groups
   causally related actions. Do not retry `geometry.gap` / `repulsion` knobs (`TODO4.md:114`). Add an
   intermediate-frame vision assertion if motion changes.
2. **Status/direction clarity:** adjust the square status chip, the check/exclamation glyph and the
   flux arrowhead. Keep extra glyphs functional, not decorative.
3. **Packing/overlap:** tune grid lane pitch or frame offset only where a finding shows real overlap;
   re-run the fit matrix and `noOverlap()` after any change.
4. **Light theme / reduced motion:** correct contrast or field opacity if the audit finds a failure.
   Keep the field cheap (opacity, not blend modes).
5. **Interaction:** fix focus-lens, catalog or keyboard issues with browser assertions that reproduce
   the finding.

For each slice:

- keep the tiered loop: `verify:fast`, `shots:focus`, `shot --watch`; `shots:all` only at a slice boundary;
- add or update a focused unit/browser test that fails before and passes after;
- recapture affected shots and assign verdicts in `docs/screenshots/review.json`;
- update `CHANGELOG.md` and this file's status table.

**Done when:** each accepted finding has a passing gate and a gallery verdict; no rejected work leaked in.

### Phase 5 — Verification and handoff

1. Full gates after the last slice: root `pnpm run check`; from `app/pi`: `test:e2e`, `verify:visual`,
   `shots:all`, `scale`.
2. Re-run the frame-time measurement from Phase 1. Compare numbers, do not claim improvement without
   them.
3. Update `TODO6.md` progress, `TODO5.md` only if a settled item changed, and `CHANGELOG.md`.
4. Commit only if the user explicitly asks. Otherwise leave the increment reviewable in the tree.

**Done when:** all gates green, measurements recorded, audit findings closed or explicitly deferred,
docs current.

---

## 4. File map

| Concern | Files |
| ------- | ----- |
| Plans / gates | `TODO4.md`, `TODO5.md`, `TODO6.md` (this file), `AGENTS.md` |
| Visual decisions | `docs/adr/0015-bounded-aspect-refit.md`, `docs/adr/0016-flux-edges-and-field.md`, `docs/motion.md` |
| Audit evidence | `docs/screenshots/audit.json`, `docs/screenshots/review.json`, `docs/performance.md`, `docs/screenshots/mockup/` (gitignored) |
| Host style | `app/pi/index.html`, `app/pi/src/host.ts`, `app/pi/src/attention.ts`, `app/pi/src/theme.ts`, `app/pi/src/shell/tokens.ts` |
| Edge type | `src/edges/FluxEdge.ts`, `src/edges/index.ts`, `src/core/defaults.ts`, `packages/spacegraph-renderer/src/mapping.ts` |
| Layout / packing | `src/layout/scope-layout.ts`, `app/pi/src/scopes.ts`, `app/pi/src/policy/adaptive-fit.ts` |
| Shots / capture | `app/pi/src/shots.ts`, `app/pi/tests/screenshots.spec.ts`, `app/pi/scripts/shot.ts` |
| Gates | `app/pi/tests/{shell,vision,grammar,browser,motion}.spec.ts`, `app/pi/scripts/scale.ts`, strobe skill |

---

## 5. Pitfalls already discovered

1. `geometry.gap` / `repulsion` are inert under camera fit; do not retry them for edge length
   (`TODO4.md:114`).
2. Pixel identity and viewport parity are not gates during active UI development (`TODO5.md:§1`).
3. Rounded rectangles were explicitly rejected; keep cards and chips square.
4. Blur, fog and blend modes were explicitly rejected as default effects; gradients and flat shadows
   are the allowed vocabulary.
5. The light-theme field uses low opacity, not `mix-blend-mode: multiply`; do not reintroduce blending.
6. `TaperedEdge` / `FluxEdge` share the base `Edge` constructor, which calls `update()` before derived
   private fields initialize. Use a plain `_initialized` guard, never a `#private` one.
7. `FluxEdge` arrow geometry has no color attribute; only the core and halo buffers may set
   `attributes.color.needsUpdate`.
8. Boot helpers that wait for `simulation().settled` can hang on some presets; capture helpers call
   `__pi.settle()` instead and wait for camera stability.
9. The catalog drawer is closed at boot; open it via `#proof-line` before clicking a card summary
   (`tests/browser.spec.ts:52`).
10. Tier the loop: `shots:all` only at slice boundaries; use `shots:focus` and `shot --watch` otherwise.
11. No new contract field, renderer branch or gated feature without an explicit decision.
12. The mockup directory is gitignored; it is reference material, not tracked product data.

---

## 6. Fresh-session handoff

Recommended resume order:

1. Read this file, `TODO5.md:113-130` (status), ADR 0015/0016, `AGENTS.md`, `app/pi/README.md`, and
   run `ctx_resume` if available.
2. Verify the baseline with `pnpm run check` and, from `app/pi`, `pnpm run verify:fast`.
3. Do Phase 1 before the audit: a stale performance claim would undermine the findings.
4. Launch the Phase 2 audit as a fresh subagent with the brief in §3. Do not audit from this session's
   memory.
5. Keep `pnpm --filter pi dev` running so Playwright reuses the Vite and op servers.
6. Do not commit or push unless explicitly asked.

**Definition of done:** the new visual language has recorded frame-time evidence; a fresh audit produced
reproducible, evidence-backed findings; a user-confirmed subset was fixed behind focused gates; the
gallery, review verdicts and docs are current; all full gates are green.

---

## 7. Progress (2026-11-22)

Plan status: **phases 1–5 complete, plus three follow-up change sets**. The user explicitly asked for
the commits in this session, so invariant 12 was overridden for these change sets only. All four change
sets are committed on `main` (`28a2c8a`, `aaf9543`, `e197a7c`, `9c83535`). The tree is clean. The only
work not closed is one **environment-gated measurement** (§7 "Remaining open items", item 1); no source
change is pending, and the plan forbids further renderer changes until that measurement exists.

| Phase | Status | Evidence |
| ----- | ------ | -------- |
| 1 — baseline and frame time | complete | `docs/performance.md` baseline table; play frame 0.822 ms, rAF flight p95 99.9 ms recorded |
| 2 — fresh audit | complete | `docs/screenshots/audit.json`: 13 entries, 21 shot verdicts |
| 3 — triage and decision | complete | `audit.json:triage`: user chose all four medium/high findings, then all three deferred findings |
| 4 — accepted fixes | complete | seven slices below, each with a failing-then-passing gate and recaptured shots |
| 5 — verification and handoff | complete | root `check`; `check:fast` 141/141; e2e 107 passed; `verify:visual` 21/21; `shots:all` 23/23; `scale` budgets met |

### Closed findings

| Finding | Change | Gate | Result |
| ------- | ------ | ---- | ------ |
| AUDIT-01 (high) | `canvasText` HUD token in both themes; `#hud` no longer uses dark-theme foreground | `tests/shell.test.ts`, `light-theme` shot | 1.1:1 → 17.72:1 |
| AUDIT-02 (medium) | 44px square bordered catalog summary rows | `tests/browser.spec.ts`, `catalog` shot | min row 18px → 44px |
| AUDIT-03 (medium) | `labelFontPx` reserves glyph and padding width; portal glyph counted in label length | `tests/adapter.test.ts`, `tests/vision.spec.ts`, fit shots | zero truncated labels in the four audited shots |
| AUDIT-04 (medium) | Lens measures the source card DOM rect and picks free space before clamping | `tests/focus-lens.spec.ts`, `node-detail` shot | source card no longer covered |
| AUDIT-05 (low) | Cross-scope causal ribbons take a stable source-scope tint via `data.ribbon.color` | `tests/attention.test.ts`, `tests/vision.spec.ts`, cockpit/node-detail shots | relation preserved, origin traceable |
| AUDIT-06 (low) | Narrow command bar drops secondary labels and shortens the proof line | `tests/shell.spec.ts`, `fit-narrow-*` shots | canvas top 112px → 62px |
| AUDIT-07 (low) | Inner chips reveal full names on hover or keyboard focus | `tests/focus-lens.spec.ts`, `recursion` shot | names reachable without enlarging the lens |

### Second follow-up — ADR 0008 record

AUDIT-05 changed a default visual, so it carries a comparison and a logged human decision:

- incumbent: `docs/screenshots/edges/without.png` (single causal color, committed gallery shot);
- variant: `docs/screenshots/edges/with.png` (source-scope tints, recaptured cockpit shot);
- evidence and rule: `docs/screenshots/edges/comparison.json`;
- decision: `docs/screenshots/edges/decision.json` — graduate, from the user's explicit "All three
  deferred findings" instruction. Negative result published verbatim: the diagonal length is unchanged,
  so this closes traceability only.

AUDIT-06 and AUDIT-07 are legibility fixes, not variant promotions; no default experiment applies.

### Third follow-up — positions-only flight frames

The flight hot path rebuilt every node and edge spec each frame: `tick()` → `advance()` →
`renderPositions()` → `renderer.setModel()` → `sg.loadSpec()`. A flight changes positions only, so:

- `ModelRenderer.setPositions()` moves stored node positions and calls an `applyPositions()` template
  method; `SpaceGraphRenderer` overrides it with `sg.setPositions()`. Other renderers keep the
  full-set fallback (`packages/renderer/src/model-renderer.ts`,
  `packages/spacegraph-renderer/src/index.ts`).
- `renderPositions()` now mutates position and emphasis in place and calls `renderer.setPositions()`;
  `paint()` still owns structural refreshes (`app/pi/src/host.ts:1042`).
- Gate: `packages/renderer/src/index.test.ts` covers the new path and the pre-model no-op;
  `check:fast` 141/141 and `e2e:chrome` 17/17 stay green.

Evidence is in `docs/performance.md`: `advance()` averages 0.368 ms against a 2.295 ms full
`paint()` rebuild. A headed Xvfb run (presentation source, still software GPU) measured flight p95
216.6 ms before and 200 ms after; the 8–9 frame sample is too small to claim a presentation win.

### Remaining open items

Status at the 2026-11-22 continuation review: items 2 and 3 are **no-ops under current conditions**;
item 1 is the single open item and is **blocked by this environment, not by code**.

1. **Flight frame time — hardware measurement only — BLOCKED (environment).** The 80 ms target remains
   unverified. The JS rebuild cost is removed (see above); the residual cost in the recorded run is
   SwiftShader presentation and camera motion, not JS. The existing numbers in `docs/performance.md`
   (play frame 0.822 ms, rAF flight p95 99.9 ms, and the headed Xvfb 216.6 → 200 ms pair) come from a
   custom rAF script under Xvfb on a software GPU — they are not a physical-GPU `strobe` result.
   Environment findings at this review:
   - No `DISPLAY` or `WAYLAND_DISPLAY`; `/tmp/.X11-unix` is empty, so `strobe` refuses headed runs
     (`NoPresentSource`) and classifies any Xvfb run as a software GPU (`SoftwareGpu`, frame metrics
     refused).
   - An NVIDIA RTX 3080 is present (`/dev/dri/card1`, HDMI-A-1 reports `connected`) and a NVIDIA
     `xorg.conf` exists (`/etc/X11/xorg.conf`, HDMI-0 1920x1080), so a display-backed run is possible
     in principle on a host with an active physical display.
   - `strobe status` reports `SCHED_IDLE` priority in this agent context, which refuses frame and
     input-latency metrics even with a display ("run strobe at normal priority").
   To close this item on a suitable host, in order: (a) start Xorg on the NVIDIA GPU for a real display
   and export `DISPLAY`; (b) run `strobe` at normal priority (elevate the shell, e.g. via `chrt`/root);
   (c) measure `frames.*`/rAF during a **warm** flight with at least three trials; (d) record the raw
   numbers, command and date in `docs/performance.md`, then compare against the 80 ms target. Do not
   change the renderer until that measurement exists. Blindly repeating the Xvfb/custom-rAF run adds no
   evidence.
2. **Scale headroom — keep isolated — NO ACTION.** Isolated 60-turn layout was 1476 ms against a 1500 ms
   budget in the first follow-up; later runs met all budgets. `scale` already runs in its own CI job
   (`.github/workflows/ci.yml:73`). Do not run it beside Vite/op dev servers; the harness comment in
   `app/pi/scripts/scale.ts` records why. Revisit only if a slice increases layout work.
3. **Gates not re-run in the third follow-up — CONDITIONAL, currently satisfied.** Full e2e (107),
   `verify:visual` (21) and `shots:all` (23) were green at the second follow-up. The third change touches
   positions only and has no visual default change, so no shots were recaptured and no files changed
   after commit `9c83535` — re-running those gates now would be redundant. Re-run the visual gates only
   when a future slice changes geometry, styling or capture.

### Continuation review (2026-11-22)

Reopened the plan after the third follow-up. Confirmed the four change sets are committed, the working
tree is clean, and no source change is pending. Per the user's constraint to minimize redundant test
runs, no gates were re-run: nothing changed since the last green run. Hardware capability was probed
read-only (see item 1) and the hardware measurement was found blocked by the missing display and
`SCHED_IDLE` priority; no Xorg server was started and no system configuration was altered. This section
is the handoff point — resume at item 1 with a display-backed, normal-priority strobe run.

### Resume notes

1. Reopen deferred work with a new audit entry; do not edit closed findings in place.
2. Use `verify:fast` and `verify:visual` for focused checks; `shots:all` only at a slice boundary.
3. On memory-constrained hosts run the full Playwright suite with `--workers=2`; fully parallel workers
   crash with `Target crashed` when free RAM is low.
4. No new policy knob, host-specific renderer branch or contract field was added. The seven audit fixes
   stay host-side; the follow-up adds a general renderer template method with a full-set fallback.
