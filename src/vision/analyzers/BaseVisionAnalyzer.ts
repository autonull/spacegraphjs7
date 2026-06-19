import type { VisionContext } from '../types';
import type { HeuristicsConfig } from '../strategies/HeuristicsStrategy';

export interface VisionAnalyzerResult {
    score?: number;
}

export abstract class BaseVisionAnalyzer {
    abstract id: string;
    abstract name: string;

    abstract analyze(context: VisionContext, config: HeuristicsConfig): Promise<VisionAnalyzerResult>;

    protected getNodes(context: VisionContext): Array<{ id: string; object?: unknown; position?: unknown }> {
        return context.nodes as Array<{ id: string; object?: unknown; position?: unknown }>;
    }
}