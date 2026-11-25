import gsap from 'gsap';
import { ThreeDisposer } from '../utils';
import * as THREE from 'three';
import {
    type Bounds3D,
    type HitResult,
    type Rect,
    Surface,
    createBounds3D,
    rectOf,
} from '../core/Surface';
import { resolveTheme, applyNodeTheme, type ResolvedTheme } from '../core/theme';
import { projectToNdc } from '../utils/projection';
import { safeClone } from '../utils/math';
import type { ControlState } from '../plugins/interaction/ControlStateBorder';
import type { SpaceGraph } from '../SpaceGraph';
import type { AnimationProps, NodeData, NodeSpec } from '../types';
import { resolveNodeBounds, type NodeBounds } from '../layout/node-bounds';

export interface VisibilityContext {
    cameraFrustum: THREE.Frustum;
    viewportBounds: { width: number; height: number };
    minPixelSize: number;
    cameraPosition: THREE.Vector3;
}

export type LODLevel = 'high' | 'medium' | 'low' | 'hidden';

interface PositionTween {
    x?: number;
    y?: number;
    z?: number;
    duration?: number;
    ease?: string;
    delay?: number;
    onComplete?: () => void;
}

type BooleanDataFlag = 'fixed' | 'pinned' | 'selectable' | 'draggable';

export abstract class Node extends Surface {
    /** Whether a move may be tweened; hosts that drive their own frame loop turn this off. */
    private static get canAnimate(): boolean {
        return (globalThis as { process?: unknown }).process !== undefined;
    }

    readonly id: string;
    readonly type: string;
    public sg?: SpaceGraph;
    public label?: string;
    public data: NodeData;
    public position: THREE.Vector3;
    public rotation: THREE.Vector3;
    public scale: THREE.Vector3;
    public controlState: ControlState = 'normal';
    /**
     * Whether hovering grows the node. A card draws its hover as an outline around itself, and a card
     * that grows moves the controls under the reader's finger.
     */
    readonly scalesOnHover: boolean = true;
    public focusable = false;
    public focused = false;
    public readonly isNode = true;
    public readonly resolvedTheme: ResolvedTheme;
    /** Box outline drawn around a mesh node for focus/selection/hover. Undefined until shown. */
    public outlineObject?: THREE.BoxHelper;
    protected lastVisualState?: ControlState;
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

    constructor(sgOrSpec?: SpaceGraph | NodeSpec, maybeSpec?: NodeSpec) {
        super();
        const isSpecOnly = !!(sgOrSpec && 'id' in sgOrSpec);
        this.sg = isSpecOnly ? undefined : (sgOrSpec as SpaceGraph);
        const spec = isSpecOnly ? (sgOrSpec as NodeSpec) : maybeSpec;
        this.id = spec?.id ?? '';
        this.type = spec?.type ?? '';
        this.label = spec?.label;
        this.data = applyNodeTheme(spec?.data ?? {}, this.sg?.options?.theme);
        this.resolvedTheme = resolveTheme(this.sg?.options?.theme);
        // A node that is not interactive is a backdrop: it does not answer the pointer.
        if (this.data?.interactive === false) this.isTouchable = false;
        this.position = Node._parseVector3(spec?.position, [0, 0, 0]);
        this.rotation = Node._parseVector3(spec?.rotation, [0, 0, 0]);
        this.scale = Node._parseVector3(spec?.scale, [1, 1, 1]);
    }

    get worldMatrix(): THREE.Matrix4 {
        return this.object.matrixWorld;
    }

    /** Node opacity from `data.opacity`, defaulting to fully opaque. */
    get opacity(): number {
        return typeof this.data?.opacity === 'number' ? this.data.opacity : 1;
    }

    get bounds(): Rect {
        return rectOf(new THREE.Box3().setFromObject(this.object));
    }

    get bounds3D(): Bounds3D {
        const box = new THREE.Box3().setFromObject(this.object);

        return createBounds3D(box.min, box.max, {
            containsPoint: (point) => box.containsPoint(point),
            intersectsRay: (ray) => ray.ray.intersectsBox(box),
        });
    }

    /**
     * Get the layout bounds for this node.
     * Used by size-aware layouts to compute spacing and collision.
     * Priority: data.width/height → class size (HtmlNode) → bounds3D fallback → documented defaults (200×100)
     */
    getLayoutBounds(): NodeBounds {
        return resolveNodeBounds(this, () => {
            const obj = this.object as THREE.Object3D | undefined;
            if (!obj || typeof obj.traverse !== 'function') return undefined;
            try {
                const box = this.bounds3D;
                const size = box.max.clone().sub(box.min);
                if (size.x > 0 && size.y > 0)
                    return { width: size.x, height: size.y, depth: size.z || 1 };
            } catch {
                // bounds3D may fail if the object is not ready
            }
            return undefined;
        });
    }

    private static _parseVector3(
        spec: number[] | undefined,
        defaults: [number, number, number],
    ): THREE.Vector3 {
        return new THREE.Vector3(
            spec?.[0] ?? defaults[0],
            spec?.[1] ?? defaults[1],
            spec?.[2] ?? defaults[2],
        );
    }

    hitTest(raycaster: THREE.Raycaster): HitResult | null {
        if (!this.visible || !this.isTouchable) return null;
        return this.hitTestObject(raycaster, this.object);
    }

    /**
     * The first intersection of a ray with a part of this node, in the node's own coordinates.
     */
    protected hitTestObject(
        raycaster: THREE.Raycaster,
        target: THREE.Object3D,
        { recursive = true, normal = true }: { recursive?: boolean; normal?: boolean } = {},
    ): HitResult | null {
        const intersects = raycaster.intersectObject(target, recursive);
        if (!intersects.length) return null;

        const hit = intersects[0];
        return {
            surface: this,
            point: hit.point,
            localPoint: this.object.worldToLocal(hit.point.clone()),
            distance: hit.distance,
            normal: normal
                ? hit.face?.normal
                      ?.clone()
                      .applyMatrix4(new THREE.Matrix4().extractRotation(this.object.matrixWorld))
                : undefined,
            uv: hit.uv,
            face: hit.face ?? undefined,
        };
    }

    isVisible(context: VisibilityContext): boolean {
        if (!this.visible) return false;

        if (!context.cameraFrustum.intersectsBox(this.#lodBounds())) return false;

        const pixelSize = this.getScreenPixelSize(context.viewportBounds);
        if (pixelSize < context.minPixelSize) return false;

        return true;
    }

    getScreenPixelSize(viewport: { width: number; height: number }): number {
        const bounds = this.#lodBounds().getSize(new THREE.Vector3());
        const heightPercent = (bounds.y / viewport.height) * 100;
        const widthPercent = (bounds.x / viewport.width) * 100;
        return Math.min(heightPercent, widthPercent);
    }

    // Bounds recomputed at most once per render frame; the renderer advances the frame token.
    static lodFrame = 0;
    #lodBoundsFrame = -1;
    #lodBoundsBox?: THREE.Box3;

    #lodBounds(): THREE.Box3 {
        if (this.#lodBoundsFrame !== Node.lodFrame || !this.#lodBoundsBox) {
            this.#lodBoundsBox = new THREE.Box3().setFromObject(this.object);
            this.#lodBoundsFrame = Node.lodFrame;
        }
        return this.#lodBoundsBox;
    }

    computeLOD(context: VisibilityContext): LODLevel {
        if (!this.visible) return 'hidden';
        const data = this.data as Record<string, unknown>;
        const zoom = this.sg?.renderer?.getZoom?.();
        const minZoom = data.minZoom as number | undefined;
        const maxZoom = data.maxZoom as number | undefined;
        if (
            zoom !== undefined &&
            ((minZoom !== undefined && zoom < minZoom) || (maxZoom !== undefined && zoom > maxZoom))
        ) {
            return 'hidden';
        }
        const pixelSize = this.getScreenPixelSize(context.viewportBounds);
        if (pixelSize < (context.minPixelSize ?? 0.5)) return 'hidden';
        const override = data.lod as LODLevel | undefined;
        if (override) return override;
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

    protected get surfaceKind(): string {
        return 'Node';
    }

    /** Request a render frame from the SpaceGraph instance if available. */
    protected requestFrame(): void {
        this.sg?.requestFrame?.();
    }

    /** Announce that one of this node's data fields changed. */
    protected emitDataChanged(
        property: string,
        value: unknown,
        extra?: Record<string, unknown>,
    ): void {
        this.sg?.events.emit('node:dataChanged', { node: this, property, value, ...extra });
    }

    /** Write one data field and announce the change through a single writer. */
    protected setDataField(property: string, value: unknown, extra?: Record<string, unknown>): void {
        this.data = { ...this.data, [property]: value };
        this.emitDataChanged(property, value, extra);
    }

    private applySpecVector(target: THREE.Vector3, incoming: [number, number, number] | undefined): boolean {
        if (incoming === undefined) return false;
        target.fromArray(incoming);
        return true;
    }

    private commitSpecChanges(changes: Partial<NodeSpec>): void {
        if (
            !changes.label &&
            !changes.data &&
            !changes.position &&
            !changes.rotation &&
            !changes.scale
        )
            return;
        this.emit('node:updated', { node: this, changes, timestamp: Date.now() });
        this.requestFrame();
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
            if (updates.data.interactive !== undefined) {
                this.isTouchable = updates.data.interactive !== false;
            }
        }

        if (this.applySpecVector(this.position, updates.position)) changes.position = updates.position;
        if (this.applySpecVector(this.rotation, updates.rotation)) changes.rotation = updates.rotation;
        if (this.applySpecVector(this.scale, updates.scale)) changes.scale = updates.scale;

        this.commitSpecChanges(changes);
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

    /** Writes the Surface flag, optionally mirroring it onto the Object3D. */
    private setVisibleFlag(visible: boolean, withObject = false): this {
        this.visible = visible;
        if (withObject) (this.object as { visible: boolean }).visible = visible;
        return this;
    }

    // Ergonomic visibility controls
    show(): this {
        return this.setVisibleFlag(true);
    }

    hide(): this {
        return this.setVisibleFlag(false);
    }

    toggleVisible(): this {
        return this.setVisibleFlag(!this.visible);
    }

    setVisible(visible: boolean): this {
        return visible ? this.enable() : this.disable();
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
        return this.setControlState(highlight ? 'selected' : 'normal');
    }

    updatePosition(x: number, y: number, z: number): this {
        this.position.set(x, y, z);
        this.object?.position.copy(this.position);
        // The outline is a separate object: it has to be told the node moved, or it stays behind.
        this.outlineObject?.update();
        return this;
    }

    /** Aligns the Object3D transform with the spec-parsed position after construction. */
    protected syncSpecTransform(): void {
        this.updatePosition(this.position.x, this.position.y, this.position.z);
    }

    moveBy(dx: number, dy: number, dz = 0): this {
        return this.updatePosition(
            this.position.x + dx,
            this.position.y + dy,
            this.position.z + dz,
        );
    }

    /** Shared move path: snap when animation is off or unavailable, otherwise tween. */
    private movePosition(target: THREE.Vector3, animate: boolean, duration: number, delay?: number): this {
        if (!animate || !Node.canAnimate) return this.snapTo(target);
        this.tweenPosition({
            x: target.x,
            y: target.y,
            z: target.z,
            duration,
            ease: 'power2.out',
            ...(delay === undefined ? {} : { delay }),
        });
        return this;
    }

    moveTo(target: THREE.Vector3, animate = true, duration = 0.5): this {
        return this.movePosition(target, animate, duration);
    }

    centerAt(x: number, y: number, z = 0): this {
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

    isDraggable(_localPos?: THREE.Vector3): boolean {
        if (this.data?.draggable === false) return false;
        return true;
    }

    focus(): void {
        this.focused = true;
        this.syncVisual();
        this.emit('focus', { node: this });
    }

    blur(): void {
        this.focused = false;
        this.syncVisual();
        this.emit('blur', { node: this });
    }

    /** Single writer for `controlState` so mesh/DOM visuals stay in sync with interaction state. */
    setControlState(state: ControlState): this {
        if (this.controlState === state) return this;
        this.controlState = state;
        this.syncVisual();
        return this;
    }

    // Show or hide the node's interaction visual (mesh outline or DOM outline) for the current state.
    protected syncVisual(): void {
        this.setOutlineState(this.visualState());
    }

    /** The interaction state the node's visuals reflect: focus wins over the control state. */
    protected visualState(): ControlState {
        return this.focused ? 'focus' : this.controlState;
    }

    /** The theme colour a control state draws with; undefined when the state carries no colour. */
    protected controlStateColor(state: ControlState): string | number | undefined {
        if (state === 'focus') return this.resolvedTheme.focus;
        if (state === 'selected') return this.resolvedTheme.selection;
        if (state === 'hovered') return this.resolvedTheme.hover;
        return undefined;
    }

    protected setOutlineState(state: ControlState): void {
        const color = this.controlStateColor(state);
        const scene = this.sg?.renderer?.scene;
        if (color === undefined || !scene) {
            if (this.outlineObject) this.outlineObject.visible = false;
            return;
        }
        if (!this.outlineObject) {
            this.outlineObject = new THREE.BoxHelper(
                this.object,
                color as THREE.ColorRepresentation,
            );
            (this.outlineObject.material as THREE.LineBasicMaterial).depthTest = false;
            this.outlineObject.renderOrder = 1000;
            scene.add(this.outlineObject);
        }
        (this.outlineObject.material as THREE.LineBasicMaterial).color.set(
            color as THREE.ColorRepresentation,
        );
        this.outlineObject.visible = true;
        this.outlineObject.update();
        this.requestFrame();
    }

    animate(props: AnimationProps): this {
        const { scale, ...positionProps } = props;

        this.tweenPosition(positionProps);

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

    tween(
        targets: Record<string, number>,
        options: { duration?: number; ease?: string; delay?: number; onComplete?: () => void } = {},
    ): this {
        const { duration = 0.5, ease = 'power2.out', delay = 0, onComplete } = options;
        this.tweenPosition({ ...targets, duration, ease, delay, onComplete });
        return this;
    }

    /**
     * Tween the node's position, keeping the world transform in step with it.
     */
    private tweenPosition(vars: PositionTween): void {
        gsap.to(this.position, {
            ...vars,
            onUpdate: () => {
                this.object.position.copy(this.position);
            },
        });
    }

    /**
     * Put the node at a position right away, with no tween.
     */
    private snapTo(target: THREE.Vector3): this {
        this.position.copy(target);
        this.object.position.copy(target);
        return this;
    }

    scaleTween(target: number, options: { duration?: number; ease?: string } = {}): this {
        const { duration = 0.5, ease = 'power2.out' } = options;
        gsap.to(this.object.scale, { x: target, y: target, z: target, duration, ease });
        return this;
    }

    fade(opacity: number, duration = 0.3): this {
        gsap.to(this.object, {
            duration,
            onUpdate: () => {
                this.object.traverse((child) => {
                    if ('material' in child) {
                        const mat = (
                            child as { material: { opacity: number; transparent: boolean } }
                        ).material;
                        if (mat) {
                            mat.opacity = opacity;
                            mat.transparent = opacity < 1;
                        }
                    }
                });
            },
        });
        return this;
    }

    lookAt(target: THREE.Vector3 | Node): this {
        this.object.lookAt(positionOf(target));
        return this;
    }

    getDistanceTo(other: Node | THREE.Vector3): number {
        return this.position.distanceTo(positionOf(other));
    }

    getAngleTo(other: Node | THREE.Vector3): number {
        const dir = positionOf(other).clone().sub(this.position);
        return Math.atan2(dir.y, dir.x);
    }

    isFullyVisible(): boolean {
        return this.visible && this.object.visible;
    }

    isOffscreen(camera: THREE.Camera, threshold = 0): boolean {
        this.object.updateMatrixWorld();
        const pos = projectToNdc(this.object.position, camera);
        const bounds = 1 + threshold;
        return pos.x < -bounds || pos.x > bounds || pos.y < -bounds || pos.y > bounds;
    }

    getScreenPosition(camera: THREE.Camera): { x: number; y: number; visible: boolean } {
        const pos = projectToNdc(this.position, camera);
        return {
            x: (pos.x + 1) / 2,
            y: (-pos.y + 1) / 2,
            visible: pos.z < 1,
        };
    }


    enable(): this {
        return this.setVisibleFlag(true, true);
    }

    disable(): this {
        return this.setVisibleFlag(false, true);
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

    rotateBy(x = 0, y = 0, z = 0): this {
        this.rotation.x += x;
        this.rotation.y += y;
        this.rotation.z += z;
        this.object.rotation.copy(this.rotation as any);
        return this;
    }

    getWorldPosition(target: THREE.Vector3): THREE.Vector3 {
        if (this.object) {
            this.object.updateMatrixWorld();
            return this.object.getWorldPosition(target);
        }
        return target.copy(this.position);
    }

    private setDataFlag(flag: BooleanDataFlag, value: boolean): this {
        this.data[flag] = value;
        return this;
    }

    /** Opt-in flags read `=== true`; opt-out flags read `!== false`. */
    private readDataFlag(flag: BooleanDataFlag, absentIsTrue: boolean): boolean {
        const value = this.data[flag];
        return absentIsTrue ? value !== false : value === true;
    }

    setFixed(fixed = true): this {
        return this.setDataFlag('fixed', fixed);
    }

    isFixed(): boolean {
        return this.readDataFlag('fixed', false);
    }

    setPinned(pinned = true): this {
        return this.setDataFlag('pinned', pinned);
    }

    isPinned(): boolean {
        return this.readDataFlag('pinned', false);
    }

    setSelectable(selectable = true): this {
        return this.setDataFlag('selectable', selectable);
    }

    isSelectable(): boolean {
        return this.readDataFlag('selectable', true);
    }

    setDraggable(draggable = true): this {
        return this.setDataFlag('draggable', draggable);
    }


    /** Normalize tags from array or comma-separated string to a clean array. */
    #normalizeTags(): string[] {
        const tags = this.data.tags;
        if (Array.isArray(tags)) return tags;
        if (typeof tags === 'string')
            return tags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean);
        return [];
    }

    hasTag(tag: string): boolean {
        return this.#normalizeTags().includes(tag);
    }

    addTag(tag: string): this {
        const tags = this.#normalizeTags();
        if (!tags.includes(tag)) tags.push(tag);
        this.data.tags = tags;
        return this;
    }

    removeTag(tag: string): this {
        const tags = this.#normalizeTags().filter((t) => t !== tag);
        this.data.tags = tags;
        return this;
    }

    getTags(): string[] {
        return this.#normalizeTags();
    }

    #spec(overrides: Partial<NodeSpec> = {}): NodeSpec {
        return {
            id: this.id,
            type: this.type,
            label: this.label,
            position: [this.position.x, this.position.y, this.position.z],
            data: { ...this.data },
            ...overrides,
        };
    }

    clone(newId: string, offset: readonly [number, number, number] = [20, 20, 0]): Node | null {
        return (
            this.sg?.graph.addNode(
                this.#spec({
                    id: newId,
                    position: [
                        this.position.x + offset[0],
                        this.position.y + offset[1],
                        this.position.z + offset[2],
                    ],
                }),
            ) ?? null
        );
    }

    replaceWith(newType: string): Node | null {
        if (!this.sg) return null;
        const newNode = this.sg.graph.addNode(this.#spec({ type: newType }));
        this.dispose();
        return newNode;
    }

    applyPosition(
        target: THREE.Vector3,
        {
            animate = true,
            duration = 1.0,
            delay = 0,
        }: { animate?: boolean; duration?: number; delay?: number } = {},
    ): this {
        return this.movePosition(target, animate, duration, delay);
    }

    toJSON(): NodeSpec {
        return {
            ...this.#spec(),
            rotation: [this.rotation.x, this.rotation.y, this.rotation.z] as [
                number, number, number,
            ],
            scale: [this.scale.x, this.scale.y, this.scale.z] as [number, number, number],
            data: safeClone(this.data),
        };
    }

    dispose(): void {
        this.destroySurface('node', () => {
            this.object.parent?.remove(this.object);
            if (this.outlineObject) {
                this.outlineObject.parent?.remove(this.outlineObject);
                this.outlineObject.geometry?.dispose();
                (this.outlineObject.material as THREE.Material)?.dispose();
                this.outlineObject = undefined;
            }
            ThreeDisposer.dispose(this.object);
        });
    }
}

/** The position of a node or of a vector, so a caller may hand over either. */
function positionOf(target: THREE.Vector3 | Node): THREE.Vector3 {
    return 'position' in target ? target.position : target;
}
