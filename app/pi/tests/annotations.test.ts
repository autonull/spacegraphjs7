import { describe, expect, it } from 'vitest';
import type { RenderModel } from '@spacegraphjs/renderer';
import { NoteStore, withPinnedNotes } from '../src/annotations';

const model: RenderModel = {
    nodes: [
        { id: 'a', kind: 'file', label: 'a', position: [0, 0, 0] },
        { id: 'b', kind: 'file', label: 'b', position: [1, 0, 0], widgets: ['other'] },
    ],
    edges: [],
};

describe('reviewer annotations', () => {
    it('stores notes by target and replaces them from a permalink', () => {
        const store = new NoteStore();
        const first = store.add('a', 'check this');
        store.add('b', 'second');
        expect(store.list.map((note) => note.id)).toEqual([first.id, 'note:b:2']);
        expect(store.forTarget('a')).toEqual([first]);
        expect(store.remove(first.id)).toBe(true);
        expect(store.forTarget('a')).toEqual([]);

        store.replaceAll([{ id: 'restored', target: 'b', body: 'from link' }]);
        expect(store.list).toEqual([{ id: 'restored', target: 'b', body: 'from link' }]);
    });

    it('does not reuse an id after a note is removed', () => {
        const store = new NoteStore();
        const first = store.add('a', 'first');
        store.add('a', 'second');
        store.remove(first.id);
        const third = store.add('a', 'third');
        expect(third.id).not.toBe(first.id);
        expect(store.forTarget('a').map((note) => note.body)).toEqual(['second', 'third']);
    });

    it('resumes id numbering above restored notes', () => {
        const store = new NoteStore([{ id: 'note:a:4', target: 'a', body: 'restored' }]);
        expect(store.add('a', 'fresh').id).toBe('note:a:5');
    });

    it('pins notes on render nodes without mutating the model', () => {
        const notes = [
            { id: 'n1', target: 'b', body: 'one' },
            { id: 'n2', target: 'b', body: 'two' },
        ];
        const pinned = withPinnedNotes(model, notes);
        expect(pinned.nodes[0]).toBe(model.nodes[0]);
        expect(pinned.nodes[1]?.widgets).toEqual(['other', 'annotation']);
        expect(pinned.nodes[1]?.data?.annotations).toEqual(notes);
        expect(model.nodes[1]?.widgets).toEqual(['other']);
        expect(withPinnedNotes(model, [])).toBe(model);
    });
});
