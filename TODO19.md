# TODO19 — Terminal 3: zoom-progressive text, graphs within graphs

> **Status: complete (2026-11-28).** Extends `TODO18.md` (complete). All eight outcomes landed; §7
> records each commit and its verification, §8 separates done work from the optional follow-ups that
> were deliberately left out of scope. The console is a fidelity ladder and a graph seed whose text,
> chrome, ranges, facets, edges, chapters and a11y all use the one projection. Ideas came from
> [autonull/fracterm](https://github.com/autonull/fracterm), TODO17 §3, TODO4 K1–K4 and TODO5 Phase 4.
> The fidelity decision in TODO17 §3 still stands: no PTY, VT/ANSI/SGR or second console store.

## 0. Outcome

- **Text has zoom fidelity.** A line is a glyph far away, a short label at mid zoom, full text near,
  and full text with reading chrome at grain zoom. Fidelity follows the camera or is pinned and
  shareable; identity never changes with it.
- **Structure appears at scale.** Chapters and regions become visible bands; a line grows a bounded
  graph; a chip in that graph becomes the main graph; a graph node opens back into the console.
- **Text is precise.** Line numbers, source stamps, wrapped rows, inline tokens, character ranges,
  safe detail markup and facets over committed fields are all addressable through the one projection.
- **Adding a capability** still means one selector + one command id + one E2E assertion, never a new
  view slot, renderer, text index, command registry or codec.

## 1. Leverage inventory — reuse, do not rebuild

| Already in SpaceGraphJS | Use it for | Do **not** build |
| ----------------------- | ---------- | ---------------- |
| `src/terminal.ts`: `terminalLODFor`, `terminalLineHTML`, `terminalGrow`, `terminalChapters`, `terminalRegions`, `terminalLensIDs`, `terminalRange*`, `terminalFlatten`, `terminalSearch`, `terminalDerived` | fidelity, structure, identity, growth | a second text index or LOD table |
| `src/inspect/inner-topology.ts`: `innerTree`, `innerPlacements`, `innerConnectors` | bounded graph inside a line | recursive DOM or renderer children |
| `src/overlays/subgraph.ts`: `extractSubgraph` | alternative neighbourhood scope | another graph walk |
| `src/navigation`: `Trail`, `kindDescent`, `edgePath` | lens history and breadcrumbs | a back/forward stack |
| `src/salience`: `applyModelEmphasis`, `mappingFor` | focus/search dimming | a second emphasis system |
| `src/reading`, `src/documents`, `src/markup`: `readingHTML`, `safeDocumentHTML`, `escapeHtml` | readable detail and inline tokens | trusted host HTML |
| `src/zoom/ScaleDomain`, `src/representations/playback.ts`: `playRepresentationChanges` | continuous fidelity and reduced-motion crossfade | a new animation system |
| `src/layout`: `chapterPacking`, `LaneLayout`, `octaveLayout`, `diffPositions` | chapter scales and framed portals | a new band vocabulary |
| `src/quality`: `checkQuality` | DOM budget, direction and motion gates | a second visual gate |
| `spacegraphjs/commands`: `CommandRegistry`, `matchCommand` | one catalog for `/`, palette, menu, keys, help | ad-hoc key handlers |
| `spacegraphjs/view-state`: `viewStateCodec` | lens, bookmark, fidelity in `Address` | a separate URI codec |
| `@spacegraphjs/kernel`: `query().traverse`, `diffKernels`, `GraphHistory` | graph growth and provenance | a second store |

`terminalEdges`, `terminalGroup`, `terminalWrapRows`, `terminalTokens`, `terminalFacets`,
`terminalFocusWeights`, `terminalMovePoint`, `terminalDetailSize` and the `terminalFidelity*` helpers
were added as pure primitives in `src/terminal.ts`, each with a unit test before host use. This
inventory is the leverage check: a future capability should still need no new renderer, view slot,
text index, command registry or codec.

## 2. Invariants

1. One committed fold: a lens or LOD is a read model; it never writes facts.
2. Identity is line id + offset only — never x/y, DOM index, window, zoom or fidelity.
3. Text stays text; glyph and label stages carry the full text in `aria-label`/`title`.
4. Vector first: gaps, margins, regions and cards are scene values; the camera is the scroll.
5. Visual defaults stay stable: new chrome/tokens/edges are opt-in so the 15 console captures hold.
6. Escape-first markup: all host text is escaped before it enters `innerHTML` or SVG.
7. Graph nesting is host DOM/SVG only (`innerTree` depth ≤ 3, chip cap ≤ 6); no `RenderNode.children`.
8. Reduced motion snaps every animated fidelity, camera, replay and graph transition.
9. One command catalog; capabilities are selectors over the one console projection.

## 3. Outcomes

### O1 — Visible reading chrome and stable wrap rows

**Outcome:** presentation flags become visible, and wrapping keeps id+offset spans intact.

- Library: `terminalWrapRows(text, columns, widthOf) → {text,start,end,width}[]`; `terminalLineSize`
  uses its length so wrap and geometry share one source. `lineHTML` emits `<span class="tg-row">`,
  `<span class="tg-line-no" aria-hidden>` and `<time class="tg-source">` when flags are set.
- Host: CSS for `[data-line-no]`, `[data-source]`, `.sg-terminal-wrap`, `.sg-terminal-reflow`
  (`app/pi-durable/index.html:97`); put presentation flags in `Address` so chrome is bookmarkable.
- Proof: row-offset tests with wide/combining glyphs, `console-model` markup test, one E2E with a
  `?pal=`-free chrome permalink, one `console-chrome` capture.
- Effort: medium. Depends on: none. Risk: low (flags default off).

### O2 — Structured text, focus dimming and safe details

**Outcome:** console text is a real text surface, not escaped plain strings.

- Library: `terminalTokens(text)` for `code|link|strong|em` using the existing inline grammar and
  safe-href rules; compose token boundaries with search match boundaries before escaping.
  `terminalFocusWeights(lines, focusID, selectedIDs, matchIDs)` feeding `applyModelEmphasis`.
  `terminalDetailSize(detail, grid)` from `parseDocument` block count; `terminalDetailHTML(..., {format:'markdown'})`.
- Host: `presentation.inlineTokens`, `presentation.focusDimming`, markdown detail behind a profile;
  replace hardcoded 30/84px card sizes (`app/pi-durable/src/host.ts:~3700`).
- Proof: token/match overlap and `javascript:`/`onerror` rejection, dimming assertions, detail E2E.
- Effort: medium. Depends on: O1. Risk: medium locally, mitigated by escape-first composition.

### O3 — Character-precise selection, bookmarking and export

**Outcome:** identity at offset level is usable from the keyboard and in exports.

- Library: `terminalMovePoint(flat, point, delta)` walking character indices and using
  `terminalMoveLine` at boundaries; exact `terminalExcerpt(..., { exact: true })` and JSON export
  including `role`/`at`/offsets.
- Host: `Shift+ArrowLeft/Right` in `mountTerminalA11y`; "bookmark selection" stores a `range` lens
  target via `terminalBookmark`; `/copy` stays char-exact.
- Proof: point movement across lines/clamps, range-key with non-zero offsets, E2E select→copy→export.
- Effort: medium. Depends on: none. Risk: low-medium (key handling).

### O4 — Faceted search and derived monitors

**Outcome:** structured facts are queryable, not just text.

- Library: `terminalFacets(lines) → Map<'kind:tool', count>` over `kind/status/role/turn/at`;
  `TerminalSelector.facet` applied before search/window in `terminalSelect`.
- Host: `/filter kind:tool status:failed` composes facets; the `logtail` sidecar uses a facet instead
  of literal `"error"` (`app/pi-durable/src/host.ts:~2187`); one catalog id.
- Proof: facet counts, seeded selector invariants, E2E search/filter/sidecar.
- Effort: medium. Depends on: none. Risk: low.

### O5 — Real console graph edges and group frames

**Outcome:** the console can be read as a graph without becoming a different renderer.

- Library: extract `terminalEdges(lines, visible, layout, overlays)` from `terminalSpec`
  (`src/terminal.ts:1665-1686`); add `terminalGroup(target, lines)` deriving members from
  `terminalLensIDs` and a box from already-offset line nodes.
- Host: opt-in `ConsoleModelState.graphTarget`/`edges`; emit `shape:'group'` with `data.members`
  and child `parent`, spine/parent/overlay edges with deduped ids and visible endpoints only. Pass
  `selected` into `terminalOverlays` so `reveal:'select'` works (`console-model.ts:78`).
- Proof: `terminalEdges` unit tests, group-frame E2E, `checkQuality` on the projected window.
- Effort: medium. Depends on: O1 for chrome parity. Risk: low when opt-in.

### O6 — Chapter scopes as framed portals

**Outcome:** a chapter grows into a real subgraph frame, not only the opt-in `console:` card.

- Library: `terminalChapterTargets(chapters)` maps each chapter to a `window` lens target;
  reuse `buildScopeForest` and `ScopeFrame` rather than new layout code.
- Host: extend `#groupFrom(kernel)` (`app/pi-durable/src/host.ts:~2948`) with chapter groups;
  portal click descends, `consoleFocus(window)` returns; keep `detail.spec.ts` band count intact.
- Proof: scope tests, chapter navigation E2E, one framed portal capture.
- Effort: large. Depends on: O5. Risk: medium (existing group pipeline).

### O7 — Continuous fidelity and motion

**Outcome:** fidelity is continuous and transitions are smooth with reduced-motion snapping.

- Library: use `ScaleDomain.sample(normalized).importance` for LOD opacity/rhythm; drive changes
  through `playRepresentationChanges` (stable ids, easing, reduced-motion snap).
- Host: feed camera zoom into a dedicated console sample (`regrade()` skips transcript today);
  replace the one-shot CSS/WAAPI fade (`app/pi-durable/src/host.ts:2092`) only when the continuous
  path is proven. Do not scale node sizes again — the camera already does.
- Proof: scale-domain and playback tests, reduced-motion E2E, no DOM-budget regression.
- Effort: medium. Depends on: O1–O5. Risk: medium.

### O8 — Ergonomics and accessibility parity

**Outcome:** every console capability is discoverable and mirrored for assistive tech.

- Host: `mountReading` on `#console-reading-body` with arrow navigation and backlink reveal
  (currently raw `innerHTML` at `app/pi-durable/src/host.ts:2590`); `AccessibilityLayer` mirrors
  glyph/label stages with full text; announce fidelity and graph growth; help lists `/grow`, `/embed`,
  `/lod`, `x` and Escape behaviour.
- Proof: reading-lens E2E, a11y mirror at each fidelity band, help listing test.
- Effort: medium. Depends on: O1, O2. Risk: low.

## 4. Sequencing

```
O1 ──► O2 ──► O3 ──► O5 ──► O6
           │           ▲
           └── O4 ─────┘        O7 last, O8 throughout
```

1. O1 first: chrome and wrap rows are the highest visible payoff and unblock legibility work.
2. O2/O3 next: structured text and precise ranges make search, export and a11y coherent.
3. O4 is independent and can land in parallel; it exercises the selector before graphs extend it.
4. O5 then O6: edges/frames need stable ids; portals need frames. O7 needs all of the above.
5. Merge check before each outcome: if it needs a new renderer, view slot, text index, command
   registry or codec, the design is wrong — go back to §1.

## 5. Definition of done and verification

Per outcome: pure primitive + unit test in `test/terminal.test.ts`; host wiring in `console-model.ts`
or `host.ts`; E2E in `app/pi-durable/tests/`; a console shot only when visual shape changes; progress
recorded in §7.

- Tier 1: package `typecheck`, `pnpm --filter pi-durable check:fast`, `pnpm run test:exports`.
- Tier 2: `pnpm run check` and `pnpm test` from the repository root.
- Tier 3: `pnpm run check:generated`, `check:console-shots`,
  `pnpm --filter pi-durable verify:fast`, and `shots:console` on shape changes.
- `checkQuality(model)` on each projected window; `visionAssert` only for visual-grading changes.
- Property/fuzz tests use fixed seeds and pure functions; no kernel mocks.

## 6. Deliberately not imported

Same exclusions as TODO18 §6: PTY, terminal parser, VT/ANSI/SGR, alt screen, scrollback grid,
cursor-control emulation, OSC 8/52, mouse-mode forwarding, kitty keyboard protocol, plugin VMs,
permission systems, OpenGL/render-graph work, desktop integration and terminal-state save/restore.
Also excluded: nested `RenderNode.children`, recursive host DOM beyond `innerDepth ≤ 3`, and a second
console store. The kernel remains the durable store; layouts stay arrangement-only.

## 7. Progress

### Post-TODO18 clean-up — landed 2026-11-28

- `fbaf099` — deduplicated console projection and host plumbing: shared point/lens codecs, grouping
  helper, palette tokens, one grid/layout/overlay lifecycle, selector-owned search state; fixed the
  dead region-distance boundary, profile grid mutation, lens-trail loss for `range`/`window`, and
  completion placeholders. Net −74 source lines across `src/terminal.ts` and `host.ts`.
- **Verification:** root `check`, `pnpm test` (201 / 1388), `test:exports`, `check:generated`,
  `check:console-shots` (14), Pi Durable `verify:fast` (106 unit / 104 E2E, 19 capture-only skipped).

### Zoom fidelity — landed 2026-11-28

- `2020d76` — `terminalLODFor` maps continuous zoom to `dot|glyph|card|detail`; `terminalLineHTML`
  renders far bands as glyphs; renderer bands are bridged at the sink; a `fractal` profile makes LOD
  opt-in so default captures stay stable. Added `zoom-lod.spec.ts` and `console-fractal`.
- `fd5f8d2` — LOD-gated chapter labels and `reveal:'hover'` peek cards use the dormant overlay policy.
- `b20ab8c` — three-stage glyph → label → text ladder with configurable stops; `/lod <band|auto>`
  pins fidelity; `lod` round-trips through compact and full permalinks; LOD initialises from camera.
- **Verification:** root `check`, `pnpm test` (201 / 1392), `check:generated`, `check:console-shots`
  (15), Pi Durable `verify:fast` (108 unit / 107 E2E, 20 capture-only skipped).

### Graphs within and around the console — landed 2026-11-28

- `24231ee` — `terminalGrow` grows a bounded `innerTree` from a console line; `/grow` renders it as
  a safe SVG/chip overlay whose chips descend into the main graph. `/embed [on|off]` injects a
  `console:<tab>` card with a structural `contains` edge; revealing it returns to the transcript.
- `6ac6455` — polish: reduced-motion-aware fidelity fade, directional spokes, kind accents,
  staggered chips, `x` to grow and Escape to collapse.
- **Verification:** root `check`, `pnpm test` (201 / 1394), `check:generated`, `check:console-shots`
  (15), Pi Durable `verify:fast` (108 unit / 110 E2E, 20 capture-only skipped). `grow.spec.ts`
  covers both directions and the keyboard path.

### O1 — Reading chrome and stable wrap rows — landed 2026-11-28

- `bc27e4e` — `terminalWrapRows` keeps UTF-16 offsets and display widths and is the single source for
  wrapping and `terminalLineSize` geometry. Full-text lines render escaped `tg-line-no`, `tg-source`
  and `tg-row` spans; `Address.pres` makes presentation flags bookmarkable in both codecs. Added CSS
  for the chrome classes, `console-chrome` capture and a `?pal=`-free permalink E2E.
- **Verification:** root `check`, `pnpm test`, `test:exports`, `check:generated`,
  `check:console-shots` (16), Pi Durable `verify:fast` (109 unit / 111 E2E, 20 capture-only skipped).

### O2 — Structured text, focus dimming and safe details — landed 2026-11-28

- `4f10d7f` — `terminalTokens` emits `code|link|strong|em` with source offsets; token and search
  boundaries are composed before escaping, with `javascript:`/`onerror` hrefs rejected.
  `terminalFocusWeights` feeds `applyModelEmphasis`; `terminalDetailHTML` and `terminalDetailSize`
  parse markdown blocks behind the opt-in `documents` profile, replacing hardcoded card sizes.
- **Verification:** root `check`, `pnpm test`, `check:generated`, `check:console-shots` (16),
  Pi Durable `verify:fast` (110 unit / 112 E2E, 20 capture-only skipped). `structured-text.spec.ts`
  covers the safe detail path and shareable flags.

### O3 — Character-precise ranges — landed 2026-11-28

- `71d529c` — `terminalMovePoint` walks flat character indices across line boundaries;
  `Shift+ArrowLeft/Right` extends a selection one character at a time. `terminalExcerpt(...,
  { exact: true })` trims boundary lines, JSON export carries `role`, `at` and global offsets, and
  `/bookmark` stores the current selection as a `range` lens target.
- **Verification:** root `check`, `pnpm test`, `check:generated`, `check:console-shots` (16),
  Pi Durable `verify:fast` (110 unit / 112 E2E, 20 capture-only skipped).
  `character-selection.spec.ts` covers select → export → bookmark.

### O4 — Faceted search and derived monitors — landed 2026-11-28

- `3b6b3cd` — `terminalFacets` counts `kind/status/role/turn/at`; `TerminalSelector.facet` applies
  before search and windowing (OR within a key, AND across keys). `/filter` composes facets and the
  `logtail` sidecar follows `status:failed` instead of a literal `"error"`. Fixed a real defect:
  search spans now stay global when a selector narrows the lines, so marks map onto committed lines
  instead of the filtered subset.
- **Verification:** root `check`, `pnpm test`, `check:generated`, `check:console-shots` (16),
  Pi Durable `verify:fast` (110 unit / 112 E2E, 20 capture-only skipped). Seeded selector invariants
  and `facets.spec.ts` cover the composition.

### O5 — Real console graph edges and group frames — landed 2026-11-28

- `4032cd7` — `terminalEdges` was extracted from `terminalSpec` with deduped ids and visible-only
  endpoints; `terminalGroup` boxes lens-addressed line nodes. Opt-in `graphEdges` projects a group
  frame with `data.members`, child `parent` links and structural edges. `reveal: 'select'` overlays
  now receive the selected set, and `consoleQuality()` covers the projected window.
- **Verification:** root `check`, `pnpm test`, `check:generated`, `check:console-shots` (16),
  Pi Durable `verify:fast` (112 unit / 114 E2E, 20 capture-only skipped). `console-graph.spec.ts`
  covers frames, edges and DOM budget.

### O6 — Chapter scopes as framed portals — landed 2026-11-28

- `b5d3e1b` — `terminalChapterTargets` maps chapters to `window` lens targets; opt-in chapter group
  frames share the O5 group path. A frame carries its `lens` key so activation descends with
  `consoleFocus(window)` and `consoleTrailBack()` returns. Fixed the fixed-width placement bug:
  inherited octaves now drive placement instead of a hardcoded `0`. Added the `console-chapters`
  capture; `detail.spec.ts` band counts remain unchanged because chapter frames are transcript-only.
- **Verification:** root `check`, `pnpm test`, `check:generated`, `check:console-shots` (17),
  Pi Durable `verify:fast` (112 unit / 116 E2E, 20 capture-only skipped).

### O7 — Continuous fidelity and motion — landed 2026-11-28

- `1847452` — `terminalFidelity` derives opacity and stagger from a `ScaleDomain` importance sample;
  `terminalFidelityChange` and `playTerminalFidelity` route band swaps through the shared playback
  clock with reduced-motion snapping. The host feeds console zoom into a dedicated scale sample,
  replaces the one-shot fade when `continuousFidelity` is on, and never rescales node geometry.
- **Verification:** root `check`, `pnpm test`, `check:generated`, `check:console-shots` (17),
  Pi Durable `verify:fast` (112 unit / 118 E2E, 20 capture-only skipped).
  `fidelity-continuous.spec.ts` covers zoom opacity, reduced motion and DOM budget.

### O8 — Ergonomics and accessibility parity — landed 2026-11-28

- `6e590de` — the console reading dialog uses `mountReading` with arrow navigation and backlink
  reveal; the assistive mirror already carries full text at every band and is asserted there.
  Fidelity and graph growth are announced through existing paths; help lists `/grow`, `/embed`,
  `/lod`, `/graph`, `x` and Escape. Command hints now describe faceted filtering and profiles.
- **Verification (final):** root `check`, `pnpm test` (201 files / 1417 tests), `test:exports`,
  `check:generated`, `check:console-shots` (17 captures), Pi Durable `verify:fast` (112 unit /
  120 E2E, 22 capture-only skipped). `reading-lens.spec.ts` and `prompt.spec.ts` cover the path.

### Post-closure re-verification — 2026-11-28

- Every command in §9 was re-run from a clean tree: `build:lib`, `check`, `pnpm test` (201 files /
  1417 tests), `test:exports` (6), `source:snapshot` + `check:generated`, `check:console-shots`
  (17 captures), Pi Durable `verify:fast` (120 E2E, 22 capture-only skipped). All green, no drift.
- No implementation work remains. The items in §8's deferred list need a concrete consumer and a
  new TODO; none is a follow-up to this plan.

## 8. Queue status — all 17 items landed

| # | Outcome | Where it landed | Status |
| - | ------- | --------------- | ------ |
| 1 | O1 CSS for chrome flags | `app/pi-durable/index.html`, `console-chrome` capture | done in `bc27e4e` |
| 2 | O1 `terminalWrapRows` shared with geometry | `src/terminal.ts` | done in `bc27e4e` |
| 3 | O1 presentation flags in `Address` | `address.ts`, `host.ts`, `terminalPresentationKey` | done in `bc27e4e` |
| 4 | O2 `terminalTokens` + boundary composition | `src/terminal.ts`, `console-model.ts` | done in `4f10d7f` |
| 5 | O2 `terminalFocusWeights` + `focusDimming` | `src/terminal.ts`, `console-model.ts` | done in `4f10d7f` |
| 6 | O2 safe markdown detail + sizing | `terminalDetailHTML`, `terminalDetailSize`, `documents` profile | done in `4f10d7f` |
| 7 | O3 `terminalMovePoint` + character Shift+Arrow | `src/terminal.ts`, `mountTerminalA11y` | done in `71d529c` |
| 8 | O3 exact excerpt/export with metadata | `terminalExcerpt`, `terminalExport` | done in `71d529c` |
| 9 | O4 facets in one selector + `/filter` | `src/terminal.ts`, `host.ts`, `facets.spec.ts` | done in `3b6b3cd` |
| 10 | O4 sidecar uses a status facet | `CONSOLE_MONITOR_FACET` in `host.ts` | done in `3b6b3cd` |
| 11 | O5 `terminalEdges` + `terminalGroup` projection | `src/terminal.ts`, `console-model.ts` | done in `4032cd7` |
| 12 | O5 `reveal: 'select'` parity | `terminalOverlays(..., { selected })` | done in `4032cd7` |
| 13 | O6 chapter frames as portals | `terminalChapterTargets`, `console-model.ts`, `host.ts` | done in `b5d3e1b` |
| 14 | O6 fixed-width octave inheritance | `terminalPlace` | done in `b5d3e1b` |
| 15 | O7 continuous sample + shared playback | `terminalFidelity*`, `playTerminalFidelity`, host CSS var | done in `1847452` |
| 16 | O8 `mountReading` for console reading | `readConsole`, `closeConsoleReading` | done in `6e590de` |
| 17 | O8 a11y and help parity at every band | `#syncConsoleA11y`, `consoleHelp`, command hints | done in `6e590de` |

### Deliberately left for a later plan

These are useful but were not needed to meet TODO19's definition of done. Start a new TODO with one
of them only when a concrete consumer exists.

- **Churn telemetry:** surface `TerminalChurn` (already returned by the controller) in
  `consoleQuality()` or `/why` so LOD and region thresholds can be tuned from data. Needs a host
  decision on which channel an operator reads; the pure data is already available.
- **Vocabulary docs:** write the fidelity/graph-growth terms into `README.md` and `docs/glossary.md`
  (band / level / rung / scope already share one glossary). Needs docs ownership and a docs E2E only
  if the entries are tested.
- **Editor layout primitives:** keep `logLayout`, `chapterPacking`, `LaneLayout` and `diffPositions`
  unused; nothing in O1–O8 needed a new band vocabulary.
- **Full portal click coverage:** O6 handles activation in the host `onReveal` path and the E2E drives
  the same window lens via `consoleFocus`. A pixel-level click test is only worth adding if the group
  frame becomes independently hit-testable above line nodes.

### Resolved from the old "additional work" list

- Chrome capture and story assertion — `console-chrome` and `console-chapters` captures landed; both
  are guarded by `check:console-shots`.
- DOM budget after O5/O6 — `console-graph.spec.ts` asserts `consoleQuality()` on the projected
  window; the 17 committed captures still satisfy the studio check.

## 9. Closure and verification entry points

No first change remains. To re-verify the plan after a future edit, run these from the repository
root in order:

```sh
pnpm run build:lib                                   # app packages consume dist types
pnpm run check                                       # root + every package typecheck
pnpm test                                            # library unit tests
pnpm run test:exports
pnpm run source:snapshot && pnpm run check:generated # committed source-graph snapshot
pnpm run check:console-shots
pnpm --filter pi-durable verify:fast                 # unit + full E2E suite
```

Regenerate captures only when visual shape changes:
`pnpm --filter pi-durable shots:console <shot-id>`, then commit the new PNG and re-run
`check:console-shots`.
