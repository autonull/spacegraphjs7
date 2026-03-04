import { Graph } from './core/Graph';
import { Renderer } from './core/Renderer';
import { PluginManager } from './core/PluginManager';
import { CameraControls } from './core/CameraControls';
import { EventManager } from './core/EventManager';
import { VisionManager } from './core/VisionManager';
import { UnifiedDisposalSystem } from './core/UnifiedDisposalSystem';
import { ObjectPoolManager } from './core/ObjectPoolManager';
import { CullingManager } from './core/CullingManager';
import { AdvancedRenderingOptimizer } from './core/AdvancedRenderingOptimizer';
import type { GraphSpec, SpaceGraphOptions, SpecUpdate } from './types';
export declare class SpaceGraph {
    container: HTMLElement;
    renderer: Renderer;
    graph: Graph;
    pluginManager: PluginManager;
    cameraControls: CameraControls;
    events: EventManager;
    vision: VisionManager;
    disposalSystem: UnifiedDisposalSystem;
    poolManager: ObjectPoolManager<any>;
    cullingManager: CullingManager;
    optimizer: AdvancedRenderingOptimizer;
    private animationFrameId?;
    private lastTimestamp;
    constructor(container: HTMLElement, options?: SpaceGraphOptions);
    static create(container: string | HTMLElement, spec: GraphSpec): SpaceGraph;
    init(): Promise<void>;
    loadSpec(spec: GraphSpec): void;
    update(spec: SpecUpdate): void;
    fitView(padding?: number, duration?: number): void;
    animate(timestamp?: number): void;
    render(): void;
    dispose(): void;
    private static checkWebGL;
    /**
     * Initializes a SpaceGraph instance and loads graph spec from a URL representing JSON.
     */
    static fromURL(
        url: string,
        container: HTMLElement,
        options?: SpaceGraphOptions,
    ): Promise<SpaceGraph>;
}
