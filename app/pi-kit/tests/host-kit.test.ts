import { describe, expect, it } from 'vitest';
import { dataText, el, escapeHTML } from '../src/dom';
import { dispatchKeys, plainKey, renderShortcuts, shiftedKey, type KeyBinding } from '../src/keyboard';
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
describe('host DOM helpers', () => {
    it('escapes markup, reads node text and fails on missing elements', () => {
        expect(escapeHTML('<a & "b">')).toBe('&lt;a &amp; &quot;b&quot;&gt;');
        expect(dataText({ data: { text: 'hello' } })).toBe('hello');
        expect(dataText({ data: { text: 3 } })).toBe('');
        expect(() => el('missing-host-element')).toThrow();
    });
});
