# Changelog

All notable changes to SpaceGraphJS are recorded here. This file starts with the embedding and
generalisation work that makes the library reusable as a renderer behind a host-owned contract
(`@spacegraphjs/renderer`). Entries name the public surface they change and flag breaking changes
explicitly; the library ships from source in the prototype, so "breaking" means a consumer of the
previous prototype surface must update.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The library version is
`7.0.0`; the renderer contract has its own `CONTRACT_VERSION` (see below).

## Unreleased — embedding, contract, and generalisation

### Added

- **Lean `activity` entry** (`spacegraphjs/activity`). A small entry exporting `SpaceGraph`, `Graph`,
  `EventEmitter`, the common node/edge classes, the three deterministic layouts, `LODPlugin`, and
  `ZoomBandsPlugin`, plus theme/types. It never pulls `onnxruntime-web`, `@monaco-editor/loader`,
  `three-mesh-bvh`, Chart, or Math nodes. `test/entry-critical-path.test.ts` asserts neither ONNX nor
  Monaco is evaluated on import.
- **Renderer contract package** `@spacegraphjs/renderer` (`CONTRACT_VERSION = 1`). Dependency-free
  types plus `supports(capabilities, capability)`, `SUPPORTED_CONTRACT_VERSIONS`,
  `supportsContractVersion`, and `negotiateContract`. The core never imports it.
- **SpaceGraph adapter** `@spacegraphjs/spacegraph-renderer` (`SpaceGraphRenderer`). The only package
  that imports both the core and the contract. Loads the core by dynamic `import()` inside `mount`, so
  importing the adapter pulls no `three`/WebGL; ID-diffs the model, maps status/kind to specs, applies
  host positions with `setPositions`, and reports viewport/band telemetry.
- **Cytoscape adapter** `@spacegraphjs/cytoscape-renderer` (`CytoscapeRenderer`). Depends only on the
  contract and `cytoscape`; never imports the core. `preset` layout with absolute positions only,
  ID-diffed `cy.batch` updates, a clipped `pointer-events: none` DOM overlay for `shape: "card"`
  (capped at `maxDomNodes`), and string-ID events. `setProjection('3d')` is a declared no-op.
- **Static SVG renderer** `@spacegraphjs/svg-renderer`. `renderToSVG(model, options?)` runs in Node
  with no browser; `InlineGraph(container, options?)` sets the result into a host element.
  `serializeRenderModel`/`parseRenderModel` add validated JSON round-tripping. Not an interactive
  `GraphRenderer`.
- **Generic controller modules** (contract-free subpaths):
  - `spacegraphjs/zoom` — `ZoomBands` (validated contiguous bands, hysteresis, `feed`/`feedNormalized`,
    change callbacks, `snapshot`).
  - `spacegraphjs/layout` — `LaneLayout` (lane → Y, ordinal → X, depth → Z, `reserve`, `bounds`,
    append-only `place`).
  - `spacegraphjs/a11y` — `AccessibilityLayer` (visually hidden ordered mirror, roving tabindex,
    Arrow/Home/End traversal, Enter/Space, Escape, `aria-live`; optional `formatSelection` hook).
  - `spacegraphjs/navigation` — `Trail` (push/replace/back/forward, forward-truncation, `maxDepth`,
    `reconcile(byId)`, `reset`).
- **Orthographic projection** — `Renderer` owns both cameras; `SpaceGraph.setProjection("2d" | "3d")`
  swaps them and derives the ortho frustum from the perspective framing. `RenderContext`, raycasting,
  `onResize`, and `fitView` follow the active camera. Orbit is disabled under orthographic.
- **Zoom telemetry** — `src/core/zoom.ts` normalizes perspective distance or ortho zoom to `0..1`;
  `SpaceGraph.zoom`/`setZoom`/`zoomToFit`/`viewport` and `camera:change`/`zoom:change`/
  `projection:change` events (value-deduped).
- **Unified selection** — `src/core/Selection.ts` is the single source of truth; `SpaceGraph.select`/
  `clearSelection`/`toggleSelection`/`deselect`/`selectAll`/`deselectAll`, `selected` (ids) and
  `selectedNodes`; `selection:changed` and per-node `node:selection-changed`. `ErgonomicsAPI` delegates.
- **Graph event forwarding** — `forwardGraphEvents` mirrors `node:added|removed|updated`,
  `edge:added|removed|updated`, and `graph:cleared` onto `sg.events`; `Graph.updateNode` now emits
  `node:updated`.
- **Click semantics** — `node:click`/`edge:click`/`background:click`/`node:dblclick` with
  `{ id, originalEvent }`, emitted only when pointer movement stays within a 5px threshold and no
  box-select/connect/resize is active.
- **Stable layout primitives** — `Graph.setPositions(map)`, `Graph.pinAll()`,
  `SpaceGraph.setPositions`/`pinAll`/`layoutOnce`. Physics stays off by default and `AutoLayoutPlugin`
  is a no-op.
- **Camera pose API** — `CameraControls.setOrbitEnabled(enabled)` and `setPolar(phi, theta, duration)`;
  `SpaceGraph.setOrbitEnabled`/`setPolar`.
- **Theme surface** — `SpaceGraphTheme` gains `node {fill, stroke}`, `edge {color, labelColor}`,
  `label {color, fontFamily, fontSize}`, and `selection`/`hover`/`focus`; `src/core/theme.ts`
  (`resolveTheme`, `applyNodeTheme`, `applyEdgeTheme`).
- **Embed options** — `SpaceGraphOptions.render` (`backgroundColor`, `transparent`, `antialias`,
  `pixelRatio`, `preserveDrawingBuffer`, `projection`, `renderMode`), `chrome`, `theme`, `plugins`,
  `global`, `keyboard`, `doubleClickFocus`.
- **Node/edge additions** — `DOMNode` accepts an existing `HTMLElement` (`spec.data.element`), is
  registered in `DEFAULT_NODE_TYPES`, and strips `element` from updates; `EdgeData.hitWidth` drives the
  edge raycast threshold; `Renderer` gained a `CSS2DRenderer` layer so edge labels paint.
- **Touch parity** — `InputManager.routeFingeringEvent` dispatches multi-touch;
  `PinchZoomFingering` is projection-aware (pinch → zoom, two-finger drag → pan).
- **Node-type registration** — `nodeTypeName` (own-property `typeName` only) in `src/core/defaults.ts`.

### Changed

- **Chrome is opt-in (breaking).** `HUDPlugin`, `MinimapPlugin`, `ZoomUIPlugin`, and
  `FractalZoomPlugin` moved from `DEFAULT_SYSTEM_PLUGINS` to `DEFAULT_CHROME_PLUGINS`; `chrome`
  defaults to `false`, so a bare `new SpaceGraph(container)` mounts only the canvas + CSS3D layer and
  appends nothing to `document.body`. Pass `chrome: true` (or `plugins: [...]`) to restore.
- **Global registration is opt-in (breaking).** `window.SpaceGraph` and `SpaceGraph.instances` are only
  populated when `global: true`.
- **Keyboard is container-scoped by default (breaking).** `SpaceGraphOptions.keyboard` defaults to
  `'container'` (was effectively window/global); keys targeting an editable element are ignored.
- **Rendering is on-demand by default (breaking).** `RenderOptions.renderMode` defaults to
  `'on-demand'`; pass `renderMode: 'continuous'` for the previous always-on rAF loop.
- **`SpaceGraph.selected` returns `string[]` ids (breaking).** It previously returned `Node[]`;
  `ErgonomicsAPI.selected` still returns `Node[]`.
- **Core renderer renamed (breaking).** `Renderer` → `WebGLRenderer` in `src/core/WebGLRenderer.ts`;
  `export { WebGLRenderer as Renderer }` remains a `@deprecated` alias for one release. "Renderer" in
  public docs now means the contract/adapters.
- **Cross-instance edge resolution removed (breaking).** `Graph.addEdge` resolves endpoints only in its
  own graph and never auto-selects `InterGraphEdge`; two instances with duplicate node ids stay
  independent.
- **Node/edge type resolution (breaking).** Because inherited `static typeName` is no longer used,
  `type: 'Edge'` now constructs `Edge` (not the last-registered `Wire`) and `type: 'HtmlNode'` now
  constructs `HtmlNode` (not `MermaidNode`). Omit `type` only when the base class is intended.
- **`HoverFingering` removed (breaking).** It never activated (`start()` always returned `false`);
  `HoverManager` is the single hover source.
- **`FractalZoomPlugin` deprecated.** Superseded by `ZoomBandsPlugin` (in `DEFAULT_CHROME_PLUGINS`),
  which delegates to the `ZoomBands` controller and also emits the legacy `fractal:level-change`.
- **Node/edge theming.** Base `Node`/`Edge` constructors apply the theme to their `data`; `ShapeNode`
  reads its colour from `this.data`; `LabeledEdge` uses `theme.edge.labelColor`/`theme.label`.
- **Focus/selection outline.** `Node.setControlState` drives `syncVisual()`, showing a theme-coloured
  `BoxHelper` on focus/selection/hover (`DOMNode` draws a DOM outline instead).
- **Deterministic layouts.** `BaseLayout.applyPosition` applies positions synchronously and no longer
  reaches for `window.gsap`; `HierarchicalLayout` skips pinned nodes.
- **LOD correctness.** `Node.computeLOD` is the single implementation and honours per-node
  `data.minZoom`/`data.maxZoom`/`data.lod`; bounds are cached per render frame; hidden/LOD-culled nodes
  are not pickable.
- **Edge-label declutter.** `Renderer` hides overlapping CSS2D labels (and labels over DOM cards) via
  `declutterLabels`, capped at 200 labels + 200 card rects.
- **Color parsing.** `parseColor` drops alpha from 8-digit hex and expands 3-digit hex; the core
  `Renderer` normalizes its background through it.
- **Minimap / zoom-control embedding.** `MinimapPlugin` is container-scoped, gains
  `settings.enabled`/`setEnabled`, throttles its scene pass (`settings.intervalMs`, default 100ms), and
  derives the viewport rectangle from the active camera. `ZoomUIPlugin` is container-scoped and
  releases its listener/timer on `dispose()`.
- **Lifecycle.** `init()`/`dispose()` are idempotent; `dispose()` releases renderer (ResizeObserver +
  WebGL + DOM), camera controls, input, vision, plugins, graph, and events.

### Fixed

- `LabeledEdge` constructor crash (the base `Edge` constructor called the overridable `update()` before
  the label fields existed; a `ready` guard defers `_positionLabel`/`updateLod`).
- Both adapters echoed their own programmatic `setSelection` as a user `selectionChange`, causing a
  selection feedback loop; a guard flag suppresses it.
- `calculateFitView` was perspective-only and never scaled the ortho frustum; it is now
  projection-aware and `SpaceGraph.fitView` passes the frustum zoom through `CameraControls.flyTo`.
- The SpaceGraph adapter forced every non-card node to `size: 1`, rendering `panel`/`badge` nodes as
  sub-pixel boxes; it now passes the host size only when supplied.
- `MermaidNode`/`HtmlNode` and `Edge`/`Wire` type-name collision (see **Changed**).
- The Cytoscape adapter passed 8-digit-hex host theme tokens into `cy.style`; `normalizeTheme` drops
  alpha from 8-digit hex and expands 3-digit hex at `mount`/`setTheme`.
- The SpaceGraph adapter upserted node specs by id and never remodelled a node whose type changed; it
  now drops and recreates a node whose spec type changed (semantic zoom becomes a representation
  change). The Cytoscape adapter re-applies `classes` on update.
- `PluginManager` field order no longer evaluates `pluginNames` before `plugins` exists.

### Package boundaries

- `test/boundaries.test.ts` (run by `test:boundaries`) enforces the direction: the core imports none
  of the contract/adapters/`cytoscape`; the contract has zero imports; the Cytoscape and SVG renderers
  stay off the core and Cytoscape; only the SpaceGraph adapter imports both core and contract.
- Each package carries explicit `exports`, `sideEffects: false`, and peer deps. A `build` script is
  deferred while the packages are consumed from source.

### Naming (renderer surface)

| Concept | Name |
|---|---|
| Contract package | `@spacegraphjs/renderer` |
| Contract interface | `GraphRenderer` |
| Renderer-facing data | `RenderModel` |
| Core WebGL class | `WebGLRenderer` (alias `Renderer`, deprecated) |
| SpaceGraph adapter | `@spacegraphjs/spacegraph-renderer` |
| Cytoscape adapter | `@spacegraphjs/cytoscape-renderer` |
| Static SVG renderer | `@spacegraphjs/svg-renderer` |
| Lean core entry | `spacegraphjs/activity` |
| Generic utilities | `spacegraphjs/zoom`, `spacegraphjs/layout`, `spacegraphjs/a11y`, `spacegraphjs/navigation` |

Do not use "engine" for a renderer backend. The core never imports the contract; the adapters are
optional leaves.

### Migration (source consumption → packaged)

Until `dist` builds land, consume the packages from source. See
[docs/host-integration.md](./docs/host-integration.md) for the boundary, data mapping, renderer choice
and fallback, theming, layout/zoom policy, accessibility, persistence, export, and versioning, and the
non-OpenCode reference demo at [demo/contract.html](./demo/contract.html).
