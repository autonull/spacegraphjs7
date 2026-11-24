# 0018 — Committed state is the source of truth

- Status: Accepted
- Date: 2026-11-24
- Source: `app/pi-durable/src/translator.ts`, `TODO12.md` §2 and §4

## Context

Durable publishes structural views with Chord ops. Some of that state is deferred or live and can be
shown to a user, but folding it as a fact would let a transient document change the graph.

## Decision

Every graph node and edge comes from a committed Durable fact with a stable id
(`d:<conversation>:<kind>:<id>`). The translator maps a view to `AgentEvent`s and then to idempotent
`KernelOp`s; later revisions replace earlier ones by id. Edges are emitted only where Durable records
a link. Unknown kinds become neutral facts, never inferred causes (ADR 0012). Host layout and status
badges may read live documents but never fold them as facts.

## Consequences

- The same captured stream folds to the same kernel on every replay and after a restart.
- A `fork` edge, a sleeping task and a pending inbox item all carry their Durable id in `data`.
- The four Core shots are reproducible from pure feed data with no private camera path.
