# 0015 — Bounded refit on material aspect change

- Status: Accepted
- Date: 2026-11-22
- Source: TODO5.md Phase 2 (demand 10, adaptive multi-aspect fitting); user decision 2026-11-22

## Context

The flagship fitted the graph once at startup (`TODO4.md:354`). That kept the camera stable through
navigation but left a graph fitted for one canvas aspect stranded when the canvas changed shape.
Demand 10 asks for varying aspect ratios and a wide, multi-octave scale range.

## Decision

Keep the one-startup-fit invariant for resizes below a material threshold. Refit only when the canvas
aspect changes by at least a quarter octave (`abs(log2(new / old)) >= 0.25`, ~19%), debounced by 120 ms.
At every fit point, derive CSS-px insets from the canvas aspect: the short side sets the margin and
narrow canvases bias it toward the top and bottom. The renderer still owns world-unit padding and the
camera math. The ergonomic target (octaves `[-1, 0, 1]`, aspect-derived insets, the existing
`ladder.minLabelPx` floor) lives in `app/pi/src/policy/adaptive-fit.ts` as data, not new policy knobs.

## Consequences

- The fit stays stable for small resize noise and ordinary navigation; the user's chosen camera survives.
- A material aspect change reframes the whole visible graph, which intentionally overrides the user's
  current pan/zoom once. The `adaptiveFit()` host hook exposes the last metrics for tests and evidence.
- No new policy knob, contract field or renderer branch. `p1.` permalinks keep their vector length.
- Shots cover three octaves (fit × 2^-1, × 2^0, × 2^1) on wide (1600×1000) and narrow (900×1000) canvases;
  vision gates assert legibility and no overlap at every cell. At the far octave the core LOD hides card
  interiors by design, so the frame reads as topology, not labels.
