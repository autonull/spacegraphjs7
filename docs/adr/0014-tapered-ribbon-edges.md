# ADR 0014 — Tapered polygon ribbons

- Status: Accepted
- Date: 2026-11-21
- Source: `TODO4.md` slice 3 recorded direction (user, 2026-11-21); §3.7 / §7 two-consumer exception

## Context

Causal ribbons were rendered as uniform tubes. In the flagship gallery they read as thin, line-like
strands whose length and equal weight outshone the nodes, even after salience ranking. A host SVG
overlay was considered; the user chose a renderer edge type so the geometry scales with the camera
and stays one substrate across hosts. This is a deliberate exception to the "no renderer branch
without two consumers" rule: the branch is a new registered edge type, not a per-host special case.

## Decision

Ribbon edges render as `TaperedEdge`: a two-triangle trapezoid, broad at the source and narrow at the
target, with thickness still driven by salience × relation rank. Context edges stay thin and
ribbon-free. Reach is not lengthened. The type is registered in the core type registry and selected
by the dependency-free renderer adapter.

Ribbon color comes from the view palette's `causal` role through `RenderEdge.data.ribbon.color` — the
same value CSS already consumes as `--view-causal`. No new `RenderTheme` role or global token is added;
the edge-style color stays the fallback when a host supplies no ribbon color.

## Consequences

Before: `docs/screenshots/pi/pi-agent-in-action.png` (slice 2 gallery, uniform tube ribbons, gray ribbon
color). After: the recaptured `cockpit`, `dynamic-range`, `neon-cockpit`, `light-theme` and `fractal`
shots in `docs/screenshots/index.html` — tapered wedges in palette causal color, with graph shots using
the full-width quiet frame. The vision and scale gates must stay green; if the polygon fails legibility
in either theme, the ribbon mapping reverts to `DynamicThicknessEdge` and this ADR is superseded.
