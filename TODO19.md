# TODO19 — Terminal 3: zoom-progressive text, graphs within graphs

> **Status: in progress (2026-11-28).** Extends `TODO18.md` (complete) with the work that landed
> after its close-out and the remaining queue. The console is now a fidelity ladder and a graph seed;
> this plan makes that surface legible, precise, and structurally connected. Ideas come from
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
`terminalFocusWeights`, `terminalMovePoint` and `terminalDetailSize` are **substrate to add**, not
existing exports. Keep each as a pure primitive in `src/terminal.ts` with a unit test before host use.

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

## 8. Remaining queue

| # | Outcome | Anchor | Effort / risk |
| - | ------- | ------ | ------------- |
| 1 | O1 CSS for `data-line-no`/`data-source`/wrap flags | `app/pi-durable/index.html:97` | S / low |
| 2 | O1 `terminalWrapRows` shared with `terminalLineSize` | `src/terminal.ts:~135` | M / low |
| 3 | O1 presentation flags in `Address` | `app/pi-durable/src/address.ts:7` | S / low |
| 4 | O2 `terminalTokens` + match-boundary composition | `src/terminal.ts:1242` | M / medium |
| 5 | O2 `terminalFocusWeights` + `focusDimming` | `app/pi-durable/src/console-model.ts:190` | S / low |
| 6 | O2 safe markdown detail + `terminalDetailSize` | `app/pi-durable/src/host.ts:~3700` | M / medium |
| 7 | O3 `terminalMovePoint` + character Shift+Arrow | `src/terminal.ts:~520`, `mountTerminalA11y` | M / low-med |
| 8 | O3 exact excerpt/export with offsets, role, at | `src/terminal.ts:1150` | M / low |
| 9 | O4 `terminalFacets` + `selector.facet` + `/filter` facets | `src/terminal.ts:596`, `host.ts:~1940` | M / low |
| 10 | O4 sidecar facet instead of literal `"error"` | `app/pi-durable/src/host.ts:~2187` | S / low |
| 11 | O5 `terminalEdges` + `terminalGroup`, opt-in graph projection | `src/terminal.ts:1665`, `console-model.ts:201` | M / low |
| 12 | O5 `reveal:'select'` parity in `consoleModel` | `app/pi-durable/src/console-model.ts:78` | S / low |
| 13 | O6 chapter groups → `buildScopeForest` portals | `app/pi-durable/src/host.ts:~2948` | L / medium |
| 14 | O6 fixed-width octave inheritance bug | `src/terminal.ts:246` | S / low |
| 15 | O7 continuous `ScaleDomain` sample + `playRepresentationChanges` | `src/zoom/ScaleDomain.ts:98`, `host.ts:2092` | M / medium |
| 16 | O8 `mountReading` for the console reading dialog | `app/pi-durable/src/host.ts:2590` | S / low |
| 17 | O8 a11y mirror and help parity at every fidelity band | `host.ts:2433`, `client.ts:420` | S / low |

### Additional useful work, not yet scoped

- Surface dirty-projection/churn telemetry (`TerminalChurn`) in `consoleQuality()` or `/why` so LOD
  and region thresholds can be tuned from data instead of guesses.
- Add a story or `console-chrome` capture once O1 lands, so reading chrome is visually asserted.
- Document the console fidelity and graph-growth vocabulary in `README.md` and `docs/glossary.md`
  (band / level / rung / scope already share one glossary).
- Recheck DOM budget after O5/O6: group frames add nodes; `checkQuality` must stay green.
- Keep `logLayout`, `chapterPacking`, `LaneLayout` and `diffPositions` unused until a real need appears.

## 9. First change

Start with queue item 1 + 2: make the existing presentation flags visible and give wrapped rows
stable character offsets. It is the highest visible payoff, has no host-state risk, and prepares the
selector identity that O2–O4 reuse. Keep all flags off by default and add one capture only if the
visual shape changes.
