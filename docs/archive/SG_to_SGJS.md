# SG → SGJS: Comprehensive Development Plan

> Absorbing lessons from SpaceGraphC (C++/Bullet Physics/OpenGL) and SpaceGraphJ (Java/JOGL 2D) into SpaceGraphJS (TypeScript/Three.js).

---

## Part 1: Architecture Foundations

### 1.1 Unified `Surface` Abstraction

**Sources**: SGJ's `Surface` hierarchy (everything is a Surface) | SGJS gap: fragmented node types

**Problem**: Node types are fragmented — `Node`, `DOMNode`, `ShapeNode`, `InstancedNode`, `HtmlNode` each have different capabilities. Edges are a separate hierarchy entirely (`Edge` extends `EventEmitter`, not `Node`). No unified "thing in the scene" abstraction.

**Current state**:

- `Node` (`src/nodes/Node.ts`): extends `EventEmitter<NodeEventMap>`, has `position`, `rotation`, `scale`, abstract `object: THREE.Object3D`
- `Edge` (`src/edges/Edge.ts`): extends `EventEmitter<EdgeEventMap>`, has `source`, `target`, `line: Line2`, `geometry: LineGeometry`
- No shared base between them

**Apply**: Introduce a `Surface`-like base that all nodes and edges share:

```typescript
// src/core/Surface.ts
import * as THREE from 'three';
import { EventEmitter } from './EventEmitter';

export interface HitResult {
    surface: Surface;
    point: THREE.Vector3;
    localPoint: THREE.Vector3;
    distance: number;
}

export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export abstract class Surface extends EventEmitter<{
    pointerenter: { surface: Surface };
    pointerleave: { surface: Surface };
    pointerdown: { surface: Surface; event: PointerEvent };
    pointerup: { surface: Surface; event: PointerEvent };
}> {
    abstract bounds: Rect;
    abstract hitTest(ray: THREE.Raycaster): HitResult | null;
    abstract start(): void;
    abstract stop(): void;
    abstract delete(): void;

    parent?: Surface;
    children: Surface[] = [];
    visible = true;

    parentOrSelf(): Surface {
        return this.parent ?? this;
    }
    parent(predicate: (s: Surface) => boolean): Surface | null {
        let current: Surface | undefined = this.parent;
        while (current) {
            if (predicate(current)) return current;
            current = current.parent;
        }
        return null;
    }
    ancestors(): Surface[] {
        const result: Surface[] = [];
        let current: Surface | undefined = this.parent;
        while (current) {
            result.push(current);
            current = current.parent;
        }
        return result;
    }
    descendants(): Surface[] {
        const result: Surface[] = [];
        for (const child of this.children) {
            result.push(child, ...child.descendants());
        }
        return result;
    }
}
```

**Migration path**:

1. `Node` extends `Surface` instead of `EventEmitter` directly
2. `Edge` extends `Surface` instead of `EventEmitter` directly
3. `Graph` methods (`addNode`, `addEdge`) work unchanged — `Surface` is a superset
4. `InteractionPlugin` raycasting returns `HitResult` with unified `surface` field

**Priority**: High Impact, High Effort (2-3 weeks). Major refactor but simplifies everything downstream.

**Implementation checklist**:

- [ ] Create `src/core/Surface.ts` with base class
- [ ] Update `Node` to extend `Surface`
- [ ] Update `Edge` to extend `Surface`
- [ ] Update `InteractionPlugin` to use `HitResult.surface`
- [ ] Update `HoverManager` to work with `Surface`
- [ ] Update `SelectionManager` to work with `Surface`
- [ ] Add `bounds` getter to all node types
- [ ] Add `hitTest` to all node/edge types
- [ ] Update `Graph` type constraints
- [ ] Run full test suite

---

### 1.2 Exclusive Input State Machine (Fingering)

**Sources**: SGJ's `Finger`/`Fingering` system | SGC's event consumption (widget → body → camera) | SGJS gap: conflicting input layers

**Problem**: Input is split across `InputManager` (`src/input/InputManager.ts`), `CameraControls` (`src/core/CameraControls.ts`), and `InteractionPlugin` (`src/plugins/InteractionPlugin.ts`). These layers conflict — dragging a node vs. orbiting vs. box-selecting has no explicit exclusivity. `CameraControls` has its own DOM listeners (`setupEventListeners()`) that run independently of `InputManager`.

**Current state**:

- `CameraControls` listens directly to `domElement` for `pointerdown`/`pointermove`/`pointerup`/`wheel`
- `InteractionPlugin` receives events through `EventSystem` from `InputManager`
- No coordination between them — both fire on left-drag

**Apply**: Unified fingering system with priority-based acquisition:

```typescript
// src/input/Fingering.ts
import type { PointerEventData } from './InputManager';

export interface Finger {
    position: { x: number; y: number };
    buttons: number;
    state: 'down' | 'move' | 'up';
    target: Surface | null;
}

export abstract class Fingering {
    abstract start(finger: Finger): boolean;
    abstract update(finger: Finger): boolean; // false = done
    abstract stop(finger: Finger): void;
    defer(finger: Finger): boolean {
        return true;
    } // allow preemption
}

export class FingerManager {
    private activeFingering: Fingering | null = null;
    private readonly fingers = new Map<number, Finger>(); // pointerId → Finger

    test(next: Fingering, finger: Finger): boolean {
        if (this.activeFingering?.defer(finger) ?? true) {
            this.activeFingering?.stop(finger);
            this.activeFingering = next;
            return next.start(finger);
        }
        return false;
    }

    update(finger: Finger): void {
        this.activeFingering?.update(finger);
    }

    end(finger: Finger): void {
        this.activeFingering?.stop(finger);
        this.activeFingering = null;
    }

    isActive(): boolean {
        return this.activeFingering !== null;
    }
    getActive(): Fingering | null {
        return this.activeFingering;
    }
}
```

**Concrete Fingerings**: `NodeDragging`, `BoxSelecting`, `CameraOrbiting`, `CameraPanning`, `CameraZooming`, `Resizing`, `Hovering`, `Wiring`, `PanelMoving`

**Integration with existing code**:

- Replace `CameraControls`'s direct DOM listeners with `FingerManager`-mediated events
- `InteractionPlugin`'s handlers become `Fingering` implementations
- `DragHandler.startDrag()` → `NodeDraggingFingering.start()`
- `SelectionManager.startBoxSelection()` → `BoxSelectingFingering.start()`

**Priority**: High Impact, Medium Effort (1 week). Resolves input conflicts cleanly.

**Implementation checklist**:

- [ ] Create `src/input/Fingering.ts`
- [ ] Create concrete `Fingering` classes in `src/input/fingerings/`
- [ ] Integrate `FingerManager` into `InputManager`
- [ ] Update `CameraControls` to accept events from `FingerManager` instead of direct DOM
- [ ] Convert `DragHandler` to `NodeDraggingFingering`
- [ ] Convert `SelectionManager` box selection to `BoxSelectingFingering`
- [ ] Convert `ConnectionHandler` to `WiringFingering`
- [ ] Convert `ResizeHandler` to `ResizingFingering`
- [ ] Update `InteractionPlugin` to use `FingerManager`
- [ ] Remove `window.__spacegraph_altKey` global (use `Finger` state)

---

### 1.3 Event Consumption Model (SGC Pattern)

**Sources**: SGC's `faceContainer.onMouseButton()` → `AbstractBody::isDraggable()` → camera fallback

**Current state**: `InputManager.handleEvent()` iterates bindings by priority but doesn't support early termination / consumption.

**Apply**: Add `consumed` flag to event flow:

```typescript
// Extend InputEvent in src/input/InputManager.ts
export interface InputEvent<T = unknown> {
    type: InputEventType;
    source: string;
    timestamp: number;
    data: T;
    originalEvent?: unknown;
    consumed: boolean;  // NEW
}

// In InputManager.handleEvent():
handleEvent(event: InputEvent): void {
    if (!this.enabled) return;
    const source = event.source;
    if (this.state.disabledInputs.has(source)) return;
    if (this.state.activeInput && this.state.activeInput !== source) return;

    for (const binding of this.bindings) {
        if (event.consumed) break;  // NEW: stop propagation
        if (binding.sources.includes(source) && binding.eventType === event.type) {
            if (binding.predicate && !binding.predicate(event)) continue;
            const action = this.actions.get(binding.action);
            if (action && (!action.enabled || action.enabled())) {
                action.handler(event, this.context);
            }
        }
    }
}

// Handler marks event as consumed:
const action: InputAction = {
    id: 'node:drag',
    label: 'Drag Node',
    handler: (event, context) => {
        // ... handle drag ...
        event.consumed = true;  // Prevents camera rotation
    },
};
```

**Priority**: High (Phase 1). Fix ambiguity immediately.

**Implementation checklist**:

- [ ] Add `consumed: boolean` to `InputEvent` interface
- [ ] Add early-termination loop in `InputManager.handleEvent()`
- [ ] Update all interaction handlers to set `event.consumed = true` when appropriate
- [ ] Ensure `CameraControls` respects consumed events (or move into binding system)

---

### 1.4 Coordinate Space Transforms

**Sources**: SGJ's `Finger.push(SurfaceTransform, fn)` | SGJS gap: node-local coordinate spaces are implicit

**Current state**: `DragHandler` works in world space only. `GroupNode` children have positions relative to parent `THREE.Object3D` but drag calculations ignore this.

**Apply**:

```typescript
// src/input/SurfaceTransform.ts
import * as THREE from 'three';

export interface SurfaceTransform {
    worldToLocal(world: THREE.Vector3): THREE.Vector3;
    localToWorld(local: THREE.Vector3): THREE.Vector3;
}

// In DragHandler:
startDrag(node: Node): boolean {
    const transform = this.getNodeTransform(node);
    // Use transform.worldToLocal() for drag plane setup
    // Use transform.localToWorld() for position updates
}

private getNodeTransform(node: Node): SurfaceTransform {
    const parent = node.object?.parent;
    if (parent && parent !== this.sg.renderer.scene) {
        return {
            worldToLocal: (w) => parent.worldToLocal(w.clone()),
            localToWorld: (l) => parent.localToWorld(l.clone()),
        };
    }
    return {
        worldToLocal: (w) => w.clone(),
        localToWorld: (l) => l.clone(),
    };
}
```

**Priority**: Medium (1 week).

**Implementation checklist**:

- [ ] Create `src/input/SurfaceTransform.ts`
- [ ] Add `getNodeTransform()` helper to `DragHandler`
- [ ] Update drag calculations to use transforms
- [ ] Test dragging inside `GroupNode` children
- [ ] Add transform support to `ResizeHandler`

---

## Part 2: Layout System

### 2.1 Lazy Layout via Dirty Flag

**Sources**: SGJ's `ContainerSurface` with `VarHandle`-based `mustLayout` CAS pattern | SGJS gap: imperative layout with no auto-trigger

**Problem**: Layout plugins (`ForceLayout`, `GridLayout`, etc.) are invoked imperatively via `apply()`. If a node moves or is added, nothing automatically triggers a relayout.

**Current state**:

- `AutoLayoutPlugin` (`src/plugins/AutoLayoutPlugin.ts`) calls `layout.apply()` manually
- `Graph.addNode()` emits `node:added` event but no layout plugin listens to it
- No dirty flag mechanism exists

**Apply**: Add `needsLayout` dirty flag to layout containers:

```typescript
// src/plugins/LayoutContainer.ts
import type { Graph } from '../core/Graph';
import type { Node } from '../nodes/Node';

export abstract class LayoutContainer {
    protected needsLayout = false;
    protected graph: Graph;

    constructor(graph: Graph) {
        this.graph = graph;
        // Auto-listen to graph mutations
        graph.on('node:added', () => this.markDirty());
        graph.on('node:removed', () => this.markDirty());
    }

    markDirty(): void {
        this.needsLayout = true;
    }

    onPreRender(dt: number): void {
        if (this.needsLayout) {
            this.needsLayout = false;
            this.doLayout(dt);
        }
    }

    protected abstract doLayout(dt: number): void;
}
```

**Integration**: Existing layout plugins extend `LayoutContainer` instead of being standalone. `AutoLayoutPlugin` calls `container.onPreRender(dt)` in its own `onPreRender`.

**Priority**: High Impact, Low Effort (2 days). Eliminates manual `applyLayout()` calls.

**Implementation checklist**:

- [ ] Create `src/plugins/LayoutContainer.ts`
- [ ] Update `ForceLayout` to extend `LayoutContainer`
- [ ] Update `GridLayout` to extend `LayoutContainer`
- [ ] Update all layout plugins to extend `LayoutContainer`
- [ ] Update `AutoLayoutPlugin` to call `onPreRender` on containers
- [ ] Test auto-relayout on node add/remove/move

---

### 2.2 Compositional Layout Containers

**Sources**: SGJ's `Stacking`, `Gridding`, `Bordering`, `Splitting`, `Switching`, `ScrollXY` | SGJS gap: monolithic layout plugin

**Apply**: Introduce compositional layout containers as node types:

```typescript
// src/nodes/StackingNode.ts
export class StackingNode extends GroupNode {
    // All children share bounds, rendered in z-order
    onPreRender(_dt: number): void {
        const bounds = this.getBounds();
        for (const child of this.children) {
            child.position.copy(this.position);
        }
    }
}

// src/nodes/GridNode.ts
export class GridNode extends GroupNode {
    columns = 3;
    cellWidth = 200;
    cellHeight = 150;
    gap = 20;

    onPreRender(_dt: number): void {
        this.children.forEach((child, i) => {
            const col = i % this.columns;
            const row = Math.floor(i / this.columns);
            child.position.set(
                this.position.x + col * (this.cellWidth + this.gap),
                this.position.y - row * (this.cellHeight + this.gap),
                this.position.z,
            );
        });
    }
}

// src/nodes/SplitNode.ts
export class SplitNode extends GroupNode {
    splitRatio = 0.5;
    splitAxis: 'horizontal' | 'vertical' = 'horizontal';
    isDraggingDivider = false;
    // ... divider interaction logic
}

// src/nodes/BorderNode.ts
export class BorderNode extends GroupNode {
    // 9 regions: NORTH, SOUTH, EAST, WEST, CENTER, NW, NE, SW, SE
    regions = new Map<string, Node>();
}

// src/nodes/SwitchNode.ts
export class SwitchNode extends GroupNode {
    activeIndex = 0;
    onPreRender(_dt: number): void {
        this.children.forEach((child, i) => {
            child.visible = i === this.activeIndex;
        });
    }
}
```

**Registration**: Add to `NODE_TYPES` in `SpaceGraph.ts` and register in `init()`.

**Priority**: High Impact, Medium Effort (1 week).

**Implementation checklist**:

- [ ] Create `src/nodes/StackingNode.ts`
- [ ] Create `src/nodes/GridNode.ts`
- [ ] Create `src/nodes/SplitNode.ts`
- [ ] Create `src/nodes/BorderNode.ts`
- [ ] Create `src/nodes/SwitchNode.ts`
- [ ] Register all in `SpaceGraph.ts` `NODE_TYPES`
- [ ] Add `children` management to `GroupNode`
- [ ] Add `onPreRender` hook to `Node` base class
- [ ] Call `node.onPreRender?.(dt)` in `SpaceGraph.animate()`
- [ ] Write tests for nested layouts

---

### 2.3 Virtualized / Infinite Scrolling

**Sources**: SGJ's `ScrollXY.DynGrid` with cell culling | SGJS gap: all nodes always instantiated

**Current state**: `CullingManager` (`src/core/CullingManager.ts`) hides off-screen nodes from camera but doesn't prevent instantiation.

**Apply**:

```typescript
// src/nodes/VirtualGridNode.ts
export class VirtualGridNode<T> extends GroupNode {
    model: GridModel<T>;
    cellRenderer: (x: number, y: number, value: T) => NodeSpec;
    visibleCells = new Map<string, Node>();
    cellWidth = 200;
    cellHeight = 150;

    onPreRender(_dt: number): void {
        const viewRect = this.getViewRect();
        const neededCells = this.computeNeededCells(viewRect);

        // Remove off-screen cells
        for (const [key, node] of this.visibleCells) {
            if (!neededCells.has(key)) {
                this.sg.graph.removeNode(node.id);
                this.visibleCells.delete(key);
            }
        }

        // Instantiate on-screen cells
        for (const [key, data] of neededCells) {
            if (!this.visibleCells.has(key)) {
                const spec = this.cellRenderer(data.x, data.y, data.value);
                const node = this.sg.graph.addNode(spec);
                if (node) this.visibleCells.set(key, node);
            }
        }
    }

    private getViewRect(): Rect {
        /* project camera frustum to grid space */
    }
    private computeNeededCells(viewRect: Rect): Map<string, GridCell<T>> {
        /* ... */
    }
}
```

**Priority**: High Impact, Medium Effort (1 week).

**Implementation checklist**:

- [ ] Create `src/nodes/VirtualGridNode.ts`
- [ ] Create `src/nodes/GridModel.ts`
- [ ] Add `getViewRect()` helper using `CameraControls` + frustum
- [ ] Register in `SpaceGraph.ts`
- [ ] Benchmark with 10k+ node grid
- [ ] Add configurable cell pooling

---

## Part 3: Input & Interaction

### 3.1 Soft Constraint Picking → Smooth Node Dragging

**Sources**: SGC's `btPoint2PointConstraint` with `m_tau = 0.1` (soft spring), `m_impulseClamp = 30` (force limit) | SGJS gap: rigid drag plane

**Current state**: `DragHandler.updateDrag()` (`src/plugins/interaction/DragHandler.ts:77`) does `newPosition.copy(intersectPoint.sub(this.dragOffset))` — instant snap.

**Apply**: Add damped follow option:

```typescript
// In DragHandler:
private dragStiffness = 1.0; // 1.0 = rigid (current behavior), 0.3-0.7 = springy

startDrag(node: Node, options?: { stiffness?: number }): boolean {
    this.dragStiffness = options?.stiffness ?? 1.0;
    // ... existing setup ...
}

updateDrag(enableZAxis = false): void {
    // ... existing intersection calc ...
    const targetPosition = intersectPoint.sub(this.dragOffset);

    if (this.dragStiffness < 1.0) {
        // Damped follow (SGC-style soft constraint)
        this.dragNode.position.lerp(targetPosition, this.dragStiffness);
    } else {
        this.dragNode.position.copy(targetPosition);
    }
    // ... rest of existing logic ...
}
```

Wire to `ErgonomicsPlugin.config.dampingFactor` for unified feel.

**Priority**: Medium.

**Implementation checklist**:

- [ ] Add `dragStiffness` property to `DragHandler`
- [ ] Add `lerp` path in `updateDrag()`
- [ ] Wire to `ErgonomicsPlugin.config.dampingFactor`
- [ ] Add config option to `DefaultInputConfig`
- [ ] Test with various stiffness values
- [ ] Ensure multi-select dragging still works

---

### 3.2 Distance-Preserving Drag

**Sources**: SGC's `gOldPickingDist` reconstruction | SGJS gap: stale drag plane when camera moves

**Current state**: `DragHandler.startDrag()` creates drag plane once at drag start. If camera moves during drag, plane normal becomes stale.

**Apply**: Update drag plane's normal each frame:

```typescript
// In DragHandler:
private preserveDistance = false;
private initialPickDistance = 0;
private rayFrom = new THREE.Vector3();

startDrag(node: Node): boolean {
    // ... existing setup ...
    this.rayFrom.copy(this.sg.renderer.camera.position);
    this.initialPickDistance = this.rayFrom.distanceTo(node.position);
}

updateDrag(enableZAxis = false): void {
    if (this.preserveDistance) {
        const ndc = this.raycaster.getMouseNDC();
        const ray = this.sg.renderer.camera.getRayFromNDC(ndc.x, ndc.y);
        const target = this.rayFrom.clone().add(
            ray.direction.clone().multiplyScalar(this.initialPickDistance)
        ).sub(this.dragOffset);
        this.dragNode.position.lerp(target, this.dragStiffness);
    } else {
        // Update plane normal each frame to match current camera direction
        this.dragPlane.setFromNormalAndCoplanarPoint(
            this.sg.renderer.camera.getWorldDirection(this.dragPlane.normal),
            this.dragNode.position,
        );
        const intersectPoint = this.raycaster.raycastPlane(this.dragPlane);
        if (!intersectPoint) return;
        const newPosition = intersectPoint.sub(this.dragOffset);
        // ... existing logic ...
    }
}
```

**Priority**: Medium.

**Implementation checklist**:

- [ ] Add `preserveDistance` flag to `DragHandler`
- [ ] Store `initialPickDistance` and `rayFrom` in `startDrag()`
- [ ] Add ray-distance path in `updateDrag()`
- [ ] Update drag plane normal each frame in plane mode
- [ ] Add config toggle
- [ ] Test with camera animation during drag

---

### 3.3 Keyboard Camera Controls

**Sources**: SGC's `l/r/f/b` pan, `z/x` zoom, arrows pan, Page Up/Down zoom | SGJS gap: no keyboard camera controls

**Current state**: `CameraControls` has no keyboard handling. `InteractionPlugin.handleKeyDown()` only handles Escape, Delete, Ctrl+A, Space.

**Apply**:

```typescript
// In CameraControls:
private keyState = new Map<string, boolean>();

// Add to CameraControlsConfig:
export interface CameraControlsConfig {
    // ... existing ...
    keyPanSpeed?: number;       // default: 5.0
    keyZoomSpeed?: number;      // default: 0.4
    keyPanLeft?: string;        // default: 'l'
    keyPanRight?: string;       // default: 'r'
    keyPanFront?: string;       // default: 'f'
    keyPanBack?: string;        // default: 'b'
    keyZoomIn?: string;         // default: 'z'
    keyZoomOut?: string;        // default: 'x'
    enableKeyboard?: boolean;   // default: true
}

// Keyboard handlers:
private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.config.enableKeyboard) return;
    this.keyState.set(e.key, true);
};

private onKeyUp = (e: KeyboardEvent): void => {
    this.keyState.set(e.key, false);
};

// In update():
private processKeyboardInput(): void {
    const { keyPanSpeed, keyZoomSpeed } = this.config;
    const isPressed = (key: string) => this.keyState.get(key);

    if (isPressed(this.config.keyPanLeft))  this.panBy(-keyPanSpeed, 0);
    if (isPressed(this.config.keyPanRight)) this.panBy(keyPanSpeed, 0);
    if (isPressed(this.config.keyPanFront)) this.panBy(0, keyPanSpeed);
    if (isPressed(this.config.keyPanBack))  this.panBy(0, -keyPanSpeed);
    if (isPressed(this.config.keyZoomIn))   this.spherical.radius *= (1 - keyZoomSpeed * 0.01);
    if (isPressed(this.config.keyZoomOut))  this.spherical.radius *= (1 + keyZoomSpeed * 0.01);
}

panBy(dx: number, dy: number): void {
    const offset = new THREE.Vector3().copy(this.camera.position).sub(this.target);
    const side = new THREE.Vector3().crossVectors(this.camera.up, offset).normalize();
    const up = this.camera.up.clone().normalize();
    this.panOffset.add(side.multiplyScalar(-dx));
    this.panOffset.add(up.multiplyScalar(dy));
}
```

**Priority**: Medium.

**Implementation checklist**:

- [ ] Add keyboard config to `CameraControlsConfig`
- [ ] Add `keyState` map and key event listeners
- [ ] Add `panBy(dx, dy)` method
- [ ] Add `processKeyboardInput()` called in `update()`
- [ ] Wire up in `setupEventListeners()`
- [ ] Clean up in `dispose()`
- [ ] Add to `KeyboardShortcuts` for discoverability
- [ ] Test all key combinations

---

### 3.4 Middle-Click Fly-to-Node

**Sources**: SGC's right-click-release-on-body zoom-to-object | SGJS gap: `flyTo()` only via double-click or Space

**Current state**: `InteractionPlugin.handlePointerDown()` checks `e.button === 0` (left) and `e.button === 2` (right). Button 1 (middle) is not handled.

**Apply**:

```typescript
// In InteractionPlugin.handlePointerDown():
private handlePointerDown(e: any): void {
    // ... existing early returns ...

    const nodeResult = this.raycaster.raycastNode();
    this.raycaster.raycastEdge();

    // NEW: Middle click on node → fly to it
    if (e.button === 1 && nodeResult?.node) {
        e.originalEvent?.preventDefault();
        const node = nodeResult.node;
        const radius = Math.max((node.data?.width as number ?? 100) * 1.5, 150);
        this.sg.cameraControls.flyTo(node.position, radius);
        return;
    }

    // ... rest of existing logic ...
}
```

**Priority**: High (Phase 1). One-line addition.

**Implementation checklist**:

- [ ] Add middle-click handler to `InteractionPlugin.handlePointerDown()`
- [ ] Add `preventDefault()` for middle button
- [ ] Test with various node sizes
- [ ] Add to keyboard shortcuts help

---

### 3.5 Improved Alt Key Handling

**Sources**: SGC's per-event `glutGetModifiers()` | SGJS gap: fragile `window.__spacegraph_altKey` global

**Current state**: `InteractionPlugin.handleKeyDown()` (`src/plugins/InteractionPlugin.ts:188`) sets `window.__spacegraph_altKey`. `DragHandler` reads it via `(window as Window & { __spacegraph_altKey?: boolean }).__spacegraph_altKey`.

**Problem**: Global flag doesn't work if user Alt-tabs away and releases key outside window.

**Apply**: Use `InputManager`'s `InputState.keysPressed` set instead:

```typescript
// In InteractionPlugin.handlePointerMove():
private handlePointerMove(e: any): void {
    // ... existing ...
    if (this.dragHandler.isDraggingNode()) {
        // Use InputState instead of global
        const state = this.sg.input.getState();
        const enableZAxis = state.keysPressed.has('Alt');
        this.dragHandler.updateDrag(enableZAxis);
        return;
    }
    // ...
}

// Remove global flag from handleKeyDown/handleKeyUp:
private handleKeyDown(e: any): void {
    // REMOVED: (window as Window & { __spacegraph_altKey?: boolean }).__spacegraph_altKey = e.altKey;
    // InputState.keysPressed is already updated by InputSource.normalizeEvent()
    // ... rest unchanged ...
}
```

**Priority**: Medium.

**Implementation checklist**:

- [ ] Remove `window.__spacegraph_altKey` from `handleKeyDown()` and `handleKeyUp()`
- [ ] Update `handlePointerMove()` to use `this.sg.input.getState().keysPressed.has('Alt')`
- [ ] Verify `InputSource.normalizeEvent()` populates `keysPressed` correctly
- [ ] Test Alt-tab scenario
- [ ] Test Z-axis dragging still works

---

### 3.6 Hover Raycasting in Render Loop

**Sources**: SGC's `updatePointer()` every frame | SGJS gap: hover only runs on `pointermove` events

**Current state**: `HoverManager.updateHover()` is only called in `InteractionPlugin.handlePointerMove()`. If camera moves (fly-to animation, keyboard pan), hover state goes stale.

**Apply**:

```typescript
// In HoverManager:
private cameraMoved = false;
private pointerMoved = false;

onPointerMove(): void { this.pointerMoved = true; }
onCameraMove(): void { this.cameraMoved = true; }

update(): void {
    if (this.cameraMoved || this.pointerMoved) {
        this.raycast();
        this.pointerMoved = false;
        this.cameraMoved = false;
    }
}

// In InteractionPlugin:
this.sg.events.on('camera:move', () => this.hoverManager.onCameraMove());

// In SpaceGraph.animate():
// After cameraControls.update():
this.hoverManager.update(); // or call via InteractionPlugin.onPreRender()
```

**Priority**: Low (Phase 3).

**Implementation checklist**:

- [ ] Add `cameraMoved` flag to `HoverManager`
- [ ] Split `updateHover()` into `onPointerMove()` + `onCameraMove()` + `update()`
- [ ] Subscribe to `camera:move` event
- [ ] Call `hoverManager.update()` in render loop
- [ ] Benchmark raycast cost

---

## Part 4: Camera System

### 4.1 Zoom Stack

**Sources**: SGJ's `Zoomed` with `Deque<Surface>` (max 8) | SGJS gap: one-shot `flyTo()` with no history

**Current state**: `InteractionPlugin.handleZoomNavigation()` tracks `lastZoomedId` for double-click toggle (zoom in / zoom out). No history stack.

**Apply**:

```typescript
// In CameraControls:
private zoomStack: Array<{ target: THREE.Vector3; distance: number }> = [];
private readonly MAX_ZOOM_DEPTH = 8;

zoomTo(target: THREE.Vector3, distance: number, duration: number = 1.5): void {
    // If zooming to same target, zoom out instead
    const top = this.zoomStack.at(-1);
    if (top && top.target.distanceTo(target) < distance * 0.1) {
        this.zoomOut();
        return;
    }

    // Push to stack
    this.zoomStack.push({ target: this.target.clone(), distance: this.spherical.radius });
    if (this.zoomStack.length > this.MAX_ZOOM_DEPTH) this.zoomStack.shift();

    this.flyTo(target, distance, duration);
}

zoomOut(): void {
    if (this.zoomStack.length === 0) return;
    const prev = this.zoomStack.pop()!;
    this.flyTo(prev.target, prev.distance);
}

getZoomDepth(): number { return this.zoomStack.length; }
canZoomOut(): boolean { return this.zoomStack.length > 0; }
```

**Integration**: Update `InteractionPlugin.handleZoomNavigation()` to use `zoomTo()` instead of direct `flyTo()`.

**Priority**: High Impact, Low Effort (1 day).

**Implementation checklist**:

- [ ] Add `zoomStack` to `CameraControls`
- [ ] Add `zoomTo()` and `zoomOut()` methods
- [ ] Update `InteractionPlugin.handleZoomNavigation()` to use `zoomTo()`
- [ ] Wire Page Up to `zoomOut()`
- [ ] Add HUD indicator for zoom depth
- [ ] Test nested zoom navigation

---

### 4.2 Dual Camera Interpolation Model

**Sources**: SGC's target lerp (`camTargetNext` convergence) | SGJS's delta accumulation | Both have strengths

**Current state**: `CameraControls.update()` applies deltas directly. `flyTo()` uses gsap-like manual animation with `requestAnimationFrame`.

**Apply**: Keep delta model for direct manipulation but add SGC-style target interpolation for programmatic movement:

```typescript
// In CameraControls:
private targetNext: THREE.Vector3 | null = null;
private radiusNext: number | null = null;
private animStartTime = 0;
private animDuration = 0;
private startTarget = new THREE.Vector3();
private startRadius = 0;

setTargetSmooth(target: THREE.Vector3, radius: number, duration: number = 1.0): void {
    this.startTarget.copy(this.target);
    this.startRadius = this.spherical.radius;
    this.targetNext = target.clone();
    this.radiusNext = radius;
    this.animStartTime = performance.now();
    this.animDuration = duration * 1000;
}

update(): void {
    // Apply direct manipulation deltas (existing)
    this.spherical.theta += this.sphericalDelta.theta;
    this.spherical.phi += this.sphericalDelta.phi;
    this.spherical.phi = Math.max(0.01, Math.min(Math.PI - 0.01, this.spherical.phi));
    this.spherical.radius *= this.scale;
    this.spherical.radius = Math.max(this.config.minDistance, Math.min(this.config.maxDistance, this.spherical.radius));
    this.target.add(this.panOffset);

    // Apply programmatic target interpolation
    if (this.targetNext) {
        const elapsed = performance.now() - this.animStartTime;
        const t = Math.min(elapsed / this.animDuration, 1);
        const eased = 1 - Math.pow(1 - t, 3); // ease out cubic

        this.target.lerpVectors(this.startTarget, this.targetNext, eased);
        if (this.radiusNext) {
            this.spherical.radius = this.startRadius + (this.radiusNext - this.startRadius) * eased;
        }

        if (t >= 1) {
            this.targetNext = null;
            this.radiusNext = null;
        }
    }

    // Update camera position (existing)
    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);

    // Reset deltas (existing)
    this.sphericalDelta.set(0, 0, 0);
    this.scale = 1;
    this.panOffset.set(0, 0, 0);

    // Emit camera move event
    this.sg?.events.emit('camera:move', { position: this.camera.position.toArray(), target: this.target.toArray() });
}
```

**Refactor `flyTo()`** to use `setTargetSmooth()` internally:

```typescript
flyTo(target: THREE.Vector3, distance: number, duration: number = 1.5): void {
    this.setTargetSmooth(target, distance, duration);
}
```

**Priority**: Medium.

**Implementation checklist**:

- [ ] Add `targetNext`, `radiusNext`, animation state to `CameraControls`
- [ ] Add `setTargetSmooth()` method
- [ ] Refactor `flyTo()` to use `setTargetSmooth()`
- [ ] Update `update()` to apply programmatic interpolation
- [ ] Remove old `requestAnimationFrame` animation in `flyTo()`
- [ ] Test concurrent animations (new cancels old)
- [ ] Verify delta accumulation still works during animation

---

### 4.3 Orthographic Toggle

**Sources**: SGC's `o` key toggle | SGJS gap: no orthographic mode

**Apply**:

```typescript
// In CameraControls:
private isOrthographic = false;
private orthoCamera: THREE.OrthographicCamera | null = null;
private perspectiveCamera: THREE.PerspectiveCamera | null = null;

toggleOrthographic(): void {
    this.isOrthographic = !this.isOrthographic;
    const { renderer } = this.sg;
    if (this.isOrthographic) {
        if (!this.orthoCamera) {
            const aspect = renderer.renderer.domElement.clientWidth / renderer.renderer.domElement.clientHeight;
            const frustum = this.spherical.radius;
            this.orthoCamera = new THREE.OrthographicCamera(
                -frustum * aspect, frustum * aspect, frustum, -frustum, 0.1, 100000
            );
        }
        this.orthoCamera.position.copy(this.camera.position);
        this.orthoCamera.quaternion.copy(this.camera.quaternion);
        (renderer.renderer as THREE.WebGLRenderer).setRenderTarget(null);
        // Swap camera reference
    } else {
        // Swap back to perspective
    }
}
```

**Priority**: Low (Phase 3).

**Implementation checklist**:

- [ ] Add `toggleOrthographic()` to `CameraControls`
- [ ] Wire `o` key in `KeyboardShortcuts`
- [ ] Test with various graph layouts
- [ ] Ensure raycasting works with ortho camera

---

### 4.4 Right-Drag Zoom

**Sources**: SGC's right button dual role (drag to zoom, release to focus) | SGJS gap: scroll wheel only

**Apply**: Add right-drag zoom as alternative to scroll wheel. Configurable via `CameraControlsConfig.enableRightDragZoom`.

**Priority**: Low (Phase 3).

**Implementation checklist**:

- [ ] Add `enableRightDragZoom` config option
- [ ] Handle right-drag in `CameraControls.onPointerDown()`
- [ ] Apply zoom delta in `onPointerMove()`
- [ ] Test with context menu (ensure short right-click still works)

---

## Part 5: Widget & UI System

### 5.1 `isDraggable` Veto Pattern

**Sources**: SGC's `AbstractBody::isDraggable(localPos)` | SGJS gap: no sub-region interaction control

**Apply**:

```typescript
// In Node base class:
isDraggable(_localPos: THREE.Vector3): boolean {
    return true; // default: draggable
}

// In DragHandler.startDrag():
startDrag(node: Node, localPos?: THREE.Vector3): boolean {
    if (localPos && !node.isDraggable(localPos)) return false;
    // ... existing logic ...
}
```

**Priority**: Medium (foundation for widget system).

**Implementation checklist**:

- [ ] Add `isDraggable(localPos)` to `Node` base class
- [ ] Update `DragHandler.startDrag()` to check veto
- [ ] Test with node sub-regions

---

### 5.2 `isTouchable` Pass-Through

**Sources**: SGC's `Widget::isTouchable` flag | SGJS gap: non-interactive decorations block clicks

**Apply**:

```typescript
// In Node base class:
isTouchable = true;

// In InteractionRaycaster:
raycastNode(): HitResult | null {
    const intersects = this.raycaster.intersectObjects(scene.children, true);
    for (const hit of intersects) {
        const node = this.findNodeForObject(hit.object);
        if (node && node.isTouchable) return { node, point: hit.point };
    }
    return null;
}
```

**Priority**: Medium.

**Implementation checklist**:

- [ ] Add `isTouchable` property to `Node`
- [ ] Update `InteractionRaycaster` to check `isTouchable`
- [ ] Test with decorative nodes

---

### 5.3 Model-View Separation for Sub-Components

**Sources**: SGC's `SliderModel`/`ButtonModel` callbacks | SGJS gap: UI state coupled to rendering

**Apply**:

```typescript
// src/nodes/NodeControls.ts
export interface ButtonModel {
    label: string;
    onClick: () => void;
    enabled?: boolean;
    icon?: string;
}

export interface NodeControls {
    buttons: ButtonModel[];
    addButton(model: ButtonModel): void;
    removeButton(label: string): void;
}

// Mixin or composition on Node:
class Node {
    controls: NodeControls = { buttons: [], addButton() {}, removeButton() {} };
}
```

**Priority**: Medium (future widget system).

**Implementation checklist**:

- [ ] Create `src/nodes/NodeControls.ts`
- [ ] Add `controls` property to `Node`
- [ ] Render buttons in node `onPreRender()`
- [ ] Wire click handlers

---

### 5.4 Front-Face Child Lists

**Sources**: SGC's `PanelBox.front()` returns `Rect` children drawn on panel face | SGJS gap: no node-attached controls

**Apply**:

```typescript
// In Node:
private _faceChildren: Node[] = [];
face(): Node[] { return this._faceChildren; }
addFaceChild(child: Node): void { this._faceChildren.push(child); }
removeFaceChild(child: Node): void { this._faceChildren = this._faceChildren.filter(c => c !== child); }
```

**Priority**: Low (future).

**Implementation checklist**:

- [ ] Add face child list to `Node`
- [ ] Render face children in node `onPreRender()`
- [ ] Position face children relative to node front face

---

### 5.5 Draggable Window Panels

**Sources**: SGJ's `Windo` with `FingerMoveSurface`/`FingerResizeSurface` | SGJS gap: no draggable panels

**Current state**: `HtmlNode` is positioned but not user-draggable.

**Apply**:

```typescript
// src/nodes/PanelNode.ts
export class PanelNode extends HtmlNode {
    fixed = false;
    resizeBorder = 0.1; // 10% of width/height for resize zone
    private isDragging = false;
    private isResizing = false;
    private resizeDirection: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null = null;

    getDragMode(localPos: { x: number; y: number }): 'move' | 'resize' | null {
        if (this.fixed) return null;
        const { width = 300, height = 200 } = this.data;
        const border = this.resizeBorder;
        const nearEdge =
            localPos.x < width * border ||
            localPos.x > width * (1 - border) ||
            localPos.y < height * border ||
            localPos.y > height * (1 - border);
        return nearEdge ? 'resize' : 'move';
    }
}
```

**Priority**: Medium.

**Implementation checklist**:

- [ ] Create `src/nodes/PanelNode.ts`
- [ ] Add drag/resize fingerings
- [ ] Add resize indicator during hover
- [ ] Register in `SpaceGraph.ts`

---

### 5.6 Tooltip / Hover Overlay System

**Sources**: SGJ's `Hover<X, Y>` as a `Fingering` | SGJS gap: `HoverManager` tightly coupled to `InteractionPlugin`

**Apply**: Decouple hover into a reusable system:

```typescript
// src/plugins/HoverOverlay.ts
export class HoverOverlay<S extends Surface, T extends Surface> {
    constructor(
        source: S,
        targetBuilder: (source: S) => T,
        model: HoverModel
    ) { ... }
}

// Usage:
const tooltip = new HoverOverlay(node, (n) => buildTooltip(n), {
    offset: { x: 10, y: -10 },
    position: 'cursor',
});
```

**Priority**: Medium.

**Implementation checklist**:

- [ ] Create `src/plugins/HoverOverlay.ts`
- [ ] Decouple from `InteractionPlugin`
- [ ] Add `HoverModel` config
- [ ] Test with various surface types

---

## Part 6: Data Flow & Visual Programming

### 6.1 Port/Wiring System

**Sources**: SGJ's `Port<X>` typed connectable data ports | SGJS gap: edges are purely visual

**Apply**:

```typescript
// src/nodes/PortNode.ts
export class PortNode<T = unknown> extends ShapeNode {
    private connections: Wire<T>[] = [];
    private onReceive: ((wire: Wire<T>, data: T) => void) | null = null;

    on(callback: (wire: Wire<T>, data: T) => void): this {
        this.onReceive = callback;
        return this;
    }

    out(data: T): void {
        for (const wire of this.connections) {
            wire.send(data);
        }
    }

    connect(target: PortNode<T>): Wire<T> {
        const wire = new Wire(this, target);
        this.connections.push(wire);
        return wire;
    }
}

// src/edges/Wire.ts
export class Wire<T = unknown> {
    readonly source: PortNode<T>;
    readonly target: PortNode<T>;
    private lastActivity = 0;

    send(data: T): boolean {
        if (this.target.onReceive) {
            this.target.onReceive(this, data);
            this.lastActivity = performance.now();
            return true;
        }
        return false;
    }

    activity(now: number, window: number): number {
        const dt = now - this.lastActivity;
        return 1 / (1 + dt / window);
    }
}
```

**Priority**: High Impact, High Effort (2 weeks).

**Implementation checklist**:

- [ ] Create `src/nodes/PortNode.ts`
- [ ] Create `src/edges/Wire.ts`
- [ ] Add drag-to-wire interaction
- [ ] Add type compatibility checking
- [ ] Add visual feedback during wiring
- [ ] Register in `SpaceGraph.ts`
- [ ] Write integration tests

---

### 6.2 Activity-Based Visual Feedback

**Sources**: SGJ's `Widget.pri` (activity temperature with exponential decay) and `Wire.activity(now, window)` | SGJS gap: no built-in activity feedback

**Apply**:

```typescript
// In Node base class:
activity = 0; // 0 = idle, 1 = hot
private readonly ACTIVITY_DECAY_RATE = 0.5; // per second (2-second half-life)

onPreRender(dt: number): void {
    this.activity *= Math.exp(-dt / this.ACTIVITY_DECAY_RATE);
}

pulse(intensity: number = 1.0): void {
    this.activity = Math.max(this.activity, intensity);
}

// In Edge base class:
activity = 0;
private lastActivityTime = 0;

onPreRender(dt: number): void {
    this.activity *= Math.exp(-dt / 2); // 2-second half-life
}

pulse(intensity: number = 1.0): void {
    this.activity = Math.max(this.activity, intensity);
    this.lastActivityTime = performance.now();
}

activityDecay(now: number, window: number = 2000): number {
    const dt = now - this.lastActivityTime;
    return dt > 0 ? 1 / (1 + dt / window) : 0;
}
```

**Rendering integration**: Use `activity` in material properties:

```typescript
// In ShapeNode.onPreRender():
if (this.activity > 0.01) {
    this.meshMaterial.emissiveIntensity = this.activity * 0.5;
    this.meshMaterial.emissive.setHex(0x4488ff);
} else {
    this.meshMaterial.emissiveIntensity = 0;
}
```

**Priority**: High Impact, Low Effort (1 day). Immediate visual feedback improvement.

**Implementation checklist**:

- [ ] Add `activity` property to `Node`
- [ ] Add `activity` property to `Edge`
- [ ] Add `pulse()` method to both
- [ ] Add decay in `onPreRender()`
- [ ] Wire activity to rendering (emissive, glow)
- [ ] Pulse on node creation, drag, selection
- [ ] Pulse on edge creation, hover

---

## Part 7: Rendering Optimizations

### 7.1 Immediate-Mode Layout Containers

**Sources**: SGJ's `ContainerSurface.render()` immediate-mode | SGJS gap: Three.js retains every `THREE.Group`

**Apply**: For layout-only containers, skip Three.js object creation:

```typescript
// In GroupNode (or new LayoutNode):
private _isLayoutOnly = true;

get object(): THREE.Object3D {
    if (this._isLayoutOnly) {
        // Return a minimal Object3D — no geometry, no material
        return this._object;
    }
    return this._object;
}

// Or better: don't add to Three.js scene at all
// Just manage child positions in onPreRender()
```

**Priority**: Medium.

**Implementation checklist**:

- [ ] Identify layout-only containers
- [ ] Skip Three.js scene addition for layout nodes
- [ ] Manage child positions in `onPreRender()`
- [ ] Benchmark scene graph depth reduction

---

### 7.2 Rendering: What SGJS Already Does Better

| Area                | SGJS Advantage                                                         |
| ------------------- | ---------------------------------------------------------------------- |
| 3D rendering        | Three.js with instancing, BVH raycasting, CSS3D layering               |
| Plugin architecture | Clean `Plugin` interface with lifecycle hooks, typed events via `mitt` |
| Node type registry  | Dynamic type registration with factory pattern                         |
| Vision system       | AI-driven graph quality analysis with strategy pattern                 |
| Object pooling      | `ObjectPool` and `ObjectPoolManager` for performance                   |
| TypeScript          | Type safety, better DX                                                 |
| Edge variety        | 9 edge types with animations, curves, bundles                          |
| Build tooling       | Vite, Vitest, Playwright, TypeDoc                                      |

**Keep as-is.** These are SGJS strengths to preserve.

---

## Part 8: Proposed Default Control Configuration

Combining SGC's ergonomics with SGJS's architecture and SGJ's fingering system:

### Mouse Controls

| Input                    | Action        | Source                                         |
| ------------------------ | ------------- | ---------------------------------------------- |
| **Left drag on node**    | Drag node     | SGC (consumes event, prevents camera rotation) |
| **Left drag on empty**   | Rotate camera | SGJS default                                   |
| **Left + Shift drag**    | Box selection | SGJS existing                                  |
| **Middle drag**          | Pan camera    | SGJS existing                                  |
| **Middle click on node** | Fly to node   | SGC (zoom-to-object)                           |
| **Scroll wheel**         | Zoom          | SGJS existing                                  |
| **Right drag**           | Zoom camera   | SGC (alternative to wheel)                     |
| **Right click (short)**  | Context menu  | SGJS existing                                  |

### Keyboard Controls

| Key                   | Action                     | Source                        |
| --------------------- | -------------------------- | ----------------------------- |
| `l` / `r` / `f` / `b` | Pan camera                 | SGC                           |
| `z` / `x`             | Zoom in/out                | SGC                           |
| `o`                   | Toggle orthographic        | SGC                           |
| `w`                   | Toggle wireframe           | SGC                           |
| `Space`               | Fly to hovered node        | SGJS existing                 |
| `Escape`              | Cancel / clear selection   | SGJS existing                 |
| `Delete`              | Delete selected            | SGJS existing                 |
| `Ctrl+A`              | Select all                 | SGJS existing                 |
| `Ctrl+Z` / `Ctrl+Y`   | Undo / Redo                | SGJS existing (HistoryPlugin) |
| `Alt` + diagonal drag | Z-axis drag                | SGJS existing                 |
| `Page Up`             | Zoom out one level         | SGJ (zoom stack)              |
| Arrow keys            | Navigate adjacent surfaces | SGJ (zoom stack)              |

---

## Part 9: Implementation Priority Roadmap

### Phase 1: Fix Ambiguity (Week 1-2)

**High Impact, Low Risk**

1. **Event consumption model** — Add `consumed` flag to `InputEvent`, early-terminate in `InputManager.handleEvent()`
2. **Middle-click fly-to-node** — Add to `InteractionPlugin.handlePointerDown()`
3. **Activity property on nodes** — Add `activity`, `pulse()`, decay in `Node.onPreRender()`
4. **Zoom stack in `CameraControls`** — Add `zoomStack`, `zoomTo()`, `zoomOut()`

### Phase 2: Ergonomic Enhancements (Week 3-5)

**High Impact, Medium Effort**

5. **Keyboard camera controls** — Add key state map, `panBy()`, `processKeyboardInput()` to `CameraControls`
6. **Damped dragging** — Add `dragStiffness` to `DragHandler`, lerp path
7. **Alt key fix** — Replace `window.__spacegraph_altKey` with `InputState.keysPressed`
8. **Dirty-flag layout** — Create `LayoutContainer`, update all layout plugins
9. **Exclusive input state machine (Fingering)** — Create `FingerManager`, convert handlers

### Phase 3: Feature Parity (Week 6-9)

**Medium-High Impact**

10. **Compositional layout containers** — `StackingNode`, `GridNode`, `SplitNode`, `BorderNode`, `SwitchNode`
11. **Virtualized grid container** — `VirtualGridNode` with cell culling
12. **Orthographic toggle** — `CameraControls.toggleOrthographic()`
13. **Right-drag zoom** — Alternative zoom method
14. **Hover raycasting in render loop** — `HoverManager.update()` with camera change detection
15. **Dual camera interpolation model** — `setTargetSmooth()`, refactor `flyTo()`

### Phase 4: Advanced Architecture (Week 10-16)

**High Impact, High Effort**

16. **Unified `Surface` base** — `Node` and `Edge` extend `Surface`
17. **Port/Wiring system** — `PortNode`, `Wire`, drag-to-wire interaction
18. **Coordinate space transforms** — `SurfaceTransform`, nested dragging
19. **Draggable window panels** — `PanelNode` with move/resize
20. **Tooltip/hover overlay system** — Decouple `HoverManager`

### Phase 5: Future Foundations

21. **Widget system foundations** — `isDraggable`, `isTouchable`, model-view callbacks, front-face child lists
22. **Unified input pipeline** — Move `CameraControls` into `InputManager` binding system
23. **Immediate-mode layout containers** — Skip Three.js objects for layout-only containers
24. **Distance-preserving drag** — Ray-distance mode as alternative to plane method

---

## Part 10: Architecture Changes Summary

| Change                          | Scope                                 | Priority | Effort | Files Affected                                            |
| ------------------------------- | ------------------------------------- | -------- | ------ | --------------------------------------------------------- |
| Event consumption model         | `InputManager`, `InteractionPlugin`   | High     | Low    | `src/input/InputManager.ts`                               |
| Middle-click fly-to-node        | `InteractionPlugin.handlePointerDown` | High     | Low    | `src/plugins/InteractionPlugin.ts`                        |
| Activity property               | `Node`, `Edge` base classes           | High     | Low    | `src/nodes/Node.ts`, `src/edges/Edge.ts`                  |
| Zoom stack                      | `CameraControls`                      | High     | Low    | `src/core/CameraControls.ts`                              |
| Keyboard camera controls        | `CameraControls`                      | Medium   | Medium | `src/core/CameraControls.ts`                              |
| Damped node dragging            | `DragHandler`                         | Medium   | Low    | `src/plugins/interaction/DragHandler.ts`                  |
| Alt key fix                     | `InteractionPlugin`                   | Medium   | Low    | `src/plugins/InteractionPlugin.ts`                        |
| Dirty-flag layout               | All layout plugins                    | High     | Low    | `src/plugins/*.ts`                                        |
| Exclusive input state machine   | New `Fingering` system                | High     | Medium | `src/input/Fingering.ts` (new)                            |
| Compositional layout containers | New node types                        | High     | Medium | `src/nodes/*Node.ts` (new)                                |
| Virtualized grid container      | New `VirtualGridNode`                 | High     | Medium | `src/nodes/VirtualGridNode.ts` (new)                      |
| Orthographic toggle             | `CameraControls`                      | Low      | Low    | `src/core/CameraControls.ts`                              |
| Right-drag zoom                 | `CameraControls`                      | Low      | Low    | `src/core/CameraControls.ts`                              |
| Hover raycasting in render loop | `HoverManager`                        | Medium   | Low    | `src/plugins/interaction/HoverManager.ts`                 |
| Dual camera interpolation       | `CameraControls`                      | Medium   | Medium | `src/core/CameraControls.ts`                              |
| Unified `Surface` base          | All nodes/edges                       | High     | High   | `src/core/Surface.ts` (new), all nodes/edges              |
| Port/Wiring system              | New classes                           | High     | High   | `src/nodes/PortNode.ts`, `src/edges/Wire.ts`              |
| Coordinate space transforms     | `InputManager`, `DragHandler`         | Medium   | Medium | `src/input/SurfaceTransform.ts` (new)                     |
| Draggable window panels         | New `PanelNode`                       | Medium   | Medium | `src/nodes/PanelNode.ts` (new)                            |
| Tooltip/hover system            | Decouple `HoverManager`               | Medium   | Medium | `src/plugins/HoverOverlay.ts` (new)                       |
| Widget foundations              | `Node` base class                     | Medium   | Medium | `src/nodes/Node.ts`                                       |
| Unified input pipeline          | `InputManager`, `CameraControls`      | Medium   | High   | `src/input/InputManager.ts`, `src/core/CameraControls.ts` |
| Immediate-mode containers       | Layout nodes                          | Medium   | Medium | `src/nodes/GroupNode.ts`                                  |
| Distance-preserving drag        | `DragHandler`                         | Low      | Medium | `src/plugins/interaction/DragHandler.ts`                  |

---

## Part 11: Key Design Principles

### From SGC

- **Context-aware input**: Left button interacts with what's under cursor; camera is secondary
- **Soft physics**: Springy, natural feel over rigid snapping
- **Per-frame pointer tracking**: Keep hover state accurate, not event-driven
- **Keyboard accessibility**: Full camera control without mouse
- **Event consumption cascade**: Widget → body → camera, with early termination

### From SGJ

- **Single abstraction**: Everything is a `Surface` — uniform hit testing, rendering, lifecycle
- **Compositional over monolithic**: Small, single-purpose containers composed into complex layouts
- **Lazy evaluation**: Dirty flags, deferred layout, virtualized rendering
- **Exclusive state machines**: Clear interaction ownership, no conflicts
- **Activity feedback**: Visual response to interaction, data flow, creation
- **Coordinate space transforms**: Nested input handling with push/pop

### From SGJS (preserve)

- **Plugin architecture**: Clean lifecycle hooks (`init`, `onPreRender`, `dispose`), typed events via `mitt`
- **Three.js rendering**: Instancing, BVH raycasting, CSS3D layering
- **Type safety**: TypeScript throughout
- **Edge variety**: 9 types with animations
- **Vision system**: AI-driven quality analysis
- **Object pooling**: `ObjectPoolManager` for performance
- **Node type registry**: Dynamic registration with factory pattern

---

## Part 12: Cross-Cutting Patterns

### Pattern: `isDraggable` / `isTouchable` Veto

Both SGC and SGJ use explicit opt-in/opt-out for interaction. SGJS should adopt this for node sub-regions.

```typescript
// SGC: AbstractBody::isDraggable(localPos) → false for buttons
// SGJ: Surface.finger() → null for non-interactive surfaces
// SGJS: Node.isDraggable(localPos) → false for ports/handles
```

### Pattern: Model-View Separation

SGC's `SliderModel`/`ButtonModel`, SGJ's `GridModel`/`GridRenderer`. SGJS nodes should decouple data state from visual rendering.

```typescript
// SGC: ButtonModel callback → Button widget renders
// SGJ: GridModel data → GridRenderer draws cells
// SGJS: NodeData → Node renders, NodeControls → sub-components render
```

### Pattern: Activity Decay

SGJ's exponential decay (`Widget.pri`, `Wire.activity`) provides rich visual feedback. Apply to nodes, edges, and ports.

```typescript
// SGJ: pri *= 0.97 per frame
// SGJS: activity *= Math.exp(-dt / 2) — time-based, frame-rate independent
```

### Pattern: Dirty Flag + Single-Pass Execution

SGJ's CAS-based `mustLayout`, SGC's per-frame `updatePointer()`. Run expensive operations once per frame, not per-event.

```typescript
// SGJ: if (MUSTLAYOUT.compareAndSet(this, 1, 0)) doLayout()
// SGC: updatePointer() every frame after buffer swap
// SGJS: if (this.needsLayout) { this.needsLayout = false; this.doLayout(dt); }
```

### Pattern: Priority-Based Event Handling

SGC's widget → body → camera cascade. SGJS's `InputManager` priorities. Combine into explicit consumption model.

```typescript
// SGC: faceContainer.onMouseButton() → AbstractBody::isDraggable() → camera fallback
// SGJS: bindings sorted by priority, iterate until consumed
// SGJS+: event.consumed = true; break;
```

---

## Part 13: Testing Strategy

### Unit Tests

- Each `Fingering` class: test `start()`, `update()`, `stop()`, `defer()` lifecycle
- `DragHandler`: test rigid vs damped modes, multi-select, Z-axis
- `CameraControls`: test keyboard input, zoom stack, orthographic toggle
- `LayoutContainer`: test dirty flag, single-pass execution

### Integration Tests

- Event consumption: verify camera doesn't rotate when dragging node
- Middle-click fly-to: verify zoom stack push/pop
- Nested layouts: verify `GridNode` inside `SplitNode` positions correctly
- Activity feedback: verify `pulse()` → visual change → decay

### Performance Tests

- Virtual grid: 1M cells, verify only visible cells instantiated
- Hover raycasting in render loop: benchmark vs event-driven
- Immediate-mode containers: measure scene graph depth reduction

### E2E Tests (Playwright)

- Full interaction flow: drag node → camera doesn't rotate → release → hover → fly-to
- Keyboard navigation: pan/zoom with keys → verify camera position
- Zoom stack: double-click in → double-click out → Page Up out

---

## Part 14: Migration Notes

### Breaking Changes

1. **`Node` extends `Surface`**: Any code that checks `instanceof EventEmitter` on nodes needs updating
2. **`Edge` extends `Surface`**: Same as above
3. **`InputEvent.consumed`**: New field — handlers that don't set it are unaffected
4. **`CameraControls` keyboard listeners**: New DOM listeners added — ensure no conflicts with existing key handlers

### Non-Breaking Additions

- All new properties (`activity`, `isDraggable`, `isTouchable`) have safe defaults
- New methods (`zoomTo`, `panBy`, `setTargetSmooth`) are additive
- New node types (`StackingNode`, `GridNode`, etc.) are opt-in via registration

### Deprecations

- `window.__spacegraph_altKey` → use `InputState.keysPressed`
- Direct `flyTo()` with `requestAnimationFrame` → use `setTargetSmooth()` (internal refactor)

---

## Part 15: File Map

### New Files

```
src/core/Surface.ts                    # Unified base class
src/input/Fingering.ts                 # Exclusive input state machine
src/input/SurfaceTransform.ts          # Coordinate space transforms
src/input/fingerings/
    NodeDraggingFingering.ts
    BoxSelectingFingering.ts
    CameraOrbitingFingering.ts
    CameraPanningFingering.ts
    CameraZoomingFingering.ts
    ResizingFingering.ts
    WiringFingering.ts
    PanelMovingFingering.ts
src/nodes/StackingNode.ts              # Compositional layout
src/nodes/GridNode.ts                  # Compositional layout
src/nodes/SplitNode.ts                 # Compositional layout
src/nodes/BorderNode.ts                # Compositional layout
src/nodes/SwitchNode.ts                # Compositional layout
src/nodes/VirtualGridNode.ts           # Virtualized rendering
src/nodes/PanelNode.ts                 # Draggable panels
src/nodes/PortNode.ts                  # Data flow ports
src/nodes/NodeControls.ts              # Sub-component models
src/edges/Wire.ts                      # Data flow wires
src/plugins/LayoutContainer.ts         # Dirty-flag layout base
src/plugins/HoverOverlay.ts            # Decoupled hover system
```

### Modified Files

```
src/nodes/Node.ts                      # Add Surface, activity, isDraggable, isTouchable, onPreRender
src/edges/Edge.ts                      # Add Surface, activity
src/core/CameraControls.ts             # Add keyboard, zoom stack, ortho, dual interpolation
src/input/InputManager.ts              # Add consumed flag, FingerManager integration
src/plugins/InteractionPlugin.ts       # Add middle-click, use FingerManager, remove alt global
src/plugins/interaction/DragHandler.ts # Add damped mode, distance-preserving, transforms
src/plugins/interaction/HoverManager.ts# Add render loop update
src/plugins/ErgonomicsPlugin.ts        # Wire dampingFactor to drag stiffness
src/SpaceGraph.ts                      # Register new node types, call onPreRender
src/core/Graph.ts                      # Emit events for dirty-flag layout
src/types.ts                           # Add Surface, Fingering, Port types
```
