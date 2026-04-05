import type { SpaceGraph } from '../SpaceGraph';
import { VisionModelLoader } from '../vision/VisionModelLoader';
import { VisionAutoFixer, type VisionCategory } from '../vision/VisionAutoFixer';
import { VisionSystem } from '../vision/VisionSystem';
import type { VisionReport } from '../vision/types';
import { createLogger } from '../utils/logger';

const logger = createLogger('VisionManager');

const DEFAULT_WASM_PATHS = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';

export class VisionManager {
    private readonly sg: SpaceGraph;
    private readonly modelLoader: VisionModelLoader;
    private readonly autoFixer: VisionAutoFixer;
    private readonly visionSystem: VisionSystem;
    private isAnalyzing = false;
    private autonomousTimer: ReturnType<typeof setInterval> | null = null;

    constructor(sg: SpaceGraph) {
        this.sg = sg;
        const providers = sg.options?.onnxExecutionProviders ?? ['wasm'];
        if (
            typeof process !== 'undefined' &&
            process.arch === 'arm64' &&
            !providers.includes('rknn')
        ) {
            providers.unshift('rknn');
        }
        this.modelLoader = new VisionModelLoader(providers);
        this.autoFixer = new VisionAutoFixer(sg);
        this.visionSystem = new VisionSystem(sg.options?.vision);
    }

    public get modelsLoaded(): boolean {
        return this.modelLoader.isLoaded;
    }

    public get strategy(): string {
        return this.visionSystem.getStrategy();
    }

    public async loadModels(modelPaths: Record<string, string>): Promise<void> {
        VisionModelLoader.configureWasmPaths(
            this.sg.options?.vision?.wasmPaths ?? DEFAULT_WASM_PATHS,
        );
        const results = await this.modelLoader.loadModels(modelPaths);
        const failed = results.filter((r) => !r.success);
        if (failed.length > 0) {
            logger.warn('Failed to load %d/%d ONNX models', failed.length, results.length);
        } else {
            logger.info('ONNX models loaded: %s', this.modelLoader.getAvailableModels().join(', '));
        }
    }

    public async analyzeVision(): Promise<VisionReport> {
        if (this.isAnalyzing) {
            throw new Error('[VisionManager] Analysis already in progress.');
        }

        this.isAnalyzing = true;
        logger.info('Starting vision analysis...');

        const report = await this.visionSystem.analyze(this.sg.graph, this.sg.renderer.camera);

        logger.info('Analysis complete. Overall Score: %d', report.overall.score);

        if (report.overall.score < 90) {
            logger.warn('Quality below threshold, triggering autonomous fix...');
            const categories: VisionCategory[] = [
                report.overlap.hasOverlaps && { type: 'overlap' },
                report.legibility.failures.length > 0 && { type: 'legibility' },
                report.hierarchy.score < 60 && { type: 'hierarchy' },
                report.ergonomics.score < 60 && { type: 'ergonomics' },
            ].filter(Boolean) as VisionCategory[];

            for (const category of categories) {
                await this.autoFix(category, report);
            }
        }

        this.isAnalyzing = false;
        return report;
    }

    public async autoFix(category: VisionCategory, report?: VisionReport): Promise<void> {
        await this.autoFixer.autoFix(category, report);
    }

    public startAutonomousCorrection(intervalMs = 30000): void {
        if (this.autonomousTimer) {
            this.stopAutonomousCorrection();
        }

        logger.info('Starting autonomous correction loop (interval: %dms)', intervalMs);

        this.autonomousTimer = setInterval(async () => {
            try {
                const report = await this.analyzeVision();
                if (report.overlap.hasOverlaps) {
                    await this.autoFixer.autoFix({ type: 'layout' }, report);
                }
            } catch (err) {
                logger.error('Autonomous loop error:', err);
            }
        }, intervalMs);
    }

    public async applyAutonomousFixes(report: VisionReport): Promise<void> {
        logger.info('Applying manual autonomous fixes from report...');
        if (report.overall.score < 80) await this.autoFix({ type: 'layout' }, report);
        if (report.overlap.overlapCount > 0) await this.autoFix({ type: 'overlap' }, report);
        if (report.legibility.failures?.length > 0)
            await this.autoFix({ type: 'legibility' }, report);
        logger.info('Autonomous fixes dispatched.');
    }

    public stopAutonomousCorrection(): void {
        if (this.autonomousTimer) {
            clearInterval(this.autonomousTimer);
            this.autonomousTimer = null;
            logger.info('Stopped autonomous correction loop');
        }
    }

    /** @deprecated Use `startAutonomousCorrection` instead. */
    public startAutonomousAnalysis(intervalMs = 30000): void {
        this.startAutonomousCorrection(intervalMs);
    }

    /** @deprecated Use `stopAutonomousCorrection` instead. */
    public stopAutonomousAnalysis(): void {
        this.stopAutonomousCorrection();
    }
}
