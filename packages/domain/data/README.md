# @spacegraphjs/data

Open-ended data-pipeline semantics for SpaceGraphJS. This is the fourth domain wrapper: proof that
the semantic-wrapper recipe holds for an observational, lineage-heavy vocabulary as well as an
execution-heavy one.

- **Vocabulary** — `pipeline`, `dataset`, `step`, `run`, `model`, `metric` with advisory role tags;
  no fixed role enum.
- **Mapping** — `DataEventMapper` turns pipeline events into `KernelOp`s using ordinary `contains`,
  `orders`, `feeds`, `writes`, `evaluates` and `retries` edges. It never emits `inferred-cause`.
- **Selectors** — why, led-here, downstream, upstream, related, metric lineage, model metrics, step
  inputs and regressions. Regression is a derived comparison of `value` against `baseline`, never a
  hand-authored label.
- **Facets / trace** — `dataFacetAccessors` and `dataTraceVocabulary` for `@spacegraphjs/search`
  and `@spacegraphjs/trace`.
- **Conformance** — a provider-free fixture composed with `adapterConformance` proves the view
  reaches a `RenderModel` without leaking data vocabulary into the library.

No pipeline provider or host types appear here. Hosts supply their own vocabulary and may ignore any
capability they do not have. See [`docs/semantic-wrappers.md`](../../docs/semantic-wrappers.md).
