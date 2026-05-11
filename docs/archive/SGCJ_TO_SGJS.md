# SGCJ → SGJS: Definitive Hybridization Plan

> Deriving the ideal synergy of SpaceGraphC, SpaceGraphJ, and SpaceGraphJS through rigorous adaptation.

---

## Executive Summary

This document presents a comprehensive plan to hybridize SpaceGraphJS (SGJS) with the architectural patterns from SpaceGraphC (SGC) and SpaceGraphJ (SGJ). Previous migration attempts (`SG_to_SGJS.md`, `UNIFIED_ARCHITECTURE.md`) identified patterns but implemented them incompletely, leaving disconnected fragments. This plan provides a **complete, integrated architecture** where Surface, Fingering, and Event Consumption form a unified interaction system—**designed for full 3D generality**.

**Vision**: SpaceGraphJS as the definitive spatial computing platform—combining SGC's physics-embodied interaction model, SGJ's elegant Surface/Fingering architecture, and SGJS's modern TypeScript/Three.js rendering stack.

**Key Principle**: All architecture is designed for **3D-first**. Even when scenes appear 2D, the underlying systems must handle full XYZ coordinates, arbitrary camera orientations, depth-based interactions, and volumetric spatial queries.

---

## Part I: Architectural Synthesis

### 1.1 The Three Codebase Philosophies

| Codebase         | Core Philosophy                 | Key Innovation                                                                                              |
| ---------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **SpaceGraphC**  | Embodied 3D physics interaction | `isDraggable(localPos)` veto, 3D event bubbling, soft constraint picking, physics simulation                |
| **SpaceGraphJ**  | Everything is a Surface         | Unified 2D/3D abstraction, exclusive Fingering states, lazy layout, activity feedback, ray tracing entities |
| **SpaceGraphJS** | Modern 3D rendering stack       | Three.js/WebGL, full 3D TypeScript, plugin architecture, BVH acceleration, CSS3D integration                |

**Synthesis Principle**: SGJS 3D rendering + SGJ Surface/Fingering architecture + SGC physics-embodied interaction semantics.

---

### 1.2 The Integration Challenge

**Previous Attempt Problems:**

1. **Surface exists but Node doesn't extend it** — Surface is orphaned, no actual unification
2. **Fingering exists but CameraControls bypasses it** — Dual event pathways create conflicts
3. **Event consumption exists but DOM events circumvent it** — HtmlNode uses synthetic dispatch
4. **Layout containers exist but lack dirty-flag integration** — Imperative `apply()` calls remain
5. **Activity tracking exists but not wired to rendering** — Visual feedback incomplete
6. **3D interactions treated as edge cases** — Z-axis as afterthought, not first-class

**Root Cause**: Patterns were added as patches, not integrated into a coherent 3D-native architecture.

---

### 1.3 The Unified 3D Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           APPLICATION LAYER                                  │
│  Domain nodes, 3D visualizations, graph topologies, business logic          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SURFACE LAYER (3D-Native, SGJ-inspired)                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │     Node    │  │    Edge     │  │ LayoutNode  │  │   PortNode  │        │
│  │ extends     │  │ extends     │  │ extends     │  │ extends     │        │
│  │  Surface    │  │  Surface    │  │  Surface    │  │  Surface    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                               │
│  Surface provides:                                                           │
│  - bounds3D: AABB in world space                                             │
│  - hitTest(ray): 3D ray intersection                                         │
│  - parent/children: 3D scene graph                                           │
│  - isDraggable(localPos: Vector3): 3D veto                                   │
│  - transform: position/rotation/scale in 3D                                  │
│  - activity: visual feedback state                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FINGERING LAYER (3D Interaction, SGJ + SGC)               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    InputManager + FingerManager                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│  │  │ Resize      │→ │ Wiring      │→ │ NodeDrag    │→ │ BoxSelect   │ │   │
│  │  │ (priority   │  │ (priority   │  │ (priority   │  │ (priority   │ │   │
│  │  │  200)       │  │  150)       │  │  100)       │  │  80)        │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │   │
│  │                                                                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ ┌─────────────┐  │   │
│  │  │ Hover       │→ │ CameraOrbit │→ │ CameraPan   │→│ CameraZoom  │  │   │
│  │  │ (priority   │  │ (priority   │  │ (priority   │ │ (priority   │  │   │
│  │  │  60)        │  │  40)        │  │  30)        │ │  20)        │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘ └─────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  3D-aware: ray-plane intersection, depth-based selection, z-axis drag       │
│  Exclusive state machine: start() → update() → stop() | defer()             │
│  Priority-ordered acquisition: higher priority consumes events              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                     RENDERING LAYER (SGJS 3D Stack)                          │
│  Three.js WebGL + CSS3D | BVH raycasting | Frustum culling | Instancing     │
│  Line2 for 3D edges | GlobeNode | SceneNode (GLTF) | Full depth buffer      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Part II: Core Adaptations (3D-Native)

### 2.1 Surface as Unified 3D Abstraction

**From SGJ**: Everything is a Surface. From SGC: Physics body in 3D space. **To SGJS**: Unified base for nodes, edges, and layout containers with **full 3D support**.

**Current State**: `Surface` class exists but `Node` and `Edge` extend `EventEmitter` directly. Bounds are 2D.

**Target Architecture**:

```typescript
// src/core/Surface.ts
export interface Bounds3D {
    min: THREE.Vector3;
    max: THREE.Vector3;
    get center(): THREE.Vector3;
    get size(): THREE.Vector3;
    containsPoint(p: THREE.Vector3): boolean;
    intersectsRay(ray: THREE.Ray): boolean;
}

export interface HitResult {
    surface: Surface;
    point: THREE.Vector3; // World-space hit point
    localPoint: THREE.Vector3; // Object-local hit point
    distance: number; // From ray origin
    normal?: THREE.Vector3; // Surface normal at hit point
    uv?: THREE.Vector2; // Texture coordinates
    face?: THREE.Face; // For mesh surfaces
}

export abstract class Surface<Events extends Record<string, any> = {}> extends EventEmitter<
    Events & SurfaceEventMap
> {
    abstract readonly id: string;
    abstract readonly type: string;

    // 3D spatial properties
    abstract get bounds3D(): Bounds3D;
    abstract hitTest(ray: THREE.Raycaster): HitResult | null;

    // Transform (3D)
    abstract get position(): THREE.Vector3;
    abstract get rotation(): THREE.Euler;
    abstract get scale(): THREE.Vector3;
    abstract get worldMatrix(): THREE.Matrix4;

    // Scene graph
    parent?: Surface;
    children: Surface[] = [];
    visible = true;
    isTouchable = true;
    activity = 0;

    // SGC: isDraggable veto — 3D local position check
    isDraggable(_localPos: THREE.Vector3): boolean {
        return true;
    }

    // SGJ: lifecycle hooks
    abstract start(): void;
    abstract stop(): void;
    abstract delete(): void;

    // SGJ: per-frame update with 3D activity decay
    onPreRender(dt: number): void {
        this.activity *= Math.exp(-dt / 0.5);
    }

    // Activity pulse
    pulse(intensity: number = 1.0): void {
        this.activity = Math.max(this.activity, intensity);
    }

    // 3D tree navigation
    parentOrSelf(): Surface {
        return this.parent ?? this;
    }

    findParent(predicate: (s: Surface) => boolean): Surface | null {
        let current = this.parent;
        while (current) {
            if (predicate(current)) return current;
            current = current.parent;
        }
        return null;
    }

    // Collect all ancestors in 3D hierarchy
    ancestors(): Surface[] {
        const result: Surface[] = [];
        let current = this.parent;
        while (current) {
            result.push(current);
            current = current.parent;
        }
        return result;
    }

    // Transform a point to world space
    localToWorld(localPos: THREE.Vector3): THREE.Vector3 {
        const worldPos = localPos.clone();
        let current: Surface | undefined = this;
        while (current) {
            worldPos.applyMatrix4(current.worldMatrix);
            current = current.parent;
        }
        return worldPos;
    }

    // Transform a point from world to local
    worldToLocal(worldPos: THREE.Vector3): THREE.Vector3 {
        const localPos = worldPos.clone();
        // Traverse from root to this
        const ancestors = this.ancestors().reverse();
        for (const ancestor of ancestors) {
            const inverseMatrix = ancestor.worldMatrix.clone().invert();
            localPos.applyMatrix4(inverseMatrix);
        }
        const selfInverse = this.worldMatrix.clone().invert();
        return localPos.applyMatrix4(selfInverse);
    }
}
```

**Node Migration (3D-Native)**:

```typescript
// src/nodes/Node.ts
export abstract class Node extends Surface<NodeEventMap> {
    public position: THREE.Vector3;
    public rotation: THREE.Euler;
    public scale: THREE.Vector3;
    abstract readonly object: THREE.Object3D;

    get worldMatrix(): THREE.Matrix4 {
        return this.object.matrixWorld;
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
                    .clone()
                    .applyMatrix4(new THREE.Matrix4().extractRotation(this.object.matrixWorld)),
                uv: hit.uv,
                face: hit.face,
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

    onPreRender(dt: number): void {
        super.onPreRender(dt);
        // Node-specific 3D updates...
    }
}
```

**Edge Migration (3D Lines in Space)**:

```typescript
// src/edges/Edge.ts
export class Edge extends Surface<EdgeEventMap> {
    source: Node;
    target: Node;
    line: Line2;

    get position(): THREE.Vector3 {
        return new THREE.Vector3()
            .addVectors(this.source.position, this.target.position)
            .multiplyScalar(0.5);
    }

    get rotation(): THREE.Euler {
        return new THREE.Euler(); // Edges don't have independent rotation
    }

    get scale(): THREE.Vector3 {
        return new THREE.Vector3(1, 1, 1);
    }

    get worldMatrix(): THREE.Matrix4 {
        return new THREE.Matrix4();
    }

    get bounds3D(): Bounds3D {
        const min = new THREE.Vector3(
            Math.min(this.source.position.x, this.target.position.x),
            Math.min(this.source.position.y, this.target.position.y),
            Math.min(this.source.position.z, this.target.position.z),
        );
        const max = new THREE.Vector3(
            Math.max(this.source.position.x, this.target.position.x),
            Math.max(this.source.position.y, this.target.position.y),
            Math.max(this.source.position.z, this.target.position.z),
        );
        return {
            min,
            max,
            get center() {
                return new THREE.Vector3().addVectors(this.min, this.max).multiplyScalar(0.5);
            },
            get size() {
                return new THREE.Vector3().subVectors(this.max, this.min);
            },
            containsPoint(p) {
                return false;
            }, // Edges are 1D
            intersectsRay(ray) {
                return false;
            }, // Handled by line intersection
        };
    }

    hitTest(raycaster: THREE.Raycaster): HitResult | null {
        if (!this.visible || !this.isTouchable) return null;

        raycaster.params.Line2 = { threshold: 5 }; // World-space threshold
        const intersects = raycaster.intersectObject(this.line, true);

        if (intersects.length > 0) {
            return {
                surface: this,
                point: intersects[0].point,
                localPoint: intersects[0].point.clone(),
                distance: intersects[0].distance,
            };
        }
        return null;
    }

    start(): void {
        this.pulse(0.3);
    }
    stop(): void {}
    delete(): void {
        this.dispose();
    }
}
```

---

### 2.2 Exclusive Fingering Input System (3D-Native)

**From SGJ**: `Finger`/`Fingering` exclusive state machine. **From SGC**: 3D event bubbling with consumption. **To SGJS**: Unified 3D pipeline where ALL interaction flows through `InputManager → FingerManager → Fingering`.

**3D Considerations**:

- Finger position is still 2D (screen), but raycasting produces 3D world positions
- Drag planes can be oriented arbitrarily in 3D space
- Z-axis dragging must be supported natively
- Multi-touch must handle 3D manipulations (rotate, scale)

**Target Architecture**:

```typescript
// src/input/Fingering.ts
export interface Finger {
    pointerId: number;
    position: { x: number; y: number }; // Screen coordinates
    ndc: { x: number; y: number }; // Normalized device coordinates (-1 to 1)
    buttons: number;
    state: 'down' | 'move' | 'up';
    target: Surface | null;
    hitResult: HitResult | null; // 3D hit information
    startTime: number;

    // 3D world ray from camera through finger position
    worldRay?: THREE.Ray;
}

export abstract class Fingering {
    abstract start(finger: Finger): boolean;
    abstract update(finger: Finger): boolean;
    abstract stop(finger: Finger): void;
    defer(_finger: Finger): boolean {
        return true;
    }
}

export class FingerManager {
    private activeFingering: Fingering | null = null;
    private fingers = new Map<number, Finger>();

    test(next: Fingering, finger: Finger): boolean {
        if (this.activeFingering?.defer(finger) ?? true) {
            this.activeFingering?.stop(finger);
            this.activeFingering = next;
            return next.start(finger);
        }
        return false;
    }

    update(finger: Finger): void {
        if (this.activeFingering) {
            if (!this.activeFingering.update(finger)) {
                this.activeFingering.stop(finger);
                this.activeFingering = null;
            }
        }
    }

    end(finger: Finger): void {
        this.activeFingering?.stop(finger);
        this.activeFingering = null;
    }
}
```

**3D Camera Orbit Fingering**:

```typescript
// src/input/fingerings/CameraOrbiting.ts
export class CameraOrbiting extends Fingering {
    private start = new THREE.Vector2();
    private current = new THREE.Vector2();

    constructor(private controls: CameraControls) {
        super();
    }

    start(finger: Finger): boolean {
        if (finger.buttons !== 1) return false;
        this.start.set(finger.position.x, finger.position.y);
        this.current.copy(this.start);
        return true;
    }

    update(finger: Finger): boolean {
        this.current.set(finger.position.x, finger.position.y);
        const dx = this.current.x - this.start.x;
        const dy = this.current.y - this.start.y;

        // Rotate in 3D spherical coordinates
        this.controls.rotateBy(-dx * 0.005, -dy * 0.005);

        this.start.copy(this.current);
        return true;
    }

    stop(_finger: Finger): void {}
    defer(_finger: Finger): boolean {
        return false;
    }
}
```

**3D Node Dragging Fingering**:

```typescript
// src/input/fingerings/NodeDragging.ts
export class NodeDragging extends Fingering {
    private dragNode: Node | null = null;
    private dragPlane = new THREE.Plane();
    private dragOffset = new THREE.Vector3();
    private stiffness = 1.0;
    private enableZAxis = false;

    constructor(
        private raycaster: InteractionRaycaster,
        private controls: CameraControls,
        private inputManager: InputManager,
    ) {
        super();
    }

    start(finger: Finger): boolean {
        if (finger.buttons !== 1) return false;
        const hit = this.raycaster.raycastSurface();

        if (!hit || !(hit.surface instanceof Node)) return false;

        // SGC: isDraggable veto with 3D local position
        const localPos = hit.surface.worldToLocal(hit.point.clone());
        if (!hit.surface.isDraggable(localPos)) return false;

        this.dragNode = hit.surface;

        // 3D drag plane: perpendicular to camera, passing through hit point
        this.dragPlane.setFromNormalAndCoplanarPoint(
            this.controls.getCameraDirection().negate(),
            hit.point,
        );

        this.dragOffset.subVectors(hit.point, this.dragNode.position);
        this.dragNode.pulse(1.0);

        return true;
    }

    update(finger: Finger): boolean {
        if (!this.dragNode) return false;

        // Check for z-axis mode (Alt key or multi-touch)
        this.enableZAxis =
            this.inputManager.getState().keysPressed.has('Alt') ||
            this.inputManager.getFingerCount() > 1;

        if (this.enableZAxis) {
            // Z-axis drag: move along camera forward/backward
            return this.updateZAxisDrag(finger);
        } else {
            // Planar drag: project onto drag plane
            return this.updatePlanarDrag(finger);
        }
    }

    private updatePlanarDrag(finger: Finger): boolean {
        if (!finger.worldRay) return false;

        const intersection = new THREE.Vector3();
        if (!finger.worldRay.intersectPlane(this.dragPlane, intersection)) {
            return false;
        }

        const targetPosition = intersection.sub(this.dragOffset);

        // Apply with optional soft constraint
        if (this.stiffness < 1.0) {
            this.dragNode.position.lerp(targetPosition, this.stiffness);
        } else {
            this.dragNode.position.copy(targetPosition);
        }

        this.dragNode.object.position.copy(this.dragNode.position);
        return true;
    }

    private updateZAxisDrag(finger: Finger): boolean {
        // Move node along camera's forward direction based on vertical drag
        const dy = finger.position.y - (this.lastFingerY ?? finger.position.y);
        this.lastFingerY = finger.position.y;

        const cameraDir = this.controls.getCameraDirection();
        const delta = cameraDir.clone().multiplyScalar(-dy * 2);

        this.dragNode.position.add(delta);
        this.dragNode.object.position.copy(this.dragNode.position);

        return true;
    }

    stop(_finger: Finger): void {
        if (this.dragNode) {
            this.dragNode.pulse(0.5);
            this.dragNode = null;
        }
        this.lastFingerY = undefined;
    }

    defer(_finger: Finger): boolean {
        return false;
    }

    private lastFingerY?: number;
}
```

---

### 2.3 3D Event Consumption Model

**From SGC**: `consumed` flag with early-termination. **To SGJS**: Unified 3D consumption across all input paths.

```typescript
// src/input/InputManager.ts
export interface InputEvent<T = unknown> {
    type: InputEventType;
    source: string;
    timestamp: number;
    data: T;
    originalEvent?: unknown;
    consumed: boolean;
}

export class InputManager {
    private fingerManager = new FingerManager();
    private fingerings: Array<{ priority: number; fingering: Fingering }> = [];

    handleEvent(event: InputEvent): void {
        if (!this.enabled) return;
        if (this.state.disabledInputs.has(event.source)) return;

        const finger = this.updateFinger(event);

        // Compute 3D world ray for this finger
        finger.worldRay = this.computeWorldRay(finger.ndc);

        // Priority-ordered fingering test
        if (event.type === 'pointerdown') {
            for (const { fingering } of this.fingerings) {
                if (this.fingerManager.test(fingering, finger)) {
                    event.consumed = true;
                    return;
                }
            }
        } else if (event.type === 'pointermove') {
            this.fingerManager.update(finger);
        } else if (event.type === 'pointerup') {
            this.fingerManager.end(finger);
        }

        // Non-fingering bindings (keyboard, etc.)
        if (!this.fingerManager.isActive() && event.type !== 'pointerdown') {
            for (const binding of this.bindings) {
                if (event.consumed) break;
                // ... dispatch to actions
            }
        }
    }

    private computeWorldRay(ndc: { x: number; y: number }): THREE.Ray {
        const camera = this.sg.renderer.camera;
        const ray = new THREE.Ray();
        ray.origin.setFromMatrixPosition(camera.matrixWorld);
        ray.direction.set(ndc.x, ndc.y, 0.5).unproject(camera).sub(ray.origin).normalize();
        return ray;
    }
}
```

---

### 2.4 HtmlNode as First-Class 3D Surface

**Challenge**: HTML content exists in a CSS3D layer, which has its own 3D transform but conflicts with WebGL spatial manipulation.

**Solution**: HtmlNode is positioned in 3D space via CSS3D transforms. Its DOM element receives events which flow through the 3D Fingering pipeline. Interactive zones use `isDraggable` veto.

```typescript
// src/nodes/DOMNode.ts
export class DOMNode extends Node {
    domElement: HTMLElement;
    cssObject: THREE.CSS3DObject;
    backingMesh?: THREE.Mesh; // Invisible mesh for 3D raycasting

    get object(): THREE.Object3D {
        return this.cssObject;
    }

    // 3D bounds from backing mesh
    get bounds3D(): Bounds3D {
        if (this.backingMesh) {
            const box = new THREE.Box3().setFromObject(this.backingMesh);
            return this.boxToBounds3D(box);
        }
        // Fallback: use CSS3DObject approximate bounds
        const { width = 300, height = 200 } = this.data;
        const halfW = width / 2;
        const halfH = height / 2;
        return {
            min: new THREE.Vector3(-halfW, -halfH, -1),
            max: new THREE.Vector3(halfW, halfH, 1),
            // ... other methods
        } as Bounds3D;
    }

    hitTest(raycaster: THREE.Raycaster): HitResult | null {
        if (!this.visible || !this.isTouchable) return null;

        // Raycast against backing mesh (3D accurate)
        if (this.backingMesh) {
            const intersects = raycaster.intersectObject(this.backingMesh, true);
            if (intersects.length > 0) {
                return {
                    surface: this,
                    point: intersects[0].point,
                    localPoint: this.cssObject.worldToLocal(intersects[0].point.clone()),
                    distance: intersects[0].distance,
                    normal: intersects[0].face?.normal,
                };
            }
        }
        return null;
    }

    // SGC: isDraggable veto for interactive zones
    isDraggable(localPos: THREE.Vector3): boolean {
        const { width = 300, height = 200 } = this.data;

        // Convert 3D local position to 2D element coordinates
        const px = localPos.x + width / 2;
        const py = height / 2 - localPos.y; // Flip Y

        // Check interactive zones
        const interactive = this.domElement.querySelectorAll('[data-sg-interactive]');
        for (const el of interactive) {
            const rect = (el as HTMLElement).getBoundingClientRect();
            const nodeRect = this.domElement.getBoundingClientRect();
            const relX = px;
            const relY = py;

            if (relX >= 0 && relX <= width && relY >= 0 && relY <= height) {
                return false; // veto
            }
        }
        return true;
    }

    private setupPointerRelay(): void {
        const relay = (type: InputEventType, e: PointerEvent) => {
            const event = this.sg.input.normalizeFromDOM(type, e, 'dom-node');
            this.sg.input.handleEvent(event);
        };

        this.domElement.addEventListener('pointerdown', (e) => {
            this.domElement.setPointerCapture(e.pointerId);
            relay('pointerdown', e);
        });
        this.domElement.addEventListener('pointermove', (e) => relay('pointermove', e));
        this.domElement.addEventListener('pointerup', (e) => relay('pointerup', e));
    }
}
```

---

### 2.5 3D Lazy Layout with Dirty Flag

**From SGJ**: `ContainerSurface` with `VarHandle` CAS pattern. **To SGJS**: 3D layout containers that position children in XYZ space.

```typescript
// src/nodes/LayoutNode.ts
export abstract class LayoutNode extends GroupNode {
    protected needsLayout = true;

    constructor(graph: Graph) {
        super();
        graph.on('node:added', (n) => {
            if (this.containsChild(n)) this.markDirty();
        });
        graph.on('node:removed', (n) => {
            if (this.containsChild(n)) this.markDirty();
        });
    }

    markDirty(): void {
        this.needsLayout = true;
    }

    onPreRender(dt: number): void {
        super.onPreRender(dt);
        if (this.needsLayout) {
            this.needsLayout = false;
            this.doLayout(dt);
        }
    }

    protected abstract doLayout(dt: number): void;

    private containsChild(node: Node): boolean {
        return this.children.includes(node);
    }
}
```

**3D Grid Layout**:

```typescript
// src/nodes/GridNode.ts
export class GridNode extends LayoutNode {
    columns = 3;
    cellWidth = 200;
    cellHeight = 150;
    cellDepth = 100; // 3D depth
    gapX = 20;
    gapY = 20;
    gapZ = 50; // Z-layer gap
    layers = 1; // Number of Z layers

    protected doLayout(_dt: number): void {
        const childNodes = this.children.filter((c): c is Node => c instanceof Node);

        childNodes.forEach((child, i) => {
            const col = i % this.columns;
            const row = Math.floor(
                (i / this.columns) % Math.ceil(childNodes.length / this.columns),
            );
            const layer = Math.floor(
                i / (this.columns * Math.ceil(childNodes.length / this.columns)),
            );

            child.position.set(
                this.position.x + col * (this.cellWidth + this.gapX),
                this.position.y - row * (this.cellHeight + this.gapY),
                this.position.z + layer * (this.cellDepth + this.gapZ), // 3D layering
            );
        });
    }
}
```

**3D Sphere Layout** (for GlobeNode integration):

```typescript
// src/nodes/SphereLayoutNode.ts
export class SphereLayoutNode extends LayoutNode {
    radius = 200;

    protected doLayout(_dt: number): void {
        const childNodes = this.children.filter((c): c is Node => c instanceof Node);
        const n = childNodes.length;

        // Fibonacci sphere distribution for even 3D placement
        const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle

        childNodes.forEach((child, i) => {
            const y = 1 - (i / (n - 1)) * 2; // -1 to 1
            const radiusAtY = Math.sqrt(1 - y * y);
            const theta = phi * i;

            child.position.set(
                this.position.x + Math.cos(theta) * radiusAtY * this.radius,
                this.position.y + y * this.radius,
                this.position.z + Math.sin(theta) * radiusAtY * this.radius,
            );

            // Orient child to face outward from sphere center
            child.rotation.set(0, Math.atan2(child.position.z, child.position.x), 0);
        });
    }
}
```

---

### 2.6 3D Activity-Based Visual Feedback

**From SGJ**: Activity temperature with decay. **To SGJS**: 3D-aware visual effects.

```typescript
// In ShapeNode.onPreRender()
onPreRender(dt: number): void {
  super.onPreRender(dt);

  if (this.activity > 0.01) {
    // 3D emissive glow
    this.meshMaterial.emissive.setHex(0x4488ff);
    this.meshMaterial.emissiveIntensity = this.activity * 0.5;

    // Optional: scale pulse for 3D emphasis
    const pulseScale = 1 + this.activity * 0.1;
    this.object.scale.setScalar(pulseScale);
  } else {
    this.meshMaterial.emissiveIntensity = 0;
    this.object.scale.set(1, 1, 1);
  }
}

// In GlobeNode.onPreRender()
onPreRender(dt: number): void {
  super.onPreRender(dt);

  if (this.activity > 0.01) {
    // 3D sphere glow effect
    if (this.haloMesh) {
      this.haloMesh.material.opacity = this.activity * 0.3;
    }
  }
}

// Wire to 3D events:
this.sg.graph.on('node:added', (n) => n.pulse(1.0));
this.sg.events.on('node:drag:start', ({ node }) => node.pulse(0.8));
this.sg.events.on('selection:change', ({ nodes }) => nodes.forEach(n => n.pulse(0.5)));
```

---

## Part III: 3D Interaction Behaviors

### 3.1 3D Soft Constraint Dragging

**From SGC**: `btPoint2PointConstraint` with spring damping. **To SGJS**: 3D lerp-based following with configurable stiffness.

```typescript
export class NodeDragging extends Fingering {
    private stiffness = 1.0;
    private dampingFactor = 0.92;
    private velocity = new THREE.Vector3();

    update(finger: Finger): boolean {
        // ... calculate targetPosition

        if (this.stiffness < 1.0) {
            // SGC-style 3D soft constraint
            const springForce = targetPosition
                .clone()
                .sub(this.dragNode.position)
                .multiplyScalar(this.stiffness);
            this.velocity.add(springForce);
            this.velocity.multiplyScalar(this.dampingFactor);
            this.dragNode.position.add(this.velocity);
        } else {
            this.dragNode.position.copy(targetPosition);
        }

        this.dragNode.object.position.copy(this.dragNode.position);
        return true;
    }
}
```

---

### 3.2 3D Distance-Preserving Drag

**From SGC**: `gOldPickingDist` ray-distance preservation. **To SGJS**: 3D ray-distance mode prevents depth drift.

```typescript
export class NodeDragging extends Fingering {
    private preserveDistance = true;
    private initialDistance = 0;
    private rayOrigin = new THREE.Vector3();

    start(finger: Finger): boolean {
        // ...
        this.rayOrigin.copy(this.raycaster.getCameraPosition());
        this.initialDistance = this.rayOrigin.distanceTo(hit.point);
        return true;
    }

    update(finger: Finger): boolean {
        if (!finger.worldRay) return false;

        if (this.preserveDistance) {
            // Preserve 3D distance from camera
            const target = finger.worldRay.origin
                .clone()
                .add(finger.worldRay.direction.clone().multiplyScalar(this.initialDistance));
            target.sub(this.dragOffset);

            this.dragNode.position.lerp(target, this.stiffness);
        } else {
            // Update 3D drag plane each frame
            this.dragPlane.setFromNormalAndCoplanarPoint(
                this.controls.getCameraDirection().negate(),
                this.dragNode.position,
            );
            // ... planar intersection
        }

        this.dragNode.object.position.copy(this.dragNode.position);
        return true;
    }
}
```

---

### 3.3 3D Zoom Stack Navigation

**From SGJ**: `Zoomed` with depth history. **To SGJS**: 3D camera position stack.

```typescript
// src/core/CameraControls.ts
export class CameraControls {
    private zoomStack: Array<{
        target: THREE.Vector3;
        distance: number;
        phi: number; // Spherical elevation
        theta: number; // Spherical azimuth
    }> = [];
    private readonly MAX_ZOOM_DEPTH = 8;

    zoomToSurface3D(surface: Surface, duration: number = 1.5): void {
        const bounds = surface.bounds3D;
        const center = bounds.center;
        const size = bounds.size;
        const maxDim = Math.max(size.x, size.y, size.z);
        const distance = maxDim * 2.5; // Account for 3D perspective

        // Toggle: if same center, zoom out
        const top = this.zoomStack.at(-1);
        if (top && center.distanceTo(top.target) < distance * 0.1) {
            this.zoomOut(duration);
            return;
        }

        this.zoomStack.push({
            target: this.target.clone(),
            distance: this.spherical.radius,
            phi: this.spherical.phi,
            theta: this.spherical.theta,
        });

        if (this.zoomStack.length > this.MAX_ZOOM_DEPTH) {
            this.zoomStack.shift();
        }

        this.flyTo3D(center, distance, duration);
    }

    flyTo3D(target: THREE.Vector3, distance: number, duration: number): void {
        // Animate camera to new 3D position
        this.setTargetSmooth(target, distance, duration);
    }

    zoomOut(duration: number = 1.0): void {
        if (this.zoomStack.length === 0) return;
        const prev = this.zoomStack.pop()!;
        this.flyTo3D(prev.target, prev.distance, duration);
    }
}
```

---

### 3.4 3D Box Selection

**From SGJ**: `BoxSelecting` rectangle. **To SGJS**: 3D frustum-based selection.

```typescript
// src/input/fingerings/BoxSelecting.ts
export class BoxSelecting extends Fingering {
    private startNDC = new THREE.Vector2();
    private currentNDC = new THREE.Vector2();

    start(finger: Finger): boolean {
        if (finger.buttons !== 1) return false;
        if (!this.inputManager.getState().keysPressed.has('Shift')) return false;

        this.startNDC.set(finger.ndc.x, finger.ndc.y);
        this.currentNDC.copy(this.startNDC);
        return true;
    }

    update(finger: Finger): boolean {
        this.currentNDC.set(finger.ndc.x, finger.ndc.y);

        // Compute 3D selection frustum
        const frustum = this.computeSelectionFrustum(this.startNDC, this.currentNDC);

        // Select all nodes inside 3D frustum
        const selected: Node[] = [];
        for (const node of this.sg.graph.nodes.values()) {
            if (node.bounds3D && frustum.containsPoint(node.position)) {
                selected.push(node);
            }
        }

        this.sg.events.emit('selection:preview', { nodes: selected });
        return true;
    }

    stop(finger: Finger): void {
        const frustum = this.computeSelectionFrustum(this.startNDC, this.currentNDC);
        const selected = Array.from(this.sg.graph.nodes.values()).filter(
            (n) => n.bounds3D && frustum.containsPoint(n.position),
        );
        this.sg.events.emit('selection:change', { nodes: selected });
    }

    private computeSelectionFrustum(start: THREE.Vector2, end: THREE.Vector2): THREE.Frustum {
        const camera = this.sg.renderer.camera;

        // Create 5-plane frustum from 2D selection rectangle
        const minX = Math.min(start.x, end.x);
        const maxX = Math.max(start.x, end.x);
        const minY = Math.min(start.y, end.y);
        const maxY = Math.max(start.y, end.y);

        const frustum = new THREE.Frustum();
        const projection = new THREE.Matrix4();

        // Create custom projection matrix for selection region
        projection.makePerspective(
            minX * camera.aspect,
            maxX * camera.aspect,
            maxY,
            minY,
            camera.near,
            camera.far,
        );

        const viewMatrix = new THREE.Matrix4().copy(camera.matrixWorld).invert();
        const viewProjection = new THREE.Matrix4().multiplyMatrices(projection, viewMatrix);

        frustum.setFromProjectionMatrix(viewProjection);
        return frustum;
    }

    defer(_finger: Finger): boolean {
        return false;
    }
}
```

---

### 3.5 3D Keyboard Camera Controls

**From SGC**: `l/r/f/b` pan, `z/x` zoom. **To SGJS**: Full 3D movement including vertical.

```typescript
// src/core/CameraControls.ts
export class CameraControls {
    private keyState = new Map<string, boolean>();
    private keyConfig = {
        panLeft: 'a',
        panRight: 'd',
        panForward: 'w',
        panBackward: 's',
        panUp: 'q',
        panDown: 'e', // 3D vertical movement
        zoomIn: 'z',
        zoomOut: 'x',
        rotateLeft: 'j',
        rotateRight: 'l',
        rotateUp: 'i',
        rotateDown: 'k',
        panSpeed: 10.0,
        zoomSpeed: 0.1,
        rotateSpeed: 0.05,
    };

    update(): void {
        // ... existing spherical updates

        // 3D keyboard movement
        const camRight = new THREE.Vector3();
        const camForward = new THREE.Vector3();
        const camUp = this.camera.up.clone();

        camRight.setFromMatrixColumn(this.camera.matrix, 0);
        camForward.setFromMatrixColumn(this.camera.matrix, 2).negate();

        if (this.keyState.get(this.keyConfig.panLeft)) {
            this.panOffset.add(camRight.clone().multiplyScalar(-this.keyConfig.panSpeed));
        }
        if (this.keyState.get(this.keyConfig.panRight)) {
            this.panOffset.add(camRight.clone().multiplyScalar(this.keyConfig.panSpeed));
        }
        if (this.keyState.get(this.keyConfig.panForward)) {
            this.panOffset.add(camForward.clone().multiplyScalar(this.keyConfig.panSpeed));
        }
        if (this.keyState.get(this.keyConfig.panBackward)) {
            this.panOffset.add(camForward.clone().multiplyScalar(-this.keyConfig.panSpeed));
        }
        if (this.keyState.get(this.keyConfig.panUp)) {
            this.panOffset.add(camUp.clone().multiplyScalar(this.keyConfig.panSpeed));
        }
        if (this.keyState.get(this.keyConfig.panDown)) {
            this.panOffset.add(camUp.clone().multiplyScalar(-this.keyConfig.panSpeed));
        }

        // Rotation
        if (this.keyState.get(this.keyConfig.rotateLeft)) {
            this.sphericalDelta.theta -= this.keyConfig.rotateSpeed;
        }
        if (this.keyState.get(this.keyConfig.rotateRight)) {
            this.sphericalDelta.theta += this.keyConfig.rotateSpeed;
        }
        if (this.keyState.get(this.keyConfig.rotateUp)) {
            this.sphericalDelta.phi -= this.keyConfig.rotateSpeed;
        }
        if (this.keyState.get(this.keyConfig.rotateDown)) {
            this.sphericalDelta.phi += this.keyConfig.rotateSpeed;
        }

        // Zoom
        if (this.keyState.get(this.keyConfig.zoomIn)) {
            this.spherical.radius *= 1 - this.keyConfig.zoomSpeed;
        }
        if (this.keyState.get(this.keyConfig.zoomOut)) {
            this.spherical.radius *= 1 + this.keyConfig.zoomSpeed;
        }

        // ... rest of update
    }
}
```

---

## Part IV: 3D Layout Algorithms

### 4.1 Force-Directed 3D Layout

**Already Implemented** - SGJS has a full 3D force simulation.

**Enhancement**: Add 3D-specific forces.

```typescript
// src/plugins/layouts/ForceLayout.ts (enhancements)
protected simulateStep(nodes: Node[]): void {
  // ... existing repulsion and attraction

  // NEW: 3D plane constraint (optional)
  if (this.config.constrainToPlane) {
    for (const node of nodes) {
      node.position.z = 0; // Lock to XY plane
    }
  }

  // NEW: 3D spherical containment
  if (this.config.sphericalBounds) {
    const maxRadius = this.config.sphericalBounds;
    for (const node of nodes) {
      const dist = node.position.length();
      if (dist > maxRadius) {
        node.position.normalize().multiplyScalar(maxRadius);
      }
    }
  }

  // NEW: 3D gravitational pull toward a focal point
  if (this.config.focalPoint) {
    const focal = this.config.focalPoint;
    for (const node of nodes) {
      const toFocal = new THREE.Vector3().subVectors(focal, node.position);
      const force = toFocal.multiplyScalar(this.config.focalStrength ?? 0.01);
      node.position.add(force);
    }
  }
}
```

---

### 4.2 3D Spectral Layout

**Already Implemented** - Uses 3 eigenvectors for XYZ positioning.

---

### 4.3 Globe/Sphere Layout

**For geographic data on 3D spheres**:

```typescript
// src/plugins/layouts/GlobeLayout.ts
export class GlobeLayout extends LayoutPlugin {
    protected defaultConfig(): LayoutConfig {
        return { scale: 100, animate: true, duration: 1.5, dimensions: 3 };
    }

    apply(nodes: Node[], edges: Edge[]): void {
        const radius = this.config.radius ?? 100;

        for (const node of nodes) {
            const { lat, lng } = node.data as { lat?: number; lng?: number };
            if (lat === undefined || lng === undefined) continue;

            // Spherical coordinates to 3D Cartesian
            const phi = (90 - lat) * (Math.PI / 180);
            const theta = (lng + 180) * (Math.PI / 180);

            const targetPos = new THREE.Vector3(
                -(radius * Math.sin(phi) * Math.cos(theta)),
                radius * Math.cos(phi),
                radius * Math.sin(phi) * Math.sin(theta),
            );

            this.applyPosition(node, targetPos, { animate: this.config.animate });
        }
    }
}
```

---

## Part V: 3D Visual Programming

### 5.1 3D Port/Wiring System

**From SGJ**: 2D ports. **To SGJS**: 3D ports with 3D wire routing.

```typescript
// src/nodes/PortNode.ts
export class PortNode<T = unknown> extends ShapeNode {
    private connections: Wire<T>[] = [];
    private portType: string;
    private portDirection: THREE.Vector3; // 3D direction port faces

    constructor(spec: NodeSpec) {
        super(spec);
        this.portDirection = new THREE.Vector3(
            spec.data?.direction?.[0] ?? 1,
            spec.data?.direction?.[1] ?? 0,
            spec.data?.direction?.[2] ?? 0,
        );
    }

    isDraggable(localPos: THREE.Vector3): boolean {
        const portRadius = 10;
        return localPos.length() > portRadius;
    }

    // Get 3D world position for wire attachment
    getWireAttachmentPoint(): THREE.Vector3 {
        return this.position
            .clone()
            .add(this.portDirection.clone().multiplyScalar(this.getSize() / 2 + 5));
    }
}

// src/edges/Wire.ts
export class Wire<T = unknown> extends Edge {
    private routingPoints: THREE.Vector3[] = []; // 3D routing

    update(): void {
        const start = this.source.getWireAttachmentPoint();
        const end = this.target.getWireAttachmentPoint();

        // 3D bezier curve routing
        const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        midPoint.y += 50; // Arc upward in 3D

        // ... update line geometry with 3D control points
    }
}
```

---

### 5.2 3D Virtualized Grid

**For massive 3D data visualization**:

```typescript
// src/nodes/VirtualGrid3DNode.ts
export class VirtualGrid3DNode<T> extends LayoutNode {
    private model: Grid3DModel<T>;
    private visibleCells = new Map<string, Node>();

    onPreRender(dt: number): void {
        super.onPreRender(dt);

        // Get 3D camera frustum
        const frustum = this.sg.renderer.getFrustum();

        // Compute visible 3D cells
        const visibleBounds = this.computeVisibleBounds3D(frustum);
        const needed = this.computeNeededCells3D(visibleBounds);

        // Remove cells outside frustum
        for (const [key, node] of this.visibleCells) {
            if (!needed.has(key)) {
                this.graph.removeNode(node.id);
                this.visibleCells.delete(key);
            }
        }

        // Instantiate cells inside frustum
        for (const [key, cell] of needed) {
            if (!this.visibleCells.has(key)) {
                const spec = this.cellRenderer(cell.x, cell.y, cell.z, cell.value);
                const node = this.graph.addNode(spec);
                if (node) this.visibleCells.set(key, node);
            }
        }
    }

    private computeNeededCells3D(bounds: Bounds3D): Map<string, GridCell3D<T>> {
        const result = new Map<string, GridCell3D<T>>();

        for (
            let x = Math.floor(bounds.min.x / this.cellWidth);
            x <= Math.ceil(bounds.max.x / this.cellWidth);
            x++
        ) {
            for (
                let y = Math.floor(bounds.min.y / this.cellHeight);
                y <= Math.ceil(bounds.max.y / this.cellHeight);
                y++
            ) {
                for (
                    let z = Math.floor(bounds.min.z / this.cellDepth);
                    z <= Math.ceil(bounds.max.z / this.cellDepth);
                    z++
                ) {
                    const key = `${x},${y},${z}`;
                    result.set(key, { x, y, z, value: this.model.get(x, y, z) });
                }
            }
        }

        return result;
    }
}
```

---

## Part VI: 3D Widget System

### 6.1 3D Panel Windows

**From SGJ**: `Windo` 2D panels. **To SGJS**: 3D billboards that face camera.

```typescript
// src/nodes/PanelNode.ts
export class PanelNode extends HtmlNode {
    fixed = false;
    billboard = true; // Face camera in 3D
    resizeBorder = 0.1;

    onPreRender(dt: number): void {
        super.onPreRender(dt);

        if (this.billboard && this.sg) {
            // Billboard: rotate to face camera in 3D
            const cameraPos = this.sg.renderer.camera.position;
            const direction = new THREE.Vector3().subVectors(cameraPos, this.position);

            // Zero out X and Z rotation for vertical billboard
            this.rotation.y = Math.atan2(direction.x, direction.z);
            this.object.rotation.copy(this.rotation);
        }
    }

    getDragMode(localPos: THREE.Vector3): 'move' | 'resize' | null {
        if (this.fixed) return null;

        const { width, height, depth } = this.data;
        const nearEdge =
            Math.abs(localPos.x) > width * (0.5 - this.resizeBorder) ||
            Math.abs(localPos.y) > height * (0.5 - this.resizeBorder) ||
            Math.abs(localPos.z) > depth * (0.5 - this.resizeBorder); // 3D resize

        return nearEdge ? 'resize' : 'move';
    }
}
```

---

## Part VII: Implementation Roadmap

### Phase 1: Core 3D Unification (Weeks 1-2)

| Task                                      | Priority | Effort   | Dependencies      |
| ----------------------------------------- | -------- | -------- | ----------------- |
| `Node extends Surface` with `bounds3D`    | High     | 2 days   | Surface class     |
| `Edge extends Surface` with 3D hit test   | High     | 1 day    | Surface class     |
| Strip `CameraControls` DOM listeners      | High     | 1 day    | None              |
| Create 3D camera fingerings               | High     | 2 days   | FingerManager     |
| Wire `InputManager` with world ray        | High     | 2 days   | Fingering classes |
| Create `NodeDragging` with z-axis support | High     | 2 days   | Surface           |
| Register fingerings with priorities       | High     | 0.5 days | All fingerings    |

---

### Phase 2: 3D HtmlNode Integration (Week 3)

| Task                           | Priority | Effort | Dependencies |
| ------------------------------ | -------- | ------ | ------------ |
| 3D backing mesh for raycasting | High     | 1 day  | DOMNode      |
| `isDraggable` 3D veto          | High     | 1 day  | Surface      |
| CSS3D transform sync           | High     | 1 day  | None         |
| Billboard mode                 | Medium   | 1 day  | PanelNode    |

---

### Phase 3: 3D Layout System (Weeks 4-5)

| Task                        | Priority | Effort | Dependencies |
| --------------------------- | -------- | ------ | ------------ |
| `LayoutNode` with 3D bounds | High     | 1 day  | Surface      |
| `GridNode` 3D layering      | High     | 1 day  | LayoutNode   |
| `SphereLayoutNode`          | Medium   | 1 day  | LayoutNode   |
| 3D force constraints        | Medium   | 1 day  | ForceLayout  |
| GlobeLayout enhancement     | Low      | 1 day  | GeoLayout    |

---

### Phase 4: 3D Interaction Polish (Weeks 6-7)

| Task                        | Priority | Effort | Dependencies   |
| --------------------------- | -------- | ------ | -------------- |
| 3D soft constraint drag     | Medium   | 1 day  | NodeDragging   |
| 3D distance-preserving drag | Low      | 1 day  | NodeDragging   |
| 3D box selection (frustum)  | High     | 2 days | BoxSelecting   |
| 3D keyboard controls        | Medium   | 1 day  | CameraControls |
| 3D zoom stack               | High     | 1 day  | zoomStack      |

---

### Phase 5: 3D Advanced Features (Weeks 8-10)

| Task                            | Priority | Effort | Dependencies  |
| ------------------------------- | -------- | ------ | ------------- |
| 3D `PortNode` with wire routing | Medium   | 2 days | Surface       |
| 3D `VirtualGrid3DNode`          | Low      | 3 days | LayoutNode    |
| 3D panel windows                | Low      | 2 days | PanelNode     |
| Multi-touch 3D rotation/scale   | Medium   | 2 days | FingerManager |

---

## Part VIII: 3D Testing Strategy

### 8.1 Unit Tests (3D)

- `bounds3D` intersection tests
- 3D `hitTest` with arbitrary camera orientations
- 3D coordinate transforms (localToWorld, worldToLocal)
- 3D frustum computation
- Activity decay math

### 8.2 Integration Tests (3D)

- Camera orbit + node drag in arbitrary orientations
- Z-axis dragging at different camera angles
- 3D box selection at oblique angles
- Billboard panels rotating with camera
- 3D layout on sphere surface

### 8.3 E2E Tests (3D)

- Full 3D scene navigation (orbit, pan, zoom)
- Drag node to different Z depths
- Select nodes across multiple Z layers
- GlobeNode with markers at various lat/lng

---

## Part IX: Migration Checklist (3D)

### Surface Unification (3D)

- [ ] `Node extends Surface` with `bounds3D`
- [ ] `Edge extends Surface` with 3D hit test
- [ ] `position/rotation/scale` as 3D vectors
- [ ] `localToWorld` / `worldToLocal` transforms
- [ ] `isDraggable(localPos: Vector3)` 3D veto

### Fingering Pipeline (3D)

- [ ] World ray computation from finger NDC
- [ ] 3D drag plane orientation
- [ ] Z-axis drag mode
- [ ] 3D box selection frustum
- [ ] Multi-touch 3D gestures

### HtmlNode (3D)

- [ ] 3D backing mesh
- [ ] CSS3D transform sync
- [ ] Billboard mode
- [ ] 3D resize handles

### Layout System (3D)

- [ ] `LayoutNode` with 3D bounds
- [ ] `GridNode` Z-layering
- [ ] `SphereLayoutNode`
- [ ] 3D force constraints

### Interaction (3D)

- [ ] 3D soft constraint drag
- [ ] 3D distance preservation
- [ ] 3D keyboard controls
- [ ] 3D zoom stack

---

## Part X: Success Metrics (3D)

| Metric              | Baseline          | Target                    |
| ------------------- | ----------------- | ------------------------- |
| 3D node positioning | Full support      | Full support              |
| Z-axis drag         | Manual Alt key    | Native, intuitive         |
| 3D box selection    | Screen projection | Frustum-based             |
| Camera orientation  | Limited           | Arbitrary                 |
| Multi-touch 3D      | None              | Pinch rotate, scale       |
| Large 3D graphs     | 10k nodes         | 100k+ with virtualization |
| 3D layout variety   | Force, spectral   | + Globe, Sphere, 3D Grid  |

---

## Appendix A: 3D File Changes

| File                         | Change                                   |
| ---------------------------- | ---------------------------------------- |
| `src/core/Surface.ts`        | Add `bounds3D`, 3D transforms, `hitTest` |
| `src/nodes/Node.ts`          | Full 3D position/rotation/scale          |
| `src/edges/Edge.ts`          | 3D line intersection                     |
| `src/core/CameraControls.ts` | 3D keyboard, arbitrary orientation       |
| `src/input/InputManager.ts`  | World ray computation                    |
| `src/input/fingerings/*.ts`  | All 3D-aware                             |
| `src/nodes/DOMNode.ts`       | 3D backing mesh, billboard               |
| `src/nodes/LayoutNode.ts`    | 3D bounds                                |
| `src/plugins/layouts/*.ts`   | 3D enhancements                          |

---

## Appendix B: 3D Control Mapping

### Mouse Controls (3D)

| Input                | Action       | 3D Behavior                    |
| -------------------- | ------------ | ------------------------------ |
| Left drag on node    | Drag node    | 3D planar drag, Alt for Z-axis |
| Left drag on empty   | Orbit camera | 3D spherical rotation          |
| Left + Shift drag    | Box select   | 3D frustum selection           |
| Middle drag          | Pan camera   | 3D movement                    |
| Middle click on node | Zoom to node | 3D fly-to                      |
| Scroll wheel         | Zoom         | 3D distance                    |
| Right drag           | Zoom         | 3D distance                    |

### Keyboard Controls (3D)

| Key          | Action         | 3D Behavior            |
| ------------ | -------------- | ---------------------- |
| `w/a/s/d`    | Pan camera     | 3D forward/back/strafe |
| `q/e`        | Vertical pan   | 3D up/down             |
| `z/x`        | Zoom           | 3D distance            |
| `i/j/k/l`    | Rotate camera  | 3D pitch/yaw           |
| `Space`      | Fly to hovered | 3D animation           |
| `Alt + drag` | Z-axis drag    | 3D depth movement      |

---

## Appendix C: UI.md Vision Alignment

This plan advances the **Liquid UI** vision from `UI.md`:

| UI.md Principle            | Implementation                                     |
| -------------------------- | -------------------------------------------------- |
| **Spatial Supremacy**      | Full 3D positioning, arbitrary camera orientations |
| **Fractal Reality**        | 3D zoom stack, multi-scale navigation              |
| **Graph Ontology**         | Surface abstraction for all entities               |
| **Temporal Fluidity**      | Activity-based visual history                      |
| **Ubiquitous Composition** | 3D layout containers, nested surfaces              |

---

## Appendix D: Demo-Based Integration Testing

This appendix defines the fine-grained interaction and rendering behaviors that must be tested and demonstrated through demos, in the correct sequence to ensure the complete system functions usefully.

---

### D.1 Testing Philosophy

**Principles:**

1. **Layered Verification**: Test bottom-up (rendering → interaction → application)
2. **Each demo validates one primary concern**
3. **Sequential dependency**: Later tests assume earlier tests pass
4. **Visual + behavioral verification**: Screenshot comparison + event logging
5. **3D awareness**: All tests must work at arbitrary camera orientations

---

### D.2 Test Categories and Sequencing

```
Layer 0: Infrastructure
├── empty.html          → Canvas creation, WebGL context, animation loop
├── single-node.html    → Node instantiation, THREE.Object3D creation
└── verification.html   → Full graph spec loading, multi-node rendering

Layer 1: Core Rendering
├── basic.html          → 5 nodes, 5 edges, basic shapes, line rendering
├── edges.html          → Edge types: CurvedEdge, FlowEdge, LabeledEdge, DottedEdge
├── instanced.html      → InstancedShapeNode for performance (100+ nodes)
└── large.html          → Stress test (1000+ nodes), BVH raycasting, frustum culling

Layer 2: 3D Spatial
├── basic-3d.html       → Nodes at different Z depths, camera orbit
├── globe.html          → GlobeNode with markers, spherical positioning
└── scene.html          → SceneNode (GLTF model), 3D model loading

Layer 3: Interaction Foundation
├── fingering.html      → Fingering state machine, priority acquisition
├── interactive.html    → Node drag, camera orbit/pan/zoom
├── selection.html      → Box selection (Shift+drag), multi-select
└── z-drag.html         → Z-axis dragging (Alt+drag), depth manipulation

Layer 4: Advanced Interaction
├── html-node.html      → HtmlNode, CSS3D rendering, DOM event relay
├── html-interactive.html → Editable content, scrollable regions, veto zones
├── connection.html     → Alt+drag edge creation, port wiring
└── resize.html         → Node resize handles, resize fingering

Layer 5: Visual Feedback
├── activity.html       → Activity pulse, decay, visual rendering
├── hover.html          → Hover highlighting, pointerenter/leave events
└── selection-visual.html → Selection glow, multi-node highlight

Layer 6: Layout System
├── layout.html         → GridLayout, auto-positioning
├── force.html          → ForceLayout, physics simulation
├── hierarchical.html   → TreeLayout, HierarchicalLayout
└── 3d-layout.html      → 3D layouts (SphereLayout, 3D Grid)

Layer 7: Zoom Navigation
├── fractal.html        → Fractal zoom levels, zoom stack
├── fly-to.html         → Fly-to animation, double-click zoom
└── orthographic.html   → Orthographic toggle, projection switching

Layer 8: Application Integration
├── n8n-workflow.html   → Full workflow editor, all features combined
├── plugins.html        → Plugin system, plugin interaction
└── quickstart.html     → End-to-end user journey
```

---

### D.3 Detailed Test Specifications

#### Layer 0: Infrastructure

**D.3.1 empty.html — Canvas Creation**

| Behavior               | Verification                                    |
| ---------------------- | ----------------------------------------------- |
| Canvas element created | `canvas` element exists in DOM                  |
| WebGL context acquired | `canvas.getContext('webgl2')` returns context   |
| Animation loop running | `requestAnimationFrame` callback fires at 60fps |
| Renderer initialized   | `sg.renderer` is defined                        |
| Camera created         | `sg.renderer.camera` is PerspectiveCamera       |

**Test Sequence:**

1. Load page
2. Wait 100ms for init
3. Verify canvas dimensions > 0
4. Verify no console errors
5. Screenshot (should be blank but valid)

---

**D.3.2 single-node.html — Node Instantiation**

| Behavior               | Verification                             |
| ---------------------- | ---------------------------------------- |
| Node added to graph    | `sg.graph.nodes.size === 1`              |
| THREE.Object3D created | `node.object` is defined                 |
| Position set           | `node.position` matches spec             |
| Mesh rendered          | Raycast hits the node                    |
| Bounds computed        | `node.bounds` or `node.bounds3D` defined |

**Test Sequence:**

1. Load page with `{ nodes: [{ id: 'test', type: 'ShapeNode', position: [0,0,0] }] }`
2. Wait for render
3. Verify graph has 1 node
4. Raycast at center, verify hit
5. Verify node.position is [0,0,0]

---

**D.3.3 verification.html — Graph Spec Loading**

| Behavior               | Verification                 |
| ---------------------- | ---------------------------- |
| Multi-node spec loaded | `sg.graph.nodes.size >= 3`   |
| Edges created          | `sg.graph.edges.size >= 2`   |
| All nodes positioned   | Each node has valid position |
| All edges rendered     | Edge lines visible           |
| No spec errors         | Console has no errors        |

---

#### Layer 1: Core Rendering

**D.3.4 basic.html — Basic Shapes and Edges**

| Behavior           | Verification                   |
| ------------------ | ------------------------------ |
| ShapeNode variants | Box, sphere, circle all render |
| Edge rendering     | Lines connect nodes            |
| Line2 material     | World-space thickness          |
| Color application  | Colors match spec              |
| Position/rotation  | Transforms applied             |

**Test Sequence:**

1. Load basicDemo (5 nodes, 5 edges)
2. Verify each node type renders correctly
3. Verify edges connect correct nodes
4. Rotate camera 45°, verify all still visible
5. Screenshot comparison

---

**D.3.5 edges.html — Edge Type Variants**

| Behavior      | Verification                         |
| ------------- | ------------------------------------ |
| CurvedEdge    | Bezier curve with control point      |
| FlowEdge      | Animated dash pattern                |
| LabeledEdge   | Text label rendered                  |
| DottedEdge    | Dotted line style                    |
| Edge hit test | Click edge, `edge:click` event fires |

**Test Sequence:**

1. Load edgesDemo
2. For each edge type:
    - Verify visual appearance
    - Verify animation (for FlowEdge)
    - Hover edge, verify pointerenter event
3. Click each edge type, verify event

---

**D.3.6 instanced.html — GPU Instancing**

| Behavior           | Verification                             |
| ------------------ | ---------------------------------------- |
| InstancedShapeNode | Single draw call for many nodes          |
| Instance count     | `InstancedMesh.count` matches node count |
| Performance        | 100+ nodes at 60fps                      |
| Instance update    | Position/rotation updates apply          |
| Picking            | Raycast hits correct instance            |

**Test Sequence:**

1. Load with 100 instances
2. Verify draw call count < 10
3. Verify 60fps maintained
4. Drag instance, verify only that instance moves
5. Add load test: 1000 instances, verify still 30fps+

---

**D.3.7 large.html — Stress Testing**

| Behavior        | Verification                  |
| --------------- | ----------------------------- |
| BVH raycasting  | Fast picking with 1000+ nodes |
| Frustum culling | Off-screen nodes not rendered |
| LOD system      | Distant nodes simplified      |
| Memory usage    | No memory leak on add/remove  |
| Responsive      | UI remains interactive        |

**Test Sequence:**

1. Load 1000 nodes
2. Measure raycast time < 16ms
3. Rotate camera, verify FPS > 30
4. Add 500 more nodes, verify no crash
5. Rapidly add/remove nodes, check memory

---

#### Layer 2: 3D Spatial

**D.3.8 basic-3d.html — Z-Depth Positioning**

| Behavior       | Verification                      |
| -------------- | --------------------------------- |
| Z-coordinate   | Nodes at different Z levels       |
| Depth sorting  | Correct occlusion                 |
| Camera orbit   | Rotation in 3D space              |
| Z-axis visible | Nodes in front block nodes behind |
| Depth picking  | Raycast respects Z                |

**Test Sequence:**

1. Create nodes at Z = -100, 0, 100
2. Rotate camera 90° around Y
3. Verify depth order changes visually
4. Click front node, verify correct hit
5. Orbit to different angle, verify

---

**D.3.9 globe.html — Spherical Positioning**

| Behavior           | Verification                 |
| ------------------ | ---------------------------- |
| GlobeNode sphere   | SphereGeometry renders       |
| Latitude/longitude | Markers at correct positions |
| Texture mapping    | Earth texture applied        |
| Marker hit test    | Click marker, event fires    |
| Globe rotation     | Auto-rotate option           |

**Test Sequence:**

1. Load GlobeNode with markers
2. Verify markers at specified lat/lng
3. Rotate globe, verify markers move
4. Click marker, verify `marker:click` event
5. Zoom in, verify marker detail

---

**D.3.10 scene.html — GLTF Model Loading**

| Behavior       | Verification                |
| -------------- | --------------------------- |
| SceneNode init | GLTFLoader starts           |
| Model loaded   | Mesh appears in scene       |
| Auto-scaling   | Model fits specified size   |
| Picking mesh   | Invisible proxy for raycast |
| Animation      | Optional auto-rotation      |

---

#### Layer 3: Interaction Foundation

**D.3.11 fingering.html — Fingering State Machine**

| Behavior             | Verification                      |
| -------------------- | --------------------------------- |
| Priority acquisition | Higher priority fingering wins    |
| Exclusivity          | Only one fingering active         |
| Start/update/stop    | Lifecycle events fire             |
| Defer mechanism      | Lower priority yields             |
| Multi-finger         | Each finger tracked independently |

**Test Sequence:**

```typescript
// Test priority acquisition
1. Start NodeDrag (priority 100)
2. Verify activeFingering is NodeDrag
3. Attempt to start CameraOrbit (priority 40)
4. Verify NodeDrag still active (doesn't yield)
5. NodeDrag.stop()
6. Verify CameraOrbit now active
```

---

**D.3.12 interactive.html — Node Dragging**

| Behavior          | Verification                     |
| ----------------- | -------------------------------- |
| Drag initiation   | Click+drag on node starts drag   |
| Drag plane        | Plane perpendicular to camera    |
| Position update   | Node follows cursor              |
| Event emission    | `dragstart`, `drag`, `dragend`   |
| Multi-select drag | All selected nodes move together |

**Test Sequence:**

```
1. Hover node, verify `node:pointerenter`
2. Mouse down on node, verify `dragstart`
3. Move mouse 50px right
4. Verify node.position.x increased by ~50
5. Mouse up, verify `dragend`
6. Verify node at new position
```

---

**D.3.13 selection.html — Box Selection**

| Behavior         | Verification                 |
| ---------------- | ---------------------------- |
| Shift+drag start | Box selection begins         |
| Selection box    | Visual rectangle drawn       |
| Nodes in box     | All contained nodes selected |
| Edge selection   | Edges also selectable        |
| Add to selection | Ctrl+Shift adds to existing  |

**Test Sequence:**

```
1. Press and hold Shift
2. Drag from (100,100) to (500,500)
3. Verify selection box appears
4. Release mouse
5. Verify `selection:change` event
6. Verify all nodes in box are selected
```

---

**D.3.14 z-drag.html — Z-Axis Dragging**

| Behavior           | Verification                     |
| ------------------ | -------------------------------- |
| Alt+drag mode      | Z-axis drag activates            |
| Depth movement     | Node moves along camera forward  |
| Distance preserved | Initial pick distance maintained |
| Visual feedback    | Cursor changes or indicator      |
| Exit mode          | Release Alt, return to planar    |

**Test Sequence:**

```
1. Start dragging node
2. Press and hold Alt
3. Move mouse up
4. Verify node.z decreases (moves closer)
5. Release Alt
6. Verify planar drag resumes
```

---

#### Layer 4: Advanced Interaction

**D.3.15 html-node.html — CSS3D Rendering**

| Behavior          | Verification                        |
| ----------------- | ----------------------------------- |
| DOM element       | HTML rendered in CSS3D              |
| Position sync     | DOM position matches graph position |
| Backing mesh      | Invisible mesh for picking          |
| Content rendering | HTML content visible                |
| Transform updates | Position changes reflect            |

---

**D.3.16 html-interactive.html — Interactive Zones**

| Behavior           | Verification                                     |
| ------------------ | ------------------------------------------------ |
| Editable content   | Text input works                                 |
| Scrollable regions | Scroll within HtmlNode                           |
| Veto zones         | `isDraggable` returns false in interactive areas |
| Event relay        | DOM events flow through InputManager             |
| No conflict        | Drag outside interactive zone works              |

**Test Sequence:**

```
1. Load HtmlNode with editable content
2. Click editable area
3. Type text, verify content updates
4. Click outside editable area
5. Drag, verify node moves
6. Click editable area again
7. Drag, verify node does NOT move (veto)
```

---

**D.3.17 connection.html — Edge Creation**

| Behavior         | Verification                  |
| ---------------- | ----------------------------- |
| Connection mode  | Alt+drag starts wiring        |
| Wire preview     | Line follows cursor           |
| Target highlight | Valid targets highlighted     |
| Type checking    | Only compatible ports connect |
| Edge created     | `connection:complete` event   |

**Test Sequence:**

```
1. Hover node
2. Press and hold Alt
3. Drag toward target node
4. Verify wire preview appears
5. Release on target
6. Verify edge created
7. Verify `connection:complete` event
```

---

**D.3.18 resize.html — Node Resize**

| Behavior        | Verification                  |
| --------------- | ----------------------------- |
| Resize handles  | Visible on hover              |
| Handle priority | Resize (200) beats drag (100) |
| Resize feedback | Size changes during drag      |
| Aspect ratio    | Optional preserve aspect      |
| Bounds update   | bounds3D reflects new size    |

---

#### Layer 5: Visual Feedback

**D.3.19 activity.html — Activity Pulse**

| Behavior          | Verification                     |
| ----------------- | -------------------------------- |
| Initial pulse     | `pulse(1.0)` sets activity = 1.0 |
| Exponential decay | Activity decreases over time     |
| Visual effect     | Emissive/glow based on activity  |
| Event pulse       | Interaction events trigger pulse |
| Decay rate        | Configurable half-life           |

**Test Sequence:**

```
1. Click node
2. Verify activity = 1.0
3. Wait 500ms
4. Verify activity ~ 0.5 (half-life)
5. Wait another 500ms
6. Verify activity ~ 0.25
7. Verify visual effect matches
```

---

**D.3.20 hover.html — Hover Highlighting**

| Behavior         | Verification                    |
| ---------------- | ------------------------------- |
| Hover enter      | `node:pointerenter` fires       |
| Hover leave      | `node:pointerleave` fires       |
| Visual highlight | Emissive/color change           |
| Hover tracking   | `hoveredNode` updated           |
| Camera movement  | Hover updates when camera moves |

---

**D.3.21 selection-visual.html — Selection Glow**

| Behavior          | Verification               |
| ----------------- | -------------------------- |
| Selection glow    | Emissive on selected nodes |
| Multi-select      | All selected nodes glow    |
| Selection outline | Optional outline renderer  |
| Edge selection    | Edges also highlight       |
| Clear selection   | Click empty deselects      |

---

#### Layer 6: Layout System

**D.3.22 layout.html — Grid Layout**

| Behavior        | Verification                   |
| --------------- | ------------------------------ |
| Layout trigger  | `applyLayout('GridLayout')`    |
| Position update | Nodes move to grid positions   |
| Animation       | Smooth transition to positions |
| Config options  | Columns, cellWidth, gap        |
| Re-layout       | Add node, auto-relayout        |

---

**D.3.23 force.html — Force-Directed Layout**

| Behavior         | Verification                   |
| ---------------- | ------------------------------ |
| Force simulation | Nodes repel, edges attract     |
| 3D forces        | Full 3D force calculation      |
| Convergence      | Layout stabilizes over time    |
| Interactive      | Drag node, forces adjust       |
| Config           | Repulsion, attraction, gravity |

---

**D.3.24 3d-layout.html — 3D Layouts**

| Behavior         | Verification               |
| ---------------- | -------------------------- |
| SphereLayout     | Nodes on sphere surface    |
| 3D Grid          | Nodes in Z layers          |
| SpectralLayout   | 3D eigenvector positioning |
| GeoLayout        | Globe positioning          |
| Layout switching | Transition between layouts |

---

#### Layer 7: Zoom Navigation

**D.3.25 fractal.html — Fractal Zoom**

| Behavior        | Verification                |
| --------------- | --------------------------- |
| Zoom levels     | 5 levels defined            |
| Level indicator | UI shows current level      |
| Level change    | Zoom transitions smoothly   |
| Content reveal  | Different content per level |
| Keyboard +/-    | Adjust level via keys       |

---

**D.3.26 fly-to.html — Fly-To Animation**

| Behavior     | Verification                |
| ------------ | --------------------------- |
| Double-click | Zooms to node               |
| Animation    | Smooth camera transition    |
| Easing       | Ease-out cubic              |
| Distance     | Camera positioned correctly |
| Zoom stack   | History for zoom-out        |

**Test Sequence:**

```
1. Double-click on node
2. Verify camera animates to node
3. Verify camera distance ~ node.size * 2
4. Press Page Up or Escape
5. Verify camera returns to previous view
```

---

**D.3.27 orthographic.html — Orthographic Toggle**

| Behavior           | Verification              |
| ------------------ | ------------------------- |
| Toggle             | Switch projection mode    |
| Orthographic view  | No perspective distortion |
| Preserved position | Target and rotation kept  |
| Keyboard shortcut  | 'o' key toggles           |
| Pick accuracy      | Raycasting works in ortho |

---

#### Layer 8: Application Integration

**D.3.28 n8n-workflow.html — Full Workflow Editor**

| Behavior            | Verification                    |
| ------------------- | ------------------------------- |
| Node palette        | Drag nodes from palette         |
| Connection workflow | Complete node connection flow   |
| Property panel      | Edit node properties            |
| Execution           | Run workflow (visual indicator) |
| Zoom/pan            | Navigate large workflows        |

---

**D.3.29 plugins.html — Plugin System**

| Behavior           | Verification              |
| ------------------ | ------------------------- |
| Plugin load        | Plugins initialize        |
| Plugin interaction | Plugin affects graph      |
| Plugin events      | Plugin emits events       |
| Plugin config      | Configure plugin settings |
| Plugin disable     | Disable and cleanup       |

---

**D.3.30 quickstart.html — End-to-End User Journey**

| Behavior           | Verification            |
| ------------------ | ----------------------- |
| Load quickstart    | Page loads successfully |
| Interactive demo   | All interactions work   |
| Help overlay       | Instructions visible    |
| Smooth performance | No jank or errors       |
| Screenshot match   | Matches reference       |

---

### D.4 Automated Test Runner

```typescript
// test/integration/demo-runner.ts
import { test, expect } from '@playwright/test';

interface DemoTestCase {
    name: string;
    url: string;
    behaviors: BehaviorTest[];
    timeout?: number;
}

interface BehaviorTest {
    description: string;
    action: string;
    verify: string;
    timeout?: number;
}

const DEMO_TESTS: DemoTestCase[] = [
    {
        name: 'basic',
        url: '/demo/basic.html',
        behaviors: [
            { description: 'Canvas visible', action: 'load', verify: 'canvas.visible' },
            {
                description: '5 nodes rendered',
                action: 'wait(1000)',
                verify: 'graph.nodes.size == 5',
            },
            { description: '5 edges rendered', action: 'none', verify: 'graph.edges.size == 5' },
            { description: 'No errors', action: 'none', verify: 'console.errors == []' },
        ],
    },
    {
        name: 'interactive',
        url: '/demo/interactive.html',
        behaviors: [
            { description: 'Canvas visible', action: 'load', verify: 'canvas.visible' },
            { description: 'Drag starts', action: 'mousedown(node1)', verify: 'event.dragstart' },
            {
                description: 'Node moves',
                action: 'mousemove(100,100)',
                verify: 'node.position.changed',
            },
            { description: 'Drag ends', action: 'mouseup', verify: 'event.dragend' },
        ],
    },
    // ... all demos
];

for (const demo of DEMO_TESTS) {
    test.describe(`Demo: ${demo.name}`, () => {
        for (const behavior of demo.behaviors) {
            test(behavior.description, async ({ page }) => {
                await page.goto(demo.url);
                await executeAction(page, behavior.action);
                await verifyBehavior(page, behavior.verify);
            });
        }
    });
}
```

---

### D.5 Continuous Integration Matrix

| Demo             | Render | Interaction | 3D  | Layout | Performance |
| ---------------- | ------ | ----------- | --- | ------ | ----------- |
| empty            | ✅     | -           | -   | -      | -           |
| single-node      | ✅     | -           | -   | -      | -           |
| basic            | ✅     | ✅          | -   | -      | -           |
| edges            | ✅     | ✅          | -   | -      | -           |
| instanced        | ✅     | -           | -   | -      | ✅          |
| large            | ✅     | -           | ✅  | -      | ✅          |
| basic-3d         | ✅     | ✅          | ✅  | -      | -           |
| globe            | ✅     | ✅          | ✅  | ✅     | -           |
| fingering        | -      | ✅          | -   | -      | -           |
| interactive      | ✅     | ✅          | -   | -      | -           |
| selection        | -      | ✅          | -   | -      | -           |
| z-drag           | -      | ✅          | ✅  | -      | -           |
| html-node        | ✅     | ✅          | ✅  | -      | -           |
| html-interactive | ✅     | ✅          | ✅  | -      | -           |
| connection       | -      | ✅          | -   | -      | -           |
| activity         | ✅     | ✅          | -   | -      | -           |
| layout           | ✅     | -           | -   | ✅     | -           |
| force            | ✅     | -           | ✅  | ✅     | ✅          |
| fractal          | ✅     | ✅          | -   | -      | -           |
| fly-to           | ✅     | ✅          | ✅  | -      | -           |

---

### D.6 Test Execution Order

**Phase 1 (Infrastructure):**

1. empty.html
2. single-node.html
3. verification.html

**Phase 2 (Rendering):** 4. basic.html 5. edges.html 6. instanced.html 7. large.html

**Phase 3 (3D Spatial):** 8. basic-3d.html 9. globe.html 10. scene.html

**Phase 4 (Interaction Foundation):** 11. fingering.html 12. interactive.html 13. selection.html 14. z-drag.html

**Phase 5 (Advanced Interaction):** 15. html-node.html 16. html-interactive.html 17. connection.html 18. resize.html

**Phase 6 (Visual Feedback):** 19. activity.html 20. hover.html 21. selection-visual.html

**Phase 7 (Layout):** 22. layout.html 23. force.html 24. hierarchical.html 25. 3d-layout.html

**Phase 8 (Zoom):** 26. fractal.html 27. fly-to.html 28. orthographic.html

**Phase 9 (Integration):** 29. n8n-workflow.html 30. plugins.html 31. quickstart.html

---

### D.7 Regression Test Checklist

After any code change, run:

- [ ] All Layer 0 tests pass (infrastructure)
- [ ] All Layer 1 tests pass (rendering)
- [ ] All Layer 2 tests pass (3D)
- [ ] All Layer 3 tests pass (interaction foundation)
- [ ] All Layer 4 tests pass (advanced interaction)
- [ ] All Layer 5 tests pass (visual feedback)
- [ ] All Layer 6 tests pass (layout)
- [ ] All Layer 7 tests pass (zoom)
- [ ] All Layer 8 tests pass (integration)
- [ ] Screenshot comparison matches baseline
- [ ] No console errors
- [ ] Performance metrics within threshold

---

_Version: 2.0 (3D-Native Definitive Plan)_
_Date: 2026-04-08_
_Status: Ready for Implementation_
