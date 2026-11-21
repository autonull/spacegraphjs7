# ADR 0012 — Never infer cause; commands are events mapped to `KernelOp`s

- Status: Accepted
- Date: 2026-11-21
- Source: `TODO3.md` §5, §11; `TODO1.md`

## Context

Drawing a causal arrow because two events are correlated would assert a relationship the domain never
recorded. It also breaks transcript parity: the graph would show Causes that the log cannot explain.

## Decision

Orchestration commands are events translated into `KernelOp`s through the existing mapper, never an
`inferred-cause` edge. Every graph action (prompt, steer, approve, reject, retry, compare) writes an
evidence line so the graph and the transcript agree.

## Consequences

Causal claims come from domain data only. Actions are replayable from the event log. The one-way
guard and conformance suites stay green without special cases.
