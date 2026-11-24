import { describe, expect, it } from 'vitest';
import { attentionFor, attentionWeights, createScaleDomain, sampleForRung } from '../src/attention';

const domain = createScaleDomain();
const node = (kind: string, data?: Readonly<Record<string, unknown>>) => ({
    id: `n:${kind}`, kind, data,
});

describe('continuous attention field', () => {
    it('grades a landmark without filtering committed nodes', () => {
        const cosmos = sampleForRung(domain, 'cosmos');
        const grain = sampleForRung(domain, 'grain');
        expect(attentionFor(node('conversation'), cosmos)).toBeGreaterThan(attentionFor(node('conversation'), grain));
        expect(attentionFor(node('artifact'), sampleForRung(domain, 'passage'))).toBeGreaterThan(
            attentionFor(node('artifact'), cosmos),
        );
        const nodes = [node('conversation'), node('message'), node('artifact')];
        expect(attentionWeights(nodes, cosmos).size).toBe(3);
    });

    it('keeps focus at full attention and every weight inside [0, 1]', () => {
        const sample = sampleForRung(domain, 'fact');
        const nodes = ['conversation', 'message', 'task', 'artifact', 'config'].map((kind) => node(kind));
        for (const weight of attentionWeights(nodes, sample).values()) {
            expect(weight).toBeGreaterThanOrEqual(0);
            expect(weight).toBeLessThanOrEqual(1);
        }
        expect(attentionFor(nodes[1]!, sample, nodes[1]!.id)).toBe(1);
    });
});
