export type VisionGrade = 'A' | 'B' | 'C' | 'D' | 'F';

const GRADE_THRESHOLDS: ReadonlyArray<readonly [number, VisionGrade]> = [
    [90, 'A'],
    [80, 'B'],
    [70, 'C'],
    [60, 'D'],
    [0, 'F'],
];

export function gradeFor(score: number): VisionGrade {
    return GRADE_THRESHOLDS.find(([min]) => score >= min)?.[1] ?? 'F';
}
