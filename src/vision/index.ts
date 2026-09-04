// SpaceGraphJS - Vision Module Exports
// VisionManager exported from core/VisionManager and core/index.ts
// Use: import { VisionManager } from '../core/VisionManager';

export { ErgonomicsAnalyzer } from './analyzers/ErgonomicsAnalyzer';
export { HierarchyAnalyzer } from './analyzers/HierarchyAnalyzer';
export { LegibilityAnalyzer } from './analyzers/LegibilityAnalyzer';
export { OverlapAnalyzer } from './analyzers/OverlapAnalyzer';
export type { HeuristicsConfig } from './strategies/HeuristicsStrategy';
export { HeuristicsStrategy } from './strategies/HeuristicsStrategy';
export type {
  ContrastFailure,
  ErgonomicsResult,
  HierarchyResult,
  LegibilityResult,
  Overlap,
  OverlapResult,
  TargetIssue,
  VisionBenchmark,
  VisionBenchmarkResult,
  VisionContext,
  VisionIssue,
  VisionOptions,
  VisionReport,
  VisionScore,
  VisionStrategy,
} from './types';
export { VisionAutoFixer, type VisionCategory } from './VisionAutoFixer';
export { type ModelLoadResult, VisionModelLoader } from './VisionModelLoader';
export { VisionSystem } from './VisionSystem';
