import { describe, expect, it } from 'vitest';
import { dataText, el, escapeHTML, row } from '../src/dom';
import { dispatchKeys, plainKey, renderShortcuts, shiftedKey, type KeyBinding } from '../src/keyboard';
import { clampZoom, createViewportController } from '../src/viewport';
const event = (key: string, extra: Partial<KeyboardEvent> = {}): KeyboardEvent => {
    const target = document.createElement('body');
    return {
        key,
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        shiftKey: false,
        target,
        preventDefault: () => {},
        ...extra,
    } as KeyboardEvent;
};
describe('host keyboard bindings', () => {
    it('matches plain and shifted keys without modifiers', () => {
        expect(plainKey('g')(event('g'))).toBe(true);
        expect(plainKey('g')(event('G', { shiftKey: true }))).toBe(false);
        expect(shiftedKey('r')(event('R', { shiftKey: true }))).toBe(true);
        expect(shiftedKey('r')(event('r'))).toBe(false);
    });
    it('dispatches the first match and honours the typing guard', () => {
        const seen: string[] = [];
        const bindings: KeyBinding[] = [
            { keys: 'g', label: 'Graph', match: plainKey('g'), run: () => seen.push('graph') },
            {
                keys: 'Ctrl+K',
                label: 'Lens',
                whileTyping: true,
                match: (e) => e.ctrlKey && e.key === 'k',
                run: () => seen.push('lens'),
            },
        ];
        expect(dispatchKeys(event('g'), bindings)).toBe(true);
        const input = document.createElement('input');
        expect(dispatchKeys(event('g', { target: input }), bindings)).toBe(false);
        expect(dispatchKeys(event('k', { ctrlKey: true, target: input }), bindings)).toBe(true);
        expect(seen).toEqual(['graph', 'lens']);
    });
    it('renders key and label rows into a container', () => {
        const container = document.createElement('div');
        renderShortcuts(container, [
            { keys: 'g', label: 'Graph', match: plainKey('g'), run: () => {} },
        ]);
        expect(container.querySelector('kbd')?.textContent).toBe('g');
        expect(container.querySelector('span')?.textContent).toBe('Graph');
    });
});
describe('zoom clamping', () => {
    it('keeps zoom inside the host range', () => {
        const range = { min: 0.25, max: 4 };
        expect(clampZoom(1, 16, range)).toBe(4);
        expect(clampZoom(1, 0.01, range)).toBe(0.25);
        expect(clampZoom(1, 1.2, range)).toBeCloseTo(1.2);
    });
});
describe('viewport controller', () => {
    it('clamps zoom through the shared renderer verbs and forwards fit', () => {
        const viewport = { zoom: 1, center: [0, 0, 0] as [number, number, number] };
        const fitted: unknown[] = [];
        const renderer = {
            getViewport: () => viewport,
            setViewport: (next: typeof viewport) => Object.assign(viewport, next),
            fit: (ids: readonly string[] | undefined, options?: unknown) => fitted.push([ids, options]),
        };
        const view = createViewportController(renderer, { min: 0.25, max: 4 });
        expect(view.zoomBy(16)).toBe(4);
        expect(viewport.zoom).toBe(4);
        view.fit(['a'], { padding: 10 });
        expect(fitted).toEqual([[['a'], { padding: 10 }]]);
    });
});
describe('host DOM helpers', () => {
    it('escapes markup, reads node text and fails on missing elements', () => {
        expect(escapeHTML('<a & "b">')).toBe('&lt;a &amp; &quot;b&quot;&gt;');
        expect(dataText({ data: { text: 'hello' } })).toBe('hello');
        expect(dataText({ data: { text: 3 } })).toBe('');
        expect(() => el('missing-host-element')).toThrow();
    });
    it('builds label/value rows as text with tone and title', () => {
        const element = row('<b>label</b>', '5\n6', 'warn', 'details');
        expect(element.className).toBe('row');
        expect(element.title).toBe('details');
        expect(element.querySelector('.label')?.textContent).toBe('<b>label</b>');
        const value = element.querySelector<HTMLElement>('.value');
        expect(value?.textContent).toBe('5\n6');
        expect(value?.dataset['tone']).toBe('warn');
        expect(element.querySelector('b')).toBeNull();
        expect(row('only').querySelector('.value')).toBeNull();
    });
});
