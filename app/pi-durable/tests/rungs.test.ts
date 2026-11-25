import { describe, expect, it } from 'vitest';
import { rungEmphasis } from '../src/rungs';

describe('rung emphasis', () => {
    it('mutes kinds and edges outside the landmark without removing them', () => {
        const cosmos = rungEmphasis('cosmos');
        expect(cosmos.mutedNode('conversation')).toBe(false);
        expect(cosmos.mutedNode('message')).toBe(true);
        expect(cosmos.mutedEdge('owns')).toBe(false);
        expect(cosmos.mutedEdge('orders')).toBe(true);
        const passage = rungEmphasis('passage');
        expect(passage.mutedNode('message')).toBe(false);
        expect(passage.mutedNode('conversation')).toBe(true);
        expect(passage.mutedEdge('orders')).toBe(false);
    });

    it('leaves the fold untouched where a rung declares no sets', () => {
        for (const rung of ['fact', 'grain'] as const) {
            const emphasis = rungEmphasis(rung);
            expect(emphasis.mutedNode('artifact')).toBe(false);
            expect(emphasis.mutedEdge('sleeps-on')).toBe(false);
        }
    });
});
