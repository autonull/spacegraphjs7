# ADR 0002 — One position authority

- Status: Accepted
- Date: 2026-11-21
- Source: `TODO3.md` §2 invariant 2, `docs/not-decided.md` §"Settled by the flagship work"

## Context

Two solvers writing the same node's coordinates produce jitter and non-deterministic layouts, which
breaks warm starts, sleep and recorded replay.

## Decision

`ScopeSimulation` owns every coordinate. Physics borrows a bounded set of bodies and reconciles at
rest; it never becomes a second authority. Stability comes from cooling, sleep and warm starts, not
from freezing coordinates.

## Consequences

One camera can fly a cross-domain trace. Layout is reproducible from a seed. Physics play is a
bounded, reversible loan of nodes.
