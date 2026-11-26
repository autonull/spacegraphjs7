import { describe, expect, it } from 'vitest';
import { EventEmitter } from '../src/core/EventEmitter';
import { VisionManager } from '../src/core/VisionManager';
import type { VisionReport } from '../src/vision/types';
const report = { overall: { score: 42 }, overlap: { overlapCount: 3 } } as VisionReport;
function manager(analyze: () => Promise<VisionReport>) {
    const vision = Object.create(VisionManager.prototype) as VisionManager;
    let fixes = 0;
    Object.assign(vision, {
        sg: { graph: {}, renderer: { camera: {} }, events: new EventEmitter() },
        visionSystem: { analyze },
        autoFixer: {
            autoFix: async () => {
                fixes += 1;
            },
        },
    });
    return { vision, fixes: () => fixes };
}
describe('VisionManager.analyzeVision', () => {
    it('reports without mutating the graph', async () => {
        const { vision, fixes } = manager(async () => report);
        expect(await vision.analyzeVision()).toBe(report);
        expect(fixes()).toBe(0);
    });
    it('clears the in-progress flag after a failed analysis', async () => {
        const { vision } = manager(async () => {
            throw new Error('analyzer failed');
        });
        await expect(vision.analyzeVision()).rejects.toThrow('analyzer failed');
        await expect(vision.analyzeVision()).rejects.toThrow('analyzer failed');
    });
});
