import { runVisionAnalysis } from './analyzer';

export const visionAssert = {
    noOverlap: async (outputDir: string) => {
        const report = await runVisionAnalysis(outputDir);
        const overlapIssues = report.issues.filter((i) => i.type === 'overlap');
        if (overlapIssues.length > 0) {
            throw new Error(
                `Vision Assertion Failed: Expected no overlaps, but found ${overlapIssues.length}. Details: ${overlapIssues.map((i) => i.message).join(', ')}`,
            );
        }
    },

    allTextLegible: async (outputDir: string) => {
        const report = await runVisionAnalysis(outputDir);
        const legibilityIssues = report.issues.filter((i) => i.type === 'legibility');
        if (legibilityIssues.length > 0) {
            throw new Error(
                `Vision Assertion Failed: Expected all text to be legible, but found ${legibilityIssues.length} issues. Details: ${legibilityIssues.map((i) => i.message).join(', ')}`,
            );
        }
    },

    wcagCompliance: async (outputDir: string, level: 'A' | 'AA' | 'AAA' = 'AA') => {
        const report = await runVisionAnalysis(outputDir);
        const colorIssues = report.issues.filter((i) => i.type === 'color');
        if (colorIssues.length > 0) {
            throw new Error(
                `Vision Assertion Failed: Expected WCAG ${level} compliance, but found ${colorIssues.length} color/contrast issues. Details: ${colorIssues.map((i) => i.message).join(', ')}`,
            );
        }
    },
};
