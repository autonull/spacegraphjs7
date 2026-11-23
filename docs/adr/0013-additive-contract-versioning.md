# ADR 0013 — Additive contract versioning; runtime manifest assembly

- Status: Accepted
- Date: 2026-11-21
- Source: `docs/contract-versioning.md`; `docs/capabilities.md`

## Context

A renderer backend must discover what a host can do without depending on a library release number,
and a generated manifest would drift from the code that assembles it.

## Decision

`LIBRARY_CONTRACT_VERSION` is the version of the additive capability surface and bumps only when an
axis or additive field lands. Every manifest entry carries `minContractVersion`; older consumers see
only axes they know and no value is removed. The manifest is a runtime assembly — `buildManifest` —
with no generated file to keep in sync. Capability itself is probed by `supports(...)`, never by the
version constant.

## Consequences

Extension happens by adding an axis, not by negotiating a breaking shape. A moved public name keeps
a deprecated alias for one minor on the published surface; the fork's _internal_ integration policy
still deletes superseded code in the same gitlink bump. The two scopes are distinct and both documented.

> Superseded 2026-11-23: with nothing published, the library no longer keeps deprecated aliases.
> Superseded names are deleted in the change that adds their replacement; see
> `docs/contract-versioning.md`.
