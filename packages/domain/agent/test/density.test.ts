import { describe, expect, it } from 'vitest';
import {
    densityPanelHTML,
    gatherLayout,
    internalEdgeCount,
    lassoFrame,
    lassoScope,
    lensScope,
    morphTarget,
    reduceDensity,
    type DensityEdge,
    type DensityNode,
    type DensityState,
} from '../src/density';

const nodes: readonly DensityNode[] = [
    { id: 'a', label: 'A', x: 0, y: 0 },
    { id: 'b', label: 'B', x: 200, y: 0 },
    { id: 'c', label: 'C', x: 0, y: 300 },
    { id: 'd', label: 'D', x: -200, y: 0 },
];
const edges: readonly DensityEdge[] = [
    { source: 'b', target: 'a', kind: 'part-of' },
    { source: 'c', target: 'a', kind: 'part-of' },
    { source: 'b', target: 'd', kind: 'related' },
];
const state: DensityState = {
    tool: 'off',
    pinned: false,
    selection: [],
    zoom: 0.5,
    layout: 'grid',
};

describe('density kit', () => {
    it('gathers a focus to the origin, neighbours to a ring and unrelated nodes outward', () => {
        const base = gatherLayout(nodes, edges);
        expect(base.every((node) => node.weight === 0)).toBe(true);
        const gathered = gatherLayout(nodes, edges, 'a');
        expect(gathered.find((node) => node.id === 'a')).toEqual({
            id: 'a',
            x: 0,
            y: 0,
            weight: 1,
        });
        expect(gathered.filter((node) => node.weight === 0.65)).toHaveLength(2);
        expect(gathered.find((node) => node.id === 'd')!.weight).toBe(0);
        expect(gathered.find((node) => node.id === 'd')!.x).toBeLessThan(-200);
    });

    it('scopes a bounded lens neighbourhood and arranges it on a ring', () => {
        const scope = lensScope(nodes, edges, 'a', 6);
        expect(scope.ids).toEqual(['a', 'b', 'c']);
        expect(scope.edges).toHaveLength(2);
        expect(scope.placements).toHaveLength(3);
        expect(lensScope(nodes, edges, 'missing', 6).ids).toEqual(['missing']);
    });

    it('brushes a rectangle into ids and frames them with stable bounds', () => {
        const points = nodes.map((node) => ({ ...node }));
        const ids = lassoScope(points, { x: -10, y: -10, width: 20, height: 20 });
        expect(ids).toEqual(['a']);
        const frame = lassoFrame(nodes, ['a', 'b']);
        expect(frame).toEqual({ x: 100, y: 0, width: 310, height: 90 });
        expect(lassoFrame(nodes, [])).toBeUndefined();
        expect(internalEdgeCount(edges, ['a', 'b'])).toBe(1);
    });

    it('selects a layout by zoom thresholds', () => {
        const stops = [
            { id: 'ring', at: 0 },
            { id: 'grid', at: 0.34 },
            { id: 'lane', at: 0.7 },
        ];
        expect(morphTarget(0.2, stops)).toBe('ring');
        expect(morphTarget(0.5, stops)).toBe('grid');
        expect(morphTarget(2, stops)).toBe('lane');
        expect(morphTarget(0.5, [])).toBe('');
    });

    it('reduces density tools idempotently', () => {
        const focused = reduceDensity(state, { type: 'focus', id: 'a' });
        expect(focused.focus).toBe('a');
        expect(reduceDensity(focused, { type: 'focus', id: 'a' })).toBe(focused);
        const pinned = reduceDensity(focused, { type: 'pin' });
        expect(pinned.pinned).toBe(true);
        expect(reduceDensity(pinned, { type: 'pin' })).toBe(pinned);
        expect(reduceDensity(pinned, { type: 'release' })).toEqual(state);
        const scoped = reduceDensity(state, { type: 'scope', ids: ['a', 'b'] });
        expect(reduceDensity(scoped, { type: 'scope', ids: ['a', 'b'] })).toBe(scoped);
        expect(reduceDensity(state, { type: 'tool', tool: 'gather' }).tool).toBe('gather');
        expect(reduceDensity(state, { type: 'zoom', value: 9 }).zoom).toBe(1);
        expect(reduceDensity(state, { type: 'layout', id: 'lane' }).layout).toBe('lane');
    });

    it('renders escaped density chrome and stable selectors', () => {
        const html = densityPanelHTML({
            state: { ...state, tool: 'lens', focus: '<img>' },
            gathered: 2,
            scoped: 3,
            internal: 1,
        });
        expect(html).toContain('data-density-tool="lens"');
        expect(html).toContain('data-density-tool="gather" data-on="false"');
        expect(html).toContain('focus &lt;img&gt;');
        expect(html).not.toContain('<img>');
        expect(html).toContain('2 gathered · 3 scoped · 1 internal edges');
    });
});
