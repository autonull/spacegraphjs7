import * as THREE from 'three';
import gsap from 'gsap';
import { ThreeDisposer } from '../utils/ThreeDisposer';
import { Surface, type HitResult, type Rect, type Bounds3D } from '../core/Surface';
import type { SpaceGraph } from '../SpaceGraph';
import type { NodeSpec, NodeData, AnimationProps } from '../types';
import type { ControlState } from '../plugins/interaction/ControlStateBorder';

export type NodeEventMap = {
  'node:updated': { node: Node; changes: Partial<NodeSpec>; timestamp: number };
  'node:destroying': { node: Node; timestamp: number };
  'focus': { node: Node };
  'blur': { node: Node };
};

export abstract class Node extends Surface {
  readonly id: string;
  readonly type: string;
  public sg?: SpaceGraph;
  public label?: string;
  public data: NodeData;
  public position: THREE.Vector3;
  public rotation: THREE.Vector3;
  public scale: THREE.Vector3;
  public controlState: ControlState = 'normal';
  public focusable = false;
  public focused = false;
  abstract readonly object: THREE.Object3D;
  callbacks?: {
    onPointerEnter?: (node: Node) => void;
    onPointerLeave?: (node: Node) => void;
    onClick?: (node: Node) => void;
    onDoubleClick?: (node: Node) => void;
    onDragStart?: (node: Node) => void;
    onDragging?: (node: Node) => void;
    onDragStop?: (node: Node) => void;
  };
  actions?: Array<{ icon: string; label: string; action: string }>;

  get worldMatrix(): THREE.Matrix4 {
    return this.object.matrixWorld;
  }

  private static _parseVector3(spec: number[] | undefined, defaults: [number, number, number]): THREE.Vector3 {
    return new THREE.Vector3(
      spec?.[0] ?? defaults[0],
      spec?.[1] ?? defaults[1],
      spec?.[2] ?? defaults[2],
    );
  }

  constructor(sgOrSpec?: SpaceGraph | NodeSpec, maybeSpec?: NodeSpec) {
    super();
    const isSpecOnly = !!(sgOrSpec && 'id' in sgOrSpec);
    this.sg = isSpecOnly ? undefined : (sgOrSpec as SpaceGraph);
    const spec = isSpecOnly ? (sgOrSpec as NodeSpec) : maybeSpec;
    this.id = spec?.id ?? '';
    this.type = spec?.type ?? '';
    this.label = spec?.label;
    this.data = spec?.data ?? {};
    this.position = Node._parseVector3(spec?.position, [0, 0, 0]);
    this.rotation = Node._parseVector3(spec?.rotation, [0, 0, 0]);
    this.scale = Node._parseVector3(spec?.scale, [1, 1, 1]);
  }

    get bounds(): Rect {
        const box = new THREE.Box3().setFromObject(this.object);
        return {
            x: box.min.x,
            y: box.min.y,
            width: box.max.x - box.min.x,
            height: box.max.y - box.min.y,
        };
    }

    get bounds3D(): Bounds3D {
        const box = new THREE.Box3().setFromObject(this.object);
        return {
            min: box.min,
            max: box.max,
            get center() {
                return new THREE.Vector3().addVectors(this.min, this.max).multiplyScalar(0.5);
            },
            get size() {
                return new THREE.Vector3().subVectors(this.max, this.min);
            },
            containsPoint(p: THREE.Vector3) {
                return box.containsPoint(p);
            },
            intersectsRay(ray: THREE.Ray) {
                return ray.intersectsBox(box);
            },
        };
    }

    hitTest(raycaster: THREE.Raycaster): HitResult | null {
        if (!this.visible || !this.isTouchable) return null;

        const intersects = raycaster.intersectObject(this.object, true);
        if (intersects.length > 0) {
            const hit = intersects[0];
            return {
                surface: this,
                point: hit.point,
                localPoint: this.object.worldToLocal(hit.point.clone()),
                distance: hit.distance,
                normal: hit.face?.normal
                    ?.clone()
                    .applyMatrix4(new THREE.Matrix4().extractRotation(this.object.matrixWorld)),
                uv: hit.uv,
                face: hit.face ?? undefined,
            };
        }
        return null;
    }

    start(): void {
        this.pulse(0.5);
    }

    stop(): void {}

    delete(): void {
        this.dispose();
    }

    requireSpaceGraph(): SpaceGraph {
        if (!this.sg) {
            throw new Error(`Node '${this.id}' requires SpaceGraph but sg is not initialized`);
        }
        return this.sg;
    }

    updateSpec(updates: Partial<NodeSpec>): this {
        const changes: Partial<NodeSpec> = {};

        if (updates.label !== undefined && updates.label !== this.label) {
            this.label = updates.label;
            changes.label = updates.label;
        }

        if (updates.data !== undefined) {
            this.data = { ...this.data, ...updates.data };
            changes.data = updates.data;
        }

        if (updates.position !== undefined) {
            this.position.fromArray(updates.position);
            changes.position = updates.position;
        }

        if (updates.rotation !== undefined) {
            this.rotation.fromArray(updates.rotation);
            changes.rotation = updates.rotation;
        }

        if (updates.scale !== undefined) {
            this.scale.fromArray(updates.scale);
            changes.scale = updates.scale;
        }

        if (changes.label || changes.data || changes.position || changes.rotation || changes.scale) {
            this.emit('node:updated', { node: this, changes, timestamp: Date.now() });
        }

        return this;
    }

    updatePosition(x: number, y: number, z: number): this {
        this.position.set(x, y, z);
        this.object?.position.copy(this.position);
        return this;
    }

    scaleUniform(s: number): this {
        this.object.scale.set(s, s, s);
        return this;
    }

    isDraggable(_localPos: THREE.Vector3): boolean {
        return true;
    }

    focus(): void {
        this.focused = true;
        this.emit('focus', { node: this });
    }

    blur(): void {
        this.focused = false;
        this.emit('blur', { node: this });
    }

    onFocus?(): void;
    onBlur?(): void;

animate(props: AnimationProps): this {
    const { scale, ...positionProps } = props;

    gsap.to(this.position, {
        ...positionProps,
        onUpdate: () => { this.object.position.copy(this.position); },
    });

    if (scale !== undefined) {
        gsap.to(this.object.scale, {
            x: scale,
            y: scale,
            z: scale,
            duration: props.duration,
            ease: props.ease,
            delay: props.delay,
        });
    }

    return this;
}

applyPosition(
    target: THREE.Vector3,
    { animate = true, duration = 1.0, delay = 0 }: { animate?: boolean; duration?: number; delay?: number } = {},
): this {
    if (animate && typeof process !== 'undefined') {
        gsap.to(this.position, {
            x: target.x,
            y: target.y,
            z: target.z,
            duration,
            ease: 'power2.out',
            delay,
            onUpdate: () => { this.object.position.copy(this.position); },
        });
    } else {
        this.position.copy(target);
        this.object.position.copy(target);
    }
    return this;
}

    toJSON(): NodeSpec {
        return {
            id: this.id,
            type: this.type,
            label: this.label,
            position: [this.position.x, this.position.y, this.position.z] as [
                number,
                number,
                number,
            ],
            rotation: [this.rotation.x, this.rotation.y, this.rotation.z] as [
                number,
                number,
                number,
            ],
            scale: [this.scale.x, this.scale.y, this.scale.z] as [number, number, number],
            data: { ...this.data },
        };
    }

    dispose(): void {
        this.emit('surface:destroying', { surface: this, timestamp: Date.now() });
        this.emit('node:destroying', { node: this, timestamp: Date.now() });
        this.object.parent?.remove(this.object);
        ThreeDisposer.dispose(this.object);
        this.removeAllListeners();
    }
}
