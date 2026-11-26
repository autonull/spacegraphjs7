import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccessibilityLayer, bindA11yFocus } from '../src/a11y/AccessibilityLayer';
import { createAnnouncer } from '../src/a11y/announcer';
import { EventEmitter } from '../src/core/EventEmitter';
import type { SpaceGraphEvents } from '../src/types';

let container: HTMLElement;

const key = (element: Element, name: string) =>
    element.dispatchEvent(
        new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }),
    );

beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
});

afterEach(() => {
    container.remove();
});

describe('AccessibilityLayer', () => {
    it('keeps the host container visually hidden and labelled', () => {
        const layer = new AccessibilityLayer(container, { label: 'Session graph' });
        expect(container.getAttribute('role')).toBe('group');
        expect(container.getAttribute('aria-label')).toBe('Session graph');
        expect(container.getAttribute('style')).toContain('position:absolute');
        expect(container.querySelector('ul')).not.toBeNull();
        expect(container.querySelector('[aria-live="polite"]')).not.toBeNull();
        layer.dispose();
    });

    it('lists items with combined text and a single roving tabindex', () => {
        const layer = new AccessibilityLayer(container);
        layer.setItems([
            { id: 'a', label: 'Alpha', kind: 'tool' },
            { id: 'b', label: 'Beta', kind: 'file', status: 'failed' },
        ]);
        const items = container.querySelectorAll('li');
        expect(items).toHaveLength(2);
        expect(items[0].textContent).toBe('Alpha — tool');
        expect(items[1].textContent).toBe('Beta — file — failed');
        expect(items[0].tabIndex).toBe(0);
        expect(items[1].tabIndex).toBe(-1);
        layer.dispose();
    });

    it('exposes option semantics and ignores clicks on disabled items', () => {
        const onSelect = vi.fn();
        const layer = new AccessibilityLayer(container, { onSelect });
        layer.setItems([
            { id: 'a', label: 'A' },
            { id: 'b', label: 'B', interactive: false },
        ]);
        const list = container.querySelector('ul')!;
        expect(list.getAttribute('role')).toBe('listbox');
        expect(list.getAttribute('aria-multiselectable')).toBe('true');
        const items = list.querySelectorAll('li');
        expect(items[0].getAttribute('role')).toBe('option');
        expect(items[1].getAttribute('aria-disabled')).toBe('true');

        items[0].click();
        items[1].click();
        expect(onSelect).toHaveBeenCalledTimes(1);
        expect(onSelect).toHaveBeenCalledWith('a');
        layer.dispose();
    });

    it('uses tree semantics for expandable groups', () => {
        const layer = new AccessibilityLayer(container);
        layer.setItems([
            {
                id: 'parent',
                label: 'Parent',
                expanded: true,
                children: [{ id: 'child', label: 'Child' }],
            },
        ]);
        expect(container.querySelector('ul')!.getAttribute('role')).toBe('tree');
        const parent = container.querySelector('li[data-id="parent"]')!;
        expect(parent.getAttribute('role')).toBe('treeitem');
        expect(parent.getAttribute('aria-expanded')).toBe('true');
        layer.dispose();
    });

    it('skips non-interactive items during keyboard traversal', () => {
        const layer = new AccessibilityLayer(container);
        layer.setItems([
            { id: 'a', label: 'A' },
            { id: 'b', label: 'B', interactive: false },
            { id: 'c', label: 'C' },
        ]);
        key(container.querySelector('ul')!, 'ArrowDown');
        expect(layer.currentId).toBe('c');
        key(container.querySelector('ul')!, 'ArrowUp');
        expect(layer.currentId).toBe('a');
        layer.dispose();
    });

    it('activates the current item on Enter or Space', () => {
        const onSelect = vi.fn();
        const layer = new AccessibilityLayer(container, { onSelect });
        layer.setItems([
            { id: 'a', label: 'A' },
            { id: 'b', label: 'B' },
        ]);
        key(container.querySelector('ul')!, 'ArrowDown');
        key(container.querySelector('ul')!, 'Enter');
        key(container.querySelector('ul')!, ' ');
        expect(onSelect).toHaveBeenNthCalledWith(1, 'b');
        expect(onSelect).toHaveBeenNthCalledWith(2, 'b');
        layer.dispose();
    });

    it('invokes Escape and announces selection through the live region', () => {
        const onEscape = vi.fn();
        const layer = new AccessibilityLayer(container, { onEscape });
        layer.setItems([
            { id: 'a', label: 'Alpha' },
            { id: 'b', label: 'Beta' },
        ]);
        key(container.querySelector('ul')!, 'Escape');
        expect(onEscape).toHaveBeenCalledTimes(1);
        layer.setSelected(['b']);
        expect(container.querySelector('li[data-id="b"]')!.getAttribute('aria-selected')).toBe(
            'true',
        );
        expect(container.querySelector('[aria-live="polite"]')!.textContent).toBe('Selected Beta');
        layer.setSelected(null);
        expect(container.querySelector('[aria-live="polite"]')!.textContent).toBe(
            'Selection cleared',
        );
        layer.dispose();
    });

    it('lets the host localize the selection announcement', () => {
        const layer = new AccessibilityLayer(container, {
            formatSelection: (labels) => `Sélection ${labels.join(', ')}`,
        });
        layer.setItems([{ id: 'a', label: 'Alpha' }]);
        layer.setSelected(['a']);
        expect(container.querySelector('[aria-live="polite"]')!.textContent).toBe(
            'Sélection Alpha',
        );
        layer.dispose();
    });

    it('focuses a named item and stops handling keys after dispose', () => {
        const onSelect = vi.fn();
        const layer = new AccessibilityLayer(container, { onSelect });
        layer.setItems([
            { id: 'a', label: 'A' },
            { id: 'b', label: 'B' },
        ]);
        layer.focus('b');
        expect(layer.currentId).toBe('b');
        const list = container.querySelector('ul')!;
        layer.dispose();
        expect(list.children).toHaveLength(0);
        key(list, 'Enter');
        expect(onSelect).not.toHaveBeenCalled();
    });
    it('lists the connections next to the nodes', () => {
        const layer = new AccessibilityLayer(container, { edgeLabel: 'Verbindungen' });
        layer.setItems([
            { id: 'a', label: 'Alpha' },
            { id: 'b', label: 'Beta' },
        ]);
        layer.setEdges([
            { id: 'e1', source: 'a', target: 'b', kind: 'writes', label: 'Alpha writes Beta' },
            { id: 'e2', source: 'b', target: 'c', kind: 'produces' },
        ]);

        const list = container.querySelector('ul[aria-label="Verbindungen"]')!;
        expect(list).not.toBeNull();
        expect(list.querySelectorAll('li')).toHaveLength(2);
        expect(list.querySelector('li[data-edge="e1"]')!.textContent).toBe(
            'Alpha writes Beta — writes',
        );
        expect(list.querySelector('li[data-edge="e2"]')!.textContent).toBe('b to c — produces');
        layer.dispose();
    });

    it('announces the connections of the selected nodes', () => {
        const layer = new AccessibilityLayer(container, {
            edgeAnnouncer: (edges) =>
                edges.length ? `Connections: ${edges.map((edge) => edge.id).join(', ')}` : '',
        });
        layer.setItems([
            { id: 'a', label: 'Alpha' },
            { id: 'b', label: 'Beta' },
        ]);
        layer.setEdges([
            { id: 'e1', source: 'a', target: 'b' },
            { id: 'e2', source: 'b', target: 'c' },
        ]);

        layer.setSelected(['a']);
        expect(container.querySelector('[aria-live="polite"]')!.textContent).toBe(
            'Selected Alpha Connections: e1',
        );

        layer.setSelected(null);
        expect(container.querySelector('[aria-live="polite"]')!.textContent).toBe(
            'Selection cleared',
        );
        layer.dispose();
    });

    it('keeps the reader on the same node when the model changes under them', () => {
        const layer = new AccessibilityLayer(container);
        layer.setItems([
            { id: 'a', label: 'Alpha' },
            { id: 'b', label: 'Beta' },
        ]);
        layer.focus('b');
        expect(document.activeElement).toBe(container.querySelector('li[data-id="b"]'));

        // The same nodes, restated: the reader keeps their place and their focus.
        layer.setItems([
            { id: 'a', label: 'Alpha' },
            { id: 'b', label: 'Beta' },
        ]);
        expect(document.activeElement).toBe(container.querySelector('li[data-id="b"]'));

        // A different list: the reader lands on the node they were on.
        layer.setItems([
            { id: 'c', label: 'Gamma' },
            { id: 'b', label: 'Beta' },
        ]);
        expect(document.activeElement).toBe(container.querySelector('li[data-id="b"]'));
        layer.dispose();
    });

    it('drops the connection list when the edges are cleared', () => {
        const layer = new AccessibilityLayer(container);
        layer.setEdges([{ id: 'e1', source: 'a', target: 'b' }]);
        expect(container.querySelector('li[data-edge="e1"]')).not.toBeNull();

        layer.setEdges([]);
        expect(container.querySelector('li[data-edge="e1"]')).toBeNull();
        expect(layer.edges).toEqual([]);
        layer.dispose();
    });
});

describe('a11y focus bridge', () => {
    it('moves the mirror roving tabindex with the canvas focus', () => {
        const layer = new AccessibilityLayer(container);
        layer.setItems([
            { id: 'a', label: 'Alpha' },
            { id: 'b', label: 'Beta' },
        ]);
        const events = new EventEmitter<SpaceGraphEvents>();
        const unbind = bindA11yFocus(events, layer);

        events.emit('focus:changed', { node: { id: 'b' } as never, focused: true });
        expect(layer.currentId).toBe('b');

        events.emit('focus:changed', { node: { id: 'a' } as never, focused: false });
        expect(layer.currentId).toBe('b');

        unbind();
        events.emit('focus:changed', { node: { id: 'a' } as never, focused: true });
        expect(layer.currentId).toBe('b');
        layer.dispose();
    });
});

describe('createAnnouncer', () => {
    it('adopts a host region and clears it on destroy', () => {
        const region = document.createElement('div');
        container.append(region);
        const announcer = createAnnouncer(region);
        expect(region).toHaveAttribute('role', 'status');
        expect(region).toHaveAttribute('aria-live', 'polite');
        announcer.announce('Shown in graph');
        expect(region.textContent).toBe('Shown in graph');
        announcer.destroy();
        expect(region.textContent).toBe('');
        expect(region.isConnected).toBe(true);
    });

    it('owns a hidden region when the host supplies none', () => {
        const announcer = createAnnouncer();
        const regions = document.body.querySelectorAll('[role="status"][aria-live="polite"]');
        const region = regions[regions.length - 1] as HTMLElement;
        expect(region).toHaveStyle({ position: 'absolute', clipPath: 'inset(50%)' });
        announcer.announce('Reading passage 1 of 2');
        expect(region.textContent).toBe('Reading passage 1 of 2');
        announcer.destroy();
        expect(region.isConnected).toBe(false);
    });
});
