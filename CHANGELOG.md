# Changelog

All notable changes to this project are documented here. The project has no Changesets; releases
follow the workflow in `docs/ROADMAP.md` (`test:publish` → build → npm).

## [Unreleased] — 8.5.0 alpha

### Added

- **Configuration spine (A):** 30-knob typed policy schema with provenance, live panel, permalink v2,
  and a session recorder with deterministic and counterfactual replay.
- **Navigation and continuity (B):** closed navigation verb set with keyboard and touch bindings,
  portal dissolve, two-rung compositing, and ergonomic counters.
- **Living rectangles (C):** instrument kit with a second host, and graph-driven prompt / steer /
  approve / reject / retry / compare with transcript parity.
- **One world (D):** one canvas, one `ScopeSimulation`, one cross-domain camera flight; scaffold emits
  the spine so new domains are born experimentable.
- **Experimentation (E):** seeded pairwise sampling, experiment resolver layer, offline / online /
  human tiers, decision artifacts, and verbatim negative results. Offline replay now re-simulates
  the fixture's geometry and vision feedback under each variant, not just re-scores events.
- **Truth pass (F):** durable ADRs, a vocabulary glossary, this changelog, deprecation policy, an
  isolated `scale` CI job, and a clean root `tsc` gate.
- **Proof surface (G, code side):** the Pi flagship's catalog launches every preset and sampled
  experiment cell from its URL, showing the question or decision rule without claiming a winner.

### Changed

- `ZoomBands` / `ScaleDomain` replace `FractalZoomPlugin` as the band and scale mechanism.
- Root docs now reference real paths under `docs/` and `app/demo/`.

### Deprecated

- `FractalZoomPlugin` — use `ZoomBandsPlugin` / `ScaleDomain`. Kept as an exported alias for one
  minor on the published surface; a removal candidate after that. No new host should adopt it.

### Not changed

- No immersive mode, ladder, gesture map or visual default has been promoted. Presets are examples,
  never recommendations. The `n >= 5` study has no published winner.

## Stability and deprecation policy

The published surface is alpha and additive. `LIBRARY_CONTRACT_VERSION` bumps only for new capability
axes or additive fields; capability is probed with `supports(...)`, never by version or renderer
identity. A moved public name keeps a deprecated alias for one minor, then is removed. The fork's
internal integration is a separate scope: it deletes superseded code in the same gitlink bump rather
than carrying shims. See `docs/contract-versioning.md` and `docs/adr/0013-additive-contract-versioning.md`.
