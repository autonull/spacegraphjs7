// Vision types - for the vision analysis system

export type VisionCategory = 'wcag' | 'overlap' | 'fitts' | 'all';

export interface VisionOptions {
  enabled?: boolean;
  categories?: VisionCategory[];
  threshold?: number;
}

export interface VisionReport {
  legibility: import('./vision').LegibilityResult;
  overlap: import('./vision').OverlapResult;
  hierarchy: import('./vision').HierarchyResult;
  ergonomics: import('./vision').ErgonomicsResult;
  overall: VisionScore;
}

export interface VisionScore {
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  issues: VisionIssue[];
}

export interface VisionIssue {
  severity: 'error' | 'warning' | 'info';
  category: 'legibility' | 'overlap' | 'hierarchy' | 'ergonomics';
  message: string;
  nodeIds?: string[];
  targetFile?: string;
}

export interface LegibilityResult {
  wcagAA: boolean;
  averageContrast: number;
  failures: ContrastFailure[];
}

export interface ContrastFailure {
  nodeId: string;
  contrast: number;
  severity: 'error' | 'warning';
}

export interface OverlapResult {
  hasOverlaps: boolean;
  overlapCount: number;
  overlaps: Overlap[];
}

export interface Overlap {
  nodeA: string;
  nodeB: string;
  penetration: number;
}

export interface HierarchyResult {
  hasRoot: boolean;
  rootIds: string[];
  depth: number;
  levels: string[][];
  score: number;
}

export interface ErgonomicsResult {
  fittsLawCompliant: boolean;
  averageTargetSize: number;
  smallTargets: TargetIssue[];
  score: number;
}

export interface TargetIssue {
  nodeId: string;
  size: number;
  recommended: number;
}

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

export interface VisionStrategy {
  readonly id: string;
  readonly name: string;
  analyze(graph: unknown, camera: unknown): Promise<VisionReport>;
}