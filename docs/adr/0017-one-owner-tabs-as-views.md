# 0017 — One owner, tabs as views

- Status: Accepted
- Date: 2026-11-24
- Source: `app/pi-durable` Core implementation and `TODO12.md` §1

## Context

A durable session has one writer per storage. Opening a second Harness per browser tab would create
competing owners and duplicate answers after a restart. The flagship's state machine cannot be
duplicated into a second app without doubling its hooks and shot matrix.

## Decision

One Node process owns one Harness over one storage. Browser tabs are views over conversation
handles, each holding a `SessionKernel` and host-owned view state in a `TabRegistry`. A single SSE
stream carries one `KernelOp` per frame and is demultiplexed on `lastEventId`; a tab switch restores
the active kernel and camera instead of remounting a session. `WorkspaceKernel` composes the tabs for
overview and export only.

## Consequences

- Restart recovery has one owner to resume, and a retried `requestId` cannot produce a second answer.
- Focus, selection, camera, band and transcript scroll are host state beside the kernel, never durable events.
- A browser-owned Harness with competing owners stays out of scope (see `TODO12.md` §11).
