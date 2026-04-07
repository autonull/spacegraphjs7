# SpaceGraphC — Input, Rendering & Widget Architecture Analysis

## Overview

SpaceGraphC (SGC) is a C++ application built on **Bullet Physics** + **OpenGL** (via GLUT/SDL), with a dual-layer widget system: 2D overlay panels and 3D physics-backed widgets. The control scheme follows a **Maya-style orbital camera** with physics object picking via constraints.

---

## Architecture Layers

```
GLWindow (SDL or GLUT entry point)
  └── SpaceProcess          — base input/render loop, camera state
        └── AbstractSpace   — modifier keys, swap buffers
              └── DefaultSpace — physics world, 2D/3D widget hosting
                    ├── bodies[]          — AbstractBody subclasses (3D)
                    └── faceContainer     — Container (2D overlay)
```

### Two Rendering Backends

| Backend  | Entry               | Event Loop             | Used By          |
| -------- | ------------------- | ---------------------- | ---------------- |
| **SDL**  | `GLWindow::start()` | Manual `SDL_PollEvent` | Legacy           |
| **GLUT** | `runGLWindow()`     | `glutMainLoop()`       | All active demos |

The GLUT path is the primary one. It registers static C callbacks that fan out to all registered `SpaceProcess` instances.

---

## Mouse Controls

### Button Mapping (GLUT)

| Button     | GLUT Constant | Function                           |
| ---------- | ------------- | ---------------------------------- |
| **Left**   | `0`           | Pick & drag physics bodies         |
| **Middle** | `2`           | Orbit camera (azimuth + elevation) |
| **Right**  | `1`           | Zoom camera (distance)             |
| **Scroll** | `3`/`4`       | Unused in SGC                      |

### Mouse State Tracking

```cpp
// SpaceProcess.h
int m_mouseButtons;       // bitmask: 1 << button
int m_modifierKeys;       // BT_ACTIVE_ALT | BT_ACTIVE_CTRL | BT_ACTIVE_SHIFT
int pointerPixelX, pointerPixelY;  // last known cursor
```

Buttons are tracked as a bitmask (`m_mouseButtons |= 1 << button` on press, cleared on release). Modifiers are resolved each event via `glutGetModifiers()`.

### Left Button — Object Picking (`SpaceProcess::onMouseButton`, case 0)

**On press (state==0):**

1. Build ray from camera through cursor: `getRayTo(x, y)`
2. `dynamicsWorld->rayTest(rayFrom, rayTo, rayCallback)`
3. If hit a non-static/non-kinematic `btRigidBody`:
    - Check `AbstractBody::isDraggable(&touchPosLocal)` — widgets can veto
    - Create `btPoint2PointConstraint` at hit point in body-local space
    - Set `m_impulseClamp = 30.f` (limits constraint force)
    - Set `m_tau = 0.1f` (very soft — gives "springy" feel)
    - Store `gOldPickingDist` for distance-preserving drag

**On release (state==1):**

- Remove constraint from world, delete it
- Reactivate body: `forceActivationState(ACTIVE_TAG)`

**On drag (`onMouseMove` with `m_pickConstraint`):**

- Compute new ray endpoint at cursor
- In perspective mode: `newPivotB = rayFrom + dir * gOldPickingDist` — **preserves picking distance** so objects don't slide toward/away from camera
- In ortho mode: direct X/Y assignment

### Middle Button — Camera Orbit (button value `4` in bitmask)

```cpp
if (m_mouseButtons & 4) {
    m_azi += dx * 0.2;          // azimuth: horizontal drag → yaw
    m_azi = fmodf(m_azi, 360.f);
    m_ele += dy * 0.2;          // elevation: vertical drag → pitch
    m_ele = fmodf(m_ele, 180.f);
}
```

Sensitivity: **0.2 degrees per pixel**. Wraps at 360°/180°.

### Right Button — Camera Zoom (button value `2` in bitmask)

```cpp
if (m_mouseButtons & 2) {
    camDistNext -= dy * 0.2f;   // vertical drag → zoom
    if (camDistNext < 0.1) camDistNext = 0.1;
}
```

Sensitivity: **0.2 world units per pixel**. Minimum distance: 0.1.

### Right Button Release — Zoom to Object

In `DefaultSpace::onMouseButton`:

```cpp
if (button == 2 && state == 1 && touchedBody != NULL) {
    camTargetNext = touchedBody->getWorldTransform().getOrigin();
    touchedBody->getCollisionShape()->getBoundingSphere(center, radius);
    camDistNext = radius * 1.3;
}
```

Snaps camera target to the hovered body's center, distance set to 1.3× bounding sphere radius.

### Alt Key Guard

```cpp
if ((m_modifierKeys & BT_ACTIVE_ALT) && (state == 0)) {
    return;  // suppresses camera movement when Alt is held
}
```

Alt is reserved for Maya-style manipulator modes (placeholder in SGC).

---

## Keyboard Controls

### DefaultSpace Overrides

| Key | Action              |
| --- | ------------------- |
| `l` | Step camera left    |
| `r` | Step camera right   |
| `f` | Step camera forward |
| `b` | Step camera back    |
| `z` | Zoom in             |
| `x` | Zoom out            |

### SpaceProcess Base

| Key     | Action                          |
| ------- | ------------------------------- |
| `q`     | Quit                            |
| `i`     | Toggle idle (pause simulation)  |
| `o`     | Toggle orthographic/perspective |
| `w`     | Toggle wireframe debug draw     |
| `h`     | Toggle help text                |
| `p`     | Toggle profile timings          |
| `t`     | Toggle debug text               |
| `g`     | Toggle shadows                  |
| `u`     | Toggle texturing                |
| `d`     | Toggle deactivation             |
| `C`     | Draw constraints                |
| `L`     | Draw constraint limits          |
| `a`     | Draw AABBs                      |
| `c`     | Draw contact points             |
| `1`     | Toggle CCD                      |
| `.`     | Shoot box at cursor             |
| `+`/`-` | Adjust shoot speed              |
| `Space` | Reset scene                     |

### Arrow Keys (AbstractSpace::specialKeyboard)

| Key         | Action      |
| ----------- | ----------- |
| `←`         | Step left   |
| `→`         | Step right  |
| `↑`         | Step front  |
| `↓`         | Step back   |
| `Page Up`   | Zoom in     |
| `Page Down` | Zoom out    |
| `Home`      | Toggle idle |

---

## Camera System

### Orbital Camera Parameters

```cpp
float camDist;           // distance from target
float camDistNext;       // target distance (for interpolation)
float m_ele;             // elevation angle (degrees)
float m_azi;             // azimuth angle (degrees)
btVector3 camTarget;     // look-at point
btVector3 camTargetNext; // target look-at (for interpolation)
btVector3 camUp;         // up vector (default: 0,1,0)
int m_forwardAxis;       // which axis is "forward" (default: 2 = -Z)
double cameraSpeed;      // interpolation speed (default: 2.5)
```

### Update Pipeline (`updateCamera`)

1. **Interpolate** (when dt > 0):
    ```cpp
    camTarget = (1 - dcameraSpeed) * camTarget + dcameraSpeed * camTargetNext;
    camDist   = (1 - dcameraSpeed) * camDist   + dcameraSpeed * camDistNext;
    ```
2. **Build rotation** from azimuth (around `camUp`) and elevation (around computed right vector)
3. **Compute eye position**: rotated offset + target
4. **Set projection**: `glFrustum` (perspective) or `glOrtho` (orthographic)
5. **Set view**: `gluLookAt(camPos, camTarget, camUp)`

### Ray Casting (`getRayTo`)

Converts 2D screen coordinates to a 3D world-space ray endpoint:

- **Perspective**: builds frustum, computes horizontal/vertical vectors at far plane, interpolates
- **Orthographic**: linear interpolation between frustum bounds at Z = camTarget.z

Used for: object picking, pointer hover detection, shooting boxes.

---

## Widget Hierarchy

### 2D Widget System (`widget2d/`)

```
Widget (base)
  ├── position (relative), absPosition (screen), size
  ├── active, isMovable, isTouchable, isContainer, isTransparant
  ├── virtual onMouseMove(x, y) → bool
  └── virtual onMouseButton(button, state, x, y) → bool

Container : Widget
  ├── map<string, Widget*> children
  ├── addPanel(name, widget)
  ├── addText(name, x, y, text)
  ├── mouseOverChild(**foundWidget, x, y) — recursive hit test
  └── Event propagation: iterates all children, returns true if any handled

Panel : Container
  ├── draggable: left-click sets `dragging = true`, move updates position
  ├── bgColor[4] (default: 0.1, 0.1, 0.1, 0.75)
  ├── drawBackground() — translucent quad
  └── drawBorders() — white outline

Button : Panel
  ├── ButtonModel (onChange callback with state: 0=released, 1=pressed)
  ├── onPressed() / onReleased()
  └── Default size: 60×40

HSlider : Panel
  ├── SliderModel (onChange callback)
  ├── val pointer, min, max
  ├── sliding state
  ├── knob color: R = 0.5 + 0.5*(1-pct), G = 0.5 + 0.5*pct, B = 0.5
  └── updateSlide(x, y) → updatePercent → updateValue → model.onChange()

VSlider : HSlider — vertical variant
```

**Event propagation pattern:** `Container::onMouseButton` iterates all children, calls each, returns `true` if any child handled it. This enables **bubbling** — parent panels can intercept or pass through.

### 3D Widget System (`widget3d/`)

```
PanelBox : BoxBody (physics body)
  ├── btQuaternion* facingNormal — auto-orient toward viewer
  ├── float speed — slerp speed for orientation
  ├── preDraw() — slerp rotation toward facingNormal, lerp Z toward ground
  └── front() — returns list of Rect children drawn on the front face

ButtonBox : PanelBox
  ├── pressed / lastPressed state
  ├── onTouch(touchPosWorld, touchPosLocal, button)
  ├── onUntouched()
  ├── onClicked() — fires on press→release transition
  ├── isDraggable(touchPosLocal) → false (prevents physics pick)
  └── updateButton() — color change on press

XYSlider : PanelBox
  ├── touchPos (local coordinates)
  ├── onTouch() — records touchPos, calls updateSlider()
  ├── isDraggable() → false
  └── Rect knob follows normalized touch position

XSlider : XYSlider — horizontal only (knob spans full Y)
YSlider : XYSlider — vertical only (knob spans full X)

Rect — simple colored quad (pos, size, fillColor)
TextRect : Rect — adds text string
```

### 3D Widget Interaction Flow

1. **`updatePointer()`** runs every frame after swap:
    - Raycasts from camera through `pointerPixelX/Y`
    - Finds closest `btRigidBody` hit
    - Looks up owning `AbstractBody` by shape match
    - Calls `AbstractBody::onTouch(worldPos, localPos, buttonState)`
    - Calls `AbstractBody::onUntouched()` when focus leaves

2. **Draggable check** in `DefaultSpace::onMouseButton`:
    ```cpp
    bool draggable = true;
    if (touchedAbstractBody != NULL)
        draggable = touchedAbstractBody->isDraggable(&touchPosLocal);
    if (draggable) { /* create pick constraint */ }
    ```
    Widgets like `ButtonBox` and `XYSlider` override `isDraggable()` → `false` to prevent physics picking and handle touch themselves.

---

## Rendering Pipeline

### Main Loop (`DefaultSpace::clientMoveAndDisplay`)

```
1. glClear(COLOR | DEPTH)
2. dynamicsWorld->stepSimulation(deltaTime)
3. preDraw() — setup lights (GL_LIGHT0, GL_LIGHT1), shade model, clear color
4. updateCamera(dt) — set projection + view matrices
5. renderscene(pass) — draw 3D bodies:
   pass 0: main shapes with color
   pass 1: shadow volumes (if shadows enabled)
   pass 2: shapes in shadow (darkened)
6. setOrthographicProjection() — switch to 2D screen coords
7. glDisable(DEPTH_TEST, LIGHTING)
8. faceContainer.draw() — 2D overlay widgets
9. updateCamera(0) — restore perspective projection
10. glFlush(); glutSwapBuffers()
11. updatePointer() — raycast for hover state
```

### Layer Strategy

- **3D scene**: perspective/ortho projection, full lighting, physics bodies
- **2D overlay**: orthographic projection, no depth test, no lighting, drawn on top
- **Pointer tracking**: post-swap raycast to update `touched`/`touchedBody`/`touchedAbstractBody` for next frame

---

## Key Design Patterns for SpaceGraphJS

### Recommended Default Controls (emulating SGC)

| Input            | Action                                             |
| ---------------- | -------------------------------------------------- |
| **Left drag**    | Pick & drag interactive objects (constraint-based) |
| **Middle drag**  | Orbit camera (azimuth + elevation, 0.2°/px)        |
| **Right drag**   | Zoom (0.2 units/px, min 0.1)                       |
| **Right click**  | Zoom-to-object (snap to hovered body)              |
| **Scroll wheel** | Zoom (not in SGC, natural addition)                |
| **L/R/F/B keys** | Pan camera                                         |
| **Z/X keys**     | Zoom in/out                                        |
| **O key**        | Toggle orthographic/perspective                    |
| **W key**        | Toggle wireframe                                   |
| **I key**        | Pause/resume                                       |
| **Q key**        | Quit                                               |

### Widget Architecture Lessons

1. **Dual-layer widgets**: 3D physics-backed bodies + 2D overlay panels, rendered in separate passes
2. **Event bubbling**: `Container` iterates children, returns `true` on handled — enables composable UI
3. **Draggable veto**: `isDraggable(localPos)` lets widgets opt out of physics picking
4. **Touch lifecycle**: `onTouch()` / `onUntouched()` per-frame hover tracking
5. **Model-view separation**: `SliderModel`, `ButtonModel` callbacks decouple UI from logic
6. **Soft constraint picking**: `btPoint2PointConstraint` with low `tau` (0.1) and `impulseClamp` (30) gives smooth, springy dragging
7. **Distance-preserving drag**: Store `gOldPickingDist` so dragged objects maintain depth during mouse movement
8. **Camera interpolation**: `camTarget`/`camDist` smoothly interpolate to `*Next` targets for fluid movement

### SGC Control Summary Table

```
Mouse Button  Action              Modifier  Notes
───────────── ─────────────────── ───────── ──────────────────────
Left (0)      Pick/drag objects   —         via btPoint2PointConstraint
Left (0)      Widget interaction  —         handled by 2D/3D widget system
Middle (2)    Orbit camera        —         azi += dx*0.2, ele += dy*0.2
Right (1)     Zoom camera         —         dist -= dy*0.2
Right (1)     Zoom-to-object      on release Snaps to hovered body
Any           —                   Alt       Suppresses camera (reserved)
```
