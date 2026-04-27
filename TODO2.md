# SpaceGraph7 TODO2: Widget System, Event Handling & Rendering Refinement

**Purpose**: Refine widget system, event handling, and rendering by leveraging existing architecture while filling critical gaps from prior versions (spacegraph1, spacegraphc, spacegraphj).

**Guiding Principles**:
1. **Leverage existing architecture** - Node → Surface hierarchy already exists
2. **Avoid duplication** - HTMLNode already provides DOM embedding
3. **Enhance, don't replace** - Add missing capabilities to existing classes
4. **Focus on gaps** - Only implement what's truly missing

---

## Executive Summary

### ✅ What Already Exists (Architecture is Sound)

**Surface Hierarchy** (from spacegraphj concept):
- `Surface.ts`: Abstract base with parent/children, visibility, event emission
- `Node.ts`: Extends Surface with 3D positioning, hit testing, lifecycle
- Already has: parent-child hierarchy, visibility, event emission, hit testing

**Widget Nodes** (leverage HtmlNode):
- `HtmlNode.ts`: DOM embedding with resize, controls, content scaling ✓
- `PanelNode.ts`: Draggable/resizable panel (like spacegraphj's Windo) ✓
- `ButtonNode.ts`: 3D button with hover/press states ✓
- `SliderNode.ts`, `ToggleNode.ts`: Basic widgets ✓
- `CodeEditorNode.ts`: Monaco editor integration ✓
- `DataNode.ts`: Expandable data display ✓

**Event System**:
- `EventEmitter.ts`: Typed events, batching, disposable listeners ✓
- `EventSystem.ts`: Graph-level events ✓
- `InputManager.ts`: Finger-based gestural input ✓

**Rendering**:
- Three.js with DOM overlay ✓
- LODPlugin for level-of-detail ✓
- Visibility culling via LOD ✓

### 🔍 What's Actually Missing (True Gaps)

1. **Widget Event Propagation**: No bubbling through widget hierarchy
2. **Focus Management**: No global focus manager or focus traversal
3. **Text Editing**: Plain text edit (complement Monaco code editor)
4. **Port System**: Typed connection points with wiring
5. **Specialized Containers**: Tabs, splitters, scroll panels
6. **Rendering Context**: Frame timing, performance metrics
7. **Bounds-based culling**: Skip rendering off-screen/tiny nodes

---

## 1. Widget System Refinement

### Current Architecture Analysis

**Existing Hierarchy**:
```
Surface (abstract base)
  └─ Node (abstract, adds 3D, id, type, lifecycle)
      ├─ HtmlNode (DOM embedding, resize, controls)
      │   ├─ PanelNode (draggable/resizable panel)
      │   ├─ ButtonNode (3D button)
      │   ├─ SliderNode
      │   ├─ ToggleNode
      │   ├─ CodeEditorNode (Monaco)
      │   └─ DataNode
      └─ Other nodes (ShapeNode, ImageNode, etc.)
```

**Conclusion**: Architecture is **already correct**. No need for separate `WidgetNode` base class.

### 1.1 Enhance Existing Widget Base (HtmlNode)

**Add to `HtmlNode`**:
```typescript
// Widget lifecycle hooks
onMount(): void { }        // Called when widget is added to scene
onUnmount(): void { }      // Called when widget is removed
onFocus?(): void { }       // Called when widget gains focus
onBlur?(): void { }        // Called when widget loses focus

// Widget state (idle, hover, active, disabled, focus)
type WidgetState = 'idle' | 'hover' | 'active' | 'disabled' | 'focus';

// Standard widget interface
interface Widget {
  state: WidgetState;
  disabled: boolean;
  focusable: boolean;
  
  // Lifecycle
  mount(): void;
  unmount(): void;
  focus(): void;
  blur(): void;
  
  // State management
  setState(state: Partial<WidgetState>): void;
  isEnabled(): boolean;
  setEnabled(enabled: boolean): void;
}
```

**Implementation**: Create `WidgetMixin` class or interface that HtmlNode widgets can implement

### 1.2 Widget Types to Add

#### Text Editing (complement Monaco)
- [ ] **`TextEditNode`** extends `HtmlNode`
  - Uses `contenteditable` HTML (already in HtmlNode!)
  - Enhance with: 
    - Markdown preview toggle
    - Basic formatting toolbar (bold, italic, link)
    - Auto-resize to content
    - Plain text mode (strip HTML)
  - **Gap**: Currently HtmlNode has `data.editable` but no formatting toolbar

#### Port System (from spacegraphj)
- [ ] **`PortNode`** extends `Node` or `HtmlNode`
  ```typescript
  type PortType = 'bool' | 'int' | 'float' | 'string' | 'vector2' | 'vector3' | 'color' | 'any';
  
  interface PortNodeSpec {
    direction: 'input' | 'output';
    portType: PortType;
    label: string;
    defaultValue?: any;
    value?: any;
    connectedTo?: string[]; // IDs of connected ports
  }
  ```
  - Visual representation (circle/hexagon)
  - Type indicator (color-coded)
  - Wiring visualization (SVG/Canvas overlay or Three.js curves)
  - Type checking on connections
  - **Gap**: No port/wiring system exists

#### Container Widgets
- [ ] **`TabContainerNode`** extends `HtmlNode`
  - Multiple content panes
  - Tab bar (add, remove, reorder, scroll)
  - Active tab content
  - **Gap**: No tab container

- [ ] **`SplitterNode`** extends `HtmlNode`
  - Horizontal/vertical splits
  - Drag handles between panes
  - Nested splits
  - **Gap**: PanelNode is single-panel only

- [ ] **`ScrollPanelNode`** extends `HtmlNode`
  - Auto scrollbars when content overflows
  - Virtual scrolling for large lists
  - Scroll to element
  - **Gap**: HtmlNode has basic overflow but no scroll management

#### Specialized Widgets
- [ ] **`ColorPickerNode`** extends `HtmlNode`
  - RGB/HSV sliders or color wheel
  - Color palette presets
  - Alpha channel
  - Hex/RGB input
  - **Gap**: No color picker

- [ ] **`DropdownNode`** extends `HtmlNode`
  - Native `<select>` or custom dropdown
  - Single/multi-select
  - Searchable options
  - Custom option rendering
  - **Gap**: No dropdown/select widget

- [ ] **`ProgressBarNode`** extends `HtmlNode`
  - Determinate progress
  - Indeterminate (loading spinner)
  - Segmented progress
  - **Gap**: No progress indicator

- [ ] **`MeterNode`** extends `HtmlNode`
  - Numeric readout
  - Spark line (mini chart with Canvas/SVG)
  - Color-coded thresholds
  - **Gap**: No real-time value display

### 1.3 Widget Theming

**Current**: HtmlNode uses inline styles and CSS classes

**Enhancement**:
```typescript
// Widget theme interface
interface WidgetTheme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    border: string;
    hover: string;
    active: string;
    disabled: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
  };
  borderRadius: string;
  fontFamily: string;
}

// Apply theme via CSS variables
class ThemedWidget extends HtmlNode {
  applyTheme(theme: WidgetTheme) {
    Object.entries(theme.colors).forEach(([key, value]) => {
      this.domElement.style.setProperty(`--widget-${key}`, value);
    });
  }
}
```

---

## 2. Event Handling Enhancement

### Current Architecture Analysis

**Existing**:
- `EventEmitter`: Per-instance events with typed handlers
- `EventSystem`: Global graph events
- `InputManager`: Input event routing with fingerings
- Node callbacks: `onPointerEnter`, `onPointerLeave`, `onClick`, etc.

**Gap**: Event propagation through widget hierarchy

### 2.1 Event Bubbling System

**Add to `Surface` or `Node`**:
```typescript
// Event phases (like DOM)
type EventPhase = 'capture' | 'bubble' | 'default';

interface WidgetEvent<T = any> {
  type: string;
  target: Surface;
  currentTarget?: Surface;
  phase: EventPhase;
  data: T;
  bubbles: boolean;
  cancelable: boolean;
  defaultPrevented: boolean;
  
  // Methods
  stopPropagation(): void;
  stopImmediatePropagation(): void;
  preventDefault(): void;
}

// Add to Surface class
class Surface {
  // Event propagation
  dispatchEvent<T>(event: WidgetEvent<T>): void {
    // 1. Capture phase (top-down)
    if (event.bubbles) {
      this.dispatchEventToParent(event, 'capture');
    }
    
    // 2. Target phase
    this.handleEvent(event);
    
    // 3. Bubble phase (bottom-up)
    if (event.bubbles && this.parent) {
      this.dispatchEventToParent(event, 'bubble');
    }
  }
  
  private dispatchEventToParent(event: WidgetEvent, phase: EventPhase): void {
    if (!this.parent) return;
    
    event.currentTarget = this.parent;
    event.phase = phase;
    this.parent.handleEvent(event);
    
    if (this.parent.parent && !event.isPropagationStopped()) {
      this.parent.dispatchEventToParent(event, phase);
    }
  }
}
```

### 2.2 Focus Management

**Add `FocusManager` plugin**:
```typescript
class FocusManager extends BaseSystemPlugin {
  private focusStack: Node[] = [];
  private focusedNode: Node | null = null;
  
  // Focus management
  focus(node: Node): void {
    if (this.focusedNode === node) return;
    
    // Blur current
    this.focusedNode?.onBlur?.();
    this.focusedNode?.emit('blur');
    
    // Focus new
    this.focusedNode = node;
    this.focusedNode?.onFocus?.();
    this.focusedNode?.emit('focus');
    
    // Add to stack
    this.focusStack.push(node);
  }
  
  blur(): void {
    this.focusedNode?.onBlur?.();
    this.focusedNode?.emit('blur');
    this.focusedNode = null;
    this.focusStack.pop();
  }
  
  // Focus traversal (tab order)
  focusNext(): void {
    const nodes = this.sg?.graph.nodes.filter(n => n.focusable);
    if (!nodes || nodes.length === 0) return;
    
    const currentIndex = this.focusStack.indexOf(this.focusedNode!);
    const nextIndex = (currentIndex + 1) % nodes.length;
    this.focus(nodes[nextIndex]);
  }
  
  focusPrevious(): void {
    const nodes = this.sg?.graph.nodes.filter(n => n.focusable);
    if (!nodes || nodes.length === 0) return;
    
    const currentIndex = this.focusStack.indexOf(this.focusedNode!);
    const prevIndex = (currentIndex - 1 + nodes.length) % nodes.length;
    this.focus(nodes[prevIndex]);
  }
}
```

### 2.3 Keyboard Shortcuts

**Add `ShortcutManager`**:
```typescript
interface ShortcutBinding {
  id: string;
  key: string; // e.g., 'Ctrl+S', 'Delete', 'Escape'
  handler: (event: KeyboardEvent) => void;
  context?: 'global' | 'widget' | 'canvas';
  enabled?: () => boolean;
}

class ShortcutManager extends BaseSystemPlugin {
  private shortcuts: Map<string, ShortcutBinding> = new Map();
  
  register(shortcut: ShortcutBinding): void {
    this.shortcuts.set(shortcut.id, shortcut);
  }
  
  unregister(id: string): void {
    this.shortcuts.delete(id);
  }
  
  // On keydown, check shortcuts
  handleKeydown(event: KeyboardEvent): void {
    const keyString = this.eventToKeyString(event);
    const shortcut = this.shortcuts.get(keyString);
    
    if (shortcut && (!shortcut.enabled || shortcut.enabled())) {
      event.preventDefault();
      shortcut.handler(event);
    }
  }
  
  private eventToKeyString(event: KeyboardEvent): string {
    const parts = [];
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.shiftKey) parts.push('Shift');
    if (event.altKey) parts.push('Alt');
    if (event.metaKey) parts.push('Meta');
    parts.push(event.key);
    return parts.join('+');
  }
}
```

**Default shortcuts to implement**:
- `Delete`: Delete selected node
- `Ctrl+C`: Copy
- `Ctrl+V`: Paste
- `Ctrl+Z`: Undo
- `Ctrl+Y`: Redo
- `Escape`: Deselect all
- `Tab`: Focus next widget
- `Shift+Tab`: Focus previous widget

---

## 3. Rendering Optimization

### Current Architecture Analysis

**Existing**:
- `Renderer.ts`: Three.js scene management
- `LODPlugin.ts`: Level-of-detail based on distance
- `Surface.onPreRender()`: Called every frame with delta time

**Gaps**:
- No bounds-based visibility culling
- No frame timing/performance metrics
- No render queue prioritization

### 3.1 Bounds-based Visibility Culling

**Enhance `Surface` or add to `Node`**:
```typescript
interface VisibilityContext {
  cameraFrustum: THREE.Frustum;
  viewportBounds: Rect;
  minPixelSize: number;
}

class Node {
  isVisible(context: VisibilityContext): boolean {
    // 1. Check visibility flag
    if (!this.visible) return false;
    
    // 2. Check bounds against camera frustum
    const bounds3D = this.bounds3D;
    if (!context.cameraFrustum.intersectsBox(bounds3D.toThreeBox())) {
      return false;
    }
    
    // 3. Check pixel size (like spacegraphj's visP)
    const pixelSize = this.getScreenPixelSize(context);
    if (pixelSize < context.minPixelSize) {
      return false;
    }
    
    return true;
  }
  
  private getScreenPixelSize(context: VisibilityContext): number {
    const bounds = this.bounds;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    const widthPixels = (bounds.width / screenWidth) * 100;
    const heightPixels = (bounds.height / screenHeight) * 100;
    
    return Math.min(widthPixels, heightPixels);
  }
}
```

**Integrate with renderer**:
```typescript
// In Renderer.ts or Node rendering loop
const visibilityContext: VisibilityContext = {
  cameraFrustum: this.computeCameraFrustum(),
  viewportBounds: this.getViewportBounds(),
  minPixelSize: 0.5, // Minimum 0.5% of screen
};

nodes.forEach(node => {
  if (node.isVisible(visibilityContext)) {
    node.render();
  }
});
```

### 3.2 Render Context with Performance Metrics

**Create `RenderContext` class**:
```typescript
interface FrameStats {
  deltaTime: number;
  fps: number;
  nodeCount: number;
  renderedCount: number;
  culledCount: number;
  drawCalls: number;
  triangleCount: number;
}

class RenderContext {
  private stats: FrameStats = {
    deltaTime: 0,
    fps: 60,
    nodeCount: 0,
    renderedCount: 0,
    culledCount: 0,
    drawCalls: 0,
    triangleCount: 0,
  };
  
  private frameCount = 0;
  private lastFpsUpdate = 0;
  
  startFrame(time: number): void {
    this.stats.deltaTime = time - this.lastFpsUpdate;
    this.frameCount++;
    
    // Update FPS every second
    if (time - this.lastFpsUpdate >= 1000) {
      this.stats.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = time;
    }
  }
  
  shouldRender(node: Node): boolean {
    // LOD check
    const lodLevel = this.computeLOD(node);
    if (lodLevel === 'hidden') {
      this.stats.culledCount++;
      return false;
    }
    
    return true;
  }
  
  private computeLOD(node: Node): 'high' | 'medium' | 'low' | 'hidden' {
    const distance = node.position.distanceTo(this.camera.position);
    const pixelSize = node.getScreenPixelSize();
    
    if (pixelSize < 0.5) return 'hidden';
    if (distance < 100) return 'high';
    if (distance < 500) return 'medium';
    return 'low';
  }
}
```

---

## 4. Implementation Priority

### Phase 1: Core Enhancements (High Priority)
These leverage existing architecture and add minimal new code:

1. **Focus Management** (add to `InteractionPlugin` or create `FocusManager`)
   - Focus stack
   - Focus traversal (Tab/Shift+Tab)
   - Focus indicators (CSS class)
   - [ ] Implement `FocusManager` class
   - [ ] Add focus CSS to widgets
   - [ ] Test with existing widgets

2. **Keyboard Shortcuts** (add to `InputManager` or create `ShortcutManager`)
   - Global shortcut registry
   - Default shortcuts (Delete, Ctrl+C/V/Z, Escape)
   - Context-aware (disable when typing in text field)
   - [ ] Implement `ShortcutManager` class
   - [ ] Add default shortcuts
   - [ ] Test with widgets

3. **Text Edit Enhancement** (enhance `HtmlNode`)
   - Add formatting toolbar to editable HtmlNode
   - Markdown preview toggle
   - [ ] Add toolbar component to HtmlNode
   - [ ] Add markdown preview mode
   - [ ] Test with contenteditable

### Phase 2: Widget Additions (High Priority)

4. **Port System** (new `PortNode`)
   - Typed ports (input/output)
   - Visual representation
   - Wiring (SVG overlay or Three.js curves)
   - [ ] Create `PortNode` class
   - [ ] Implement wiring visualization
   - [ ] Add type checking
   - [ ] Test with node connections

5. **Tab Container** (new `TabContainerNode`)
   - Extend `HtmlNode`
   - Tab bar with add/remove/reorder
   - Active pane content
   - [ ] Create `TabContainerNode` class
   - [ ] Implement tab management
   - [ ] Test with nested content

6. **Splitter** (new `SplitterNode`)
   - Extend `HtmlNode`
   - Drag handles
   - Nested splits
   - [ ] Create `SplitterNode` class
   - [ ] Implement drag resizing
   - [ ] Test with nested panels

### Phase 3: Performance (Medium Priority)

7. **Bounds Culling** (enhance `Node` or `Surface`)
   - Frustum culling
   - Pixel-size culling
   - Integrate with renderer
   - [ ] Add `isVisible()` method to Node
   - [ ] Integrate with Renderer
   - [ ] Benchmark performance gain

8. **Render Context** (create `RenderContext`)
   - Frame timing
   - Performance metrics
   - LOD integration
   - [ ] Create `RenderContext` class
   - [ ] Add metrics display (optional)
   - [ ] Test with large graphs

### Phase 4: Additional Widgets (Medium Priority)

9. **Color Picker** (`ColorPickerNode`)
10. **Dropdown** (`DropdownNode`)
11. **Progress Bar** (`ProgressBarNode`)
12. **Meter** (`MeterNode`)

---

## 5. What NOT to Implement (Avoid Duplication)

1. **No separate `WidgetNode` base class** - Node → HtmlNode hierarchy is sufficient
2. **No duplicate event system** - EventEmitter + EventSystem is excellent
3. **No separate rendering pipeline** - Three.js + DOM overlay is optimal
4. **No reimplementation of Monaco** - CodeEditorNode is sufficient for code
5. **No complex physics** - Out of scope
6. **No audio synthesis** - Out of scope

---

## 6. Architecture Decisions

### Decision 1: Widget Base Class
**Use `HtmlNode` as widget base** for DOM-based widgets. It already has:
- Resize handles ✓
- Controls (zoom, delete) ✓
- Content scaling ✓
- Event handling ✓
- Visibility ✓

**Direct `Node` extension** for 3D widgets (like ButtonNode) that don't need DOM.

### Decision 2: Event Propagation
**Add bubbling to existing EventEmitter** rather than creating new event system. Extend `Surface.dispatchEvent()` to support phases.

### Decision 3: Focus Management
**Implement as plugin** (`FocusManagerPlugin`) rather than core feature. Allows opt-in and easy testing.

### Decision 4: Port Wiring
**Use SVG overlay** (not Three.js curves) for port connections. Simpler, cleaner, and works with DOM-based widgets.

---

## 7. Testing Strategy

For each widget:
- [ ] Unit test: Widget logic (state changes, events)
- [ ] Integration test: Widget with graph
- [ ] Visual test: Screenshot comparison
- [ ] Accessibility test: Keyboard navigation, ARIA labels
- [ ] Performance test: Render time with 100+ instances

---

## 8. Migration from Prior Versions

### From spacegraph1:
- ✅ Model-View pattern → Already in Node structure
- ✅ Button/Slider patterns → Already have equivalents
- ⚠️ 3D text → Consider Three.js TextGeometry if needed

### From spacegraphc:
- ❌ Minimal widget relevance (physics/neural focus)

### From spacegraphj:
- ✅ Surface hierarchy → Already in Surface.ts
- ⚠️ Port system → Implement as `PortNode`
- ⚠️ Widget lifecycle → Add to HtmlNode
- ✅ Visibility culling → Implement in Phase 3

---

## 9. Success Metrics

A gap is closed when:
1. ✅ Widget works with existing Node API
2. ✅ Widget participates in focus system
3. ✅ Widget responds to keyboard shortcuts
4. ✅ Widget has proper event emission
5. ✅ Widget has basic styling
6. ✅ Widget has unit tests
7. ✅ Widget integrates with HtmlNode (where applicable)
8. ✅ No performance degradation (< 5ms per widget)

---

## 10. Open Questions

1. **Port wiring visualization**: SVG overlay vs Three.js curves?
   - **Decision**: SVG overlay for DOM widgets, Three.js for 3D nodes

2. **Focus indicator**: CSS border or Three.js highlight?
   - **Decision**: CSS border for HtmlNode widgets, Three.js highlight for 3D nodes

3. **Widget theming**: CSS variables or JS-based themes?
   - **Decision**: CSS variables (leverages existing HtmlNode styling)

4. **Performance budget**: What's acceptable?
   - **Target**: 60 FPS with 1000+ nodes, < 16ms frame time

---

**Last Updated**: 2026-04-27 (Revised)  
**Status**: Refined plan - ready for implementation  
**Next Step**: Begin Phase 1 - Focus Management
