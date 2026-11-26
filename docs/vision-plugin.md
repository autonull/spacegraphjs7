# Vision quality gates

SpaceGraphJS does not ship a Vite plugin. Quality gates are pure functions over a model, so they run in a unit test, a CI script, or a build step without a browser or a hidden renderer. The entry point is `spacegraphjs/quality`.

Use a model that matches the host's source of truth: a `GraphSpec` from the full engine or a `RenderModel` from the renderer contract.

```ts
import { checkQuality, correctQuality, spacegraphVision, visionAssert } from 'spacegraphjs/quality';

const report = checkQuality(model); // score + categorized issues
const gate = spacegraphVision(model, { minScore: 80 }); // passed + grade
const assertions = visionAssert(model);
assertions.noOverlap();
assertions.noMissingLabels();
assertions.noInvalidEdges();
assertions.withinDomBudget();
assertions.accessible();
assertions.meetsFloor(80);
```

`spacegraphVision` never throws; inspect `gate.passed`, `gate.grade`, and `gate.issues`. `visionAssert` throws on the first failed assertion, which makes it a direct fit for Vitest. Pass `{ dom }` when the host has a hidden accessibility mirror; the accessibility assertions then check roles, tabindex, labels, direction, and motion against that mirror.

## Correcting

`correctQuality(model, { maxEdits })` applies only measured, re-verified fixes. It reports preferences instead of flipping them. A host that wants a build artifact can serialize the returned edits into `spacegraph-autofix-patch.json` and let `sg fix --dry-run` review them; the library never writes to the host's source tree.

## Options

| Option            | Type       | Default | Effect                                             |
| ----------------- | ---------- | ------- | -------------------------------------------------- |
| `minScore`        | number     | 80      | Floor used by `spacegraphVision` and `meetsFloor`. |
| `maxDomNodes`     | number     | —       | DOM card budget for `withinDomBudget`.             |
| `overlapDistance` | number     | —       | Distance below which two nodes count as overlap.   |
| `preferences`     | string[]   | —       | Preference issues are reported, never auto-fixed.  |
| `dom`             | ParentNode | —       | Hidden a11y mirror used by `accessible`.           |

## Runtime analysis

For a running engine, `graph.vision.analyzeVision()` returns a `VisionReport` from the heuristic analyzers, and `graph.vision.autoFix(category, report)` applies a correction. Analysis and correction are separate calls: analysis does not silently mutate the graph. ONNX strategies remain experimental while model weights are finalized; the heuristic path is the supported default.
