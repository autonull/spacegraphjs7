import { describe, expect, test } from 'vitest';
import { WorkflowEventMapper, type WorkflowEvent } from './mapping';
import { fixtureEvents, fixtureOps, foldWorkflowOps } from './fixture';
import {
    EDGE_KINDS,
    WORKFLOW_KINDS,
    WORKFLOW_RELATIONS,
    buildWorkflowView,
    relationOf,
    roleOf,
    workflowDomain,
} from './vocabulary';
import {
    artifactProducers,
    ledHere,
    retryChains,
    stepDependencies,
    subworkflowContributions,
    why,
} from './selectors';
import { workflowFacetAccessors, workflowTraceVocabulary } from './facets';

const kernel = foldWorkflowOps(fixtureOps());
const view = buildWorkflowView(kernel);

describe('event mapping', () => {
    test('emits ordinary edges and no inferred causes', () => {
        const kinds = new Set(kernel.nodes.map((node) => node.kind));
        const edgeKinds = new Set(kernel.edges.map((edge) => edge.kind));

        for (const kind of WORKFLOW_KINDS) expect(kinds.has(kind)).toBe(true);
        expect(edgeKinds.has('contains')).toBe(true);
        expect(edgeKinds.has('writes')).toBe(true);
        expect(edgeKinds.has('retries')).toBe(true);
        expect(edgeKinds.has('delegates')).toBe(true);
        expect(edgeKinds.has('inferred-cause')).toBe(false);
        expect(kernel.diagnostics().danglingEdges).toEqual([]);
    });

    test('is deterministic for a fixed event stream', () => {
        const mapper = new WorkflowEventMapper();
        const events: readonly WorkflowEvent[] = fixtureEvents();
        const first = JSON.stringify(events.flatMap((event) => mapper.map(event)));
        const second = JSON.stringify(
            fixtureEvents().flatMap((event) => new WorkflowEventMapper().map(event)),
        );
        expect(first).toBe(second);
    });
});

describe('workflow domain', () => {
    test('builds a view with root, steps and active run markers', () => {
        expect(view.root).toBe('workflow:wf:workflow');
        expect(view.turns).toEqual(['workflow:wf:compile', 'workflow:wf:notify']);
        expect(view.runByStepID?.get('workflow:wf:compile')).toBe('workflow:wf:r1');
    });

    test('exposes a structural manifest and advisory vocabulary', () => {
        expect(workflowDomain.id).toBe('workflow');
        expect(workflowDomain.manifest().every((entry) => entry.values.length > 0)).toBe(true);
        expect(EDGE_KINDS).toContain('retries');
        expect(
            workflowDomain.vocabulary.scopeIdOf?.({ kind: 'step', data: { stepId: 'compile' } }),
        ).toBe('compile');
    });
});

describe('selectors', () => {
    test('why and led-here walk provenance and ordering edges', () => {
        expect(why(view, 'workflow:wf:out').answerIds.has('workflow:wf:r1')).toBe(true);
        expect(ledHere(view, 'workflow:wf:compile').answerIds.has('workflow:wf:notify')).toBe(true);
        expect(stepDependencies(view, 'workflow:wf:notify')).toContain('workflow:wf:compile');
    });

    test('retry chains point at the failed run', () => {
        expect(retryChains(view)).toEqual([
            {
                id: 'workflow:wf:compile:retry:retry-1',
                label: 'Retry',
                reason: 'flaky',
                stepID: 'compile',
                runID: undefined,
                targetID: 'workflow:wf:r1',
            },
        ]);
    });

    test('artifact flows and subworkflow contributions carry first-write order', () => {
        expect(artifactProducers(view)).toEqual([
            {
                id: 'workflow:wf:out',
                path: 'dist/app.js',
                writers: ['workflow:wf:r1'],
                readers: [],
            },
        ]);
        expect(subworkflowContributions(view, 'workflow:wf:build')).toEqual([
            'workflow:wf:compile',
        ]);
    });
});

describe('roles, relations, facets and trace', () => {
    test('read host tags before the default kind mapping', () => {
        expect(roleOf({ kind: 'other', data: { role: 'step' } })).toBe('step');
        expect(relationOf({ kind: 'part-of', data: { relation: WORKFLOW_RELATIONS.parent } })).toBe(
            'contains',
        );
        expect(relationOf({ kind: 'uses' })).toBe('uses');
    });

    test('facets and trace expose only generic roles', () => {
        expect(
            workflowFacetAccessors.isRetry!({
                id: 'r',
                kind: 'retry',
                label: 'r',
                status: 'pending',
            }),
        ).toBe(true);
        expect(workflowTraceVocabulary.downstreamEdgeKinds.has('retries')).toBe(true);
    });
});
