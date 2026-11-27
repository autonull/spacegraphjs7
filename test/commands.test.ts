// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { CommandRegistry, filterCommands, Tour, type Command } from '../src/commands';

const commands: readonly Command[] = [
    { id: 'a', label: 'Descend', group: 'navigate', hint: 'PgDn' },
    { id: 'b', label: 'Ascent of a node', group: 'navigate', keywords: ['up'] },
    { id: 'c', label: 'Toggle catalog', group: 'interface' },
];

describe('command filtering', () => {
    it('ranks label prefixes above other matches', () => {
        expect(filterCommands(commands, '')).toEqual(commands);
        expect(filterCommands(commands, 'desc').map((command) => command.id)).toEqual(['a']);
        expect(filterCommands(commands, 'node').map((command) => command.id)).toEqual(['b']);
        expect(filterCommands(commands, 'up').map((command) => command.id)).toEqual(['b']);
        expect(filterCommands(commands, 'PgDn').map((command) => command.id)).toEqual(['a']);
    });
});

describe('command registry', () => {
    it('contributes, replaces and removes commands by id', () => {
        const registry = new CommandRegistry(commands);
        expect(registry.groups()).toEqual(['navigate', 'interface']);
        registry.add({ id: 'a', label: 'Descend again', group: 'navigate' });
        expect(registry.list()).toHaveLength(3);
        expect(registry.get('a')?.label).toBe('Descend again');
        expect(registry.remove('missing')).toBe(false);
        expect(registry.remove('a')).toBe(true);
        expect(registry.get('a')).toBeUndefined();
    });

    it('runs enabled commands and keeps gated ones visible', () => {
        const run = vi.fn();
        const registry = new CommandRegistry([
            { id: 'ok', label: 'Open', group: 'action', run },
            {
                id: 'gated',
                label: 'Open docs',
                group: 'action',
                disabledReason: 'no provider',
                run,
            },
        ]);
        expect(registry.filter('open').map((command) => command.id)).toEqual(['ok', 'gated']);
        expect(registry.run('gated')).toBe(false);
        expect(registry.run('missing')).toBe(false);
        expect(registry.run('ok')).toBe(true);
        expect(run).toHaveBeenCalledOnce();
    });
});

describe('tour', () => {
    it('advances a sequence once and reports completion', () => {
        const tour = new Tour([
            { id: 'first', title: 'First', instruction: 'Try the controls' },
            { id: 'second', title: 'Second', instruction: 'Answer a question' },
        ]);
        expect(tour.done).toBe(false);
        expect(tour.current?.id).toBe('first');
        expect(tour.advance()?.id).toBe('second');
        expect(tour.index).toBe(1);
        expect(tour.advance()).toBeUndefined();
        expect(tour.done).toBe(true);
        expect(tour.current).toBeUndefined();
    });

    it('treats an empty sequence as already complete', () => {
        const tour = new Tour();
        expect(tour.done).toBe(true);
        expect(tour.start()).toBeUndefined();
    });
});
