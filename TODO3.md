# SpaceGraphJS — Refactoring Plan

**Status:** Survey complete. Every item below was found by reading the source, verified against the
files, and checked for behavioural differences between the copies. Nothing has been changed yet.

Each item names the copies, the abstraction that would collapse them, and the behavioural trap to
avoid. The trap notes are the point of this document: most of these duplications look like free
deletions and are not.

**Start with item 0.** Two chunks of dead code — an unreachable easing table and an analyzer nothing
imports — account for ~96 lines that can simply be deleted, with no behaviour change at all. The 25
refactors that follow are worth more in structure than in line count.

---

## Method

Every finding was confirmed by reading the files, not by pattern-matching. Where two copies of the
same rule disagreed, the difference is recorded as a **Trap** rather than smoothed over — in several
cases the disagreement *is* the bug, and collapsing it will change behaviour in a way that has to be
called out in the commit message rather than slipped in.

Findings were cross-checked against the built output in `dist/` to confirm what is and is not
actually reachable from the published package.

---

## Ordering

Work in this order. Each step is independently mergeable and independently verifiable.

**Dead code first.** These are not refactors — they are deletions, and they are worth more than
everything below combined:

| # | Item | LOC | Risk |
|---|------|-----|------|
| 0a | `ease` table in `src/utils/math.ts` — unreachable, untested, 1 of 31 functions used | ~77 | none |
| 0b | `BaseVisionAnalyzer` — imported by nothing, not exported | ~19 | none |

Then the refactors, in this order:

| # | Item | Blast radius | Risk |
|---|------|---------------|------|
| 1 | Layout "own every node" flag | 5 files | none |
| 2 | Edge constructor preset data | 4 files | none |
| 3 | Edge material colour | 5 files | low |
| 4 | Camera fly-to-node | 5 files | none |
| 5 | Camera visible extent | 3 files | **medium** |
| 6 | Ortho frustum fitting | 3 files | **medium** |
| 7 | Selection event payload | 7 files | **high** |
| 8 | TypeRegistry node/edge tables | 2 files | low |
| 9 | Content-node title + size | 6 files | low |
| 10 | React/Solid binding props | 4 files | low |
| 11 | Renderer adapter scaffolding | 4 files | **medium** |
| 12 | Adapter edge style policy | 5 files | low |
| 13 | Temp connection line | 3 files | low |
| 14 | WCAG luminance/contrast | 3 files | low |
| 15 | Mermaid card rebuild | 2 files | **medium** |
| 16 | MarkdownNode geometry sync | 2 files | **medium** |
| 17 | Drag event payload | 3 files | low |
| 18 | HUD animations constant | 2 files | none |
| 19 | PluginManager type registration | 2 files | none |
| 20 | Box-select frustum filter | 1 file | none |
| 21 | Builder `data()` / accessors | 3 files | none |
| 22 | Meter/ColorPicker wrapper style | 2 files | none |
| 23 | Original-colour maps | 1 file | none |
| 24 | `lookup()` helper | 2 files | none |
| 25 | Node `_object` boilerplate | 4 files | low |

---

## 0. Dead code — two deletions worth more than every refactor below

### 0a. The `ease` table cannot be reached

`src/utils/math.ts:148`–`224` declares `export const ease = { … }` — **31 easing functions, 77
lines**.

It is not re-exported from `src/utils/index.ts` (that barrel names its math exports explicitly —
`abs`, `angleDiff`, `approx`, `clamp`, … — and `ease` is not among them), and `src/index.ts` only
reaches it through a global type augmentation:

```ts
// src/index.ts:288-291
declare global {
  interface Window {
    ease: typeof import('./utils/math').ease;
  }
}
```

**`window.ease` is never assigned.** There is no `window.ease =` anywhere in `src/`, `test/`,
`demo/` or `packages/`. The built package confirms it: `dist/utils/index.d.ts` contains no `ease`,
and `dist/index.js` does not export it.

The one internal consumer is `src/core/CameraControls.ts:198`, which uses `ease.cubicOut` and
nothing else. The other **30 functions are unreachable**.

`gsap` is already a dependency and already drives every other animation in the library
(`src/nodes/Node.ts:410`, `src/builder/animation.ts:21`). Comparing the two implementations over
1000 samples:

- `ease.cubicOut` is numerically identical to gsap's `power2.out` (max difference 1.1e-16).
- 18 of the other 21 standard easings match their gsap counterparts exactly.
- Only the three `expo*` functions differ materially from gsap's (max difference 0.0078, and 0.497
  for `expoInOut`) — gsap's `expo` is not the same curve.

**So:** swap `ease.cubicOut` for gsap's `power2.out` and delete the table. That removes 77 untested
lines and the last reason `src/utils/math.ts` is 224 lines long. Nothing else in the repo — no
test, no demo, no package — imports `ease`.

### 0b. `BaseVisionAnalyzer` is imported by nothing

`src/vision/analyzers/BaseVisionAnalyzer.ts` (19 lines) declares an abstract `BaseVisionAnalyzer`
with an `analyze` method and a `getNodes` helper.

- No analyzer extends it — `grep "extends" src/vision/analyzers/*.ts` returns nothing.
- Nothing imports it — the only hit in the whole repo is its own declaration.
- It is not re-exported from `src/vision/index.ts`, and it is absent from the built
  `dist/vision.d.ts` and `dist/vision.js`.

The four sibling analyzers (`ErgonomicsAnalyzer`, `HierarchyAnalyzer`, `LegibilityAnalyzer`,
`OverlapAnalyzer`) each implement `analyze` directly. Either promote `BaseVisionAnalyzer` to the
shared base — in which case the four inherit `getNodes` — or delete it.

---

## 1. Layout "own every node" — 4 identical copies

`BaseLayout.ownedNodes()` (`src/plugins/layouts/BaseLayout.ts:61`) filters pinned nodes out. Four
subclasses override it with the same three lines:

- `src/plugins/layouts/TreeLayout.ts:17`
- `src/plugins/layouts/RadialLayout.ts:19`
- `src/plugins/layouts/HierarchicalLayout.ts:19`
- `src/plugins/layouts/ForceLayout.ts:40`

```ts
protected override ownedNodes(): Node[] {
  return Array.from(this.graph.getNodes());
}
```

**Abstraction:** a `protected readonly ownsEveryNode = false` flag on `BaseLayout`, and one
implementation that honours it.

**Trap:** the overrides ignore `config.skipPinned` entirely — `selectNodes(false)` also ignores it,
so folding them in is equivalent. But `ForceLayout.step()` (`ForceLayout.ts:64`) has its own
`Array.from(this.graph.getNodes())` default argument; that is a different thing and must stay.

---

## 2. Edge constructor preset data — 3 copies

- `src/edges/FlowEdge.ts:34`
- `src/edges/DottedEdge.ts:23`
- `src/edges/LabeledEdge.ts:29`

```ts
data: { dashed: true, dashSize: 8, gapSize: 6, color: 0x888888, thickness: 2, ...spec.data }
```

**Abstraction:** `withEdgeData(spec, preset)` on `Edge`, exported from `src/edges/Edge.ts`.

**Trap:** `FlowEdge` computes `thickness: data?.lineWidth ?? 2` and `opacity` from the *pre-merge*
data, then merges `...spec.data` over the preset. The preset must still be computed from the
original `spec.data`, and the spread order (`preset` first, `spec.data` last) must not change.

---

## 3. Edge material colour from spec data — 4 copies

- `src/edges/AnimatedEdge.ts:57` — particle material
- `src/edges/DynamicThicknessEdge.ts:71` — cylinder material
- `src/edges/BundledEdge.ts:68` — strand materials
- `src/edges/InterGraphEdge.ts:46` — SVG `stroke` attribute

**Abstraction:** a colour helper in `src/utils/color.ts`.

**Trap:** three of the four set a THREE material colour; `InterGraphEdge` sets an SVG attribute and
needs `toCssColor`. Keep the truthiness guard (`if (data.color)`) rather than switching to
`!== undefined` — colour `0x000000` is currently skipped, and changing that changes rendering.

---

## 4. Camera fly-to-node — 4 copies

- `src/core/SpaceGraphAppInteraction.ts:62`
- `src/core/SpaceGraphAppHUD.ts:398`
- `src/plugins/interaction/KeyboardShortcuts.ts:69`
- `src/plugins/InteractionPlugin.ts:194`

```ts
this.sg.cameraControls.flyTo(node.position.clone(), focusRadiusOf(node));
```

**Abstraction:** `focusNodeCamera(sg, node)` next to `focusRadiusOf` in `src/utils/CameraUtils.ts`.

**Trap:** three copies clone the position and one does not. `CameraControls.setTargetSmooth` clones
into `targetNext` (`src/core/CameraControls.ts:328`), so the clone is redundant — but confirm that
before dropping it. `InteractionPlugin` also calls `onZoomStart()` *before* the fly; keep that
ordering.

---

## 5. Camera visible world extent — 3 copies

- `src/core/WebGLRenderer.ts:179` (`getWorldExtent`)
- `src/plugins/MinimapPlugin.ts:266` (`_visibleWorldSize`)
- `src/utils/nodeResize.ts:18` (`nodeScreenSize`)

**Abstraction:** one `visibleWorldExtent(camera, distance)` in `src/utils/CameraUtils.ts`.

**Trap:** the perspective **distance source differs** and this is the whole risk of the item:

- `WebGLRenderer` uses `cameraControls.spherical.radius ?? cam.position.length()` — the orbit radius.
- `MinimapPlugin` uses `perspective.position.distanceTo(target)` — distance to the orbit target.

These agree only when the target is the orbit centre; they diverge during a pan. The shared helper
must take the distance as a parameter so each caller keeps its own definition. The orthographic
branch also differs: `WebGLRenderer` reads its own `orthographicCamera`, `MinimapPlugin` reads
`sg.renderer.camera`.

---

## 6. Orthographic frustum fitting — 2 copies + 1 near-copy

- `src/core/WebGLRenderer.ts:347` (`#fitOrthoFrustum`)
- `src/core/CameraControls.ts:390` (`toggleOrthographic`)
- `src/core/WebGLRenderer.ts:368` (ortho branch of `syncSize`)

**Abstraction:** `fitOrthoFrustum(camera, height, aspect)` in `src/utils/CameraUtils.ts`.

**Trap:** the FOV sources differ — `WebGLRenderer` uses the module constant `FOV = 75`
(`WebGLRenderer.ts:22`), `CameraControls` uses the live `perspective.fov ?? 75`. If a host changes
`camera.fov` the two produce different frustums today; merging must pick one. `WebGLRenderer` also
clamps the distance with `Math.max(distance, 1e-3)`; `CameraControls` does not. And they operate
on *different camera instances* (`WebGLRenderer.orthographicCamera` vs
`CameraControls.orthoCamera`) — share the maths, not the object.

---

## 7. Selection event payload — 6 emitters, 5 different shapes — **highest value, highest risk**

| Site | Payload |
|---|---|
| `src/core/Selection.ts:47` | `{ ids: string[], nodes: Set<string>, edges: Set<string>, timestamp }` |
| `src/core/SpaceGraphApp.ts:258` | `{ nodes: string[], edges: string[], timestamp }` |
| `src/core/SpaceGraphAppInteraction.ts:17` | `{ nodes: Node[], edges: Edge[], timestamp }` |
| `src/core/SpaceGraphAppTheme.ts:23` | `{ nodes: Set<Node>, edges: Set<Edge>, timestamp }` |
| `src/core/SpaceGraphAppHUD.ts:371` | `{ nodes: [], edges: [], timestamp }` |
| `src/core/SpaceGraphAppHUD.ts:390` | `{ nodes: string[], edges: [], timestamp }` |

The event type is `any` (`src/types.ts:341`), so TypeScript never saw the divergence.

**Consumers:** `src/plugins/HUDPlugin.ts:177` reads `e.nodes?.size`; the spacegraph renderer reads
`payload.ids` (`packages/spacegraph-renderer/src/index.ts:243`).

**Trap:** `HUDPlugin.updateSelection` reads `.size`, which only the `Set` payloads have. On the
`SpaceGraphApp` path the payload is an array, so the status-bar selection count silently reads
**0**. Collapsing the shapes therefore *changes* that count — it is a fix, but it is a visible
change and should be called out in the commit message, not slipped in.

`src/types.ts:341` should become a real type either way, so the next divergence is caught by the
compiler.

---

## 8. TypeRegistry node/edge twin methods — 7 pairs

`src/core/TypeRegistry.ts` has `registerNode`/`registerEdge`, `registerNodes`/`registerEdges`,
`unregisterNode`/`unregisterEdge`, `getNodeConstructor`/`getEdgeConstructor`, `hasNode`/`hasEdge`,
`getNodeTypes`/`getEdgeTypes`, `getNodeTypeList`/`getEdgeTypeList` (lines 19–80).

**Abstraction:** a `TypeTable<T>` holding one `Map<string, T>`, with the public
`registerNode`/`registerEdge`/… names kept as thin wrappers returning `this`.

**Trap:** `resolveNodeType` (line 83) applies an alias table that exists **only for nodes**
(`node`/`shape` → `ShapeNode`, `edge`/`wire` → `Edge`). `createEdge` uses `edgeSpec.type ?? 'Edge'`
with no alias resolution. Do not add aliasing to edges.

---

## 9. Content-node title sync and size resolution — 4 + 4 copies

**Title label** (identical guard, one variant):

- `src/nodes/ChartNode.ts:67`, `src/nodes/DataNode.ts:58`, `src/nodes/CodeEditorNode.ts:95`,
  `src/nodes/NoteNode.ts:76`

**Abstraction:** `syncTitleLabel(updates)` on `BaseContentNode`.

**Trap:** `ChartNode` reads `this.titleEl` (set only when the spec had a title, line 58); the others
read `this.titleElement`. `DOMNode.createTitleBar` sets `titleElement` only when a title bar was
requested, so the two are equivalent — but `ChartNode` must not start reading a field that is null
in a case where it currently reads a non-null one. `NoteNode` writes `updates.label ?? ''`; the
guard already excludes `undefined`, so the `?? ''` is unreachable.

**Size resolution:** `ChartNode` (`ChartNode.ts:72`) hand-rolls what `DOMNode.dimension`
(`DOMNode.ts:211`) already provides, and `HtmlNode._handleSizeUpdate` (`HtmlNode.ts:480`) repeats
the same fallback chain.

**Trap:** `ChartNode` adds a 32px title-bar allowance to the height (`ChartNode.ts:75`) and coerces
with `Number(...)`; `DOMNode.dimension` does not coerce. `DataNode` uses the key `maxHeight`, not
`height`. The resize guard is falsy-based (`updates.data.width || updates.data.height`), so a
`width: 0` reads as "no update".

`src/nodes/PanelNode.ts:112` hard-codes `80`/`40` — the same values as `HtmlNode.MIN_SIZE`
(`HtmlNode.ts:15`) — and then `HtmlNode.setSize` clamps to them again. Reference `HtmlNode.MIN_SIZE`
rather than deleting the clamp, so the value passed to `setSize` stays identical.

---

## 10. React and Solid bindings are the same file twice

`packages/react-spacegraph/src/index.tsx` and `packages/solid-spacegraph/src/index.tsx` share the
props interface (lines 9–23) and the `GraphBinding` construction (lines 35–51 / 36–52) verbatim.

**Abstraction:** a shared props base and a `bindingOptionsFrom(props)` helper in
`src/control/GraphBinding.ts`.

**Trap:** only the options object is shareable. The lifecycle differs (React `useRef`/`useEffect`
vs Solid `onMount`/`createEffect`/`onCleanup`), and the style application differs (React merges into
`style`; Solid assigns `container.style` then `Object.assign`). `className` vs `class` also
differs.

---

## 11. Renderer adapter scaffolding — 2 adapters

`packages/spacegraph-renderer/src/index.ts` and `packages/cytoscape-renderer/src/index.ts` share
the `Handler<K>` type, the `on()`/`#emit()` pair (lines 218/263 and 260/353), and the
`#applyingSelection` re-entrancy guard (lines 156–168 and 154–166).

**Abstraction:** `BaseGraphRenderer` in `@spacegraphjs/renderer` — the contract package is already
the shared dependency-free home for both.

**Trap:** `setSelection` bodies are not interchangeable (core `clearSelection`/`select` vs
Cytoscape `unselect()` then select-by-id). Only the guard wrapper is shareable. `dispose()` and
`getViewport()` differ in meaning.

---

## 12. Adapter edge style policy — 3 adapters

The "inferred" rule is re-implemented in every adapter:

- `packages/spacegraph-renderer/src/mapping.ts:74`
- `packages/cytoscape-renderer/src/mapping.ts:62`
- `packages/svg-renderer/src/index.ts:177`

**Abstraction:** `edgeStyleFor(edge, theme)` in `@spacegraphjs/renderer`, plus `isCardShape(shape)`
(`cytoscape-renderer/src/mapping.ts:17` and `svg-renderer/src/index.ts:163` both test
`card`/`panel`).

**Trap:** the colour is a **number** in spacegraph-renderer (`parseColor`) and a **CSS string** in
the other two — the shared policy returns the string and spacegraph-renderer parses it. Cytoscape
encodes dash through CSS classes, SVG through `stroke-dasharray`. `spacegraph-renderer`'s
`shapeFor` (`mapping.ts:34`, `dot` → `circle`) is a *core shape* mapping, not the same concept as
`isCardShape` — do not merge those. (`shapeFor` is at `packages/spacegraph-renderer/src/mapping.ts:34`.)

---

## 13. Temp connection line — 2 implementations

`src/plugins/interaction/ConnectionHandler.ts` (lines 11–16, 32–45, 62–64, 122–133) and
`src/input/fingerings/WiringFingering.ts` (lines 8–11, 26–37, 49–51, 56–62) each build a
zero-length `THREE.Line` with the same material (`0x8b5cf6`, width 2).

**Abstraction:** a small `TempConnectionLine` class.

**Trap:** the endpoint maths is *not* shared — `ConnectionHandler` intersects a camera-facing plane
through the source, `WiringFingering` unprojects the finger NDC at `z = 0.5`. Only the line object
is shared. Also `ConnectionHandler.cleanupConnection` disposes the **material** (line 126) and
`WiringFingering.stop` does not — folding them in means the material is disposed in both, which
fixes a leak in `WiringFingering` and is a behaviour change.

---

## 14. WCAG luminance and contrast — 2 implementations

- `src/utils/color.ts:18` (`getRelativeLuminance`), `:36` (`getContrastRatio`)
- `packages/renderer/src/theme.ts:159` (`luminance`), `:172` (`contrastRatio`)

**Abstraction:** the primitives in `@spacegraphjs/renderer` (`relativeLuminance(r, g, b)` for
0..1 channels, `contrastRatioOf(l1, l2)`), with core re-exporting.

**Trap:** the core version takes channels already in 0..1; the package version parses hex to 0..255
and divides. The package's `contrastRatio(fg, bg)` takes hex strings and returns `undefined` when
either is unparseable; the core takes two luminances. The hex-parsing wrapper stays on top of the
shared primitives. `getCompliantColor` (`color.ts:46`) stays in core — it mutates RGB channels.

Note the dependency direction: `packages/renderer` must stay dependency-free and must not import
core, so the primitives have to live in the contract package.

---

## 15. MermaidNode rebuilds the same card three times

`src/plugins/mermaid/MermaidNode.ts` — `updateNodeColor()` (147), `updateLabel()` (162),
`setSelectedStyle()` (176).
**Abstraction:** one `applyCard(update)` that rebuilds the markup.

**Trap:** the two colour derivations are **deliberately different** and must stay different:

- `updateNodeColor` uses `this.themeColors[colorIndex] || this.themeColors[0]` and **ignores**
  `data.color`.
- `updateLabel`/`setSelectedStyle` use `data.color ?? this.themeColors[index]`.

Collapsing them changes which colour a themed node paints. The three also write different fields
into `data` (`updateNodeColor` writes `color`; `updateLabel` writes `label`; `setSelectedStyle`
writes neither), and `setSelectedStyle` overrides `HtmlNode.setSelectedStyle`
(`src/nodes/HtmlNode.ts:208`), so a MermaidNode never gets the `selected` CSS class.

---

## 16. MarkdownNode geometry sync — 3 copies in one file

`src/nodes/MarkdownNode.ts` — ResizeObserver callback (56), no-ResizeObserver fallback (69),
`_syncGeometryToContent()` (115).

**Abstraction:** one `syncGeometryToContent(width, height)` method.

**Trap:** the three differ in ways that matter:

- The ResizeObserver path **widens** to the content width: `Math.max(rect.width, data.width ?? 300)`.
- The fallback uses the **constructor's** width and compares against the constructor's height.
- `_syncGeometryToContent` uses the **live** `this.data.width ?? 300` and has no unchanged guard.
- The fallback's `this.domElement.offsetHeight ?? h` is dead — `offsetHeight` is always a number.

Fold the two "measure the DOM and resize" paths first; the ResizeObserver path needs its own.

---

## 17. Drag event payload — 2 live implementations

`src/plugins/interaction/DragHandler.ts` (lines 73, 93, 178) and
`src/input/fingerings/NodeDraggingFingering.ts` (lines 35, 56, 75, 101) both emit
`interaction:dragstart` / `interaction:dragend` / `interaction:drag`.

**Abstraction:** a `nodeDragPayload(node)` helper.

**Trap:** both are registered at once — `NodeDraggingFingering` is a fingering and
`InteractionPlugin` also drives `DragHandler`. The payload helper must not change which one wins.
The two also compute the position at different points in their flows (post-move vs pre-copy).

---

## 18. HUD animations constant declared twice

`src/plugins/hud/HUDStyles.ts:124` exports `HUD_ANIMATIONS`; `src/plugins/hud/HUDAlerts.ts:89`
declares a local `const HUD_ANIMATIONS` shadowing it with the same `fadeIn`.

**Abstraction:** import the exported one.

**Trap:** none — the local `fadeIn` is byte-identical to the exported one; it simply lacks
`fadeInActive`/`fadeOut`, which `HUDAlerts` never uses. Note `HUDAlerts` also calls
`HUDDOMFactory.fadeIn(alert)` at line 74, which re-applies `fadeIn` — the fade-in style is applied
twice today. Fixing that is a separate change.

---

## 19. PluginManager node/edge type registration — 2 copies

`src/core/PluginManager.ts:170` (`registerNodeType`) and `:187` (`registerEdgeType`) are the same
method with `registerNode`/`registerEdge` swapped.

**Abstraction:** one private `registerType(type, cls, register)`.

**Trap:** the `hasOwnProperty` guard is deliberate — an inherited static `typeName` must not
replace the base constructor — and must be preserved verbatim, including the
`typeof === 'string'` check.

---

## 20. Box-select frustum filter computed twice

`src/input/fingerings/BoxSelectingFingering.ts` — `update()` (38) and `stop()` (50) build the same
frustum and filter.

**Abstraction:** a private `nodesInFrustum(frustum)`.

**Trap:** the two emit **different event names** — `'selection:preview'` (line 42) and
`'selection:change'` (line 56). Note `'selection:change'` is *not* the core's
`'selection:changed'`. Do not unify the names.

---

## 21. Builder `data()` and the four accessors

`src/builder/base.ts` — `data()` (9) duplicates `mergeData()` (40); `build()` (14), `toSpec()` (18),
`val()` (22), `get()` (26) all return `this.spec`.

**Abstraction:** `data()` calls `mergeData()`; `val()`/`get()` delegate to `toSpec()`.

**Trap:** `{ ...undefined }` is `{}`, so `data()` and `mergeData()` produce identical results —
only `data()` returns `this`. `val()` and `get()` are **public API**; keep them as aliases.
`src/builder/graph.ts:242` has the same `build`/`toSpec` pattern but `build()` returns
`{ nodes, edges }` while `toSpec()` calls it — that one is already fine.

---

## 22. MeterNode / ColorPickerNode wrapper style — 2 copies

`src/nodes/MeterNode.ts:46` and `src/nodes/ColorPickerNode.ts:30` are byte-identical.

**Abstraction:** a shared constant or an `HtmlNode` helper.

**Trap:** the neighbours differ — `DropdownNode._setupDropdown` sets only `padding: '8px'` and
`ProgressBarNode._setupProgressBar` only `padding: '12px'`, and neither sets the flex column. A
shared constant must be opt-in per node.

---

## 23. SpaceGraphApp original-colour maps — 2 maps, 4 wrappers

`src/core/SpaceGraphApp.ts:66` declares `originalColors` and `originalEdgeColors` — two
`Map<Node | Edge, number>` instances used identically by `_highlightColor`/`_restoreColor`
(lines 289–304) through four thin wrappers (`_clearNodeStyle`, `_applyNodeStyle`, `_clearEdgeStyle`,
`_applyEdgeStyle`, lines 265–287).

**Abstraction:** one `Map<Node | Edge, number>` keyed by surface, and two wrappers.

**Trap:** none — `Node` and `Edge` are distinct objects, so no key collision.

---

## 24. `lookup()` helper — 2 copies

`src/levels/index.ts:60` and `src/layout/strategies.ts:132` declare the same generic
record-lookup helper.

**Abstraction:** one shared helper.

**Trap:** none. Both are module-private; put the shared copy somewhere both can import without
creating a cycle (`src/layout/strategies.ts` and `src/levels/index.ts` are separate public modules).

---

## 25. Node `_object` boilerplate — 4 copies

`src/nodes/TextMeshNode.ts:25`, `src/nodes/GroupNode.ts:43`, `src/nodes/SceneNode.ts:41` each declare
`private _object = new THREE.Object3D()` with a `get object()` accessor;
`src/nodes/BaseInstancedNode.ts:10` does the same with an explicit type.

**Abstraction:** a protected `_object` on the `Node` base, or a small mixin.

**Trap:** the other node classes use `readonly _object: THREE.Group` and assign a `THREE.Group`
(`DOMNode.ts:18`, `ShapeNode.ts:29`, `GlobeNode.ts:10`, `TexturedMeshNode.ts:11`). The base must
stay assignable to both `THREE.Object3D` and `THREE.Group`. `Node` already declares
`abstract readonly object: THREE.Object3D` — the base needs to keep satisfying that contract.

---

## Also worth doing, lower priority

- **`src/core/Graph.ts`** — `getNodeCount()`/`nodeCount` (38/204) and `getEdgeCount()`/`edgeCount`
  (42/208) are the same value under two names. `#linkIndex()` (703) rebuilds the whole adjacency map
  from the edge list, and five separate public methods call it (375, 403, 466, 481, 494, 512) — so
  `getStats()` (416), which calls `getConnectedComponentCount()`, builds the index once per call,
  and `isConnected` (50) builds it again. A caller that wants both a count and a component pays
  twice.
- **`src/core/SpaceGraph.ts`** — the class is 1103 lines, 67 of them one-line delegations to
  `this.ergo` (the `ErgonomicsAPI`). It is a deliberate public facade, so this is a readability
  concern, not a duplication one — but the delegations could be grouped or generated.
- **`src/core/index.ts`** — the export lists carry comments in the wrong places because the symbol
  list was sorted after the comments were written: `// Math constants` sits above `DEG2RAD` and
  `// Shorthand aliases` above `DUR` (lines 12–24), so neither comment describes the block it
  heads. `src/utils/index.ts` gets this right — its comments (`// Math functions`, `// Type
  guards`, `// Vector math`, …) correctly group the symbols beneath them.
- **`src/types.ts`** — `SpaceGraphEvents` is `any` for 13 of its 18 entries (`src/types.ts:334`–`346`).
  Typing the high-traffic ones (`selection:changed`, `node:selection-changed`, `node:click`,
  `edge:click`) would catch the class of bug in item 7.
- **`src/vision/analyzers/BaseVisionAnalyzer.ts`** — exported but nothing imports it; the four
  sibling analyzers each implement `analyze` directly. Either use it as the shared base or drop it.
- **`src/builder/factories.ts`** — `NodeFactory.label` (56) and `Presets.label` (217) build the same
  spec, except `Presets` adds `.style({ fontSize: '14px' })`. `NodeFactory.card` (76) and
  `Presets.card` (203) build the same `PanelNode` spec, except `Presets` adds
  `.style({ padding: '10px' })`. `NodeFactory.panel` (73) is a different size (250×200) and has no
  `Presets` twin.
- **`src/input/fingerings/`** — `BaseFingering.defer` (`BaseFingering.ts:21`) returns `true`, and
  four subclasses override it with the identical `defer(_finger) { return false; }`:
  `BoxSelectingFingering.ts:61`, `CameraFingerings.ts:64`, `PinchZoomFingering.ts:31` and
  `ResizeFingering.ts:47`. `WiringFingering.ts:69` returns `!this.isConnecting` and must not be
  folded in.
- **`src/plugins/mermaid/MermaidParser.ts`** — the module-level `emptyResult(format)` (159) plus two
  private wrappers `DOTParser.emptyResult` (425) and `GraphMLParser.emptyResult` (531). The JSON
  parser (line 580) calls the module-level one directly, so only two of the three are wrappers.
- **`src/vision/analyzers/BaseVisionAnalyzer.ts`** — see item 0b above.
- **`src/nodes/Node.ts`** — `hasTag`/`addTag`/`removeTag`/`getTags` (lines 618–664) each branch on
  "array or comma-separated string". One `normaliseTags` helper would remove the repetition, but the
  string form's exact spacing must be preserved: `addTag` writes with `', '` (comma-space) while
  `hasTag`/`getTags` split on `','` and trim.
