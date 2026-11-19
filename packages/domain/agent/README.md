# @spacegraphjs/agent

Open-ended agent semantics for SpaceGraphJS. This is an optional domain module, not a host SDK.

- **Vocabulary** — kind strings with advisory role tags; no fixed role enum and no host tool table.
- **Mapping** — `AgentEventMapper` turns common agent events into `KernelOp`s using ordinary `contains`,
  `orders`, `writes`, `delegates` and `retry` edges. It never emits `inferred-cause`.
- **Selectors** — why, led-here, downstream, upstream, related, failures, changed artifacts and
  delegation contributions over the resulting view.
- **Facets / trace** — `agentFacetAccessors` and `agentTraceVocabulary` for `@spacegraphjs/search`
  and `@spacegraphjs/trace`.

No Pi or OpenCode types, names or i18n keys appear here. Hosts supply their own vocabulary and may
ignore any capability they do not have.
