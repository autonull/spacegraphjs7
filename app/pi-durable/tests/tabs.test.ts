import { describe, expect, it } from 'vitest';
import { addNode, foldKernelOps } from '@spacegraphjs/kernel';
import { TabRegistry, tabKernel } from 'pi-kit';

describe('tab registry', () => {
    it('folds each tab independently and restores its view state', () => {
        const registry = new TabRegistry([], '1');
        registry.add('1', [addNode('d:1:conversation', 'conversation', 'One', {})]);
        registry.setView('1', { ...registry.get('1')!.view, selection: 'chosen' });
        registry.add('2', [addNode('d:2:conversation', 'conversation', 'Two', {})]);
        registry.append('2', addNode('d:2:entry:1', 'message', 'Answer', { text: 'Paris.' }));
        expect(tabKernel(registry.active()!).nodes.length).toBe(1);
        expect(registry.setActive('2')).toBe(true);
        expect(tabKernel(registry.active()!).nodes.length).toBe(2);
        expect(registry.get('1')!.view.selection).toBe('chosen');
    });

    it('forks a session without sharing later appends', () => {
        const registry = new TabRegistry();
        registry.add('1', [
            addNode('d:1:conversation', 'conversation', 'One', {}),
            addNode('d:1:entry:1', 'message', 'Question', {}),
        ]);
        const fork = registry.fork('1', '2', 2)!;
        registry.append('2', addNode('d:2:entry:2', 'message', 'Child answer', {}));
        expect(fork.session.tags.has('forkedFrom')).toBe(true);
        expect(tabKernel(registry.get('1')!).nodes.length).toBe(2);
        expect(tabKernel(registry.get('2')!).nodes.length).toBe(3);
    });

    it('composes all tabs into one workspace', () => {
        const registry = new TabRegistry();
        registry.add('1', [addNode('d:1:conversation', 'conversation', 'One', {})]);
        registry.add('2', [addNode('d:2:conversation', 'conversation', 'Two', {})]);
        const workspace = registry.workspace();
        expect(workspace.kernel.nodes.map((node) => node.id).sort()).toEqual(['d:1:conversation', 'd:2:conversation']);
    });

    it('rejects an unknown tab and round-trips a permalink snapshot', () => {
        const registry = new TabRegistry([], '1');
        registry.add('1');
        expect(registry.setActive('unknown')).toBe(false);
        const snapshot = registry.snapshot();
        expect(snapshot.active).toBe('1');
        expect(foldKernelOps([]).nodes).toEqual([]);
    });
});
