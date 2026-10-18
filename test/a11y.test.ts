import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccessibilityLayer } from '../src/a11y/AccessibilityLayer';

let container: HTMLElement;

const key = (element: Element, name: string) =>
  element.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }));

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

  it('skips non-interactive items during keyboard traversal', () => {
    const layer = new AccessibilityLayer(container);
    layer.setItems([{ id: 'a', label: 'A' }, { id: 'b', label: 'B', interactive: false }, { id: 'c', label: 'C' }]);
    key(container.querySelector('ul')!, 'ArrowDown');
    expect(layer.currentId).toBe('c');
    key(container.querySelector('ul')!, 'ArrowUp');
    expect(layer.currentId).toBe('a');
    layer.dispose();
  });

  it('activates the current item on Enter or Space', () => {
    const onSelect = vi.fn();
    const layer = new AccessibilityLayer(container, { onSelect });
    layer.setItems([{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]);
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
    layer.setItems([{ id: 'a', label: 'Alpha' }, { id: 'b', label: 'Beta' }]);
    key(container.querySelector('ul')!, 'Escape');
    expect(onEscape).toHaveBeenCalledTimes(1);
    layer.setSelected(['b']);
    expect(container.querySelector('li[data-id="b"]')!.getAttribute('aria-selected')).toBe('true');
    expect(container.querySelector('[aria-live="polite"]')!.textContent).toBe('Selected Beta');
    layer.setSelected(null);
    expect(container.querySelector('[aria-live="polite"]')!.textContent).toBe('Selection cleared');
    layer.dispose();
  });

  it('focuses a named item and stops handling keys after dispose', () => {
    const onSelect = vi.fn();
    const layer = new AccessibilityLayer(container, { onSelect });
    layer.setItems([{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]);
    layer.focus('b');
    expect(layer.currentId).toBe('b');
    const list = container.querySelector('ul')!;
    layer.dispose();
    expect(list.children).toHaveLength(0);
    key(list, 'Enter');
    expect(onSelect).not.toHaveBeenCalled();
  });
});
