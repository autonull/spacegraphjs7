import { describe, expect, it } from 'vitest';
import {
    DEFAULT_RUNG_IDS,
    RepresentationLadder,
    ladderFromStops,
    representationChanges,
    type LadderNode,
} from 'spacegraphjs/representations';
import { ScaleDomain } from 'spacegraphjs/zoom';

const stops = [
    { at: 0, id: 'dot', importance: 0, transitionDuration: 0.2 },
    { at: 0.25, id: 'glyph', importance: 0.25 },
    { at: 0.5, id: 'card', importance: 0.5 },
    { at: 0.75, id: 'widget', importance: 0.75, transitionDuration: 0.2 },
    { at: 1, id: 'detail', importance: 1 },
] as const;

const domain = new ScaleDomain({
    stops,
    range: { min: 100, max: 2000, closerIsLarger: false },
});

const sample = (normalized: number) => domain.sample(normalized, domain.rawAt(normalized));
const build = (rung: string) => (node: LadderNode) => `${rung}:${node.id}`;
const ladder = (hysteresis = 0) =>
    new RepresentationLadder<LadderNode, string>(
        stops.map((stop) => ({ at: stop.at, id: stop.id, build: build(stop.id) })),
        { hysteresis },
    );

const node: LadderNode = { id: 'n1', kind: 'tool' };

describe('representation ladder', () => {
    it('registers host-ordered rungs and selects the one covering the scale sample', () => {
        const registry = ladder();
        expect(registry.ids).toEqual([...DEFAULT_RUNG_IDS]);
        expect(registry.select(node, sample(0.1))?.rung.id).toBe('dot');
        expect(registry.select(node, sample(0.3))?.rung.id).toBe('glyph');
        expect(registry.select(node, sample(0.99))?.rung.id).toBe('widget');
    });

    it('uses the last rung at the far end of the scale', () => {
        expect(ladder().select(node, sample(1))?.rung.id).toBe('detail');
    });

    it('keeps node ids stable while the appearance changes', () => {
        const selection = ladder().select(node, sample(0.55));
        expect(selection).toMatchObject({ id: 'n1', rung: { id: 'card' }, value: 'card:n1' });
    });

    it('respects kind and importance gates, falling back to a coarser rung', () => {
        const registry = new RepresentationLadder<LadderNode, string>([
            { at: 0, id: 'dot', kinds: ['tool'], build: build('dot') },
            { at: 0.5, id: 'card', kinds: ['session'], minImportance: 0.8, build: build('card') },
        ]);
        expect(registry.select(node, sample(1))?.rung.id).toBe('dot');
        expect(registry.select({ id: 's1', kind: 'session' }, sample(0.6))?.rung.id).toBeUndefined();
        expect(
            registry.select({ id: 's1', kind: 'session', importance: 0.9 }, sample(0.6))?.rung.id,
        ).toBe('card');
    });

    it('holds a rung inside the dead zone on both sides of a boundary', () => {
        const registry = ladder(0.05);
        expect(registry.select(node, sample(0.53), 'glyph')?.rung.id).toBe('glyph');
        expect(registry.select(node, sample(0.28), 'dot')?.rung.id).toBe('dot');
        expect(registry.select(node, sample(0.18), 'glyph')?.rung.id).toBe('dot');
        expect(registry.select(node, sample(0.72), 'widget')?.rung.id).toBe('widget');
    });

    it('resolves a model by stable id and reports swaps with the domain duration', () => {
        const registry = ladder();
        const nodes = [node, { id: 'n2', kind: 'session' }];
        const first = registry.resolve(nodes, sample(0.1));
        const second = registry.resolve(nodes, sample(0.8), new Map([['n1', 'dot']]));
        expect([...first.keys()]).toEqual(['n1', 'n2']);
        expect(second.get('n1')?.rung.id).toBe('widget');
        expect(representationChanges(new Map([['n1', 'dot']]), new Map([['n1', 'widget']]), sample(0.8))).toEqual([
            { id: 'n1', from: 'dot', to: 'widget', duration: 0.2 },
        ]);
    });

    it('derives rungs from scale stops and skips rungs without a builder', () => {
        const registry = ladderFromStops(
            stops,
            { dot: build('dot'), glyph: build('glyph'), detail: build('detail') },
            { hysteresis: 0.01 },
        );
        expect(registry.ids).toEqual(['dot', 'glyph', 'detail']);
        expect(registry.select(node, sample(1))?.rung.id).toBe('detail');
        expect(registry.select(node, sample(0.4))?.rung.id).toBe('glyph');
    });

    it('lets a host register a rung after construction', () => {
        const registry = new RepresentationLadder<LadderNode, string>();
        expect(registry.select(node, sample(0.5))).toBeUndefined();
        registry.register({ at: 0.5, id: 'card', build: build('card') });
        expect(registry.ids).toEqual(['card']);
        expect(registry.select(node, sample(0.5))?.value).toBe('card:n1');
    });
});
