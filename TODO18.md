# TODO18 — Terminal 2: one projection, one command surface, many lenses

> **Status: revised design draft v2 (2026-11-27).** Supersedes the first 12-item draft. No code has
> landed. Ideas are harvested from [autonull/fracterm](https://github.com/autonull/fracterm)
> (`README.md`, `README3.md`, `TODO.md`) and adapted to the vector console delivered by `TODO17.md`.
> The fidelity decision in TODO17 §3 still stands: no PTY, VT/ANSI/SGR or second console store.

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

All are `spec` — no implementation. `E#` = TODO17 enhancement. Effort is relative.

### O1 — One projection contract (foundation)

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

### O2 — Command-driven REPL prompt (highest visible leverage)

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

### O3 — Search and derived views

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

### O4 — Lens navigation and shareable targets

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

### O5 — Reading lens, profiles and focus polish

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

### O6 — Regions, auto-zoom and scale (large, last)

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

## 7. First change

Implement O1: add `TerminalSelector`, `terminalSelect`, `TerminalPresentation` and `terminalSnapshot`
to `src/terminal.ts`, with unit tests for window+filter+search+`maxLines`, extract-vs-highlight, and
snapshot immutability. Port `consoleModel` to consume the selector output and verify all twelve
`shots:console` captures are unchanged. Then open O2's catalog with the existing lens commands.
