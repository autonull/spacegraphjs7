# ADR 0009 — Pull-only promotion into the library

- Status: Accepted
- Date: 2026-11-21
- Source: `TODO3.md` §2 invariant 7, §11; `TODO2.md` promotion ledger

## Context

A helper used by one host is not yet a library abstraction. Promoting it early freezes an API before
its shape is known.

## Decision

Promote a host helper only when a distinct second host consumes it, with a behavior path, test
evidence and byte-for-byte unchanged flagship behavior. The promotion is a mechanical import move,
not a speculative API. Otherwise it stays host work.

## Consequences

`representationLayers` and `createInstrumentKit` were promoted only after a second consumer existed.
Dead paths are deleted rather than kept as permanent aliases. The public surface grows slowly and
with evidence.
