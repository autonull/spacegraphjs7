import { describe, expect, it } from 'vitest';
import {
    graphWindowAction,
    graphWindowHTML,
    graphWindowTaskbarHTML,
    reduceGraphWindow,
    type GraphWindowState,
} from '../src/graph-window';

const state: GraphWindowState = { tab: 'detail', focused: false, hidden: false };
const props = {
    id: 'turn-5',
    title: 'Turn 5',
    status: 'COMPLETE',
    tabs: ['detail', 'signals'],
    activeTab: 'detail',
    focused: false,
    band: 'detail' as const,
    body: (tab: string) => `<p>${tab}</p>`,
};

describe('graph window shell', () => {
    it('renders the active tab and switches bodies without rewriting other state', () => {
        const full = graphWindowHTML({ ...props, activeTab: 'signals' });
        expect(full).toContain('data-gw-window="turn-5"');
        expect(full).toContain('data-on="true">SIGNALS');
        expect(full).toContain('<p>signals</p>');
        expect(full).not.toContain('<p>detail</p>');
    });

    it('collapses to a compact title card at far zoom', () => {
        for (const band of ['dot', 'glyph'] as const) {
            const compact = graphWindowHTML({ ...props, band });
            expect(compact).toContain('class="gw-compact"');
            expect(compact).not.toContain('gw-tabs');
            expect(compact).toContain('Turn 5');
        }
    });

    it('escapes host-supplied text and action labels', () => {
        const html = graphWindowHTML({
            ...props,
            title: '<img src=x onerror=alert(1)>',
        });
        expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
        expect(html).not.toContain('<img');
        expect(graphWindowAction('center', 'a"b', '<b>')).toContain('data-gw-window="a&quot;b"');
        expect(graphWindowAction('center', 'a', '<b>')).toContain('&lt;b&gt;');
    });

    it('reduces focus, tab and hide transitions idempotently', () => {
        expect(reduceGraphWindow(state, { type: 'focus' })).toEqual({ ...state, focused: true });
        expect(reduceGraphWindow(state, { type: 'tab', tab: 'detail' })).toBe(state);
        expect(reduceGraphWindow(state, { type: 'hide' })).toEqual({
            tab: 'detail',
            focused: false,
            hidden: true,
        });
        const hidden = reduceGraphWindow(state, { type: 'hide' });
        expect(reduceGraphWindow(hidden, { type: 'focus' })).toEqual({ ...state, focused: true });
    });

    it('marks taskbar focus and hidden state', () => {
        const bar = graphWindowTaskbarHTML([
            { id: 'a', title: 'A', focused: true, hidden: false },
            { id: 'b', title: 'B', focused: false, hidden: true },
        ]);
        expect(bar).toContain('data-gw-focus="a" data-active="true" data-hidden="false"');
        expect(bar).toContain('data-gw-focus="b" data-active="false" data-hidden="true"');
    });
});
