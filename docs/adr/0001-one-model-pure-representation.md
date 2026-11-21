# ADR 0001 — One model; representation is a pure function

- Status: Accepted
- Date: 2026-11-21
- Source: `TODO3.md` §2 invariant 1

## Context

A zoomable interface can accumulate parallel trees: one for data, one for what is drawn at each
scale, one for host state. That makes behavior depend on render history and defeats deterministic
replay.

## Decision

Nodes, edges and scopes form one model. Every rectangle is a portal. Representation is a pure
function of `(node, scale, activity, legibility, policy)`; the library owns only the pure helper,
the host owns budgets and markup.

## Consequences

Replay and counterfactual scoring read the same model the renderer draws. Tests can exercise
representation without a renderer. Hosts cannot smuggle hidden constants into a consumer.
