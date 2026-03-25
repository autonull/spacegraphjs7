// SpaceGraphJS v7.0 - Vision System Types

/**
 * Vision report containing analysis results
 */
export interface VisionReport {
  legibility: LegibilityResult;
  overlap: OverlapResult;
  hierarchy: HierarchyResult;
  ergonomics: ErgonomicsResult;
  overall: VisionScore;
}

/**
 * Overall vision score
 */
export interface VisionScore {
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  issues: VisionIssue[];
}

/**
 * Vision issue detected
 */
export interface VisionIssue {
  severity: 'error' | 'warning' | 'info';
  category: 'legibility' | 'overlap' | 'hierarchy' | 'ergonomics';
  message: string;
  nodeIds?: string[];
}

/**
 * Legibility analysis result
 */
export interface LegibilityResult {
  wcagAA: boolean;
  averageContrast: number;
  failures: ContrastFailure[];
}

/**
 * Contrast failure
 */
export interface ContrastFailure {
  nodeId: string;
  contrast: number;
  severity: 'error' | 'warning';
}

/**
 * Overlap analysis result
 */
export interface OverlapResult {
  hasOverlaps: boolean;
  overlapCount: number;
  overlaps: Overlap[];
}

/**
 * Overlapping node pair
 */
export interface Overlap {
  nodeA: string;
  nodeB: string;
  penetration: number;
}

/**
 * Hierarchy analysis result
 */
export interface HierarchyResult {
  hasRoot: boolean;
  rootIds: string[];
  depth: number;
  levels: string[][];
  score: number;
}

/**
 * Ergonomics analysis result
 */
export interface ErgonomicsResult {
  fittsLawCompliant: boolean;
  averageTargetSize: number;
  smallTargets: TargetIssue[];
  score: number;
}

/**
 * Target size issue
 */
export interface TargetIssue {
  nodeId: string;
  size: number;
  recommended: number;
}

/**
 * Vision context for analyzers
 */
export interface VisionContext {
  graph: unknown;
  camera: unknown;
  nodes: unknown[];
}

/**
 * Vision strategy interface
 */
export interface VisionStrategy {
  readonly id: string;
  readonly name: string;

  analyze(graph: unknown, camera: unknown): Promise<VisionReport>;
}

/**
 * Vision system options
 */
export interface VisionOptions {
  strategy?: 'heuristics' | 'onnx' | 'hybrid';

  heuristics?: {
    wcagThreshold?: number;
    overlapPadding?: number;
    fittsLawTargetSize?: number;
  };

  onnx?: {
    executionProviders?: string[];
    confidenceThreshold?: number;
  };
}

/**
 * Vision benchmark result
 */
export interface VisionBenchmark {
  heuristics: VisionBenchmarkResult;
  onnx?: VisionBenchmarkResult;
  hybrid?: VisionBenchmarkResult;
}

export interface VisionBenchmarkResult {
  duration: number;
  accuracy: number;
  report: VisionReport;
}
