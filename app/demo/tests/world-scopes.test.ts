// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { worldScopes, worldTrace } from '../src/world-scopes';

const domains = [
    { id: 'agent', nodes: [{ id: 'run' }, { id: 'turn' }], edges: [{ id: 'e1', source: 'run', target: 'turn' }] },
    { id: 'filesystem', nodes: [{ id: 'file' }], edges: [] },
];

describe('one world scope', () => {
    it('composes isolated domain scopes under one root', () => {
        const world = worldScopes(domains);
        expect(world.specs.map((spec) => spec.id)).toEqual(['world', 'domain:agent', 'domain:filesystem']);
        expect(world.specs[0].nodes.map((node) => node.scope)).toEqual(['domain:agent', 'domain:filesystem']);
        expect(world.specs[1].parent).toBe('world');
        expect(world.qualifiedByNode.get('file')).toBe('world/domain:filesystem/file');
        expect(world.domainByQualified.get('world/domain:agent/run')).toBe('agent');
    });

    it('turns a cross-domain trace into one ordered path', () => {
        const world = worldScopes(domains);
        expect(
            worldTrace(world, [
                { domain: 'agent', node: 'turn' },
                { domain: 'filesystem', node: 'file' },
            ]),
        ).toEqual(['world/domain:agent/turn', 'world/domain:filesystem/file']);
        expect(() => worldTrace(world, [{ domain: 'agent', node: 'missing' }])).toThrow();
    });
});
