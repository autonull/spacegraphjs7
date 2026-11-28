import { describe, expect, it } from 'vitest';
import {
    foldPlacement,
    foldPosition,
    foldableNodeHTML,
    innerWidgetEdges,
    innerWidgetHTML,
    innerWidgetStats,
    reduceInnerWidgets,
    type InnerWidgetItem,
    type InnerWidgetModel,
    type InnerWidgetState,
} from '../src/inner-widget';

const items: readonly InnerWidgetItem[] = [
    {
        id: 'a',
        label: 'router.ts',
        kind: 'artifact',
        detail: 'src/router.ts',
        x: 4,
        y: 8,
        width: 44,
        height: 36,
    },
    {
        id: 'b',
        label: 'test log',
        kind: 'state',
        detail: '5 passed',
        x: 52,
        y: 8,
        width: 44,
        height: 36,
    },
];
const model: InnerWidgetModel = { container: 'conv-1', items };
const state: InnerWidgetState = { folded: false, detached: [] };

describe('inner widget model', () => {
    it('reduces fold, detach and reattach idempotently', () => {
        const folded = reduceInnerWidgets(state, { type: 'fold' });
        expect(folded.folded).toBe(true);
        expect(reduceInnerWidgets(folded, { type: 'fold' })).toBe(folded);
        expect(reduceInnerWidgets(state, { type: 'toggle' }).folded).toBe(true);
        expect(reduceInnerWidgets(folded, { type: 'unfold' })).toEqual(state);
        const detached = reduceInnerWidgets(state, { type: 'detach', id: 'a' });
        expect(detached.detached).toEqual(['a']);
        expect(reduceInnerWidgets(detached, { type: 'detach', id: 'a' })).toBe(detached);
        expect(reduceInnerWidgets(detached, { type: 'reattach', id: 'a' })).toEqual(state);
        expect(reduceInnerWidgets(state, { type: 'reattach', id: 'a' })).toBe(state);
    });

    it('derives contains edges from detached ids with stable edges', () => {
        const detached = reduceInnerWidgets(state, { type: 'detach', id: 'b' });
        expect(innerWidgetEdges(model, detached)).toEqual([
            {
                id: 'contains:conv-1:inner:conv-1:b',
                source: 'conv-1',
                target: 'inner:conv-1:b',
                kind: 'contains',
            },
        ]);
        expect(innerWidgetEdges(model, state)).toEqual([]);
        expect(innerWidgetStats(model, detached)).toEqual({
            total: 2,
            shown: 1,
            detached: 1,
            folded: false,
        });
    });

    it('interpolates fold without changing ids', () => {
        const collapsed = foldPlacement(items[0]!, true, 1);
        expect(collapsed.id).toBe('a');
        expect(collapsed.height).toBe(0);
        expect(collapsed.y).toBe(26);
        expect(foldPlacement(items[0]!, false, 1)).toEqual(items[0]);
        expect(foldPlacement(items[0]!, true, -1)).toEqual(items[0]);
    });

    it('renders escaped widget chrome and stable action selectors', () => {
        const unsafe: InnerWidgetModel = {
            container: 'conv-1',
            items: [{ ...items[0]!, label: '<img>', detail: '"bad"' }],
        };
        const html = innerWidgetHTML({
            model: unsafe,
            state: { folded: true, detached: ['a'] },
            stats: innerWidgetStats(unsafe, { folded: true, detached: ['a'] }),
        });
        expect(html).toContain('data-inner-container="conv-1" data-folded="true"');
        expect(html).toContain('data-inner-item="a"');
        expect(html).toContain('data-inner-action="reattach:a"');
        expect(html).toContain('data-inner-action="unfold"');
        expect(html).toContain('&lt;img&gt;');
        expect(html).not.toContain('<img>');
        expect(html).toContain('&quot;bad&quot;');

        const folded = foldableNodeHTML({
            label: 'Container',
            model,
            state,
            stats: innerWidgetStats(model, state),
        });
        expect(folded).toContain('data-foldable="conv-1"');
        expect(folded).toContain('Container · 2/2 inner');
    });
});
