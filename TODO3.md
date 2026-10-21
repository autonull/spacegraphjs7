# SpaceGraphJS — Refactoring Plan

**Status:** Items 0a, 0b and 1–25 are **done** — commit `c025219`, *"refactor: one place for each
shared rule, and the dead code that had none"*. Item 14 is **half done**; the reason is recorded
under that item. The "Also worth doing, lower priority" section at the end is **untouched**, and it
plus item 14 is the open work.

Each item names the copies, the abstraction that would collapse them, and the behavioural trap to
avoid. The trap notes are the point of this document: most of these duplications look like free
deletions and are not.

**Item 0 came first**, as planned: two chunks of dead code — an unreachable easing table and an
analyzer nothing imports — were ~96 lines that could simply be deleted, with no behaviour change at
all. The 25 refactors after it were worth more in structure than in line count.

---

## Remaining work

| Item | State | What is left |
|------|-------|--------------|
| 14 | half done | The contract owns the WCAG primitives; the core keeps its own copy because `test/boundaries.test.ts` holds the core free of `@spacegraphjs/renderer` and the core package does not depend on it. Doing the plan's "core re-exporting" needs a package dependency added to the published core, or that boundary test weakened. |
| also (a) `Graph.ts` counts and `#linkIndex()` | open | `getNodeCount()`/`nodeCount` and `getEdgeCount()`/`edgeCount` are one value under two names; `#linkIndex()` is rebuilt by five public methods, so a caller wanting a count and a component pays twice. |
| also (b) `SpaceGraph` facade | open | 1103 lines, 67 one-line delegations to `this.ergo`. Readability, not duplication. |
| also (c) `src/core/index.ts` comments | open | `// Math constants` heads `DEG2RAD`; `// Shorthand aliases` heads `DUR`. |
| also (d) `SpaceGraphEvents` typing | open | Still `any` for 12 of 18 entries. `selection:changed` is typed now (item 7); the rest are not. |
| also (e) `builder/factories.ts` | open | `NodeFactory.label`/`Presets.label` and `NodeFactory.card`/`Presets.card` differ by one `.style(...)` each. |
| also (f) `BaseFingering.defer` | open | Four subclasses repeat `defer(_finger) { return false; }`. `WiringFingering` returns `!this.isConnecting` and stays. |
| also (g) `MermaidParser.emptyResult` | open | A module-level helper plus two private wrappers. |
| also (h) `Node.ts` tag helpers | open | `hasTag`/`addTag`/`removeTag`/`getTags` each branch on "array or comma-separated string". |

Everything else in this document is complete. The trap notes below stay as they were written — they
are the record of what had to be preserved while folding each copy in, and they remain the reason
the behaviour changes were called out in the commit message rather than slipped in.

---

## Method

Every finding was confirmed by reading the files, not by pattern-matching. Where two copies of the
same rule disagreed, the difference is recorded as a **Trap** rather than smoothed over — in several
cases the disagreement *is* the bug, and collapsing it will change behaviour in a way that has to be
called out in the commit message rather than slipped in.

Findings were cross-checked against the built output in `dist/` to confirm what is and is not
actually reachable from the published package.

The line numbers below are as found at survey time. The work has since moved them; the trap notes
are kept as they were written, because they are the record of what had to be preserved while
folding each copy in.

---

## Ordering

Work in this order. Each step is independently mergeable and independently verifiable.

**Dead code first.** These are not refactors — they are deletions, and they are worth more than
everything below combined:

| # | Item | LOC | Risk | State |
|---|------|-----|------|-------|
| 0a | `ease` table in `src/utils/math.ts` — unreachable, untested, 1 of 31 functions used | ~77 | none | **done** |
| 0b | `BaseVisionAnalyzer` — imported by nothing, not exported | ~19 | none | **done** |

Then the refactors, in this order:

| # | Item | Blast radius | Risk | State |
|---|------|---------------|------|-------|
| 1 | Layout "own every node" flag | 5 files | none | **done** |
| 2 | Edge constructor preset data | 4 files | none | **done** |
| 3 | Edge material colour | 5 files | low | **done** |
| 4 | Camera fly-to-node | 5 files | none | **done** |
| 5 | Camera visible extent | 3 files | **medium** | **done** |
| 6 | Ortho frustum fitting | 3 files | **medium** | **done** |
| 7 | Selection event payload | 7 files | **high** | **done** |
| 8 | TypeRegistry node/edge tables | 2 files | low | **done** |
| 9 | Content-node title + size | 6 files | low | **done** |
| 10 | React/Solid binding props | 4 files | low | **done** |
| 11 | Renderer adapter scaffolding | 4 files | **medium** | **done** |
| 12 | Adapter edge style policy | 5 files | low | **done** |
| 13 | Temp connection line | 3 files | low | **done** |
| 14 | WCAG luminance/contrast | 3 files | low | **half** — see the item |
| 15 | Mermaid card rebuild | 2 files | **medium** | **done** |
| 16 | MarkdownNode geometry sync | 2 files | **medium** | **done** |
| 17 | Drag event payload | 3 files | low | **done** |
| 18 | HUD animations constant | 2 files | none | **done** |
| 19 | PluginManager type registration | 2 files | none | **done** |
| 20 | Box-select frustum filter | 1 file | none | **done** |
| 21 | Builder `data()` / accessors | 3 files | none | **done** |
| 22 | Meter/ColorPicker wrapper style | 2 files | none | **done** |
| 23 | Original-colour maps | 1 file | none | **done** |
| 24 | `lookup()` helper | 2 files | none | **done** |
| 25 | Node `_object` boilerplate | 4 files | low | **done** |

---

## 0. Dead code — two deletions worth more than every refactor below

### 0a. The `ease` table cannot be reached

**Done.** The table is deleted. `CameraControls` now parses gsap's `power2.out` once at module
scope — the same curve, to 1.1e-16 over 1000 samples — and the `Window.ease` global type is gone.

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

**Done.** `src/vision/analyzers/BaseVisionAnalyzer.ts` is deleted. The four sibling analyzers each
implement `analyze` directly and each cast `context.nodes` to its own node shape, so promoting the
base would have cost every one of them its own type.

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

**Done.** `BaseLayout.ownsEveryNode` is the flag; the four layouts set it instead of overriding
`ownedNodes`. `ForceLayout.step()` keeps its own `Array.from(this.graph.getNodes())` default.

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

**Done.** `withEdgeData(spec, preset)` in `src/edges/Edge.ts` owns the merge; `FlowEdge`,
`DottedEdge` and `LabeledEdge` call it. The preset is still computed from the pre-merge data, and
the spec's own data still wins.

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

**Done.** `dataColor(value)` in `src/utils/color.ts` returns the CSS colour a spec's data carries,
or `undefined` when it carries none — the truthiness guard kept, so `0x000000` is still skipped.
The three material sites set `material.color.set(...)`; `InterGraphEdge` sets the SVG `stroke`.
`setHex(n)` and `set('#rrggbb')` are numerically identical in three, so the colour is unchanged.

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

**Done.** `focusNodeCamera(cameraControls, node)` in `src/utils/CameraUtils.ts`. The clone went
away with it: `CameraControls.setTargetSmooth` clones into `targetNext`, so the node's own
position was never captured. `InteractionPlugin` still calls `onZoomStart()` before the fly.

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

**Done.** `visibleWorldExtent(camera, distance, aspect?)` in `src/utils/CameraUtils.ts`. The
distance is still the caller's own: the renderer passes the orbit radius, the minimap the distance
to the target, `nodeResize` the distance to the node.

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

**Done.** `fitOrthoFrustum(camera, fov, distance, aspect)` and `setOrthoFrustum(camera, height,
aspect)` in `src/utils/CameraUtils.ts`; the maths is shared, the camera objects are not. The FOV
conflict is resolved in favour of the live perspective camera: `WebGLRenderer` used the module
constant `FOV = 75`, `CameraControls` used `perspective.fov ?? 75`, and the camera's own wins now.
`WebGLRenderer`'s `Math.max(distance, 1e-3)` clamp stayed at its call site.

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

**Done.** One payload: `{ ids, nodes, edges, timestamp }`, with `nodes` and `edges` as sets of ids.
`selectionChanged(nodeIds, edgeIds)` in `src/core/Selection.ts` builds it and
`SelectionChangedPayload` in `src/types.ts` names it. The HUD's selection count reads the real
number now — on the `SpaceGraphApp` path it used to read 0, because that path sent arrays and the
HUD read `.size`. The `Selection` class also splits node ids from edge ids, so the two counts are
separate instead of one lump under "nodes".

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

**Done.** `TypeTable<T>` in `src/core/TypeRegistry.ts` holds the one map; the seven public methods
are thin wrappers over it. `resolveNodeType` still resolves aliases for nodes only — edges get
none.

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

**Done.** `BaseContentNode.syncTitleLabel(updates)` owns the title label, and `DOMNode.dimension`
owns the fallback chain — it now takes the data object, coerces a numeric string and falls back to
the default for a value that is not a number, which is what `ChartNode` did by hand. `ChartNode`'s
32px title-bar allowance stayed where it was. `ChartNode.titleEl` is a getter over the title bar
now. `PanelNode` references `HtmlNode.MIN_SIZE` instead of repeating `80`/`40`.

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

**Done.** `GraphViewPropsBase` and `bindingOptionsFrom(props)` in `src/control/GraphBinding.ts`.
Only the options object is shared: the lifecycle and the style application stay with each
framework, and `className` against `class` stays where it was.

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

**Done.** `BaseGraphRenderer` in `packages/renderer/src/adapter.ts` owns the event bus, the
`on`/`emit` pair and the selection guard; `applySelection(ids, apply)` is the shareable part of the
guard. Each adapter keeps its own `setSelection` body and its own `dispose` and `getViewport`.

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

**Done.** `edgeStyleFor(edge, theme)` and `isCardShape(shape)` in `packages/renderer/src/edge.ts`.
The policy returns a CSS colour and a width; `spacegraph-renderer` parses the colour to a number
for the core. Cytoscape still encodes the dash through a class and SVG through `stroke-dasharray`.
`spacegraph-renderer`'s `shapeFor` (`dot` → `circle`) is a core shape mapping and was left alone.

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

**Done.** `TempConnectionLine` in `src/plugins/interaction/TempConnectionLine.ts` owns the line, its
geometry and its material. The endpoint maths stayed with each gesture: the plugin intersects a
camera-facing plane, the fingering unprojects the finger NDC. The material is disposed in both now
— the fingering leaked it, and the plugin reused a disposed material for the second connection.

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

**Half done.** `relativeLuminance(r, g, b)` and `contrastRatioOf(l1, l2)` live in
`packages/renderer/src/color.ts`, and the contract's `luminance(hex)` and `contrastRatio(fg, bg)`
are thin wrappers over them. The core keeps its own `getRelativeLuminance` and `getContrastRatio`
(`src/utils/color.ts`): `test/boundaries.test.ts` holds the core free of `@spacegraphjs/renderer`,
and the core package does not depend on it, so the plan's "core re-exporting" would need either a
new package dependency on the published core or that boundary test weakened. That is a call for the
maintainer, not a refactor. `getCompliantColor` stays in core.

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

**Done.** `MermaidNode.applyCard(card)` rebuilds the markup; the three callers keep their own colour
derivation and their own data writes, so the deliberate difference between `updateNodeColor`
(themed colour, ignoring `data.color`) and the other two (`data.color ?? themed`) survives.

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

**Done.** The two "measure the DOM and resize" paths folded into
`_syncGeometryToContent(unchangedHeight?)`; the ResizeObserver path keeps its own, because it
widens to the content width. The fallback's dead `offsetHeight ?? h` is gone.

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

**Done.** `nodeDragPayload(node)` in `src/plugins/interaction/nodeDragPayload.ts`. Which handler
wins is unchanged: both are still registered. `interaction:dragstart` and `interaction:dragend`
now carry the node's position as well as the node.

`src/plugins/interaction/DragHandler.ts` (lines 73, 93, 178) and
`src/input/fingerings/NodeDraggingFingering.ts` (lines 35, 56, 75, 101) both emit
`interaction:dragstart` / `interaction:dragend` / `interaction:drag`.

**Abstraction:** a `nodeDragPayload(node)` helper.

**Trap:** both are registered at once — `NodeDraggingFingering` is a fingering and
`InteractionPlugin` also drives `DragHandler`. The payload helper must not change which one wins.
The two also compute the position at different points in their flows (post-move vs pre-copy).

---

## 18. HUD animations constant declared twice

**Done.** `HUDAlerts` imports `HUD_ANIMATIONS` from `HUDStyles`; the local copy is deleted. The
double fade-in (`HUDDOMFactory.fadeIn(alert)` re-applying `fadeIn`) is still there — a separate
change.

`src/plugins/hud/HUDStyles.ts:124` exports `HUD_ANIMATIONS`; `src/plugins/hud/HUDAlerts.ts:89`
declares a local `const HUD_ANIMATIONS` shadowing it with the same `fadeIn`.

**Abstraction:** import the exported one.

**Trap:** none — the local `fadeIn` is byte-identical to the exported one; it simply lacks
`fadeInActive`/`fadeOut`, which `HUDAlerts` never uses. Note `HUDAlerts` also calls
`HUDDOMFactory.fadeIn(alert)` at line 74, which re-applies `fadeIn` — the fade-in style is applied
twice today. Fixing that is a separate change.

---

## 19. PluginManager node/edge type registration — 2 copies

**Done.** `PluginManager.registerType(type, cls, register)`; the `hasOwnProperty` guard and the
`typeof === 'string'` check are preserved verbatim.

`src/core/PluginManager.ts:170` (`registerNodeType`) and `:187` (`registerEdgeType`) are the same
method with `registerNode`/`registerEdge` swapped.

**Abstraction:** one private `registerType(type, cls, register)`.

**Trap:** the `hasOwnProperty` guard is deliberate — an inherited static `typeName` must not
replace the base constructor — and must be preserved verbatim, including the
`typeof === 'string'` check.

---

## 20. Box-select frustum filter computed twice

**Done.** `nodesInFrustum(frustum)` in `BoxSelectingFingering`. The two event names stay different:
`'selection:preview'` and `'selection:change'`.

`src/input/fingerings/BoxSelectingFingering.ts` — `update()` (38) and `stop()` (50) build the same
frustum and filter.

**Abstraction:** a private `nodesInFrustum(frustum)`.

**Trap:** the two emit **different event names** — `'selection:preview'` (line 42) and
`'selection:change'` (line 56). Note `'selection:change'` is *not* the core's
`'selection:changed'`. Do not unify the names.

---

## 21. Builder `data()` and the four accessors

**Done.** `data()` calls `mergeData()`; `val()` and `get()` delegate to `toSpec()` and stay public
API. `src/builder/graph.ts` was left as it was.

`src/builder/base.ts` — `data()` (9) duplicates `mergeData()` (40); `build()` (14), `toSpec()` (18),
`val()` (22), `get()` (26) all return `this.spec`.

**Abstraction:** `data()` calls `mergeData()`; `val()`/`get()` delegate to `toSpec()`.

**Trap:** `{ ...undefined }` is `{}`, so `data()` and `mergeData()` produce identical results —
only `data()` returns `this`. `val()` and `get()` are **public API**; keep them as aliases.
`src/builder/graph.ts:242` has the same `build`/`toSpec` pattern but `build()` returns
`{ nodes, edges }` while `toSpec()` calls it — that one is already fine.

---

## 22. MeterNode / ColorPickerNode wrapper style — 2 copies

**Done.** `HtmlNode.CONTROL_WRAPPER_STYLE`, applied by `MeterNode` and `ColorPickerNode` only.
`DropdownNode` and `ProgressBarNode` keep their own padding.

`src/nodes/MeterNode.ts:46` and `src/nodes/ColorPickerNode.ts:30` are byte-identical.

**Abstraction:** a shared constant or an `HtmlNode` helper.

**Trap:** the neighbours differ — `DropdownNode._setupDropdown` sets only `padding: '8px'` and
`ProgressBarNode._setupProgressBar` only `padding: '12px'`, and neither sets the flex column. A
shared constant must be opt-in per node.

---

## 23. SpaceGraphApp original-colour maps — 2 maps, 4 wrappers

**Done.** One `originalColors` map and two wrappers, `_clearStyle(surface)` and
`_applyStyle(surface, color)`; the four thin wrappers are gone.

`src/core/SpaceGraphApp.ts:66` declares `originalColors` and `originalEdgeColors` — two
`Map<Node | Edge, number>` instances used identically by `_highlightColor`/`_restoreColor`
(lines 289–304) through four thin wrappers (`_clearNodeStyle`, `_applyNodeStyle`, `_clearEdgeStyle`,
`_applyEdgeStyle`, lines 265–287).

**Abstraction:** one `Map<Node | Edge, number>` keyed by surface, and two wrappers.

**Trap:** none — `Node` and `Edge` are distinct objects, so no key collision.

---

## 24. `lookup()` helper — 2 copies

**Done.** `lookup` lives in `src/utils/record.ts`; `src/levels/index.ts` and
`src/layout/strategies.ts` import it. It stays out of the utils barrel — it is an internal helper.

`src/levels/index.ts:60` and `src/layout/strategies.ts:132` declare the same generic
record-lookup helper.

**Abstraction:** one shared helper.

**Trap:** none. Both are module-private; put the shared copy somewhere both can import without
creating a cycle (`src/layout/strategies.ts` and `src/levels/index.ts` are separate public modules).

---

## 25. Node `_object` boilerplate — 4 copies

**Done.** `Object3DNode` in `src/nodes/Object3DNode.ts` is the small mixin: it owns the `_object`
and the `object` getter. `TextMeshNode`, `GroupNode`, `SceneNode` and `BaseInstancedNode` extend
it. The base was not put on `Node` itself: that would have created an object for every node,
including the ones that override `object` with something else, and `Node`'s abstract `object`
contract stays as the compiler's guarantee that a node has one.

`src/nodes/TextMeshNode.ts:25`, `src/nodes/GroupNode.ts:43`, `src/nodes/SceneNode.ts:41` each declare
`private _object = new THREE.Object3D()` with a `get object()` accessor;
`src/nodes/BaseInstancedNode.ts:10` does the same with an explicit type.

**Abstraction:** a protected `_object` on the `Node` base, or a small mixin.

**Trap:** the other node classes use `readonly _object: THREE.Group` and assign a `THREE.Group`
(`DOMNode.ts:18`, `ShapeNode.ts:29`, `GlobeNode.ts:10`, `TexturedMeshNode.ts:11`). The base must
stay assignable to both `THREE.Object3D` and `THREE.Group`. `Node` already declares
`abstract readonly object: THREE.Object3D` — the base needs to keep satisfying that contract.

---

## Also worth doing, lower priority — **all still open**

None of this has been done. The line numbers are as found at survey time. The two
`BaseVisionAnalyzer` bullets the survey listed here are closed by item 0b above and are gone.

- **(a) `src/core/Graph.ts`** — `getNodeCount()`/`nodeCount` (38/204) and `getEdgeCount()`/`edgeCount`
  (42/208) are the same value under two names. `#linkIndex()` (703) rebuilds the whole adjacency map
  from the edge list, and five separate public methods call it (375, 403, 466, 481, 494, 512) — so
  `getStats()` (416), which calls `getConnectedComponentCount()`, builds the index once per call,
  and `isConnected` (50) builds it again. A caller that wants both a count and a component pays
  twice.
- **(b) `src/SpaceGraph.ts`** — the class is 1103 lines, 67 of them one-line delegations to
  `this.ergo` (the `ErgonomicsAPI`). It is a deliberate public facade, so this is a readability
  concern, not a duplication one — but the delegations could be grouped or generated. (The survey
  wrote the path as `src/core/SpaceGraph.ts`; the file is `src/SpaceGraph.ts`.)
- **(c) `src/core/index.ts`** — the export lists carry comments in the wrong places because the symbol
  list was sorted after the comments were written: `// Math constants` sits above `DEG2RAD` and
  `// Shorthand aliases` above `DUR` (lines 12–24), so neither comment describes the block it
  heads. `src/utils/index.ts` gets this right — its comments (`// Math functions`, `// Type
  guards`, `// Vector math`, …) correctly group the symbols beneath them.
- **(d) `src/types.ts`** — `SpaceGraphEvents` is `any` for 13 of its 18 entries (`src/types.ts:334`–`346`).
  Typing the high-traffic ones (`selection:changed`, `node:selection-changed`, `node:click`,
  `edge:click`) would catch the class of bug in item 7. *Item 7 typed `selection:changed`; the
  other 12 entries are still `any`.*
- **(e) `src/builder/factories.ts`** — `NodeFactory.label` (56) and `Presets.label` (217) build the same
  spec, except `Presets` adds `.style({ fontSize: '14px' })`. `NodeFactory.card` (76) and
  `Presets.card` (203) build the same `PanelNode` spec, except `Presets` adds
  `.style({ padding: '10px' })`. `NodeFactory.panel` (73) is a different size (250×200) and has no
  `Presets` twin.
- **(f) `src/input/fingerings/`** — `BaseFingering.defer` (`BaseFingering.ts:21`) returns `true`, and
  four subclasses override it with the identical `defer(_finger) { return false; }`:
  `BoxSelectingFingering.ts:61`, `CameraFingerings.ts:64`, `PinchZoomFingering.ts:31` and
  `ResizeFingering.ts:47`. `WiringFingering.ts:69` returns `!this.isConnecting` and must not be
  folded in.
- **(g) `src/plugins/mermaid/MermaidParser.ts`** — the module-level `emptyResult(format)` (159) plus two
  private wrappers `DOTParser.emptyResult` (425) and `GraphMLParser.emptyResult` (531). The JSON
  parser (line 580) calls the module-level one directly, so only two of the three are wrappers.
- **(h) `src/nodes/Node.ts`** — `hasTag`/`addTag`/`removeTag`/`getTags` (lines 618–664) each branch on
  "array or comma-separated string". One `normaliseTags` helper would remove the repetition, but the
  string form's exact spacing must be preserved: `addTag` writes with `', '` (comma-space) while
  `hasTag`/`getTags` split on `','` and trim.
