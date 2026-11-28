# TODO18 — Terminal 2: one projection, one command surface, many lenses

> **Status: complete (2026-11-27).** Supersedes the first 12-item draft. **All six outcomes
> landed** in `spacegraphjs/terminal` and Pi Durable. §8 records each delivery; §9 closes out. Ideas are harvested from [autonull/fracterm](https://github.com/autonull/fracterm)
> (`README.md`, `README3.md`, `TODO.md`) and adapted to the vector console delivered by `TODO17.md`.
> The fidelity decision in TODO17 §3 still stands: no PTY, VT/ANSI/SGR or second console store.
> §8 records delivered work; §9 turns the remaining outcomes into an executable queue.

## 0. Outcome

A console that behaves like a REPL, a CLI and a ZUI at once:

- The **prompt** is the command deck: plain text steers the agent, `/` runs console commands.
- The **transcript**, search results, pinned sidecars, reading pane and diff are all *one projection*
  with different selectors and lenses — not new view slots or renderers.
- **Zoom is navigation**: bands reveal structure, lenses target lines/ranges/regions, bookmarks are
  shareable, and camera moves honour reduced motion.
- **Adding a capability** means one selector + one command id + one E2E assertion, not a new surface.

Fracterm's framing (README §1.5) is the design seed:

```
Zooming = temporary lens · Pinned view = materialized lens
Reading mode = accessibility lens · Dashboard = collection of lenses
```

## 1. Leverage inventory — reuse, do not rebuild

| Already in SpaceGraphJS | Use it for | Do **not** build |
| ----------------------- | ---------- | ---------------- |
| `spacegraphjs/terminal`: `terminalPlace`, `terminalSelect`-to-be, `terminalRange*`, `terminalFlatten`, `terminalVisible*`, E1–E12 | selector, ranges, text indices, overlay gaps, replay | a second line layout or text index |
| `spacegraphjs/commands`: `Command`, `CommandRegistry`, `filterCommands` (already used in `app/pi-durable/src/lens.ts`) | one catalog for prompt `/`, palette, context menu, keys, help, tests | another command registry or ad-hoc key handlers |
| `spacegraphjs/composer`: `mountComposer` (history, multiline, Enter) | scene prompt; extend with completion/`/` hooks | a new textarea editor |
| `spacegraphjs/view-state`: `viewStateCodec` with allowlisted host keys (already carries `sel/tail/pal/det`) | lens targets, bookmarks, profile in `Address` | a separate URI codec; URIs are a thin formatter over `{id, offset}` |
| `spacegraphjs/navigation`: `Navigation.project`, `Trail.reconcile`, `kindDescent`, `edgePath` | minimap/scrollbar, history that survives model updates, zoom-into-line breadcrumbs | another minimap or back/forward stack |
| `spacegraphjs/reading` + `documents`: `mountReading`, `readingOrder`, `readingTextHTML`, `parseDocument` | reading lens, quick reads, safe detail markdown | a second readable renderer |
| `spacegraphjs/representations`, `levels`, `zoom`: `DEFAULT_RUNG_IDS`, `logLayout`, `chapterPacking`, `ScaleDomain`, `playRepresentationChanges` | zoom-progressive regions and log chapters; reduced-motion crossfade | another band vocabulary |
| `spacegraphjs/overlays`: `ScopedOverlay`, `extractSubgraph`, `renderCodeDiff` | menu focus trap, `/why` provenance card, `/diff` tile | new overlay plumbing |
| `spacegraphjs/widgets`: `WidgetRegistry`, `WIDGET_SLOTS`, `createInstrumentKit` (`logtail`, `meter`, `sparkline`, `diff`), `resolveWidgetSize`, `isSafeWidgetMarkup` | pinned log monitors and per-line REPL output widgets with safe markup | a bespoke tile host |
| `spacegraphjs/a11y`: `createAnnouncer`, `AccessibilityLayer`, `bindA11yFocus`; `isEditableTarget` | ordered assistive mirror, roving focus, "never while typing" rule | a second focus model |
| `spacegraphjs/input`: `InputManager`, `InputBinding`, fingerings | one wheel/key/touch stream for follow, zoom and menus | ad-hoc listeners |
| `spacegraphjs/salience`: `createSalience` + signals, `applyModelEmphasis`, `/why` explanations | gutter attention bars and dimming non-matches during search | new emphasis system |
| `spacegraphjs/motion`, `policy`: `playMotion({reducedMotion})` `flyTo`, `PolicySchema`, `encodePolicyVector` | lens transitions and console flags in permalinks | new animation or flag codec |
| `spacegraphjs/quality`: `checkQuality`, `visionAssert` | DOM-budget, a11y, direction and motion assertions in tests | a second visual gate |
| `@spacegraphjs/kernel`: `SessionKernel.checkout/fork`, `filterByTime`, `diffKernels`, `GraphHistory` | `/as of`, `/fork`, two-tail diff over one committed fold | a second store |

**Substrate, not implementations:** bookmarks, palette UI, a keybinding registry and slash completion do
not exist as library features; `Command.shortcut` is search text and `matchShortcut` is internal to
`packages/shared`. Build thin `terminalBookmark`, `terminalContextMenu` and slash-completion primitives
on the registries above, and keep key→command mapping in the host. There is no reusable context-menu
primitive; `ScopedOverlay` only supplies the focus trap. `packages/client` is not part of this repo —
the published `spacegraphjs/*` subpaths are the SDK.

## 2. Invariants

1. One committed fold: a lens is a read model; it never writes facts.
2. Identity never depends on x/y, DOM index, window, zoom or camera — only on line id + offset.
3. Vector first: gaps, margins, regions and cards are scene values; the camera is the scroll.
4. Text stays text: line numbers, source stamps, reflow and highlight are presentation flags.
5. Library first: primitive + unit test lands in `spacegraphjs/terminal` before any host wiring.
6. One command catalog: prompt, palette, menu, keys, hooks and tests resolve the same ids.
7. Reduced motion snaps every animated lens/camera/replay transition.
8. No new view slot for a capability that can be a selector over the console.

## 3. Consolidated outcomes

All six have landed. `E#` = TODO17 enhancement. Effort is relative.

### O1 — One projection contract (foundation) — **Done, see §8**

**Outcome:** window, filter, search, `maxLines`, follow and presentation flags live in one declarative
selector; live/follow/snapshot/derived are view modes of that selector.

- Library: `TerminalSelector` (`rows`, `columns?`, `filter`, `search`, `maxLines`, `follow`, `mode`),
  `terminalSelect(lines, selector) → { lines, matches, hidden }`, `TerminalPresentation`
  (`wrap`, `reflow`, `lineNumbers`, `sourceStamp`, `highlightMatches`), `terminalSnapshot`.
- Host: `consoleModel` consumes selector output; `consoleSelect(selector)` and `consoleMode(mode)`
  hooks; `Address` gains `q` (selector) and `mode`.
- Proof: unit tests for window+filter+search+maxLines and extract-vs-highlight; all twelve
  `shots:console` captures unchanged.
- Effort: medium. Depends on: none. Reuses: E3/E4/E10, `view-state`.

### O2 — Command-driven REPL prompt (highest visible leverage) — **Done, see §8**

**Outcome:** the scene textarea is both agent REPL and CLI. Typing `/` opens completions from the
existing `CommandRegistry`; every console action has one id reachable from prompt, palette, context
menu, keybinding and tests.

- Library: extend `mountComposer` with optional `commands`, `onCommand`, `onComplete` (default path
  unchanged); `terminalConsoleCommands()` extends the existing lens catalog with ids (`copy`,
  `export`, `search`, `filter`, `read`, `zoom`, `pin.live`, `pin.snapshot`, `profile`, `asOf`, `fork`,
  `why`, `help`), each with `disabledReason` gates; `terminalContextMenu(range, commands)` builds menu
  data from the catalog and uses `ScopedOverlay` for focus parity (no reusable menu primitive exists).
- Host: move `app/pi-durable/src/lens.ts` commands into the same `CommandRegistry`; dispatch every verb
  through `CommandRegistry.run()`; map keys with `InputBinding`/`InputManager` so shortcuts never fire
  while the textarea has focus; generate palette, help and cheatsheet from catalog entries.
  `/as of`, `/fork` and `/why` call `SessionKernel.checkout/fork`, `Graph.query` and `diffKernels`.
- Proof: E2E scene prompt `/search ERROR`, `/pin snapshot`, `/as of 2`, menu copy, help listing.
- Effort: medium. Depends on: O1 for actions that take selectors. Reuses: `commands.run`, `composer`,
  `input`, `overlays.ScopedOverlay`, `kernel`, `lens.ts`. **Land the catalog before wiring many
  actions** to avoid rewriting handlers.

### O3 — Search and derived views — **Done, see §8**

**Outcome:** incremental search over committed lines with exact character spans; matches can become a
live derived view or a pinned snapshot without leaving the console.

- Library: `terminalSearch(lines, query, { regex, caseSensitive, scope })` → matches
  `{lineID, start, end}` using E7 indices; `terminalMatchFlags` for highlight; `terminalDerived`
  recomputes a selector from the kernel fold.
- Host: `Ctrl+F` / `F3` / `Shift+F3`, case/regex toggles, "pin matches as snapshot" command; dim
  non-matching lines with `applyModelEmphasis(mappingFor(['opacity','glow']))`; mount a log-monitor
  sidecar through `WidgetRegistry` + `createInstrumentKit('logtail')` from a live derived selector
  (e.g. ERROR lines), bounded by `resolveWidgetSize`.
- Proof: unit tests for regex/case/span mapping; E2E search + pin + sidecar; one console shot for a
  search view.
- Effort: medium. Depends on: O1, O2. Reuses: E7, `salience`, `widgets`, `overlays`.

### O4 — Lens navigation and shareable targets — **Done, see §8**

**Outcome:** zoom-to-line/range/selection/region is one operation; camera bookmarks and lens targets
round-trip through permalinks and name ids, never coordinates.

- Library: `TerminalLensTarget` = `line | range | window | selection | column | region`;
  `terminalLensRect(placement, target)` from the shared placement contract; thin `terminalBookmark`
  over `view-state` keys (no URI codec); `Trail.reconcile` for lens history that survives model
  updates; `edgePath` + `kindDescent` for breadcrumbs; `playMotion({verb:'flyTo', reducedMotion})`.
- Host: `focus(target)` command, `bm0`–`bm9` saved/recalled, `Address.lens`/`Address.bm` via the
  existing codec; console flags carried by `encodePolicyVector`; cursor-anchored wheel zoom.
- Proof: unit tests for target→rect and bookmark codec; E2E permalink round-trip, trail back/forward
  and zoom-to-selection under reduced motion.
- Effort: medium. Depends on: O1, O2. Reuses: E4/E8, `navigation`, `view-state`, `motion`, `policy`.

### O5 — Reading lens, profiles and focus polish — **Done, see §8**

**Outcome:** the console can become a readable document (reflow, line focus, ruler, spacing, high
contrast, hidden chrome) with quick reads, and a profile preset replaces several scattered hooks.

- Library: `terminalReadingLens(lines, selector, presentation)` → `ReadingNode[]`; quick reads =
  selection / current line / last N / filtered; `TerminalProfile` = palette + grid + glyphs +
  presentation (`logs`, `presentation`, `high-contrast`, `big-text`).
- Host: `setConsoleProfile(id)`, `readConsole(scope)`; layered focus roles (camera/view/node/input)
  mirrored by `AccessibilityLayer`/`bindA11yFocus`, announced through the command catalog; safe detail
  markdown via `parseDocument`/`safeDocumentHTML`; reduced motion for lens transitions.
- Proof: E2E reading lens + profile + assistive mirror; regenerate `shots:console` for chrome/palette/
  caret changes.
- Effort: medium. Depends on: O1, O2, O4. Reuses: `reading`, `documents`, `a11y`, E10/E11, `policy`.

### O6 — Regions, auto-zoom and scale (large, last) — **Done, see §8**

**Outcome:** structure reveals itself at zoom bands; fast pans and large histories stay cheap.

- Library: `terminalRegions(lines, placement, gaps)` infers regions from kind/role runs, turn
  boundaries, gaps and gutter slots; auto-zoom ranks candidates and preserves context; dirty-gated
  projection so unchanged state skips `sink.render`; property/fuzz tests for selector, wrap, range
  and window invariants.
- Host: region overlays via `terminalOverlays`, `logLayout`/`chapterPacking` for grouped turns,
  `LaneLayout` for command-reference tables, and `diffPositions` for incremental placement; `autoZoom`
  command plays `flyTo`; churn telemetry from TODO17 #10 tunes thresholds. `checkQuality` guards DOM
  budget, a11y mirror, direction and motion in tests.
- Proof: E2E auto-zoom, fuzz/property suite, `checkQuality` report, one console shot for region reveal.
- Effort: large — split inference from camera work if it grows. Depends on: O1–O5.

## 4. Sequencing and why this order

```
O1  ──► O2 ──► O3 ──► O4 ──► O5 ──► O6
            ▲         │         │
            └─────────┴─────────┘  (actions accumulate in one catalog)
```

1. **O1 first**: every later outcome takes a selector; doing it later means rewriting all of them.
2. **O2 second**: a single catalog means search, pin, zoom and reading add one command each, not a
   new UI path. The REPL prompt is the highest-visibility payoff and reuses existing composer code.
3. **O3/O4 next**: search and derived views exercise the selector; lenses/bookmarks make results
   navigable and shareable.
4. **O5 then O6**: presentation polish needs stable targets; regions need bands + lens + selector.
   O6 is last because it is the only large item and touches every earlier contract.

Merge check before starting each outcome: if it needs a new view slot, renderer, text index, command
registry or codec, the design is wrong — go back to §1.

## 5. Definition of done and verification

Per outcome: pure primitive + unit test in `test/terminal.test.ts`; host hook or projection change in
`consoleModel`/`lens.ts`/`host.ts`; E2E assertion in `reading.spec.ts` (or prompt spec for O2);
console shot only when visual shape changes; progress recorded in this file, as TODO17 §9 does.

- Tier 1: package `typecheck`, `pnpm --filter pi-durable check:fast`, `pnpm run test:exports`.
- Tier 2: `pnpm run check` from the repository root.
- Tier 3: `pnpm --filter pi-durable verify:fast`, demo `transcript.spec.ts`,
  `pnpm run check:console-shots`, and `pnpm --filter pi-durable shots:console` on shape changes.
- `checkQuality(model)` on each projected console window to catch DOM-budget, a11y, direction and
  `motion-mismatch` regressions; `visionAssert` only for visual-grading changes, never as a REPL gate.
- Property/fuzz tests use fixed seeds and test pure functions; no kernel mocks.

## 6. Deliberately not imported

Out of scope under TODO17 §3: PTY, terminal parser, VT/ANSI/SGR, alt screen, scrollback grid,
cursor-control emulation, OSC 8/52, mouse-mode forwarding, kitty keyboard protocol, plugin VMs and
permission systems, OpenGL/render-graph work, XDG/Linux desktop integration, multi-monitor layouts,
and terminal-state save/restore. The kernel remains the durable store; layouts stay arrangement-only.

## 7. First change — **Done**

Implemented O1: added `TerminalSelector`, `terminalSelect`, `TerminalPresentation`,
`TerminalSelection`, `TERMINAL_MODES` and `terminalSnapshot` to `src/terminal.ts`; ported
`consoleModel` to consume selector output; verified the twelve `shots:console` captures. O2 then
landed the shared command catalog and slash prompt; O3 added search, derived views and a sidecar;
O4 added lens targets, a trail and bookmarks; O5 added the reading lens, profiles and an assistive
mirror; O6 added regions, auto-zoom and dirty-gated projection. The plan is complete. See §8 and §9.

## 8. Progress

### O1 — landed (2026-11-27)

- **Library.** `src/terminal.ts` exports `TERMINAL_MODES`, `TerminalMode`, `TerminalSelector`
  (`rows`, `columns`, `filter`, `search`, `maxLines`, `follow`, `mode`), `TerminalPresentation`
  (`wrap`, `reflow`, `lineNumbers`, `sourceStamp`, `highlightMatches`), `TerminalSelection` and
  `terminalSelect(lines, selector)`. Search returns exact flattened global spans; `derived` mode
  extracts matched lines, other modes highlight in place; `maxLines` slices the tail by default and
  the head when `follow: false`. `terminalSnapshot` deep-freezes a resolved result.
- **Rendering.** `lineHTML` takes optional line-relative match ranges and emits `<mark>` only when
  given; `terminalSpec` accepts a `selection` that wins over its window slice.
- **Controller.** `TerminalProjectionContext` carries `selector`, `selection`, `matches` and
  `presentation`; `TerminalHooks` accepts `selector`/`presentation`; `TerminalController` gains
  `setSelector`, `selector`, `setMode` and `view`. `columns` widens the effective grid.
- **Host.** `consoleModel` projects `selection.lines`, highlights matches and emits
  `data-line-no`/`data-source`/wrap classes behind presentation flags. `Address` gains `q`
  (selector search) and `mode` (view mode), validated by the compact codec. `DurableHost` exposes
  `consoleSelect`, `consoleMode`, `consolePresentation` and matching hooks
  (`consoleSelector`, `consoleView`), and round-trips `q`/`mode` through permalinks.
- **Proof.** Five `terminalSelect`/snapshot unit tests, two `consoleModel` tests, address codec
  coverage for `q`/`mode`, and one `reading.spec.ts` E2E for search → highlight → derived →
  permalink. No default presentation flag is set, so no visual shape changed.
- **Verification.** Root `pnpm run check`, `pnpm test` (201 files / 1367 tests), `test:exports`
  (6), `check:console-shots` (12); Pi Durable `tsc --noEmit`, 21 files / 105 unit tests, all 23
  `reading.spec.ts` E2E tests, and 12 regenerated `shots:console`. Nine captures are byte-identical;
  the three detail captures differ across identical runs (animation timing), as TODO17 §10 notes.

### O2 — landed (2026-11-27)

- **Library.** `src/commands/index.ts` exports `matchCommand`, resolving `/verb rest` against ids,
  labels and keywords (labels span up to three words). `mountComposer` gains `commands`, `onCommand`
  and `onComplete`: plain text still submits, while a slash match calls the host and clears the
  editor. `mountTerminalPrompt` now keeps its `MutationObserver` after the first attach, so the
  composer survives renderer node replacement; this was a real detach bug exposed by command
  dispatch. `src/terminal.ts` exports `terminalConsoleCommands()` (thirteen ids with
  `disabledReason` gates) and `terminalContextMenu(range, commands)` as pure menu data.
- **Host.** `DurableHost.#commands()` merges the lens grammar with the console catalog and routes
  every verb through `CommandRegistry.run()`; `consoleCommand` is exposed as a hook. Prompt
  completions render in `#console-completions`, right-click in the console opens `#console-menu`
  with a `ScopedOverlay` focus trap, and the help dialog lists the generated catalog. Existing
  `pi-kit` `dispatchKeys` already suppresses shortcuts in editable targets, so no second key
  registry was needed.
- **Proof.** Composer slash/completion tests, catalog and menu-data tests, and three
  `prompt.spec.ts` E2E tests covering `/search ERROR` → `/pin snapshot`, generated help with
  `/as of 2`, and menu copy.
- **Verification.** Root `pnpm run check`, `pnpm test` (201 files / 1370 tests), Pi Durable
  `tsc --noEmit` and 21 files / 105 unit tests, `verify:fast` (93 E2E passing, 17 capture-only
  skipped), plus 12 regenerated `shots:console` with no default-visual change.

### O3 — landed (2026-11-27)

- **Library.** `terminalSearch(lines, query, { regex, caseSensitive, scope })` returns exact global
  spans over committed lines; invalid patterns yield no matches. `terminalMatchFlags` converts spans
  to line-relative ranges and is now the single source for `lineHTML` highlights in `consoleModel`.
  `terminalDerived` materializes a derived read model. `TerminalSelector.searchOptions` carries the
  case/regex flags so `terminalSelect`, `terminalSearch` and the host agree on one span set.
  `createInstrumentKit` accepts an optional `WidgetSizingPolicy`.
- **Host.** `consoleSearch`, `consoleFindNext`, `consoleToggleSearchOption`, `consolePinMatches` and
  `consoleToggleMonitor` are host hooks and commands; `Ctrl/⌘ F` seeds `/search `, `F3`/`Shift+F3`
  step matches. Non-matching lines are dimmed through `applyModelEmphasis(mappingFor(['opacity',
  'glow']))`; matches feed a bounded `logtail` sidecar through `createInstrumentKit` and
  `resolveWidgetSize`. Pinning matches freezes a filtered snapshot. `pin.matches` and `monitor`
  join the one catalog.
- **Proof.** Regex/case/scope/span unit tests, a `consoleModel` dimming test, and three
  `search.spec.ts` E2E tests for highlight + sidecar + `F3`, pin-as-snapshot, and case/regex toggles.
  Added the `console-search` capture (13 total).
- **Verification.** Root `pnpm run check`, `pnpm test` (201 files / 1375 tests), `test:exports`,
  `check:generated`, `check:console-shots` (13), Pi Durable 21 files / 106 unit tests and
  `verify:fast` (96 E2E passing, 18 capture-only skipped).

### O4 — landed (2026-11-27)

- **Library.** `TerminalLensTarget` covers line, column, range, window, selection and region;
  `terminalLensKey`/`terminalLensFromKey` round-trip all six through one string.
  `terminalLensRect(layout, target, lines?, grid?)` returns a bounding rectangle in the shared
  placement space, never coordinates as identity. `terminalBookmark` is a thin `view-state` codec
  for `bm0`–`bm9` with no second URI format.
- **Host.** `consoleFocus` resolves a target, computes its rect from `terminalPlace`, pushes it onto
  a `Trail`, and moves the camera with `playMotion({ verb: 'flyTo' })`; reduced motion emits only
  the final frame. `consoleTrailBack`/`Forward` step the trail, `#reconcileLensTrail` drops stale
  ids after each projection, and `consoleBreadcrumbs` combines `edgePath` with `kindDescent`.
  `Address.lens`/`Address.bm` join `q`/`mode` in permalinks and compact addresses; `lens.focus`
  and `bookmark` join the one catalog.
- **Proof.** Target-key round-trip, rectangle and bookmark-codec unit tests, plus two
  `lens-nav.spec.ts` E2E tests for permalink/trail/bookmark round-trip and reduced-motion fly-to.
- **Verification.** Root `pnpm run check`, `pnpm test` (201 files / 1378 tests), `test:exports`,
  `check:generated`, `check:console-shots` (13), Pi Durable 21 files / 106 unit tests and
  `verify:fast` (98 E2E passing, 18 capture-only skipped). No shot changed.

### O5 — landed (2026-11-27)

- **Library.** `terminalReadingLens(lines, selector, presentation, scope)` maps quick reads
  (`all`, `selection`, `current`, `last`, `filtered`) to safe `ReadingNode[]` with line numbers and
  source stamps behind presentation flags. `TERMINAL_PROFILES` and `terminalProfile(id)` replace
  scattered flags with four named presets (`logs`, `presentation`, `high-contrast`, `big-text`).
- **Host.** `setConsoleProfile` applies a profile's palette, grid and presentation in one call;
  `readConsole(scope)` renders `readingOrder` sections through the escape-first `readingHTML` in a
  focus-trapped dialog. `AccessibilityLayer` mirrors console lines, `bindA11yFocus` keeps the mirror
  synced through a host-owned emitter and concrete `HtmlNode` focus events, and
  `consoleFocusRole()` reports camera/view/node/input for assistive feedback. `read.lens` joins the
  catalog; reduced-motion fly-to from O4 is unchanged.
- **Proof.** Quick-read scope and profile unit tests, plus three `reading-lens.spec.ts` E2E tests
  for the reading dialog, profile flags and the assistive mirror/focus roles.
- **Verification.** Root `pnpm run check`, `pnpm test` (201 files / 1380 tests), `test:exports`,
  `check:generated`, `check:console-shots` (13), Pi Durable 21 files / 106 unit tests and
  `verify:fast` (101 E2E passing, 18 capture-only skipped). No default chrome changed, so no shot
  was regenerated.

### O6 — landed (2026-11-27)

- **Library.** `terminalRegions(lines, layout, gaps, overlays)` infers regions from kind/role runs,
  turn boundaries, gap overlays, gutter slots and placement distance. `terminalAutoZoom` ranks
  candidates near the tail and widens a lens window to preserve context. `mountTerminalSink` is
  dirty-gated: unchanged state skips `sink.render`, while explicit `refresh()` still forces a render.
- **Host.** Region overlays are opt-in via `setConsoleRegions` and `Address.regions`; `consoleAutoZoom`
  feeds a ranked `terminalLensTarget` into the O4 `flyTo` path and uses churn telemetry to raise the
  minimum region size after heavy sliding. `consoleQuality` applies `checkQuality` to the last
  projected console model with DOM, direction and reduced-motion options. `autoZoom` and `regions`
  join the one catalog.
- **Proof.** Region inference, auto-zoom window and dirty-render unit tests, a fixed-seed invariant
  suite for selector identity, and three `regions.spec.ts` E2E tests. Added the `console-regions`
  capture (14 total).
- **Verification.** Root `pnpm run check`, `pnpm test` (201 files / 1384 tests), `test:exports`,
  `check:generated`, `check:console-shots` (14), Pi Durable 21 files / 106 unit tests and
  `verify:fast` (104 E2E passing, 19 capture-only skipped).

## 9. Remaining work — none

All six outcomes landed with a pure primitive and unit test in `test/terminal.test.ts`, host wiring
through `consoleModel`/`lens.ts`/`host.ts`, E2E assertions, and console shots where visual shape
changed. The §5 verification ladder is green end to end.

**Final verification — re-run 2026-11-27 (clean tree, no code changes needed):**

| Check | Result |
| ----- | ------ |
| `pnpm run check` | pass — all workspace typechecks |
| `pnpm test` | 201 files / 1384 tests pass |
| `pnpm run test:exports` | 6 pass |
| `pnpm run check:generated` | pass |
| `pnpm run check:console-shots` | 14 captures match |
| `pnpm run lint` | pass |
| `pnpm --filter pi-durable verify:fast` | 21 files / 106 unit tests, 104 E2E pass, 19 capture-only skipped |

`verify:fast` regenerated seven `docs/screenshots/pi-durable/stories/*.png` captures (animation
timing); those incidental changes were restored, leaving the tree clean. `pnpm run format:check`
still reports pre-existing Prettier drift across ~400 files (including every `TODO*.md`); it is not
part of the §5 ladder and was left untouched.

There is no queued implementation work. Do not restart the outcomes — start any new capability from
the same split: a selector plus one command id over the one console projection, not a new view slot,
renderer, text index, command registry or codec. `logLayout`, `chapterPacking`, `LaneLayout` and
`diffPositions` remain available for host-specific grouping when a real need appears; they were not
needed to deliver O6. The §3 fidelity exclusions (PTY, ANSI/SGR, a second console store) remain out
of scope.
