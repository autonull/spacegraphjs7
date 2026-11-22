# 0016 — Flux edges, field halos and compact scopes

- Status: Accepted
- Date: 2026-11-22
- Source: explicit user direction (2026-11-22): "less ball and sticks", fluid tangible constructions,
  shorter and thicker edges, atomic/quantum-field seamlessness, and better packing with less waste.
  This is the recorded human decision ADR 0008 requires for a default visual change.

## Context

Pi's graph read as balls and sticks: context edges were thin `Line2` strokes, causal edges were rigid
straight trapezoids with a hard taper, artifact nodes were flat circles, and unit scopes used a
force solver that spread sibling nodes far apart. `geometry.gap` / `repulsion` could not fix the
spread because the camera fit normalizes uniform scale (`TODO4.md:114`, ADR 0015).

## Decision

1. Add `FluxEdge` as a **general registered core edge type** (ADR 0014 pattern), selected from opaque
   `data` — never from host identity. It draws a curved, tapered filament with a soft additive halo,
   trimmed at both ends so edges stop short of card centres. `TaperedEdge` remains for existing hosts.
2. Every edge becomes a flux filament. Salience and rank set width: causal edges are wide, context
   edges are thinner but never bare lines. `theme.glow` drives halo strength; the default is 0.45.
3. A host-owned `#field` layer places one soft radial-gradient halo per visible node. Overlapping
   gradients merge under `mix-blend-mode: screen` (multiply in light theme), giving the seamless field.
4. Artifact dots render as rings instead of filled circles, so no node reads as a solid ball.
5. Unit and delegate scopes use grid packing with row metadata and a frame offset below the portal;
   grid lane pitch derives from item height instead of the tiny `gap` knob. The root scope stays
   freeform. The host opts in with `agentScopes(..., { packed: true })`; offline replay keeps its
   prior deterministic geometry.
6. Default view palette becomes `aurora` and default `theme.glow` 0.45. The HUD stays grayscale.

## Consequences

- No new contract field and no renderer branch: flux shape travels in `RenderEdge.data.ribbon`, and
  the mapping selects a registered type through the same seam as ribbons before it.
- Old `p1.` permalinks keep their vector length; only two default values changed.
- Gallery shots are recaptured and reviewed; `docs/screenshots/review.json` carries the verdicts.
- Long cross-unit `orders` diagonals remain: they encode real cross-scope relations. Trimming the
  visible ends and thickening the filaments changes their read without deleting the relation.
- The field layer is host DOM/CSS, one element per visible node, updated by transform only; it does not
  enter the scope simulation or the renderer's position authority.

## Mockup-informed refinement (2026-11-22)

The user supplied `docs/screenshots/mockup/` and chose the dark quantum-field direction, borrowed
loosely, with "form follows function" as the rule. Consequences applied to the flagship:

- Deep navy gradient field and a small bright core at each node; no fog, no blur, no `mix-blend-mode`.
  `backdrop-filter` on the inspector was removed. Only gradients, flat shadows and one 6px core remain.
- Cards stay square — the user explicitly rejected rounded rectangles. Status reads through a square
  tinted chip with a check/exclamation glyph.
- Causal flux edges carry a small arrowhead at the target end, so direction is visible without a legend.
- Default glow was reduced from 0.45 to 0.2; stronger glow stays available as a preset knob.
