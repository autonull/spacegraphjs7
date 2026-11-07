# SpaceGraphJS Capabilities

Generic capabilities provided by the SpaceGraphJS library, used by the OpenCode integration and the second host.

| Capability | Module | Description |
|------------|--------|-------------|
| Semantic levels / zoom bands | `spacegraphjs/levels`, `spacegraphjs/zoom` | Toolbar level selector, camera bands |
| Layout strategies + placement engines | `spacegraphjs/layout` (LaneLayout + strategies) | Lanes, timeline, hierarchy, tree, force |
| Summary representations | `spacegraphjs/representations` (ribbon, matrix) | Ribbon/matrix view modes |
| Navigation (search, minimap, trail) | `spacegraphjs/navigation` | GraphSearch, GraphMinimap, breadcrumbs |
| View controller | `spacegraphjs/control` (`GraphController`) | Selection, focus, trail |
| Accessibility (roving tabindex, ARIA) | `spacegraphjs/a11y` | Keyboard/screen-reader support |
| Depth spectrum | `spacegraphjs/depth` + contract `depths` | Flat/layered/depth-stack/orbit |
| Scoped overlay & code diff | `spacegraphjs/overlays` | Turn-map overlay, diff view |
| Static export (SVG/JSON/standalone HTML) | `@spacegraphjs/svg-renderer` | Export button, inline subgraph |
| Mouse interaction contract | `spacegraphjs/interaction` | Pan, zoom, pick, frame, drag, box-select |

## Package Set (Published)

| Package | Version | Description |
|---------|---------|-------------|
| `spacegraphjs` | 8.5.0 | Core: graph, events, camera, plugins, nodes, edges, vision (dynamic) |
| `@spacegraphjs/renderer` | 0.3.0 | Contract types, `GraphRenderer`, capabilities, `FitOptions` (padding + insets) |
| `@spacegraphjs/adapter` | 0.2.0 | Model adapter pipeline (domain → `RenderModel`), `diffRenderModels` |
| `@spacegraphjs/kernel` | 0.1.0 | Layout strategies, zoom bands, navigation primitives, a11y, overlays, depth |
| `@spacegraphjs/spacegraph-renderer` | 0.3.1 | 2D ortho + 3D perspective, CSS3D HTML cards, CSS2D edge labels |
| `@spacegraphjs/svg-renderer` | 0.2.0 | Static SVG export, `InlineGraph`, serialization |

> **Note:** `@spacegraphjs/cytoscape-renderer` has been removed from this fork (Phase 2.6). The SpaceGraph renderer is the only interactive renderer.

## Breaking-Change Policy

No `CONTRACT_VERSION`, no `negotiateContract`, no aliases, no `@deprecated` shims, no migration paths. The library is alpha; the fork is experimental. Breaking changes are made freely. Capability is probed by **existence** (`typeof renderer.applyPatch === "function"`), never by a constant. Absence degrades to the full path; nothing throws. Library change = **one gitlink bump** in the fork plus the host update in the same PR. The commit message states the break. `graph:setup` and CI read the gitlink — never a hardcoded SHA. Delete, don't deprecate: superseded code and its tests go in the same PR.