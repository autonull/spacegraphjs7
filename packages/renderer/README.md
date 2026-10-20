# @spacegraphjs/renderer

The renderer contract: the only surface a host uses to render a graph, and the only surface an
adapter implements. Types plus two tiny helpers (`CONTRACT_VERSION`, `supports`); **zero runtime
dependencies**.

- Host builds a `RenderModel` (typed nodes, edges, absolute positions) and calls a `GraphRenderer`.
- Adapters (`@spacegraphjs/spacegraph-renderer`, `@spacegraphjs/cytoscape-renderer`) implement
  `GraphRenderer`.
- The `spacegraphjs` core never imports this package.

```ts
import { CONTRACT_VERSION, supports, type GraphRenderer, type RenderModel } from '@spacegraphjs/renderer';

export function mountGraph(renderer: GraphRenderer, container: HTMLElement, model: RenderModel) {
  renderer.mount(container, { theme, projection: '2d' });
  renderer.setModel(model);
}
```

Rules (see `SPACEGRAPH.md` §4.5): the renderer owns geometry, hit-testing, camera, and animation;
the host owns semantic zoom, clustering, layout, and detail content. Positions are authoritative from
the host; renderers never auto-layout. Events carry string IDs and primitives only. HTML cards are
host-provided and sanitized; the renderer never fetches or evaluates them. Capability flags drive UI
affordances via `supports`; unsupported capabilities are disabled with an explanation, never silently
broken.

The camera is a two-way surface: `setViewport` places it and `getViewport` reads it back, so a host
that must place the camera exactly (a permalink, a reduced-motion jump) never has to guess the
renderer's zoom scale. `getViewport` is optional: a renderer that cannot report its camera leaves it
undefined, and a host reads that as "no read-back", never as a broken camera.

Tests: `bun test` from this directory.
