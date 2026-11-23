# Renderer and binding capability matrix

One `RenderModel` must describe the same graph on every backend. Backends differ only where they
declare a capability they cannot honour; `test:conformance` runs the shared model fixture through
all five surfaces and fails when a declaration drifts from the implementation.

| Surface                                  | Projection   | DOM cards | Cluster nodes | Zoom range | Depth / emphasis                     |
| ---------------------------------------- | ------------ | --------- | ------------- | ---------- | ------------------------------------ |
| `@spacegraphjs/spacegraph-renderer`      | 2d and 3d    | yes (80)  | yes           | 0…1        | negotiated via `depths`, `emphasis`  |
| `@spacegraphjs/cytoscape-renderer`       | 2d only      | yes (20)  | yes           | unbounded  | negotiated via `supportsDepth`       |
| `@spacegraphjs/svg-renderer`             | static 2d    | no        | no            | 1 only     | flat only; no camera or selection    |
| `react-spacegraph` (`GraphView`)         | backend case | backend   | backend       | backend    | unchanged from the supplied renderer |
| `solid-spacegraph` (`GraphView`)         | backend case | backend   | backend       | backend    | unchanged from the supplied renderer |

Intentional differences, not defects:

- SVG is static. It draws one frame from the same model; camera, selection and zoom calls are no-ops,
  and `zoomRange` reports `{ min: 1, max: 1 }` so a host disables zoom rather than offering a control
  that cannot respond.
- Depth and emphasis are negotiated through `supports`, `supportsDepth` and `supportsEmphasis`. A host
  never branches on renderer identity for a visual idea (ADR 0005).
- Bindings do not add capabilities. Both push the same model and selection into the renderer supplied
  by the host, and both are exercised with the shared `MODEL`, `THEME` and `fakeRenderer` fixtures.

Verification: `pnpm run test:conformance` runs `test/conformance.test.ts` together with the React and
Solid binding conformance specs. A backend that drops a declared capability or mutates node/edge
identity fails the gate. `pnpm run test:publish` adds browser mount parity: it mounts the SpaceGraph
and Cytoscape adapters from packed tarballs with the same shared model and asserts both draw. Static
SVG output is asserted in `test/conformance.test.ts`. No per-pixel comparison is claimed.
