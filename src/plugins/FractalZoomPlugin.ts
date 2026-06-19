import type { SpaceGraph } from '../SpaceGraph';
import type { Plugin } from '../core/PluginManager';
import type { Graph } from '../core/Graph';
import type { EventSystem } from '../core/events/EventSystem';
import { createLogger } from '../utils/logger';

const logger = createLogger('FractalZoom');

export interface ZoomLevel {
    level: number;
    minDistance: number;
    maxDistance: number;
    detailThreshold: number;
    label: string;
    semanticImportance?: number;
}

export interface FractalZoomConfig {
    levels: ZoomLevel[];
    transitionDuration: number;
    transitionEase: string;
    enableSmoothTransitions: boolean;
    onZoomIn?: (level: number) => void;
    onZoomOut?: (level: number) => void;
    onLevelChange?: (from: number, to: number) => void;
}

const DEFAULT_CONFIG: FractalZoomConfig = {
    levels: [
        {
            level: 0,
            minDistance: 2000,
            maxDistance: 10000,
            detailThreshold: 0.1,
            label: 'Overview',
        },
        { level: 1, minDistance: 500, maxDistance: 2000, detailThreshold: 0.3, label: 'Cluster' },
        { level: 2, minDistance: 200, maxDistance: 500, detailThreshold: 0.5, label: 'Detail' },
        { level: 3, minDistance: 50, maxDistance: 200, detailThreshold: 0.7, label: 'Micro' },
        { level: 4, minDistance: 10, maxDistance: 50, detailThreshold: 0.9, label: 'Nano' },
    ],
    transitionDuration: 0.5,
    transitionEase: 'power2.out',
    enableSmoothTransitions: true,
};

export class FractalZoomPlugin implements Plugin {
    readonly id = 'fractal-zoom';
    readonly name = 'Fractal Zoom';
    readonly version = '1.0.0';

    private sg!: SpaceGraph;
    private config: FractalZoomConfig;
    private currentLevel: number = 0;
    private targetLevel: number = 0;
    private isTransitioning: boolean = false;
    private transitionProgress: number = 0;
    private lastDistance: number = 0;
    private scrollAccumulator: number = 0;
    private focusedNodeId: string | null = null;
    private readonly SCROLL_THRESHOLD = 0.5;

    get currentZoomLevel(): number {
        return this.currentLevel;
    }

    get currentZoomLabel(): string {
        return this.config.levels[this.currentLevel]?.label || 'Unknown';
    }

    constructor(config: Partial<FractalZoomConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    init(sg: SpaceGraph, _graph: Graph, _events: EventSystem): void {
        this.sg = sg;
        this.lastDistance = this.getCameraDistance();
        this.updateLevel(0);

        // Listen to camera movement
        this.sg.events.on('camera:move', () => this.checkZoomLevel());
        this.sg.events.on('camera:fly:progress', (p: number) => {
            this.transitionProgress = p;
            this.sg.events.emit('fractal:transition-progress', p);
        });

        // Listen to wheel events for fractal zoom
        this.sg.events.on('input:interaction:wheel', (e: any) => this.handleWheel(e));

        // Listen to node clicks for semantic focus
        this.sg.events.on('node:click', (data: any) => {
            if (data?.node) {
                this.focusedNodeId = data.node.id;
            }
        });
    }

    private handleWheel(event: any): void {
        if (!event?.deltaY) return;

        // Accumulate scroll delta
        this.scrollAccumulator -= event.deltaY * 0.001;

        if (Math.abs(this.scrollAccumulator) >= this.SCROLL_THRESHOLD) {
            const direction = Math.sign(this.scrollAccumulator);

            if (direction > 0) {
                this.zoomIn();
            } else if (direction < 0) {
                this.zoomOut();
            }

            this.scrollAccumulator = 0;
        }
    }

    private getCameraDistance(): number {
        if (!this.sg?.renderer?.camera) return 0;
        const camera = this.sg.renderer.camera;
        const target = this.sg.cameraControls?.target;
        if (!target) return 0;
        return camera.position.distanceTo(target);
    }

    private checkZoomLevel(): void {
        const distance = this.getCameraDistance();
        this.lastDistance = distance;

        let newLevel = this.currentLevel;
        for (let i = 0; i < this.config.levels.length; i++) {
            const level = this.config.levels[i];
            if (distance >= level.minDistance && distance <= level.maxDistance) {
                newLevel = i;
                break;
            }
        }

        if (newLevel !== this.currentLevel) {
            this.updateLevel(newLevel);
        }
    }

    private updateLevel(newLevel: number): void {
        const fromLevel = this.currentLevel;
        this.currentLevel = newLevel;
        this.targetLevel = newLevel;

        if (fromLevel !== newLevel) {
            this.config.onLevelChange?.(fromLevel, newLevel);
            logger.info(
                `Zoom level changed: ${fromLevel} → ${newLevel} (${this.currentZoomLabel})`,
            );

            // Update LODPlugin if available
            const lodPlugin = this.sg.pluginManager.getPlugin('lod') as any;
            if (lodPlugin?.setZoomLevel) {
                const threshold = this.config.levels[newLevel]?.detailThreshold ?? 0.5;
                lodPlugin.setZoomLevel(newLevel, threshold);
            }

            this.updateSemanticEdges(newLevel);
        }

        this.sg.events.emit('fractal:level-change', {
            from: fromLevel,
            to: newLevel,
            label: this.currentZoomLabel,
            timestamp: Date.now(),
        });
    }

    zoomIn(): void {
        if (this.currentLevel < this.config.levels.length - 1) {
            const nextLevel = this.currentLevel + 1;
            const targetDistance =
                (this.config.levels[nextLevel].minDistance +
                    this.config.levels[nextLevel].maxDistance) /
                2;
            this.zoomTo(targetDistance, nextLevel);
        }
    }

    zoomOut(): void {
        if (this.currentLevel > 0) {
            const prevLevel = this.currentLevel - 1;
            const targetDistance =
                (this.config.levels[prevLevel].minDistance +
                    this.config.levels[prevLevel].maxDistance) /
                2;
            this.zoomTo(targetDistance, prevLevel);
        }
    }

    zoomTo(distance: number, level?: number): void {
        if (!this.sg?.cameraControls) return;

        const target = this.sg.cameraControls.target.clone();

        // If we have a focused node, use it as the target for zoom-in
        if (this.focusedNodeId) {
            const node = this.sg.graph.nodes.get(this.focusedNodeId);
            if (node) {
                target.copy(node.position);
            }
        }

        this.sg.cameraControls.flyTo(target, distance, this.config.transitionDuration);

        if (level !== undefined) {
            this.updateLevel(level);
        }
    }

    private updateSemanticEdges(level: number): void {
        const importanceThreshold = this.config.levels[level]?.semanticImportance ?? 0;

        for (const edge of this.sg.graph.edges.values()) {
            const edgeImportance = (edge.data?.importance as number) ?? 1.0;

            // If edge importance is lower than threshold, hide it
            if (edgeImportance < importanceThreshold) {
                if (edge.object) edge.object.visible = false;
            } else {
                // Let other plugins (like LOD) decide base on other factors,
                // but we at least allow it.
            }
        }
    }

    onPreRender(_delta: number): void {
        if (this.isTransitioning) {
            this.transitionProgress += _delta / this.config.transitionDuration;
            if (this.transitionProgress >= 1) {
                this.isTransitioning = false;
                this.transitionProgress = 0;
            }
        }
    }

    dispose(): void {}
}
