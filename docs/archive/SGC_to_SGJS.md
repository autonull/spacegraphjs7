# SGC → SGJS: Transferring Lessons from SpaceGraphC to SpaceGraphJS

## Current State Comparison

| Aspect               | SpaceGraphC (SGC)                      | SpaceGraphJS (SGJS)                                       |
| -------------------- | -------------------------------------- | --------------------------------------------------------- |
| Camera model         | Orbital (azimuth/elevation angles)     | Orbital (spherical coords: theta/phi/radius)              |
| Left drag            | Pick & drag physics bodies             | Rotate camera                                             |
| Middle drag          | Orbit camera                           | Pan camera                                                |
| Right drag           | Zoom camera                            | Context menu (suppressed)                                 |
| Scroll wheel         | Unused                                 | Zoom camera                                               |
| Object picking       | `btPoint2PointConstraint` (physics)    | Raycaster → drag plane projection                         |
| Widget system        | 2D overlay + 3D physics-backed widgets | Node/Edge scene graph objects                             |
| Input architecture   | Direct GLUT callbacks → SpaceProcess   | `InputManager` → `EventSystem` → `InteractionPlugin`      |
| Camera interpolation | `camTarget`/`camDist` lerp each frame  | `sphericalDelta`/`scale`/`panOffset` accumulate per frame |
| Zoom-to-object       | Right-click release on body            | Space key on hovered node (`flyTo`)                       |

**Key mismatch**: SGC and SGJS assign different actions to the same mouse buttons. SGC uses left-drag for object interaction and middle-drag for orbit. SGJS uses left-drag for orbit, middle-drag for pan, and delegates object interaction through a separate pipeline.

---

## Lessons to Apply

### 1. Unified Button Semantics — The SGC Model is More Ergonomic

SGC's mapping is **context-aware by design**: left button interacts with whatever is under the cursor (physics body or widget), while camera orbit is a secondary action on middle button. SGJS inverts this — camera orbit is primary (left button), and object interaction competes with it.

**Problem in SGJS**: `CameraControls` and `InteractionPlugin` both listen to `pointerdown` on the same canvas. There is no explicit arbitration — they coexist because `CameraControls` handles rotation/pan/zoom directly via DOM listeners while `InteractionPlugin` receives events through the `InputManager` pipeline. This creates ambiguity: when the user left-drags on empty space, the camera rotates; when they left-drag on a node, the node drags — but the camera may also accumulate rotation delta.

**SGC's approach**: The `faceContainer.onMouseButton()` check runs first. If any 2D widget handled the event, the 3D camera/body logic is skipped entirely. For 3D bodies, `AbstractBody::isDraggable()` determines whether to create a pick constraint or fall through to camera control.

**Recommendation**: Introduce an **event consumption model** where interaction handlers can mark events as consumed, preventing camera controls from acting on them.

```typescript
// Proposed: consumed flag on interaction events
this.sg.events.on('input:interaction:pointerdown', (e) => {
    const consumed = this.tryHandleInteraction(e);
    if (consumed) {
        e.originalEvent?.stopPropagation();
        // Signal CameraControls to ignore this event
    }
});
```

Or better: move camera controls into the `InputManager` pipeline so they share the same binding/priority system.

### 2. Soft Constraint Picking → Smooth Node Dragging

SGC uses a `btPoint2PointConstraint` with `m_tau = 0.1` (soft spring) and `m_impulseClamp = 30` (force limit). This gives a **natural, springy feel** — the dragged object follows the cursor but with slight elasticity, preventing jittery snapping.

SGJS's `DragHandler` uses a **rigid drag plane** — the node snaps exactly to the ray-plane intersection. This is precise but can feel stiff, especially when the camera is at oblique angles.

**Recommendation**: Add a **damped follow** option to `DragHandler`:

```typescript
// Instead of snap-to-plane:
const targetPosition = intersectPoint.sub(this.dragOffset);
// Damped follow (SGC-style soft constraint):
node.position.lerp(targetPosition, this.dragStiffness); // 0.3–0.7
```

The `ErgonomicsPlugin` already tracks `dampingFactor` — this could feed directly into drag stiffness.

### 3. Distance-Preserving Drag

SGC stores `gOldPickingDist` and reconstructs the 3D pivot point at that exact distance during drag:

```cpp
dir.normalize();
dir *= gOldPickingDist;
newPivotB = rayFrom + dir;
```

This prevents the picked object from sliding toward or away from the camera as the mouse moves — a common source of disorientation.

SGJS's `DragHandler` uses a **fixed drag plane** coplanar with the camera at the node's position. This is actually a good approach — the plane naturally preserves depth. However, the plane is created once at drag start and never updated, so if the camera moves during drag (e.g., from another input), the plane becomes stale.

**Recommendation**: Update the drag plane's normal each frame to match the current camera direction, or offer a "ray-distance-preserving" mode as an alternative to the plane method.

### 4. Zoom-to-Object on Hover (SGC's Right-Click Release)

SGC's right button has a dual role: drag to zoom, release on a body to snap the camera to it. This is elegant — the same button that controls zoom distance also provides instant focus.

SGJS has `flyTo()` but it's triggered by double-click on a node or Space on hover. The Space key is discoverable but not as immediate as a mouse action.

**Recommendation**: Add **middle-click on a node** (or a configurable button) to `flyTo` that node. This mirrors SGC's right-click-release behavior:

```typescript
// In InteractionPlugin.handlePointerDown:
if (e.button === 1 && nodeResult?.node) {
    // Middle click on node → fly to it
    this.sg.cameraControls.flyTo(nodeResult.node.position, nodeRadius * 1.5);
    return;
}
```

### 5. Keyboard Camera Controls

SGC has dedicated keys for camera movement: `l/r/f/b` for pan, `z/x` for zoom, arrows for pan, Page Up/Down for zoom. This provides **keyboard-only navigation** without touching the mouse.

SGJS has no keyboard camera controls (only Space for zoom-to-hovered, Ctrl+Z/Y for undo/redo).

**Recommendation**: Add keyboard camera controls to `CameraControls`:

```typescript
// Proposed additions to CameraControlsConfig:
{
    keyPanSpeed: 5.0,       // world units per key press
    keyZoomSpeed: 0.4,      // distance units per key press
    keyPanLeft: 'l',
    keyPanRight: 'r',
    keyPanFront: 'f',
    keyPanBack: 'b',
    keyZoomIn: 'z',
    keyZoomOut: 'x',
}
```

### 6. Orthographic Toggle

SGC supports toggling between perspective and orthographic projection (`o` key). This is useful for 2D-like inspection of graph layouts, especially when nodes are arranged in a plane.

SGJS has no orthographic mode.

**Recommendation**: Add `CameraControls.toggleOrthographic()` and wire it to a keyboard shortcut.

### 7. Widget Event Bubbling Pattern

SGC's `Container::onMouseButton` iterates children and returns `true` if any handled it. This is a clean **event bubbling** pattern that allows nested widgets to intercept events before they reach the camera.

SGJS's event system is flat — `InteractionPlugin` handles all events at the top level and dispatches to sub-handlers. There is no bubbling or capturing phase.

**Recommendation**: For future widget/panel systems in SGJS, adopt the bubbling pattern. The `InputManager` binding system with priorities already provides a foundation — just need to add a `consumed` flag that stops lower-priority handlers.

### 8. Touch Lifecycle: onTouch / onUntouched

SGC tracks per-frame hover state via `updatePointer()` and calls `AbstractBody::onTouch()` / `onUntouched()` when focus enters/leaves a body. This gives widgets a clean lifecycle for hover effects.

SGJS has `HoverManager` which tracks `hoveredNode`/`hoveredEdge` and emits `node:pointerenter`/`node:pointerleave` events. This is equivalent and well-designed.

**No change needed** — SGJS already has this pattern, just with a different API surface.

### 9. Modifier Key Handling

SGC uses `glutGetModifiers()` to resolve Alt/Ctrl/Shift each event. Alt key suppresses camera movement (reserved for Maya-style manipulators).

SGJS tracks Alt via a global `window.__spacegraph_altKey` flag set in `handleKeyDown`/`handleKeyUp`. This is used for Z-axis dragging in `DragHandler`.

**Problem**: The global flag is fragile — it doesn't work if the user Alt-tabs away and releases the key outside the window.

**Recommendation**: Use the `InputManager`'s `InputState.keysPressed` set instead of a global flag. Or better, pass modifier state through the event data (which `DefaultInputConfig` already does via `originalEvent`).

### 10. Camera Interpolation Model

SGC uses explicit `*Next` targets with per-frame lerp:

```cpp
camTarget = (1 - speed) * camTarget + speed * camTargetNext;
```

SGJS uses delta accumulation:

```typescript
this.spherical.theta += this.sphericalDelta.theta;
this.spherical.phi += this.sphericalDelta.phi;
this.spherical.radius *= this.scale;
```

**SGC's model** is better for programmatic camera movement (fly-to, snap-to-object) because you set a target and the camera smoothly converges. **SGJS's model** is better for direct manipulation (mouse drag feels immediate).

**Recommendation**: Keep SGJS's delta model for direct manipulation but add SGC-style target interpolation for programmatic movement. The `flyTo()` method already does this with a cubic ease-out animation — consider adding a `setTargetSmooth(target, duration)` that uses lerp interpolation for shorter, snappier transitions.

---

## Proposed Default Control Configuration for SGJS

Combining SGC's ergonomics with SGJS's architecture:

### Mouse Controls

| Input                    | Action        | Notes                                               |
| ------------------------ | ------------- | --------------------------------------------------- |
| **Left drag on node**    | Drag node     | Consumes event, prevents camera rotation            |
| **Left drag on empty**   | Rotate camera | Default orbit behavior                              |
| **Left + Shift drag**    | Box selection | Existing                                            |
| **Middle drag**          | Pan camera    | Existing                                            |
| **Middle click on node** | Fly to node   | **New** — SGC's zoom-to-object                      |
| **Scroll wheel**         | Zoom          | Existing                                            |
| **Right drag**           | Zoom camera   | **New** — SGC's zoom-by-drag (alternative to wheel) |
| **Right click (short)**  | Context menu  | Existing                                            |

### Keyboard Controls

| Key                   | Action                   | Notes                         |
| --------------------- | ------------------------ | ----------------------------- |
| `l` / `r` / `f` / `b` | Pan camera               | **New** — SGC's keyboard pan  |
| `z` / `x`             | Zoom in/out              | **New** — SGC's keyboard zoom |
| `o`                   | Toggle orthographic      | **New** — SGC's ortho toggle  |
| `w`                   | Toggle wireframe         | **New** — SGC's debug mode    |
| `Space`               | Fly to hovered node      | Existing                      |
| `Escape`              | Cancel / clear selection | Existing                      |
| `Delete`              | Delete selected          | Existing                      |
| `Ctrl+A`              | Select all               | Existing                      |
| `Ctrl+Z` / `Ctrl+Y`   | Undo / Redo              | Existing (HistoryPlugin)      |
| `Alt` + diagonal drag | Z-axis drag              | Existing                      |

### Event Consumption Model

```typescript
// Priority-ordered event handling with consumption
const handlers = [
    { priority: 200, handler: this.resizeHandler }, // Resize handles first
    { priority: 150, handler: this.connectionHandler }, // Connection mode
    { priority: 100, handler: this.dragHandler }, // Node dragging
    { priority: 50, handler: this.selectionManager }, // Box selection
    { priority: 0, handler: this.cameraControls }, // Camera (fallback)
];

for (const h of handlers) {
    if (h.handler.onPointerDown(event)) {
        event.consumed = true;
        break;
    }
}
```

This mirrors SGC's pattern: `faceContainer.onMouseButton()` → `AbstractBody::isDraggable()` → camera fallback.

---

## Architecture Changes Summary

| Change                   | Scope                                  | Priority |
| ------------------------ | -------------------------------------- | -------- |
| Event consumption model  | `InteractionPlugin` + `CameraControls` | High     |
| Middle-click fly-to-node | `InteractionPlugin.handlePointerDown`  | High     |
| Keyboard camera controls | `CameraControls` + key bindings        | Medium   |
| Damped node dragging     | `DragHandler`                          | Medium   |
| Orthographic toggle      | `CameraControls`                       | Low      |
| Right-drag zoom          | `CameraControls`                       | Low      |
| Improve Alt key handling | `InputManager` / `InteractionPlugin`   | Medium   |
| Widget event bubbling    | Future widget system                   | Future   |

---

## Deep Dive: SGC's Dual-Layer Widget System as Inspiration

SGC's widget architecture is worth studying for SGJS's future UI needs. It separates concerns cleanly:

### 2D Overlay Widgets (`widget2d/`)

- **`Widget`** — base class with `position`, `absPosition`, `size`, `active`, `isTouchable`, `isContainer`
- **`Container`** — `map<string, Widget*> children`, recursive hit-testing via `mouseOverChild()`, event bubbling
- **`Panel`** — draggable container with translucent background, borders
- **`Button`** — `ButtonModel` callback pattern (MVC)
- **`HSlider`/`VSlider`** — `SliderModel` callback, percentage-based knob positioning

Key pattern: **`isTouchable`** flag lets a widget declare "I want to receive mouse events" vs "I'm just visual decoration." Containers that aren't touchable pass events through to children. This is a clean way to handle hit-testing in a nested UI.

### 3D Physics-Backed Widgets (`widget3d/`)

- **`PanelBox`** — a `BoxBody` (physics object) with a "front face" that hosts 2D `Rect` children
- **`ButtonBox`** — `onTouch()`/`onUntouched()` lifecycle, `isDraggable() → false` to prevent physics picking
- **`XYSlider`** — 2D slider embedded in 3D space, tracks `touchPos` in local coordinates
- **`Rect`** / **`TextRect`** — simple visual elements drawn on panel faces

Key pattern: **`isDraggable(localPos)`** lets a 3D widget opt out of the physics picking system. A `ButtonBox` returns `false` so that clicking it triggers the button instead of dragging the entire panel. This is a clean separation between widget interaction and physics interaction.

### What SGJS Can Borrow

1. **`isDraggable` veto pattern**: Nodes or node sub-regions (resize handles, connection ports, buttons) should be able to say "handle this interaction yourself, don't drag me."

2. **`isTouchable` pass-through**: Non-interactive visual decorations (background shapes, labels) shouldn't block click-through to nodes behind them.

3. **Model-view separation**: `SliderModel`/`ButtonModel` callbacks decouple UI state from rendering. SGJS's nodes could adopt this for interactive sub-components.

4. **Front-face child lists**: `PanelBox.front()` returns a list of `Rect` children drawn on the panel's front face. SGJS nodes could have a similar "face" system for attaching interactive badges, status indicators, or mini-controls.

---

## Deep Dive: SGC's Pointer Tracking System

SGC runs `updatePointer()` every frame after buffer swap:

```cpp
void DefaultSpace::updatePointer() {
    btVector3 rayTo = getRayTo(pointerPixelX, pointerPixelY);
    btCollisionWorld::ClosestRayResultCallback rayCallback(rayFrom, rayTo);
    dynamicsWorld->rayTest(rayFrom, rayTo, rayCallback);
    if (rayCallback.hasHit()) {
        // Find owning AbstractBody
        // Call onTouch(worldPos, localPos, buttonState)
        // Call onUntouched() on previously touched body
    }
    lastTouchedAbstractBody = touchedAbstractBody;
}
```

This gives every frame:

- `touchedBody` — the `btRigidBody` under the cursor
- `touchedAbstractBody` — the high-level object that owns it
- `touchPosWorld` / `touchPosLocal` — hit position in world and local space
- Automatic `onUntouched()` when cursor leaves

SGJS's equivalent is `HoverManager` + `InteractionRaycaster`, which is functionally similar but only runs during `pointermove` events, not every frame. This means hover state can go stale if the camera moves while the mouse is stationary.

**Recommendation**: Run hover raycasting in the render loop (or at least when camera moves), not just on pointer events. This keeps hover state accurate during fly-to animations and camera panning.

---

## Deep Dive: SGC's Camera Step Controls

SGC's `stepLeft/Right/Front/Back` methods move the camera target, not the camera itself:

```cpp
void SpaceProcess::stepLeft()  { camTargetNext += m_cameraRight * 0.1; }
void SpaceProcess::stepRight() { camTargetNext -= m_cameraRight * 0.1; }
void SpaceProcess::stepFront() {
    camTargetNext += rayForward;
    m_cameraPositionNext += rayForward;
}
void SpaceProcess::stepBack() {
    camTargetNext -= rayForward;
    m_cameraPositionNext -= rayForward;
}
```

This is elegant: the camera smoothly interpolates to the new target via the `*Next` lerp system. The user gets smooth, animated camera movement from discrete key presses.

SGJS could implement this as a `panTarget` / `panTargetNext` system in `CameraControls`:

```typescript
private panDelta = new THREE.Vector3();

panBy(dx: number, dy: number): void {
    const offset = new THREE.Vector3().copy(this.camera.position).sub(this.target);
    const side = new THREE.Vector3().crossVectors(this.camera.up, offset).normalize();
    const up = this.camera.up.clone().normalize();
    this.panDelta.add(side.multiplyScalar(-dx));
    this.panDelta.add(up.multiplyScalar(dy));
}

// In update():
this.target.add(this.panDelta);
this.panDelta.set(0, 0, 0);
```

This already exists via `panOffset` — just need to expose a `panBy(dx, dy)` method and wire it to keyboard input.

---

## Implementation Priority Roadmap

### Phase 1: Fix Ambiguity (High Impact, Low Risk)

1. **Event consumption**: Add `consumed` flag so `InteractionPlugin` can prevent `CameraControls` from rotating when dragging a node
2. **Middle-click fly-to**: One-line addition to `handlePointerDown`

### Phase 2: Ergonomic Enhancements (Medium Impact)

3. **Keyboard camera controls**: Wire `l/r/f/b/z/x` to `CameraControls.panBy()` and radius adjustment
4. **Damped dragging**: Add `dragStiffness` config to `DragHandler`
5. **Alt key fix**: Replace `window.__spacegraph_altKey` with `InputState.keysPressed`

### Phase 3: Feature Parity (Lower Priority)

6. **Orthographic toggle**: Add to `CameraControls`
7. **Right-drag zoom**: Alternative zoom method
8. **Hover raycasting in render loop**: Keep hover state accurate during camera animation

### Phase 4: Future Architecture

9. **Widget system foundations**: `isDraggable`, `isTouchable`, model-view callbacks
10. **Unified input pipeline**: Move `CameraControls` into `InputManager` binding system
