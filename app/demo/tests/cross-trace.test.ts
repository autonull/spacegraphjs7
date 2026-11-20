import { describe, expect, it } from 'vitest';
import { crossTracePath, type CrossTraceLink } from '../src/cross-trace';

const links: readonly CrossTraceLink[] = [
    {
        id: 'cross:session:compile',
        from: ['agent', 'agent:r:session'],
        to: ['workflow', 'workflow:wf:compile'],
    },
    {
        id: 'cross:artifact:file',
        from: ['workflow', 'workflow:wf:out'],
        to: ['filesystem', 'filesystem:c1:session'],
    },
    {
        id: 'cross:change:metric',
        from: ['filesystem', 'filesystem:c1:edit'],
        to: ['data', 'data:p1:auc'],
    },
];

const nodesByDomain = {
    agent: ['agent:r:run', 'agent:r:session', 'agent:r:read'],
    workflow: ['workflow:wf:compile', 'workflow:wf:r1', 'workflow:wf:out'],
    filesystem: ['filesystem:c1:session', 'filesystem:c1:edit', 'filesystem:c1:bundle'],
    data: ['data:p1:auc', 'data:p1:gbdt', 'data:p1:r1'],
};

describe('cross-domain trace', () => {
    it('follows links forward through same-scope peers', () => {
        expect(crossTracePath(links, nodesByDomain, 'agent:r:session')).toEqual([
            { domain: 'agent', node: 'agent:r:session' },
            { domain: 'workflow', node: 'workflow:wf:compile', via: 'cross:session:compile' },
            { domain: 'workflow', node: 'workflow:wf:out', via: 'scope:wf' },
            { domain: 'filesystem', node: 'filesystem:c1:session', via: 'cross:artifact:file' },
            { domain: 'filesystem', node: 'filesystem:c1:edit', via: 'scope:c1' },
            { domain: 'data', node: 'data:p1:auc', via: 'cross:change:metric' },
        ]);
    });

    it('walks backward from a metric to its producing artifact', () => {
        expect(crossTracePath(links, nodesByDomain, 'data:p1:auc', 'backward')).toEqual([
            { domain: 'data', node: 'data:p1:auc' },
            { domain: 'filesystem', node: 'filesystem:c1:edit', via: 'cross:change:metric' },
            { domain: 'filesystem', node: 'filesystem:c1:session', via: 'scope:c1' },
            { domain: 'workflow', node: 'workflow:wf:out', via: 'cross:artifact:file' },
            { domain: 'workflow', node: 'workflow:wf:compile', via: 'scope:wf' },
            { domain: 'agent', node: 'agent:r:session', via: 'cross:session:compile' },
        ]);
    });

    it('stops at a node with no link and never revisits a node', () => {
        expect(crossTracePath(links, nodesByDomain, 'data:p1:auc')).toEqual([
            { domain: 'data', node: 'data:p1:auc' },
        ]);
        expect(crossTracePath([], nodesByDomain, 'agent:r:session')).toHaveLength(1);
    });
});
