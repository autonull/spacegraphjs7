import { runVisionAnalysis } from './analyzer';

export const visionAssert = {
    noOverlap: async (outputDir: string) => {
        const report = await runVisionAnalysis(outputDir);
        if (report.overlap.overlaps.length > 0) {
            throw new Error(
                `Vision Assertion Failed: Expected no overlaps, but found ${report.overlap.overlapCount}. Details: ${report.overlap.overlaps.map((o) => `${o.nodeA} <-> ${o.nodeB}`).join(', ')}`,
            );
        }
    },

    allTextLegible: async (outputDir: string) => {
        const report = await runVisionAnalysis(outputDir);
        if (report.legibility.failures.length > 0) {
            throw new Error(
                `Vision Assertion Failed: Expected all text to be legible, but found ${report.legibility.failures.length} issues. Details: ${report.legibility.failures.map((f) => `${f.nodeId} (contrast: ${f.contrast})`).join(', ')}`,
            );
        }
    },

    wcagCompliance: async (outputDir: string, level: 'A' | 'AA' | 'AAA' = 'AA') => {
        const report = await runVisionAnalysis(outputDir);
        const contrastFailures = report.legibility.failures.filter((f) => f.severity === 'error');
        if (contrastFailures.length > 0) {
            throw new Error(
                `Vision Assertion Failed: Expected WCAG ${level} compliance, but found ${contrastFailures.length} contrast failures. Details: ${contrastFailures.map((f) => `${f.nodeId} (contrast: ${f.contrast})`).join(', ')}`,
            );
        }
    },
};
