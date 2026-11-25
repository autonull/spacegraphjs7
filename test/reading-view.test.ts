// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { mountReading, readingOrder, type ReadingNode } from '../src/reading';

const nodes: readonly ReadingNode[] = [
    { id: 'a', label: 'First', text: 'First fact' },
    { id: 'b', label: 'Second', text: 'Second fact' },
];

describe('mountReading', () => {
    it('focuses sections with arrow keys and reveals with Enter', () => {
        const container = document.createElement('div');
        document.body.append(container);
        const revealed = vi.fn();
        const controller = mountReading(container, readingOrder(nodes, []), { onReveal: revealed });
        const sections = container.querySelectorAll<HTMLElement>('.reading-section');
        expect(sections).toHaveLength(2);

        sections[0]!.focus();
        sections[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        expect(document.activeElement).toBe(sections[1]);

        sections[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(revealed).toHaveBeenCalledWith('b');
        controller.destroy();
        container.remove();
    });

    it('reveals on click and stops listening after destroy', () => {
        const container = document.createElement('div');
        document.body.append(container);
        const revealed = vi.fn();
        const controller = mountReading(container, readingOrder(nodes, []), { onReveal: revealed });
        container.querySelector('.reading-backlink')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(revealed).toHaveBeenCalledWith('a');
        controller.destroy();
        container.querySelector('.reading-backlink')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(revealed).toHaveBeenCalledTimes(1);
        container.remove();
    });
});
