# ADR 0003 — Hosts own policy; library owns mechanisms

- Status: Accepted
- Date: 2026-11-21
- Source: `TODO3.md` §2 invariants 3, 7; `docs/not-decided.md` §"Settled by the flagship work"

## Context

Putting aesthetic, geometric or navigational choices inside library consumers makes every host fork
the library to change behavior and hides the source of a decision.

## Decision

Library helpers are headless and testable; hosts own every choice through one policy schema with
provenance. No hidden constants inside consumers. Mechanisms are pure and parameterized; policies
are data (presets, URLs, experiment assignments).

## Consequences

Any configuration is a URL and any experiment is a URL without a contract change. A knob's value
always has a recorded source. Host vocabulary never leaks into `src/` or a published package.
