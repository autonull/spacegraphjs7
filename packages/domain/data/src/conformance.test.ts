import { describe, test } from 'vitest';
import { adapterConformance } from '@spacegraphjs/adapter';
import { dataAdapter, FIXTURE_POSITIONS, fixtureOps, foldDataOps } from './fixture';
import { buildDataView } from './vocabulary';

const view = buildDataView(foldDataOps(fixtureOps()));

const FIXTURE = {
    model: view,
    level: 'execution' as const,
    positions: FIXTURE_POSITIONS,
    visible: view.nodes.map((node) => node.id),
    card: 'data:p1:auc',
    structural: 'data:p1:pipeline',
    focus: 'data:p1:auc',
    lit: ['data:p1:auc', 'data:p1:gbdt', 'data:p1:r1'],
    dimmed: [
        'data:p1:pipeline',
        'data:p1:train',
        'data:p1:features',
        'data:p1:latency',
        'data:p1:score',
        'data:p1:r2',
        'data:p1:f1',
    ],
};

describe('data wrapper conformance', () => {
    for (const conformanceCase of adapterConformance(dataAdapter, FIXTURE)) {
        test(conformanceCase.name, conformanceCase.check);
    }
});
