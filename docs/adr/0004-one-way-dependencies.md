# ADR 0004 — One-way dependency: host → domain → kernel → shared

- Status: Accepted
- Date: 2026-11-21
- Source: `TODO3.md` §2 invariant 6, `TODO1.md` §"Dependencies"

## Context

A dependency cycle between the engine and a renderer or a host makes each package unbuildable in
isolation and turns the contract into an implementation detail.

## Decision

Dependencies point one way. Core never imports the renderer contract or a specific renderer. Pi and
demo types never enter `src/`, the leaf packages or published domain packages. Boundary tests
enforce the rule.

## Consequences

Published packages build independently. Swapping an adapter is a host choice. A boundary violation
fails CI rather than shipping as a hidden coupling.
