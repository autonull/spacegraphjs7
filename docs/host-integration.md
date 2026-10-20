# Host integration guide

How a non-OpenCode host — an agent UI such as Hermes — reuses SpaceGraphJS without forking it or
importing host packages. Everything here is contract-first: you build a `RenderModel`, pick a renderer,
and the library never learns your host's vocabulary.

The reference host is the sibling OpenCode prototype (`packages/session-graph` there); the
non-OpenCode fixture is `spacegraphjs/test/fixtures/activity-host.ts`, used by the shared conformance
suite.

## 1. The boundary

```
your activity data ──► your adapter ──► RenderModel ──► @spacegraphjs/renderer (contract)
                                                             │
                                          ┌──────────────────┼──────────────────┐
                                          ▼                  ▼                  ▼
                                 @spacegraphjs/         @spacegraphjs/     @spacegraphjs/
                                 spacegraph-renderer    cytoscape-renderer svg-renderer
                                    2D + 3D              2D (fallback)      static export
```

- The contract (`@spacegraphjs/renderer`) is types plus tiny helpers, zero dependencies. Import it and
  one adapter. You never import `spacegraphjs` core unless you are writing the SpaceGraph adapter.
- A renderer owns geometry, hit-testing, camera, and animation. It never owns semantics, clustering, or
  detail content.

## 2. Map your data to a `RenderModel`

Build nodes and edges from your own model. Stable IDs are the whole game: reuse your message/tool/part
IDs so positions and selection survive updates.

```ts
import type { RenderModel } from '@spacegraphjs/renderer';

export function toRenderModel(activity: Activity[]): RenderModel {
  return {
    nodes: activity.map((item) => ({
      id: `tool:${item.id}`,
      kind: item.kind,                 // your vocabulary; the renderer never interprets it
      label: item.title,
      summary: item.detail,
      shape: item.rich ? 'card' : 'badge',
      html: item.rich ? sanitize(item.html) : undefined, // sanitize before it crosses the boundary
      status: mapStatus(item.state),   // neutral | pending | running | success | warning | error
      position: [item.x, item.y, item.z],
    })),
    edges: activity.flatMap((item) =>
      item.after ? [{ id: `e:${item.id}`, source: `tool:${item.after}`, target: `tool:${item.id}`, kind: 'sequence', directed: true }]
                 : [],
    ),
  };
}
```

Rules the renderer relies on:

- **Absolute positions are authoritative.** The renderer never auto-layouts. Compute them yourself
  (see §5).
- **Events carry string IDs and primitives.** No library objects cross the boundary.
- **`data` is serializable.** No functions, DOM nodes, or instances.
- **HTML is host-provided, sanitized, and never evaluated.** Wrap untrusted text; the renderer only
  positions your markup.

## 3. Choose a renderer

```ts
const Renderer = (await import('@spacegraphjs/spacegraph-renderer')).SpaceGraphRenderer;
const renderer = new Renderer();
const negotiation = negotiateContract(renderer.capabilities.contractVersion);
if (!negotiation.ok) throw new Error(negotiation.message); // fail clearly, do not crash later
await renderer.mount(container, { theme, projection: '2d' });
renderer.setModel(model);
```

- Default to `@spacegraphjs/spacegraph-renderer` (2D orthographic + 3D perspective). Use
  `@spacegraphjs/cytoscape-renderer` as a 2D fallback/benchmark. `@spacegraphjs/svg-renderer` is static
  only (export and inline subgraphs), not an interactive `GraphRenderer`.
- Mount behind a dynamic `import()` so a renderer you do not use never enters your entry bundle.
- Fall back on a mount failure: construct the next adapter on the same container and keep the model.
- Gate every capability: `supports(renderer.capabilities, '3d')` before offering a 3D affordance.
  Disable unsupported actions with an explanation; never call a method the adapter declares it lacks.

## 4. Theming

`RenderTheme` is a flat object of colors, fonts, and an optional `direction`. Map your design tokens to
it once and re-resolve on a color-scheme change (theme the renderer, do not remount it).

```ts
const theme: RenderTheme = { ...tokens, fontFamily: bodyFont, fontSize: 13, direction: document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr' };
renderer.setTheme(theme);
```

- The library never reads CSS custom properties; you pass resolved values.
- `direction: 'rtl'` is honored by the SVG renderer (`<svg direction="rtl">`) and the adapters' DOM
  cards (`dir`), and never mirrors graph coordinates.

## 5. Layout and zoom policy

- The contract supplies no layout. Compute deterministic, append-only positions yourself.
  `spacegraphjs/layout` is the headless helper: `LaneLayout` is a grid — columns advance on X, rows
  on Y, every (column, row) cell keeps its own cursor, so a row advances by the widths of the items
  it holds — and `Strategies` are the lanes, timeline and hierarchy views as policies over it.
- Semantic zoom is **your** policy. The library's `spacegraphjs/zoom` (`ZoomBands`) maps a normalized
  renderer zoom to named bands; you decide what each band shows. The common shape is three levels:
  overview (clusters with counts), execution (tool activity), detail (reasoning and full content).
- Fit/focus only on explicit user action, first load, or a data-source change — not on every update.
- The fit carries options a host can use to frame what it wants framed:
  ```ts
  renderer.fit(nodeIds, {
    minScale: 0.5,                                    // never shrink a world unit below half a pixel
    padding: 40,                                      // a margin in world units, the same on every renderer
    insets: { right: 232, bottom: 152 },              // screen-space margins, in CSS pixels
  });
  ```
  `insets` are for chrome the host draws **over** the canvas — a floating inspector, a header, a
  bottom sheet, a minimap. The renderer frames the content in what is left, so the content is never
  hidden under the chrome. A host that gives the canvas its own space (a side panel beside it) needs
  no insets. `capabilities.fitInsets` says whether the renderer can honour them at all.

## 6. Interaction, accessibility, and navigation

- Selection, click, hover, and viewport come from `renderer.on(event, handler)`; the payloads are
  string IDs and primitives.
- `spacegraphjs/control` (`GraphController`) owns the interaction state shared across frameworks:
  selection, focus, the navigation trail, zoom bands, and search. Construct it with your bands,
  `setModel(renderModel)`, and `bind(renderer)`; subscribe with `onChange(snapshot)` and re-render
  your framework from the snapshot. It reads a minimal `{ id, label, kind, summary, status }` node
  shape, so any `RenderModel` is accepted. The controller owns no DOM and no framework; the host still
  supplies the detail panel.
- `spacegraphjs/a11y` (`AccessibilityLayer`) is a visually hidden, ordered DOM mirror with roving
  tabindex and arrow traversal. Pass it minimal `{ id, label, kind, status, interactive }` items
  (mapped from `RenderModel.nodes`) so keyboard users reach what the canvas draws.
- `spacegraphjs/navigation` (`Trail`) is a breadcrumb/focus history that reconciles by ID across model
  updates; `GraphController` drives it for you, but it is usable on its own.
- `GraphBinding` (also `spacegraphjs/control`) owns the renderer lifecycle for one container: construct
  it with `createRenderer`, `theme`, `model`, and `projection`, then `mount(container)`; the setters
  push updates and `dispose()` tears down the renderer and the controller. A mount that resolves after
  an unmount disposes its own renderer, so it is StrictMode/HMR safe. `react-spacegraph` and
  `solid-spacegraph` are thin lifecycle wrappers over it.

## 7. Persistence and export

- Persistence is entirely yours. Persist selection, level, projection, and renderer per session in your
  own view state; the library keeps none.
- Export with `renderToSVG(model, options)` (pure, runs in Node) or `InlineGraph(container)` for an
  embedded static preview. Serialize with `serializeRenderModel(model)` and restore with
  `parseRenderModel(json)` (returns `undefined` on malformed input).

## 8. Hermes-style checklist

1. Write `toRenderModel(activity)` in your host; keep your vocabulary out of the library.
2. Add `@spacegraphjs/renderer` + `@spacegraphjs/spacegraph-renderer` as dependencies; dynamic-import
   the adapter behind your own lazy boundary.
3. Map your design tokens to `RenderTheme`; re-resolve on scheme change.
4. Compute deterministic positions; choose a semantic-level policy.
5. Mount on first show, `dispose()` on unmount; `mount` and `dispose` are idempotent (StrictMode safe).
6. Gate 3D and minimap on capabilities; fall back to Cytoscape on a SpaceGraph mount failure.
7. Mount `AccessibilityLayer` over `RenderModel.nodes`; mount `Trail` for breadcrumbs.
8. Offer `renderToSVG`/JSON export.

For a framework host, skip steps 5–6's manual wiring: mount `GraphView` from `react-spacegraph` or
`solid-spacegraph` with `createRenderer`, `model`, `theme`, and `projection`. Both wrap `GraphBinding`
(so `mount`/`dispose` are StrictMode-safe) and call `onReady(renderer)` once the adapter is live.

## 9. Versioning

`CONTRACT_VERSION` is an integer; breaking changes bump it. Adapters declare theirs in
`capabilities.contractVersion`. Call `negotiateContract(version)` and surface the result — a mismatch is
a clear message, not a runtime failure. For a non-OpenCode page, see the fixture in
`demo/activity-host.ts`; the runnable two-adapter library demo is `demo/contract.html`.

**Contract v3 (the fit options).** v3 adds `padding` and `insets` to the fit options and the
`fitInsets` capability. The options are additive: a v2 adapter ignores them and still frames the
whole surface, so a v3 host accepts a v2 adapter (`SUPPORTED_CONTRACT_VERSIONS` is `[2, 3]`). A v3
adapter against a v2 host is refused with a clear message — the v2 host cannot know what the newer
adapter expects. Nothing else changed: the model, the events, and the capabilities are the same.

## 10. What the library does not do

`docs/limitations.md` lists the library's own limits — the mesh outline is a bounding box rather
than a silhouette, the depth fade is a scene fog that DOM cards do not follow, DOM cards are the
supported path for readable text, and the layout engine places without knowing the screen. Read it
before you promise a host something the engine does not do.
