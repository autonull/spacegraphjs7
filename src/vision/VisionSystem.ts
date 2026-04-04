// SpaceGraphJS - Vision System
// Strategy pattern for vision analysis with heuristics and ONNX support

import type { VisionStrategy, VisionReport, VisionOptions, VisionBenchmark } from './types';
import { HeuristicsStrategy } from './strategies/HeuristicsStrategy';

/**
 * Vision System
 * Uses strategy pattern to support multiple analysis approaches
 */
export class VisionSystem {
    private strategies: Map<string, VisionStrategy>;
    private currentStrategy: VisionStrategy;
    private options: VisionOptions;

    constructor(options: VisionOptions = {}) {
        this.options = options;
        this.strategies = new Map();

        // Register built-in strategies
        const heuristics = new HeuristicsStrategy(options.heuristics);
        this.strategies.set('heuristics', heuristics);

        // ONNX strategy would be registered here if models are available
        // this.strategies.set('onnx', new OnnxStrategy(options.models));
        // this.strategies.set('hybrid', new HybridStrategy(heuristics, onnx));

        // Set default strategy
        const strategyName = options.strategy ?? 'heuristics';
        const strategy = this.strategies.get(strategyName);

        if (!strategy) {
            const available = Array.from(this.strategies.keys()).join(', ');
            throw new Error(`Unknown vision strategy: ${strategyName}. Available: ${available}`);
        }

        this.currentStrategy = strategy;
    }

    /**
     * Set the vision strategy
     */
    setStrategy(name: string): void {
        const strategy = this.strategies.get(name);
        if (!strategy) {
            const available = Array.from(this.strategies.keys()).join(', ');
            throw new Error(`Unknown vision strategy: ${name}. Available: ${available}`);
        }
        this.currentStrategy = strategy;
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

        // Compute accuracy (simplified - would need ground truth for real accuracy)
        const benchmark: VisionBenchmark = {
            heuristics: {
                duration: results['heuristics']?.duration ?? 0,
                report: results['heuristics']?.report ?? ({} as VisionReport),
                accuracy: this.computeAccuracy(results['heuristics']?.report),
            },
        };

        if (results['onnx']) {
            benchmark.onnx = {
                duration: results['onnx'].duration,
                report: results['onnx'].report,
                accuracy: this.computeAccuracy(results['onnx'].report),
            };
        }

        if (results['hybrid']) {
            benchmark.hybrid = {
                duration: results['hybrid'].duration,
                report: results['hybrid'].report,
                accuracy: this.computeAccuracy(results['hybrid'].report),
            };
        }

        return benchmark;
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

    /**
     * Get available strategies
     */
    getAvailableStrategies(): string[] {
        return Array.from(this.strategies.keys());
    }
}
