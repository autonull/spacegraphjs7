import type { SpaceGraph } from '../SpaceGraph';
export interface VisionCategory {
    type: 'layout' | 'legibility' | 'color' | 'overlap' | 'hierarchy' | 'ergonomics';
}
export interface VisionReport {
    layout: {
        overall: number;
        issues: any[];
    };
    legibility: {
        wcagCompliance: {
            AA: boolean;
        };
        failures: any[];
    };
    color: {
        harmonyScore: number;
        dominantPalette: string[];
    };
    overlap: {
        overlaps: any[];
        statistics: {
            totalOverlaps: number;
        };
    };
    hierarchy: {
        clarityScore: number;
    };
    ergonomics: {
        fittsLawScore: number;
    };
    overall: number;
}
export declare class VisionManager {
    private sg;
    private isAnalyzing;
    private autonomousTimer;
    private spatialIndex;
    constructor(sg: SpaceGraph);
    private sessions;
    loadModels(modelPaths: Record<string, string>): Promise<void>;
    analyzeVision(): Promise<VisionReport>;
    autoFix(category: VisionCategory, report?: VisionReport): Promise<void>;
    /**
     * The Vision-Closed loop: periodically analyzes the view and triggers
     * plugins to correct aesthetic/layout issues autonomously.
     */
    startAutonomousCorrection(intervalMs?: number): void;
    stopAutonomousCorrection(): void;
}
