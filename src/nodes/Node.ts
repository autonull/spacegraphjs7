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

export interface VisibilityContext {
    cameraFrustum: THREE.Frustum;
    viewportBounds: { width: number; height: number };
    minPixelSize: number;
    cameraPosition: THREE.Vector3;
}

export type LODLevel = 'high' | 'medium' | 'low' | 'hidden';

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

    isVisible(context: VisibilityContext): boolean {
        if (!this.visible) return false;

        const box = new THREE.Box3().setFromObject(this.object);
        if (!context.cameraFrustum.intersectsBox(box)) return false;

        const pixelSize = this.getScreenPixelSize(context.viewportBounds);
        if (pixelSize < context.minPixelSize) return false;

        return true;
    }

    getScreenPixelSize(viewport: { width: number; height: number }): number {
        const bounds = this.bounds3D.size;
        const heightPercent = (bounds.y / viewport.height) * 100;
        const widthPercent = (bounds.x / viewport.width) * 100;
        return Math.min(heightPercent, widthPercent);
    }

    computeLOD(context: VisibilityContext): LODLevel {
        if (!this.visible) return 'hidden';
        const pixelSize = this.getScreenPixelSize(context.viewportBounds);
        if (pixelSize < 0.5) return 'hidden';
        const distance = this.position.distanceTo(context.cameraPosition);
        if (distance < 100) return 'high';
        if (distance < 500) return 'medium';
        return 'low';
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

    // Ergonomic data accessors
    getData<K extends keyof NodeData>(key: K): NodeData[K] {
        return this.data[key];
    }

    setData<K extends keyof NodeData>(key: K, value: NodeData[K]): this {
        this.data[key] = value;
        return this;
    }

    hasData(key: keyof NodeData): boolean {
        return key in this.data;
    }

    removeData(key: keyof NodeData): this {
        delete this.data[key];
        return this;
    }

    // Ergonomic visibility controls
    show(): this {
        this.visible = true;
        return this;
    }

    hide(): this {
        this.visible = false;
        return this;
    }

    toggleVisible(): this {
        this.visible = !this.visible;
        return this;
    }

    // Ergonomic style shortcuts
    setOpacity(opacity: number): this {
        this.data.opacity = opacity;
        return this;
    }

    setColor(color: number | string): this {
        this.data.color = color;
        return this;
    }

    setHighlight(highlight = true): this {
        this.controlState = highlight ? 'highlight' : 'normal';
        return this;
    }

    updatePosition(x: number, y: number, z: number): this {
        this.position.set(x, y, z);
        this.object?.position.copy(this.position);
        return this;
    }

    moveBy(dx: number, dy: number, dz: number = 0): this {
        this.position.addScalar(0);
        this.position.x += dx;
        this.position.y += dy;
        this.position.z += dz;
        this.object?.position.copy(this.position);
        return this;
    }

    moveTo(target: THREE.Vector3, animate = true, duration = 0.5): this {
        if (animate && typeof process !== 'undefined') {
            gsap.to(this.position, {
                x: target.x, y: target.y, z: target.z,
                duration, ease: 'power2.out',
                onUpdate: () => this.object?.position.copy(this.position),
            });
        } else {
            this.position.copy(target);
            this.object?.position.copy(target);
        }
        return this;
    }

    centerAt(x: number, y: number, z: number = 0): this {
        const bounds = this.bounds3D;
        const center = bounds.center;
        this.position.set(x - center.x, y - center.y, z - center.z);
        this.object?.position.copy(this.position);
        return this;
    }

    scaleUniform(s: number): this {
        this.object.scale.set(s, s, s);
        return this;
    }

    scaleBy(factor: number): this {
        this.object.scale.multiplyScalar(factor);
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

    tween(targets: Record<string, number>, options: { duration?: number; ease?: string; delay?: number; onComplete?: () => void } = {}): this {
        const { duration = 0.5, ease = 'power2.out', delay = 0, onComplete } = options;
        gsap.to(this.position, {
            ...targets,
            duration,
            ease,
            delay,
            onUpdate: () => { this.object.position.copy(this.position); },
            onComplete,
        });
        return this;
    }

    scaleTween(target: number, options: { duration?: number; ease?: string } = {}): this {
        const { duration = 0.5, ease = 'power2.out' } = options;
        gsap.to(this.object.scale, { x: target, y: target, z: target, duration, ease });
        return this;
    }

    fade(opacity: number, duration = 0.3): this {
        gsap.to(this.object, { duration, onUpdate: () => { this.object.traverse((child) => { if ('material' in child) { const mat = (child as { material: { opacity: number; transparent: boolean } }).material; if (mat) { mat.opacity = opacity; mat.transparent = opacity < 1; } } }); } });
        return this;
    }

    lookAt(target: THREE.Vector3 | Node): this {
        const targetPos = target instanceof Node ? target.position : target;
        this.object.lookAt(targetPos);
        return this;
    }

    getDistanceTo(other: Node | THREE.Vector3): number {
        const otherPos = other instanceof Node ? other.position : other;
        return this.position.distanceTo(otherPos);
    }

    getAngleTo(other: Node | THREE.Vector3): number {
        const otherPos = other instanceof Node ? other.position : other;
        const dir = otherPos.clone().sub(this.position);
        return Math.atan2(dir.y, dir.x);
    }

    isFullyVisible(): boolean {
        return this.visible && this.object.visible;
    }

    isOffscreen(camera: THREE.Camera, threshold = 0): boolean {
        this.object.updateMatrixWorld();
        const pos = this.object.position.clone().project(camera);
        const bounds = 1 + threshold;
        return pos.x < -bounds || pos.x > bounds || pos.y < -bounds || pos.y > bounds;
    }

    getScreenPosition(camera: THREE.Camera): { x: number; y: number; visible: boolean } {
        const pos = this.position.clone().project(camera);
        return {
            x: (pos.x + 1) / 2,
            y: (-pos.y + 1) / 2,
            visible: pos.z < 1,
        };
    }

    toggle(): this {
        this.visible = !this.visible;
        return this;
    }

    enable(): this {
        this.visible = true;
        (this.object as { visible: boolean }).visible = true;
        return this;
    }

    disable(): this {
        this.visible = false;
        (this.object as { visible: boolean }).visible = false;
        return this;
    }

    setSize(width: number, height: number, depth = 1): this {
        this.scale.set(width, height, depth);
        return this;
    }

    setWidth(width: number): this {
        this.scale.x = width;
        return this;
    }

    setHeight(height: number): this {
        this.scale.y = height;
        return this;
    }

    setDepth(depth: number): this {
        this.scale.z = depth;
        return this;
    }

    getWidth(): number {
        return this.scale.x;
    }

    getHeight(): number {
        return this.scale.y;
    }

    getDepth(): number {
        return this.scale.z;
    }

    setRotation(x: number, y: number, z: number): this {
        this.rotation.set(x, y, z);
        this.object.rotation.set(x, y, z);
        return this;
    }

    rotateBy(x: number = 0, y: number = 0, z: number = 0): this {
        this.rotation.x += x;
        this.rotation.y += y;
        this.rotation.z += z;
        this.object.rotation.copy(this.rotation);
        return this;
    }

    setFixed(fixed = true): this {
        this.data.fixed = fixed;
        return this;
    }

    isFixed(): boolean {
        return this.data.fixed === true;
    }

    setPinned(pinned = true): this {
        this.data.pinned = pinned;
        return this;
    }

    isPinned(): boolean {
        return this.data.pinned === true;
    }

    setSelectable(selectable = true): this {
        this.data.selectable = selectable;
        return this;
    }

    isSelectable(): boolean {
        return this.data.selectable !== false;
    }

    setDraggable(draggable = true): this {
        this.data.draggable = draggable;
        return this;
    }

    isDraggableFlag(): boolean {
        return this.data.draggable !== false;
    }

    hasTag(tag: string): boolean {
        const tags = this.data.tags;
        if (Array.isArray(tags)) return tags.includes(tag);
        if (typeof tags === 'string') return tags.split(',').map(t => t.trim()).includes(tag);
        return false;
    }

    addTag(tag: string): this {
        const tags = this.data.tags ?? [];
        if (Array.isArray(tags)) {
            if (!tags.includes(tag)) tags.push(tag);
        } else if (typeof tags === 'string') {
            const tagSet = new Set(tags.split(',').map(t => t.trim()));
            tagSet.add(tag);
            this.data.tags = Array.from(tagSet).join(', ');
        } else {
            this.data.tags = [tag];
        }
        return this;
    }

    removeTag(tag: string): this {
        const tags = this.data.tags;
        if (Array.isArray(tags)) {
            this.data.tags = tags.filter(t => t !== tag);
        } else if (typeof tags === 'string') {
            this.data.tags = tags.split(',').map(t => t.trim()).filter(t => t !== tag).join(', ');
        }
        return this;
    }

    getTags(): string[] {
        const tags = this.data.tags;
        if (Array.isArray(tags)) return tags;
        if (typeof tags === 'string') return tags.split(',').map(t => t.trim());
        return [];
    }

    clone(newId: string): Node | null {
        return this.sg?.graph.addNode({
            id: newId,
            type: this.type,
            label: this.label,
            position: [this.position.x + 20, this.position.y + 20, this.position.z],
            data: { ...this.data },
        }) ?? null;
    }

    replaceWith(newType: string): Node | null {
        if (!this.sg) return null;
        const newNode = this.sg.graph.addNode({
            id: this.id,
            type: newType,
            label: this.label,
            position: [this.position.x, this.position.y, this.position.z],
            data: { ...this.data },
        });
        this.dispose();
        return newNode;
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
