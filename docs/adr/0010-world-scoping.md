# ADR 0010 — One world canvas; `InterGraphEdge` only for separate surfaces

- Status: Accepted
- Date: 2026-11-21
- Source: `TODO3.md` §6; `docs/world.md`

## Context

Cross-domain links look like a reason for a special edge type. Using it inside one view would split
one graph into several position authorities and several cameras.

## Decision

Domains in one workspace are child scopes of one root under one `ScopeSimulation`; cross-domain
links are ordinary intra-model edges and one camera flies the qualified trace. `InterGraphEdge`
remains screen-space for genuinely separate surfaces with separate cameras. Isolation is preserved
by construction, not by canvas count.

## Consequences

One canvas holds four isolated domains. `createWorldHost` composes one model; `worldTrace` lifts a
cross-domain path into one camera flight. Embedding in another app uses the four-canvas case.
