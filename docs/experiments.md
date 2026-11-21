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

## Pi offline measurement

The Pi flagship adds a host-side tier that makes geometry and depth knobs measurable offline. A recording stores only neutral events and the fixture id, so measurement rebuilds the deterministic fixture rather than inventing a new format.

```ts
import { measureExperiment, sampleExperiment, POLICY_SCHEMA } from './src/policy';
import { simulateAndScore } from './src/policy/simulate';

const report = measureExperiment(
    sampleExperiment(POLICY_SCHEMA, experiment),
    recording,
    neutralEventScorer,
    incumbentVector,
    simulateAndScore, // injectable; the default re-scores events without re-simulating
);
```

`simulateFixture(vector)` settles a fresh `ScopeSimulation` with the variant's `geometry.*` and `depth.step` knobs, applies the depth treatment, then repeats the analyze → retarget → analyze feedback seam through `ScopePolicyInput.vision`. `simulateAndScore` replaces only the scored legibility with the re-simulated value; success, wrong turns and travel stay bound to the recorded human events. Legibility uses a flat x/y projection because depth is a renderer capability that cannot be evaluated offline. The host hook `__pi.measureExperiment('geometry-x-depth')` runs the full tier, and `__pi.replaySimulated()` returns a single re-simulated score.

The shortlist, decision rule, human-decision record and verbatim negative report are unchanged: the system still proposes and humans still decide. See `app/pi/tests/simulate.test.ts` and `docs/adr/0008-evidence-gate-for-defaults.md`.
