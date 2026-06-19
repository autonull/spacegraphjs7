# SGJ → SGJS: Lessons and Transferable Patterns

## What SGJ Does Well (and SGJS Should Learn From)

### 1. Surface Hierarchy as the Single Abstraction

**SGJ**: Everything is a `Surface`. Widgets, containers, layouts, graphs — all extend one base class. Hit testing, rendering, lifecycle, and positioning are uniform.

**SGJS gap**: Node types are fragmented — `Node`, `DOMNode`, `ShapeNode`, `InstancedNode`, `HtmlNode` each have different capabilities. Edges are a separate hierarchy entirely. There's no unified "thing in the scene" abstraction that handles hit testing, visibility, lifecycle, and positioning consistently.

**Apply**: Consider a unified `Surface`-like base that all nodes and edges share, providing:

- Uniform `bounds` (or `rect`) in parent/world space
- Uniform `finger()` / `hitTest()` for input
- Uniform `renderIfVisible()` with frustum culling baked in
- Uniform `start()` / `stop()` / `delete()` lifecycle
- `parent` / `children` tree navigation (`parentOrSelf()`, `parent(Predicate)`)

---

### 2. Lazy Layout via Dirty Flag

**SGJ**: `ContainerSurface` uses a `VarHandle`-based `mustLayout` flag. Layout is deferred until render time and runs at most once per frame via CAS:

```java
if (MUSTLAYOUT.compareAndSet(this, 1, 0)) {
    doLayout(r.frameDT);
}
```

Position changes auto-trigger layout in `ContainerSurface.pos()`.

**SGJS gap**: Layout plugins (`ForceLayout`, `GridLayout`, etc.) are invoked imperatively via `apply()`. There's no automatic dirty-flag mechanism — if a node moves or is added, nothing automatically triggers a relayout.

**Apply**: Add a `needsLayout` dirty flag to layout containers. When nodes are added/removed/repositioned, mark the container dirty. Layout runs once per frame max. This eliminates the need for manual `applyLayout()` calls and prevents redundant layout passes.

---

### 3. Compositional Layout Containers

**SGJ**: Layout is achieved by composing small, single-purpose containers:

- `Stacking` — overlay children at full bounds
- `Gridding` — auto-sizing grid with aspect ratio optimization
- `Bordering` — 9-region subdivision (CSS flexbox-like)
- `Splitting` — two-panel splitter with draggable divider
- `Switching` — single-child state machine
- `ScrollXY` — virtualized viewport with scrollbars
- `MutableUnitContainer` — single-child wrapper (like React's single child)

**SGJS gap**: Layout is monolithic — a single plugin computes positions for ALL nodes at once. There's no way to have a sub-region of the graph use a different layout, or to nest layouts hierarchically.

**Apply**: Introduce compositional layout containers as node types:

```typescript
class StackingNode extends GroupNode {
    /* all children share bounds */
}
class GridNode extends GroupNode {
    /* children laid in grid */
}
class SplitNode extends GroupNode {
    /* two-panel split with draggable divider */
}
class BorderNode extends GroupNode {
    /* 9-region layout */
}
class SwitchNode extends GroupNode {
    /* single active child */
}
```

Each container manages its own children's positions during its `onPreRender()` or `update()` cycle. This enables **nested layouts** — a grid inside a split panel inside a zoomed viewport.

---

### 4. Exclusive Input State Machine (Fingering)

**SGJ**: The `Finger` / `Fingering` system is elegant:

- `Finger` tracks position, buttons, state, and the surface under it
- `Fingering` is an exclusive interaction state (`Dragging`, `Clicking`, `Resizing`)
- `finger.test(fingering)` attempts to acquire exclusive control
- States have `start()` → `update()` → `stop()` lifecycle
- `defer()` allows states to yield to higher-priority states

**SGJS gap**: Input is split across `InputManager` (action bindings), `CameraControls` (orbit), and `InteractionPlugin` (raycasting/drag/select). These layers can conflict — e.g., dragging a node vs. orbiting the camera vs. box-selecting. There's no explicit exclusivity mechanism.

**Apply**: Adopt the Fingering pattern:

```typescript
abstract class Fingering {
    abstract start(finger: Finger): boolean;
    abstract update(finger: Finger): boolean; // false = done
    abstract stop(finger: Finger): void;
    defer(finger: Finger): boolean {
        return true;
    } // allow preemption
}

class Finger {
    private activeFingering: Fingering | null = null;

    test(next: Fingering): boolean {
        if (this.activeFingering?.defer(finger) ?? true) {
            this.activeFingering?.stop(this);
            this.activeFingering = next;
            return next.start(this);
        }
        return false;
    }
}
```

This cleanly resolves conflicts: a drag fingering defers to nothing; a hover fingering defers to everything; a resize fingering defers to nothing.

---

### 5. Coordinate Space Transforms

**SGJ**: `Finger.push(SurfaceTransform, fn)` and `ReSurface.push(Camera, v2)` manage nested coordinate spaces. `Zoomed` uses this to transform finger input into zoomed/panned space transparently.

**SGJS gap**: `CameraControls` handles camera transforms, but node-local coordinate spaces are implicit. When dragging a node inside a `GroupNode`, the drag handler works in world space, not group-local space.

**Apply**: Add a `SurfaceTransform` interface and coordinate push/pop to the input system:

```typescript
interface SurfaceTransform {
    worldToLocal(world: Vector3): Vector3;
    localToWorld(local: Vector3): Vector3;
}

class InputManager {
    push(transform: SurfaceTransform, handler: (finger: Finger) => void) {
        // transform finger coords, call handler, restore
    }
}
```

---

### 6. Virtualized / Infinite Scrolling

**SGJ**: `ScrollXY.DynGrid` uses a `MutableMapContainer` with cell IDs encoded as `(short)x << 16 | (short)y`. Only visible cells are instantiated; off-screen cells are culled via `map.removeIf()`. The model (`GridModel`) and renderer (`GridRenderer`) are decoupled.

**SGJS gap**: All nodes are always instantiated. Large graphs (10k+ nodes) will create 10k Three.js objects regardless of visibility. `CullingManager` hides them from the camera but doesn't prevent instantiation.

**Apply**: For grid-like or data-driven graphs, introduce a virtualized container:

```typescript
class VirtualGridNode extends GroupNode {
    model: GridModel<T>;
    renderer: (x: number, y: number, value: T) => Node;
    visibleCells = new Map<string, Node>();

    onPreRender() {
        const viewRect = this.getVisibleRect();
        // remove off-screen cells
        // instantiate on-screen cells
        // update positions
    }
}
```

This enables rendering 1M-cell grids with only the ~100 visible cells instantiated.

---

### 7. Activity-Based Visual Feedback

**SGJ**: Two complementary mechanisms:

- `Widget.pri` — activity "temperature" that decays exponentially each frame. Drives visual intensity (glow, brightness).
- `Wire.activity(now, window)` — `1/(1 + dt/window)` decay for connection activity visualization.

**SGJS gap**: No built-in activity feedback. Nodes don't visually respond to being interacted with, receiving data, or being recently created.

**Apply**: Add `activity` property to nodes with exponential decay:

```typescript
class Node {
    activity = 0; // 0 = idle, 1 = hot
    readonly ACTIVITY_DECAY = 0.97; // per frame

    onPreRender(dt: number) {
        this.activity *= Math.exp(-dt / 2); // 2-second half-life
    }

    pulse(intensity: number) {
        this.activity = Math.max(this.activity, intensity);
    }
}
```

Use in rendering: glow intensity, border brightness, particle effects.

---

### 8. Port/Wiring Visual Programming

**SGJ**: `Port<X>` is a typed, connectable data port:

- Visual representation as a small widget
- Drag-to-wire interaction (middle mouse)
- Type compatibility checking
- `out(X)` sends to all connected ports
- `In<? super X>` callback for received data
- Visual feedback during wiring (green = output, blue = input)
- Activity tracking on wires for visual feedback

**SGJS gap**: Edges are purely visual connections. There's no data flow semantics — edges don't carry values, ports don't exist as interactive elements.

**Apply**: Add `PortNode` and `Wire` as first-class concepts:

```typescript
class PortNode<T> extends ShapeNode {
    on(value: (wire: Wire, data: T) => void): this;
    out(data: T): void;
}

class Wire {
    readonly source: PortNode;
    readonly target: PortNode;
    send(data: unknown): boolean;
    activity(now: number, window: number): number; // for visual feedback
}
```

This bridges the gap between visual graph editing and actual data flow programming.

---

### 9. Tooltip / Hover Overlay System

**SGJ**: `Hover<X, Y>` is a `Fingering` that:

- Activates when finger hovers on a source surface
- Lazily builds the tooltip via `Function<X, Y> targetBuilder`
- Positions via `HoverModel` (relative to cursor, sized relative to element)
- Auto-deletes when finger leaves source
- Added to root `Stacking` via self-cleaning `WeakContainer`

**SGJS gap**: `HoverManager` exists but is tightly coupled to `InteractionPlugin`. Tooltips are DOM-based and not composable.

**Apply**: Decouple hover into a reusable system:

```typescript
class Hover<S extends Surface, T extends Surface> extends Fingering {
    constructor(
        source: S,
        targetBuilder: (source: S) => T,
        model: HoverModel
    ) { ... }
}
```

Any surface can have a tooltip without knowing about the interaction system.

---

### 10. The Zoom Stack

**SGJ**: `Zoomed` maintains a `Deque<Surface>` (max 8) for nested zoom levels:

- Click a surface → push to stack, zoom to its bounds
- Click the same surface → pop, zoom to parent
- Page Up → zoom out one level
- Arrow keys → navigate to adjacent surfaces at current level
- Camera animation via `v3Anim` with adaptive speed

**SGJS gap**: Double-click zoom exists in `InteractionPlugin` but there's no zoom history or navigation. Zoom is a one-shot `flyTo()`.

**Apply**: Add a zoom stack to `CameraControls`:

```typescript
class CameraControls {
    private zoomStack: Surface[] = [];

    zoomTo(surface: Surface) {
        if (this.zoomStack.at(-1) === surface) {
            this.zoomStack.pop();
        } else {
            if (this.zoomStack.length >= 8) this.zoomStack.shift();
            this.zoomStack.push(surface);
        }
        this.flyTo(surface.bounds, duration);
    }

    zoomOut() {
        this.zoomStack.pop(); /* fly to new top */
    }
}
```

---

### 11. Draggable Window Panels

**SGJ**: `Windo` is a draggable, resizable panel:

- `FingerMoveSurface` for move, `FingerResizeSurface` for resize
- `DragEdit.mode()` determines resize direction from relative position
- Visual resize indicator drawn during hover
- `fixed(boolean)` locks position
- `posRel()` positions relative to parent graph

**SGJS gap**: No draggable panel concept. `HtmlNode` is positioned but not user-draggable.

**Apply**: Add `PanelNode` extending `HtmlNode` or `GroupNode`:

```typescript
class PanelNode extends HtmlNode {
    fixed = false;
    resizeBorder = 0.1;

    onPointerDown(e) {
        if (this.fixed) return;
        const mode = this.dragMode(e.localPosition); // MOVE | RESIZE_N | RESIZE_SE | ...
        this.finger.test(mode === MOVE ? this.moveFingering : this.resizeFingering);
    }
}
```

---

### 12. Rendering: Immediate-Mode Containers

**SGJ**: `ContainerSurface.render()` is immediate-mode — it lays out children and renders them each frame. No retained scene graph overhead for containers themselves.

**SGJS gap**: Three.js retains every object in the scene graph. `GroupNode` creates a `THREE.Group` even if it's just a layout container with no visual representation.

**Apply**: For layout-only containers, skip Three.js object creation entirely. Just manage child positions and let children render themselves. This reduces scene graph depth and draw calls.

---

## What SGJS Does Better (Keep As-Is)

| Area                    | SGJS Advantage                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| **3D rendering**        | Three.js with instancing, BVH raycasting, CSS3D layering — far more capable than JOGL 2D |
| **Plugin architecture** | Clean `Plugin` interface with lifecycle hooks, typed events via `mitt`                   |
| **Node type registry**  | Dynamic type registration with factory pattern                                           |
| **Vision system**       | AI-driven graph quality analysis with strategy pattern                                   |
| **Object pooling**      | `ObjectPool` and `ObjectPoolManager` for performance                                     |
| **TypeScript**          | Type safety, better DX                                                                   |
| **Edge variety**        | 9 edge types with animations, curves, bundles                                            |
| **Build tooling**       | Vite, Vitest, Playwright, TypeDoc                                                        |

---

## Priority Recommendations

### High Impact, Low Effort

1. **Activity property** on nodes — 1 day, immediate visual feedback improvement
2. **Zoom stack** in `CameraControls` — 1 day, better navigation UX
3. **Dirty-flag layout** — 2 days, eliminates manual relayout calls

### High Impact, Medium Effort

4. **Compositional layout containers** (`StackingNode`, `GridNode`, `SplitNode`) — 1 week, enables nested layouts
5. **Exclusive input state machine** (Fingering) — 1 week, resolves input conflicts cleanly
6. **Virtualized grid container** — 1 week, enables massive data visualization

### High Impact, High Effort

7. **Unified Surface base** — 2-3 weeks, major refactor but simplifies everything downstream
8. **Port/Wiring system** — 2 weeks, enables visual programming semantics
9. **Coordinate space transforms** — 1 week, enables correct nested interaction
