// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { checkQuality, correctQuality, type QualityModel } from '../src/quality';

const model: QualityModel = {
    nodes: [
        { id: 'a', position: [0, 0, 0] },
        { id: 'b', position: [2, 0, 0] },
    ],
    edges: [{ id: 'e', source: 'a', target: 'missing' }],
};

describe('checkQuality', () => {
    it('reports measured defects without changing the model', () => {
        const report = checkQuality(model);
        expect(report.issues.map((issue) => issue.code)).toEqual([
            'overlap',
            'missing-label',
            'missing-label',
            'edge-endpoint',
        ]);
        expect(report.score).toBe(45);
        expect(model.nodes[0]?.label).toBeUndefined();
    });

    it('fails the requested floor rather than reporting a pass', () => {
        expect(() => checkQuality(model, { minScore: 80 })).toThrow(/quality floor 80 not met/);
        expect(() => checkQuality({ nodes: [{ id: 'a', label: 'A', position: [0, 0, 0] }] }, { minScore: 80 })).not.toThrow();
    });

    it('reports DOM budget and preferences as non-auto-fixable', () => {
        const report = checkQuality(
            { nodes: Array.from({ length: 3 }, (_, index) => ({ id: `h${index}`, label: 'H', position: [index * 100, 0, 0] as const, data: { html: '<b>x</b>' } })) },
            { maxDomNodes: 2, preferences: ['aurora palette'] },
        );
        expect(report.budgets).toEqual({ domNodes: 3, maxDomNodes: 2 });
        expect(report.issues.filter((issue) => issue.autofix)).toEqual([]);
        expect(report.issues.some((issue) => issue.code === 'preference')).toBe(true);
    });
});

describe('correctQuality', () => {
    it('applies only re-verified fixes and leaves preferences alone', () => {
        const outcome = correctQuality(model, { maxEdits: 4, preferences: ['aurora palette'] });
        expect(outcome.before.score).toBeLessThan(outcome.after.score);
        expect(outcome.applied.some((edit) => edit.startsWith('overlap'))).toBe(true);
        expect(outcome.model.nodes.map((node) => node.label)).toEqual(['a', 'b']);
        expect(model.nodes[0]?.position).toEqual([0, 0, 0]);
        expect(outcome.after.issues.some((issue) => issue.code === 'preference')).toBe(true);
        expect(outcome.after.issues.some((issue) => issue.code === 'edge-endpoint')).toBe(true);
        expect(outcome.applied).not.toContain('preference:');
    });

    it('is bounded by maxEdits', () => {
        const crowded: QualityModel = {
            nodes: Array.from({ length: 3 }, (_, index) => ({ id: `n${index}`, position: [0, 0, 0] as const })),
        };
        const outcome = correctQuality(crowded, { maxEdits: 1 });
        expect(outcome.applied.length).toBeLessThanOrEqual(1);
        expect(outcome.after.score).toBeGreaterThan(outcome.before.score);
    });
});
