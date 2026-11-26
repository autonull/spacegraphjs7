import { describe, expect, it } from 'vitest';
import {
    buildSpec,
    cardHtml,
    cardSize,
    layoutEvents,
    matchesFilter,
    type TranscriptEvent,
} from '../transcript';

const item: TranscriptEvent = {
    id: 'e1',
    kind: 'error',
    label: 'test failed',
    text: '1 failure',
    status: 'failed',
    turn: 3,
    spine: true,
    octave: 0,
    position: [0, 0, 0],
};

describe('transcript workspace', () => {
    it('builds primary cards and attaches context at smaller octaves', () => {
        const spec = buildSpec();
        expect(spec.nodes).toHaveLength(15);
        expect(spec.edges).toHaveLength(14);
        expect(new Set(spec.nodes?.map((node) => node.id)).size).toBe(15);
        for (const edge of spec.edges ?? []) {
            expect(spec.nodes?.some((node) => node.id === edge.source)).toBe(true);
            expect(spec.nodes?.some((node) => node.id === edge.target)).toBe(true);
        }
        const types = new Set((spec.edges ?? []).map((edge) => edge.type));
        expect([...types].sort()).toEqual(['CurvedEdge', 'DottedEdge', 'Edge']);

        const size = (id: string) => {
            const data = spec.nodes?.find((node) => node.id === id)?.data as {
                width: number;
                height: number;
            };
            return [data.width, data.height] as const;
        };
        const spineWidths = ['u1', 'a1', 'u2', 'ap1', 'u3', 'e1', 'a2'].map((id) => size(id)[0]);
        expect(new Set(spineWidths).size).toBeGreaterThan(3);
        expect(size('a1')[0]).toBeGreaterThan(size('u3')[0]);
        expect(size('u1')[1]).toBeGreaterThan(size('f1')[1]);
        expect(size('f1')[1]).toBeGreaterThan(size('q1')[1]);
        const spineEdge = spec.edges?.find((edge) => edge.type === 'CurvedEdge');
        expect((spineEdge?.data as { opacity?: number }).opacity).toBeLessThan(0.2);
        expect(size('f1')[0]).toBeLessThan(size('u1')[0]);
        const position = (id: string) => spec.nodes?.find((node) => node.id === id)?.position ?? [];
        expect(position('f1')[0]! - size('f1')[0] / 2).toBeGreaterThan(
            position('u1')[0]! + size('u1')[0] / 2,
        );
    });
    it('wraps a long line into a taller card instead of clipping it', () => {
        const short = cardSize({
            ...item,
            kind: 'user',
            label: 'user message',
            text: 'Hi',
            octave: 0,
        });
        const long = cardSize({
            ...item,
            kind: 'user',
            label: 'user message',
            text: 'Investigate the failing suite and describe the root cause in detail',
            octave: 0,
        });
        expect(long[1]).toBeGreaterThan(short[1]);
        expect(long[0]).toBeLessThanOrEqual(520);
    });

    it('keeps the spine append-only and nests deeper detail under attached cards', () => {
        const make = (id: string, spine: boolean, parent?: string): TranscriptEvent => ({
            ...item,
            id,
            spine,
            parent,
            position: [0, 0, 0],
        });
        const leftEdges = (entries: readonly TranscriptEvent[]) =>
            entries
                .filter((entry) => entry.spine)
                .map((entry) => entry.position[0] - cardSize(entry)[0] / 2);
        const initial = layoutEvents([make('a', true), make('b', true), make('c', false, 'a')]);
        expect(leftEdges(initial).every((edge) => Math.abs(edge) < 1e-6)).toBe(true);
        const spine = initial.filter((entry) => entry.spine);
        expect(spine[1]!.position[1]).toBeLessThan(spine[0]!.position[1]);
        expect(initial.find((entry) => entry.id === 'c')!.octave).toBe(-1);
        expect(initial.find((entry) => entry.id === 'c')!.position[0]).toBeGreaterThan(
            spine[0]!.position[0] + cardSize(spine[0]!)[0] / 2,
        );

        const grown = layoutEvents([...initial, make('d', false, 'c')]);
        expect(leftEdges(grown).every((edge) => Math.abs(edge) < 1e-6)).toBe(true);
        expect(grown.find((entry) => entry.id === 'c')!.octave).toBe(-1);
        expect(grown.find((entry) => entry.id === 'd')!.octave).toBe(-2);
    });

    it('filters by kind or shows everything', () => {
        expect(matchesFilter(item, 'all')).toBe(true);
        expect(matchesFilter(item, 'error')).toBe(true);
        expect(matchesFilter(item, 'approval')).toBe(false);
    });

    it('escapes host text before it reaches card markup', () => {
        const html = cardHtml({ ...item, label: '<img src=x onerror="alert(1)">' });
        expect(html).not.toContain('<img');
        expect(html).toContain('data-kind="error"');
        expect(html).toContain('data-octave="0"');
        expect(html).toContain('&lt;img');
    });
});
