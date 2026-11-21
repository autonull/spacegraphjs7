# Contract versioning (P6.4)

`LIBRARY_CONTRACT_VERSION` in `packages/config/src/library.ts` is the version of the additive capability surface. It changes only when a capability axis or additive contract field lands; a renderer backend is still detected by capability predicates, never by this constant.

- Every manifest entry declares `minContractVersion`: the first contract version that carried it. `minContractVersion(manifest, axis)` reads one; `contractFloor(manifest)` returns the lowest version a consumer needs to discover them all.
- An additive change bumps the minor (`1.1.0` emphasis, `1.2.0` widgets, `1.3.0` motion/world, `1.4.0` version metadata). Consumers that understand an older version see only the axes they know; no value is removed.
- Public names keep a deprecated alias for one minor when moved (for example `renderNodeWidget` in a host adapter). After one minor the alias is a removal candidate.
- The manifest is a runtime assembly: `buildManifest(version, entries)` collects library and host contributions. There is no generated file to keep in sync.

A version bump does not choose a default or declare a winning configuration.

## Stability status and freeze rule

The library is alpha (`8.5.0`, unreleased). `LIBRARY_CONTRACT_VERSION` is the **only** version knob
for the additive capability surface. Freeze rule: the surface changes only by adding an axis or an
additive field, with a `minContractVersion` on each new manifest entry. Capability negotiation —
`supports(...)` predicates — is the sole extension path for renderer behavior; a version constant
never selects a backend and never grants a capability. Breaking moves are recorded in `CHANGELOG.md`
and in [ADR 0013](./adr/0013-additive-contract-versioning.md).

## Two scopes, two deprecation policies

- **Published library surface:** a renamed public symbol keeps a deprecated alias for one minor,
  then becomes a removal candidate. `FractalZoomPlugin` is the current example; `ZoomBandsPlugin`
  and `ScaleDomain` replace it.
- **Fork integration:** `docs/capabilities.md` states the internal policy — no `CONTRACT_VERSION`,
  no `negotiateContract`, no aliases, no `@deprecated` shims; delete superseded code in the same
  gitlink bump. This governs the fork's own wiring, not consumers of the published packages.

Both rules shrink the same surface in the long run; neither promotes a default. Open questions and
their knob families live in `docs/not-decided.md`; settled decisions live in `docs/adr/`.
