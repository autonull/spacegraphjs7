# TODO17 — Terminal: a vector console for durable agents

> **Status: Stages 1–4 landed (2026-11-27); only deferred polish remains (§10).** Goal: make Pi Durable useful as a lowest-common-denominator console/terminal
> Agent REPL that faithfully reads like a styled monospace text console while using vector/ZUI space
> to add graph, fractal and margin overlays that a DOM console cannot express.

## 0. Thesis

A text console is the lowest common denominator of agent interaction: an ordered tail of lines, a
prompt, and a caret. SpaceGraphJS can emulate that feel without inheriting its limits. If each
committed entry is a node on an append-only spine in vector space, then line height, inter-line gaps,
gutter columns and margins become writable scene values. An overlay can be inserted *between* two
lines by opening a gap, parked in a margin at half or quarter scale, or disclosed progressively as
the camera zooms — then collapsed back to a tight text rhythm. The result reads like a console, but
behaves like a ZUI: zoom out to see the shape of a conversation, zoom in to read a character, open a
gap to unfold its subgraph.

The console is a **projection of committed facts**, never a second store. DOM remains the rendering
surface inside each node (native in-node selection, IME, a11y); cross-node selection is synthesized
from the ordered entry sequence.

## 1. Baseline

- `app/demo/transcript.ts:210` is a standalone host, not a component: it boots its own `SpaceGraph`,
  owns its fixture, prompt loop, filters, themes, row list and three views (`graph`/`hybrid`/
  `transcript`). Its `.zcard` styling and glyph grammar live in
  `app/demo/html/interaction/transcript.html:483`.
- `src/layout/transcript.ts:23` (`transcriptLane`) is the reusable spine/context layout: append-only
  spine, descendant columns at halving scale, caller-owned sizes and labels. It already serves a
  card, a DOM row and a 3D node from one rule.
- `src/composer.ts:12` (`mountComposer`) is the host-agnostic prompt editor: Enter submits,
  Shift+Enter adds a line, arrows walk history.
- `app/pi-durable/src/translator.ts` folds Durable facts into kernel ops with stable ids.
  `app/pi-durable/src/host.ts:2430-2488` hides the canvas for the `transcript` view and mounts
  `mountReading` from `spacegraphjs/reading` — a readable document, not a console.
- `app/pi-durable/src/scenarios.ts:10` closes `ViewName` to `graph | tasks | timeline | diff | trace |
  docs | transcript`; `app/pi-durable/src/address.ts:6` carries `s, shot, view, rung, layout, asOf,
  zoom, focus`. `src/octaves.ts` owns the `dot → chip → card → panel → monument` band ladder.
- There is no terminal component today. `src/widgets/index.ts` is the existing host-agnostic widget
  export surface.

## 2. Invariants

1. **One committed fold.** Console lines, graph cards, reader sections and exports project the same
   kernel. Line id = entry id; no new facts are invented to make the console look good.
2. **Vector first.** The console is a scene of nodes, not a DOM viewport with a canvas behind it.
   Gaps, margins and line heights are scene values; the camera is the scroll.
3. **Text is still text.** Each node renders selectable, escaped DOM text. Cross-node selection is a
   host-level range over linear entry order, not a reimplementation of the DOM selection model.
4. **Elastic without incoherence.** A baseline character grid gives console rhythm; gaps and
   margins may open around it, but text never reflows or duplicates when an overlay appears.
5. **Library first.** Every capability used by Pi Durable lands as a published SpaceGraphJS subpath
   with unit tests; the app keeps only vocabulary, fixtures and theme choices.
6. **Parity of interaction.** Pointer, keyboard and assistive technology reach the same lines,
   ranges and prompt actions. Shortcuts never fire while a composer has focus.
7. **Windowing is view-local.** Only a visible slice of entries exists as nodes; the kernel retains
   every committed fact. Selection and permalinks address ids, never DOM indices.

## 3. Confirmed decisions (design interview)

| Choice | Decision |
| ------ | -------- |
| View slot | Replace the existing `transcript` view; relabel it "console". No eighth `ViewName`, no shot or scenario churn. |
| Component home | New library export `spacegraphjs/terminal` (`src/terminal.ts`), consumed by both the demo and Pi Durable. |
| Overlay substrate | Vector nodes in ZUI space. Rejected DOM-text-plus-canvas overlay and DOM-only HUD decorations. |
| Fidelity | Visual and keyboard emulation only. No ANSI/SGR parser, no PTY, no cursor-control emulation. |
| Granularity | One node per committed entry; wrapped text sets node height. |
| Scroll | Camera is the scroll: wheel pans, bottom-anchored until the user pans away; survey minimap is the scrollbar. |
| Buffer | Windowed node set: only the visible `[start, end]` slice exists as nodes. |
| Overlays | Flexible: some ever present, others zoom-progressively disclosed. |
| Prompt | An `HtmlNode` at the spine tail containing a real textarea, wired to `mountComposer`. |
| Selection | Linear transcript order; per-node synthetic highlights; copy aggregates text. |
| Emoji | Gutters/status columns only — most monospace fonts render emoji double-width and that breaks the character grid. |
| Permalinks | Add selection range and tail ids beside camera/as-of/focus fields. |

Last two rows are working assumptions from the interview summary; confirm them before Stage 3.

### 3.1 Stage 1 resolutions and findings

- **Band ladder.** The plan's `src/octaves.ts` and `dot → chip → card → panel → monument` ladder do
  not exist. The repository's ladder is `DEFAULT_RUNG_IDS = ['dot', 'glyph', 'card', 'widget',
  'detail']` in `src/representations/ladder.ts`. `terminalVisible` defaults to that real ladder and
  accepts a caller-supplied one. Stage 3 kept the library default: Pi's `bandChange` event supplies the
  same band ids, so no second vocabulary was introduced.
- **Emoji.** Adopted for Stage 1: the default glyph tables use single-width symbols only, and inline
  text is escaped and never emoji-aware. Inline emoji would require a width map, not a special case.
- **Permalinks.** Stage 3 adopted `sel` (encoded as `anchorID:offset~focusID:offset`) and `tail`
  (followed line id) in `app/pi-durable/src/address.ts`. Hydration into the console selection is Stage 4.
- **Window invariant.** Confirmed by Stage 1: `terminalSpec` projects a subset of committed lines as
  nodes; the kernel and every other view still hold all facts.

## 4. Architecture

### 4.1 Component surface (sketch, not contract)

```ts
// src/terminal.ts — exported as `spacegraphjs/terminal`
export type TerminalLine = {
  readonly id: string;          // stable durable entry id
  readonly kind: string;
  readonly status: string;
  readonly label: string;
  readonly text: string;
  readonly turn?: number;
  readonly parent?: string;     // branch/context attachment
  readonly octave?: number;     // 0 primary, -1/-2 context
}

export type TerminalOverlay = {
  readonly id: string;
  readonly lineID: string;
  readonly slot: 'gap' | 'gutter' | 'margin';
  readonly reveal: 'always' | 'zoom' | 'hover' | 'select';
  readonly band?: Band;         // reuse src/octaves.ts ladder
  readonly node: NodeSpec;
  readonly edge?: EdgeSpec;
}

export type TerminalRange = {
  readonly anchor: { readonly nodeID: string; readonly offset: number };
  readonly focus: { readonly nodeID: string; readonly offset: number };
}

export type TerminalController = {
  append(lines: readonly TerminalLine[]): void;
  setWindow(startID: string, endID: string): void;
  select(range?: TerminalRange): void;
  selection(): TerminalRange | undefined;
  setOverlays(overlays: readonly TerminalOverlay[]): void;
  followTail(enabled: boolean): void;
  focusLine(id: string): void;
  destroy(): void;
}
```

`mountTerminal(container, spec, hooks)` owns: line→node projection via `transcriptLane`, the
character grid (char width, line height, gutter width in world units), elastic gap allocation,
window bounds with hysteresis, camera anchoring, overlay reveal by zoom band, selection highlights,
glyph grammar, and teardown. Hooks cover submit, reveal, copy and camera change. The host supplies
vocabulary and theme tokens; the library never imports Pi.

### 4.2 Scene model

- **Spine:** primary entries at octave 0, one node per entry, left edges aligned, wrapped text sets
  height using a world-unit version of `cardSize` (`app/demo/transcript.ts:150`).
- **Context:** descendants in gutter/margin columns at half and quarter scale via `transcriptLane`;
  edges are curved for primary, dotted/dimmed for context, matching the demo's `edgeFor`.
- **Grid:** a declared `charWidth`/`lineHeight` pair in world units gives the console rhythm. Gaps
  are measured in line units and animate open/closed without changing node text.
- **Prompt:** tail node with `›` caret and a real textarea; `mountComposer` supplies submit, history
  and multiline behavior. Steer/followUp/cancel route to the existing Durable prompt path.
- **Camera:** orthographic, flat, transparent (`render: { projection: 'orthographic', depth: 'flat',
  transparent: true }` as in the demo). Wheel pans; modifier/key zooms; tail-follow re-engages on an
  explicit action (End, minimap click, or a badge).
- **Window:** ordered ids with `[start, end]`; mount/unmount with a prefetch margin and hysteresis so
  fast pans do not thrash. Anchors are ids, so selection survives unmount/remount.
- **Selection:** anchor/focus `{nodeID, offset}`; linear order from the folded kernel; per-node
  highlight attributes; copy joins spans in order. Shift+arrows extend; plain arrows move a caret.
- **Theme/glyph:** one glyph/status map shared with `NODE_GLYPHS`
  (`app/pi-durable/src/host.ts:433`); console palettes are theme tokens, not hardcoded colors.

## 5. Enhancements and constructs this unlocks

The terminal is a general **line-addressable vector surface**. Each extension below is a small
primitive on the same lane/gap/rail/range model, and each is a candidate for its own subpath.

| # | Primitive | Constructs it enables |
| - | --------- | --------------------- |
| E1 | Elastic gap objects between lines, sized in line units | Inline callouts, tooltips, progress bars, sparklines, approval cards, diff hunks, "why is this here?" provenance — all unfolded in place without leaving the console |
| E2 | Gutter/margin slot registry (kind/status glyph, line number, fold marker, attention bar, provenance dot, bookmark) | Diagnostics and blame rails, importance/attention display, collapsible branches, bookmark navigation |
| E3 | Overlay reveal policies (`always`, `zoom`, `hover`, `select`) | General level-of-detail/progressive disclosure for any node type: octaves, minimap labels, callouts, inspector previews |
| E4 | Windowed lane + tail-follow camera | Log viewer, timeline rows, table/grid projections, trace and diff viewers, infinite scroll over committed history |
| E5 | Anchored ranges over linear order | Copy/quote/cite, bookmarks, fork-at-range, review comments, durable annotations (a new committed fact), shareable excerpts |
| E6 | Prompt node with slash grammar, completion and history | Command palette, in-scene search (`/`), notebook cells, code REPL cells, mode switching (steer/followUp) |
| E7 | Character-span → entry-id mapping | Inline links, hover cards, "open file at line", URL/entity overlays, syntax-like coloring without ANSI |
| E8 | Time-axis integration (`asOf`, replay, chapters) | Historical tail with read-only badge, replay-as-typing animation, two-tail diff, chapter scrubbing |
| E9 | Multiple consoles over one kernel | Fork tabs as side-by-side consoles, synchronized pan, linked selection across tabs, compare two futures |
| E10 | Theme/glyph grammar as data | Amber/green-phosphor/retro/light console palettes, icon sets, consistent visual language across cards and lines |
| E11 | A11y parity layer | Roving focus over lines, ARIA list roles, announced ranges, keyboard selection, caret movement within a node, live tail announcements |
| E12 | Export and sharing | Copy range, Markdown/JSON session export, permalink carrying selection and tail |

Downstream UI constructs that fall out of E1–E12: agent REPL console, log viewer, chat transcript,
notebook, diff viewer, trace/timeline, inspector breadcrumb, command palette and review/comment
surface. None needs a second renderer or a second store.

## 6. Delivery order and blast radius

1. **Stage 1 — library primitives.** `src/terminal.ts`, `spacegraphjs/terminal` export in
   `package.json`, `test/terminal.test.ts` for pure lane/window/range/glyph functions, export-guard
   test. No host changes. Blast radius: new files + exports only.
2. **Stage 2 — demo migration.** Move `app/demo/transcript.ts` onto the shared component, keeping
   its three views, themes and prompt loop as the reference implementation. Update
   `app/demo/tests/transcript.{test,spec}.ts` and screenshots only if shape changes.
3. **Stage 3 — Pi Durable adoption.** Replace the `mountReading` branch at
   `app/pi-durable/src/host.ts:2430-2488`; relabel `VIEW_LABELS.transcript`; wire prompt node,
   camera/minimap, window bounds, overlays and permalink fields in `app/pi-durable/src/address.ts`;
   add console CSS to `app/pi-durable/index.html`; update `tests/reading.spec.ts`,
   `tests/a11y.spec.ts`, `tests/screenshots.spec.ts`. Blast radius: one view slot, app CSS, address
   codec, tests — no server or translator changes.
4. **Stage 4 — extensions.** Land E1–E12 individually, library-first, each with a unit test and one
   E2E or screenshot when the visual shape changes. No bundled mega-change.

**Status:** Stages 1–4 landed 2026-11-27. E1–E12 are in place; remaining polish is listed in §10.

## 7. Verification ladder

- **Tier 1 (every change, no browser, ~20 s):** `pnpm run typecheck` from the affected package
  directory; `pnpm --filter pi-durable check:fast`; `pnpm run test:exports`.
- **Tier 2 (library surface changes):** `pnpm run check` from the repository root (canonical lint
  and type-check); `pnpm --filter pi-durable verify:fast`.
- **Tier 3 (view, route or announcement changes):** `pnpm --filter pi-durable shots:focus` and the
  console-view Playwright specs.

Tests cannot run from the repository root (guard `do-not-run-tests-from-root`); run from package
directories. Read the matching skill in `.opencode/skills` before writing tests (`unit-tests`,
`component-tests`, `app-e2e-tests`, `tui-tests`). Do not add `.changeset` files.

## 8. Open questions and risks

- **Window vs "one node per fact".** Console view intentionally shows a subset; kernel and other
  views still hold every fact. Confirm this is acceptable for the invariant wording.
- **Focus arbitration.** A textarea inside a scene node competes with global scene shortcuts.
  Follow the existing rule: shortcuts never fire while the composer or another text field has focus.
- **Selection across unmounted lines.** Must anchor to `{id, offset}`, not DOM index or window
  position, or copy breaks when the window slides.
- **Tail-follow re-engagement.** Define exactly when panning disables follow and what restores it
  (End key, minimap click, explicit badge). Avoid fighting the user's camera.
- **Pan churn.** Window mount/unmount needs hysteresis and a prefetch margin; measure before
  tuning. Reject the alternative of keeping all nodes and relying only on frustum culling — the
  decision is a windowed set.
- **Emoji width.** Keep emoji out of inline text; if a future host needs them inline, the grid
  contract needs a width map, not a special case.
- **RTL.** Existing app supports `dir="rtl"`; decide whether spine and gutter mirror or text-only
  mirrors. Preserve logical order for selection either way.
- **Address compatibility.** New selection/tail fields need codec compatibility with existing
  permalinks; follow `app/pi-durable/src/address.ts` conventions.
- **Zoom-progressive disclosure.** Reuse `DEFAULT_RUNG_IDS` from `src/representations/ladder.ts` (§3.1)
  rather than inventing a second band vocabulary.
- **`mountTerminal` contract — resolved in Stage 2.** The host creates and owns `SpaceGraph` and
  supplies a small `TerminalGraph` adapter; the component owns the window, gaps, overlays, selection
  and projection sync, and the host owns camera moves through `onFocus`. `mountTerminal(graph, hooks)`
  therefore never imports the graph runtime. Camera pan-to-scroll and a scene prompt node remain
  Stage 3 work.

## 9. Progress

- Interview completed: view slot, component home, substrate, fidelity, granularity, scroll, buffer,
  overlay disclosure, prompt placement and selection model are decided (§3).
- **Stage 1 landed (2026-11-27).** `src/terminal.ts` exports the terminal types and pure primitives:
  grid/wrap/line size, `terminalLayout` (spine plus halving context), `terminalGaps`, `terminalWindow`
  (hysteresis and prefetch margin), anchored ranges (`terminalOrder`, `terminalCompare`,
  `terminalRange`, `terminalRangeIDs`, `terminalRangeText`, `terminalMoveLine`), glyph tables, overlay
  reveal policies, and `terminalSpec` (windowed `GraphSpec` projection with gap offsets, edges and
  overlay nodes).
- Published `spacegraphjs/terminal` through `script/library-entries.ts` and regenerated `package.json`;
  `dist/terminal.js` and declarations build.
- `test/terminal.test.ts`: 17 focused tests. Full suite: 200 files / 1318 tests passing.
  `pnpm run typecheck:root`, `pnpm run check`, `pnpm run test:exports` all pass.
- **Stage 2 landed (2026-11-27).** `mountTerminal(graph, hooks)` is implemented in `src/terminal.ts`
  with a host-owned `TerminalGraph` adapter. It syncs a windowed `GraphSpec` into the graph (diffed
  nodes and edges), applies gap offsets and visibility, keeps selection and tail-follow state, and
  re-projects on zoom-band changes. Added `refresh()` and `copy()` to `TerminalController` and an
  explicit `range` override to `terminalSpec`.
- `app/demo/transcript.ts` now delegates append, filter refresh, node clicks, zoom-band reporting and
  focus to the controller. Its exported helpers (`buildSpec`, `cardHtml`, `cardSize`, `layoutEvents`,
  `matchesFilter`) and the `__transcript` hook are unchanged, so no test or screenshot updates were
  needed. The demo keeps its three views, themes, row list and prompt form.
- `test/terminal.test.ts`: 22 tests (five controller tests with a recording graph object). Full suite:
  200 files / 1323 tests passing. `pnpm run typecheck:root`, `pnpm run check`, `pnpm run test:exports`
  pass. `app/demo/tests/transcript.spec.ts`: 3/3 passing.
- **Stage 3 landed (2026-11-27).** `mountTerminalSink` lets any host model drive the controller; Pi
  Durable supplies a `RenderModel` sink over `SpaceGraphRenderer.setModel()`. The transcript view is now
  a vector console: `renderReader` keeps `mountReading` only for `docs`, `VIEW_LABELS.transcript` is
  `'console'`, and `#renderConsole` projects committed `TRANSCRIPT_KINDS` into line nodes with an
  `orders` spine. `reveal`/`readInTranscript` route to `focusLine`; the renderer's graph-node click and
  viewport regrade paths skip the transcript view so they cannot overwrite the console model. Console
  nodes get roving focus with Arrow/Home/End and announcements. `Address` carries `sel` and `tail`.
- Console CSS added to `app/pi-durable/index.html`; transcript assertions in `reading.spec.ts` and
  `representations.spec.ts` now target `#canvas [data-node-id]` and `.sg-terminal-line`.
- `app/pi-durable`: 20 files / 99 unit tests passing; `verify:fast` 72 E2E passing (5 skipped). Root
  `pnpm run check`, full suite (1323 tests), `test:exports` and demo `transcript.spec.ts` all pass.
- **Stage 4 / E6 landed (2026-11-27).** `terminalPromptHTML`, `terminalPromptNode` and
  `mountTerminalPrompt` in `src/terminal.ts` create an `HtmlNode` tail node with a real textarea wired
  to `mountComposer`; a `MutationObserver` attaches once the scene DOM appears. Both the demo and Pi
  Durable project the prompt node and route its submits through their existing prompt loops. The host
  footer form remains as the accessible fallback. Scene textareas are typing targets, so global
  shortcuts keep their existing "never while typing" rule (invariant 6).
- `test/terminal.test.ts`: 25 tests (three new prompt tests). Full suite: 200 files / 1326 tests.
  `app/demo/tests/transcript.spec.ts`: 4/4 including scene-prompt submit. Pi Durable `verify:fast`:
  73 E2E passing (5 skipped), including scene-prompt submit. Root `check` and `test:exports` pass.
- **Stage 4 / E12 landed (2026-11-27).** `terminalRangeKey` and `terminalRangeFromKey` encode and
  hydrate anchored ranges with ids that contain `:`; `TerminalController.tail()` exposes the followed
  line. Pi Durable's `permalink()` and `address()` carry `sel`/`tail`, and `applyAddress()` restores
  the console selection and tail after the view refresh. `copyConsole` and `consoleRange` hooks expose
  the controller's copy and selection to tests and hosts.
- `test/terminal.test.ts`: 26 tests. Full suite: 200 files / 1327 tests. Pi Durable `verify:fast`:
  74 E2E passing (5 skipped), including compact-permalink hydration. Root `check` and `test:exports`
  pass.
- **Stage 4 / E1–E2 landed (2026-11-27).** `terminalOverlayGaps` turns visible gap overlays into
  line-unit gaps, and `terminalSlots` groups gutter/margin overlays by line. Pi Durable's console
  derives overlays from its line order, opens elastic gaps after every fourth line, and places gutter
  attention markers beside every third line. Gaps and markers are scene values; committed text and
  selection ids are unchanged.
- `test/terminal.test.ts`: 28 tests. Full suite: 200 files / 1329 tests. Pi Durable `verify:fast`:
  75 E2E passing (5 skipped), including gutter-slot assertion. Root `check` and `test:exports` pass.
- **Stage 4 / E7 landed (2026-11-27).** `terminalFlatten`, `terminalSpan`, `terminalPointAtIndex`,
  `terminalIndexOfPoint` and `terminalRangeFromIndices` map global character indices to entry ids and
  local offsets. Flattened text uses the same newline separators as copied ranges, so spans, copies and
  permalinks share one index space. `TerminalController.text()` exposes the flattened text; Pi Durable
  adds a `consoleText` hook.
- `test/terminal.test.ts`: 30 tests. Full suite: 200 files / 1331 tests. Pi Durable `verify:fast`:
  75 E2E passing (5 skipped). Root `check` and `test:exports` pass.
- **Stage 4 / E10 landed (2026-11-27).** `TERMINAL_PALETTES` (classic, amber, green, retro) name theme
  tokens and glyph sets rather than colours. `terminalPalette(id)` resolves a preset; the controller
  exposes `palette()`/`setPalette(id)` so glyphs can change at runtime. Pi Durable adds `consolePalettes`
  and `setConsolePalette` hooks, and renders line markup from the active palette.
- E3–E5 are already covered by the earlier stages: reveal policies (`terminalVisible`), windowed lane
  with tail-follow (`terminalWindow`, `mountTerminalSink`), and anchored ranges (`terminalRange*`).
- `test/terminal.test.ts`: 33 tests. Full suite: 200 files / 1334 tests. Pi Durable `verify:fast`:
  76 E2E passing (5 skipped), including palette switching. Root `check` and `test:exports` pass.
- **Stage 4 / E11 landed (2026-11-27).** `mountTerminalA11y(container, options)` owns roving focus,
  `role="listitem"` and `tabIndex` decoration via a `MutationObserver`, Arrow/Home/End navigation, line
  announcements, and the "never while typing" rule. Pi Durable replaced its inline console keyboard
  handler with this primitive; caret movement inside a node stays native textarea behaviour.
- `test/terminal.test.ts`: 35 tests. Full suite: 200 files / 1336 tests. Pi Durable `verify:fast`:
  76 E2E passing (5 skipped). Root `check` and `test:exports` pass.
- **Camera follow landed (2026-11-27).** `TerminalController.following()` exposes follow state and
  `mountTerminalCamera(container, controller, options)` releases tail-follow after wheel travel, then
  restores it on End or a clickable badge. Pi Durable adds `#follow-badge` in the stage and routes
  follow changes through the announcer.
- `test/terminal.test.ts`: 37 tests. Full suite: 200 files / 1338 tests. Pi Durable `verify:fast`:
  77 E2E passing (5 skipped), including wheel release and badge restore. Root `check` and
  `test:exports` pass.
- **Stage 4 / E8 landed (2026-11-27).** `TerminalLine.at` carries an optional time value;
  `terminalVisibleAt`, `terminalChapters` and `terminalReplaySteps` filter historical lines, group
  consecutive turns, and produce replay prefixes. `TerminalController.lines()` exposes committed lines
  to hosts. Pi Durable maps node `at`/`turn` into the console, applies `#asOf`, and adds `consoleChapters`
  and `consoleReplaySteps` hooks.
- `test/terminal.test.ts`: 40 tests. Full suite: 200 files / 1341 tests. Pi Durable `verify:fast`:
  78 E2E passing (5 skipped), including chapters and replay steps. Root `check` and `test:exports`
  pass.
- **Stage 4 / E9 landed (2026-11-27).** `terminalDiff` compares two projections by stable line ids;
  `terminalLink(controllers).sync()` copies selection and followed tail across consoles. Pi Durable
  adds a `consoleCompare` hook that diffs the active console against another tab's kernel. With E3–E5
  already covered by earlier stages, all E1–E12 are now in place.
- `test/terminal.test.ts`: 42 tests. Full suite: 200 files / 1343 tests. Pi Durable `verify:fast`:
  79 E2E passing (5 skipped), including cross-tab console comparison. Root `check` and `test:exports`
  pass.
- **Console screenshots (2026-11-27).** `CONSOLE_SHOTS` in `app/pi-durable/src/shots.ts` defines seven
  capture states: `console-turn`, `console-selection`, `console-retro`, `console-history`,
  `console-approval`, `console-fork`, `console-narrow`. `tests/console-screenshots.spec.ts` boots the
  underlying scenario, switches to the transcript view, then applies palette/selection/`asOf` state
  before capture. `pnpm --filter pi-durable shots:console` regenerates them into
  `docs/screenshots/pi-durable/console/` and rebuilds the screenshot studio. `shot.ts` accepts
  `console` as a group selector and individual console shot ids.
- Console lines now fall back to node label/kind when a fact has no `text`, so tool and boundary rows
  stay readable; gutter markers use raw HTML to avoid heavy node frames.
- **Console styling pass (2026-11-27).** All line nodes share a fixed width and one left edge; line
  markup renders with `useRawHtml`, so there is no default frame. A border appears only on hover or
  keyboard focus, and the core activity glow is suppressed for `#app[data-view='transcript']`. The demo
  applies the same frameless rule to `.zcard`. Selection and focus rings remain for accessibility.
- **Neutral palette pass (2026-11-27).** The app's CSS tokens and `DURABLE_TOKENS` are now neutral
  grays; the warm amber chrome is gone. Line text stays gray while gutter glyphs carry per-role/per-kind
  accents (user blue, assistant green, action cyan, boundary amber, approval violet, error red). The
  `orders` spine is dotted and inferred, so it stays readable at text zoom and still reveals the
  conversation shape when zoomed out. `console-zoom` captures that fractal view; all eight console shots
  were regenerated.
- **Console rhythm pass (2026-11-27).** The console camera now fits the line spine into a narrow left
  region via renderer insets instead of centring it, so text starts at the left edge of the stage. Row
  height and step are one character line (18 px) rather than a card height plus gap; only overlay gaps
  add extra space. The prompt sits one row below the tail. `CONSOLE_GRID` is the single source for the
  grid and the camera inset. Eight console shots regenerated.
- **Terminal aesthetic pass (2026-11-27).** Node-level focus/selection rings and rounded corners are
  suppressed in the transcript view; line nodes are square and frameless. Subtle per-type treatments
  (background tint, weight, italic, letter-spacing) distinguish user input, assistant messages, tools,
  boundaries, state/thinking and approvals while normal text stays gray. Selection is now an inset
  accent bar plus tint driven by `data-selected`, not a white outline. The prompt caret blinks and its
  underline replaces the boxed frame. Fit insets pin the first line near the top-left. Eight console
  shots regenerated.
- **Maximal console framing (2026-11-27).** The console fit now uses only 48 px right/bottom insets and
  `minScale: 1`, so the line column fills the stage and stays anchored top-left. The dotted `orders`
  edges were removed from the console projection; they added noise without helping readability. Gaps,
  gutter markers, selection bars and zoom still expose the underlying vector surface.
- **Detail modalities (2026-11-27).** `TerminalDetail` / `terminalDetailHTML` produce escaped detail
  cards, and `TerminalOverlay.mode` marks how a detail is placed in vector space. Clicking a console line
  toggles its detail; Pi Durable offers `inline` (accordion in an opened gap), `popup` (card beside the
  line) and `rail` (card further out in a context column). Hooks expose mode, expanded id and toggling;
  three new shots capture each modality. The row step gained 4 world units so adjacent nodes do not
  intercept clicks.

## 10. Next session entry points

1. **Deferred polish, not new capability.** RTL decision (§8); measure window hysteresis before
   tuning; minimap-click re-engagement (End and the badge are wired); surface two-tail diff and chapter
   scrubbing in the console UI rather than only through hooks.
2. **Verification for future console changes.** Tier 1: package `typecheck`, `pi-durable check:fast`,
   `test:exports`. Tier 2: root `pnpm run check`. Tier 3: `pi-durable verify:fast` and demo
   `transcript.spec.ts`. Regenerate `shots:console` when console shape, palette, selection or camera
   behaviour changes; regenerate story screenshots only when their shape changes. Review the studio at
   `docs/screenshots/pi-durable-index.html`.
