# SG_ALIGN: SpaceGraphJS Unified Architecture

> Making SpaceGraphJS _feel_ like SGC + SGJ — not a checklist of patches, but a cohesive system where every piece interlocks.

---

## The Problem

SG_to_SGJS.md added features as **isolated patches**:

| Feature                   | Added But...                                  |
| ------------------------- | --------------------------------------------- |
| `Surface` base class      | `Node` still extends `EventEmitter`           |
| `Fingering` system        | `CameraControls` has its own DOM listeners    |
| `consumed` flag on events | Never actually used                           |
| HtmlNode pointer relay    | Synthetic `dispatchEvent` bypasses everything |

Each pattern is **present but disconnected**. SGC and SGJ feel good because their patterns **interlock** — physics mediates everything in SGC, Surface unifies everything in SGJ. SGJS got the pieces without the glue.

## The Fix: Three Interlocking Systems

```
┌─────────────────────────────────────────────────────┐
│                    Surface                          │
│   Everything in the scene shares one base class     │
│   → uniform hitTest, lifecycle, activity, veto      │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│                   Fingering                         │
│   ALL input flows through one exclusive state       │
│   machine — no dual listeners, no bypasses          │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│              Event Consumption                      │
│   Priority-ordered arbitration:                     │
│   higher-priority fingerings consume, camera falls  │
└─────────────────────────────────────────────────────┘
```

**One rule:** If it's in the scene, it's a `Surface`. If it receives input, it goes through `Fingering`. If two things compete, `consumed` decides.

---

## System 1: Surface — Everything Is a Surface

```
Surface (abstract)
├── Identity:    id, type
├── Geometry:    bounds, hitTest(ray)
├── Lifecycle:   start(), stop(), delete(), onPreRender(dt)
├── Interaction: isDraggable(localPos), isTouchable
├── Feedback:    activity, pulse(intensity)
└── Hierarchy:   parent, children, ancestors(), descendants()
│
├── Node (abstract)
│   ├── position, rotation, scale, object: THREE.Object3D
│   ├── data, label, sg reference
│   │
│   ├── DOMNode
│   │   ├── domElement, cssObject, backingMesh
│   │   ├── pointer events → InputManager (NOT synthetic dispatch)
│   │   │
│   │   ├── BaseContentNode → HtmlNode
│   │   │   ├── editable/scrollable → data-sg-interactive zones
│   │   │   ├── quick controls, resize handle
│   │   │   │
│   │   │   ├── PanelNode     (draggable, resizable)
│   │   │   ├── PortNode<T>   (typed data ports)
│   │   │   └── ... (ImageNode, VideoNode, ChartNode, etc.)
│   │   │
│   │   └── ShapeNode (meshGeometry, meshMaterial, emissive glow)
│   │
│   └── GroupNode
│       ├── translucent 3D box, LOD
│       │
│       └── LayoutNode (abstract)
│           ├── needsLayout dirty flag → doLayout(dt) runs once/frame
│           ├── GridNode, StackingNode, SplitNode, BorderNode, SwitchNode
│           └── VirtualGridNode (cell culling)
│
└── Edge
    ├── source: Node, target: Node
    ├── line: Line2, geometry, arrowheads
    └── Wire<T> (typed data flow between PortNodes)
```

### Key Methods Every Surface Has

| Method                  | Purpose                                                           |
| ----------------------- | ----------------------------------------------------------------- |
| `hitTest(ray)`          | Raycaster intersection — works for 3D meshes, DOM elements, lines |
| `isDraggable(localPos)` | Veto: return `false` to let sub-regions handle input themselves   |
| `isTouchable`           | Pass-through: `false` means clicks go through to surfaces behind  |
| `pulse(n)`              | Spike activity to `n` — drives glow/emissive feedback             |
| `onPreRender(dt)`       | Called every frame — layout, activity decay, visual updates       |

---

## System 2: Fingering — One Input Pipeline

**Before:** CameraControls listens to DOM + InputManager listens to DOM + HtmlNode dispatches synthetic events = three competing pipelines.

**After:** One pipeline. All DOM events → `InputManager` → `FingerManager` → priority-ordered `Fingering` acquisition.

```
DOM event (canvas, DOMNode, keyboard)
  │
  ▼
InputSource.normalizeEvent() → InputEvent { consumed: false }
  │
  ▼
InputManager.handleEvent()
  │
  ├── pointerdown → FingerManager.test(fingering, finger)
  │     for each fingering (priority desc):
  │         if fingering.start(finger):
  │             event.consumed = true    ← exclusive control acquired
  │             return
  │
  ├── pointermove → activeFingering.update(finger)
  │
  └── pointerup   → activeFingering.stop(finger)
                    FingerManager.end(finger)
```

### Fingering Priority Table

| Priority | Fingering                 | Trigger                               | Defers?             |
| -------- | ------------------------- | ------------------------------------- | ------------------- |
| 200      | `ResizeFingering`         | Drag resize handle                    | No                  |
| 150      | `WiringFingering`         | Drag from port                        | No                  |
| 100      | `NodeDraggingFingering`   | Drag node (checks `isDraggable`)      | No                  |
| 80       | `BoxSelectingFingering`   | Shift+left drag                       | Yes (to drag)       |
| 60       | `HoverFingering`          | Always active                         | Yes (to everything) |
| 40       | `CameraOrbitingFingering` | Left drag on empty                    | No                  |
| 30       | `CameraPanningFingering`  | Middle drag                           | No                  |
| 20       | `CameraZoomingFingering`  | Right drag                            | No                  |
| 0        | `WheelZoomBinding`        | Scroll wheel (binding, not fingering) | —                   |

**How it works:** User left-drags on a node → `NodeDraggingFingering` (100) tests first → `node.isDraggable(localPos)` returns `true` → fingering starts → `consumed = true` → `CameraOrbitingFingering` (40) never runs.

**HtmlNode interactive zones:** User clicks on editable text inside HtmlNode → `NodeDraggingFingering` tests → `isDraggable(localPos)` returns `false` (pointer is over `[data-sg-interactive]`) → fingering fails → event NOT consumed → DOM handles text selection natively.

---

## System 3: Event Consumption — The Arbitration

The `consumed` flag on `InputEvent` is the SGC event bubbling pattern:

```typescript
// SGC: faceContainer → AbstractBody.isDraggable() → camera fallback
// SGJS: priority-ordered fingerings with consumed flag

for (const { fingering } of this.fingerings) {
    // sorted by priority desc
    if (event.consumed) break; // early termination
    if (this.fingerManager.test(fingering, finger)) {
        event.consumed = true; // acquired exclusive control
        return;
    }
}
```

Camera fingerings have `defer() → false` — they never yield. Everything above them can preempt. This is why dragging a node never rotates the camera: the drag fingering acquires first, consumes the event, camera never sees it.

---

## Walkthrough: How User Actions Flow Through the System

### Scenario 1: Drag a ShapeNode

```
User left-clicks on ShapeNode and drags
  │
  ▼ Canvas pointerdown event
InputSource('canvas').normalizeEvent() → InputEvent
  │
  ▼ InputManager.handleEvent()
FingerManager.test(NodeDraggingFingering, finger)
  → shapeNode.isDraggable(localPos) → true
  → fingering.start(finger) → true
  → event.consumed = true
  │
  ▼ Canvas pointermove events
NodeDraggingFingering.update(finger)
  → raycast drag plane → node.position = intersectPoint
  │
  ▼ Canvas pointerup
NodeDraggingFingering.stop(finger)
  → FingerManager.end(finger)
  → CameraOrbitingFingering never saw any of these events
```

### Scenario 2: Type in an Editable HtmlNode

```
User clicks on editable text inside HtmlNode
  │
  ▼ DOMNode pointerdown event
InputSource('dom-node').normalizeEvent() → InputEvent
  │
  ▼ InputManager.handleEvent()
FingerManager.test(NodeDraggingFingering, finger)
  → htmlNode.isDraggable(localPos) → false (over [data-sg-interactive])
  → fingering.start(finger) → false
  │
  ▼ No fingering acquired → event NOT consumed
DOM native behavior: text cursor appears, keyboard input works
  │
  ▼ Subsequent pointermove over editable area
HoverFingering.update(finger) → always defers → no consumption
DOM native behavior: text selection works
```

### Scenario 3: Drag the HtmlNode Itself (Title Bar)

```
User left-clicks on HtmlNode title bar and drags
  │
  ▼ DOMNode pointerdown event
InputSource('dom-node').normalizeEvent() → InputEvent
  │
  ▼ InputManager.handleEvent()
FingerManager.test(NodeDraggingFingering, finger)
  → htmlNode.isDraggable(localPos) → true (title bar is NOT [data-sg-interactive])
  → fingering.start(finger) → true
  → event.consumed = true
  │
  ▼ DOMNode pointermove events
NodeDraggingFingering.update(finger)
  → htmlNode.position = drag plane intersection
  │
  ▼ Camera never rotates — event was consumed
```

### Scenario 4: Orbit Camera on Empty Space

```
User left-clicks on empty canvas and drags
  │
  ▼ Canvas pointerdown event
InputSource('canvas').normalizeEvent() → InputEvent
  │
  ▼ InputManager.handleEvent()
FingerManager.test(NodeDraggingFingering, finger)
  → no node under cursor → fingering.start(finger) → false
FingerManager.test(BoxSelectingFingering, finger)
  → no Shift key → fingering.start(finger) → false
FingerManager.test(HoverFingering, finger)
  → always defers → false
FingerManager.test(CameraOrbitingFingering, finger)
  → finger.buttons === 1 → fingering.start(finger) → true
  → event.consumed = true
  │
  ▼ Canvas pointermove events
CameraOrbitingFingering.update(finger)
  → camera.rotate(dx, dy)
```

---

## CameraControls: Pure Operations Only

**Stripped of all DOM listeners.** It's now a pure camera state machine:

```typescript
class CameraControls {
    // Mutators (called by Fingerings):
    rotate(dx, dy)     → accumulates sphericalDelta
    pan(dx, dy)        → accumulates panOffset
    zoom(factor)       → accumulates scale

    // Programmatic:
    flyTo(target, distance, duration)
    zoomTo(target, distance, duration)  → pushes to zoomStack
    zoomOut() / flyBack()               → pops zoomStack
    setTargetSmooth(target, radius, duration)
    panBy(dx, dy)
    toggleOrthographic()

    // Per-frame:
    update() → applies deltas + animation + keyboard → sets camera.position
}
```

No `setupEventListeners()`. No `onPointerDown/Move/Up/Wheel`. Those are now `Fingering` implementations.

---

## HtmlNode: DOM Interactivity Without Bypass

### The Old Way (Broken)

```
User types in editable HtmlNode
  → e.stopPropagation() blocks event
  → InputManager never sees it
  → But synthetic dispatchEvent also fires → double-handling
```

### The New Way (Veto Pattern)

```
User types in editable HtmlNode
  → pointer event → InputManager → NodeDraggingFingering.test()
  → isDraggable(localPos) checks [data-sg-interactive] zones
  → returns false → fingering fails → event NOT consumed
  → DOM handles text selection natively, no bypass needed
```

```typescript
// HtmlNode._createInnerContent():
if (data.editable) {
    contentWrapper.contentEditable = 'true';
    contentWrapper.dataset.sgInteractive = 'true';
    // NO stopPropagation — let the event flow through the pipeline
}

// DOMNode.isDraggable(localPos):
isDraggable(localPos: THREE.Vector3): boolean {
    for (const el of this.domElement.querySelectorAll('[data-sg-interactive="true"]')) {
        if (pointInElementRect(localPos, el)) return false;
    }
    return true;
}
```

---

## Activity Feedback — Visual Pulse

Every Surface has `activity` (0 = idle, 1 = hot) with exponential decay:

```typescript
// Surface base (every frame):
onPreRender(dt) { this.activity *= Math.exp(-dt / 0.5); }

// ShapeNode — emissive glow:
if (this.activity > 0.01) {
    this.meshMaterial.emissive.setHex(0x4488ff);
    this.meshMaterial.emissiveIntensity = this.activity * 0.5;
}

// HtmlNode — box-shadow glow:
if (this.activity > 0.01) {
    this.domElement.style.boxShadow =
        `0 0 ${this.activity * 20}px rgba(68,136,255,${this.activity * 0.5})`;
}

// Wire — activity visible on the line:
getActivity(now, window) {
    return 1 / (1 + (now - this.lastActivity) / window);
}
```

**Pulse triggers:** node creation (0.5), edge creation (0.3), drag start (1.0), selection (0.7), wire send (1.0), layout apply (0.4).

---

## Layout: Dirty-Flag, Not Imperative

```typescript
abstract class LayoutNode extends GroupNode {
    protected needsLayout = true;

    onPreRender(dt) {
        super.onPreRender(dt);
        if (this.needsLayout) {
            this.needsLayout = false;
            this.doLayout(dt); // runs at most once per frame
        }
    }
}

// Auto-triggered by graph mutations:
graph.on('node:added', () => layoutNode.markDirty());
graph.on('node:removed', () => layoutNode.markDirty());
```

No manual `applyLayout()` calls. Layout runs automatically, at most once per frame.

---

## Default Controls Reference

### Mouse

| Input                      | Action        | Notes                                    |
| -------------------------- | ------------- | ---------------------------------------- |
| **Left drag on node**      | Drag node     | Consumes event, prevents camera rotation |
| **Left drag on empty**     | Orbit camera  | Fallback when no node under cursor       |
| **Left + Shift drag**      | Box selection | Defers to node drag if node is hit       |
| **Middle drag**            | Pan camera    |                                          |
| **Middle click on node**   | Fly to node   | Pushes to zoom stack                     |
| **Middle click same node** | Zoom out      | Pops zoom stack                          |
| **Scroll wheel**           | Zoom          |                                          |
| **Right drag**             | Zoom camera   | Alternative to scroll wheel              |
| **Right click (short)**    | Context menu  |                                          |

### Keyboard

| Key                   | Action                   |
| --------------------- | ------------------------ |
| `l` / `r` / `f` / `b` | Pan camera               |
| `z` / `x`             | Zoom in/out              |
| `o`                   | Toggle orthographic      |
| `w`                   | Toggle wireframe         |
| `Space`               | Fly to hovered node      |
| `Escape`              | Cancel / clear selection |
| `Delete`              | Delete selected          |
| `Ctrl+A`              | Select all               |
| `Ctrl+Z` / `Ctrl+Y`   | Undo / Redo              |
| `Alt` + diagonal drag | Z-axis drag              |
| `Page Up`             | Zoom out one level       |

---

## What Stays the Same (SGJS Strengths)

| Area                | Why It Stays                                                                          |
| ------------------- | ------------------------------------------------------------------------------------- |
| Plugin architecture | Clean `Plugin` interface with lifecycle hooks — fingerings integrate _as_ plugins     |
| Node type registry  | Dynamic `NODE_TYPES` registration — new node types still register here                |
| TypeScript          | Type safety, better DX                                                                |
| Edge variety        | 9 edge types with animations, curves, bundles — all extend `Edge extends Surface` now |
| Build tooling       | Vite, Vitest, Playwright, TypeDoc                                                     |
| Vision system       | AI-driven graph quality analysis — operates on the Surface tree                       |
| Object pooling      | `ObjectPool` and `ObjectPoolManager` for performance                                  |
| CSS3D layering      | HtmlNode still uses CSS3DObject — just relays events differently                      |

---

## Implementation Phases

### Phase 1: Surface as Base

| #   | File                  | Change                                                                                             |
| --- | --------------------- | -------------------------------------------------------------------------------------------------- |
| 1   | `src/core/Surface.ts` | Add `id`, `type`, `isDraggable()`, `isTouchable`, `activity`, `pulse()`, `onPreRender()`           |
| 2   | `src/nodes/Node.ts`   | `extends Surface`, implement `bounds`/`hitTest`/`start`/`stop`/`delete`                            |
| 3   | `src/edges/Edge.ts`   | `extends Surface`, implement `bounds`/`hitTest`/`start`/`stop`/`delete`, `onPreRender` calls super |
| 4   | All node subclasses   | Call `super.onPreRender(dt)` where overridden                                                      |

### Phase 2: CameraControls → Fingerings

| #   | File                                              | Change                                                     |
| --- | ------------------------------------------------- | ---------------------------------------------------------- |
| 5   | `src/core/CameraControls.ts`                      | Strip DOM listeners, expose `rotate`/`pan`/`zoom` pure ops |
| 6   | `src/input/fingerings/CameraOrbitingFingering.ts` | Left button → `camera.rotate()`                            |
| 7   | `src/input/fingerings/CameraPanningFingering.ts`  | Middle button → `camera.pan()`                             |
| 8   | `src/input/fingerings/CameraZoomingFingering.ts`  | Right button → `camera.zoom()`                             |
| 9   | `src/input/fingerings/ZoomToSurfaceFingering.ts`  | Middle-click surface → `camera.zoomTo()` or `zoomOut()`    |

### Phase 3: InputManager as Router

| #   | File                        | Change                                                               |
| --- | --------------------------- | -------------------------------------------------------------------- |
| 10  | `src/input/InputManager.ts` | Own `FingerManager`, `registerFingering()`, route through fingerings |
| 11  | `src/input/InputManager.ts` | Add `normalizeEventFromSource()` for DOMNode relay                   |

### Phase 4: DOMNode/HtmlNode Integration

| #   | File                    | Change                                                                          |
| --- | ----------------------- | ------------------------------------------------------------------------------- |
| 12  | `src/nodes/DOMNode.ts`  | Relay through InputManager, add `isDraggable(localPos)` veto                    |
| 13  | `src/nodes/HtmlNode.ts` | Mark `[data-sg-interactive]` zones, remove `stopPropagation`, add activity glow |

### Phase 5: InteractionPlugin → Fingerings

| #   | File                                            | Change                                             |
| --- | ----------------------------------------------- | -------------------------------------------------- |
| 14  | `src/input/fingerings/NodeDraggingFingering.ts` | From `DragHandler`, checks `isDraggable(localPos)` |
| 15  | `src/input/fingerings/BoxSelectingFingering.ts` | From `SelectionManager`, Shift+left drag           |
| 16  | `src/input/fingerings/ResizeFingering.ts`       | From `ResizeHandler`                               |
| 17  | `src/input/fingerings/WiringFingering.ts`       | From `ConnectionHandler`                           |
| 18  | `src/input/fingerings/HoverFingering.ts`        | Always active, always defers                       |
| 19  | `src/plugins/InteractionPlugin.ts`              | Register fingerings, remove direct handlers        |

### Phase 6: Layout Dirty-Flag

| #   | File                      | Change                                    |
| --- | ------------------------- | ----------------------------------------- |
| 20  | `src/nodes/LayoutNode.ts` | New: dirty-flag base extending GroupNode  |
| 21  | Layout nodes              | Extend LayoutNode, implement `doLayout()` |

### Phase 7: Wiring + Activity

| #   | File                     | Change                                                           |
| --- | ------------------------ | ---------------------------------------------------------------- |
| 22  | `src/SpaceGraph.ts`      | Register fingerings in `init()`, remove CameraControls DOM setup |
| 23  | `src/SpaceGraph.ts`      | Call `edge.onPreRender(dt)` in animate loop                      |
| 24  | `src/Graph.ts`           | Call `node.start()` / `edge.start()` on add                      |
| 25  | `src/nodes/ShapeNode.ts` | Activity → emissive in `onPreRender`                             |

---

## Files Changed

| File                               | Kind        | Est. Lines                    |
| ---------------------------------- | ----------- | ----------------------------- |
| `src/core/Surface.ts`              | Modify      | +30                           |
| `src/nodes/Node.ts`                | Modify      | ~15                           |
| `src/edges/Edge.ts`                | Modify      | ~20                           |
| `src/core/CameraControls.ts`       | Modify      | −80 (strip listeners)         |
| `src/input/InputManager.ts`        | Modify      | +40                           |
| `src/input/fingerings/*.ts`        | **New × 9** | ~200                          |
| `src/nodes/DOMNode.ts`             | Modify      | +30                           |
| `src/nodes/HtmlNode.ts`            | Modify      | +20                           |
| `src/nodes/LayoutNode.ts`          | **New**     | ~30                           |
| `src/plugins/InteractionPlugin.ts` | Modify      | ~40                           |
| `src/SpaceGraph.ts`                | Modify      | ~20                           |
| `src/nodes/ShapeNode.ts`           | Modify      | +10                           |
| All node subclasses                | Modify      | +1 each (`super.onPreRender`) |

---

## What This Restores

| From         | Pattern                              | How                                                           |
| ------------ | ------------------------------------ | ------------------------------------------------------------- |
| **SGC**      | Physics-mediated interaction         | Surface-mediated — everything through Surface → Fingering     |
| **SGC**      | `isDraggable(localPos)` veto         | `Node.isDraggable()` — HtmlNode uses it for interactive zones |
| **SGC**      | Event bubbling → camera fallback     | Priority-ordered Fingering, `defer()` controls preemption     |
| **SGC**      | Soft constraint dragging             | `DragHandler.dragStiffness` lerp (exists)                     |
| **SGC**      | Distance-preserving drag             | `DragHandler.preserveDistance` mode (exists)                  |
| **SGC**      | Camera interpolation                 | `setTargetSmooth()` (exists)                                  |
| **SGC**      | Right-click release → zoom to object | Middle-click `ZoomToSurfaceFingering`                         |
| **SGC**      | Keyboard camera controls             | `processKeyboardInput()` (exists)                             |
| **SGJ**      | Everything is a Surface              | `Node extends Surface`, `Edge extends Surface`                |
| **SGJ**      | Exclusive Fingering state            | `FingerManager` with priority acquisition + `defer()`         |
| **SGJ**      | Lazy layout via dirty flag           | `LayoutNode.needsLayout` — once/frame, auto-triggered         |
| **SGJ**      | Activity-based feedback              | `Surface.activity` decay + emissive/box-shadow rendering      |
| **SGJ**      | Zoom stack                           | `CameraControls.zoomStack` → `ZoomToSurfaceFingering`         |
| **SGJ**      | Virtualized containers               | `VirtualGridNode` cell culling in `doLayout()`                |
| **HtmlNode** | DOM interactivity                    | `isDraggable(localPos)` veto zones                            |
| **HtmlNode** | Pointer participation                | DOM → InputManager → same Fingering pipeline                  |
| **HtmlNode** | No bypass                            | Events flow through consumption model                         |
| **HtmlNode** | Spatial management                   | HtmlNode is a Surface — positioned, culled, LOD'd             |
