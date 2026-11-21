# ADR 0005 — Capabilities via `supports(...)`, never renderer branches

- Status: Accepted
- Date: 2026-11-21
- Source: `TODO3.md` §2 invariant 6; `docs/capabilities.md`; `docs/not-decided.md`

## Context

`renderer === 'webgl'` style branches tie features to backends and require a branch for every new
combination. A version constant cannot describe what a particular renderer instance supports.

## Decision

Affordances are registered and gated through capability predicates such as `supports(...)` and
`supportsDepth(...)`, probed by existence or a predicate. A backend is detected by capability, never
by `LIBRARY_CONTRACT_VERSION` and never by an identity check.

## Consequences

Adding a renderer or an axis adds a registration, not a branch in the engine. Older backends degrade
by absence rather than throwing. Capability claims are testable in isolation.
