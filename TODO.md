# SpaceGraphJS TODO

## Completed (v1.0)

- Demo menu system with minimal top menubar
- 18 fine-grained demos (boilerplate-free)
- ButtonNode widget with hover/pressed states
- SliderNode widget with drag handling
- WidgetFingering integration with InteractionPlugin
- isDraggable: false on widget nodes to prevent drag conflict

---

## Phase 1: Widget System (Priority: High)

### ToggleNode

- [x] Create `src/nodes/ToggleNode.ts` - boolean toggle with on/off states
- [x] Register in `src/init.ts`
- [x] Export from `src/nodes/index.ts` and `src/index.ts`
- [x] Create `demo/demos/widget-toggle.ts`

### Widget Events

- [x] Wire HoverFingering to call `onPointerEnter/Leave` on nodes (currently emits events but doesn't call node methods)
- [x] Add visual feedback (cursor change) on widget hover
- [x] Emit `node:click` event from WidgetFingering on button release

---

## Phase 2: Demo Expansion (Priority: High)

### Node Type Demos

- [x] `node-shape.ts` - ShapeNode with all shape types
- [x] `node-html.ts` - HtmlNode demo
- [x] `node-image.ts` - ImageNode demo
- [x] `node-group.ts` - GroupNode demo

### Edge Type Demos

- [x] `edge-curved.ts` - CurvedEdge demo
- [x] `edge-flow.ts` - FlowEdge with animation
- [x] `edge-dotted.ts` - DottedEdge demo

### Layout Demos

- [x] `layout-force.ts` - ForceLayout demo
- [x] `layout-grid.ts` - GridLayout demo
- [x] `layout-circular.ts` - CircularLayout demo

### Fingering Demos

- [x] `fingering-hover.ts` - Hover behavior alone
- [x] `fingering-drag.ts` - Node drag alone
- [x] `fingering-boxselect.ts` - Box selection alone
- [x] `fingering-wiring.ts` - Edge wiring alone

---

## Phase 3: Interaction Refinement (Priority: Medium)

### Camera Controls

- [x] Add keyboard shortcuts display to camera demos
- [x] Implement OrthographicCamera toggle in camera-ortho demo

### Widget Polish

- [x] Add value display to SliderNode (3D text or DOM overlay)
- [x] Add toggle state indicator to ToggleNode
- [ ] Add touch/gesture support for widgets (mobile)

---

## Phase 4: Testing & Documentation (Priority: Medium)

### Test Coverage

- [ ] Add Playwright test for widget-button click
- [ ] Add Playwright test for widget-slider drag
- [ ] Add Playwright test for demo menu navigation

### Documentation

- [ ] Add widget node docs to DESIGN.md
- [ ] Document fingering priority system
- [ ] Document isDraggable veto pattern

---

## Phase 5: Future Features (Priority: Low)

### Additional Widgets

- [ ] KnobNode - rotary knob control
- [ ] XYPadNode - 2D pad control
- [ ] DropdownNode - 3D dropdown menu
- [ ] TextInputNode - 3D text input field

### Advanced

- [ ] Real-time value binding between widgets
- [ ] Widget layout containers
- [ ] Theme support for widgets
