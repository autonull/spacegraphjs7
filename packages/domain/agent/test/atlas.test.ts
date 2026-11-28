import { describe, expect, it } from 'vitest';
import {
    atlasChapters,
    atlasEdges,
    atlasModel,
    atlasStats,
    atlasTravel,
    atlasVisible,
    reduceAtlas,
    replayScrubberHTML,
    sessionAtlasHTML,
    type AtlasEvent,
    type AtlasState,
} from '../src/atlas';

const events: readonly AtlasEvent[] = [
    {
        id: 'e1',
        kind: 'user',
        status: 'complete',
        role: 'user',
        text: 'patch it',
        turn: 1,
        at: 1,
        label: 'patch it',
    },
    {
        id: 'e2',
        kind: 'tool',
        status: 'failed',
        role: 'tool',
        text: 'test fails',
        turn: 1,
        at: 2,
        label: 'test fails',
        parent: 'e1',
    },
    {
        id: 'e3',
        kind: 'approval',
        status: 'complete',
        role: 'assistant',
        text: 'apply?',
        turn: 2,
        at: 3,
        label: 'apply?',
        parent: 'e2',
    },
];
const state: AtlasState = { total: events.length, prefix: events.length, playing: false };

describe('session atlas model', () => {
    it('groups committed events into stable chapters', () => {
        expect(atlasChapters(events)).toEqual([
            { id: 'chapter-1', label: 'Turn 1', turn: 1, ids: ['e1', 'e2'] },
            { id: 'chapter-2', label: 'Turn 2', turn: 2, ids: ['e3'] },
        ]);
        expect(atlasChapters([])).toEqual([]);
    });

    it('derives causal edges from parents and marks failures', () => {
        expect(atlasEdges(events)).toEqual([
            { id: 'edge-e2', source: 'e1', target: 'e2', kind: 'failed' },
            { id: 'edge-e3', source: 'e2', target: 'e3', kind: 'causal' },
        ]);
        const model = atlasModel(events);
        expect(model.chapters).toHaveLength(2);
        expect(model.edges).toHaveLength(2);
    });

    it('reduces replay prefix, play, stop, window and travel idempotently', () => {
        expect(reduceAtlas(state, { type: 'prefix', value: 99 }).prefix).toBe(3);
        expect(reduceAtlas(state, { type: 'prefix', value: 3 })).toBe(state);
        const playing = reduceAtlas(state, { type: 'play' });
        expect(playing).toMatchObject({ prefix: 1, playing: true });
        expect(reduceAtlas(playing, { type: 'play' })).toBe(playing);
        expect(reduceAtlas(playing, { type: 'stop' })).toMatchObject({
            prefix: 3,
            playing: false,
        });
        expect(reduceAtlas(state, { type: 'stop' })).toBe(state);
        const selected = reduceAtlas(state, { type: 'window', id: 'e2' });
        expect(selected).toMatchObject({ window: 'e2', selected: 'e2' });
        expect(reduceAtlas(selected, { type: 'window', id: 'e2' })).toBe(selected);
        expect(reduceAtlas(selected, { type: 'close' }).window).toBeUndefined();
        expect(reduceAtlas(state, { type: 'close' })).toBe(state);
        const travelled = reduceAtlas(state, { type: 'travel', from: 'e1', to: 'e3' });
        expect(travelled.travel).toEqual({ from: 'e1', to: 'e3' });
        expect(reduceAtlas(travelled, { type: 'arrive' }).travel).toBeUndefined();
        expect(reduceAtlas(travelled, { type: 'travel', from: 'e1', to: 'e3' })).toBe(travelled);
    });

    it('counts only the visible committed prefix', () => {
        expect(atlasVisible(events, 2).map((event) => event.id)).toEqual(['e1', 'e2']);
        expect(atlasStats(events, atlasChapters(events), 2)).toEqual({
            shown: 2,
            total: 3,
            chapters: 2,
            failed: 1,
        });
    });

    it('renders an accessible scrubber and escaped atlas chrome', () => {
        const scrubber = replayScrubberHTML({ prefix: 2, total: 3, playing: true });
        expect(scrubber).toContain('aria-label="Replay prefix"');
        expect(scrubber).toContain('min="1" max="3" value="2"');
        expect(scrubber).toContain('data-atlas-action="play" data-on="true"');
        expect(scrubber).toContain('2/3');

        const unsafe = { ...events[0]!, label: '<img>', text: '<script>x</script>' };
        const html = sessionAtlasHTML({
            model: atlasModel([unsafe, ...events.slice(1)]),
            state: { ...state, prefix: 2, selected: unsafe.id, window: unsafe.id },
            stats: atlasStats(events, atlasChapters(events), 2),
        });
        expect(html).toContain('&lt;img&gt;');
        expect(html).toContain('&lt;script&gt;x&lt;/script&gt;');
        expect(html).not.toContain('<img>');
        expect(html).toContain('data-atlas-event="e1" data-visible="true" data-selected="true"');
        expect(html).toContain('data-atlas-event="e3" data-visible="false"');
        expect(html).toContain('data-atlas-window="e1"');
        expect(html).toContain('data-atlas-action="travel:e1|e2"');
    });

    it('interpolates travel within bounds', () => {
        expect(atlasTravel({ x: 0, y: 10 }, { x: 100, y: -10 }, 0.5)).toEqual({ x: 50, y: 0 });
        expect(atlasTravel({ x: 0, y: 0 }, { x: 10, y: 10 }, 4)).toEqual({ x: 10, y: 10 });
        expect(atlasTravel({ x: 0, y: 0 }, { x: 10, y: 10 }, -1)).toEqual({ x: 0, y: 0 });
    });
});
