// The physical layer over recursive scopes. A scope layout is a stable target; bodies are springs
// that chase it. Critical damping and sleep-on-settle make the motion readable and deterministic:
// animation is a transition between resting states, never a perpetual simulation.
//
// No renderer, clock or DOM is involved. The host drives `advance(seconds)` and reads `view()`.

import type { Position } from './placement';
import { scopeOf, type ScopeSpec, type ScopeTree } from './scope';
import {
    ScopeHost,
    type ScopeBounds,
    type ScopeEdgeView,
    type ScopeFrame,
    type ScopeLayout,
    type ScopeLayoutOptions,
    type ScopeSignals,
} from './scope-layout';
import { scopePolicy, type ScopePolicyInput } from './scope-policy';

export interface ScopeSimulationOptions {
    /** Spring stiffness toward the solved target. Default 140. */
    stiffness?: number;
    /** Damping ratio: 1 is critically damped, below 1 overshoots. Default 1. */
    dampingRatio?: number;
    /** Body mass. Default 1. */
    mass?: number;
    /** Fixed integration step in seconds. Default 1/60. */
    step?: number;
    /** Maximum integration steps in one `advance`. Default 8. */
    maxSteps?: number;
    /** Where a new body starts: its target or the origin of its owning scope. Default 'origin'. */
    spawn?: 'target' | 'origin';
    /** A body sleeps when it is this close to its target and this slow. */
    sleepDistance?: number;
    sleepSpeed?: number;
    /** Snap to targets immediately, for reduced-motion or headless use. */
    instant?: boolean;
    /** Qualified ids held at their solved target. */
    pinned?: Iterable<string>;
    /** Options for the underlying scope solver. */
    layout?: ScopeLayoutOptions;
}

const AXES = ['x', 'y', 'z'] as const;

const zero = (): Position => ({ x: 0, y: 0, z: 0 });
const copy = (position: Position): Position => ({ x: position.x, y: position.y, z: position.z });

const moved = (from: Position, to: Position): boolean =>
    AXES.some((axis) => Math.abs(from[axis] - to[axis]) > 1e-9);

export class ScopeSimulation {
    #options: ScopeSimulationOptions;
    #host: ScopeHost;
    #specs?: readonly ScopeSpec[];
    #signals: ScopeSignals = {};
    #target?: ScopeLayout;
    #tree?: ScopeTree;

    #current = new Map<string, Position>();
    #velocity = new Map<string, Position>();
    #sleeping = new Set<string>();
    #frameCurrent = new Map<string, Position>();
    #frameVelocity = new Map<string, Position>();
    #frameSleeping = new Set<string>();
    #pinned = new Set<string>();
    #policyPinned = new Set<string>();
    #layoutOverride: ScopeLayoutOptions = {};
    #accumulator = 0;
    #steps = 0;

    constructor(options: ScopeSimulationOptions = {}) {
        this.#options = options;
        this.#pinned = new Set(options.pinned ?? []);
        this.#host = new ScopeHost(options.layout);
    }

    get steps(): number {
        return this.#steps;
    }

    get settled(): boolean {
        if (!this.#target) return true;
        for (const id of this.#target.positions.keys()) {
            if (!this.#sleeping.has(id)) return false;
        }
        for (const id of this.#target.frames.keys()) {
            if (!this.#frameSleeping.has(id)) return false;
        }
        return true;
    }

    get energy(): number {
        let total = 0;
        for (const velocity of this.#velocity.values()) {
            total += velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2;
        }
        for (const velocity of this.#frameVelocity.values()) {
            total += velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2;
        }
        return total;
    }

    get positions(): ReadonlyMap<string, Position> {
        return this.#current;
    }

    get pinned(): ReadonlySet<string> {
        return this.#pinned;
    }

    /** Replace the target graph. Existing bodies keep their motion; new bodies spawn at their scope. */
    setSpecs(specs: readonly ScopeSpec[], signals: ScopeSignals = {}): void {
        this.#specs = specs;
        this.#signals = signals;
        const hosted = this.#host.update(specs, signals, this.#layoutOverride);
        const previous = this.#target;
        this.#target = hosted;
        this.#tree = hosted.tree;

        const spawnAtOrigin = this.#options.spawn !== 'target';
        for (const [id, target] of hosted.positions) {
            if (!this.#current.has(id)) {
                const path = this.#tree ? scopeOf(this.#tree, id) : undefined;
                const origin = path ? hosted.frames.get(path)?.origin : undefined;
                this.#current.set(id, copy(spawnAtOrigin && origin ? origin : target));
                this.#velocity.set(id, zero());
                this.#sleeping.add(id);
            }
            if (!previous || !previous.positions.has(id) || moved(previous.positions.get(id)!, target)) {
                this.#sleeping.delete(id);
            }
        }

        for (const [id, frame] of hosted.frames) {
            if (!this.#frameCurrent.has(id)) {
                const parentOrigin = frame.parent
                    ? this.#frameCurrent.get(frame.parent) ?? hosted.frames.get(frame.parent)?.origin
                    : undefined;
                this.#frameCurrent.set(id, copy(parentOrigin ?? frame.origin));
                this.#frameVelocity.set(id, zero());
                this.#frameSleeping.add(id);
            }
            const before = previous?.frames.get(id)?.origin;
            if (!before || moved(before, frame.origin)) this.#frameSleeping.delete(id);
        }

        for (const id of [...this.#current.keys()]) {
            if (hosted.positions.has(id)) continue;
            this.#current.delete(id);
            this.#velocity.delete(id);
            this.#sleeping.delete(id);
        }
        for (const id of [...this.#frameCurrent.keys()]) {
            if (hosted.frames.has(id)) continue;
            this.#frameCurrent.delete(id);
            this.#frameVelocity.delete(id);
            this.#frameSleeping.delete(id);
        }

        if (this.#options.instant) this.settle();
    }

    /** Re-evaluate activation and layout with the last specs. */
    setSignals(signals: ScopeSignals): void {
        if (this.#specs) this.setSpecs(this.#specs, signals);
    }

    /** Apply a vision/focus policy: retarget, hold the focus, and resize the solvers. */
    setPolicy(input: ScopePolicyInput): void {
        if (!this.#tree || !this.#specs) return;
        const policy = scopePolicy(this.#tree, input, this.#options.layout);
        this.#layoutOverride = policy.layout;
        this.setSpecs(this.#specs, {
            band: input.band,
            focus: input.focus,
            maxDepth: input.maxDepth,
        });
        for (const id of this.#policyPinned) this.unpin([id]);
        this.#policyPinned = new Set(policy.pinned);
        this.pin(policy.pinned);
    }

    get signals(): ScopeSignals {
        return this.#signals;
    }

    pin(ids: Iterable<string>): void {
        for (const id of ids) {
            this.#pinned.add(id);
            const goal = this.#target?.positions.get(id);
            if (goal) {
                this.#current.set(id, copy(goal));
                this.#velocity.set(id, zero());
            }
            const frame = this.#target?.frames.get(id);
            if (frame) {
                this.#frameCurrent.set(id, copy(frame.origin));
                this.#frameVelocity.set(id, zero());
            }
            this.#sleeping.add(id);
            this.#frameSleeping.add(id);
        }
    }

    unpin(ids: Iterable<string>): void {
        for (const id of ids) {
            this.#pinned.delete(id);
            this.#sleeping.delete(id);
            this.#frameSleeping.delete(id);
        }
    }

    /** Advance by wall-clock seconds, using fixed steps and a cap to avoid a catch-up spiral. */
    advance(seconds: number): void {
        const step = this.#options.step ?? 1 / 60;
        const maxSteps = this.#options.maxSteps ?? 8;
        this.#accumulator += Math.max(0, seconds);
        let executed = 0;
        while (this.#accumulator >= step && executed < maxSteps) {
            this.integrate(step);
            this.#accumulator -= step;
            this.#steps++;
            executed++;
        }
        if (executed === maxSteps) this.#accumulator = 0;
    }

    /** Snap every body to its target and stop all motion. */
    settle(): void {
        if (!this.#target) return;
        for (const [id, target] of this.#target.positions) {
            this.#current.set(id, copy(target));
            this.#velocity.set(id, zero());
            this.#sleeping.add(id);
        }
        for (const [id, frame] of this.#target.frames) {
            this.#frameCurrent.set(id, copy(frame.origin));
            this.#frameVelocity.set(id, zero());
            this.#frameSleeping.add(id);
        }
        this.#accumulator = 0;
    }

    reset(): void {
        this.#host = new ScopeHost(this.#options.layout);
        this.#target = undefined;
        this.#tree = undefined;
        this.#specs = undefined;
        this.#current.clear();
        this.#velocity.clear();
        this.#sleeping.clear();
        this.#frameCurrent.clear();
        this.#frameVelocity.clear();
        this.#frameSleeping.clear();
        this.#pinned.clear();
        this.#policyPinned.clear();
        this.#layoutOverride = {};
        this.#accumulator = 0;
        this.#steps = 0;
    }

    /** The current animated frame, compatible with the static `ScopeLayout` surface. */
    view(): ScopeLayout {
        if (!this.#target || !this.#tree) {
            throw new Error('ScopeSimulation has no target; call setSpecs first');
        }
        const positions = new Map(this.#current);
        const frames = new Map<string, ScopeFrame>();
        for (const [id, frame] of this.#target.frames) {
            const origin = this.#frameCurrent.get(id) ?? frame.origin;
            frames.set(id, { ...frame, origin });
        }

        const edges: ScopeEdgeView[] = this.#target.edges.map((edge) => ({
            ...edge,
            from: positions.get(edge.source) ?? frames.get(edge.source)?.origin ?? edge.from,
            to: positions.get(edge.target) ?? frames.get(edge.target)?.origin ?? edge.to,
        }));

        const locals = new Map<string, Position>();
        for (const [id, position] of positions) {
            const path = scopeOf(this.#tree, id);
            const frame = path ? frames.get(path) : undefined;
            if (!frame) {
                locals.set(id, copy(position));
                continue;
            }
            locals.set(id, {
                x: (position.x - frame.origin.x) / frame.scale,
                y: (position.y - frame.origin.y) / frame.scale,
                z: (position.z - frame.origin.z) / frame.scale,
            });
        }

        // Bounds stay at the target so the viewport never jitters during a transition.
        const bounds: ScopeBounds = this.#target.bounds;
        return { positions, locals, frames, edges, bounds };
    }

    private integrate(dt: number): void {
        if (!this.#target) return;
        const stiffness = this.#options.stiffness ?? 140;
        const mass = this.#options.mass ?? 1;
        const damping = 2 * Math.sqrt(stiffness * mass) * (this.#options.dampingRatio ?? 1);
        const frameTargets = new Map(
            [...this.#target.frames].map(([id, frame]) => [id, frame.origin] as const),
        );
        this.relax(this.#current, this.#velocity, this.#sleeping, this.#target.positions, dt, stiffness, damping, mass);
        this.relax(this.#frameCurrent, this.#frameVelocity, this.#frameSleeping, frameTargets, dt, stiffness, damping, mass);
    }

    private relax(
        current: Map<string, Position>,
        velocity: Map<string, Position>,
        sleeping: Set<string>,
        target: ReadonlyMap<string, Position>,
        dt: number,
        stiffness: number,
        damping: number,
        mass: number,
    ): void {
        const sleepDistance = this.#options.sleepDistance ?? 0.01;
        const sleepSpeed = this.#options.sleepSpeed ?? 0.01;

        for (const [id, goal] of target) {
            if (this.#pinned.has(id)) {
                current.set(id, copy(goal));
                velocity.set(id, zero());
                sleeping.add(id);
                continue;
            }
            if (sleeping.has(id)) continue;

            const position = copy(current.get(id) ?? goal);
            const speed = copy(velocity.get(id) ?? zero());
            let awake = false;
            for (const axis of AXES) {
                const acceleration = (stiffness * (goal[axis] - position[axis]) - damping * speed[axis]) / mass;
                speed[axis] += acceleration * dt;
                position[axis] += speed[axis] * dt;
                if (Math.abs(speed[axis]) > sleepSpeed || Math.abs(goal[axis] - position[axis]) > sleepDistance) {
                    awake = true;
                }
            }
            if (awake) {
                current.set(id, position);
                velocity.set(id, speed);
            } else {
                current.set(id, copy(goal));
                velocity.set(id, zero());
                sleeping.add(id);
            }
        }
    }
}
