import { Page, expect } from '@playwright/test';
import { VisionReport } from './analyzer';

/**
 * Utility class for asserting visual invariants of a SpaceGraph instance
 * running within a Playwright page.
 */
export class VisionAssert {
    constructor(private page: Page) { }

    /**
     * Executes the vision pipeline on the current page to retrieve the report.
     */
    private async getReport(): Promise<VisionReport> {
        // We inject a function that calls the existing vision manager instances
        // attached to any SpaceGraph instances in the DOM.
        const report = await this.page.evaluate(async () => {
            // @ts-expect-error - Global object attached during tests
            if (!window.__SPACEGRAPH_INSTANCES__) {
                return { layoutScore: 0, legibilityScore: 0, issues: [] };
            }
            // @ts-expect-error - Global object attached during tests
            const instances = Array.from(window.__SPACEGRAPH_INSTANCES__);
            if (instances.length === 0) {
                return { layoutScore: 0, legibilityScore: 0, issues: [] };
            }

            const sg = instances[0] as any;
            if (!sg.vision) {
                throw new Error("VisionManager not found on SpaceGraph instance.");
            }

            // Turn off autonomous mode for the test so we can do a single frame analysis
            sg.vision.stopAutonomousCorrection();

            // Grab the real heuristics + ONNX validated report from the library Engine
            const report = await sg.vision.analyzeVision();

            const localIssues: any[] = [];

            localIssues.push(
                ...report.overlap.overlaps.map((o: any) => ({
                    type: 'overlap',
                    severity: 'warning',
                    nodeA: o.nodeA,
                    nodeB: o.nodeB,
                    message: `Bounding box overlap detected between nodes ${o.nodeA} and ${o.nodeB}.`,
                }))
            );

            localIssues.push(...report.legibility.failures);

            return {
                layoutScore: report.layoutScore ?? 100,
                legibilityScore: report.legibilityScore ?? 100,
                issues: localIssues
            };
        });

        return report as VisionReport;
    }

    /**
     * Asserts that no overlapping nodes exist in the visual output.
     */
    async noOverlap() {
        const report = await this.getReport();
        const overlaps = report.issues.filter((i) => i.type === 'overlap');
        expect(overlaps, `Expected no overlaps, but found ${overlaps.length}`).toHaveLength(0);
    }

    /**
     * Asserts that all text meets legibility and WCAG AA contrast standards.
     */
    async isLegible() {
        const report = await this.getReport();
        const badText = report.issues.filter((i) => i.type === 'legibility');
        expect(badText, `Expected all text to be legible, found ${badText.length} issues.`).toHaveLength(0);
    }

    /**
     * Asserts that the layout score meets a minimum threshold.
     * @param minScore 0-100 threshold
     */
    async expectedLayoutScore(minScore: number) {
        const report = await this.getReport();
        expect(report.layoutScore, `Expected layout score >= ${minScore}, got ${report.layoutScore}`).toBeGreaterThanOrEqual(minScore);
    }
}

/**
 * Factory function to wrap a Playwright page with Vision assertions.
 */
export function createVisionAssert(page: Page) {
    return new VisionAssert(page);
}
