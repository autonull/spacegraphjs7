import { describe, test } from 'vitest';
import { adapterConformance } from '@spacegraphjs/adapter';
import { buildWorkflowView } from './vocabulary';
import { FIXTURE_POSITIONS, fixtureOps, foldWorkflowOps, workflowAdapter } from './fixture';

const view = buildWorkflowView(foldWorkflowOps(fixtureOps()));

const FIXTURE = {
    model: view,
    level: 'execution' as const,
    positions: FIXTURE_POSITIONS,
    visible: view.nodes.map((node) => node.id),
    card: 'workflow:wf:compile',
    structural: 'workflow:wf:workflow',
    focus: 'workflow:wf:compile',
    lit: ['workflow:wf:compile', 'workflow:wf:r1'],
    dimmed: [
        'workflow:wf:workflow',
        'workflow:wf:trigger:1',
        'workflow:wf:build',
        'workflow:wf:out',
        'workflow:wf:compile:retry:retry-1',
        'workflow:wf:notify',
    ],
};

describe('workflow wrapper conformance', () => {
    for (const conformanceCase of adapterConformance(workflowAdapter, FIXTURE)) {
        test(conformanceCase.name, conformanceCase.check);
    }
});
