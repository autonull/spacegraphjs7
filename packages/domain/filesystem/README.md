# @spacegraphjs/filesystem

Open-ended filesystem semantics for SpaceGraphJS. This is the third domain wrapper: proof that the
semantic-wrapper recipe holds for a second, visibly different vocabulary.

- **Vocabulary** — `commit`, `file`, `symbol`, `change`, `artifact` with advisory role tags; no fixed
  role enum.
- **Mapping** — `FilesystemEventMapper` turns repository events into `KernelOp`s using ordinary
  `contains`, `orders`, `writes`, `depends` and `produces` edges. It never emits `inferred-cause`.
- **Selectors** — why, led-here, downstream, upstream, related, change producers, symbol dependents,
  symbol dependencies and change origins. "What produced this change" and "which symbols depend on
  it" are first-class queries.
- **Facets / trace** — `filesystemFacetAccessors` and `filesystemTraceVocabulary` for
  `@spacegraphjs/search` and `@spacegraphjs/trace`.
- **Conformance** — a provider-free fixture composed with `adapterConformance` proves the view
  reaches a `RenderModel` without leaking filesystem vocabulary into the library.

No repository provider or host types appear here. Hosts supply their own vocabulary and may ignore
any capability they do not have. See [`docs/semantic-wrappers.md`](../../docs/semantic-wrappers.md).
