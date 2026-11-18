# Contract versioning (P6.4)

`LIBRARY_CONTRACT_VERSION` in `packages/config/src/library.ts` is the version of the additive capability surface. It changes only when a capability axis or additive contract field lands; a renderer backend is still detected by capability predicates, never by this constant.

- Every manifest entry declares `minContractVersion`: the first contract version that carried it. `minContractVersion(manifest, axis)` reads one; `contractFloor(manifest)` returns the lowest version a consumer needs to discover them all.
- An additive change bumps the minor (`1.1.0` emphasis, `1.2.0` widgets, `1.3.0` motion/world, `1.4.0` version metadata). Consumers that understand an older version see only the axes they know; no value is removed.
- Public names keep a deprecated alias for one minor when moved (for example `renderNodeWidget` in a host adapter). After one minor the alias is a removal candidate.
- The manifest is a runtime assembly: `buildManifest(version, entries)` collects library and host contributions. There is no generated file to keep in sync.

A version bump does not choose a default or declare a winning configuration.
