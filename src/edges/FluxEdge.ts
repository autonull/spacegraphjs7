import * as THREE from 'three';
import type { Node } from '../nodes/Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeSpec } from '../types';
import { dataColor } from '../utils/color';
import { clamp } from '../utils/math';
import { ribbonWidth } from '../utils/ribbon';
import { ThreeDisposer } from '../utils';
import { Edge } from './Edge';

const SEGMENTS = 12;

const waypoint = (value: unknown): THREE.Vector3 | undefined => {
    if (Array.isArray(value)) {
        const parts: unknown[] = value.slice(0, 3);
        if (parts.length >= 2 && parts.every((part) => typeof part === 'number' && Number.isFinite(part))) {
            return new THREE.Vector3(parts[0] as number, parts[1] as number, (parts[2] as number | undefined) ?? 0);
        }
    }
    if (value && typeof value === 'object' && 'x' in value && 'y' in value) {
        const point = value as { x: number; y: number; z?: number };
        if (Number.isFinite(point.x) && Number.isFinite(point.y)) {
            return new THREE.Vector3(point.x, point.y, point.z ?? 0);
        }
    }
    return undefined;
};

/**
 * FluxEdge — a curved, tapered ribbon with a soft additive halo. The surface narrows toward both
 * endpoints, so an edge reads as a suspended flux filament rather than a stroke between two balls.
 * One general registered edge type; the shape comes only from `data`, never from host identity.
 *
 * data options: weight, minRadius, maxRadius, color, curve (bend fraction), inset (endpoint trim),
 * halo (0-1 glow strength), collar (0-1 square flange at each trimmed end), sheath (0-1 highlight
 * along one side), opacity, path (optional corridor waypoints, routed through the source and target,
 * for cross-scope edges that must leave the node field).
 */

/** Endpoint flange keeps a blunt square where a ribbon meets its card; 0 keeps the tapered tip. */
export const fluxRadius = (width: number, taper: number, collar: number, index: number, last: number): number => {
    const tapered = width * (0.32 + 0.68 * Math.pow(taper, 0.6)) * 0.5;
    return collar > 0 && (index === 0 || index === last)
        ? Math.max(tapered, width * 0.5 * clamp(collar, 0, 1))
        : tapered;
};

/** One-sided translucent highlight: the lit side carries salience, the shaded side recedes. */
export const fluxBrightness = (base: number, sheath: number, lit: boolean): number =>
    clamp(base + (lit ? sheath * 0.5 : -sheath * 0.12), 0, 1);

export class FluxEdge extends Edge {
    static readonly typeName: string = 'FluxEdge';

    readonly mesh!: THREE.Mesh;
    readonly halo!: THREE.Mesh;
    readonly arrow!: THREE.Mesh;

    readonly #positions = new Float32Array((SEGMENTS + 1) * 6);
    readonly #haloPositions = new Float32Array((SEGMENTS + 1) * 6);
    readonly #colors = new Float32Array((SEGMENTS + 1) * 8);
    readonly #haloColors = new Float32Array((SEGMENTS + 1) * 8);
    readonly #curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
    );
    readonly #point = new THREE.Vector3();
    readonly #tangent = new THREE.Vector3();
    readonly #side = new THREE.Vector3();
    #bundle?: THREE.CatmullRomCurve3;
    #bundleSource?: unknown;
    _initialized = false;

    constructor(sg: SpaceGraph | undefined, spec: EdgeSpec, source: Node, target: Node) {
        super(sg, spec, source, target);
        this.suppressLine = true;
        this.object.visible = false;

        const indices: number[] = [];
        for (let index = 0; index < SEGMENTS; index++) {
            const base = index * 2;
            indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
        }

        const geometry = (positions: Float32Array, colors: Float32Array): THREE.BufferGeometry => {
            const result = new THREE.BufferGeometry();
            result.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            result.setAttribute('color', new THREE.BufferAttribute(colors, 4));
            result.setIndex(indices);
            return result;
        };
        const color = (spec.data?.color as number | undefined) ?? 0x3b82f6;

        this.mesh = new THREE.Mesh(geometry(this.#positions, this.#colors), this.material(color, 1, false));
        this.halo = new THREE.Mesh(
            geometry(this.#haloPositions, this.#haloColors),
            this.material(color, 0.18, true),
        );
        const arrowGeometry = new THREE.BufferGeometry();
        arrowGeometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0, 0.5, 0], 3),
        );
        this.arrow = new THREE.Mesh(
            arrowGeometry,
            new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, depthWrite: false }),
        );
        this.arrow.userData = { edgeId: this.id, type: 'edge-flux-arrow' };
        this.arrow.visible = false;
        this.mesh.userData = { edgeId: this.id, type: 'edge-flux' };
        this.halo.userData = { edgeId: this.id, type: 'edge-flux-halo' };
        this.mesh.renderOrder = -1;
        this.halo.renderOrder = -2;
        this.arrow.renderOrder = 0;
        this.sg?.renderer.scene.add(this.halo, this.mesh, this.arrow);
        this._initialized = true;
    }

    private material(color: number, opacity: number, additive: boolean): THREE.MeshBasicMaterial {
        return new THREE.MeshBasicMaterial({
            color,
            vertexColors: true,
            side: THREE.DoubleSide,
            transparent: true,
            opacity,
            depthWrite: false,
            blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        });
    }

    /** The active sampling curve: a corridor when `data.path` is set, otherwise the direct bow. */
    private syncPath(
        source: THREE.Vector3,
        target: THREE.Vector3,
        curveStrength: number,
    ): THREE.Curve<THREE.Vector3> {
        const ribbon = this.data.ribbon as { path?: unknown } | undefined;
        const declared = this.data.path ?? ribbon?.path;
        const mids = Array.isArray(declared) ? declared.map(waypoint).filter((p): p is THREE.Vector3 => !!p) : [];

        if (mids.length === 0) {
            this.#bundle = undefined;
            this.#bundleSource = undefined;
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const length = Math.hypot(dx, dy) || 1;
            const bow = curveStrength * Math.min(length, 320);
            this.#curve.v0.copy(source);
            this.#curve.v2.copy(target);
            this.#curve.v1.set(
                (source.x + target.x) / 2 - (dy / length) * bow,
                (source.y + target.y) / 2 + (dx / length) * bow,
                (source.z + target.z) / 2,
            );
            return this.#curve;
        }

        if (this.#bundleSource !== declared || !this.#bundle) {
            this.#bundle = new THREE.CatmullRomCurve3([source, ...mids, target], false, 'centripetal');
            this.#bundleSource = declared;
        } else {
            this.#bundle.points[0].copy(source);
            this.#bundle.points[this.#bundle.points.length - 1]!.copy(target);
        }
        return this.#bundle;
    }

    update(): void {
        if (!this._initialized) return;
        const { sourcePos, targetPos } = this.endpointPositions();
        if (!Number.isFinite(sourcePos.x) || !Number.isFinite(targetPos.x)) return;

        const width = ribbonWidth(this.data);
        const inset = clamp((this.data.inset as number | undefined) ?? 0.08, 0, 0.45);
        const curveStrength = clamp((this.data.curve as number | undefined) ?? 0.1, 0, 0.6);
        const halo = clamp((this.data.halo as number | undefined) ?? 0.45, 0, 1);
        const collar = clamp((this.data.collar as number | undefined) ?? 0, 0, 1);
        const sheath = clamp((this.data.sheath as number | undefined) ?? 0, 0, 1);

        const path = this.syncPath(sourcePos, targetPos, curveStrength);

        const core = this.mesh.material as THREE.MeshBasicMaterial;
        const glow = this.halo.material as THREE.MeshBasicMaterial;
        for (let index = 0; index <= SEGMENTS; index++) {
            const t = inset + (1 - 2 * inset) * (index / SEGMENTS);
            path.getPoint(t, this.#point);
            path.getTangent(t, this.#tangent).normalize();
            this.#side.set(-this.#tangent.y, this.#tangent.x, 0).normalize();
            const taper = Math.sin(Math.PI * (index / SEGMENTS));
            const radius = fluxRadius(width, taper, collar, index, SEGMENTS);
            const haloRadius = radius * (2 + halo * 1.6);
            const brightness = 0.48 + 0.52 * taper;
            const alpha = 0.6 + 0.4 * taper;

            for (let edge = 0; edge < 2; edge++) {
                const sign = edge === 0 ? -1 : 1;
                const offset = (index * 2 + edge) * 3;
                const radial = sign > 0 ? radius : -radius;
                const glowRadial = sign > 0 ? haloRadius : -haloRadius;
                const lit = fluxBrightness(brightness, sheath, sign > 0);
                this.#positions[offset] = this.#point.x + this.#side.x * radial;
                this.#positions[offset + 1] = this.#point.y + this.#side.y * radial;
                this.#positions[offset + 2] = this.#point.z;
                this.#haloPositions[offset] = this.#point.x + this.#side.x * glowRadial;
                this.#haloPositions[offset + 1] = this.#point.y + this.#side.y * glowRadial;
                this.#haloPositions[offset + 2] = this.#point.z;
                const colorOffset = (index * 2 + edge) * 4;
                this.#colors[colorOffset] = lit;
                this.#colors[colorOffset + 1] = lit;
                this.#colors[colorOffset + 2] = lit;
                this.#colors[colorOffset + 3] = alpha;
                this.#haloColors[colorOffset] = brightness;
                this.#haloColors[colorOffset + 1] = brightness;
                this.#haloColors[colorOffset + 2] = brightness;
                this.#haloColors[colorOffset + 3] = halo * 0.22 * taper;
            }
        }
        for (const mesh of [this.mesh, this.halo, this.arrow]) {
            mesh.geometry.attributes.position!.needsUpdate = true;
        }
        for (const mesh of [this.mesh, this.halo]) {
            mesh.geometry.attributes.color!.needsUpdate = true;
        }
        core.opacity = (this.data.opacity as number | undefined) ?? 1;

        this.arrow.visible = Boolean(this.data.arrowhead);
        if (this.arrow.visible) {
            const tip = inset + (1 - 2 * inset) * 0.96;
            path.getPoint(tip, this.#point);
            path.getTangent(tip, this.#tangent).normalize();
            this.arrow.position.copy(this.#point);
            this.arrow.rotation.z = -Math.atan2(this.#tangent.x, this.#tangent.y);
            const arrowSize = Math.max(4, width * 0.85);
            this.arrow.scale.set(arrowSize, arrowSize, 1);
        }
    }

    updateSpec(updates: Partial<EdgeSpec>): this {
        super.updateSpec(updates);
        const color = dataColor(updates.data?.color);
        if (color) {
            (this.mesh.material as THREE.MeshBasicMaterial).color.set(color);
            (this.halo.material as THREE.MeshBasicMaterial).color.set(color);
            (this.arrow.material as THREE.MeshBasicMaterial).color.set(color);
        }
        return this;
    }

    dispose(): void {
        for (const mesh of [this.mesh, this.halo, this.arrow]) ThreeDisposer.disposeAndDetach(mesh);
        super.dispose();
    }
}
