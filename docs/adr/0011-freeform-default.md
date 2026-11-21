# ADR 0011 — Freeform zero-g default; structured geometry is opt-in

- Status: Accepted
- Date: 2026-11-21
- Source: `docs/not-decided.md` §"Settled by the flagship work"; `TODO1.md`

## Context

A fixed global layout (lanes, grid, tree) imposes one structure on every domain and conflicts with
self-adapting, zoomable scope geometry.

## Decision

Freeform, zero-gravity, self-adapting layout is the flagship default. Lanes, grid and tree are
opt-in per scope. This is host policy, not a library default; no coordinate schedule is fixed by the
engine.

## Consequences

A new domain needs no layout decision to be readable. Structured views are available as presets and
can be compared experimentally. Layout strategy stays a policy knob.
