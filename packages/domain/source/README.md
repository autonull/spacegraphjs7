# @spacegraphjs/source

Source-code graph semantics for SpaceGraphJS. A scanner emits a small serializable snapshot; this
package turns it into an ordinary kernel view with selectors. The TypeScript compiler API never
enters the browser bundle and no host vocabulary enters the library.

- **Snapshot** — `SourceSnapshot` holds files, packages, exported symbols, imports/re-exports and
  symbol references. `snapshotEvents()` maps it to one shared event stream.
- **Mapping** — `SourceEventMapper` produces ordinary `contains`, `imports`, `exports` and
  `references` kernel ops. It never emits `inferred-cause`.
- **Selectors** — why, led-here, downstream, upstream, related, file symbols, dependencies,
  dependents, symbol references, file facts and an API census.
- **Facets / trace** — `sourceFacetAccessors` and `sourceTraceVocabulary` for `@spacegraphjs/search`
  and `@spacegraphjs/trace`.
- **Conformance** — a provider-free fixture composed with `adapterConformance` proves the view
  reaches a `RenderModel` without leaking source-code vocabulary into the library.

The demo's `source-graph.html` is the first consumer; a second host can supply its own snapshot
without changing this package. See [`docs/semantic-wrappers.md`](../../docs/semantic-wrappers.md).
