# @spacegraphjs/workflow

Open-ended workflow semantics for SpaceGraphJS. This is the second domain wrapper: proof that the
semantic-wrapper recipe is repeatable, not a host SDK and not an n8n adapter.

- **Vocabulary** — `workflow`, `subworkflow`, `step`, `run`, `trigger`, `artifact`, `retry` with
  advisory role tags; no fixed role enum.
- **Mapping** — `WorkflowEventMapper` turns execution events into `KernelOp`s using ordinary
  `contains`, `orders`, `delegates`, `writes` and `retries` edges. It never emits `inferred-cause`.
- **Selectors** — why, led-here, downstream, upstream, related, retry chains, step dependencies,
  artifact producers and subworkflow contributions.
- **Facets / trace** — `workflowFacetAccessors` and `workflowTraceVocabulary` for `@spacegraphjs/search`
  and `@spacegraphjs/trace`.
- **Conformance** — a domain fixture composed with `adapterConformance` proves the view reaches a
  `RenderModel` without leaking workflow vocabulary into the library.

No workflow-engine or provider types appear here. Hosts supply their own vocabulary and may ignore
any capability they do not have. See [`docs/semantic-wrappers.md`](../../docs/semantic-wrappers.md).
