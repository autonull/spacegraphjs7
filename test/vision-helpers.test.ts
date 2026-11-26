// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { spacegraphVision, visionAssert } from '../src/quality';
import { cleanModel, defectiveModel, heavyModel } from './fixtures/quality';

const clean = cleanModel();
const defective = defectiveModel();
const heavy = heavyModel();

describe('spacegraphVision', () => {
    it('returns a passing graded report for a clean model', () => {
        const report = spacegraphVision(clean);
        expect(report).toMatchObject({ score: 100, minScore: 80, passed: true, grade: 'A' });
        expect(report.issues).toEqual([]);
    });

    it('reports a failing grade instead of throwing below the floor', () => {
        const report = spacegraphVision(defective, { minScore: 80 });
        expect(report.score).toBe(45);
        expect(report.passed).toBe(false);
        expect(report.grade).toBe('F');
        expect(report.issues.map((issue) => issue.code)).toEqual([
            'overlap',
            'missing-label',
            'missing-label',
            'edge-endpoint',
        ]);
    });

    it('does not mutate the model', () => {
        spacegraphVision(defective);
        expect(defective.nodes[0]?.label).toBeUndefined();
        expect(defective.nodes[1]?.position).toEqual([2, 0, 0]);
    });
});

describe('visionAssert', () => {
    it('passes every assertion on a clean model', () => {
        const assertions = visionAssert(clean);
        expect(() => assertions.noOverlap()).not.toThrow();
        expect(() => assertions.noMissingLabels()).not.toThrow();
        expect(() => assertions.noInvalidEdges()).not.toThrow();
        expect(() => assertions.withinDomBudget()).not.toThrow();
        expect(() => assertions.accessible()).not.toThrow();
        expect(() => assertions.meetsFloor()).not.toThrow();
    });

    it('throws for each measured defect with its code and node ids', () => {
        const assertions = visionAssert(defective);
        expect(() => assertions.noOverlap()).toThrow(/visionAssert\.noOverlap failed: overlap\(a\+b\)/);
        expect(() => assertions.noMissingLabels()).toThrow(/visionAssert\.noMissingLabels failed: missing-label\(a\), missing-label\(b\)/);
        expect(() => assertions.noInvalidEdges()).toThrow(/visionAssert\.noInvalidEdges failed: edge-endpoint\(a\+missing\)/);
        expect(() => assertions.meetsFloor(80)).toThrow(/quality floor 80 not met \(score 45\)/);
        expect(() => assertions.withinDomBudget()).not.toThrow();
    });

    it('enforces the DOM budget independently of the floor', () => {
        const assertions = visionAssert(heavy, { maxDomNodes: 2 });
        expect(() => assertions.withinDomBudget()).toThrow(/visionAssert\.withinDomBudget failed: dom-budget/);
        expect(() => assertions.noOverlap()).not.toThrow();
        expect(() => assertions.meetsFloor(50)).not.toThrow();
        expect(() => assertions.meetsFloor(90)).toThrow(/quality floor 90 not met/);
    });
});
