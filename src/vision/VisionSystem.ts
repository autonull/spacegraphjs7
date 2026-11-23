// SpaceGraphJS - Vision System
// Strategy pattern for vision analysis with heuristics and ONNX support

import { HeuristicsStrategy } from './strategies/HeuristicsStrategy';
import { HybridStrategy } from './strategies/HybridStrategy';
import { OnnxStrategy } from './strategies/OnnxStrategy';
import type { VisionBenchmark, VisionOptions, VisionReport, VisionStrategy } from './types';
import type { VisionModelLoader } from './VisionModelLoader';

/**
 * Vision System
 * Uses strategy pattern to support multiple analysis approaches
 */
export class VisionSystem {
    private strategies: Map<string, VisionStrategy>;
    private currentStrategy: VisionStrategy;

    constructor(options: VisionOptions = {}, modelLoader?: VisionModelLoader) {
        this.strategies = new Map();

        // Register built-in strategies
        const heuristics = new HeuristicsStrategy(options.heuristics);
        this.strategies.set('heuristics', heuristics);

        if (modelLoader) {
            const onnx = new OnnxStrategy(modelLoader);
            const hybrid = new HybridStrategy(heuristics, onnx);
            this.strategies.set('onnx', onnx);
            this.strategies.set('hybrid', hybrid);
        }

        this.currentStrategy = this.requireStrategy(options.strategy ?? 'heuristics');
    }

    private requireStrategy(name: string): VisionStrategy {
        const strategy = this.strategies.get(name);
        if (!strategy) {
            throw new Error(
                `Unknown vision strategy: ${name}. Available: ${this.getAvailableStrategies().join(', ')}`,
            );
        }
        return strategy;
    }

    /**
     * Set the vision strategy
     */
    setStrategy(name: string): void {
        this.currentStrategy = this.requireStrategy(name);
    }

    /**
     * Get current strategy name
     */
    getStrategy(): string {
        return this.currentStrategy.id;
    }

    /**
     * Analyze the graph using current strategy
     */
    async analyze(graph: unknown, camera: unknown): Promise<VisionReport> {
        return this.currentStrategy.analyze(graph, camera);
    }

    /**
     * Benchmark all available strategies
     */
    async benchmark(graph: unknown, camera: unknown): Promise<VisionBenchmark> {
        const results: Record<string, { duration: number; report: VisionReport }> = {};

        for (const [name, strategy] of this.strategies.entries()) {
            const start = performance.now();
            const report = await strategy.analyze(graph, camera);
            const duration = performance.now() - start;

            results[name] = { duration, report };
        }

        return {
            heuristics: this.benchmarkEntry('heuristics', results),
            ...(results['onnx'] && { onnx: this.benchmarkEntry('onnx', results) }),
            ...(results['hybrid'] && { hybrid: this.benchmarkEntry('hybrid', results) }),
        };
    }

    private benchmarkEntry(name: string, results: Record<string, { duration: number; report: VisionReport }>) {
        const result = results[name];
        return {
            duration: result?.duration ?? 0,
            report: result?.report ?? ({} as VisionReport),
            accuracy: this.computeAccuracy(result?.report),
        };
    }

    /**
     * Get available strategies
     */
    getAvailableStrategies(): string[] {
        return Array.from(this.strategies.keys());
    }

    /**
     * Compute accuracy score for a report
     * Measures analysis completeness: how many categories were successfully analyzed
     */
    private computeAccuracy(report?: VisionReport): number {
        if (!report) return 0;

        const categories = ['legibility', 'overlap', 'hierarchy', 'ergonomics'] as const;
        const analyzed = categories.filter((cat) => cat in report).length;
        return analyzed / categories.length;
    }
}
