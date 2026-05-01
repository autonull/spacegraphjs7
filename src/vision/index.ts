// SpaceGraphJS - Vision Module Exports
// VisionManager exported from core/VisionManager and core/index.ts
// Use: import { VisionManager } from '../core/VisionManager';

export { VisionSystem } from './VisionSystem';
export { VisionAutoFixer, type VisionCategory } from './VisionAutoFixer';
export { VisionModelLoader, type ModelLoadResult } from './VisionModelLoader';

export { HeuristicsStrategy } from './strategies/HeuristicsStrategy';
export type { HeuristicsConfig } from './strategies/HeuristicsStrategy';

export { LegibilityAnalyzer } from './analyzers/LegibilityAnalyzer';
export { OverlapAnalyzer } from './analyzers/OverlapAnalyzer';
export { HierarchyAnalyzer } from './analyzers/HierarchyAnalyzer';
export { ErgonomicsAnalyzer } from './analyzers/ErgonomicsAnalyzer';

export type {
    VisionReport,
    VisionScore,
    VisionIssue,
    LegibilityResult,
    ContrastFailure,
    OverlapResult,
    Overlap,
    HierarchyResult,
    ErgonomicsResult,
    TargetIssue,
    VisionContext,
    VisionStrategy,
    VisionOptions,
    VisionBenchmark,
    VisionBenchmarkResult,
} from './types';
