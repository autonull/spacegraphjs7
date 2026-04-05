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

    /**
     * Get default configuration for this layout
     */
    protected abstract defaultConfig(): LayoutConfig;

    /**
     * Initialize the layout
     */
    init(_sg: SpaceGraph, graph: Graph, events: EventSystem): void {
        this.graph = graph;
        this.events = events;
        this.config = { ...this.defaultConfig() };
    }

    /**
     * Apply the layout to the graph
     * Must be implemented by concrete layout classes
     */
    abstract apply(options?: LayoutOptions): Promise<void>;

    /**
     * Helper: Iterate over nodes with options
     */
    protected forEachNode(
        fn: (node: Node, index: number, total: number) => void,
        options: { skipPinned?: boolean } = {},
    ): void {
        const nodes = Array.from(this.graph.getNodes());
        const { skipPinned = true } = options;

        let index = 0;
        for (const node of nodes) {
            if (skipPinned && (node.data as Record<string, unknown>).pinned) continue;
            fn(node, index++, nodes.length);
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
        return Array.from(this.graph.getNodes()).filter(
            (n) => !(n.data as Record<string, unknown>).pinned,
        );
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
}
