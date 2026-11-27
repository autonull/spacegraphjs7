import { describe, test } from 'vitest';
import { adapterConformance } from '@spacegraphjs/adapter';
import { buildSourceView } from './vocabulary';
import {
    FIXTURE_POSITIONS,
    fixtureOps,
    foldSourceOps,
    sourceAdapter,
} from './fixture';
import { sourceID } from './snapshot';

const view = buildSourceView(foldSourceOps(fixtureOps()), 'fixture');
const card = sourceID('fixture', 'spacegraphjs', 'core/graph', 'add');

const FIXTURE = {
    model: view,
    level: 'execution' as const,
    positions: FIXTURE_POSITIONS,
    visible: view.nodes.map((node) => node.id),
    card,
    structural: sourceID('fixture', 'spacegraphjs', 'core/graph'),
    focus: card,
    lit: [card, sourceID('fixture', 'spacegraphjs', 'core/graph', 'Graph')],
    dimmed: [sourceID('fixture', '@spacegraphjs/renderer')],
};

describe('source wrapper conformance', () => {
    for (const conformanceCase of adapterConformance(sourceAdapter, FIXTURE)) {
        test(conformanceCase.name, conformanceCase.check);
    }
});
