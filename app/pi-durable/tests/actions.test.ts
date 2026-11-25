import { describe, expect, it } from 'vitest';
import { entryIDFromNode } from '../src/actions';

describe('action targets', () => {
    it('derives a committed entry id from a message, action or state node', () => {
        expect(entryIDFromNode('d:1:entry:basic-turn-user')).toBe('basic-turn-user');
        expect(entryIDFromNode('d:2:tool:call_01')).toBe('call_01');
        expect(entryIDFromNode('d:3:entry:7-answer')).toBe('7-answer');
    });

    it('never treats a conversation, run, task or missing selection as an entry', () => {
        for (const id of ['d:1:conversation', 'd:1:run', 'd:1:task:2', 'd:1:signal:approve', '', undefined])
            expect(entryIDFromNode(id)).toBeUndefined();
    });
});
