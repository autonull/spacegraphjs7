// SpaceGraphJS - Base Layout Plugin
// Abstract base class for layout plugins with common helpers

import * as THREE from 'three';
import type { Plugin } from '../../core/PluginManager';
import type { Graph } from '../../core/Graph';
import type { Node } from '../../nodes/Node';
import type { EventSystem } from '../../core/events/EventSystem';
import type { SpaceGraph } from '../../SpaceGraph';

/**
 * Layout configuration
 */
export interface LayoutConfig {
    animate?: boolean;
    duration?: number;
    skipPinned?: boolean;
    [key: string]: unknown;
}

/**
 * Layout options for apply()
 */
export interface LayoutOptions {
    animate?: boolean;
    duration?: number;
    skipPinned?: boolean;
    radiusX?: number;
    radiusY?: number;
    startAngle?: number;
    z?: number;
    clusterBy?: string;
    clusterRadius?: number;
    nodeRadius?: number;
    projection?: string;
    radius?: number;
    mapWidth?: number;
    mapHeight?: number;
    columns?: number;
    spacingX?: number;
    spacingY?: number;
    offsetX?: number;
    offsetY?: number;
    rootId?: string;
    levelHeight?: number;
    nodeSpacing?: number;
    direction?: string;
    baseRadius?: number;
    radiusStep?: number;
    scale?: number;
    dimensions?: number;
    timeField?: string;
    orientation?: string;
    spacing?: number;
    scaleFactor?: number;
    staggerLayout?: boolean;
    staggerAmount?: number;
    [key: string]: unknown;
}

/**
 * Layout Composer - combines multiple layouts
 */
export interface LayoutComposerConfig {
    layouts: Array<{ layout: BaseLayout; weight: number }>;
    iterations?: number;
    convergenceThreshold?: number;
}

export class LayoutComposer {
    private graph!: Graph;
    private events!: EventSystem;

    init(sg: SpaceGraph, graph: Graph, events: EventSystem): void {
        this.graph = graph;
        this.events = events;
    }

    async apply(config: LayoutComposerConfig): Promise<void> {
        const { layouts, iterations = 3, convergenceThreshold = 0.01 } = config;
        const nodes = Array.from(this.graph.getNodes());
        if (!nodes.length) return;

        for (let i = 0; i < iterations; i++) {
            let totalDelta = 0;
            for (const { layout, weight } of layouts) {
                const positions = new Map<string, THREE.Vector3>();
                nodes.forEach(n => positions.set(n.id, n.position.clone()));

                await layout.apply();

                nodes.forEach((node, _idx) => {
                    const newPos = node.position;
                    const oldPos = positions.get(node.id)!;
                    const delta = newPos.distanceTo(oldPos);
                    totalDelta += delta * weight;
                    node.position.copy(oldPos);
                });
            }
            if (totalDelta / nodes.length < convergenceThreshold) break;
        }

        this.events.emit('layout:applied', { layout: 'composer', timestamp: Date.now() });
    }
}

/**
 * Abstract base class for layout plugins
 * Provides common helpers for position application and node iteration
 */
export abstract class BaseLayout implements Plugin {
    abstract readonly id: string;
    abstract readonly name: string;
    abstract readonly version: string;

    protected graph!: Graph;
    protected events!: EventSystem;
    protected config: LayoutConfig = {};

    constructor(config: LayoutConfig = {}) {
        this.config = { ...this.defaultConfig(), ...config };
    }

    protected abstract defaultConfig(): LayoutConfig;

    init(_sg: SpaceGraph, graph: Graph, events: EventSystem): void {
        this.graph = graph;
        this.events = events;
    }

    abstract apply(options?: LayoutOptions): Promise<void>;

    /**
     * Template method: Apply positions to nodes using a calculator function.
     * Handles all common layout boilerplate (get nodes, animate, update edges, emit event).
     */
    protected applyNodePositions(
        calculate: (node: Node, index: number, total: number, config: LayoutConfig) => THREE.Vector3,
        options?: LayoutOptions,
    ): void {
        const {
            animate = this.config.animate ?? true,
            duration = this.config.duration ?? 1.0,
            skipPinned = true,
        } = options ?? {};

        const nodes = Array.from(this.graph.getNodes()).filter(n => !skipPinned || !(n.data as Record<string, unknown>).pinned);
        if (!nodes.length) return;

        const mergedConfig = { ...this.config, ...options };
        const targetPos = new THREE.Vector3();

        nodes.forEach((node, i) => {
            calculate(node, i, nodes.length, mergedConfig);
            this.applyPosition(node, targetPos.copy(calculate(node, i, nodes.length, mergedConfig)), { animate, duration });
        });

        this.updateEdges();
        this.emitLayoutApplied({ duration });
    }

    /**
     * Legacy helper - use applyNodePositions for new implementations
     */
    protected forEachNode(
        fn: (node: Node, index: number, total: number) => void,
        options: { skipPinned?: boolean } = {},
    ): void {
        const nodes = Array.from(this.graph.getNodes());
        const { skipPinned = true } = options;

        let _idx = 0;
        for (const node of nodes) {
            if (skipPinned && (node.data as Record<string, unknown>).pinned) continue;
            fn(node, _idx++, nodes.length);
        }
    }

    /**
     * Helper: Apply position to a node with optional animation
     */
    protected applyPosition(
        node: Node,
        target: THREE.Vector3,
        options: { animate?: boolean; duration?: number } = {},
    ): void {
        const { animate = this.config.animate ?? true, duration = this.config.duration ?? 1.0 } =
            options;

        if (animate && typeof window !== 'undefined') {
            const gsap = (window as Window & { gsap?: { to: (...args: unknown[]) => void } }).gsap;
            if (gsap) {
                gsap.to(node.position, {
                    x: target.x,
                    y: target.y,
                    z: target.z,
                    duration,
                    ease: 'power2.out',
                    onUpdate: () => {
                        node.object.position.copy(node.position);
                    },
                });
            } else {
                node.position.copy(target);
                node.object.position.copy(target);
            }
        } else {
            node.position.copy(target);
            node.object.position.copy(target);
        }
    }

    /**
     * Helper: Get bounds of all nodes
     */
    protected getNodeBounds(): { min: THREE.Vector3; max: THREE.Vector3 } {
        const min = new THREE.Vector3(Infinity, Infinity, Infinity);
        const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);

        for (const node of this.graph.getNodes()) {
            min.min(node.position);
            max.max(node.position);
        }

        return { min, max };
    }

    /**
     * Helper: Center nodes at origin
     */
    protected centerNodes(): void {
        const { min, max } = this.getNodeBounds();
        const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);

        this.forEachNode((node) => {
            const target = node.position.clone().sub(center);
            this.applyPosition(node, target, { animate: false });
        });

        center.z = 0; // Clean up
    }

    /**
     * Helper: Scale nodes to fit within bounds
     */
    protected scaleToFit(targetSize: number): void {
        const { min, max } = this.getNodeBounds();
        const currentSize = new THREE.Vector3()
            .subVectors(max, min)
            .max(new THREE.Vector3(1, 1, 1));

        const scale = targetSize / Math.max(currentSize.x, currentSize.y);

        if (scale < 1) {
            this.forEachNode((node) => {
                const target = node.position.clone().multiplyScalar(scale);
                this.applyPosition(node, target, { animate: false });
            });
        }
    }

    /**
     * Helper: Get non-pinned nodes
     */
    protected getNonPinnedNodes(): Node[] {
        return Array.from(this.graph.getNodes()).filter((n) => !this.isPinned(n));
    }

    protected isPinned(node: Node): boolean {
        return (node.data as Record<string, unknown>)?.pinned === true;
    }

    /**
     * Helper: Update all edges after layout application
     */
    protected updateEdges(): void {
        for (const edge of this.graph.getEdges()) (edge as { update?: () => void }).update?.();
    }

    /**
     * Helper: Emit layout applied event
     */
    protected emitLayoutApplied(options?: { duration: number }): void {
        this.events.emit('layout:applied', {
            layout: this.id,
            duration: options?.duration ?? this.config.duration ?? 1.0,
            timestamp: Date.now(),
        });
    }

    /**
     * Helper: Get nodes sorted by property
     */
    protected getNodesSortedBy(prop: string, ascending = true): Node[] {
        return Array.from(this.graph.getNodes()).sort((a, b) => {
            const aVal = (a.data as Record<string, unknown>)[prop] as number ?? 0;
            const bVal = (b.data as Record<string, unknown>)[prop] as number ?? 0;
            return ascending ? aVal - bVal : bVal - aVal;
        });
    }

    /**
     * Helper: Get nodes grouped by property
     */
    protected getNodesGroupedBy(prop: string): Map<unknown, Node[]> {
        const groups = new Map<unknown, Node[]>();
        for (const node of this.graph.getNodes()) {
            const key = (node.data as Record<string, unknown>)[prop];
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(node);
        }
        return groups;
    }

    /**
     * Helper: Get node by property value
     */
    protected getNodeByProperty(prop: string, value: unknown): Node | undefined {
        for (const node of this.graph.getNodes()) {
            if ((node.data as Record<string, unknown>)[prop] === value) return node;
        }
        return undefined;
    }

    /**
     * Helper: Calculate graph center
     */
    protected getGraphCenter(): THREE.Vector3 {
        let x = 0, y = 0, z = 0, count = 0;
        for (const node of this.graph.getNodes()) {
            x += node.position.x;
            y += node.position.y;
            z += node.position.z;
            count++;
        }
        return count > 0 ? new THREE.Vector3(x / count, y / count, z / count) : new THREE.Vector3();
    }

    /**
     * Helper: Calculate graph radius (max distance from center)
     */
    protected getGraphRadius(): number {
        const center = this.getGraphCenter();
        let maxDist = 0;
        for (const node of this.graph.getNodes()) {
            const dist = node.position.distanceTo(center);
            if (dist > maxDist) maxDist = dist;
        }
        return maxDist;
    }

    /**
     * Helper: Get connected component for node
     */
    protected getConnectedComponent(startNode: Node): Node[] {
        const visited = new Set<string>();
        const queue = [startNode];
        const component: Node[] = [];
        while (queue.length > 0) {
            const node = queue.shift()!;
            if (visited.has(node.id)) continue;
            visited.add(node.id);
            component.push(node);
            for (const edge of this.graph.getEdges()) {
                const other = edge.source.id === node.id ? edge.target : edge.target.id === node.id ? edge.source : null;
                if (other && !visited.has(other.id)) queue.push(other as Node);
            }
        }
        return component;
    }

    /**
     * Helper: Get node by ID
     */
    protected getNodeById(id: string): Node | undefined {
        return this.graph.getNode(id);
    }

    /**
     * Helper: Get nodes by IDs
     */
    protected getNodesByIds(ids: string[]): Node[] {
        return ids.map(id => this.graph.getNode(id)).filter((n): n is Node => !!n);
    }

    /**
     * Helper: Get edge statistics
     */
    protected getEdgeStats(): { total: number; avgDegree: number; maxDegree: number; isolated: number } {
        const degrees = new Map<string, number>();
        let maxDegree = 0;
        let isolated = 0;

        for (const edge of this.graph.getEdges()) {
            degrees.set(edge.source.id, (degrees.get(edge.source.id) ?? 0) + 1);
            degrees.set(edge.target.id, (degrees.get(edge.target.id) ?? 0) + 1);
        }

        for (const node of this.graph.getNodes()) {
            const degree = degrees.get(node.id) ?? 0;
            if (degree > maxDegree) maxDegree = degree;
            if (degree === 0) isolated++;
        }

        const totalDegrees = Array.from(degrees.values()).reduce((a, b) => a + b, 0);
        const nodeCount = this.graph.nodes.size;
        return {
            total: this.graph.edges.size,
            avgDegree: nodeCount > 0 ? totalDegrees / nodeCount : 0,
            maxDegree,
            isolated,
        };
    }

    /**
     * Helper: Get nodes within radius of a point
     */
    protected getNodesInRadius(center: THREE.Vector3, radius: number): Node[] {
        return Array.from(this.graph.getNodes()).filter(
            node => node.position.distanceTo(center) <= radius
        );
    }

    /**
     * Helper: Get nodes by type
     */
    protected getNodesByType(type: string): Node[] {
        return Array.from(this.graph.getNodes()).filter(node => node.type === type);
    }

    /**
     * Helper: Calculate bounding box
     */
    protected getBoundingBox(): { width: number; height: number; depth: number; center: THREE.Vector3 } {
        const { min, max } = this.getNodeBounds();
        const size = new THREE.Vector3().subVectors(max, min);
        const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);
        return { width: size.x, height: size.y, depth: size.z, center };
    }

    /**
     * Helper: Distribute nodes evenly between two points
     */
    protected distributeAlongLine(nodes: Node[], start: THREE.Vector3, end: THREE.Vector3): void {
        if (nodes.length === 0) return;
        const dir = new THREE.Vector3().subVectors(end, start);
        const step = dir.clone().divideScalar(nodes.length + 1);

        nodes.forEach((node, i) => {
            const target = start.clone().add(step.clone().multiplyScalar(i + 1));
            this.applyPosition(node, target, { animate: false });
        });
    }

    /**
     * Helper: Arrange nodes in a grid pattern
     */
    protected arrangeInGrid(nodes: Node[], cols: number, spacingX = 100, spacingY = 100, startX = 0, startY = 0): void {
        nodes.forEach((node, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const target = new THREE.Vector3(startX + col * spacingX, startY + row * spacingY, 0);
            this.applyPosition(node, target, { animate: false });
        });
    }

    /**
     * Helper: Randomize node positions within bounds
     */
    protected randomizePositions(bounds: { minX: number; maxX: number; minY: number; maxY: number; minZ?: number; maxZ?: number }): void {
        const { minX, maxX, minY, maxY, minZ = 0, maxZ = 0 } = bounds;
        this.forEachNode((node) => {
            const target = new THREE.Vector3(
                minX + Math.random() * (maxX - minX),
                minY + Math.random() * (maxY - minY),
                minZ + Math.random() * (maxZ - minZ)
            );
            this.applyPosition(node, target, { animate: false });
        });
    }

    /**
     * Helper: Validate layout configuration
     */
    protected validateOptions(options: LayoutOptions): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        const nodeCount = this.graph.nodes.size;

        if (nodeCount === 0) {
            errors.push('No nodes to layout');
        }

        if (options.columns !== undefined && options.columns <= 0) {
            errors.push('Columns must be positive');
        }

        if (options.spacingX !== undefined && options.spacingX <= 0) {
            errors.push('SpacingX must be positive');
        }

        if (options.spacingY !== undefined && options.spacingY <= 0) {
            errors.push('SpacingY must be positive');
        }

        if (options.radius !== undefined && options.radius <= 0) {
            errors.push('Radius must be positive');
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Helper: Interpolate between two positions with easing
     */
    protected lerpPosition(start: THREE.Vector3, end: THREE.Vector3, t: number): THREE.Vector3 {
        return new THREE.Vector3(
            start.x + (end.x - start.x) * t,
            start.y + (end.y - start.y) * t,
            start.z + (end.z - start.z) * t
        );
    }

    /**
     * Helper: Get nodes sorted by degree (connectivity)
     */
    protected getNodesByDegree(ascending = false): Node[] {
        const degrees = new Map<string, number>();
        for (const edge of this.graph.getEdges()) {
            degrees.set(edge.source.id, (degrees.get(edge.source.id) ?? 0) + 1);
            degrees.set(edge.target.id, (degrees.get(edge.target.id) ?? 0) + 1);
        }

        return Array.from(this.graph.getNodes()).sort((a, b) => {
            const degreeA = degrees.get(a.id) ?? 0;
            const degreeB = degrees.get(b.id) ?? 0;
            return ascending ? degreeA - degreeB : degreeB - degreeA;
        });
    }
}
