# SpaceGraphJS Capabilities

Generic capabilities provided by the SpaceGraphJS library, used by the demo and the OpenCode integration.

| Capability                            | Module                                          | Description                                                           |
| ------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------- |
| Semantic levels / zoom bands          | `spacegraphjs/levels`, `spacegraphjs/zoom`      | Toolbar level selector, camera bands                                  |
| Layout strategies + placement engines | `spacegraphjs/layout` (LaneLayout + strategies) | Lanes, timeline, hierarchy, tree, force                               |
| Summary representations               | `spacegraphjs/representations` (ribbon, matrix) | Ribbon/matrix view modes                                              |
| Navigation (search, minimap, trail)   | `spacegraphjs/navigation`                       | GraphSearch, GraphMinimap, breadcrumbs                                |
| View controller                       | `spacegraphjs/control` (`GraphController`)      | Selection, focus, trail                                               |
| Accessibility (roving tabindex, ARIA) | `spacegraphjs/a11y`                             | Keyboard/screen-reader support                                        |
| Representation ladder + transitions   | `spacegraphjs/representations`                  | Registered rungs, hysteresis, stable-id playback                      |
| Edge ladder + cluster collapse        | `spacegraphjs/edges/ladder`                     | Bundle → hair → arrow → ribbon                                        |
| Host-composed salience                | `spacegraphjs/salience`                         | Signals, explainable emphasis, channel mapping                        |
| HTML widget substrate                 | `spacegraphjs/widgets`                          | Registry, slots, measured sizing, fog, security boundary              |
| Depth spectrum                        | `spacegraphjs/depth` + contract `depths`        | Flat/layered/depth-stack/orbit, blended continuum and host depth axes |
| Motion direction                      | `spacegraphjs/motion`                           | Named verbs, eased/spring playback, host camera verbs                 |
| World + sensory seams                 | `spacegraphjs/world`                            | Optional scene features, instancing LOD, sensory descriptors          |
| Experimentation                       | `spacegraphjs/experiments`                      | Cartesian matrix, neutral metrics, inert templates, honest reports    |
| Scoped overlay & code diff            | `spacegraphjs/overlays`                         | Turn-map overlay, diff view                                           |
| Static export (SVG/JSON)              | `@spacegraphjs/svg-renderer`                    | `renderToSVG`, `serializeRenderModel`, `InlineGraph`                  |
| Mouse interaction contract            | [Mouse map](./interaction.md) (no import)       | Pan, zoom, pick, frame, drag, box-select                              |

## Package Set (Published)

| Package                             | Version | Description                                                                    |
| ----------------------------------- | ------- | ------------------------------------------------------------------------------ |
| `spacegraphjs`                      | 8.5.0   | Core: graph, events, camera, plugins, nodes, edges, vision (dynamic)           |
| `@spacegraphjs/renderer`            | 0.3.0   | Contract types, `GraphRenderer`, capabilities, `FitOptions` (padding + insets) |
| `@spacegraphjs/adapter`             | 0.2.0   | Model adapter pipeline (domain → `RenderModel`), `diffRenderModels`            |
| `@spacegraphjs/kernel`              | 0.1.0   | Layout strategies, zoom bands, navigation primitives, a11y, overlays, depth    |
| `@spacegraphjs/spacegraph-renderer` | 0.3.1   | 2D ortho + 3D perspective, CSS3D HTML cards, CSS2D edge labels                 |
| `@spacegraphjs/svg-renderer`        | 0.2.0   | Static SVG export, `InlineGraph`, serialization                                |

> **Live backends:** `@spacegraphjs/spacegraph-renderer` and `@spacegraphjs/cytoscape-renderer` are
> both interactive; `@spacegraphjs/svg-renderer` is static. See
> [the renderer and binding capability matrix](./renderer-capability-matrix.md) for the tested
> declarations and intentional differences.

## Breaking-Change Policy

The renderer contract is versioned additively: negotiate with `negotiate(...)`, then check `supports(...)` before offering an affordance. Unsupported actions degrade to a documented full path instead of throwing. Published breaking changes keep deprecated aliases until the next minor and are recorded in `CHANGELOG.md`; see `docs/contract-versioning.md` for the version surface and the host integration guide for the negotiation sequence.
