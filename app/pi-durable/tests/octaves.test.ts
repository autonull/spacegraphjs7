import { describe, expect, it } from 'vitest';
import { createScaleDomain, sampleForRung } from '../src/attention';
import { edgeStyleForKind, isCommittedEdgeKind } from '../src/edge-style';
import { bandForOctave, clampOctave, octaveFor, sizeForOctave } from '../src/octaves';

const domain = createScaleDomain();
const node = (kind: string, role?: string, data?: Readonly<Record<string, unknown>>) => ({
    id: `n:${kind}`, kind, role, data,
});

describe('octave ladder', () => {
    it('doubles rendered size at every whole octave', () => {
        for (let octave = 0; octave < 6; octave++) {
            expect(sizeForOctave(octave + 1)[0]).toBe(sizeForOctave(octave)[0] * 2);
        }
        expect(sizeForOctave(3)[0]).toBe(64);
    });

    it('clamps to the legibility floor and ceiling', () => {
        expect(sizeForOctave(-4)).toEqual([8, 8]);
        expect(sizeForOctave(12)).toEqual([512, 230]);
        expect(clampOctave(-1)).toBe(0);
        expect(clampOctave(9)).toBe(6);
    });

    it('moves size monotonically with the attention sample', () => {
        const conversation = node('conversation');
        const artifact = node('artifact');
        const grain = sampleForRung(domain, 'grain');
        const cosmos = sampleForRung(domain, 'cosmos');
        expect(octaveFor(conversation, cosmos)).toBeGreaterThan(octaveFor(conversation, grain));
        expect(octaveFor(artifact, cosmos)).toBeGreaterThan(octaveFor(artifact, grain));
    });

    it('raises a focused low-band node to the card band without changing its id', () => {
        const deferred = node('artifact', undefined, { deferred: true });
        const grain = sampleForRung(domain, 'grain');
        expect(octaveFor(deferred, grain, deferred.id)).toBeGreaterThanOrEqual(3);
        expect(deferred.id).toBe('n:artifact');
    });

    it('maps octaves to five stable template bands', () => {
        expect([0, 1, 2, 3, 4, 6].map(bandForOctave)).toEqual([
            'dot', 'dot', 'chip', 'card', 'panel', 'monument',
        ]);
    });
});

describe('edge hierarchy', () => {
    it('styles only recorded edge kinds', () => {
        expect(isCommittedEdgeKind('orders')).toBe(true);
        expect(isCommittedEdgeKind('invented')).toBe(false);
        expect(edgeStyleForKind('sleeps-on').style).toBe('dashed');
        expect(edgeStyleForKind('checkpoint').style).toBe('dotted');
        expect(edgeStyleForKind('owns').confidence).toBe('explicit');
        expect(edgeStyleForKind('invented').tone).toBe('muted');
    });
});
