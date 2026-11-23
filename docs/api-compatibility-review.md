# Public API compatibility review (TODO10 E3)

Scope: exported symbols in `src/`, `src/*/index.ts` barrels and the generated subpath map
(`script/library-entries.ts`). Outcome: **no symbol removed in this minor**. Every compatibility
alias stays and gains a `@deprecated` pointer at the next minor boundary, per
`docs/contract-versioning.md` and ADR 0013.

## Compatibility aliases — keep, annotate at the next minor

| Symbol | Replacement | Location |
| --- | --- | --- |
| `Graph.getNode`, `getEdge`, `hasNode`, `query*` | `graph.query` engine methods | `src/core/Graph.ts` |
| `GraphQuery.neighbors`, `getIncomingEdges`, `getOutgoingEdges` | typed traversal on `GraphQuery` | `src/core/GraphQuery.ts` |
| `PluginManager.getPlugin`, `hasPlugin`, `getPluginNames`, `pluginNames`, `pluginCount` | the typed plugin registry accessors | `src/core/PluginManager.ts` |
| `DEG2RAD`, `AnimationDuration`, `ZOOM_*`, `InputConfig`, `ZoomConfig` | `Interaction`, `Zoom` and the typed constant groups | `src/core/constants.ts` |
| `FractalZoomPlugin` | `ZoomBandsPlugin` (already `@deprecated`) | `src/plugins/FractalZoomPlugin.ts` |
| `createGraph`, `sg`, `qg` | `createSpaceGraph` | `src/index.ts` |

## Duplicate or surprising exports — review only

- `LayoutConfig` / `LayoutOptions` are exported from both `src/index.ts` and `src/layout/index.ts`.
  Keep both: they are the same declaration and removing either breaks a published import path.
- `src/index.ts:128` exports `./plugins/layouts` as `layout`, while `spacegraphjs/layout` maps to
  `src/layout/index.ts`. Both paths are published; keep them and document the distinction rather
  than rename in this minor.
- `./types` and `./builder` point at `src/types.ts` and `src/builder.ts` while sibling
  `src/types/index.ts` and `src/builder/index.ts` directories exist. Keep the published entries;
  any consolidation is a breaking move deferred to the next minor.

## Verification

`test/package-exports.test.ts` checks the committed manifest against `LIBRARY_ENTRIES`;
`test/boundaries.test.ts` checks one-definition/two-consumer promotion rules. No export was moved,
so both remain unchanged by this review.
