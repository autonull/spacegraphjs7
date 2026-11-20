import { describe, expect, test } from 'bun:test';
import { DataEventMapper, type DataEvent } from './mapping';
import { fixtureEvents, fixtureOps, foldDataOps } from './fixture';
import { EDGE_KINDS, DATA_KINDS, buildDataView, dataDomain, roleOf } from './vocabulary';
import { ledHere, lineage, modelMetrics, regressions, stepInputs, why } from './selectors';
import { dataFacetAccessors, dataTraceVocabulary } from './facets';

const kernel = foldDataOps(fixtureOps());
const view = buildDataView(kernel);

describe('event mapping', () => {
    test('emits ordinary edges and no inferred causes', () => {
        const kinds = new Set(kernel.nodes.map((node) => node.kind));
        const edgeKinds = new Set(kernel.edges.map((edge) => edge.kind));

        for (const kind of DATA_KINDS) expect(kinds.has(kind)).toBe(true);
        expect(edgeKinds.has('contains')).toBe(true);
        expect(edgeKinds.has('feeds')).toBe(true);
        expect(edgeKinds.has('evaluates')).toBe(true);
        expect(edgeKinds.has('inferred-cause')).toBe(false);
        expect(kernel.diagnostics().danglingEdges).toEqual([]);
    });

    test('is deterministic for a fixed event stream', () => {
        const mapper = new DataEventMapper();
        const events: readonly DataEvent[] = fixtureEvents();
        const first = JSON.stringify(events.flatMap((event) => mapper.map(event)));
        const second = JSON.stringify(
            fixtureEvents().flatMap((event) => new DataEventMapper().map(event)),
        );
        expect(first).toBe(second);
    });
});

describe('data domain', () => {
    test('builds a view with root, steps and run markers', () => {
        expect(view.root).toBe('data:p1:pipeline');
        expect(view.turns).toEqual(['data:p1:features', 'data:p1:score']);
        expect(view.runByStepID?.get('data:p1:features')).toBe('data:p1:r1');
    });

    test('exposes a structural manifest and advisory vocabulary', () => {
        expect(dataDomain.id).toBe('data');
        expect(dataDomain.manifest().every((entry) => entry.values.length > 0)).toBe(true);
        expect(EDGE_KINDS).toContain('evaluates');
        expect(
            dataDomain.vocabulary.scopeIdOf?.({ kind: 'step', data: { stepId: 'features' } }),
        ).toBe('features');
    });
});

describe('selectors', () => {
    test('lineage reaches the model, run, step and source dataset of a metric', () => {
        const ids = lineage(view, 'data:p1:auc').answerIds;
        for (const id of ['data:p1:gbdt', 'data:p1:r1', 'data:p1:features', 'data:p1:train'])
            expect(ids.has(id)).toBe(true);
        expect(modelMetrics(view, 'data:p1:gbdt')).toEqual(['data:p1:auc', 'data:p1:latency']);
        expect(stepInputs(view, 'data:p1:features')).toEqual(['data:p1:train']);
    });

    test('regressions are derived from values against baselines', () => {
        const found = regressions(view);
        expect(found.map((metric) => metric.id)).toEqual(['data:p1:auc']);
        expect(found[0]!.delta).toBeCloseTo(-0.02, 5);
    });

    test('why and led-here walk provenance and ordering edges', () => {
        expect(why(view, 'data:p1:auc').answerIds.has('data:p1:gbdt')).toBe(true);
        expect(ledHere(view, 'data:p1:features').answerIds.has('data:p1:score')).toBe(true);
    });
});

describe('roles, relations, facets and trace', () => {
    test('read host tags before the default kind mapping', () => {
        expect(roleOf({ kind: 'other', data: { role: 'metric' } })).toBe('metric');
    });

    test('facets and trace expose only generic roles', () => {
        expect(
            dataFacetAccessors.isFileWrite!({
                id: 'train',
                kind: 'dataset',
                label: 'Training set',
                status: 'complete',
                data: { source: 'warehouse.parquet' },
            }),
        ).toBe(true);
        expect(dataTraceVocabulary.provenanceEdgeKinds.has('evaluates')).toBe(true);
    });
});
