import { expect, type Page } from '@playwright/test';
import type { VisionReport } from './types';

export class VisionAssert {
    constructor(private page: Page) {}

    /** The strategy actually used by the captured scene, for an honest capture record. */
    async strategy(): Promise<string> {
        return this.page.evaluate(() => {
            const instances = Array.from(
                (window as any).SpaceGraph?.instances ?? ([] as unknown[]),
            ) as { vision?: { strategy?: string } }[];
            return instances[0]?.vision?.strategy ?? 'heuristics';
        });
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

    private async getReport(): Promise<VisionReport> {
        const report = await this.page.evaluate(async () => {
            if (!(window as any).SpaceGraph || !(window as any).SpaceGraph.instances) {
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
            const instances = Array.from((window as any).SpaceGraph.instances);
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

            const sg = instances[0] as {
                vision: {
                    stopAutonomousCorrection: () => void;
                    modelsLoaded: boolean;
                    strategy: string;
                    analyzeVision: () => Promise<import('./types').VisionReport>;
                };
            };
            if (!sg.vision) {
                throw new Error('VisionManager not found on SpaceGraph instance.');
            }

            sg.vision.stopAutonomousCorrection();

            // Heuristics needs no ONNX assets. Waiting on `modelsLoaded` there would hang forever and
            // fabricate readiness; only the onnx/hybrid strategies genuinely need a loader wait.
            if (sg.vision.strategy !== 'heuristics' && !sg.vision.modelsLoaded) {
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
}

export function createVisionAssert(page: Page) {
    return new VisionAssert(page);
}
