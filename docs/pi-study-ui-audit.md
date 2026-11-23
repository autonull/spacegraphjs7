# PI study UI/UX audit — 2026-11-22

## Scope and method

Target: the PI flagship and its participant-facing five-task study (`app/pi`). Deliverable is a written audit only; no code was changed.

Inputs inspected:

- Gallery PNGs (all current, regenerated 12:15–12:17): `pi/pi-agent-in-action`, `pi/pi-agent-catalog`, `pi/pi-agent-preset`, `pi/pi-agent-node-detail`, `pi/pi-agent-deep-focus`, `pi/pi-agent-fractal`, `pi/pi-agent-light`, `pi/pi-agent-dense-type`, `pi/pi-agent-layout-stacked`, `pi/pi-agent-layout-floating`, plus the fit matrix.
- Implementation: `app/pi/index.html`, `app/pi/study.html`, `app/pi/src/host.ts`, `src/catalog.ts`, `src/panel.ts`, `src/shell/{tokens,inspector,frames}.ts`, `src/study-page.ts`, `src/study.ts`, `src/capabilities.ts`, `src/shots.ts`.
- Purpose and protocol: `README.md:201-235`, `app/pi/README.md`, `docs/pi-study.md`, `docs/screenshots/README.md`.

Relation to the existing audit: `docs/screenshots/reports/audit.json` (same date) covers pixel-level legibility, overlap, keyboard, transcript arrangements and reduced motion; every finding there is closed. This audit does **not** re-report AUDIT-01…07. It covers task-level usability, information architecture, ergonomics, learnability, semantics and aesthetics — the dimensions the existing gates do not measure.

## User and task model

Two users share one UI:

1. **Study participant** — answers five causal questions (`docs/pi-study.md:15-21`) under time pressure, across surfaces `log`/`map`/`hybrid`, with no prior training. Success, elapsed time, wrong turns and preference are recorded.
2. **Developer / reviewer** — inspects an agent run, switches presets and policy knobs, exports evidence, and checks capability claims in the proof catalog.

Typical participant results: find which tool call preceded the failing test, what a subagent contributed, and what changed after the failure. The UI must make causality and ordering readable without teaching a vocabulary first.

## What works — keep

- Grayscale chrome with color reserved for the view; square surfaces; no blur or blend modes (`TODO6.md:15-17`, `app/pi/src/shell/tokens.ts:34-38`).
- Strong ARIA coverage: dialog/tablist roles, `aria-keyshortcuts`, `aria-pressed`, `aria-expanded`, live status frame, 44px primary targets, RTL-aware tab arrows (`index.html:1764-1776`, `src/shell/inspector.ts:56-79`).
- Command palette on `/`, `:` and `?`; transcript stays mounted across all three surfaces; focus lens placed in free space; reduced motion reaches the settled state (`audit.json` AUDIT-09…12).
- Three transcript arrangements and on-demand catalog/rail drawers give the canvas back its width (`README.md:220`).

## Findings

Severity: **high** = blocks the study's stated decision or core tasks; **medium** = meaningful friction; **low** = polish worth recording.

### PIUX-01 (high) — Study flow has no onboarding or practice task

`study.html:76-99` shows only a participant number, "Start counterbalanced run", the question line, and five recording fields. `study-page.ts:42-120` starts timing immediately. There is no practice trial, control legend, or explanation of how to find an answer. The controls needed for the five questions — click a transcript row to reveal its node, double-click an edge to travel, `f` to focus, `t` to trace, `/` for commands — live in a rail `Reference` group (`index.html:1981-2017`) and in `app/pi/README.md:66-68`, neither of which a participant sees before timing starts.

Why it matters: `docs/pi-study.md:6-9` decides whether immersive navigation beats linear navigation on success and time. A participant who does not know the affordances measures interface literacy, not spatial navigation. This is a validity risk for the study, not just a usability nit.

Recommendation: add one untimed practice task on the canonical fixture before trial 1, with a persistent five-line control card (pan, zoom, reveal, trace, home) shown in the study aside. Record practice completion but exclude it from trial metrics. Verify with a study e2e assertion that trial 1 cannot start before the practice step.

### PIUX-02 (high) — No primary index; five navigation systems compete

The rail exposes SCOPES, TURN MAP, TRAIL, PORTAL PATH and MINIMAP simultaneously inside one 200px column (`index.html:1925-1943`). The transcript is a second index with its own scrubbable overview (`host.ts:2972-3004`). The graph is a third. The command palette is a fourth. The catalog/gallery is a fifth. Every gallery screenshot shows these stacked in a narrow strip beside a graph whose labels are smaller than the rail labels.

Why it matters: for "why did the agent change `auth.ts`?", a user must choose between a linear transcript, a spatial graph, a scope list, a turn list and a trail. There is no stated default path, and the choices are presented at equal weight.

Recommendation: declare one primary index per surface — transcript for `log`/`hybrid`, graph for `map` — and collapse the rest into a single closed "Navigate" drawer. Replace the minimap with a single "Fit / overview" action; keep scopes and turn map available on demand. Verify with a DOM assertion that only the primary index is expanded at boot.

### PIUX-03 (medium) — Chrome typography is 10–11px monospace with no comfortable mode

`src/shell/tokens.ts:32` sets `micro: '11px'` and `nano: '10px'`; shared tokens set `xs: '11px'`, `sm: '12px'`, `base: '13px'` (`packages/shared/src/tokens.ts:180-183`). `index.html` uses `xs`/`micro`/`nano` 35 times versus 6 uses of `base`/`lg`/`xl`. The font is monospace everywhere (`tokens.ts:38`). At 1440px, transcript rows and node labels sit at the readability floor; `pi/pi-agent-in-action.png` and `pi/pi-agent-preset.png` show rows such as "user message:" that require close reading. The existing audit measured truncation and occlusion, not absolute type size.

Why it matters: every task depends on reading labels before acting on them. Raising label size in the renderer changes vision gates (AUDIT-03), but chrome typography is host-side and cheap to fix.

Recommendation: make the chrome default 13px body / 12px secondary with a 12px floor; reserve 11px for meta only, 10px for nothing. Offer the current dense scale as an explicit "Compact chrome" preference so the flagship keeps its instrument feel. Leave renderer label policy unchanged. Verify with a computed-style assertion on transcript rows and the rail at 1440px and 900px.

### PIUX-04 (medium) — Event meaning is encoded by color and shape without a legend

Transcript rows carry a colored `::before` dot keyed by kind (`index.html:1454-1478`) with no legend. The top attention chip renders "1 failure · 4 files · test failed" (`host.ts:2867-2876`), where "4 files" does not say whether these are changed files, read files or failures. Status chips on cards do pair color with text ("FAILED", "PENDING", "COMPLETE"), which is the right pattern.

Why it matters: questions 1, 4 and 5 depend on distinguishing tool calls, artifacts, errors and approvals. A participant cannot check a guess against a legend that does not exist.

Recommendation: add a four-item inline legend in the transcript header (user / tool / artifact / error) and reword the attention chip to "1 failure · 4 files changed · latest: test failed". Keep color paired with text or shape everywhere. Verify with a screenshot and a DOM assertion for the legend.

### PIUX-05 (medium) — Domain jargon is the primary chrome vocabulary

Top bar and rail use `proof`, `hybrid`, `flat`, `focus`, `Depth`, `live knobs`, `bands`, `ladder`, `salience`, `guardrails`, `orchestration`, `scopes`, `turn map`, `trail`, `portal path`, `globs` without inline definitions. `proof · 16 presets 3 experiments` is the entry to the catalog, but nothing says that "proof" means capability evidence.

Why it matters: a participant or first-time reviewer cannot map these labels to the five tasks. Tooltips exist on many controls, but tooltips are not a substitute for a readable label.

Recommendation: relabel chrome controls in plain language ("Evidence", "View", "Transcript + graph", "Depth", "Label sizes", "Emphasis", "Safety", "Focus mode"), and move engine vocabulary into tooltips and the Reference group. Keep internal knob ids unchanged so policy URLs stay stable. Verify by screenshot review of the top bar and rail.

### PIUX-06 (medium) — Proof catalog is a flat list and the questions live in three places

`mountCatalog` (`src/catalog.ts:52-82`) renders 19 `<details>` rows with no grouping, search or favorites; `pi/pi-agent-catalog.png` shows them as an undifferentiated stack after the earlier hit-target fix. The same five questions appear as gallery evidence buttons (`src/capabilities.ts:81-333`), as catalog notes, and behind "Replay the five questions" in the rail Reference group.

Why it matters: the catalog is the answer to "what can this thing prove?", yet it makes a reviewer scan 19 equal-weight items. Three entry points to one question set split attention and make it unclear which is canonical.

Recommendation: group catalog rows into three sections (Presets, View experiments, Study questions), add a 40px search input, and make the gallery and Reference entry points link to the single canonical question list. Verify with a DOM assertion that each question id appears once in the catalog.

### PIUX-07 (medium-low) — 200px rail and 240px catalog are structurally too narrow

`index.html:12-34` gives the rail a fixed 200px column and the catalog 240px while the graph takes the remainder. The rail holds 13 policy families plus Navigate, Inspect, Review and Reference groups, its own scrollbar, a "Filter knobs" input, provenance badges and navigation headings. In `pi/pi-agent-in-action.png` and `pi/pi-agent-layout-floating.png`, the PORTAL PATH and MINIMAP labels stack and crowd the minimap frame; long knob labels and "changed only" controls are compressed.

Why it matters: the user must scroll one narrow column to find navigation aids that should be one click away, and cramped labels slow scanning.

Recommendation: widen the rail to 280–320px when open, make it a single on-demand drawer like the catalog, and keep a thin icon strip with four toggles (Navigate, Inspect, Review, Reference) visible at all times. Give stacked navigation headings a consistent row height so labels cannot collide. Verify with a no-overlap assertion at 900px and 1440px.

### PIUX-08 (low) — Default framing wastes vertical space and starts below the reading rung

In `pi/pi-agent-in-action.png` and `pi/pi-agent-living-graph.png`, 18 nodes occupy a horizontal band while roughly half the canvas is empty grid. The default fit leaves labels small enough that the eye goes to the glowing edges before the text. `dense-type` and `deep-focus` show that larger type is possible as an opt-in.

Why it matters: the first frame sets the user's mental model. If text is secondary to glow, the flagship reads as a visualization rather than a working tool.

Recommendation: tighten default vertical insets and start at the execution rung with the label floor raised one step; keep the far-octave topology view as an explicit "Overview" action. Any default LOD change needs an ADR 0008 comparison under `TODO6.md:2.6`. Verify with the fit matrix plus a measurement of label-to-canvas area ratio.

### PIUX-09 (low) — Study page is a bare form with no progress, export or responsive layout

`study.html:76-99` has one participant input, the question line, five recording fields and a `<pre id="report">`. There is no "i / 5" progress, no copy/export button for the report (which `docs/pi-study.md:65` asks the participant to copy by hand), and the fixed 320px aside plus iframe has no small-screen handling.

Recommendation: add a progress indicator, a "Copy report" button, and a stacked layout below 900px. Keep the report text unchanged so `window.__study` consumers are unaffected.

### PIUX-10 (low) — "Light theme" changes the view, not the whole shell

`shots.ts:227-235` launches the light preset with `surface: 'hybrid'`; `pi/pi-agent-light.png` shows light nodes on a light canvas while the top bar, footer and transcript chrome stay dark. This is consistent with "the HUD stays grayscale while color lives in the view", but the label "Light theme" promises a full theme switch.

Recommendation: rename the preset to "Light view" or apply `data-theme='light'` to the shell as well (`src/shell/tokens.ts:106-110` already defines the tokens). Verify with a screenshot showing chrome and view in the same theme.

## Prioritized recommendations

Budget: at most three fixes per change set (`TODO6.md:129`), each with its own gate and recaptured shot where appearance changes.

1. **First change set — study validity.** PIUX-01, PIUX-02, PIUX-04: practice task, one primary index, transcript legend and unambiguous status text. These directly affect the five-task decision.
2. **Second change set — reading and scanning.** PIUX-03, PIUX-05, PIUX-07: comfortable chrome type, plain-language labels, wider on-demand rail.
3. **Backlog.** PIUX-06, PIUX-08, PIUX-09, PIUX-10. PIUX-08 needs an ADR 0008 comparison before changing a default.

## Non-goals

- Re-opening ADR 0015/0016 or the closed findings in `audit.json`.
- Adding new policy knobs, renderer branches or contract fields.
- Pixel identity across camera framing; reduced-motion and fit gates stay as they are.
- Implementing fixes — this document is evidence and recommendations only.
