import type { SpaceGraph } from '../SpaceGraph';
import type { ISpaceGraphPlugin } from '../types';
/**
 * PhysicsPlugin — Verlet-based 2-D physics stub.
 *
 * Provides a foundation for constraint-based or particle physics.
 * Each node gets a position, previous-position (for Verlet integration),
 * and optional mass from node.data.mass.
 *
 * Current behaviours:
 *   - Gravity (optional, disabled by default)
 *   - Simple position damping
 *   - Ground plane collision (y = 0, disabled by default)
 *
 * Extend by adding constraints, springs, or collision detection.
 */
export declare class PhysicsPlugin implements ISpaceGraphPlugin {
    readonly id = 'physics-plugin';
    readonly name = 'Physics Plugin';
    readonly version = '1.0.0';
    private sg;
    /** Previous positions for Verlet integration (keyed by node.id) */
    private prev;
    settings: {
        enabled: boolean;
        gravity: number;
        damping: number;
        groundY: number;
        fixedStep: number;
        springStiffness: number;
        springRestLength: number;
        collide: boolean;
        collisionRadius: number;
        repulsion: number;
    };
    init(sg: SpaceGraph): void;
    onPreRender(delta: number): void;
    private _step;
    /** Pin a node so physics won't move it. */
    pin(nodeId: string): void;
    /** Unpin a node. */
    unpin(nodeId: string): void;
    dispose(): void;
}
