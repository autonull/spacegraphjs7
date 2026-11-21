# ADR 0008 — No default changes without a recorded comparison and a human decision

- Status: Accepted
- Date: 2026-11-21
- Source: `TODO3.md` §7; `docs/not-decided.md`; `TODO1.md` stop rule

## Context

A design space this open invites promoting whichever preset looks best in a demo. Without a stop
rule, preferences become defaults by accident and negative results disappear.

## Decision

A variant graduates only if it beats the incumbent on task success and time without a preference
penalty, with the comparison recorded and a human decision logged. Negative results publish
verbatim. The system proposes; humans decide; nothing auto-promotes. The `n >= 5` study has no
winner, so no immersive mode is a default.

## Consequences

`recordDecision`, the report artifact and the online export are the seams. Presets stay examples,
never recommendations. A later promotion is reversible because the comparison is on record.
