// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { setupHotkeys } from '../src/core/SpaceGraphAppInteraction';
import { setupSearchHUD } from '../src/core/SpaceGraphAppHUD';
import type { SpaceGraphApp } from '../src/core/SpaceGraphApp';

const disposers: Array<() => void> = [];
afterEach(() => {
    for (const dispose of disposers.splice(0)) dispose();
    document.getElementById('sg-app-search-input')?.remove();
});

function hotkeyHost() {
    const fits: number[] = [];
    let zoom = 0.5;
    const removed: string[] = [];
    const hotkeys: Record<string, () => void> = {};
    const app = {
        sg: {
            fitView: (padding: number) => fits.push(padding),
            get zoom() {
                return zoom;
            },
            setZoom: (next: number) => (zoom = next),
        },
        options: { hotkeys },
        hud: { hideContextMenu: () => undefined },
        currentSelected: new Set([{ id: 'n1' }]),
        currentSelectedEdges: new Set([{ id: 'e1' }]),
        removeNode: (id: string) => removed.push(id),
        removeEdge: (id: string) => removed.push(id),
        hideModal: () => undefined,
        clearSelection: () => undefined,
        setMode: () => undefined,
    } as unknown as SpaceGraphApp;
    disposers.push(setupHotkeys(app));
    const press = (key: string, init?: KeyboardEventInit) =>
        document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }));
    return { app, fits, removed, hotkeys, press, zoom: () => zoom };
}

function searchHost() {
    const nodes = new Map([
        ['n1', { id: 'n1', data: { label: 'Alpha' } }],
        ['n2', { id: 'n2', data: { label: 'Beta' } }],
        ['n3', { id: 'n3', label: 'Gamma' }],
    ]);
    const selected: string[][] = [];
    let container: HTMLElement | undefined;
    const app = {
        sg: {
            graph: { nodes },
            select: (ids: string[]) => selected.push(ids),
            clearSelection: () => selected.push([]),
        },
        hud: {
            removeElement: () => undefined,
            addElement: (options: { element: HTMLElement }) => (container = options.element),
        },
    } as unknown as SpaceGraphApp;
    setupSearchHUD(app);
    const input = container!.querySelector<HTMLInputElement>('#sg-app-search-input')!;
    const status = container!.querySelector<HTMLElement>('#sg-app-search-status')!;
    return { input, selected, status };
}

describe('SpaceGraphApp keyboard ergonomics', () => {
    it('fits, zooms and focuses search without a mouse', () => {
        const { fits, press, zoom } = hotkeyHost();
        const search = document.createElement('input');
        search.id = 'sg-app-search-input';
        document.body.append(search);

        press('f');
        expect(fits).toEqual([200]);
        press('+');
        expect(zoom()).toBeCloseTo(0.6);
        press('-');
        expect(zoom()).toBeCloseTo(0.5);
        press('/');
        expect(document.activeElement).toBe(search);
    });

    it('lets the host override built-in keys and leaves deletion to the interaction plugin', () => {
        const { fits, hotkeys, press, removed } = hotkeyHost();
        let called = 0;
        hotkeys['f'] = () => called++;

        press('f');
        expect(called).toBe(1);
        expect(fits).toEqual([]);
        press('Delete');
        press('Backspace');
        expect(removed).toEqual([]);
    });

    it('ignores shortcuts with modifiers and inside editable fields', () => {
        const { fits, press } = hotkeyHost();
        press('f', { ctrlKey: true });
        const input = document.createElement('input');
        document.body.append(input);
        input.focus();
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
        expect(fits).toEqual([]);
    });
});

describe('SpaceGraphApp search feedback', () => {
    it('announces match counts and clears on Escape', () => {
        const { input, selected, status } = searchHost();
        expect(input.type).toBe('search');

        input.value = 'alph';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        expect(selected.at(-1)).toEqual(['n1']);
        expect(status.textContent).toBe('1 match');

        input.value = 'a';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        expect(status.textContent).toBe('3 matches');

        input.value = 'gamma';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        expect(selected.at(-1)).toEqual(['n3']);
        expect(status.textContent).toBe('1 match');

        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        expect(status.textContent).toBe('');

        input.value = 'beta';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect(input.value).toBe('');
        expect(selected.at(-1)).toEqual([]);
        expect(status.textContent).toBe('');
    });
});
