# TODO20 — From experiments to agentic development surfaces

> **Status: O1–O6 landed (2026-11-28).** Extends `TODO19.md` (complete). This plan records the
> experiment methodology developed across seventeen demos and turns the strongest results into a
> promotion queue. O1 (promotion template + labs index), O2 (`GraphWindow`), O3 (team view with
> committed steer/approve facts), O4 (session atlas bound to the existing time-travel view), O5
> (inner widgets and foldable nodes) and O6 (density kit) are in place, along with the cheap process
> upgrades in §12. O7–O8 have not landed. Continue from §11.

## 0. Outcome

- The demos stop being a catalogue and become **components with second consumers**: each promoted
  pattern runs in at least two hosts, one of them Pi Durable or Pi Agent.
- Pi Durable can serve as a main agentic development tool: a full session is readable, navigable,
  replayable and steerable without leaving the graph.
- Multiple agents work in separate tabs **and** in a team view. Handoffs, steering and approvals are
  visible edges, not hidden state.
- New capabilities still cost one selector + one command id + one E2E assertion. No second graph
  store, text index, renderer, command registry or codec.

## 1. Methodology — how we experiment here

The loop used for all seventeen demos. Keep it; it is the point of the exercise.

1. **Find the principle behind a mockup or a frustration.** Ask what the image proves, not what it
   looks like. The `spacegraphj` and `mockup` screenshots proved: nodes can be windows, inner layout
   can enfold widgets, and type can follow node size. They did **not** ask for retro styling.
2. **State the metaphor in one line.** "A node is a folded subgraph"; "edges are roads"; "attention
   is geometry"; "a widget can be promoted to a node"; "steering is an edge from the operator".
   If the metaphor cannot be said in one line, the experiment is too diffuse.
3. **Build host-owned first.** Put the experiment in `app/demo/html/**` with inline JS or a TS module
   beside the HTML. Use only existing library primitives. Do not touch `src/` until a second consumer
   exists.
4. **Make it interactive, not decorative.** Every demo must respond to pointer, wheel, keyboard or a
   control, and must change a real read model. A screenshot-only mockup is not an experiment.
5. **Drive it in Chromium.** Load the page, exercise the interaction, read the resulting DOM/state,
   and capture a screenshot. Console/page errors are a hard stop.
6. **Name the lift candidate.** Every demo in `docs/console-experiments.md` ends with a **Lift:**
   line naming the component or policy and the primitives it wraps. That line is the handoff to this
   plan.
7. **Promote only with a second consumer.** A pure primitive goes to `src/` with a unit test; a
   component goes to a package; both must be used by the demo and by Pi Durable (or Pi Agent) before
   the experiment is retired.

**Visual rules learned here:** square corners are the default; do not round panels, buttons, pills or
cards. Circles appear only as deliberate glyphs. Form follows function — type, spacing and chrome are
chosen for legibility at the current zoom, not for decoration. Reduced motion snaps every transition.

## 2. Leverage inventory — reuse, do not rebuild

| Primitive | Proved by | Promotion target |
| --------- | --------- | ---------------- |
| `terminalLineHTML`, `terminalTokens`, `terminalFacets`, `terminalDiff` | 1–5, 14–17 | text surface stays one projection |
| `terminalChapters`, `terminalGrow`, `terminalGroup`, `terminalEdges` | 1, 6, 7, 17 | chapter frames, group frames, structural edges |
| `terminalReplaySteps`, `playTerminalReplay` | 3, 17 | `ReplayScrubber` |
| `terminalLODFor`, `terminalFidelity`, `ScaleDomain` | 1, 6, 7, 8, 14, 16 | one fidelity sample for every surface |
| `innerTree`, `innerPlacements`, `innerConnectors` | 1, 10, 14, 15 | `FoldableNode`, `InnerWidget`, `GraphWindow` |
| `Trail`, `edgePath`, `extractSubgraph` | 2, 5, 9, 12, 13, 17 | `EdgeTravel`, `GraphPortal`, `GraphLens` |
| `diffPositions`, `interpolatedPositions`, `playRepresentationChanges` | 8, 10, 11, 13, 17 | layout/focus animation policy |
| `HtmlNode` drag, native resize, `setSize` content scaling, `labelLod` | 14, 15, 16, 17 | `GraphWindow` |
| `zoom:change`, `camera:change`, `setZoom`, `center`, `frame`, `show/hide` | 6–17 | all ZUI bindings |
| `GroupNode` frames, `DottedEdge`, `CurvedEdge` | 10, 12, 16, 17 | `TeamScope`, chapter/scope framing |

**Do not build:** a second text index, a second LOD table, a second command registry, a second graph
store, a renderer-specific hit test (project world positions through `sg.camera` instead), or a
rounded-corner design system.

## 3. Invariants

1. One committed fold. A lens, window, scope or replay prefix is a read model; it never writes facts.
2. Identity is a stable id — never DOM index, screen position, camera zoom or fidelity band.
3. Text stays text: glyph and label stages carry the full escaped text in accessible attributes.
4. Vector first: gaps, frames, margins and regions are scene values; the camera is the scroll.
5. Escaped-by-default markup; unsafe hrefs degrade to plain text.
6. New chrome is opt-in so existing captures stay stable.
7. Reduced motion snaps every animated fidelity, camera, replay, layout and graph transition.
8. One catalog: capabilities are selectors over the one projection, not ad-hoc handlers.
9. Square corners by default; visual style is host vocabulary, never a library assumption.
10. A promoted pattern needs a second consumer before the experiment is retired.

## 4. Application catalogue — use-case diversity

| # | Demo | Use case | Lift candidate |
| - | ---- | -------- | -------------- |
| 1 | `console-margins` | Reading a log beside its local graph | `terminalRailModel`, `GraphConsoleRails` |
| 2 | `graph-portal` | Open a graph node into its console | `GraphPortal` |
| 3 | `facet-monitor` | Operate a live log with facets and replay | `LogMonitor` |
| 4 | `diff-console` | Review two snapshots as text and graph | `DiffView` tone binding |
| 5 | `breadcrumb-console` | Traverse a scope hierarchy | `TrailScopedConsole` |
| 6 | `scale-narrative` | Explain a system at five scales | `ScaleRuler` |
| 7 | `vector-console` | Read a transcript with camera-as-scroll | `VectorConsole` |
| 8 | `morph-layout` | Change arrangement continuously with zoom | `ZoomMorphLayout` |
| 9 | `vector-lens` | Inspect a dense neighbourhood with a second camera | `GraphLens` |
| 10 | `fold-unfold` | Summary ↔ contents of a container node | `FoldableNode` |
| 11 | `gravity-focus` | Direct attention among many nodes | `GatherFocus` |
| 12 | `lasso-scope` | Brush a region into a scoped graph | `GraphLasso` |
| 13 | `edge-travel` | Navigate causal edges as paths | `EdgeTravel` |
| 14 | `window-desktop` | Desktop-style work inside a graph | `GraphWindow` |
| 15 | `widget-detach` | Promote an inner widget to a graph node | `InnerWidget` |
| 16 | `agent-team` | Coordinate multiple agents and steer them | `AgentTeamView`, `SteerEdge`, `TeamScope` |
| 17 | `dev-session` | Run, replay and inspect a full session | `SessionAtlas`, `ReplayScrubber`, `EventWindow` |

Diversity check for future work: every promoted component must serve at least **two** of these
use cases — reading, navigation, comparison, control, coordination, time travel, density, creation,
review, debugging, onboarding, presentation. Single-use experiments stay experiments.

## 5. Outcomes

Every lift candidate is indexed in §4; this section records only promotions with a second consumer.

### O1 — Promotion pipeline and lab index

- Define a one-page template: metaphor → pure primitive → unit test → component → second consumer →
  E2E. Add it to `docs/` and link from `docs/console-experiments.md`.
- Add a labs index page under `app/demo/html/` that groups the seventeen demos by application and
  links each to its Lift line. Generate it from the registry if practical; do not hand-maintain a
  second list.
- **Proof:** index loads, every link resolves, `check:generated` still passes.
- Effort: small. Depends on: none. Risk: low.

### O2 — `GraphWindow` in Pi Durable

- Extract the window shell from demo 14: title/status bar, tabs, inner widget area, focus, taskbar
  binding, ZUI band collapse. Keep drag/resize in `HtmlNode`; do not reimplement them.
- Wire one Pi Durable view to use it (agent card or session card) and keep the demo as the second
  consumer. Typography uses container-query units; square corners.
- **Proof:** Pi Durable window supports tab switch, resize with content scaling, taskbar focus,
  compact band; demo still passes.
- Effort: large. Depends on: O1. Risk: medium (host integration).

### O3 — `AgentTeamView`, `SteerEdge` and `TeamScope`

- Promote demo 16: agent nodes with status/tool/tokens/files, handoff edges, operator node, steer and
  approve transitions, lasso team frame with aggregate stats.
- Decide which state is durable in Pi Durable: steer and approve must become committed facts, not
  just DOM updates. Keep the visual edge derived from that fact.
- Tab scoping first: one agent per tab; team view is a toggle that shows all tabs together.
- **Proof:** two-agent scenario: steer one, approve another, brush a scope, switch tabs, back out.
- Effort: large. Depends on: O2. Risk: high (durable semantics need a host decision).

### O4 — `SessionAtlas` and `ReplayScrubber`

- Promote demo 17: chapter frames, committed-prefix replay, edge travel, event inspector, promote-line-
  to-window. Bind to the existing Pi Durable kernel facts and time-travel view, not a new timeline.
- **Proof:** scrub, play, stop, travel along a causal edge, open an event window, return.
- Effort: large. Depends on: O2. Risk: medium.

### O5 — `InnerWidget` and `FoldableNode`

- Promote demos 10 and 15: inner placements → host markup; detach promotes a widget to a node with a
  `contains` edge; fold/unfold animates a container's contents while outer edges stay intact.
- **Proof:** detach and reattach in two hosts; fold/unfold preserves ids and edges.
- Effort: medium. Depends on: O2. Risk: low-medium.

### O6 — Density tools: `GatherFocus`, `GraphLens`, `GraphLasso`, `ZoomMorphLayout`

- Promote demos 8, 9, 11 and 12 as one optional "density kit" for team views with many agents.
  All four are pure policies over zoom/pointer plus scoped read models; none changes graph data.
- **Proof:** each policy runs in the lab and one Pi Durable view; reduced motion snaps all of them.
- Effort: medium. Depends on: O3. Risk: low.

### O7 — Multi-agent tabs, fork and diff

- Extend O3 with Pi Durable tab semantics: per-conversation tabs, fork edges at committed boundaries,
  parent/child diff using `terminalDiff`, and time-travel per tab.
- Keep one catalog id for tab, fork, diff and replay actions.
- **Proof:** fork a tab at an event, diff parent/child, time-travel one side, return to team view.
- Effort: large. Depends on: O3, O4. Risk: medium-high.

### O8 — Ergonomics and accessibility parity

- Keyboard paths for every promoted component: tab switch, steer, approve, replay, edge travel,
  lens, lasso alternative, fold/unfold. Reduced-motion snapping everywhere. Announce status changes
  through the existing a11y path.
- **Proof:** each component operable without a pointer; help lists every capability; no focus trap.
- Effort: medium. Depends on: O2–O7. Risk: low.

## 6. Sequencing

```
O1 ──► O2 ──► O3 ──► O7
             │       ▲
             ├──► O4 ─┘
             ├──► O5
             └──► O6 ──► O8
```

1. O1 first: without a template and index, promotions drift back into one-off demos.
2. O2 is the foundation: every agentic surface needs a window shell.
3. O3 and O4 are the two halves of the Pi Durable goal — team control and session replay.
4. O5/O6 are optional depth; land them when a real density problem appears.
5. O7 needs both team and session semantics. O8 runs throughout, never at the end only.
6. Merge check: if a promotion needs a new renderer, view slot, text index, command registry or codec,
   go back to §1 — the design is wrong.

## 7. Definition of done and verification

Per outcome: pure primitive + unit test in `test/`; package component with typed props; second
consumer in Pi Durable; E2E in `app/pi-durable/tests/` plus a demo spec wired to a root `test:*`
script; capture only when visual shape changes; progress recorded in §10.

- Tier 1: package `typecheck`, `pnpm --filter pi-durable check:fast`, `pnpm run test:exports`.
- Tier 2: `pnpm run check`, `pnpm test` from the repository root.
- Tier 3: `pnpm run check:generated`, `pnpm run check:labs`, `check:console-shots`, `check:paths`,
  `pnpm --filter pi-durable verify:fast`, `pnpm run build:demo`.
- Lab check: `PLAYWRIGHT_BASE_URL=<dev-server> pnpm run test:demo-errors`. The root Playwright
  config hardcodes `http://localhost:5173`; if that port is held by another project, either start
  this repo's dev server there or pass `PLAYWRIGHT_BASE_URL`. `SG_DEMO_PORT` alone does not change
  the root config.
- Drive promoted interactions in Chromium and inspect resulting state; a green typecheck is not proof
  that a ZUI gesture works.
- Property/fuzz tests use fixed seeds and pure functions; no kernel mocks.

## 8. Deliberately not imported

Same exclusions as TODO19 §6: PTY, terminal parser, VT/ANSI/SGR, alt screen, scrollback grid,
cursor emulation, OSC 8/52, plugin VMs, permission systems, OpenGL/render-graph work, desktop
integration and a second console store. Also excluded here: copying the `retro` visual style,
rounded-corner defaults, renderer-specific hit testing, a second command registry for agent actions,
and agent state kept only in DOM. The kernel remains the durable store; layouts stay arrangement-only.

## 9. Progress — experiments landed, promotions not started

All seventeen demos are in `app/demo/html/**`; the shared experiment style is
`app/demo/html/interaction/lab.css`; the catalogue and lift lines are in
`docs/console-experiments.md`. The generated registry lists 59 HTML demos (58 experiments/hosts plus
the labs index). Promotion work lands in small commits; O2 is the first library/package change.

- **O6 (2026-11-28):** `packages/domain/agent/src/density.ts` holds the four pure density policies
  and a shared panel. Demos 8/9/11/12 and the Pi Durable team view (`d`) are the consumers. Gather
  feeds the layout focus, lens reuses `toggleFocusLens`, lasso feeds team scope, morph calls
  `setLayout`; none writes graph facts. Pattern card: `packages/domain/agent/DENSITY.md`.
- **O5 (2026-11-28):** `packages/domain/agent/src/inner-widget.ts` is the pure inner layout model:
  idempotent fold/detach transitions, derived `contains` edges, derived stats and a fold transform.
  Demos 10/15 and the Pi Durable session window inner tab (`i`) are the consumers. Detach commits a
  stable node plus a `contains` edge; reattach removes both by id; fold stays a view transform.
  Pattern card: `packages/domain/agent/INNER-WIDGET.md`.
- **O4 (2026-11-28):** `packages/domain/agent/src/atlas.ts` is the pure session model: chapters,
  causal edges, committed-prefix stats, a scrubber, event chrome, window and travel transitions.
  Demo 17 and Pi Durable labs mode (`a`) are the two consumers. The host derives events from
  committed kernel nodes and binds the prefix to `scrubTo`, so replay is a read model over the
  existing time-travel view. Pattern card: `packages/domain/agent/ATLAS.md`.
- **O3 (2026-11-28):** `packages/domain/agent/src/team.ts` is the pure team model, scope aggregation
  and state reducer; demo 16 and Pi Durable labs mode (`t`) are the two consumers. Steer commits an
  `action` node plus an `orders` edge; approval re-commits the existing `task` fact. Both E2E specs
  assert committed facts, tab scoping and keyboard paths. Pattern card: `packages/domain/agent/TEAM.md`.
- **O2 (2026-11-28):** `packages/window-manager/src/graph-window.ts` is the pure shell and reducer;
  `graph-window.css` carries container-query type, square corners and reduced-motion snapping. Demo 14
  and Pi Durable labs mode (`?labs=1`) are the two consumers. Pi Durable derives window tabs from committed
  kernel facts and keeps drag/resize in `HtmlNode`; its E2E drives tab switch, taskbar focus, resize
  scaling and compact band. Pattern card: `packages/window-manager/GRAPH-WINDOW.md`.
- **O1 (2026-11-28):** `docs/promotion-template.md` defines the handoff; `app/demo/src/lab-catalogue.ts`
  is the single experiment catalogue; `app/demo/html/labs.html` groups all seventeen demos by
  application and links each to its Lift line through the generated registry. Every demo source has
  a `JOB:` line, and `pnpm run check:labs` asserts catalogue ↔ registry ↔ docs ↔ §4 agreement.
- **Methodology (2026-11-28):** observe → name the metaphor → host-owned experiment → drive in
  Chromium → record the Lift line → promote with a second consumer. Applied to all seventeen demos.
- **Text/graph coupling (1–5):** margins with graph rails, node→console portal, facet monitor, diff
  console, breadcrumb console. Verified with browser interaction and no console errors.
- **Zoom-native canvas (6–9):** five-scale narrative with `ScaleDomain`, vector console with
  camera-as-scroll, zoom-morph layout with `diffPositions`, second-camera magnifier lens. Presets,
  wheel zoom, chapter focus and lens hover were driven live.
- **Interaction metaphors (10–13):** folded subgraphs, attention gravity, lasso scope, edge travel.
  Unfold/collapse, hover warp, brush-to-frame and camera travel were driven live.
- **Window/widget desktop (14–15):** tabbed resizable windows with taskbar and ZUI collapse; inner
  widgets that detach into graph nodes. Tab switch, focus, detach and reattach were driven live.
- **Agentic development (16–17):** agent team cockpit with steer/approve/team scope, and a dev
  session atlas with replay, chapters, edge travel and event windows. Steer, approve, brush, scrub
  and edge travel were driven live.
- **Style correction:** square corners applied to all new experiments; accidental edits to
  pre-existing demos were reverted.
- **Verification:** `pnpm run check`, `pnpm test` (201 files / 1417 tests), `build:demo`,
  `check:generated`, `check:paths`, and 58/58 demos through the console-error harness.

## 10. Queue status — all outcomes open

| # | Outcome | Status | First consumer |
| - | ------- | ------ | -------------- |
| 1 | Promotion template + labs index | done (O1) | `docs/promotion-template.md` + labs index |
| 2 | `GraphWindow` | done (O2) | Pi Durable `?labs=1`, demo 14 |
| 3 | `AgentTeamView`, `SteerEdge`, `TeamScope` | done (O3) | Pi Durable `?labs=1` team panel, demo 16 |
| 4 | `SessionAtlas`, `ReplayScrubber` | done (O4) | Pi Durable `?labs=1` atlas panel (`a`), demo 17 |
| 5 | `InnerWidget`, `FoldableNode` | done (O5) | Pi Durable `?labs=1` window inner tab (`i`), demos 10/15 |
| 6 | Density kit (`GatherFocus`, `GraphLens`, `GraphLasso`, `ZoomMorphLayout`) | done (O6) | Pi Durable `?labs=1` team view (`d`), demos 8/9/11/12 |
| 7 | Multi-agent tabs, fork and diff | open | Pi Durable tabs, demo 16 |
| 8 | Ergonomics and a11y parity | open | every promoted component |

Gate status: `JOB:` lines, Lift links and path resolution are enforced by `check:labs`. Each promoted
component (`GraphWindow`, the team panel, the session atlas, inner widgets, the density kit) has
native keyboard buttons, a reduced-motion CSS snap and E2E coverage in both consumers. Keyboard and
reduced-motion coverage is **not** universal across the other demos; §12 tracks it as a
per-component promotion gate. §10 is the authoritative queue status.

## 11. Fresh-session handoff

Read these first, in order:

1. `TODO20.md` §1–§3 for the method and invariants, §10 for the authoritative queue status.
2. `docs/promotion-template.md` for the handoff and `docs/console-experiments.md` for the Lift lines.
3. `app/demo/src/lab-catalogue.ts` and `app/demo/html/labs.html` for the generated index.
4. `app/demo/html/interaction/agent-team.html` and `app/demo/html/layout/dev-session.html` for the
   two integrated surfaces; `window-desktop.html` and `widget-detach.html` for the window/widget
   primitives.
5. `AGENTS.md` at both repo roots for the repository rules.

Suggested first move: **O7** (O1–O6 are done). Extend O3 tab semantics with fork edges at committed
boundaries, parent/child diff and per-tab time travel; keep one catalog id for tab, fork, diff and
replay actions. Do not add a second graph store or command registry. O8 stays a per-component gate
throughout.

Before any promotion, decide explicitly: *which committed fact does this read model derive from?*
If the answer is "none", the component is decoration and should stay a demo.

## 12. Process upgrades — add these to the loop

These are not new demos. They are changes to the method in §1 that raise the odds that an experiment
becomes a durable, reusable capability instead of a good screenshot.

| Upgrade | What it adds | Concrete check |
| ------- | ------------ | -------------- |
| **Job statement before code** | One line: who does what, when, and what would prove it worked. Kills decorative work. | Every new demo starts with a `JOB:` line in the source header. |
| **Combination matrix** | Deliberately pair two patterns not yet combined (lens + team, replay + gravity, fold + lasso). This is the engine of use-case diversity. | One new pairing per promotion outcome; record the result even when it fails. |
| **Stress fixtures** | Run each experiment at 10× data (200 agents, 500 events) with fixed seeds. Reveals density problems before promotion. | Demo exposes `?n=200`; interactions still work and stay within budget. |
| **API smell journal** | When host code gets awkward, record the missing library API. This is where new patterns are discovered. | Log candidates such as `worldToScreen`, `screenToWorld`, `scopeFromSelection`, `frameGroup(id[])`, `committedEdge(kind)`. Promote the API, not the workaround. |
| **Keyboard and reduced motion as a gate** | A gesture that only works with a pointer is not done. Move this from the last outcome into every demo's definition of done. | Each demo has a keyboard path and a reduced-motion snap before it is marked proved. |
| **Performance budget** | ZUI demos can hide jank behind pretty captures. Budget frame time and DOM size during zoom, morph and replay. | Measure with the strobe tooling; no sustained frame over budget, no DOM-budget regression. |
| **Negative-case walkthrough** | Empty selection, missing id, canceled replay, unsafe markup, narrow viewport, RTL. | Each demo completes these without console errors or broken state. |
| **Fresh-eyes pass** | Reopen a demo in a clean session and use it without its own docs. If it needs explanation, rename or simplify the metaphor. | Reviewer can state the metaphor and complete the main gesture in under a minute. |
| **Pattern cards** | A promoted component ships a one-page card: metaphor, inputs, outputs, invariants, keyboard, reduced motion, failure modes, consumers. | Card lives beside the component and is linked from the lab index. |
| **Executable docs** | Prevent drift between the catalogue and the queue. | A small check asserts every demo has a **Lift:** line and every lift candidate appears in §5. |
| **Labs mode in the real app** | Mount experiments in Pi Durable behind a flag (`?labs=1`) against real kernel data, not only fixtures. | At least two promoted patterns run in labs mode before their experiment is retired. |
| **Portability sweep** | Run promoted components in demo, Pi and Pi Durable, and in light theme, so no dark-only or host-only assumption survives. | Same component mounts in two hosts and both themes. |
| **Rejected-ideas log** | Keep a short list of ideas tried and dropped, with reasons. Prevents re-litigation and documents deliberate scope. | Appendix in `docs/console-experiments.md`. |
| **Clean handoff commits** | Commit experiments in small self-contained increments so a fresh session starts from a known state. | No uncommitted experiment work at session end unless explicitly requested. |

Landed with O1: **job statement** (`JOB:` in all seventeen demo headers), **API smell journal** and
**rejected-ideas log** (`docs/console-experiments.md`), and **executable docs** (`pnpm run check:labs`).
Remaining priority: **keyboard/reduced-motion gate** — needs a real keyboard path and a reduced-motion
snap per demo, not a source-text assertion, so enforce it when each component is promoted. The
keyboard gate must be extended to the remaining demos rather than inferred from a source-text check.
**Labs mode in Pi Durable** now runs five promoted patterns behind `?labs=1`: `GraphWindow`, the
team panel, the session atlas (`a`), inner widgets (`i`) and the density kit (`d`), all against
committed kernel facts. Labs mode is no longer a prerequisite for promotion; keep it as the host
surface for the remaining outcomes.

## 13. Closure

This plan closes when each promoted component has two consumers, an E2E test and an a11y path, and
the lab demos still pass. O1–O6 are complete; §10 is the authoritative queue status. Do not mark a
promotion done until its second consumer and E2E exist. To re-verify, run §7 in order. Regenerate
captures only when visual shape changes; re-check the demo registry after adding or removing any
HTML page.
