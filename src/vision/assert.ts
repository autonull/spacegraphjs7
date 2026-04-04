import { Page, expect } from '@playwright/test';
import type { VisionReport } from './types';

export class VisionAssert {
    constructor(private page: Page) {}

    private async getReport(): Promise<VisionReport> {
        const report = await this.page.evaluate(async () => {
            if (!window.SpaceGraph || !window.SpaceGraph.instances) {
                return {
                    legibility: { wcagAA: false, averageContrast: 0, failures: [] },
                    overlap: { hasOverlaps: false, overlapCount: 0, overlaps: [] },
                    hierarchy: { hasRoot: false, rootIds: [], depth: 0, levels: [], score: 0 },
                    ergonomics: {
                        fittsLawCompliant: false,
                        averageTargetSize: 0,
                        smallTargets: [],
                        score: 0,
                    },
                    overall: { score: 0, grade: 'F' as const, issues: [] },
                };
            }
            const instances = Array.from(window.SpaceGraph.instances);
            if (instances.length === 0) {
                return {
                    legibility: { wcagAA: false, averageContrast: 0, failures: [] },
                    overlap: { hasOverlaps: false, overlapCount: 0, overlaps: [] },
                    hierarchy: { hasRoot: false, rootIds: [], depth: 0, levels: [], score: 0 },
                    ergonomics: {
                        fittsLawCompliant: false,
                        averageTargetSize: 0,
                        smallTargets: [],
                        score: 0,
                    },
                    overall: { score: 0, grade: 'F' as const, issues: [] },
                };
            }

            const sg = instances[0] as unknown as {
                vision: {
                    stopAutonomousCorrection: () => void;
                    modelsLoaded: boolean;
                    analyzeVision: () => Promise<import('./types').VisionReport>;
                };
            };
            if (!sg.vision) {
                throw new Error('VisionManager not found on SpaceGraph instance.');
            }

            sg.vision.stopAutonomousCorrection();

            if (!sg.vision.modelsLoaded) {
                await new Promise<void>((resolve) => {
                    const check = setInterval(() => {
                        if (sg.vision.modelsLoaded) {
                            clearInterval(check);
                            resolve();
                        }
                    }, 100);
                });
            }

            return await sg.vision.analyzeVision();
        });

        return report;
    }

    async noOverlap() {
        const report = await this.getReport();
        expect(
            report.overlap.overlaps,
            `Expected no overlaps, but found ${report.overlap.overlapCount}`,
        ).toHaveLength(0);
    }

    async isLegible() {
        const report = await this.getReport();
        expect(
            report.legibility.failures,
            `Expected all text to be legible, found ${report.legibility.failures.length} issues.`,
        ).toHaveLength(0);
    }

    async expectedLayoutScore(minScore: number) {
        const report = await this.getReport();
        expect(
            report.overall.score,
            `Expected overall score >= ${minScore}, got ${report.overall.score}`,
        ).toBeGreaterThanOrEqual(minScore);
    }
}

export function createVisionAssert(page: Page) {
    return new VisionAssert(page);
}
