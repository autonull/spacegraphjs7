import { describe, expect, test } from 'vitest';
import { Kernel } from '@spacegraphjs/kernel';
import type { KernelOp } from '@spacegraphjs/kernel';
import { AgentEventMapper } from './mapping';
import { AGENT_KINDS, AGENT_RELATIONS, AGENT_ROLES, agentDomain, buildAgentView, labelFor, relationOf, roleOf } from './vocabulary';
import {
    changedArtifacts,
    changedFiles,
    failureAttention,
    failureDetails,
    failures,
    why,
} from './selectors';
import { agentFacetAccessors, agentTraceVocabulary } from './facets';

const fold = (ops: readonly KernelOp[]): Kernel =>
    ops.reduce<Kernel>(
        (kernel, op) =>
            kernel.modify((builder) => {
                switch (op.op) {
                    case 'add-node':
                        builder.nodes.set(op.node.id, op.node);
                        break;
                    case 'remove-node':
                        builder.nodes.delete(op.id);
                        break;
                    case 'add-edge':
                        builder.edges.set(op.edge.id, op.edge);
                        break;
                    case 'remove-edge':
                        builder.edges.delete(op.id);
                        break;
                    default:
                        break;
                }
            }),
        new Kernel(),
    );

describe('event mapping', () => {
    test('emits open-ended kinds and ordinary edges, never inferred causes', () => {
        const mapper = new AgentEventMapper('agent');
        const ops = [
            ...mapper.map({ type: 'run-start', runId: 'r1' }),
            ...mapper.map({ type: 'unit-start', runId: 'r1', unitId: 'u1' }),
            ...mapper.map({
                type: 'action',
                runId: 'r1',
                unitId: 'u1',
                id: 't1',
                toolName: 'read',
                args: { path: 'a.ts' },
                phase: 'start',
            }),
            ...mapper.map({
                type: 'action',
                runId: 'r1',
                unitId: 'u1',
                id: 't2',
                toolName: 'bash',
                phase: 'start',
                parentId: 't1',
            }),
            ...mapper.map({
                type: 'artifact',
                runId: 'r1',
                unitId: 'u1',
                id: 'f1',
                path: 'a.ts',
                producerId: 't1',
            }),
            ...mapper.map({ type: 'unit-end', runId: 'r1', unitId: 'u1', stopReason: 'error' }),
        ];
        const kernel = fold(ops);
        const kinds = new Set(kernel.nodes.map((node) => node.kind));
        const edgeKinds = new Set(kernel.edges.map((edge) => edge.kind));

        expect(kinds.has('run')).toBe(true);
        expect(kinds.has('unit')).toBe(true);
        expect(kinds.has('action')).toBe(true);
        expect(kinds.has('artifact')).toBe(true);
        expect(kinds.has('retry')).toBe(true);
        expect(edgeKinds.has('contains')).toBe(true);
        expect(edgeKinds.has('delegates')).toBe(true);
        expect(edgeKinds.has('writes')).toBe(true);
        expect(edgeKinds.has('inferred-cause')).toBe(false);
        expect(kernel.diagnostics().danglingEdges).toEqual([]);
    });
});

describe('agent domain', () => {
    test('builds a view with status and active turn from kernel data', () => {
        const kernel = fold([
            ...new AgentEventMapper('agent').map({ type: 'run-start', runId: 'r1' }),
            ...new AgentEventMapper('agent').map({ type: 'unit-start', runId: 'r1', unitId: 'u1' }),
        ]);
        const view = buildAgentView(kernel);

        expect(view.root).toBe('agent:r1:run');
        expect(view.turns).toEqual(['agent:r1:u1']);
        expect(view.activeTurn).toBe('agent:r1:u1');
        expect(view.nodes.every((node) => typeof node.status === 'string')).toBe(true);
    });

    test('labelFor shortens titles and buildAgentView keeps the original', () => {
        const message = { id: 'm', kind: 'message', label: 'assistant message', status: 'complete', data: { role: 'assistant', text: 'The full reply.' } };
        expect(labelFor(message)).toBe('assistant');
        expect(labelFor({ ...message, label: 'user message', data: { role: 'message' } })).toBe('user');
        expect(labelFor({ id: 'a', kind: 'artifact', label: 'src/auth/session.ts', status: 'complete', data: { path: 'src/auth/session.ts' } })).toBe('session.ts');
        expect(labelFor({ id: 'p', kind: 'approval', label: 'Approve patch', status: 'pending' })).toBe('approve');

        const view = buildAgentView(
            fold(new AgentEventMapper('agent').map({ type: 'message', runId: 'r', role: 'assistant', text: 'The full reply.' })),
        );
        expect(view.nodes[0]!.label).toBe('assistant');
        expect(view.nodes[0]!.data?.fullLabel).toBe('assistant message');
        expect(view.nodes[0]!.data?.text).toBe('The full reply.');
    });

    test('stays open-ended: no fixed role enum and structural manifest', () => {
        expect(AGENT_KINDS).toContain('action');
        expect(agentDomain.id).toBe('agent');
        expect(agentDomain.manifest().every((entry) => entry.values.length > 0)).toBe(true);
        expect(agentDomain.vocabulary.lanes).toBeDefined();
        expect(agentDomain.vocabulary.scopeIdOf?.({ kind: 'action', data: { unitId: 'u1' } })).toBe('u1');
    });

    test('facet and trace vocabulary expose only generic roles', () => {
        expect(agentFacetAccessors.isRetry!({ id: 'r', kind: 'retry', label: 'r', status: 'pending' })).toBe(true);
        expect(agentTraceVocabulary.downstreamEdgeKinds.has('writes')).toBe(true);
    });
});

describe('selectors', () => {
    const view = buildAgentView(
        fold([
            ...new AgentEventMapper('agent').map({ type: 'run-start', runId: 'r1' }),
            ...new AgentEventMapper('agent').map({ type: 'unit-start', runId: 'r1', unitId: 'u1' }),
            ...new AgentEventMapper('agent').map({
                type: 'action',
                runId: 'r1',
                unitId: 'u1',
                id: 't1',
                toolName: 'write',
                phase: 'end',
                isError: true,
            }),
            ...new AgentEventMapper('agent').map({
                type: 'artifact',
                runId: 'r1',
                unitId: 'u1',
                id: 'f1',
                path: 'a.ts',
                producerId: 't1',
            }),
        ]),
    );

    test('answers why through provenance edges', () => {
        expect(why(view, 'agent:r1:f1').answerIds.has('agent:r1:t1')).toBe(true);
    });

    test('finds failures and changed artifacts', () => {
        expect(failures(view)).toEqual(['agent:r1:t1']);
        expect(changedArtifacts(view)).toEqual(['agent:r1:f1']);
    });
});

describe('agent roles and relations', () => {
    test('read host tags before the default kind mapping', () => {
        expect(AGENT_ROLES).toContain('artifact');
        expect(AGENT_RELATIONS.write).toContain('produces');
        expect(roleOf({ kind: 'error', data: { role: 'failure' } })).toBe('failure');
        expect(roleOf({ kind: 'retry' })).toBe('retry');
        expect(relationOf({ kind: 'part-of', data: { relation: AGENT_RELATIONS.parent } })).toBe('contains');
        expect(relationOf({ kind: 'reads' })).toBe('reads');
    });
});

describe('rich agent selectors', () => {
    const view = buildAgentView(
        fold([
            { op: 'add-node', node: { id: 'run', kind: 'run', label: 'Run', data: {} } },
            { op: 'add-node', node: { id: 'u1', kind: 'unit', label: 'Turn one', data: { unitId: 'u1' } } },
            { op: 'add-edge', edge: { id: 'c1', kind: 'contains', source: 'run', target: 'u1' } },
            {
                op: 'add-node',
                node: {
                    id: 'err',
                    kind: 'error',
                    label: 'Error',
                    data: { role: 'failure', unitId: 'u1', status: 'failed', summary: 'boom' },
                },
            },
            { op: 'add-edge', edge: { id: 'c2', kind: 'contains', source: 'u1', target: 'err' } },
            {
                op: 'add-node',
                node: { id: 'tool', kind: 'tool', label: 'Write', data: { role: 'action', status: 'failed' } },
            },
            { op: 'add-edge', edge: { id: 'c3', kind: 'contains', source: 'u1', target: 'tool' } },
            {
                op: 'add-node',
                node: { id: 'f', kind: 'file', label: 'a.ts', data: { role: 'artifact', path: 'src/a.ts' } },
            },
            { op: 'add-edge', edge: { id: 'w', kind: 'produces', source: 'tool', target: 'f' } },
            { op: 'add-node', node: { id: 'reader', kind: 'read-tool', label: 'Read', data: { role: 'action' } } },
            { op: 'add-edge', edge: { id: 'rd', kind: 'reads', source: 'reader', target: 'f' } },
        ]),
    );

    test('failure details carry turn context and honour the host role set', () => {
        expect(failureDetails(view, { includeFailedStatus: false })).toEqual([
            {
                id: 'err',
                label: 'Error',
                summary: 'boom',
                turnID: 'u1',
                turnLabel: 'Turn one',
                turnNumber: 1,
            },
        ]);
        expect(failures(view)).toContain('tool');
    });

    test('changed files carry path, writers and readers in first-write order', () => {
        expect(changedFiles(view)).toEqual([
            { id: 'f', path: 'src/a.ts', writers: ['tool'], readers: ['reader'] },
        ]);
        expect(changedArtifacts(view, 'tool')).toEqual(['f']);
    });

    test('failure attention reports one danger digest with stable ids', () => {
        const digest = failureAttention(view);
        expect(digest.tone).toBe('danger');
        expect(digest.failures).toBe(2);
        expect(digest.retries).toBe(0);
        expect(digest.count).toBe(digest.ids.length);
        expect(digest.latest?.id).toBe('err');
        expect(digest.latest?.turnLabel).toBe('Turn one');

        expect(failureAttention(view, { includeFailedStatus: false })).toMatchObject({
            tone: 'danger',
            failures: 1,
            count: 1,
        });
    });
});
