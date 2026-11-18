# Experimentation (P5)

The library supplies the matrix sampler, a neutral metrics recorder, inert templates and honest reports. Hosts supply tasks, metrics, axes and stop rules. No configuration is a success criterion unless a host protocol declares one.

```ts
import {
    cartesianMatrix,
    MetricsHarness,
    EXPERIMENT_TEMPLATES,
    reportMarkdown,
} from 'spacegraphjs/experiments';
import { libraryManifest } from '@spacegraphjs/config/library';
import { manifestSpace } from '@spacegraphjs/config';

const space = manifestSpace(libraryManifest());
const matrix = cartesianMatrix(
    space.axes.map((axis) => ({ id: axis.id, values: axis.values.map(String) })),
    { seed: 41, maxCells: 24, pairWith: ['widgets', 'lod', 'depth'] },
);

const metrics = new MetricsHarness();
metrics.record({ id: 'turn-1', kind: 'wrongTurn', at: 1000 });
const report = reportMarkdown({
    title: 'Layout comparison',
    matrix,
    template: EXPERIMENT_TEMPLATES.find((template) => template.id === 'ab-config'),
    results: [{ name: 'orbit flights helped', value: '1 of 5', negative: true }],
});
```

- Full products are enumerated; larger ones use baseline, required pairwise combinations and a seeded fill capped by `maxCells`. The policy and seed are recorded in the report.
- `widgets` appears with at least two other axes, so the matrix covers the combination the one-frame capture gate lacked.
- `MetricsHarness` records neutral events; `fromCounterRecord` adapts an existing `StudyCounters` record but does not make it the API.
- Templates are descriptors with stop rules. Nothing fires automatically and no study runs without a host protocol.
- Reports always list negative results. A negative result is a valid output.
- The explorer exposes `window.__explorer.matrix()` and `exportConfig()`; see `test/experiments.test.ts` and `test/e2e/explorer.spec.ts`.
