# Console and canvas experiments — seventeen ways to connect text and graph

These demos combine existing SpaceGraphJS primitives in new arrangements. Each is a host-owned
experiment: no second graph store, text index, command registry or codec. They are a place to try
interactions before promoting a pure model into `src/` and a component into a package.

Use [the promotion template](./promotion-template.md) for the handoff: metaphor → job → pure
primitive → unit test → component → second consumer → E2E. Each demo source starts with a `JOB:`
line; `app/demo/src/lab-catalogue.ts` groups the seventeen experiments and the
[lab index](../app/demo/html/labs.html) links each demo to its Lift line.

The first five explore text/graph coupling. Demos 6–9 exploit the WebGL vector canvas directly:
continuous zoom, camera-as-scroll, zoom-driven layout and a second camera in a magnifier lens.
Demos 10–13 invent interaction metaphors: folded subgraphs, attention gravity, brushing a scope
and travelling along edges. Demos 14–15 take the mockups' structural ideas — window nodes with
inner widgets, and type that follows node size — without copying their visual style. Demos 16–17
are integrated surfaces for agentic development: a multi-agent team cockpit and a whole-session
atlas.

Run `pnpm run dev:demo`, then open the paths below.

## 1. Console margins — `html/interaction/console-margins.html`

The terminal is the primary surface; two graph rails sit beside it.

- **Causal spine (left):** `terminalChapters` becomes a chapter graph aligned to console rows.
- **Local graph (right):** `terminalGrow` grows a bounded `innerTree` from the focused line; chips
  are lines and clicking one refocuses the console.
- **Shared fidelity:** one zoom slider drives `terminalLODFor`, `ScaleDomain.sample().importance`
  and `terminalFidelity`, so text, spine and growth chips cross the same band together.
- **Bridge:** dashed SVG links connect the focused chapter node, line and graph seed.
- **Facets:** `terminalFacets` + `terminalFacetExprs` + `terminalFacetMatch` filter the same lines.

**Lift:** a pure `terminalRailModel(lines, focus, band)` in `src/terminal.ts`, then a
`GraphConsoleRails` component that takes a terminal projection and renders both rails. The host
would keep only placement and colors.

## 2. Graph portal — `html/interaction/graph-portal.html`

Flips the direction: a graph node opens into a console of its own lines.

- `extractSubgraph(model, focus, { childEdgeKind: 'part-of' })` scopes the neighbourhood.
- `Trail` owns back/forward and the breadcrumb; clicking a console line descends.
- `terminalLineHTML` renders node-local lines, so the portal uses the same text surface.

**Lift:** a `GraphPortal` component composed from `Trail` + `extractSubgraph` + terminal text. It
would replace ad-hoc "open transcript for node" code in hosts.

## 3. Facet monitor — `html/interaction/facet-monitor.html`

A log monitor where one selector drives three views: filtered lines, a meter and a rate sparkline.

- `terminalFacets` supplies pill counts; `terminalFacetMatch` filters committed lines.
- `terminalReplaySteps` + `playTerminalReplay` reveal prefixes with reduced-motion snapping.
- `terminalLineHTML` keeps inline tokens and safe links intact.

**Lift:** a `LogMonitor` component in `packages/controls` or `packages/inspector`; the selector is
already library-level, so the component would only own layout and the playback button.

## 4. Diff console — `html/layout/diff-console.html`

A console diff that drives graph tone across two snapshots.

- `terminalDiff` returns added, removed and changed line ids without inventing ids.
- Selecting a diff row highlights the matching node in both before/after graphs.

**Lift:** fold the diff→tone mapping into `DiffView` or `GraphDiff` so a diff is one model, rendered
as text and as graph color.

## 5. Breadcrumb console — `html/interaction/breadcrumb-console.html`

Navigation history as the console's scope. Each scope has its own lines; descending pushes a `Trail`
entry and the trail is drawn as a graph on the right.

- `Trail` is already renderer-agnostic and caps depth.
- `terminalLineHTML` renders scope lines.

**Lift:** a `TrailScopedConsole` binding: `Trail` events select a terminal lens, so breadcrumbs,
console and trail graph stay in step without host bookkeeping.

## 6. Scale narrative — `html/layout/scale-narrative.html`

One orthographic scene holds five nested scales: system → service → module → function → line.
Group nodes carry `lodThreshold`, and cross-scale edges stay visible so you never lose the path.
A scale ruler and buttons are driven by `zoom:change` telemetry through `ScaleDomain`; the buttons
set zoom directly rather than flying the camera, so the scale reads honestly.

**Lift:** a `ScaleRuler` component over `ScaleDomain` + `zoom:change` that any host can mount to
label continuous zoom. The nested-scene pattern itself is already supported by `GroupNode`.

## 7. Vector console — `html/interaction/vector-console.html`

The same terminal projection as demo 1, but the lines are `HtmlNode`s in WebGL space. The camera is
the scroll: wheel zooms through the log, and `terminalLODFor` swaps each node's HTML between glyph,
label and full text. Chapter frames from `terminalGroup` + `terminalChapterTargets` appear only at
mid zoom. Clicking a line or a chapter button reframes the camera.

**Lift:** a `VectorConsole` host component that owns one `terminalSpec` and one camera, replacing
DOM scrolling with pan/zoom. This is the clearest bridge between the terminal projection and the
rest of the graph system.

## 8. Morph layout — `html/layout/morph-layout.html`

Zoom selects one of three pure layouts — ring, two columns, chapter lanes. `diffPositions` reports
only the ids that moved, and `playRepresentationChanges` drives `interpolatedPositions` into
`sg.setPositions` each frame. Reduced motion snaps to the final frame.

**Lift:** a `ZoomMorphLayout` policy that makes layout a continuous function of zoom instead of a
discrete switch. Nothing in the graph data changes; only arrangement interpolates.

## 9. Vector lens — `html/interaction/vector-lens.html`

A magnifier with its own camera and renderer follows the pointer. `extractSubgraph` scopes the
hovered node's neighbourhood, and the lens re-fits that small graph at readable zoom. Clicking pins
the lens; Escape releases it. Node under the pointer is found by projecting world positions with
the main camera — no renderer hit-test dependency.

**Lift:** a `GraphLens` component composed from `extractSubgraph` + a second `SpaceGraph` instance.
It is the strongest demonstration of a UI that only a vector, camera-driven canvas can provide.

## 10. Fold / unfold — `html/interaction/fold-unfold.html`

A node is a folded subgraph. Clicking unfolds its `innerTree` into radial children with connectors;
clicking again collapses it. Outer edges stay intact, and the unfold is animated through
`playRepresentationChanges`. No second renderer, no new node type.

**Lift:** a `FoldableNode` interaction policy over `innerTree` + `innerPlacements` that any host can
attach to a container node. Useful whenever a graph must show both a summary and its contents.

## 11. Gravity focus — `html/interaction/gravity-focus.html`

Hovering a node rewrites geometry: the node moves to the centre, its one-hop neighbours gather
around it, and unrelated nodes drift outward and dim. `diffPositions` plus shared playback animates
the transition; the committed graph is unchanged.

**Lift:** a `GatherFocus` policy — attention as a layout input rather than a color overlay. This is
a ZUI-specific affordance: color-only dimming is weak when 30 nodes are on screen.

## 12. Lasso scope — `html/interaction/lasso-scope.html`

Drag on empty space to brush a rectangle. Nodes inside become a selection, a real `GroupNode` frame
is fitted around them, and the panel lists the scoped nodes and internal edges. Clicking a scoped
node inspects it; Escape clears.

**Lift:** a `GraphLasso` component — pointer geometry → node ids → scoped group frame. It turns a
familiar 2D gesture into a graph-scope operation that survives zoom.

## 13. Edge travel — `html/interaction/edge-travel.html`

Edges are roads and the camera is the vehicle. Clicking an edge animates a traveler and the camera
from source to target; `edgePath` computes multi-hop routes, `Trail` records visits, Backspace
returns, and an auto tour follows random paths.

**Lift:** an `EdgeTravel` navigation mode composed from `edgePath` + `Trail` + `playRepresentationChanges`.
It makes edge semantics navigable instead of decorative.

## 14. Window desktop — `html/interaction/window-desktop.html`

Nodes are draggable, resizable windows with tabs (DETAIL / INNER / SIGNALS / ACTIONS), a taskbar,
focus, pin, close and maximize. The INNER tab places widgets with `innerPlacements`; type uses
container-query units so it grows with the node, and `HtmlNode.setSize` scales content with node
area. At far zoom windows collapse to compact title cards.

**Lift:** a `GraphWindow` component — title bar, tabs, taskbar binding and ZUI band — over the
existing `HtmlNode` drag/resize machinery.

## 15. Widget detach — `html/interaction/widget-detach.html`

A dashboard node enfolds six widgets laid out by `innerPlacements`. Detaching one promotes it to a
first-class `HtmlNode` with a `contains` edge; reattaching folds it back. Detached nodes can be
dragged like any other node.

**Lift:** an `InnerWidget` policy that maps inner placements to host markup and can promote a widget
to a graph node on demand. This is the practical bridge between inner layout and graph semantics.

## 16. Agent team — `html/interaction/agent-team.html`

A control surface for several agents. Each agent is a ZUI window with role, status, tool, tokens and
files; `delegates`, `hands-off`, `awaits` and `reports` edges make the team structure visible. The
operator is a node, so steering creates a real edge and a log entry rather than a hidden message.
Brush a region to frame a team scope with aggregate token and blocked counts. Zoom collapses the
windows to status cards; the taskbar switches agent tabs.

**Lift:** `AgentTeamView` + `SteerEdge` + `TeamScope`. This is the closest experiment to a Pi Durable
team dashboard: it keeps per-agent tabs while making cross-agent work inspectable.

## 17. Dev session atlas — `html/layout/dev-session.html`

One development session as a navigable graph: prompt → plan → tools → file edits → failure → patch →
approval → commit. Chapter frames from `terminalChapters` mark turns at mid zoom; a replay slider
uses `terminalReplaySteps` + `playTerminalReplay` to reveal committed prefixes; clicking an edge
travels the camera along the causal chain; clicking a node opens its text in an inspector, and
"OPEN WINDOW" promotes that line into a floating node.

**Lift:** `SessionAtlas` + `ReplayScrubber` + `EventWindow`. This is the candidate shape for a full
Pi Durable session view where the transcript, graph and time travel share one projection.

## Patterns worth lifting into Pi Durable

| Pattern | Experiment | Why it matters for the app |
| ------- | ---------- | -------------------------- |
| `GraphWindow` | 14 | Agent/session windows with tabs, drag, resize, taskbar and ZUI bands |
| `InnerWidget` | 15 | Widgets enfolded in a node can be promoted to graph nodes on demand |
| `AgentTeamView` | 16 | Per-agent tabs plus a team-level graph; status and handoffs stay visible |
| `TeamScope` | 12, 16 | Brush a subset of agents, frame it, read aggregate stats |
| `SteerEdge` | 16 | Steering and approval become durable, visible edges from the operator |
| `SessionAtlas` | 17 | One session spans chapters, tools, files, failures and commits |
| `ReplayScrubber` | 17 | Time travel over committed prefixes, not re-created facts |
| `EventWindow` | 17 | Promote a transcript line into a window for side-by-side work |
| `GatherFocus` | 11 | Attention as geometry, useful with many simultaneous agents |
| `GraphLens` | 9 | Second-camera magnifier for dense team or session graphs |
| `EdgeTravel` | 13, 17 | Causal edges are navigable paths, not decoration |

`GraphWindow` is promoted: its pure shell and pattern card live in
`packages/window-manager/src/graph-window.ts` and
[`GRAPH-WINDOW.md`](../packages/window-manager/GRAPH-WINDOW.md). Demo 14 and Pi Durable labs mode
(`?labs=1`) are its two consumers.

Suggested adoption order for Pi Durable: (1) per-agent graph windows and a team toggle, (2) steer and
approve edges, (3) the session atlas with replay, (4) team scope and lens as density grows. Each step
reuses the terminal projection and kernel facts; none introduces a second store.

## What these experiments share

| Primitive | Used by | Already in library |
| --------- | ------- | ------------------ |
| `terminalLineHTML`, `terminalTokens` | 1, 2, 3, 5 | yes (`src/terminal.ts`) |
| `terminalChapters`, `terminalGrow` | 1 | yes |
| `terminalFacets`, `terminalFacetMatch` | 1, 3 | yes |
| `terminalDiff` | 4 | yes |
| `terminalReplaySteps`, `playTerminalReplay` | 3 | yes |
| `Trail` | 2, 5 | yes (`src/navigation`) |
| `extractSubgraph` | 2 | yes (`src/overlays`) |
| `ScaleDomain`, `terminalLODFor`, `terminalFidelity` | 1, 6, 7 | yes |
| `diffPositions`, `interpolatedPositions` | 8 | yes (`src/layout`) |
| `playRepresentationChanges` | 8 | yes (`src/representations`) |
| `GroupNode` + `lodThreshold` | 6, 7 | yes (`src/nodes`) |
| `zoom:change` telemetry, `setPositions`, `setZoom` | 6, 7, 8, 16, 17 | yes (`src/SpaceGraph`) |
| `innerTree`, `innerPlacements` | 1, 10, 14, 15 | yes (`src/inspect`) |
| `edgePath`, `Trail` | 2, 5, 13 | yes (`src/navigation`) |
| `terminalReplaySteps`, `playTerminalReplay` | 3, 17 | yes (`src/terminal`) |
| `addNode` / `removeNode` / `addEdge` / `removeEdge` | 10, 12, 13 | yes (`src/SpaceGraph`) |

The only genuinely new code is host layout: rail alignment, bridge paths and the scope→console
binding. Promote those as one pure model plus one component per experiment, not as new primitives.

## API smell journal

Where host code reached around the library, write down the missing API instead of the workaround.
Promote the API with the component; do not leave the workaround in a second consumer.

| Candidate | Felt in | Workaround it replaces |
| --------- | ------- | ---------------------- |
| `worldToScreen` / `screenToWorld` | 9, 12 | Projecting world positions through `sg.camera` by hand to find a node under the pointer. |
| `scopeFromSelection(ids)` | 12, 16 | Rebuilding a scoped read model from raw ids in the host. |
| `frameGroup(ids)` | 5, 10, 12 | Fitting a `GroupNode` frame after each selection change. |
| `committedEdge(kind)` | 16, 17 | Separating durable steer/handoff/causal edges from visual-only edges. |
| `fidelitySample()` | 1, 6, 7 | Calling `terminalLODFor` and `ScaleDomain.sample()` separately for one zoom band. |

## Rejected ideas

Kept here so a later session does not re-litigate deliberate scope.

- **Retro skin and rounded chrome** — the screenshots proved structure, not styling; square corners
  stay the default and visual style belongs to the host.
- **Renderer hit testing** — breaks the vector-first invariant; project through the camera instead.
- **A second command registry for agent actions** — one catalog of selectors over one projection.
- **Agent state in DOM only** — steer and approve must become committed facts before promotion.
- **A second console store** — the kernel and the terminal projection remain the only sources.
