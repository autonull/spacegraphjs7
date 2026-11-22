import * as THREE from 'three';
import type { Node } from '../nodes/Node';
import type { SpaceGraph } from '../SpaceGraph';
import type { EdgeSpec } from '../types';
import { dataColor } from '../utils/color';
import { clamp } from '../utils/math';
import { Edge } from './Edge';

const SEGMENTS = 12;

/**
 * FluxEdge — a curved, tapered ribbon with a soft additive halo. The surface narrows toward both
 * endpoints, so an edge reads as a suspended flux filament rather than a stroke between two balls.
 * One general registered edge type; the shape comes only from `data`, never from host identity.
 *
 * data options: weight, minRadius, maxRadius, color, curve (bend fraction), inset (endpoint trim),
 * halo (0-1 glow strength), opacity.
 */
export class FluxEdge extends Edge {
    static readonly typeName: string = 'FluxEdge';

    readonly mesh!: THREE.Mesh;
    readonly halo!: THREE.Mesh;

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
        this.mesh.userData = { edgeId: this.id, type: 'edge-flux' };
        this.halo.userData = { edgeId: this.id, type: 'edge-flux-halo' };
        this.mesh.renderOrder = -1;
        this.halo.renderOrder = -2;
        this.sg?.renderer.scene.add(this.halo, this.mesh);
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

    update(): void {
        if (!this._initialized) return;
        const { sourcePos, targetPos } = this.endpointPositions();
        if (!Number.isFinite(sourcePos.x) || !Number.isFinite(targetPos.x)) return;

        const { weight = 0.5, minRadius = 1, maxRadius = 8 } = this.data;
        const width =
            (minRadius as number) + clamp(weight as number, 0, 1) * ((maxRadius as number) - (minRadius as number));
        const inset = clamp((this.data.inset as number | undefined) ?? 0.08, 0, 0.45);
        const curveStrength = clamp((this.data.curve as number | undefined) ?? 0.1, 0, 0.6);
        const halo = clamp((this.data.halo as number | undefined) ?? 0.45, 0, 1);

        const dx = targetPos.x - sourcePos.x;
        const dy = targetPos.y - sourcePos.y;
        const length = Math.hypot(dx, dy) || 1;
        const bow = curveStrength * Math.min(length, 320);
        this.#curve.v0.copy(sourcePos);
        this.#curve.v2.copy(targetPos);
        this.#curve.v1.set(
            (sourcePos.x + targetPos.x) / 2 - (dy / length) * bow,
            (sourcePos.y + targetPos.y) / 2 + (dx / length) * bow,
            (sourcePos.z + targetPos.z) / 2,
        );

        const core = this.mesh.material as THREE.MeshBasicMaterial;
        const glow = this.halo.material as THREE.MeshBasicMaterial;
        for (let index = 0; index <= SEGMENTS; index++) {
            const t = inset + (1 - 2 * inset) * (index / SEGMENTS);
            this.#curve.getPoint(t, this.#point);
            this.#curve.getTangent(t, this.#tangent).normalize();
            this.#side.set(-this.#tangent.y, this.#tangent.x, 0).normalize();
            const taper = Math.sin(Math.PI * (index / SEGMENTS));
            const radius = width * (0.32 + 0.68 * Math.pow(taper, 0.6)) * 0.5;
            const haloRadius = radius * (2 + halo * 1.6);
            const brightness = 0.48 + 0.52 * taper;
            const alpha = 0.6 + 0.4 * taper;

            for (let edge = 0; edge < 2; edge++) {
                const sign = edge === 0 ? -1 : 1;
                const offset = (index * 2 + edge) * 3;
                const radial = sign > 0 ? radius : -radius;
                const glowRadial = sign > 0 ? haloRadius : -haloRadius;
                this.#positions[offset] = this.#point.x + this.#side.x * radial;
                this.#positions[offset + 1] = this.#point.y + this.#side.y * radial;
                this.#positions[offset + 2] = this.#point.z;
                this.#haloPositions[offset] = this.#point.x + this.#side.x * glowRadial;
                this.#haloPositions[offset + 1] = this.#point.y + this.#side.y * glowRadial;
                this.#haloPositions[offset + 2] = this.#point.z;
                const colorOffset = (index * 2 + edge) * 4;
                this.#colors[colorOffset] = brightness;
                this.#colors[colorOffset + 1] = brightness;
                this.#colors[colorOffset + 2] = brightness;
                this.#colors[colorOffset + 3] = alpha;
                this.#haloColors[colorOffset] = brightness;
                this.#haloColors[colorOffset + 1] = brightness;
                this.#haloColors[colorOffset + 2] = brightness;
                this.#haloColors[colorOffset + 3] = halo * 0.22 * taper;
            }
        }
        for (const mesh of [this.mesh, this.halo]) {
            mesh.geometry.attributes.position!.needsUpdate = true;
            mesh.geometry.attributes.color!.needsUpdate = true;
        }
        core.opacity = (this.data.opacity as number | undefined) ?? 1;
    }

    updateSpec(updates: Partial<EdgeSpec>): this {
        super.updateSpec(updates);
        const color = dataColor(updates.data?.color);
        if (color) {
            (this.mesh.material as THREE.MeshBasicMaterial).color.set(color);
            (this.halo.material as THREE.MeshBasicMaterial).color.set(color);
        }
        return this;
    }

    dispose(): void {
        for (const mesh of [this.mesh, this.halo]) {
            mesh.parent?.remove(mesh);
            mesh.geometry.dispose();
            (mesh.material as THREE.Material).dispose();
        }
        super.dispose();
    }
}
