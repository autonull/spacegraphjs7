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
- **Visual pass:** Pi chrome is a grayscale HUD — black background, neutral surfaces, monospace
  uppercase labels, transparent panels, only structural dividers and a corner-bracketed readout;
  the transcript is collapsible and resizable from its own edge. Color is reserved for the graph view.
- **Screenshots:** one root, `docs/screenshots/`, holding a tracked curated gallery plus gitignored
  generated visual-gate output; Pi captures come from a Playwright spec, and stale images were removed.
- **Screenshot studio:** ten named shots in `app/pi/src/shots.ts` launch deterministic views through
  `?shot=<id>` (`cockpit`, `node-detail`, `dynamic-range`, three layouts, palettes, light theme,
  catalog and policy). A capture CLI with a contact sheet and watch mode makes the feedback loop a
  source edit → refresh cycle. New additive hooks: `shots`, `applyShot`, `frame`, `setViewport`,
  `shotReady`.
- **Deep focus:** a fixed-size host lens anchored to the focused node shows a bounded inner layout,
  per-chip metadata/signal bars, nested chips at depth 2, and controls wired to the existing verbs;
  focusing a chip rebuilds the tree, so recursion is navigation, not unbounded DOM. `emphasis.focusScale`,
  `neighborScale` and `contextScale` are opt-in and default to 1 — focused nodes do not grow by default.
  New `focus-lens` and `fractal` presets and shots explore the alternative.
- **Faceted edges:** causal edges carry a ribbon descriptor in the existing `RenderEdge.data`; the
  SpaceGraph adapter forwards it to core's `DynamicThicknessEdge` with three segments. `emphasis.ribbonWidth`
  controls the width, 0 disables it. No contract field or renderer-specific branch was added.
- **Density and progressive disclosure:** the catalog and rail are header-toggled drawers, empty portal
  sections stay hidden, and all surfaces default to square corners. The canvas keeps the reclaimed width.
- **View palettes:** `theme.palette`, `theme.backdrop` and `theme.glow` are live knobs with five
  palettes, three backdrops and emissive glow. Four new presets (`neon`, `ember`, `aurora`,
  `circuit`) launch them. Color is applied through host CSS variables and the renderer theme; the
  HUD stays grayscale. The detail LOD card adds a compact telemetry line and wraps its text.
- **View coherence:** the flagship fits content once at startup, gives nodes per-kind size, shape and
  accent color plus distinct edge styles, and renders the transcript as a spine with expandable detail
  and a draggable vertical scroll overview. Its startup policy uses `flat` depth and a 40-unit step.
  Labels follow an LOD rule driven by the configurable `ladder.minLabelPx` floor, and a launchable
  `?scenario=rich&preset=showcase` provides a denser capture fixture.

### Changed

- `ZoomBands` / `ScaleDomain` replace `FractalZoomPlugin` as the band and scale mechanism.
- Root docs now reference real paths under `docs/` and `app/demo/`.

### Deprecated

- `FractalZoomPlugin` — use `ZoomBandsPlugin` / `ScaleDomain`. Kept as an exported alias for one
  minor on the published surface; a removal candidate after that. No new host should adopt it.

### Not changed

- No immersive mode, ladder, gesture map or visual default has been promoted. Presets are examples,
  never recommendations. Participant study and release are fully deferred; no winner is published.

## Stability and deprecation policy

The published surface is alpha and additive. `LIBRARY_CONTRACT_VERSION` bumps only for new capability
axes or additive fields; capability is probed with `supports(...)`, never by version or renderer
identity. A moved public name keeps a deprecated alias for one minor, then is removed. The fork's
internal integration is a separate scope: it deletes superseded code in the same gitlink bump rather
than carrying shims. See `docs/contract-versioning.md` and `docs/adr/0013-additive-contract-versioning.md`.
