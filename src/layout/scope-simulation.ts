// The physical layer over recursive scopes. A scope layout is a stable target; bodies are springs
// that chase it. Critical damping and sleep-on-settle make the motion readable and deterministic:
// animation is a transition between resting states, never a perpetual simulation.
//
// No renderer, clock or DOM is involved. The host drives `advance(seconds)` and reads `view()`.

import { boundsFromExtents } from './bounds';
import type { Position } from './placement';
import { resolveScopeRef, scopeOf, type ScopeSpec, type ScopeTree } from './scope';
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

export interface ScopeForceOptions {
    /** Repulsion strength between bodies in the same scope. Default 2000. */
    repulsion?: number;
    /** Attraction along edges inside a scope. Default 0.02. */
    attraction?: number;
    /** Per-step heat decay; forces fade to zero so the system can sleep. Default 0.96. */
    cooling?: number;
    /** Acceleration cap, preventing explosions. Default 1200. */
    maxAcceleration?: number;
    /** Above this body count a scope skips pairwise forces. Default 120. */
    maxBodies?: number;
}

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
    /** Enable transient inter-body forces. Off by default; bodies then only chase their targets. */
    forces?: ScopeForceOptions;
    /** Options for the underlying scope solver. */
    layout?: ScopeLayoutOptions;
}

const AXES = ['x', 'y', 'z'] as const;

const zero = (): Position => ({ x: 0, y: 0, z: 0 });
const copy = (position: Position): Position => ({ x: position.x, y: position.y, z: position.z });

const moved = (from: Position, to: Position): boolean =>
    AXES.some((axis) => Math.abs(from[axis] - to[axis]) > 1e-9);

/** Override solved world positions with external targets and refit the reported bounds. */
function withTargets(layout: ScopeLayout, targets: ReadonlyMap<string, Position>): ScopeLayout {
    const positions = new Map(
        [...layout.positions].map(([id, position]) => [id, targets.get(id) ?? position] as const),
    );
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    for (const position of positions.values()) {
        minX = Math.min(minX, position.x);
        minY = Math.min(minY, position.y);
        maxX = Math.max(maxX, position.x);
        maxY = Math.max(maxY, position.y);
    }
    const bounds: ScopeBounds = Number.isFinite(minX)
        ? boundsFromExtents(minX, minY, 0, maxX, maxY, 0)
        : layout.bounds;
    return { ...layout, positions, bounds };
}

/** One set of spring bodies: node positions or scope-frame origins. */
class BodySet<T> {
    readonly current = new Map<string, Position>();
    readonly velocity = new Map<string, Position>();
    readonly sleeping = new Set<string>();

    get energy(): number {
        let total = 0;
        for (const velocity of this.velocity.values()) {
            total += velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2;
        }
        return total;
    }

    settled(targets: ReadonlyMap<string, T>): boolean {
        for (const id of targets.keys()) if (!this.sleeping.has(id)) return false;
        return true;
    }

    snapshot(): Map<string, Position> {
        return new Map(this.current);
    }

    clear(): void {
        this.current.clear();
        this.velocity.clear();
        this.sleeping.clear();
    }

    /** Seed missing bodies, wake those whose target moved, and drop bodies with no target. */
    sync(
        targets: ReadonlyMap<string, T>,
        previous: ReadonlyMap<string, T> | undefined,
        goalOf: (value: T) => Position,
        spawn: (id: string, value: T) => Position,
    ): void {
        for (const [id, value] of targets) {
            const goal = goalOf(value);
            if (!this.current.has(id)) {
                this.current.set(id, copy(spawn(id, value)));
                this.velocity.set(id, zero());
                this.sleeping.add(id);
            }
            const before = previous?.get(id);
            if (!before || moved(goalOf(before), goal)) this.sleeping.delete(id);
        }
        for (const id of [...this.current.keys()]) {
            if (!targets.has(id)) this.drop(id);
        }
    }

    pin(id: string, goal: Position): void {
        this.current.set(id, copy(goal));
        this.velocity.set(id, zero());
        this.sleeping.add(id);
    }

    unpin(id: string): void {
        this.sleeping.delete(id);
    }

    settle(targets: ReadonlyMap<string, T>, goalOf: (value: T) => Position): void {
        for (const [id, value] of targets) this.pin(id, goalOf(value));
    }

    private drop(id: string): void {
        this.current.delete(id);
        this.velocity.delete(id);
        this.sleeping.delete(id);
    }
}

export class ScopeSimulation {
    #options: ScopeSimulationOptions;
    #host: ScopeHost;
    #specs?: readonly ScopeSpec[];
    #signals: ScopeSignals = {};
    #target?: ScopeLayout;
    #tree?: ScopeTree;

    #bodies = new BodySet<Position>();
    #frames = new BodySet<ScopeFrame>();
    #pinned = new Set<string>();
    #policyPinned = new Set<string>();
    #layoutOverride: ScopeLayoutOptions = {};
    /** Externally solved world-space targets by qualified id; the springs chase these when set. */
    #targets?: ReadonlyMap<string, Position>;
    #heat = 0;
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
        return (
            this.#bodies.settled(this.#target.positions) &&
            this.#frames.settled(this.#target.frames)
        );
    }

    get energy(): number {
        return this.#bodies.energy + this.#frames.energy;
    }

    get positions(): ReadonlyMap<string, Position> {
        return this.#bodies.current;
    }

    /** The solved layout the springs chase, including scope frames, for read-only overlay use. */
    get targets(): ScopeLayout | undefined {
        return this.#target;
    }

    get pinned(): ReadonlySet<string> {
        return this.#pinned;
    }

    /** Transient force energy, decaying from 1 to 0 after a target change. */
    get heat(): number {
        return this.#heat;
    }

    /** Replace the target graph. Existing bodies keep their motion; new bodies spawn at their scope. */
    setSpecs(specs: readonly ScopeSpec[], signals: ScopeSignals = {}): void {
        this.#specs = specs;
        this.#signals = signals;
        const hosted = this.#host.update(specs, signals, this.#layoutOverride);
        const previous = this.#target;
        const target = this.#targets?.size
            ? withTargets(hosted, this.#targets)
            : hosted;
        this.#target = target;
        this.#tree = hosted.tree;

        const spawnAtOrigin = this.#options.spawn !== 'target';
        this.#bodies.sync(
            hosted.positions,
            previous?.positions,
            (position) => position,
            (id, position) => {
                const path = this.#tree ? scopeOf(this.#tree, id) : undefined;
                const origin = path ? hosted.frames.get(path)?.origin : undefined;
                return spawnAtOrigin && origin ? origin : position;
            },
        );
        this.#frames.sync(
            hosted.frames,
            previous?.frames,
            (frame) => frame.origin,
            (_id, frame) => {
                const parentOrigin = frame.parent
                    ? (this.#frames.current.get(frame.parent) ??
                      hosted.frames.get(frame.parent)?.origin)
                    : undefined;
                return parentOrigin ?? frame.origin;
            },
        );

        if (this.#options.forces) {
            this.#heat = 1;
            this.#bodies.sleeping.clear();
            this.#frames.sleeping.clear();
        }
        if (this.#options.instant) this.settle();
    }

    /**
     * Feed solved world-space positions as the target of the springs. The simulation stays the only
     * authority over current positions; `undefined` returns to the scope solver's own targets.
     */
    setLayoutTargets(targets: ReadonlyMap<string, Position> | undefined): void {
        this.#targets = targets;
        if (this.#specs) this.setSpecs(this.#specs, this.#signals);
    }

    /** Replace the base layout options and retarget without rebuilding the simulation. */
    setBaseLayout(options: ScopeLayoutOptions): void {
        this.#options.layout = { ...this.#options.layout, ...options };
        this.#layoutOverride = { ...this.#options.layout };
        if (this.#specs) this.setSpecs(this.#specs, this.#signals);
    }

    /** Replace transient force parameters and wake settled bodies so the change is visible. */
    setForces(forces: ScopeForceOptions): void {
        this.#options.forces = { ...this.#options.forces, ...forces };
        this.#heat = 1;
        this.#bodies.sleeping.clear();
        this.#frames.sleeping.clear();
        if (this.#specs) this.setSpecs(this.#specs, this.#signals);
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
            if (goal) this.#bodies.pin(id, goal);
            const frame = this.#target?.frames.get(id);
            if (frame) this.#frames.pin(id, frame.origin);
        }
    }

    unpin(ids: Iterable<string>): void {
        for (const id of ids) {
            this.#pinned.delete(id);
            this.#bodies.unpin(id);
            this.#frames.unpin(id);
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

    /** Switch between animated and instant mode. */
    setInstant(value: boolean): void {
        this.#options = { ...this.#options, instant: value };
        if (value) this.settle();
    }

    /** Snap every body to its target and stop all motion. */
    settle(): void {
        if (!this.#target) return;
        this.#bodies.settle(this.#target.positions, (position) => position);
        this.#frames.settle(this.#target.frames, (frame) => frame.origin);
        this.#heat = 0;
        this.#accumulator = 0;
    }

    reset(): void {
        this.#host = new ScopeHost(this.#options.layout);
        this.#target = undefined;
        this.#tree = undefined;
        this.#specs = undefined;
        this.#bodies.clear();
        this.#frames.clear();
        this.#pinned.clear();
        this.#policyPinned.clear();
        this.#layoutOverride = {};
        this.#targets = undefined;
        this.#heat = 0;
        this.#accumulator = 0;
        this.#steps = 0;
    }

    /** The current animated frame, compatible with the static `ScopeLayout` surface. */
    view(): ScopeLayout {
        if (!this.#target || !this.#tree) {
            throw new Error('ScopeSimulation has no target; call setSpecs first');
        }
        const positions = this.#bodies.snapshot();
        const frames = new Map<string, ScopeFrame>();
        for (const [id, frame] of this.#target.frames) {
            const origin = this.#frames.current.get(id) ?? frame.origin;
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
        const maxAcceleration = this.#options.forces?.maxAcceleration ?? 1200;
        const forces = this.#options.forces ? this.computeForces() : undefined;
        const frameTargets = new Map(
            [...this.#target.frames].map(([id, frame]) => [id, frame.origin] as const),
        );
        this.relax(
            this.#bodies,
            this.#target.positions,
            dt,
            stiffness,
            damping,
            mass,
            forces,
            maxAcceleration,
        );
        this.relax(
            this.#frames,
            frameTargets,
            dt,
            stiffness,
            damping,
            mass,
            forces,
            maxAcceleration,
        );
        if (forces) {
            this.#heat *= this.#options.forces?.cooling ?? 0.96;
            if (this.#heat < 0.01) this.#heat = 0;
        }
    }

    /** Transient pairwise forces inside each scope. Heat fades them out so the graph can sleep. */
    private computeForces(): ReadonlyMap<string, Position> {
        const result = new Map<string, Position>();
        if (!this.#target || !this.#tree) return result;
        const repulsion = this.#options.forces?.repulsion ?? 2000;
        const attraction = this.#options.forces?.attraction ?? 0.02;
        const maxAcceleration = this.#options.forces?.maxAcceleration ?? 1200;
        const maxBodies = this.#options.forces?.maxBodies ?? 120;

        const add = (id: string, x: number, y: number, z: number): void => {
            let force = result.get(id);
            if (!force) {
                force = { x: 0, y: 0, z: 0 };
                result.set(id, force);
            }
            force.x += x;
            force.y += y;
            force.z += z;
        };

        for (const [path, entry] of this.#tree.byPath) {
            const frame = this.#target.frames.get(path);
            if (!frame) continue;
            const scale = frame.scale || 1;
            const bodies: { id: string; position: Position; radius: number }[] = [];

            for (const node of entry.nodes) {
                const id = `${path}/${node.id}`;
                const position = this.#bodies.current.get(id);
                if (!position) continue;
                const [width, height] = node.size ?? [120, 64];
                bodies.push({ id, position, radius: (Math.max(width, height) / 2) * scale });
            }
            for (const child of entry.children) {
                const childFrame = this.#target.frames.get(child.path);
                if (!childFrame) continue;
                bodies.push({
                    id: child.path,
                    position: this.#frames.current.get(child.path) ?? childFrame.origin,
                    radius: (Math.max(childFrame.bounds.size[0], childFrame.bounds.size[1]) / 2) * scale,
                });
            }
            if (bodies.length > maxBodies) continue;

            for (let i = 0; i < bodies.length; i++) {
                for (let j = i + 1; j < bodies.length; j++) {
                    const a = bodies[i];
                    const b = bodies[j];
                    const dx = a.position.x - b.position.x;
                    const dy = a.position.y - b.position.y;
                    const dz = a.position.z - b.position.z;
                    const distance = Math.hypot(dx, dy, dz) || 1e-3;
                    const effective = Math.max(distance, a.radius + b.radius);
                    const force = Math.min(repulsion / (effective * effective), maxAcceleration);
                    const fx = (dx / distance) * force;
                    const fy = (dy / distance) * force;
                    const fz = (dz / distance) * force;
                    add(a.id, fx, fy, fz);
                    add(b.id, -fx, -fy, -fz);
                }
            }

            const members = new Map(bodies.map((body) => [body.id, body]));
            for (const edge of entry.edges) {
                const source = members.get(resolveScopeRef(this.#tree, path, edge.source));
                const target = members.get(resolveScopeRef(this.#tree, path, edge.target));
                if (!source || !target) continue;
                const dx = target.position.x - source.position.x;
                const dy = target.position.y - source.position.y;
                const dz = target.position.z - source.position.z;
                add(source.id, dx * attraction, dy * attraction, dz * attraction);
                add(target.id, -dx * attraction, -dy * attraction, -dz * attraction);
            }
        }
        return result;
    }

    private relax(
        bodies: BodySet<unknown>,
        target: ReadonlyMap<string, Position>,
        dt: number,
        stiffness: number,
        damping: number,
        mass: number,
        forces: ReadonlyMap<string, Position> | undefined,
        maxAcceleration: number,
    ): void {
        const sleepDistance = this.#options.sleepDistance ?? 0.01;
        const sleepSpeed = this.#options.sleepSpeed ?? 0.01;

        for (const [id, goal] of target) {
            if (this.#pinned.has(id)) {
                bodies.pin(id, goal);
                continue;
            }
            if (bodies.sleeping.has(id)) continue;

            const position = copy(bodies.current.get(id) ?? goal);
            const speed = copy(bodies.velocity.get(id) ?? zero());
            const force = forces?.get(id);
            const forceAcceleration: Position = {
                x: (force?.x ?? 0) * this.#heat,
                y: (force?.y ?? 0) * this.#heat,
                z: (force?.z ?? 0) * this.#heat,
            };
            const magnitude = Math.hypot(forceAcceleration.x, forceAcceleration.y, forceAcceleration.z);
            const scale = magnitude > maxAcceleration ? maxAcceleration / magnitude : 1;

            let awake = false;
            for (const axis of AXES) {
                const acceleration =
                    (stiffness * (goal[axis] - position[axis]) - damping * speed[axis]) / mass +
                    forceAcceleration[axis] * scale;
                speed[axis] += acceleration * dt;
                position[axis] += speed[axis] * dt;
                if (Math.abs(speed[axis]) > sleepSpeed || Math.abs(goal[axis] - position[axis]) > sleepDistance) {
                    awake = true;
                }
            }
            if (awake) {
                bodies.current.set(id, position);
                bodies.velocity.set(id, speed);
            } else {
                bodies.pin(id, goal);
            }
        }
    }
}
