# TODO18 — Lenses, projections and derived views over the terminal

> **Status: design draft (2026-11-27).** No code has landed. Every item below is a proposal harvested
> from [autonull/fracterm](https://github.com/autonull/fracterm) (`README.md`, `README2.md`,
> `README3.md`, `TODO.md`) and adapted to the SpaceGraphJS terminal built in `TODO17.md`. Nothing here
> reopens the fidelity decision: no PTY, VT/ANSI/SGR parsing or second console store (TODO17 §3).

## 0. Why this plan exists

TODO17 delivered a line-addressable vector console: windowed lines, anchored ranges, gaps, gutters,
details, replay, export, RTL text and one shared placement contract. Fracterm attacks the same
problem from a different direction and contributes one strong idea: **a view is a projection plus a
lens, not a new feature**. Its own design contract states it directly (README §1.5):

```
Zooming      = temporary lens
Pinned view  = materialized lens
Reading mode = accessibility lens
Dashboard    = collection of lenses
```

Our console already has the pieces — `terminalSpec`, `consoleModel`, `terminalWindow`, `terminalRange`,
`terminalLink`, `mountReading`, camera follow — but exposes them as separate view slots and hooks. This
plan turns them into one declarative contract so a host can say *"show lines matching ERROR from this
conversation, live, with line numbers, and let me pin the matches"* without adding a renderer.

## 1. Source map (fracterm → SpaceGraphJS)

| Fracterm primitive (source) | Our equivalent | Gap this plan closes |
| --------------------------- | -------------- | -------------------- |
| `Surface`, `TextSource` (README3 §2, §7.1) | kernel + `TerminalLine` | none — one committed fold stays authoritative |
| `ProjectionSurface`, selector, presentation (README §8.1–8.4) | `terminalSpec`, `consoleModel`, `terminalWindow` | window, filter, search and presentation are separate hooks |
| `FilterMode` extract/highlight, `matched_rows` (README Part IV) | `terminalVisible`, filter hook | no match flags, no highlight-vs-extract |
| `ZoomTarget` / `Lens` (README §1.5, §6.1) | `onFocus`, `focusLine`, minimap | no named lens targets or camera bookmarks |
| `Live / Follow / Snapshot / Derived` (README3 §18) | follow flag, E9 diff | no pinned live/snapshot projection over one kernel |
| Query language (README3 §30) | lens commands, `consoleCompare` | no line query primitive |
| Auto-zoom, region detection (README3 §11–13, §23–24) | gaps, gutters, zoom bands | overlays are manual; no structural region inference |
| Stable URIs, coordinate independence (README3 §28–29) | `{id, offset}` ranges, `Address` | addresses carry raw ids, not typed URIs |
| Typed commands, single catalog (README §9.3, §17) | `lens`, host hooks | actions live in many places; no command registry |

## 2. Invariants carried forward from TODO17

1. One committed fold. A projection is a read model; it never invents facts or becomes a second store.
2. Vector first. A lens changes scene values, camera and visibility — not a DOM viewport.
3. Identity never depends on x/y, DOM index, window position, zoom or camera (fracterm §28–29).
4. Text stays text. Reflow/line numbers/source stamps are presentation flags, not rewritten text.
5. Library first: every primitive lands in `spacegraphjs/terminal` with a unit test before host wiring.
6. Hosts own theme and commands; the library never imports Pi or SpaceGraph runtime.
7. Reduced motion is honoured by every animated lens, camera move and replay.
8. Deterministic tests: no mocks of kernel state; property/fuzz tests for pure selectors only.

## 3. Opportunity backlog

Ordered by value per unit of effort. **All items are `spec`** — no implementation yet. `E#` refers to
the TODO17 enhancements a primitive extends.

| # | Opportunity | Effort | Builds on | Next step / why |
| - | ----------- | ------ | --------- | --------------- |
| 1 | **Declarative projection selector.** `TerminalSelector` = rows (`window`), columns (optional), `filter`, `search`, `maxLines`, `follow`; `terminalSelect(lines, selector)` returns `{lines, matches, hidden}`; presentation flags (`wrap`, `lineNumbers`, `sourceStamp`, `highlightMatches`) as data. | medium | E3, E4, E10, #7 | Unifies window/filter/gap/reveal and gives search one addressable result set. Library first, then `consoleModel` consumes it. |
| 2 | **Search over committed lines.** `terminalSearch(lines, query, {regex, caseSensitive, scope})` → matches `{lineID, start, end}` using E7 spans; incremental highlight, next/prev, case/regex toggle, "pin matches as snapshot". | medium | E7, #1 | fracterm's Ctrl+F/F3 flow; our character spans already give exact offsets, so no second text index is needed. |
| 3 | **Live / Follow / Snapshot / Derived views.** `TerminalViewMode` plus `terminalSnapshot(lines, selector)`; host `pinConsole(mode)` materializes a projection node over the same kernel (a log-monitor sidecar), with `derived` recomputed from a selector. | medium | E9, #1 | Extends the two-tail diff into arbitrary pinned views; "derived ERROR lines" stay live as new lines commit. |
| 4 | **Lens targets and camera bookmarks.** `TerminalLensTarget` = `line | range | window | selection | column`; `terminalLensRect(placement, target)`; camera `focus(target)` with `bm0`–`bm9` in `Address`, cursor-anchored wheel zoom and reduce-motion snap. | medium | E4, E8 | fracterm §6: zoom is a lens transition. Bookmarks must reference ids/topology, never coordinates. |
| 5 | **Selection action menu.** `terminalActions(range)` returns stable ids (`copy`, `export`, `read`, `filter`, `search`, `zoom`, `pin-live`, `pin-snapshot`); a context menu on a line or range dispatches them through one host handler. | low–medium | E5, E12, #1–#4 | fracterm's selection menu example and quick reads (README, §18.2). Reuses anchored ranges instead of new semantics. |
| 6 | **Reading lens for the console.** `terminalReadingLens(lines, range, presentation)` projects console lines into `mountReading` with reflow, line focus, ruler, spacing, high contrast and hidden chrome; quick reads = selection / current line / last N / filtered. | medium | E8, E11, #1 | Bridges our two rendering modes without duplicating text; reduced motion applies to lens transitions. |
| 7 | **Structural region overlays and auto-zoom.** `terminalRegions(lines, layout, gaps)` infers regions from kind/role runs, turn boundaries, gaps and gutter slots; reveal by zoom band; auto-zoom ranks region candidates and preserves surrounding context. | large | E1–E3, E8 | fracterm §11–13, §23–24. Semantic labels augment geometry; an unfamiliar line shape still navigates by geometry alone. |
| 8 | **Typed URIs for lens targets.** `terminalURI.encode/decode` for `line://…`, `range://…`, `view://…`, backed by entry ids and offsets; use in `Address.sel`/`tail` and permalinks. | low | E5, E12 | fracterm §28–29. Makes the coordinate-independence invariant explicit and shareable. |
| 9 | **Typed command registry.** `terminalCommands()` catalog (id, title, input schema, handler, disposable) as the single source for palette, keybindings, context menus, hooks and tests; host `consoleCommand(id, input)`. | medium | existing lens | fracterm §9.3/§17: every action is a command. Prevents ad-hoc key handlers and duplicated help text. |
| 10 | **Performance and correctness guardrails.** Dirty-gated projection (skip `render` when lines/window/selection/overlays are unchanged), optional measured glyph metrics feeding `terminalCharWidth`, and property/fuzz tests for selector, wrap, range and window invariants. | medium | #1, TODO17 #7/#11 | fracterm's guardrails: bounded feed, dirty-gated sync, off-screen culling. Our controller already caches indices; next is skipping redundant renders. |
| 11 | **Layered focus and contextual help.** Name the four focus roles (camera, view, node, input) and derive help/announcements from the command registry; add high-contrast profile, large caret and reduced-motion camera snapping. | medium | E11, #9 | fracterm §40, §18.3. Our roving focus and typing rule already exist; this names and exposes them. |
| 12 | **Console profiles.** `TerminalProfile` = palette + grid + glyph set + reading presentation (`logs`, `presentation`, `high-contrast`, `big-text`), with `setConsoleProfile(id)` and a `pro` address key. | low | E10, #6 | fracterm's terminal profiles (README §10). One preset replaces several independent hook calls. |

## 4. Delivery order

1. **Contract first:** #1 selector and #8 URIs. Both are pure library work with unit tests; no visual change.
2. **Derived views:** #2 search, then #3 live/follow/snapshot. E2E assertions in `reading.spec.ts`; add a console shot only when a visible search UI or pinned card appears.
3. **Navigation:** #4 lens/bookmarks, #5 action menu, #9 command registry. These share the command catalog; land #9 before wiring many actions.
4. **Presentation:** #6 reading lens, #12 profiles, #11 focus/help. Regenerate `shots:console` for any palette, chrome or caret change.
5. **Advanced:** #7 regions/auto-zoom and #10 guardrails. #7 is the only large item; split its inference and camera pieces if it grows.

Each item lands separately, library first, with: a unit test in `test/terminal.test.ts`, one host hook
or projection change in `consoleModel`, one E2E assertion in `reading.spec.ts`, and a console shot only
if the shape changes.

## 5. Verification ladder

- Tier 1 (every change): package `typecheck`, `pnpm --filter pi-durable check:fast`, `pnpm run test:exports`.
- Tier 2 (library surface): `pnpm run check` from the root.
- Tier 3 (behaviour or shape): `pnpm --filter pi-durable verify:fast`, demo `transcript.spec.ts`,
  `pnpm run check:console-shots`, and `pnpm --filter pi-durable shots:console` when the shape changes.
- Property/fuzz tests for pure selectors must be deterministic with a fixed seed; no kernel mocks.

## 6. Deliberately not imported

From fracterm, these stay out of scope under TODO17 §3 unless a host explicitly needs them:

- PTY, terminal parser, VT/ANSI/SGR, alt screen, scrollback grid, cursor-control emulation.
- OSC 8 hyperlinks, OSC 52 clipboard, mouse-mode forwarding, kitty keyboard protocol.
- Plugin VMs, scoped permission systems and generated plugin `.d.ts` (SpaceGraphJS has its own SDK path).
- Native OpenGL/render-graph work, XDG directories, Linux desktop integration, multi-monitor layouts.
- Terminal-state save/restore: our kernel is the durable store; layouts stay arrangement-only.

## 7. Next action

Start with #1: add `TerminalSelector` and `terminalSelect` to `src/terminal.ts`, with unit tests for
window + filter + search + `maxLines` and an `extract` vs `highlight` mode. Then port `consoleModel`
to consume it, keeping the twelve `shots:console` captures byte-identical except for the new
highlight case. Record progress in this file after each item, as TODO17 does in its §9.
