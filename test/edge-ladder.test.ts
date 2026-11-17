import { describe, expect, it } from 'vitest';
import {
    DEFAULT_EDGE_STYLES,
    EDGE_RUNG_IDS,
    EdgeLadder,
    edgeLadderFromStops,
} from 'spacegraphjs/edges';
import { ScaleDomain } from 'spacegraphjs/zoom';

const stops = EDGE_RUNG_IDS.map((id, index) => ({
    at: index / (EDGE_RUNG_IDS.length - 1),
    id,
    importance: index / (EDGE_RUNG_IDS.length - 1),
    transitionDuration: 0.1,
}));
const domain = new ScaleDomain({ stops, range: { min: 1, max: 100, closerIsLarger: false } });
const sample = (normalized: number) => domain.sample(normalized, domain.rawAt(normalized));
const ladder = (hysteresis = 0) =>
    new EdgeLadder(
        stops.map((stop) => ({ at: stop.at, id: stop.id, style: DEFAULT_EDGE_STYLES[stop.id] })),
        { hysteresis },
    );
const edge = { id: 'e1', kind: 'causal' };

describe('edge ladder', () => {
    it('selects bundle → hair → arrow → ribbon over the scale', () => {
        const registry = ladder();
        expect(registry.ids).toEqual([...EDGE_RUNG_IDS]);
        expect(registry.select(edge, sample(0))?.rung.id).toBe('bundle');
        expect(registry.select(edge, sample(0.4))?.rung.id).toBe('hair');
        expect(registry.select(edge, sample(0.7))?.rung.id).toBe('arrow');
        expect(registry.select(edge, sample(1))?.rung.id).toBe('ribbon');
    });

    it('carries host-owned styles through the selection', () => {
        const selection = ladder().select(edge, sample(1));
        expect(selection).toMatchObject({
            id: 'e1',
            rung: { id: 'ribbon' },
            style: { thickness: 4, arrowhead: 'target' },
        });
        expect(selection?.style.labelLod).toBeDefined();
    });

    it('gates rungs by kind and importance', () => {
        const registry = new EdgeLadder([
            { at: 0, id: 'hair', kinds: ['causal'], style: { thickness: 1 } },
            {
                at: 0.5,
                id: 'ribbon',
                kinds: ['causal'],
                minImportance: 0.9,
                style: { thickness: 4 },
            },
        ]);
        expect(registry.select({ id: 'x', kind: 'other' }, sample(1))).toBeUndefined();
        expect(registry.select(edge, sample(0.7))?.rung.id).toBe('hair');
        expect(registry.select({ ...edge, importance: 1 }, sample(0.7))?.rung.id).toBe('ribbon');
    });

    it('holds a rung inside the dead zone', () => {
        const registry = ladder(0.05);
        expect(registry.select(edge, sample(0.64), 'arrow')?.rung.id).toBe('arrow');
        expect(registry.select(edge, sample(0.29), 'hair')?.rung.id).toBe('hair');
        expect(registry.select(edge, sample(0.35), 'bundle')?.rung.id).toBe('bundle');
    });

    it('resolves a model by stable edge id', () => {
        const registry = ladder();
        const resolved = registry.resolve([edge, { id: 'e2', kind: 'evidence' }], sample(0.1));
        expect([...resolved.keys()]).toEqual(['e1', 'e2']);
        expect(resolved.get('e1')?.style).toEqual({ thickness: 1, dashed: true });
    });

    it('aligns to scale stops and drops rungs without a style', () => {
        const registry = edgeLadderFromStops(
            stops,
            { bundle: { thickness: 1 }, ribbon: { thickness: 4 } },
            { hysteresis: 0.01 },
        );
        expect(registry.ids).toEqual(['bundle', 'ribbon']);
        expect(registry.select(edge, sample(1))?.rung.id).toBe('ribbon');
        expect(registry.select(edge, sample(0.5))?.rung.id).toBe('bundle');
    });
});
