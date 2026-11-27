// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCommandSurface, createInspector, type Command } from '../src/shell';

const command = (id: string, extra: Partial<Command> = {}): Command => ({
    id,
    label: id,
    group: 'Test',
    ...extra,
});

beforeEach(() => {
    document.body.replaceChildren();
});

describe('the command surface', () => {
    it('traps focus and restores it on close', () => {
        const opener = document.createElement('button');
        document.body.append(opener);
        opener.focus();
        const surface = createCommandSurface(() => [command('fit')]);
        document.body.append(surface.element);
        surface.open();
        expect(document.activeElement).toBe(document.getElementById('command-input'));
        document.activeElement!.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
        );
        expect(document.activeElement).toBe(document.getElementById('command-input'));

        document.activeElement!.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
        );
        expect(surface.element.hidden).toBe(true);
        expect(surface.mode).toBeUndefined();
        expect(document.activeElement).toBe(opener);
    });

    it('exposes an empty state and keeps gated commands visible but inert', () => {
        const run = vi.fn();
        const surface = createCommandSurface(() => [
            command('gated', { disabledReason: 'Select a node first', run }),
            command('ready', { run }),
        ]);
        document.body.append(surface.element);

        surface.open('palette', 'no-such-command');
        expect(surface.element.querySelector('[role="status"]')?.textContent).toContain(
            'No commands match',
        );

        surface.open('palette', 'gated');
        const row = surface.element.querySelector<HTMLElement>('[data-command-id="gated"]')!;
        expect(row.getAttribute('role')).toBe('option');
        expect(row.getAttribute('aria-selected')).toBe('false');
        expect(row.getAttribute('aria-disabled')).toBe('true');
        expect(row.textContent).toContain('Select a node first');
        document
            .getElementById('command-input')!
            .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(run).not.toHaveBeenCalled();
    });

    it('conveys the active option through combobox semantics', () => {
        const surface = createCommandSurface(() => [command('fit'), command('focus')]);
        document.body.append(surface.element);
        surface.open();
        const input = document.getElementById('command-input')!;
        expect(input.getAttribute('role')).toBe('combobox');
        expect(input.getAttribute('aria-controls')).toBe('command-list');
        expect(input.getAttribute('aria-expanded')).toBe('true');
        expect(input.getAttribute('aria-activedescendant')).toBe('command-option-0');
        expect(document.getElementById('command-option-0')?.getAttribute('role')).toBe('option');

        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        expect(input.getAttribute('aria-activedescendant')).toBe('command-option-1');
        surface.open('palette', 'no-such-command');
        expect(input.hasAttribute('aria-activedescendant')).toBe(false);
        surface.close();
        expect(input.getAttribute('aria-expanded')).toBe('false');
    });

    it('moves selection onto enabled options only', () => {
        const run = vi.fn();
        const surface = createCommandSurface(() => [
            command('first', { run }),
            command('gated', { disabledReason: 'Unavailable', run }),
            command('last', { run }),
        ]);
        document.body.append(surface.element);

        surface.open();
        const selected = () =>
            [...surface.element.querySelectorAll('[role="option"]')].findIndex(
                (row) => row.getAttribute('aria-selected') === 'true',
            );
        expect(selected()).toBe(0);
        const input = document.getElementById('command-input')!;
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        expect(selected()).toBe(2);
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(run).toHaveBeenCalledTimes(1);
    });
});

describe('the inspector', () => {
    it('keeps one tab in the tab order and labels its panel', () => {
        const inspector = createInspector();
        document.body.append(inspector.element);
        const tabs = [...inspector.element.querySelectorAll<HTMLElement>('[role="tab"]')];

        expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1, -1]);
        expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');
        expect(document.getElementById('inspector-panel')?.getAttribute('aria-labelledby')).toBe(
            tabs[0]!.id,
        );

        tabs[0]!.focus();
        tabs[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        expect(inspector.tab).toBe('inner');
        expect(document.activeElement).toBe(tabs[1]);
        expect(tabs.map((tab) => tab.tabIndex)).toEqual([-1, 0, -1, -1]);
    });
});
