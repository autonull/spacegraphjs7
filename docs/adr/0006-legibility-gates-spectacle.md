# ADR 0006 — Legibility gates spectacle

- Status: Accepted
- Date: 2026-11-21
- Source: `TODO3.md` §2 invariant 8; `docs/not-decided.md`

## Context

New visual states, depth treatments and intermediate zoom frames can be impressive and unreadable.
A check only at the settled rung misses the frames where a user is actually lost.

## Decision

Vision assertions gate every new visual state, including settled, reduced-motion and intermediate
frames. Reduced motion and keyboard parity are first-class requirements, never follow-up work.
Activity can promote a representation rung only when legibility clears the gate.

## Consequences

Visual changes carry measured evidence. `createVisionAssert` is a gate, not an afterthought. The
legibility gate is a pure, testable rule in `representationRung`.
