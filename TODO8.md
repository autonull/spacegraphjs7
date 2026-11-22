# TODO8 — Evidence-driven UI experiments

Purpose: make UI/UX choices fast to try, share, compare and decide. A named UI preset must be one URL,
one shot and one command away, and its value must be measurable by task performance rather than taste.

This is a plan, not a release claim. `TODO7.md` owns graph layouts and their human gates; this plan
owns the shell around the graph and the experiment loop that decides its defaults.

---

## 0. Re-thinking the previous draft

The previous draft proposed a full `UIState` schema, widget registry, lab editor and two-iframe
comparison harness. Three problems with that design:

1. **Two authorities.** Most of those axes already exist as knobs in `POLICY_SCHEMA` —
   `surface.mode`, `surface.arrangement`, `theme.variant`, `theme.glow`, `ladder.minLabelPx`,
   `emphasis.innerDepth`, `navigation.minimap`, `navigation.trail`, `navigation.breadcrumbs`,
   `guardrails.*`. A parallel `UIState` would duplicate them and drift.
2. **Infrastructure before evidence.** Fifteen axes and a registry are expensive to build before a
   single experiment has been run. The bottleneck is not configurability; `setKnob`, `setPolicyLayer`,
   `__pi` hooks, permalinks and named shots already make every knob shareable.
3. **Heavy comparison.** Two synced iframes are not needed when shots are deterministic. Two shot
   URLs and a JSON record produce the same ADR 0008 evidence.

The revised plan keeps the ambition and removes the machinery: `ui` is a **named bundle of existing
settings**, applied through existing setters. New DOM/CSS appears only when an experiment cannot be
expressed with what already exists.

---

## 1. Scope and non-goals

**In scope:** named UI presets, preset application from URL/permalink/palette/hooks/shots, study
integration, comparison artifacts, gallery evidence, and the test-agility work in §6.

**Out of scope:** a new policy vector version, new contract fields or renderer branches, a second
position authority, arbitrary CSS injection, changes to the 36-cell study matrix, and reopening closed
findings in `docs/screenshots/audit.json`.

---

## 2. Invariants

1. **Policy stays the knob authority.** `ui` names a bundle of knob values and existing view flags;
   it never redefines a knob. No `resolvePolicy` vector bump (`TODO7.md:74-75`).
2. **No capability loss.** A preset hides or resizes widgets; every command stays reachable through
   the palette and `__pi` hooks. `help` explains why a widget is hidden and how to restore it.
3. **No new contract field, renderer branch or second position authority** (`TODO7.md:58-73`).
4. **Defaults stay untouched** until an ADR 0008 decision (`TODO7.md:78-83`).
5. **Experiments are measured, not trusted.** A preset declares its gates; unpromoted presets do not
   gate the main suite.
6. **Visual language holds** (`TODO6.md:12-18`; `TODO7.md:66-69`): square surfaces, grayscale HUD,
   color in the view, cheap effects only.
7. **Tests serve change.** Fix, relax or disable brittle tests with a named surviving gate; retries
   are not coverage.
8. **The gallery is the spec.** Visible presets get shots and human verdicts.
9. **Three fixes per change set** (`TODO6.md:129-130`) unless overridden.

---

## 3. Design

### 3.1 `UIPreset` is data

```ts
interface UIPreset {
    id: string;
    title: string;
    hypothesis: string;
    knobs: PolicyVector;          // existing knob ids -> values
    flags?: { graphLayout?: string; graphAligned?: boolean; ribbonCorridor?: boolean; graphMorph?: boolean };
    chrome?: 'full' | 'compact' | 'minimal'; // the only new axis, implemented with body data attribute + CSS
    gates: readonly string[];
}
```

`applyUIPreset(id)` resolves the preset, calls `setPolicyLayer('experiment', knobs)`, applies the
existing graph flags via their setters, and sets `body.dataset.uiChrome`. It is one function in
`app/pi/src/ui/presets.ts`; no widget registry, no new state engine.

### 3.2 Access paths

- URL: `?ui=compact-reading` — one id.
- Permalink: `ui?: string` in `PermalinkState` (`app/pi/src/permalink.ts`), validated against the
  preset list, restored after policy so it wins.
- Shot: `ui?: string` on `Shot` (`app/pi/src/shots.ts`), so `?shot=<id>&ui=<preset>` is reproducible.
- Palette: `lab.<preset.id>` commands plus `u` to open a compact preset list, generated from the same
  data. No separate editor: changing a knob is already possible with `:` commands.
- Hooks: `__pi.uiPresets()`, `__pi.applyUIPreset(id)`, `__pi.ui()` returns the active id.
- Study: `?studyUI=<preset.id>` on `study.html`, recorded as `__study.ui`, reusing the
  `studyGraphLayout` pattern (`app/pi/src/study.ts:11`, `docs/pi-study.md:68-71`).

### 3.3 Why this is more efficient

- No new schema validation, encoder, registry or lab UI: the preset table *is* the UI.
- No parallel authority: `policy` still owns knobs; `ui` is shorthand for a bundle.
- No two-iframe sync: `?shot=<id>&ui=<preset>` produces deterministic incumbent/variant images; a
  script writes `docs/screenshots/<preset>/comparison.json` in the existing ADR 0008 shape.
- No task-specific UI engine: five presets composed from the same knobs answer "which UI helps task 3?"

---

## 4. What the lean plan can achieve that the platform plan could not

1. **A full experiment matrix from one command.** Extend the shot runner to emit every named preset
   across the existing 3 octaves × 2 aspects × dark/light matrix. The gallery becomes a comparison
   atlas rather than a set of isolated images.
2. **Task-measured UI comparison.** The study harness already records success, time and preference
   (`docs/pi-study.md:28-42`). Add one `ui` field per opt-in run and the same recorder can answer which
   preset wins per question, without touching the matrix or fabricating participants.
3. **Automatic ADR scaffolding.** Each preset gets a decision stub with incumbent/variant paths, gate
   results and a `pending` decision. Humans fill the decision; the machine fills the evidence.
4. **Explainable hiding.** `help` shows "Rail hidden by preset X — run `ui:full` to restore", so
   progressive disclosure never becomes a mystery.
5. **One-click graduation.** When a human approves, move the preset's knobs into `UI_DEFAULTS` and
   log the ADR; the preset stays reachable as an opt-in alias until the next minor.

---

## 5. Plan

### Phase 0 — Experiment loop and test agility (one slice)

1. Apply the §6 ledger: deterministic boot polling, relax snapshot/count assertions, disable the
   duplicated smoke suites, remove `retries: 1` only after the waits are stable.
2. Add `UIPreset`, `applyUIPreset`, `?ui=`, permalink field, hooks, palette commands and `u` list.
3. Ship three presets that express today's state (`full`), a compact chrome and a reading type.

**Done when:** each preset survives URL → host → permalink → reload; no default changes; root
`pnpm run check` and `app/pi` `check:fast` green; full e2e has no flaky tests at `retries: 0`.

### Phase 1 — Presets as evidence

1. Add the remaining presets from §7, each built only from existing knobs plus `uiChrome`.
2. Extend `shots.ts` with `ui`; capture the matrix gallery for named presets.
3. Add `?compare=<preset>` that captures incumbent/variant shot pairs and writes a comparison JSON in
   the ADR 0008 shape. No iframes required.

**Done when:** every preset has a shot pair, declared gates and a `pending` decision stub; verdicts
in `review.json` are still human.

### Phase 2 — Task comparison

1. Add `?studyUI=<preset>` to the harness, record `__study.ui`, and show it in the question header.
2. Run the existing five questions once per preset for a pilot; report success/time/preference by
   preset. Recruitment and decisions stay external (`docs/pi-study.md:38-42`).
3. Add `help` explanations for hidden widgets and the one-command restore path.

**Done when:** a pilot report can rank presets per task without changing the 36-cell matrix; keyboard
and palette reach every hidden widget.

### Phase 3 — Graduation and verification

1. Promote at most one preset per ADR 0008 decision, with images, comparison data and a human log.
2. Full gates once: root `pnpm run check`; from `app/pi`, `check:fast`, `test:e2e`, `verify:visual`,
   `shots:all`, `scale`.
3. Update `CHANGELOG.md`, `app/pi/README.md`, `docs/pi-study.md` and stale cross-references only when
   a finding is actually closed. Do not commit or push unless explicitly asked.

**Done when:** all gates green; every promoted preset has an ADR record; unpromoted presets remain
one command away; the four measures below are reported as met or deferred with a reason.

**Success measures:** (1) a preset is shareable in one URL and one command; (2) every preset has
incumbent/variant evidence; (3) a pilot can compare presets by task performance; (4) full e2e at
`retries: 0` has no flakes.

---

## 6. Test-agility ledger

Each row names the surviving gate. Do this before adding presets.

| Test | Problem | Action | Surviving gate |
| ---- | ------- | ------ | -------------- |
| `app/pi/tests/browser.spec.ts:5-13,117-131` | `__pi.ready` precedes SSE data; row count can be 0 (observed flake) | **Fix**: poll `__pi.ops() > 0`; auto-retry first row; `toHaveCount` parity | Same spine behavior |
| `graph-layout.spec.ts:3-7`, `vision.spec.ts:11-18`, `motion.spec.ts:5-11`, `policy.spec.ts:3-6` | Same weak boot | **Fix**: shared polling boot from `shell.spec.ts:8-12` | Existing assertions |
| `app/pi/tests/graph-layout.test.ts:30-35` | Deep-equality baseline blocks intentional layout changes | **Document regeneration** in plan and keep as a snapshot gate; assert invariants at `:39-83` separately | Short edges, zero overlap, warm start plus drift detection |
| `grammar.spec.ts:166-191`, `shell.spec.ts:51`, `screenshots.spec.ts:16` | Fixed sleeps and tight timing budgets | **Fix** with `expect.poll`; relax p95 to evidence | Same behavioral assertions |
| `shell.spec.ts:169,246`, `vision.spec.ts:118-121`, `focus-lens.spec.ts:21-30`, `demo/tests/host.spec.ts:123,127` | Exact DOM counts tied to implementation | **Relax** to bounds (`>0`, `<=6`) | Bounded behavior tests |
| `test/e2e/{demo-interaction,comprehensive-interaction,behavioral,layout}.spec.ts` | Four overlapping smoke suites, not in CI | **Disable with reason**; keep `test/interaction.spec.ts`, replace its 11 sleeps with polls | App e2e plus real interaction suite |
| `test/vision.spec.ts:15-56` | Library negative control uses `npx`, fixed port, spawn sleep | **Keep in CI** (`benchmark.yml:43`) but fix: `pnpm`, ephemeral port, poll readiness | Library assert behavior stays covered |
| `test/e2e/visual-regression.spec.ts:39-58` | Byte snapshot with self-writing reference | **Disable with reason** | `verify:visual` semantic gates |
| `capture-matrix.spec.ts:78-87`, `inner-layout.spec.ts:127` | Hash identity as behavior | **Relax** to evidence; keep config/signature gates | Axis config and geometry semantics |
| `app/pi/playwright.config.ts:10,21,27` | `retries: 1` hides flakes; stale server reuse | **Fix** after ledger: `retries: 0`, clean boot for full gates | Deterministic waits |

---

## 7. Preset catalogue

Starting set; each maps to existing knobs or the single `uiChrome` axis.

| Preset | Composition | Question |
| ------ | ----------- | -------- |
| `full` | current defaults | Does the shipped arrangement still win? |
| `compact` | `uiChrome=compact`, hide minimap/trail/breadcrumbs | How little chrome is usable? |
| `reading` | `ladder.minLabelPx=16`, comfortable spacing | Is a larger label floor worth the density cost? |
| `presentation` | `ladder.minLabelPx=18`, glow and ribbons up, transcript collapsed | Does a quiet frame improve demo clarity? |
| `one-index` | transcript visible, secondary indexes hidden | Does one primary index beat five? |
| `light-shell` | `theme.variant=light` applied to shell and view | Does the light view need the shell themed too? |
| `mono` | `theme.glow=0`, semantic color off | Is status color in chrome signal or noise? |
| `morph` | `graphMorph=1` | Does animation aid orientation or cost time? |
| `failure-first` | `emphasis.*` salience focused on failures | Does one dominant node improve accuracy? |
| `task-1` … `task-5` | bundles tuned per pinned question | Which UI wins each task, not on average? |

New knobs are not added to make a preset; a preset that needs a new knob is a TODO7-style decision
with a vector version plan.

---

## 8. Pitfalls

1. `surface.arrangement` is transcript DOM only; never use it as a graph-view control (`TODO7.md:232`).
2. `ui` is a bundle pointer, not a knob; a second authority defeats the simplification.
3. Default flips need ADR 0008 and a human decision; green gates are not a decision.
4. Pixel identity and viewport parity are not gates during active development (`TODO6.md:194`).
5. `app/pi` imports `spacegraphjs/*` from `dist/`; run `pnpm run build:lib` after a `src/` API change.
6. Do not disable the CI negative control; fix its timing instead.
7. A hidden widget must keep its command; otherwise "no capability loss" is false.
8. Study recruitment is external and results are never fabricated (`docs/pi-study.md:38-39`).

---

## 9. Progress

Plan status: **Phases 0–2 are implemented, gallery evidence is captured, and the full release-boundary
gate run is green; only human gates and the follow-up documentation remain**. `ui` names a bundle of
existing knobs and view flags applied through existing setters. No default has changed; no verdict or
pilot result has been fabricated.

| Phase | Status | Evidence |
| ----- | ------ | -------- |
| 0 — experiment loop and test agility | complete | §6 ledger applied; `retries: 0`; full app e2e 138 passed |
| 1 — presets as evidence | captures complete; verdicts pending | five `ui-*` shots, eight incumbent/variant pairs, ADR scaffold |
| 2 — task comparison | harness support complete; pilot external | `?studyUI=`, `__study.ui`, per-preset report rows |
| 3 — graduation and verification | blocked on human decision | no ADR 0008 decision closed; all automated gates green including root `check`, app `check:fast`, `test:e2e`, `verify:visual`, `shots:all`, `scale` |

### Delivered

1. Presets and access paths: `app/pi/src/ui/presets.ts` holds nine presets and one
   `applyUIPreset(id, target)` that reuses `setPolicyLayer('experiment', knobs)` and the existing
   graph/transcript setters. Reachable from `?ui=`, permalink v4, `Shot.ui`, `lab.<id>` commands plus
   `u`, hooks `uiPresets()` / `ui()` / `applyUIPreset()`, and `?studyUI=`.
2. One new visual axis: `body.dataset.uiChrome` with CSS in `app/pi/index.html`. Hidden widgets keep
   their commands; dynamic `help` names them and the `lab.full` restore path.
3. Deterministic test boot: `app/pi/tests/boot.ts` centralises ready + populated-kernel + mounted-shell
   polling; `frames(page, n)` replaces fixed sleeps where a frame count is the real condition.
4. §6 ledger applied: weak boots refactored in browser/graph-layout/vision/motion/policy/grammar/
   shell/focus-lens; fixed sleeps replaced with `expect.poll` or frame waits; exact DOM counts relaxed
   to bounded or derived assertions; four overlapping smoke suites and the self-writing byte snapshot
   disabled with reasons; hash identity relaxed to config/geometry signatures; the library negative
   control uses `pnpm`, an ephemeral port and readiness polls. `retries: 0` and clean-server boot are
   set in `app/pi/playwright.config.ts`.
5. Gallery evidence: five `ui-*` shots, `pnpm run shots:compare` (incumbent/variant PNG pairs for all
   eight non-incumbent presets), and `pnpm run compare:ui` writing pending ADR 0008 decision stubs
   with concrete image paths. Human verdicts still go in `review.json`.
6. Root gates: `test/interaction.spec.ts` reads the widget through
   `pluginManager.getPlugin('HoverMetaWidget').overlay` and its `title="Focus"` action instead of the
   absent `.sg-hover-meta-widget` class and `data-action`; the vision fixture passes `{ global: true }`
   as the third `SpaceGraph.create` argument so `SpaceGraph.instances` is populated, and raises
   `__overlapsForced` when pins are set. Both waits are state-based.

### Verification run

- Root: `pnpm run check` — all workspace typechecks green.
- Root: `pnpm run test:behavioral -- --workers=2` — **5 passed** (was 2 passed / 3 failed).
- Root: `pnpm run test:vision -- --workers=2` — **1 passed** (was 0 passed / 1 failed).
- Root collection check: disabled suites are no longer collected; kept suites parse.
- `app/pi`: `pnpm run check:fast` — 30 files, 162 tests green (includes the graph-baseline snapshot
  in `tests/graph-layout.test.ts`; no layout change, so no regeneration).
- `app/pi`: `pnpm run test:e2e -- --workers=2` with `retries: 0` — **138 passed**.
- `app/pi`: `pnpm run verify:visual` — 24 passed.
- `app/pi`: `pnpm run shots:all` — 29 passed; byte-level capture noise in tracked PNGs was reverted.
- `app/pi`: `pnpm run scale` — all budgets met (20,105 nodes in 7.8 ms; 60-turn layout 929.2 ms).
- `app/pi`: `pnpm run shots:compare` — 8 passed; pair PNGs under `docs/screenshots/ui-presets/<id>/`.
- `app/demo`: `host.spec.ts` — 10 passed.

### Remaining work — clarified

1. **Human gates — the only blocking work.** Add `ui-*` verdicts to `docs/screenshots/review.json`,
   run the five-question pilot with `?studyUI=<preset>` (`docs/pi-study.md:38-42`, `__study.ui`), then
   close the matching `decision` in `docs/screenshots/ui-presets/comparison.json` and ADR 0008. A
   default flip needs that logged human decision; no verdict or pilot result is generated here.
2. **Root-level gates — resolved.** `test/interaction.spec.ts` asserted a `.sg-hover-meta-widget`
   class and `button[data-action]` that the widget does not expose; it now reads the overlay through
   `pluginManager.getPlugin('HoverMetaWidget')` and locates `button[title="Focus"]`.
   `test/vision.spec.ts` failed because the fixture put `global: true` in the graph spec, while
   `SpaceGraph.create` reads it from the third options argument; `SpaceGraph.instances` was empty, so
   `VisionAssert.getReport()` returned an empty report. The fixture now passes `{ global: true }`
   correctly and raises `__overlapsForced` after pinning; both gates pass at `retries: 0` style waits
   with no fixed sleeps.
3. **Graph baseline snapshot (§6 row 3) stays a gate.** `tests/graph-layout.test.ts` deep-equals
   `docs/screenshots/graph-baseline.json` and ran green inside `check:fast`. No layout changed in these
   slices, so the snapshot was not regenerated. If a layout change lands, capture `measure()` from that
   test into the JSON, review the diff, and keep the invariant assertions at lines 38–83 as the
   behavioral gate.
4. **Keep defaults untouched.** No preset is a default until ADR 0008 closes; `uiChrome` is set only
   when a preset is applied, so an unlabelled session keeps the shipped DOM.
5. **`task-1` … `task-5` presets are deliberately absent.** They need pinned per-question bundles and
   a pilot result; inventing their knobs would fabricate evidence.
6. **Release-boundary full gates (Phase 3 §2) — run and green.** Root `pnpm run check`; from `app/pi`,
   `check:fast`, `test:e2e`, `verify:visual`, `shots:all`, `scale`. The `shots:all` capture rewrote only
   byte-level render noise in tracked PNGs, so the curated gallery was restored. The remaining Phase 3
   §3 doc updates (`CHANGELOG.md`, `app/pi/README.md`, `docs/pi-study.md`, stale cross-references) wait
   for a closed finding; no docs changed without a human decision.

### Handoff notes

1. Read `AGENTS.md`, `TODO7.md:58-84` and `docs/pi-study-ui-audit.md` before starting.
2. Use `pnpm` for all commands; never `bun`.
3. Tier the loop: `check:fast` / `shots:focus` while iterating, `test:e2e` / `shots:all` at a slice
   boundary (`TODO7.md:243`). Use `--workers=2` on memory-constrained hosts.
4. `retries: 0` and clean-server boot are now active; keep new waits state-based, never time-based.
5. Keep increments reviewable; commit only when explicitly asked (prior slices were committed on request).
6. Keep the vision fixture's `{ global: true }` create option and `__overlapsForced` flag; the
   assertion reads `SpaceGraph.instances`, not `window.sg`.
