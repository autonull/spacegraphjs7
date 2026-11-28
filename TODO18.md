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
| `spacegraphjs/navigation`: `Navigation.project`, `Trail`, `edgePath`, minimap | overview and bookmark targets | another minimap |
| `spacegraphjs/reading` + `documents`: `mountReading`, `readingOrder`, `readingTextHTML` | reading lens and quick reads | a second readable renderer |
| `spacegraphjs/representations`, `levels`, `zoom`: `DEFAULT_RUNG_IDS`, band changes | zoom-progressive region/detail reveal | another band vocabulary |
| `spacegraphjs/overlays`: `ScopedOverlay`, `extractSubgraph`, `renderCodeDiff` | context menus, pinned subgraph cards, diff tiles | new overlay plumbing |
| `spacegraphjs/widgets`: `WidgetLayer`, `MountedWidget`, `resolveWidgetSize` | sidecar/log-monitor tiles with safe markup | a bespoke tile host |
| `spacegraphjs/a11y`, `input`: `createAnnouncer`, typing-target rules | focus roles and announcements | a second focus model |
| `spacegraphjs/salience`, `activity`, `motion`, `policy` | attention accents and reduced-motion snapping | new emphasis or animation systems |
| `@spacegraphjs/kernel`, `packages/client` | durable facts, typed host API | a second store |

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
  unchanged); `terminalConsoleCommands()` catalog ids (`copy`, `export`, `search`, `filter`, `read`,
  `zoom`, `pin.live`, `pin.snapshot`, `profile`, `asOf`, `help`).
- Host: move the existing lens commands into the same registry; `/` prompt dispatch, `Ctrl+K` palette,
  context menu on a range, and help/cheatsheet generated from catalog entries.
- Proof: E2E scene prompt `/search ERROR`, `/pin snapshot`, menu copy, help listing; no shot needed.
- Effort: medium. Depends on: O1 for actions that take selectors. Reuses: `commands`, `composer`,
  `lens.ts`, `overlays`. **Land the catalog before wiring many actions** to avoid rewriting handlers.

### O3 — Search and derived views

**Outcome:** incremental search over committed lines with exact character spans; matches can become a
live derived view or a pinned snapshot without leaving the console.

- Library: `terminalSearch(lines, query, { regex, caseSensitive, scope })` → matches
  `{lineID, start, end}` using E7 indices; `terminalMatchFlags` for highlight; `terminalDerived`
  recomputes a selector from the kernel fold.
- Host: `Ctrl+F` / `F3` / `Shift+F3`, case/regex toggles, "pin matches as snapshot" command; log
  monitor sidecar from a live derived selector (e.g. ERROR lines).
- Proof: unit tests for regex/case/span mapping; E2E search + pin; one console shot for a search view.
- Effort: medium. Depends on: O1, O2. Reuses: E7, `overlays`, `widgets`.

### O4 — Lens navigation and shareable targets

**Outcome:** zoom-to-line/range/selection/region is one operation; camera bookmarks and lens targets
round-trip through permalinks and name ids, never coordinates.

- Library: `TerminalLensTarget` = `line | range | window | selection | column | region`;
  `terminalLensRect(placement, target)` from the shared placement contract; `terminalBookmark` over
  stable ids; reduce-motion snapping via `motion`/`policy`.
- Host: `focus(target)` command, `bm0`–`bm9` saved/recalled, `Address.lens`/`Address.bm` using the
  existing codec; cursor-anchored wheel zoom.
- Proof: unit tests for target→rect and bookmark codec; E2E permalink round-trip and zoom-to-selection.
- Effort: medium. Depends on: O1, O2. Reuses: E4/E8, `navigation`, `view-state`, `motion`.

### O5 — Reading lens, profiles and focus polish

**Outcome:** the console can become a readable document (reflow, line focus, ruler, spacing, high
contrast, hidden chrome) with quick reads, and a profile preset replaces several scattered hooks.

- Library: `terminalReadingLens(lines, selector, presentation)` → `ReadingNode[]`; quick reads =
  selection / current line / last N / filtered; `TerminalProfile` = palette + grid + glyphs +
  presentation (`logs`, `presentation`, `high-contrast`, `big-text`).
- Host: `setConsoleProfile(id)`, `readConsole(scope)`; layered focus roles (camera/view/node/input)
  and announcements from the command catalog; reduced motion for lens transitions.
- Proof: E2E reading lens + profile; regenerate `shots:console` for chrome/palette/caret changes.
- Effort: medium. Depends on: O1, O2, O4. Reuses: `reading`, E10/E11, `a11y`, `policy`.

### O6 — Regions, auto-zoom and scale (large, last)

**Outcome:** structure reveals itself at zoom bands; fast pans and large histories stay cheap.

- Library: `terminalRegions(lines, placement, gaps)` infers regions from kind/role runs, turn
  boundaries, gaps and gutter slots; auto-zoom ranks candidates and preserves context; dirty-gated
  projection so unchanged state skips `sink.render`; property/fuzz tests for selector, wrap, range
  and window invariants.
- Host: region overlays via `terminalOverlays`/`ScopedOverlay`, `autoZoom` command, churn telemetry
  from TODO17 #10 to tune thresholds.
- Proof: E2E auto-zoom, fuzz/property suite, one console shot for region reveal.
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
