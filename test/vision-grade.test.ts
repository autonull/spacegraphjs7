// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { gradeFor } from '../src/vision/grade';

describe('gradeFor', () => {
    it.each([
        [100, 'A'],
        [90, 'A'],
        [89.9, 'B'],
        [80, 'B'],
        [70, 'C'],
        [60, 'D'],
        [59.9, 'F'],
        [0, 'F'],
        [-1, 'F'],
    ])('maps %s to %s', (score, grade) => {
        expect(gradeFor(score)).toBe(grade);
    });
});
