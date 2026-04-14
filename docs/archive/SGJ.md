# SpaceGraphJ — UI System Analysis

## Overview

SpaceGraphJ is a Java-based 2D UI framework built on **JOGL** (Java OpenGL via JogAmp/NEWT). It implements a hierarchical, zoomable, pan-able surface graph with a gestural input abstraction, lazy layout, and a widget library. The project has three modules: `ui/` (the UI framework), `phy2d/` (2D physics, excluded), and `phy3d/` (3D physics, excluded).

```
spacegraphj/
  ui/src/main/java/spacegraph/
    SpaceGraph.java              — entry point, static window factory
    UI.java                      — global config (FPS, etc.)
    video/                       — OpenGL rendering pipeline
    layer/                       — top-level render stages
    space2d/                     — core surface hierarchy
      Surface.java               — base UI element
      ReSurface.java             — rendering context / camera
      container/                 — layout containers
      widget/                    — UI widgets
      hud/                       — HUD overlays (Zoomed, Hover)
    input/
      finger/                    — gestural input abstraction
      key/                       — keyboard handling
```

---

## 1. Entry Point & Window Bootstrap

**`SpaceGraph`** (`SpaceGraph.java:35-60`)

Static factory for creating windows. Two overloads:

```java
// Generic: wraps any object in ObjectSurface or delegates
public static AbstractLayer window(Object o, int w, int h)

// Surface → creates JoglWindow + WindowControlLayer + OrthoSurfaceGraph(Zoomed(s))
public static OrthoSurfaceGraph window(Surface s, int w, int h)
```

The standard bootstrap path: `SpaceGraph.window(surface, w, h)` → `JoglWindow` → `OrthoSurfaceGraph` wrapping content in a `Zoomed` container for pan/zoom.

**`JoglWindow`** (`video/JoglWindow.java:34-444`)

OpenGL window manager implementing `GLEventListener` and `WindowListener`:

- Creates `GLWindow` with stencil bits (1) and multisampling (2 samples)
- `MyAnimator` custom loop with `ThreadTimer` for precise frame timing
- **Render loop** (`display()`, line 238): drains deferred runnables → checks `changed` flag → `redisplay()` which iterates layers calling `l.render(nowNS, dtS, gl)` → swaps buffers
- **FPS management**: full FPS when focused, reduced by `renderFPSUnfocusedRate` (0.5x) when unfocused (`windowGainedFocus`/`windowLostFocus`, lines 192-199)
- **Layer management**: `add(Layer)` initializes with GL context; layers rendered in order each frame
- **Async coordination**: `runLater(Runnable)` queues work via `MpscUnboundedArrayQueue`, drained each frame before render (line 242)
- Position/size changes are atomic-flagged and applied in `updateWindow()` before display (lines 115-125)

---

## 2. Rendering Pipeline

### 2.1 Layer Architecture

**`Layer`** (`layer/Layer.java:7-16`) — sealed interface, top-level render stage:

```java
void init(GL2 gl);
void render(long startNS, float dtS, GL2 gl);
void visible(boolean b);
boolean changed();  // whether re-render needed
```

**`AbstractLayer`** permits the sealed hierarchy. **`OrthoSurfaceGraph`** (`layer/OrthoSurfaceGraph.java:24-183`) is the primary 2D layer:

- Holds a `ReSurface rendering` context and a `Stacking root` as the top-level container
- Creates `NewtKeyboard` and `NewtMouseFinger`, attaches to window
- `renderOrthos()` (line 108): calls `rendering.render(root, window, startNS, dtS)`
- On resize: `root.resize(window.W(), window.H())`
- `dev()` method spawns a debug window showing finger state

### 2.2 Rendering Context

**`ReSurface`** (`space2d/ReSurface.java:17-216`) — the surface rendering context managing camera/view transform:

- `frameDT` — time since last frame in seconds
- `gl` — current GL2 context
- `psw`/`psh` — pixel-to-surface scale factors
- **Render entry point** (`render()`, lines 206-214):
    ```java
    public final void render(Surface root, JoglWindow w, long startNS, float dtS) {
        setupRenderContext(w, root);  // viewport + ortho projection
        start(w.W(), w.H(), startNS, dtS, w.renderFPS, w.gl);
        try { root.renderIfVisible(this); } finally { end(); }
    }
    ```
- **Visibility culling**: `isVisible(RectF)` checks camera bounds intersection; `isVisiblePixels()` checks minimum pixel visibility threshold
- **Camera stack**: `push(Zoomed.Camera, v2)` / `pop()` for nested coordinate spaces

### 2.3 Drawing Primitives

**`Draw`** (`video/Draw.java:47-934`) — comprehensive OpenGL 2D drawing utility with static methods:

| Primitive         | Methods                                                |
| ----------------- | ------------------------------------------------------ |
| Lines             | `linf()`, `lini()`, `lind()`                           |
| Triangles         | `trif()`, `trid()`                                     |
| Quads             | `quaf()`, `quai()`                                     |
| Rectangles        | `rect()`, `rectStroke()`, `rectFrame()`, `rectCross()` |
| Circles           | `circle()` with configurable point count               |
| Polygons          | `poly()` — regular polygons                            |
| Textured          | `rectTex()`                                            |
| Stencil clipping  | `stencilMask()`                                        |
| Transform helpers | `bounds()`, `push()`, `pop()`                          |

Color utilities: `hsl()`, `hsb()`, `colorHash()`, `colorBipolar()`, `colorUnipolarHue()`.

### 2.4 Shader & Font Support

**`GLSL`** (`video/GLSL.java:23-220`) — loads shader source from `glsl/` resources (`16seg.glsl`, `bitmapfont.glsl`, `metablob.glsl`, `grid.glsl`).

Font rendering in `video/font/`:

- `BmpFont` — bitmap font with texture atlas
- `BitFont` — bitmapped character font
- `Font8x8` — fixed 8x8 character font
- `HersheyFont` — vector-based Hershey stroke fonts
- `MultiColorText` — multi-colored text rendering

---

## 3. Surface Hierarchy

### 3.1 Core Abstractions

**`Surface`** (`space2d/Surface.java:28-393`) — the fundamental UI element:

- `bounds` — `RectF` position and size in parent coordinates (volatile, line 48)
- `parent` — parent `Surfacelike` (volatile, line 49)
- `visible` — visibility flag (line 51)
- `id` — unique serial identifier (line 39)
- `clipBounds` — whether content outside bounds is clipped (line 46)

Key methods:

- `pos(RectF)` — set position/size, uses `VarHandle` for atomic updates (lines 128-137)
- `render(ReSurface)` — abstract render implementation (line 266)
- `renderIfVisible(ReSurface)` — visibility-checked render (lines 258-263)
- `visible(ReSurface)` — visibility test considering camera bounds and minimum pixel size (lines 271-277)
- `start(Surfacelike)` / `stop()` — lifecycle management (lines 201-222)
- `delete()` — detach from parent, recursively delete children (lines 310-331)
- `finger(Finger)` — hit testing, returns touched sub-surface (line 60)
- `focus()` — request keyboard focus via root (lines 97-108)
- `parentOrSelf(Class)` / `parent(Predicate)` — tree navigation (lines 180-199)

Uses `VarHandle` for lock-free atomic field updates (`BOUNDS`, `PARENT`).

**`Surfacelike`** (`space2d/Surfacelike.java:7-12`) — minimal interface: `root()` → find root `SurfaceGraph`.

### 3.2 Container Surfaces (Layout Nodes)

**`ContainerSurface`** (`space2d/container/ContainerSurface.java:25-221`) — abstract branch node with lazy asynchronous layout:

```java
protected final void render(ReSurface r) {
    if (!canRender(r)) return;
    if (MUSTLAYOUT.compareAndSet(this, 1, 0)) {
        ensureChildrenStarted();
        doLayout(r.frameDT);
    }
    paintIt(r.gl, r);
    renderContent(r);
}
```

- Layout is triggered via `layout()` which sets `mustLayout` flag via `VarHandle` (line 199-201)
- **Hit testing** (lines 129-139): iterates children in reverse (top-to-bottom z-order), returns first hit via `FingerFirst` predicate that short-circuits traversal
- Abstract methods: `doLayout(float dtS)`, `childrenCount()`, `forEach()`, `whileEach()`, `whileEachReverse()`

**Collection containers** in `space2d/container/collection/`:

- `MutableContainer` — abstract base with `add()`/`remove()`/`clear()`
- `MutableArrayContainer` — fixed-size array-backed
- `MutableListContainer` — dynamic list-backed
- `MutableMapContainer` — map-backed (used by `ScrollXY` for virtualized cells)

### 3.3 Layout Containers

| Container           | File                                  | Purpose                                                                                                                                               |
| ------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`Stacking`**      | `container/Stacking.java:7-19`        | Overlays all children at full bounds (z-order stack)                                                                                                  |
| **`Gridding`**      | `container/grid/Gridding.java:22-231` | Auto-sizing grid/row/column layout with aspect ratio optimization (golden ratio default), waste-minimizing cell count calculation                     |
| **`Bordering`**     | `container/Bordering.java:12-243`     | 9-region subdivision (C, N, S, E, W, NE, NW, SW, SE) with configurable border sizes and autocollapse                                                  |
| **`Splitting`**     | `container/Splitting.java:21-278`     | Two-panel split (vertical or horizontal) with draggable resize bar, direction toggle, and swap button                                                 |
| **`Switching`**     | `container/Switching.java:10-108`     | Single-child state machine; switches between `Supplier<Surface>` states                                                                               |
| **`ScrollXY`**      | `container/ScrollXY.java:32-624`      | Virtual viewport with X/Y scroll bars, scale slider, and virtualized `DynGrid` for infinite scrollable grids using `MutableMapContainer` cell caching |
| **`RingContainer`** | `container/RingContainer.java`        | Circular arrangement                                                                                                                                  |
| **`Springing`**     | `container/Springing.java`            | Physics-based layout                                                                                                                                  |

**Unit containers** in `container/unit/`:

- `MutableUnitContainer<S>` — single-child container with atomic `AtomicReference<Surface>` swap, auto-deletes previous child
- `AbstractUnitContainer` — base class
- `Clipped` — clips content to bounds
- `Scale` — scales child by factor
- `AspectAlign` — alignment within aspect ratio
- `Animating` — animated content wrapper

### 3.4 Graph/Node Visualization

In `container/graph/`:

- `Graph2D` — graph data structure
- `GraphEdit2D` — editable graph with physics-based layout
- `NodeVis` / `EdgeVis` — visual representations
- `Link` — graph edge
- `NodeGraphRenderer` — renders the graph

Layout algorithms in `container/layout/`: `Force2D`, `ForceAtlas2D`, `FruchtermanReingold2D`, `FastOrganicLayout`, `SemiForce2D`, `EfficientForce2D`, `DynamicLayout2D`, `TreeMap2D`.

---

## 4. Input Handling

### 4.1 Finger Abstraction

The input system uses a **"Finger"** abstraction — a gestural generalization of mouse/touch/keyboard that tracks position, buttons, and state transitions.

**`Finger`** (`input/finger/Finger.java:38-511`) — abstract base for all input pointers:

Key properties:

- `posPixel` / `posScreen` / `posGlobal` — cursor position in pixel, screen, and world coordinates
- `buttonDown` / `prevButtonDown` — current and previous button state bitsets
- `fingering` — current exclusive interaction state (`Fingering`)
- `touching` — the `Surface` currently under the finger
- `focused` — whether the finger is inside the window

Key methods:

- `pressed(int)` / `released(int)` — query button state
- `pressedNow(int)` / `releasedNow(int)` — detect edge transitions
- `clickedNow(int)` — detect click (release without drag)
- `test(Fingering)` — attempt to acquire an exclusive fingering state
- `intersects(RectF)` — test if finger position is within bounds
- `push(SurfaceTransform, Function)` — transform coordinate space for nested surfaces

**`Fingering`** (`input/finger/Fingering.java:13-83`) — exclusive finger control state. A surface activates a `Fingering` to capture input:

```java
boolean start(Finger);   // return true to begin
boolean update(Finger);  // return false to finish
void stop(Finger);       // cleanup
boolean defer(Finger);   // whether to allow state transition
Surface touchNext(Surface, Surface); // filter what surface is touched next
FingerRenderer cursor(); // optional cursor renderer override
```

`Idle` is the default no-op state.

### 4.2 Interaction States

All in `input/finger/state/`:

| State                                                | File                         | Purpose                                                                                                                          |
| ---------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **`Dragging`**                                       | `Dragging.java:6-58`         | Base class for drag interactions, tied to a specific button. Lifecycle: `start()` → `update()` while active & pressed → `stop()` |
| **`FingerMove`**                                     | `FingerMove.java:6-72`       | Abstract move with axis locking and speed control                                                                                |
| **`FingerMoveWindow`**                               | `FingerMoveWindow.java:8-38` | Move using screen pixel coordinates                                                                                              |
| **`FingerMoveSurface`**                              | `FingerMoveSurface.java`     | Move within surface coordinates                                                                                                  |
| **`FingerResize`**                                   | `FingerResize.java:10-175`   | Resize with drag modes (N, S, E, W, NE, NW, SE, SW)                                                                              |
| **`FingerResizeWindow`** / **`FingerResizeSurface`** | respective files             | Window/surface coordinate resize                                                                                                 |
| **`SurfaceDragging`**                                | `SurfaceDragging.java:7-25`  | Dragging locked to a specific surface's bounds                                                                                   |
| **`Clicking`**                                       | `Clicking.java:11-69`        | Click detection with armed/hover/idle callbacks                                                                                  |
| **`DoubleClicking`**                                 | `DoubleClicking.java`        | Double-click detection                                                                                                           |

### 4.3 Input Implementations

**`NewtMouseFinger`** (`input/finger/impl/NewtMouseFinger.java:17-190`) — concrete mouse input using JOGL NEWT:

- Implements `MouseListener` and `WindowListener`
- `mousePressed`/`mouseReleased` — update button states
- `mouseMoved`/`mouseDragged` — update position, trigger async finger processing
- `mouseWheelMoved` — adds rotation for zoom
- Y-flip on position: `posPixel.set(px, win.H() - py)` (line 56)
- Supports both synchronous (render-loop) and asynchronous (event-driven) processing

**`NewtKeyboard`** (`input/finger/impl/NewtKeyboard.java:22-164`) — keyboard input:

- `keyFocus` — atomic reference to focused `Surface`
- `setKey()` — dispatches to focused element or global handlers
- `focusTraverse()` — arrow-key navigation using directional search
- `focus(Surface)` — set keyboard focus, calls `keyStart()`/`keyEnd()`

### 4.4 Keyboard Interface

**`KeyPressed`** (`input/key/KeyPressed.java:7-36`) — interface for surfaces reacting to keyboard:

```java
void keyStart();                        // called when focus acquired
void keyEnd();                          // called when focus lost
boolean key(KeyEvent, pressedOrReleased); // returns true if event absorbed
```

**`WindowKeyControls`** (`input/key/WindowKeyControls.java:9-49`) — standard window hotkeys: F1 (help), F2 (decoration toggle), F3 (fullscreen), F4/F5 (FPS control).

### 4.5 Cursor Rendering

**`FingerRenderer`** (`input/finger/FingerRenderer.java:12-187`) — `@FunctionalInterface` for cursor rendering:

- `rendererCrossHairs1` — hexagonal crosshair with speed-adaptive size
- `PolygonCrosshairs` — animated polygon with color based on button state
- `rendererResizeNS` / `rendererResizeEW` — resize cursors

---

## 5. HUD Overlays

### 5.1 Zoomed (Pan/Zoom Camera)

**`Zoomed<S extends Surface>`** (`space2d/hud/Zoomed.java:39-542`) — manages a moveable and zoomable view camera:

- `cam` — `Camera` extends `v3Anim` (animated v3: x, y, z where z = zoom depth)
- `scale` — current view area in absolute world coords
- **Pan**: middle mouse button (`PAN_BUTTON = 2`) via `FingerMoveWindow`
- **Zoom**: middle mouse drag via custom `Dragging` state, or mouse wheel (`wheelZoomRate = 0.6f`)
- **Click-to-zoom**: left-click on a surface zooms to its bounds
- **Zoom stack**: `Deque<Surface>` (max 8) for nested zoom levels; Page Up zooms out, arrow keys navigate to adjacent surfaces
- **Coordinate transform**: `push(cam, f -> { ... })` transforms finger coordinates into zoomed space
- **Camera animation**: `v3Anim` with `CAM_RATE = 3.0f`, speed adapts to viewport size
- **Bounds clamping**: `camX`/`camY` clamped to visible region

### 5.2 Hover (Tooltips)

**`Hover<X, Y>`** (`space2d/hud/Hover.java:16-140`) — transient overlay (tooltips):

- `HoverModel` — computes position relative to cursor, sized relative to element
- Lifecycle: `start()` → `update()` while finger hovers on source → `stop()` deletes target
- Target is built lazily via `Function<X, Y> targetBuilder`
- Added to root `Stacking` via `WeakContainer` that self-deletes when target is null
- `MyCursorModel` (in `Widget.java:224-242`) — pulse-animated, size-adaptive tooltip positioning

---

## 6. Widget Library

### 6.1 Widget Base

**`Widget`** (`space2d/widget/Widget.java:26-244`) — base class for GUI widgets, extends `MutableUnitContainer<Surface>`, implements `KeyPressed`:

- `color` — `Color4f` with default random HSL tint (line 37-39)
- `dz` — z-raise/depth state (0 = neutral, positive = pushed, negative = raised)
- `pri` — activity level (positive = active/hot, zero = neutral, negative = disabled); decays exponentially each frame
- `focused` — keyboard focus state
- `tooltip(String)` — creates `Hover` with `VectorLabel`
- `paintWidget()` — default background rendering using `color.glPlus(bri, ...)`
- `finger()` — hit testing, triggers focus on press, shows tooltip via `f.test(hover)`
- `key()` — handles TAB (TODO), Space/Enter for buttons

### 6.2 Buttons

**`AbstractButton`** (`space2d/widget/button/AbstractButton.java:20-134`):

- Uses `Clicking` fingering state for click detection
- `dz` animation: armed → 0.5f, hover → 0.0f, released → 0.0f
- `enabled()` via `AtomicBoolean`
- Keyboard activation: Space or Enter
- `text(String)` — creates `BitmapLabel` (< 32 chars) or `VectorLabel` (longer)
- `icon(String)` — sets `ImageTexture` view

Concrete buttons: `PushButton`, `ToggleButton`, `CheckBox`, `HexButton`, `IconToggleButton`, `ColorToggle`, `EnumSwitch`, `MapSwitch`, `ButtonSet`, `Submitter`, `OnScreenKeyboard`, `MatrixPad`.

### 6.3 Sliders

**`FloatSlider`** (`space2d/widget/slider/FloatSlider.java:34-262`):

- Composed of `SliderModel` (the interactive track) + `SliderLabel` (name + value display)
- `SliderModel` — abstract base with `KnobHoriz`/`KnobVert` UI styles
- Binds to `FloatRange`, `DoubleRange`, `UnitPri`, `MutableFloat`, or custom `FloatSliderModel`
- `on(FloatProcedure)` / `on(ObjectFloatProcedure<SliderModel>)` — change callbacks
- `canRender()` polls external input source each frame to sync value

Other sliders: `IntSlider`, `XYSlider` (2D pad), `IntSpinner`, `FloatGuage`.

### 6.4 Ports & Wiring (Visual Programming)

**`Port<X>`** (`space2d/widget/port/Port.java:27-330`) — typed data port for visual programming graphs:

- `In<? super X>` — input handler callback
- `out(X)` — sends value to all connected ports via `Wire`
- `outLazy(Supplier<X>)` — lazy evaluation, only if active
- Wiring interaction: `Wiring` fingering state (button 2 = middle mouse)
- `beingWiredOut` / `beingWiredIn` — visual feedback during drag-wiring (green/blue tint)
- Auto-registers with parent `GraphEdit2D` on `starting()`
- Error handling: catches exceptions in `recv()`, reports to `SurfaceGraph.error()`

**`Wire`** (`space2d/widget/port/Wire.java:12-156`) — undirected edge between two surfaces:

- Canonical ordering by `Surface.id` (a < b)
- `send()` — delivers value to receiver, tracks activity timestamp and type hash
- `activity(now, window)` — decay-based activity level for visual feedback
- `RunThese offs` — subscription handles for cleanup

Port types: `BoolPort`, `IntPort`, `FloatPort`, `TextPort`, `TogglePort`, `IntRangePort`, `FloatRangePort`, `TypedPort`, `EnabledPort`, `EditablePort`, `ConstantPort`, `CopyPort`, `LabeledPort`, `OutPort`, `ImageChip`, `PortVector`, `Surplier`.

### 6.5 Windows (Draggable Panels)

**`Windo`** (`space2d/widget/windo/Windo.java:28-246`) — draggable, resizable panel:

- `FingerMoveSurface` for move, `FingerResizeSurface` for resize
- `DragEdit.mode()` determines resize direction from relative position (N/S/E/W/NE/NW/SE/SW)
- Visual resize indicator drawn in `postpaint()` with colored quad
- `fixed(boolean)` — locks position
- `posRel()` — positions relative to parent `GraphEdit2D`

### 6.6 Menus

**`Menu`** (`space2d/widget/menu/Menu.java:12-43`) — abstract menu with `Map<String, Supplier<Surface>>` and pluggable `MenuView`:

- `ListMenu` — list-based menu
- `TabMenu` — tabbed menu
- Views: `GridMenuView`, `WallMenuView`

### 6.7 Text & Labels

- `AbstractLabel` — base label
- `BitmapLabel` — bitmap font label
- `VectorLabel` — vector font label
- `SegmentLabel` — segmented display
- `LabelRenderer` / `TextRenderer` — rendering utilities
- `BitmapTextGrid` / `BufferedBitmapTextGrid` / `VectorTextGrid` — text grids

### 6.8 Meters & Plots

- `Plot2D` — 2D plot base
- `ScatterPlot2D` — scatter plot
- `WavePlot` — waveform display
- `Spectrogram` — frequency spectrogram
- `MatrixView` / `ImmediateMatrixView` / `BitmapMatrixView` — matrix visualization
- `BagChart` — bag/multiset chart
- `ChernoffFace` / `ChernoffFace1` / `HumanoidFacePanel` — Chernoff face visualization

### 6.9 Chips (Composite Widgets)

Pre-built composite widgets: `WebcamChip`, `WaveViewChip`, `SwitchChip`, `StringSynthChip`, `SpectrogramChip`, `SpeakChip`, `ReplChip`, `PulseChip`, `PlotChip`, `NoiseVectorChip`.

### 6.10 Console & Adapters

- `AbstractConsoleSurface` / `TextGraph` — text console
- Adapters: `AWTSurface`, `HTMLSurface`, `CSSBoxHTMLSurface`, `RDPSurface`, `SSHSurface` — embed external surfaces

---

## 7. Key Design Patterns

### 7.1 Lazy Layout

Layout is deferred via `VarHandle`-based `mustLayout` flag. Set by `layout()` → checked with CAS in `render()` → `doLayout(dtS)` runs once per frame max. Position changes auto-trigger layout in `ContainerSurface.pos()`.

### 7.2 Exclusive Input State (Fingering)

`Finger.test(Fingering)` implements a state machine where only one `Fingering` is active at a time. States have `start()`/`update()`/`stop()` lifecycle. `defer()` controls whether a state yields to another.

### 7.3 Coordinate Space Transforms

`Finger.push(SurfaceTransform, Function)` and `ReSurface.push(Camera, v2)` manage nested coordinate spaces. `Zoomed` uses this to transform finger input into zoomed/panned space.

### 7.4 Virtualized Rendering

`ScrollXY.DynGrid` uses `MutableMapContainer` with cell IDs encoded as `(short)x << 16 | (short)y`. Only visible cells are rendered; off-screen cells are removed via `map.removeIf()`. Model provides `GridModel<S>` and `GridRenderer<S>` for cell creation.

### 7.5 Activity-Based Visual Feedback

`Widget.pri` decays exponentially; `Wire.activity(now, window)` uses `1/(1 + dt/window)` decay. Both drive visual intensity (color brightness, glow effects).

### 7.6 Atomic State Management

Heavy use of `VarHandle` for lock-free field updates (`Surface.bounds`, `Surface.parent`, `ContainerSurface.mustLayout`, `ContainerSurface.showing`). `AtomicReference` for `MutableUnitContainer.the`, `AtomicBoolean` for flags.

### 7.7 Event Topics

`JoglWindow.onUpdate` is a `Topic<JoglWindow>` — observers subscribe via `onUpdate(Consumer)` / `onUpdate(Runnable)` / `onUpdate(Animated)`. Returns `Off` handle for unsubscription.
