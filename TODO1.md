# Spacegraph1 Ideas - Adaptation Plan

Tracks are independent and can be pursued in any order.

## Track 1: Action Applicability System (High Priority)

**Source**: `spacegraph1/src/automenta/spacenet/var/action/Action.java`

**Concept**: Actions self-evaluate their relevance to context, enabling intelligent tool recommendations.

```java
public interface Action<I,O> {
    public double applies(I i);  // 0 = not relevant, >0 = relevance strength
    public Callable<O> get(I i);
}
```

**Adaptation for spacegraph7**:
- Create `src/actions/Action.ts` interface
- Actions implement `applies(context)` returning relevance score
- ActionManager ranks available actions by relevance
- Enables context-aware tool switching, smart shortcuts

**Files to create**:
- `src/actions/Action.ts`
- `src/actions/ActionManager.ts`
- `src/actions/BuiltInActions.ts`

---

## Track 2: Hypergraph Support

**Source**: `spacegraph1/src/automenta/spacenet/var/graph/Graph.java`, `MemGraph.java`

**Concept**: Edges can connect multiple nodes (hyperedges), not just pairs.

```java
public interface Graph<V, H> {
    public H addEdge(H edge, EdgeType edgeType, V... vList);  // variadic
}
```

**Adaptation for spacegraph7**:
- Extend Edge class to support multiple source/target nodes
- Add HyperEdge type
- Layout algorithms handle hypergraph constraints
- Visualization: edges fan out to multiple targets

**Files to modify**:
- `src/nodes/Edge.ts` - add multi-node support
- `src/core/Graph.ts` - hyperedge methods
- Layout plugins - handle hyperedges

---

## Track 3: Reactive Property Binding System

**Source**: `spacegraph1/src/automenta/spacenet/var/scalar/DoubleVar.java`

**Concept**: Variables notify listeners on change with built-in subscription management.

```java
public class DoubleVar {
    private List<IfDoubleChanges> ifChanges = new LinkedList();
    public IfDoubleChanges add(IfDoubleChanges d) { ... }
    public IfDoubleChanges remove(IfDoubleChanges d) { ... }
}
```

**Adaptation for spacegraph7**:
- Enhance Node properties with reactive binding
- Create `Property<T>` class with subscribe/unsubscribe
- Support computed properties (derived values)
- Enable node-to-node property binding

**Files to create**:
- `src/core/Property.ts`
- `src/core/ComputedProperty.ts`

**Files to modify**:
- `src/nodes/Node.ts` - use Property for position, scale, rotation

---

## Track 4: Graph Pattern Generators

**Source**: `spacegraph1/src/automenta/spacenet/var/graph/patterns/`

**Files**:
- `RandomTreeNet.java`
- `RandomStringNet.java`
- `MeshGraph.java`

**Concept**: Algorithmic graph structure generation.

**Adaptation for spacegraph7**:
- Create `src/utils/graphGenerators.ts`
- Implement: randomTree(depth, maxChildren), randomMesh(w, h), lattice, scaleFree, smallWorld

**Files to create**:
- `src/utils/graphGenerators.ts`

---

## Track 5: Enhanced Graph Change Listeners

**Source**: `spacegraph1/src/automenta/spacenet/var/graph/IfGraphChanges.java`

**Concept**: Granular graph change callbacks with event context.

```java
public interface IfGraphChanges<N, E> {
    public void nodeAdded(MemGraph<N, E> graph, N vertex);
    public void nodeRemoved(MemGraph<N, E> graph, N vertex);
    public void edgeAdded(MemGraph<N, E> graph, E edge);
    public void edgeRemoved(MemGraph<N, E> graph, E edge);
}
```

**Note**: spacegraph7 already has similar via EventEmitter. Could enhance with:
- Before/after hooks
- Batch change notifications
- Change aggregation for undo/redo

---

## Track 6: Mathematical Utilities

**Source**: `spacegraph1/src/automenta/spacenet/var/Maths.java`

```java
public class Maths {
    public static final double PHI = 1.61803399;
    public static double random(double min, double max) { ... }
}
```

**Adaptation for spacegraph7**:
- Add to existing math utilities
- Golden ratio constant
- Extended random utilities
- Graph-specific math (degree distribution, centrality)

---

## Track 7: Color Gradient System

**Source**: `spacegraph1/src/automenta/spacenet/var/physical/ColorGradient.java`

**Concept**: Multi-stop color gradients for visualization.

**Adaptation for spacegraph7**:
- Extend existing color handling
- Add gradient presets for heatmaps, hierarchies

---

## Track 8: Control State Visualization (Borders & Indicators)

**Source**: `spacegraph1/src/automenta/spacenet/space/widget/panel/` - `DefaultPanelModel.java`, `Panel.java`

**Concept**: Visual state feedback through borders indicating control states (normal, touched, pressed).

```java
// PanelModel provides state-based color changes
public class DefaultPanelModel implements PanelModel {
    public static final Color defaultNormalColor = Color.GrayPlusPlus;
    public static final Color defaultTouchedColor = Color.GrayPlusPlusPlus;
    public void onTouchStart() { panel.color(touchedColor); }
    public void onNormal() { panel.color(normalColor); }
}
```

**spacegraph7 Gap**: Currently has hover scaling via `HoverMetaWidget` but lacks persistent state borders for:
- **Nodes being dragged** - no drag state visual
- **Selected nodes** - basic only
- **Pressed/active buttons** - no press state
- **Editable fields** - no focus indicator
- **Disabled controls** - no disabled state
- **Multi-select box** - uses CSS only, no 3D border

**Adaptation for spacegraph7**:
- Add Node state enum: `normal | hovered | pressed | dragging | selected | disabled`
- Create `ControlStateBorder` helper that renders state-appropriate borders
- Different border styles per state: dashed (hover), solid (selected), animated (dragging)
- Border colors indicate interaction type (blue=drag, green=select, yellow=edit)
- Glow effects for active/engaged controls

**Files to create**:
- `src/plugins/interaction/ControlStateBorder.ts` - border rendering utility

**Files to modify**:
- `src/nodes/Node.ts` - add state management
- `src/plugins/interaction/HoverManager.ts` - add state tracking
- `src/plugins/interaction/SelectionManager.ts` - add selection border

---

## Track 9: Enhanced Pointer/Raycast System

**Source**: `spacegraph1/src/automenta/spacenet/space/control/pointer/DefaultPointer.java`

**Concept**: Unified pointer with automatic picking, drag detection, and button handling.

```java
// Key behaviors in DefaultPointer:
// 1. Continuous picking via updatePick() with distance sorting
// 2. Drag threshold detection (getDragThreshold() = 1.01 pixels)
// 3. Button state tracking (leftPressed, rightPressed, middlePressed)
// 4. Touch/Press separation
// 5. Zoom on right-click via getZoomable()
```

**spacegraph7 Already Has**:
- Fingering system (exclusive input state machine) - more sophisticated
- Raycaster in InputManager
- HoverManager
- DragHandler via plugin

**Opportunities for Enhancement**:
- **Drag threshold visualization** - show potential drag before committing
- **Tangible interface** - formalized "can interact" check
- **Pressable callbacks** - onPressStart/onPressStop separate from drag
- **Zoomable interface** - auto-zoom to target on click
- **Pointer persistence** - maintain pick across frames

**Adaptation**:
- Add `Draggable` interface (like spacegraph1) for unified drag handling
- Add `Pressable` callback support for button press/release
- Add drag threshold indicator (shows ghost before drag starts)

---

## Track 10: Input Mode Cursor System

**Source**: `spacegraph1/src/automenta/spacenet/space/control/pointer/DefaultPointer.java`

**Concept**: Automatic cursor changes based on interactive state - e.g., right-click triggers zoom automatically.

```java
// Right-click zoom behavior
protected void rightReleased() {
    if (rightZoomTime < autoZoomPressTimeThreshold) {
        if (!middlePressed) {
            if (currentTangible != null) {
                Zoomable z = getZoomable(currentTangible);
                if (z != null) {
                    getSpacetime().getCamera().zoomTo(z, currentTangible, pickedMesh);
                }
            }
        }
    }
}
```

**spacegraph7 Current**: Uses `CursorManager` set by InteractionPlugin based on Fingering state.

**Enhancement Opportunity**:
- Add context-aware cursor changes (not just based on Fingering)
- Add automatic mode switches (e.g., edge-hover switches to wiring cursor)
- Cursor follows semantic state (edit, navigate, create, delete)

---

## Track 11: Tangible/Interactive Interface

**Source**: `spacegraph1/.../control/Tangible.java`, `Draggable.java`, `Pressable.java`, `Zoomable.java`

```java
public interface Tangible { boolean isTangible(); }
public interface Draggable extends Tangible {
    void onDragStart(Ray3 rayDragStart);
    void onDragging(Ray3 rayDrag);
    void onDragStop(Ray3 rayDragStop);
}
public interface Touchable extends Tangible {
    void onTouchStart(PickData pick);
    void onTouching(PickData pick);
    void onTouchStop();
}
public interface Pressable extends Tangible {
    void onPressStart(PickData pick);
    void onPressStop(PickData pick);
}
public interface Zoomable extends Tangible {
    boolean isZoomable();
    void onZoomStart();
    void onZoomStop();
}
```

**spacegraph7 Current**: Nodes have `isInteractive`, hooks like `onPointerEnter`, `onPointerLeave`, `animate` for transforms.

**Enhancement**: Formalize interactive interfaces on Node:
- Add `Draggable` mixin capability
- Add `Pressable` callback support
- Add `Zoomable` support for zoom-to-node

---

## Track 12: Widget Control Framework

**Source**: `spacegraph1/.../widget/` - Button, Panel, Slider, Spinner, etc.

**Concept**: Complete widget library with consistent model/view separation.

```java
public class Button extends Panel implements Pressable {
    private List<ButtonAction> buttonActions = new LinkedList<>();
    public void add(ButtonAction a) { buttonActions.add(a); }
    public void onPressStart(PickData pick) { getModel().onPressStart(); }
    public void onPressStop(PickData pick) {
        if (isTouched()) { getModel().onTouchStart(); }
        else { getModel().onNormal(); }
        for (ButtonAction ba : buttonActions) ba.onButtonClicked(this);
    }
}
```

**spacegraph7 Current**: Has built-in node types (ShapeNode, HtmlNode, ButtonNode not fully implemented).

**Enhancement Opportunities**:
- Formal `ButtonNode` with proper press handling
- SliderNode with value binding
- PanelNode with layout support
- TextInputNode for editable text
- Consistent model/view pattern

---

## Track 13: Integrated State Machine (Best-of-Both Fusion)

**Synergy Goal**: Combine spacegraph1's explicit control interfaces with spacegraph7's Fingering system.

### Integration Architecture

```
spacegraph1 (Java)                    spacegraph7 (TypeScript)
─────────────────────────────────────────────────────
Tangible                         isInteractive flag on Node
Draggable ───────────────────────▶ NodeDraggingFingering
Pressable                       MouseEvent handlers
Touchable                      HoverManager
Zoomable ──────────────────────▶ handleDblClick() → flyTo()
ButtonAction ──────────────────▶ node:metaaction events
PanelModel ────────────────────▶ ControlStateBorder (new)
```

### Implementation Reference

**Existing spacegraph7 Integration Points**:

1. `src/nodes/Node.ts` - Add interfaces:
   ```typescript
   interface Draggable { onDragStart(ray: Ray): void; onDragging(ray: Ray): void; onDragStop(ray: Ray): void; }
   interface Pressable { onPressStart(pick: PickResult): void; onPressStop(pick: PickResult): void; }
   interface Zoomable { isZoomable(): boolean; onZoomStart(): void; onZoomStop(): void; }
   ```

2. `src/plugins/interaction/InteractionPlugin.ts:115-168` - Modify `handlePointerDown()`:
   - Add check: `if (node instanceof Pressable) node.onPressStart(pick)`
   - Add check: `if (node instanceof Zoomable) node.isZoomable()`

3. `src/plugins/interaction/HoverManager.ts` - Enhance with Touchable:
   ```typescript
   // Currently only has onPointerEnter/Leave hooks
   // Add: onTouchStart, onTouching, onTouchStop
   ```

4. `src/input/Fingering.ts:16-26` - Enhance Fingering:
   ```typescript
   export abstract class Fingering {
       abstract start(finger: Finger): boolean;
       abstract update(finger: Finger): boolean;
       abstract stop(finger: Finger): void;
       // NEW: Add drag state callbacks
       onDragStart?(finger: Finger): void;
       onDragging?(finger: Finger): void;
       onDragStop?(finger: Finger): void;
   }
   ```

---

## Track 14: Unified Input Context (Drag State Persistence)

**Source**: `spacegraph1/.../pointer/DefaultPointer.java:91-169`

**Concept**: Maintain pick state across frames, enabling threshold detection.

### Implementation Reference

**spacegraph7 Current**: `src/input/InputManager.ts:290-325` - Finger persistence

**Enhancement**: Add persistent pick state:

```typescript
// src/input/PickState.ts - NEW FILE
export class PickState {
    private lastPickedNode: Node | null = null;
    private lastPickedEdge: Edge | null = null;
    private dragStartPosition: Vector2 | null = null;
    private isDragging = false;
    private dragThreshold = 5; // pixels

    startPick(node: Node | null, position: Vector2): void {
        this.lastPickedNode = node;
        this.dragStartPosition = position.clone();
        this.isDragging = false;
    }

    checkDragThreshold(currentPosition: Vector2): boolean {
        if (!this.dragStartPosition || !this.lastPickedNode) return false;
        const dist = this.dragStartPosition.distanceTo(currentPosition);
        if (dist > this.dragThreshold && !this.isDragging) {
            this.isDragging = true;
            return true; // trigger drag start
        }
        return false;
    }

    getPickedNode(): Node | null { return this.lastPickedNode; }
    getIsDragging(): boolean { return this.isDragging; }
}
```

**Integration Points**:
- `src/plugins/interaction/InteractionPlugin.ts:115` - Add PickState initialization
- `src/plugins/interaction/DragHandler.ts` - Use PickState for threshold

---

## Track 15: Visual State Feedback System (Borders + Glow + Animation)

**Source**: `spacegraph1/.../panel/DefaultPanelModel.java:46-53`

```java
// Current spacegraph1 pattern
public void onTouchStart() { panel.color(touchedColor); }
public void onNormal() { panel.color(normalColor); }
```

**spacegraph7 Enhancement**: More sophisticated than color-only feedback:

### Implementation Reference

**Create**: `src/plugins/interaction/ControlStateBorder.ts`

```typescript
export type ControlState = 'normal' | 'hovered' | 'pressed' | 'dragging' | 'selected' | 'disabled';

export interface ControlStateStyle {
    borderColor: string;
    borderWidth: number;
    borderStyle: 'solid' | 'dashed' | 'dotted';
    glowColor?: string;
    glowRadius?: number;
    animation?: 'pulse' | 'wave' | 'none';
}

const STATE_STYLES: Record<ControlState, ControlStateStyle> = {
    normal:     { borderColor: 'transparent', borderWidth: 0, borderStyle: 'solid' },
    hovered:   { borderColor: '#8B5CF6', borderWidth: 2, borderStyle: 'dashed', animation: 'pulse' },
    pressed:   { borderColor: '#3B82F6', borderWidth: 3, borderStyle: 'solid' },
    dragging:  { borderColor: '#10B981', borderWidth: 3, borderStyle: 'solid', glowColor: '#10B981', glowRadius: 15 },
    selected:  { borderColor: '#F59E0B', borderWidth: 2, borderStyle: 'solid' },
    disabled:  { borderColor: '#6B7280', borderWidth: 1, borderStyle: 'dotted', opacity: 0.5 },
};
```

**Integration**:
- `src/nodes/Node.ts` - Add `controlState` property
- `src/plugins/interaction/HoverManager.ts` - Update state on hover changes
- `src/plugins/interaction/SelectionManager.ts` - Update state on selection
- `src/plugins/interaction/DragHandler.ts` - Update state on drag start/stop

---

## Track 16: Button/Widget Action System

**Source**: `spacegraph1/.../widget/button/ButtonAction.java:12-13`
```java
public interface ButtonAction {
    public void onButtonClicked(Button b);
}
```

**Reference**: `spacegraph7/src/plugins/interaction/HoverMetaWidget.ts:7-11`
```typescript
export interface HoverAction {
    icon: string;
    label: string;
    action: string;
}
```

**Enhancement**: Add to Node:

```typescript
// src/nodes/Node.ts - ADD
interface NodeActions {
    onClick?: (node: Node) => void;
    onDoubleClick?: (node: Node) => void;
    onDragStart?: (node: Node, ray: Ray) => void;
    onDragging?: (node: Node, ray: Ray) => void;
    onDragStop?: (node: Node, ray: Ray) => void;
    actions?: Array<{ icon: string; label: string; action: string }>;
}
```

**Integration Points**:
- `src/plugins/interaction/InteractionPlugin.ts:141-156` - Execute onClick callbacks
- `src/plugins/interaction/HoverMetaWidget.ts:159-162` - Emit `node:metaaction` events
- `src/plugins/interaction/DragHandler.ts` - Emit drag callbacks

---

## Track 17: Spinner/Slider Value Widget

**Source**: `spacegraph1/.../widget/spinner/Spinner.java:148-161`

```java
// Current pattern - uses Repeat for acceleration
protected void startAccel(final int direction) {
    accel = add(new Repeat(getSpinPeriod().d()) {
        @Override protected void update(double t, double dt, Spatial s) {
            spin(direction);
        }
    });
}
```

**Adaptation for spacegraph7**: Create `SliderNode` and `SpinnerNode`:

```typescript
// src/nodes/widgets/SliderNode.ts - NEW
export class SliderNode extends ShapeNode {
    private value: number = 0;
    private min: number = 0;
    private max: number = 100;
    private step: number = 1;
    private onChange?: (value: number) => void;

    getValue(): number { return this.value; }
    setValue(v: number): void {
        this.value = Math.max(this.min, Math.min(this.max, v));
        this.onChange?.(this.value);
    }
}
```

---

## Implementation Order with Integration Points

### Phase 1: Core Infrastructure
1. **Track 3 (Property Binding)** - Foundation for reactivity
   - Create `src/core/Property.ts` 
   - Modify `src/nodes/Node.ts` to use Property

2. **Track 13 (State Machine Fusion)** - Unify input system
   - Add interfaces to `src/nodes/Node.ts`
   - Modify `src/plugins/interaction/InteractionPlugin.ts`

### Phase 2: Visual Feedback
3. **Track 15 (Control State Visualization)** - Borders & glow
   - Create `src/plugins/interaction/ControlStateBorder.ts`
   - Integrate with `HoverManager.ts`, `SelectionManager.ts`, `DragHandler.ts`

4. **Track 8 (Control States)** - Track states
   - Add `controlState` to Node
   - Update via HoverManager/SelectionManager events

### Phase 3: Interaction Enhancement
5. **Track 14 (Pick State Persistence)** - Drag thresholds
   - Create `src/input/PickState.ts`
   - Integrate with `InteractionPlugin.ts`

6. **Track 1 (Action Applicability)** - Smart actions
   - Create `src/actions/Action.ts`
   - Integrate with `InputManager.ts`

### Phase 4: Features
7. **Track 4 (Graph Generators)** - Testing data
8. **Track 16 (Button Actions)** - Node actions
9. **Track 12, 17 (Widgets)** - SliderNode, etc.

### Phase 5: Advanced
10. **Track 2 (Hypergraph)** - Multi-node edges
11. **Track 5-7, 9-11** - Remaining

---

## Key File Integration Reference

| Feature | File to Create | Files to Modify |
|---------|----------------|-----------------|
| Property System | `src/core/Property.ts` | `src/nodes/Node.ts` |
| Control State | `src/plugins/interaction/ControlStateBorder.ts` | `src/nodes/Node.ts`, `HoverManager.ts`, `SelectionManager.ts` |
| Pick State | `src/input/PickState.ts` | `InteractionPlugin.ts`, `DragHandler.ts` |
| Actions | `src/actions/Action.ts`, `src/actions/ActionManager.ts` | `src/input/InputManager.ts` |
| GraphGen | `src/utils/graphGenerators.ts` | - |
| SliderNode | `src/nodes/widgets/SliderNode.ts` | TypeRegistry |
| Node Actions | - | `src/nodes/Node.ts`, `InteractionPlugin.ts` |
| Tangible | - | `src/nodes/Node.ts`, `InteractionPlugin.ts` |

---

## Summary

spacegraph1 (Java, 2009-era) demonstrates several patterns ahead of its time:
- **Context-aware actions** - could power intelligent tool selection
- **Hypergraphs** - for complex many-to-many relationships
- **Reactive primitives** - inspiration for enhanced reactivity
- **Control state visualization** - clear visual feedback for interaction states
- **Unified pointer system** - drag/press/zoom separation
- **Widget framework** - consistent model/view pattern
- **Value binding** - Spinner/Slider with reactive value

**Best-of-Both Integration**:
- Keep spacegraph7's Fingering system (superior to JUNG-based picking)
- Add spacegraph1's explicit interfaces (Tangible, Draggable, Pressable, Zoomable)
- Enhance with ControlStateBorder (more than just scaling)
- Add PickState for drag threshold (improves drag detection)
- Fuse Action system with existing InputManager

The result: A system with spacegraph7's modern architecture enhanced by spacegraph1's thoughtful interaction patterns.
