# Pattern card — `GatherFocus`, `GraphLens`, `GraphLasso`, `ZoomMorphLayout`

| Field          | Value                                                                                                                                                                                                          |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Metaphor       | Attention is geometry; a lens is a second camera; a brush is a scope; layout is a continuous function of zoom.                                                                                                 |
| Inputs         | `DensityNode` ids/positions/labels, `DensityEdge` kinds, `DensityState` (tool, focus, pinned, selection, zoom, layout).                                                                                        |
| Outputs        | `gatherLayout`, `lensScope`, `lassoScope`/`lassoFrame`/`internalEdgeCount`, `morphTarget`, `reduceDensity`, `densityPanelHTML`.                                                                                |
| Facts          | None. All four policies are read models over existing node and edge ids; no graph fact is added, removed or rewritten.                                                                                         |
| Invariants     | Stable ids through every transform; projection through the camera, never a renderer hit test; escaped markup; square corners; reduced motion snaps playback.                                                   |
| Keyboard       | Native tool buttons; `d` opens the density controls in Pi Durable labs; `Escape` releases a lens or clears a scope; focus cycling works without a pointer.                                                     |
| Reduced motion | `density.css` drops transitions; hosts pass `reducedMotion` to `playRepresentationChanges` so gather, lens, lasso and morph snap to their targets.                                                             |
| Failure modes  | Empty/missing focus yields base positions; empty lasso yields no frame; no stops yields no layout; reapplying a scope or tool is a no-op.                                                                      |
| Consumers      | Demos: `morph-layout.html`, `vector-lens.html`, `gravity-focus.html`, `lasso-scope.html`. Pi Durable: `?labs=1` team view (`d`). E2E: `test/e2e/density.spec.ts`, `app/pi-durable/tests/labs-density.spec.ts`. |

The package owns policies and chrome only. Hosts keep the camera, renderer and commit paths. In Pi
Durable the lens reuses `toggleFocusLens`, gather feeds the existing layout focus policy, lasso
feeds the team scope, and morph calls `setLayout`; none introduces a second graph store.
