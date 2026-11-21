import { describe, expect, it } from 'vitest';
import { focusRoles, scaleForRole } from '../src/focus';
import { innerConnectors, innerPlacements, innerTree } from '../src/inner';

const nodes = [
    { id: 'a', label: 'Run', kind: 'run' },
    { id: 'b', label: 'Turn 1', kind: 'unit', data: { role: 'unit' } },
    { id: 'c', label: 'grep', kind: 'action', data: { role: 'tool' } },
    { id: 'd', label: 'auth.ts', kind: 'artifact' },
    { id: 'e', label: 'Turn 2', kind: 'unit' },
];

const edges = [
    { source: 'a', target: 'b', kind: 'contains' },
    { source: 'b', target: 'c', kind: 'reads' },
    { source: 'c', target: 'd', kind: 'produces' },
    { source: 'a', target: 'e', kind: 'contains' },
];

describe('focus roles', () => {
    it('has no roles without a focus', () => {
        expect(focusRoles('', edges).size).toBe(0);
        expect(scaleForRole('none', { focus: 2, neighbor: 1.2, context: 0.8 })).toBe(1);
    });

    it('labels the focus, its neighbors, and context', () => {
        const roles = focusRoles('b', edges);
        expect(roles.get('b')).toBe('focus');
        expect(roles.get('a')).toBe('neighbor');
        expect(roles.get('c')).toBe('neighbor');
        expect(roles.get('e')).toBeUndefined();
        expect(scaleForRole('focus', { focus: 2, neighbor: 1.2, context: 0.8 })).toBe(2);
        expect(scaleForRole('context', { focus: 2, neighbor: 1.2, context: 0.8 })).toBe(0.8);
    });
});

describe('inner layout', () => {
    it('is empty when disabled', () => {
        expect(innerTree('a', nodes, edges, 0)).toEqual([]);
    });

    it('puts contained children first and bounds the fan-out', () => {
        const chips = innerTree('a', nodes, edges, 1, 2);
        expect(chips.map((chip) => chip.id)).toEqual(['b', 'e']);
        expect(chips[0]!.label).toBe('Turn 1');
        expect(chips[0]!.role).toBe('unit');
    });

    it('nests one more level without cycles', () => {
        const chips = innerTree('a', nodes, edges, 2, 2);
        expect(chips[0]!.children.map((chip) => chip.id)).toEqual(['c']);
        expect(chips[0]!.children[0]!.children).toEqual([]);
    });

    it('places chips inside the card with the requested layout', () => {
        const chips = innerTree('a', nodes, edges, 1, 2);
        const grid = innerPlacements(chips, 'grid');
        expect(grid).toHaveLength(2);
        expect(grid[1]!.left).toBeGreaterThan(grid[0]!.left);
        const column = innerPlacements(chips, 'column');
        expect(column[0]!.width).toBeGreaterThan(grid[0]!.width);
        expect(column[1]!.top).toBeGreaterThan(column[0]!.top);
    });

    it('lays chips out on a ring or a lane', () => {
        const chips = innerTree('a', nodes, edges, 1, 2);
        const radial = innerPlacements(chips, 'radial');
        const lane = innerPlacements(chips, 'lane');
        expect(radial[0]!.top).toBeLessThan(50);
        expect(radial[1]!.top).toBeGreaterThan(50);
        expect(lane[1]!.top).toBeGreaterThan(lane[0]!.top);
    });

    it('connects the focus to each chip', () => {
        const placements = innerPlacements(innerTree('a', nodes, edges, 1, 2), 'radial');
        const connectors = innerConnectors(placements);
        expect(connectors).toHaveLength(2);
        expect(connectors.every((line) => line.x1 === 50 && line.y1 === 50)).toBe(true);
        expect(connectors[0]!.chipId).toBe(placements[0]!.chip.id);
    });
});
