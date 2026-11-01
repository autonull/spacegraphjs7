# SpaceGraphJS — Example Cookbook

Practical, copy-pasteable patterns for common use cases. Each example is self-contained and runnable.

---

## Table of Contents

1. [Minimal Static Dashboard (SimpleGraph)](#minimal-static-dashboard-simplegraph)
2. [Full Engine with Chrome](#full-engine-with-chrome)
3. [Force Layout — Re-runnable & Deterministic](#force-layout--re-runnable--deterministic)
4. [HtmlNode — Complete Data Schema](#htmlnode--complete-data-schema)
5. [Edges with HtmlNode](#edges-with-htmlnode)
6. [Filter / Rebuild Pattern](#filter--rebuild-pattern)
7. [Camera Control](#camera-control)
8. [Events — Hover, Click, Selection](#events--hover-click-selection)
9. [Theming](#theming)
10. [Depth Modes](#depth-modes)
11. [Export / Import / Persist](#export--import--persist)
12. [Lean Entry (spacegraphjs/activity)](#lean-entry-spacegraphjsactivity)

---

## Minimal Static Dashboard (SimpleGraph)

For a bipartite graph, org chart, or any static dashboard: no chrome, no vision, no ergonomics — just force layout + HTML nodes + edges + camera + events.

```ts
import { SimpleGraph } from 'spacegraphjs';

const nodes = [
  // Projects
  { id: 'p1', type: 'HtmlNode', label: 'Project Alpha', data: { html: '<b>Alpha</b><br>Status: Active', width: 220, height: 80, backgroundColor: '#3b82f6' } },
  { id: 'p2', type: 'HtmlNode', label: 'Project Beta',  data: { html: '<b>Beta</b><br>Status: Planning', width: 220, height: 80, backgroundColor: '#8b5cf6' } },

  // Opportunities
  { id: 'o1', type: 'HtmlNode', label: 'Opp 1', data: { html: '<b>Opp 1</b><br>$120k', width: 160, height: 60, backgroundColor: '#10b981' } },
  { id: 'o2', type: 'HtmlNode', label: 'Opp 2', data: { html: '<b>Opp 2</b><br>$80k', width: 160, height: 60, backgroundColor: '#10b981' } },
  { id: 'o3', type: 'HtmlNode', label: 'Opp 3', data: { html: '<b>Opp 3</b><br>$200k', width: 160, height: 60, backgroundColor: '#10b981' } },
];

const edges = [
  { id: 'e1', source: 'p1', target: 'o1', type: 'Edge', data: { color: 0x64748b, thickness: 2 } },
  { id: 'e2', source: 'p1', target: 'o2', type: 'Edge', data: { color: 0x64748b, thickness: 2 } },
  { id: 'e3', source: 'p2', target: 'o2', type: 'Edge', data: { color: 0x64748b, thickness: 2 } },
  { id: 'e4', source: 'p2', target: 'o3', type: 'Edge', data: { color: 0x64748b, thickness: 2 } },
];

const sg = await SimpleGraph.create('#container', { nodes, edges }, {
  layout: { spacing: 140, iterations: 200, seed: 42 },
  render: { antialias: true, backgroundColor: '#0a0a0a' },
});

// Events
sg.events.on('node:click', ({ node }) => {
  console.log('Clicked:', node.id, node.label);
  // Open sidebar, navigate, etc.
});

sg.events.on('node:pointerenter', ({ node }) => {
  // Tooltip logic
  console.log('Hover:', node.label);
});

sg.events.on('background:click', () => {
  sg.clearSelection();
});
```

**Output:** A force-directed graph with HTML-rendered nodes, edges connecting them, and a clean 2D orthographic view.

---

## Full Engine with Chrome

When you need the HUD, minimap, zoom UI, history, and vision overlay.

```ts
import { SpaceGraph } from 'spacegraphjs';

const sg = await SpaceGraph.create('#container', { nodes, edges }, {
  chrome: true,                    // HUD, minimap, zoom UI, zoom bands
  render: { depth: 'flat' },       // 2D orthographic
  theme: { background: '#0a0a0a' },
});

// All default plugins are registered:
// - InteractionPlugin (drag, click, hover, box-select)
// - LODPlugin (level of detail)
// - AutoLayoutPlugin (vision-driven overlap repair)
// - AutoColorPlugin (harmony-aware colors)
// - ErgonomicsPlugin (runtime hints)
// - PhysicsPlugin (force simulation)
// - HistoryPlugin (undo/redo)
// - HoverMetaWidget (rich hover cards)
// - HUDPlugin (stats overlay)
// - MinimapPlugin (navigator)
// - ZoomBandsPlugin + ZoomUIPlugin
```

---

## Force Layout — Re-runnable & Deterministic

`layoutOnce('force-layout')` can be called multiple times. Each call re-runs the simulation from current positions.

```ts
import { SpaceGraph, ForceLayout } from 'spacegraphjs';

const sg = await SpaceGraph.create('#container', spec, { chrome: true });

// First layout
await sg.layoutOnce('force-layout', {
  spacing: 120,
  iterations: 200,
  seed: 42,
  randomize: true,   // start from random positions
});

// Later: re-layout with new nodes or after filter
sg.loadSpec(newSpec).render();

// ForceLayout resets its internal state automatically on each applyLayout
// If you need to force randomization again:
await sg.layoutOnce('force-layout', {
  spacing: 120,
  iterations: 200,
  seed: 123,
  randomize: true,
});
```

### ForceLayout Options

| Option | Default | Description |
|--------|---------|-------------|
| `repulsion` | 10000 | Node-node repulsion strength |
| `attraction` | 0.01 | Edge attraction strength |
| `damping` | 0.9 | Velocity damping per iteration |
| `gravity` | 0.1 | Center pull strength |
| `minDistance` | 50 | Minimum distance for repulsion calc |
| `maxDistance` | 1000 | Maximum distance for attraction calc |
| `iterations` | 50 | Simulation steps |
| `temperature` | 100 | Max node movement per step |
| `spacing` | 120 | Target spacing (alias for temperature scaling) |
| `seed` | 42 | Random seed for `randomize: true` |
| `randomize` | false | Start from random positions instead of current |
| `animate` | true | Animate to final positions |
| `duration` | 1.0 | Animation duration in seconds |

---

## HtmlNode — Complete Data Schema

All properties supported by `HtmlNode` (defined in `HtmlNodeData`):

```ts
const node = {
  id: 'my-node',
  type: 'HtmlNode',
  label: 'Fallback label',           // used if no html/content
  position: [0, 0, 0],
  data: {
    // Content (one of these)
    html: '<div style="color: #fff"><b>Title</b><br><small>Detail</small></div>',
    // OR
    content: 'Plain text content',

    // Sizing
    width: 280,                      // initial width (px)
    height: 140,                     // initial height (px)

    // Styling
    backgroundColor: '#1e293b',      // CSS color string or hex number
    borderColor: '#334155',          // CSS color string or hex number
    borderWidth: 2,                  // border width in px
    borderRadius: '12px',            // CSS border-radius
    padding: '16px',                 // CSS padding
    fontSize: '14px',                // CSS font-size
    lineHeight: '1.5',               // CSS line-height
    color: '#e2e8f0',                // text color

    // Behavior
    useRawHtml: false,               // if true, no default card styling
    editable: false,                 // contentEditable mode
    group: false,                    // acts as group container
    showControls: true,              // show zoom/resize/delete buttons
    pointerEvents: 'auto',           // 'auto' | 'none'

    // Title bar
    title: 'Card Title',             // title bar text
    theme: 'dark',                   // 'dark' | 'light'

    // Advanced
    contentScale: 1.0,               // inner content zoom (0.3 - 3.0)
    billboard: false,                // face camera
    className: 'my-custom-class',    // extra CSS classes
    style: {                         // inline style overrides
      backdropFilter: 'blur(8px)',
      border: '1px solid #3b82f6',
    },

    // LOD (level of detail) for labels at distance
    labelLod: [
      { distance: 100, scale: 1.0, label: 'Full Label' },
      { distance: 500, scale: 0.7, label: 'Short' },
      { distance: 1000, style: 'display:none' },
    ],
  },
};
```

### Common Patterns

**Rich interactive card:**
```ts
data: {
  html: `
    <div class="glass-header">Project Dashboard</div>
    <div class="glass-content">
      <button class="glass-btn" data-sg-interactive="true">Action</button>
      <input type="range" data-sg-interactive="true">
      <select data-sg-interactive="true"><option>Choice</option></select>
    </div>
  `,
  className: 'glass pulse-card',
  width: 400,
  height: 300,
}
```
> Add `data-sg-interactive="true"` to form controls so they capture pointer events and don't drag the card.

**Minimal label:**
```ts
data: {
  html: '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:11px;font-weight:600;">S-01</div>',
  width: 80,
  height: 32,
  className: 'glass',
}
```

**Raw HTML (no card chrome):**
```ts
data: {
  html: '<svg>...</svg>',  // or any custom markup
  useRawHtml: true,
  width: 200,
  height: 200,
}
```

---

## Edges with HtmlNode

Edges render correctly with `HtmlNode` source/target. The edge uses the node's world position (via `getWorldPosition()`).

```ts
const edges = [
  // Straight edge
  { id: 'e1', source: 'node-a', target: 'node-b', type: 'Edge', data: { color: 0x64748b, thickness: 2, opacity: 0.6 } },

  // Curved edge (smooth bezier)
  { id: 'e2', source: 'node-a', target: 'node-c', type: 'CurvedEdge', data: { color: 0x3b82f6, thickness: 3 } },

  // Dotted/dashed
  { id: 'e3', source: 'node-b', target: 'node-c', type: 'DottedEdge', data: { color: 0x94a3b8, thickness: 1, dashed: true, dashSize: 5, gapSize: 3 } },

  // Labeled edge
  { id: 'e4', source: 'node-a', target: 'node-d', type: 'LabeledEdge', data: { color: 0xf59e0b, thickness: 2, label: 'depends on', fontSize: 11, labelColor: '#f59e0b' } },

  // Flow edge (animated direction)
  { id: 'e5', source: 'node-c', target: 'node-d', type: 'FlowEdge', data: { color: 0x10b981, thickness: 3 } },
];
```

### Edge Data Options (all types)

```ts
data: {
  color: 0x3b82f6,              // hex number (not string)
  gradientColors: ['#3b82f6', '#8b5cf6'],  // [start, end] for gradient
  thickness: 2,                 // line width in world units
  thicknessInstanced: 1,        // for instanced rendering
  opacity: 0.8,                 // 0 - 1
  dashed: false,                // or true
  dashSize: 3,                  // dash length
  gapSize: 1,                   // gap length
  dashScale: 1,                 // scale factor
  arrowhead: false,             // true | 'source' | 'target' | 'both'
  arrowheadSize: 8,
  arrowheadColor: 0x3b82f6,
  label: 'label text',          // for LabeledEdge
  labelColor: '#fff',
  labelBackground: 'rgba(0,0,0,0.7)',
  fontSize: 12,
  hitWidth: 5,                  // pick radius in px
}
```

---

## Filter / Rebuild Pattern

Rebuild the graph from filtered data. `layoutOnce` re-runs correctly after `clear()` + `loadSpec()`.

```ts
import { SpaceGraph, SimpleGraph } from 'spacegraphjs';

const allNodes = [...];
const allEdges = [...];
let currentFilter = 'all';

async function rebuild(filter: string) {
  currentFilter = filter;

  const nodes = allNodes.filter(n => filter === 'all' || n.data.category === filter);
  const nodeIds = new Set(nodes.map(n => n.id));
  const edges = allEdges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));

  // Option A: Full rebuild with SimpleGraph (cleanest)
  // sg.dispose();  // if replacing entirely
  // const sg = await SimpleGraph.create('#container', { nodes, edges }, { layout: {...} });

  // Option B: In-place update (preserves instance, camera, plugins)
  sg.clear();
  sg.loadSpec({ nodes, edges }).render();

  // Re-run layout — ForceLayout resets state automatically
  await sg.layoutOnce('force-layout', {
    spacing: 120,
    iterations: 200,
    seed: 42,
    randomize: true,  // optional: fresh start
  });
}

// UI: filter buttons, search input, etc.
document.getElementById('filter-all').onclick = () => rebuild('all');
document.getElementById('filter-projects').onclick = () => rebuild('project');
document.getElementById('filter-opps').onclick = () => rebuild('opportunity');
```

---

## Camera Control

```ts
// Frame all nodes with padding
sg.fitView(100, 1.5);                    // padding, duration

// Frame specific nodes
sg.fitView(100, 1.5, ['node-1', 'node-2']);

// Focus on one node
sg.focusNode('node-1', 80, 0.8);         // padding, duration

// Set camera directly
sg.setCamera([0, 500, 500], [0, 0, 0]);  // position, target

// Center on point
sg.center(100, -50, 0);

// Reset to default
sg.resetCamera();

// Get current viewport
const vp = sg.viewport;  // { zoom, center: [x,y,z], distance, extent?, band? }

// Listen for camera changes
sg.events.on('camera:change', (vp) => {
  console.log('Camera:', vp.center, 'Zoom:', vp.zoom);
});
```

---

## Events — Hover, Click, Selection

```ts
// Node hover
sg.events.on('node:pointerenter', ({ node }) => {
  showTooltip(node, event.clientX, event.clientY);
});
sg.events.on('node:pointerleave', ({ node }) => {
  hideTooltip();
});

// Node click
sg.events.on('node:click', ({ node, originalEvent }) => {
  if (originalEvent?.shiftKey) {
    sg.toggleSelection(node.id);  // multi-select
  } else {
    sg.select(node.id);           // single select
  }
  openSidebar(node);
});

// Edge click
sg.events.on('edge:click', ({ edge }) => {
  console.log('Edge:', edge.id, edge.source.id, '→', edge.target.id);
});

// Background click (deselect)
sg.events.on('background:click', () => {
  sg.clearSelection();
});

// Selection changes
sg.events.on('selection:changed', ({ ids, nodes, edges }) => {
  updateSidebar(Array.from(nodes), Array.from(edges));
});

// Double-click to focus
sg.events.on('node:dblclick', ({ node }) => {
  sg.focusNode(node.id, 100, 1.0);
});
```

---

## Theming

```ts
import { SpaceGraph } from 'spacegraphjs';

const sg = await SpaceGraph.create('#container', spec, {
  theme: {
    background: '#050510',
    node: {
      fill: 'rgba(59, 130, 246, 0.8)',    // default node fill
      stroke: '#3b82f6',                   // default node stroke
    },
    edge: {
      color: '#64748b',                    // default edge color
      labelColor: '#94a3b8',
      labelBackground: 'rgba(15, 23, 42, 0.9)',
    },
    label: {
      color: '#e2e8f0',
      fontFamily: 'system-ui, sans-serif',
      fontSize: 13,
    },
    selection: '#3b82f6',                  // selection outline
    hover: '#60a5fa',                      // hover outline
    focus: '#fbbf24',                      // focus outline
  },
});
```

> **Note:** `theme.node.fill` / `stroke` replace the old `theme.nodeColor` / `theme.edgeColor`. The old names are not supported.

---

## Depth Modes

`setDepth(mode)` controls projection, camera pose, orbit, and depth fade together.

| Mode | Projection | Orbit | Use Case |
|------|------------|-------|----------|
| `'flat'` | Orthographic | Disabled | 2D dashboards, legibility baseline |
| `'layered'` | Perspective | Disabled | Readable depth ordering, subtle tilt |
| `'depth-stack'` | Perspective | Disabled | Exaggerated depth for hierarchy |
| `'orbit'` | Perspective | **Enabled** | Free 3D exploration |

```ts
// 2D dashboard mode (recommended for static graphs)
sg.setDepth('flat');
sg.setProjection('orthographic');

// 3D exploration mode
sg.setDepth('orbit');
sg.setOrbitEnabled(true);

// Switching
sg.events.on('depth:change', ({ depth, previous }) => {
  console.log(`Depth: ${previous} → ${depth}`);
});
```

> **Important:** `'perspective'` is NOT a valid `DepthMode`. Use `'orbit'` for perspective with orbit, or `'layered'`/`'depth-stack'` for perspective without orbit.

---

## Export / Import / Persist

```ts
// Export full state (nodes, edges, camera, plugins)
const fullState = sg.export();
// { nodes: [...], edges: [...], camera: { position, target }, plugins: {...} }

// Export just the graph spec
const spec = sg.graph.toJSON();
// { nodes: [...], edges: [...] }

// Import replaces graph and restores camera
sg.import(fullState).render();

// Or load new spec in place
sg.clear();
sg.loadSpec(newSpec).render();
await sg.layoutOnce('force-layout', { ... });
```

---

## Lean Entry (spacegraphjs/activity)

For bundle-size-sensitive apps, use the lean entry that keeps `three` off the critical path.

```ts
// Only imports what's needed for a basic canvas
import { SpaceGraph } from 'spacegraphjs/activity';

// Same API, but:
// - No vision system
// - No ONNX runtime
// - No Monaco, Chart.js, KaTeX
// - No default layout plugins (register your own)
// - Smaller initial bundle
```

```html
<!-- Or use the Vite plugin for /api/data dev server -->
<!-- vite.config.ts -->
import { spacegraph } from 'spacegraphjs/vite';
export default defineConfig({
  plugins: [spacegraph()],
});
```

---

## Keyboard Shortcuts (Default)

| Key | Action |
|-----|--------|
| `Wheel` | Zoom at pointer |
| `Right drag` / `Left drag on void` | Pan |
| `Middle drag` | Orbit (perspective only) |
| `Click node` | Select |
| `Shift + Click` | Toggle select |
| `Shift + Drag void` | Box select |
| `Drag node` | Move node |
| `Double-click node` | Focus (zoom + center) |
| `Middle-click node` | Focus |
| `Delete` | Delete selected (if HistoryPlugin) |
| `Ctrl/Cmd + Z` | Undo (if HistoryPlugin) |
| `Ctrl/Cmd + Y` | Redo (if HistoryPlugin) |
| `+/-` | Zoom in/out |
| `0` | Reset camera |
| `F` | Fit view |
| `G` | Toggle grid (if ZoomBandsPlugin) |

---

## Bundle Size Optimization

Tree-shake by importing subpath exports:

```ts
// Instead of: import { SpaceGraph } from 'spacegraphjs'
// Use specific entry points:

import { SpaceGraph } from 'spacegraphjs/core';        // core engine only
import { HtmlNode, ShapeNode } from 'spacegraphjs/nodes';
import { Edge, CurvedEdge } from 'spacegraphjs/edges';
import { ForceLayout } from 'spacegraphjs/plugins/layouts';
import { InteractionPlugin } from 'spacegraphjs/plugins';
import { EventSystem } from 'spacegraphjs/core/events';
import { Graph } from 'spacegraphjs/core/Graph';
import { WebGLRenderer } from 'spacegraphjs/core/WebGLRenderer';
import { CameraControls } from 'spacegraphjs/core/CameraControls';
```

Or use the lean entry:

```ts
import { SpaceGraph } from 'spacegraphjs/activity';
```

---

## Common Gotchas

| Issue | Fix |
|-------|-----|
| `layoutOnce` doesn't move nodes on 2nd call | Ensure `randomize: true` or nodes have different positions; ForceLayout now resets state automatically |
| Edges invisible with HtmlNode | Add `type: 'Edge'` (or `CurvedEdge`, etc.) to edge spec; ensure source/target IDs match node IDs |
| `theme.nodeColor` / `theme.edgeColor` ignored | Use `theme: { node: { fill, stroke }, edge: { color } }` |
| `EdgeData.color` string rejected | Use hex number: `0x3b82f6` not `'#3b82f6'` |
| `setDepth('perspective')` throws | Use `'orbit'`, `'layered'`, or `'depth-stack'` |
| Nodes at (0,0,0) after `clear()` + `loadSpec()` | Call `layoutOnce` after `render()`; ForceLayout now works correctly |
| Bundle too large | Import from subpaths (`spacegraphjs/nodes`, etc.) or use `spacegraphjs/activity` |

---

## Migration from v7/v8

| Old | New |
|-----|-----|
| `theme.nodeColor` | `theme.node.fill` |
| `theme.edgeColor` | `theme.edge.color` |
| `sg.layout('force', opts)` | `sg.layoutOnce('force-layout', opts)` or `sg.layout('force-layout', opts)` |
| `DEFAULT_CHROME_PLUGINS` | Still exported, but use `chrome: true` in options |
| `DepthMode = 'perspective' \| ...` | `DepthMode = 'flat' \| 'layered' \| 'depth-stack' \| 'orbit'` |
| `HtmlNodeData` missing properties | Now fully typed (see schema above) |