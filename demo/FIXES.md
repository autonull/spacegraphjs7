# Bug Fixes Applied

## Issue: Layout plugins not properly initialized

### Problem

Layout plugins (ForceLayout, CircularLayout, etc.) extend `BaseLayout` which implements the `Plugin` interface. They require initialization with the graph instance before use. The demos were calling `layout.apply()` without first calling `layout.init()`, causing:

```
TypeError: Cannot read properties of undefined (reading 'getNodes')
at ForceLayout.apply (ForceLayout.ts:43:45)
```

### Root Cause

Layouts need three parameters in their `init()` method:

- `sg: SpaceGraph` - The SpaceGraph instance
- `graph: Graph` - The graph instance
- `events: EventSystem` - The event system

Without initialization, `this.graph` is undefined, so `this.graph.getNodes()` fails.

### Solution

Properly initialize all layout plugins with the graph instance:

```typescript
// Before (broken):
const forceLayout = new ForceLayout({ iterations: 50 });
await forceLayout.apply();

// After (fixed):
const forceLayout = new ForceLayout({ iterations: 50 });
forceLayout.init(sg, sg.graph, sg.events);
await forceLayout.apply();
```

### Files Fixed

- ✅ `demo/plugins.html` - Added init() call for ForceLayout
- ✅ `demo/quickstart.html` - Added init() call for ForceLayout
- ✅ `demo/interaction-meta.html` - Added init() call for ForceLayout
- ✅ `demo/layouts.html` - Initialize all layouts after graph creation, not before

### Complete Pattern

```typescript
import { SpaceGraph, ForceLayout } from 'spacegraphjs';

const sg = await SpaceGraph.create('#container', { nodes, edges });

// Create layout instance
const layout = new ForceLayout({ iterations: 50, repulsion: 8000 });

// Initialize with graph context
layout.init(sg, sg.graph, sg.events);

// Apply the layout
await layout.apply();
```

### Important Note for Multiple Layouts

When using multiple layouts (like in layouts.html), create and initialize them **after** the graph is created:

```typescript
// ❌ Wrong - layouts created before graph exists
let layouts;
const layouts = {
  force: new ForceLayout(),
  circular: new CircularLayout()
};
const sg = await SpaceGraph.create(...);
layouts.force.init(sg, sg.graph, sg.events); // Too late!

// ✅ Correct - create and initialize after graph
const sg = await SpaceGraph.create(...);
const layouts = {
  force: new ForceLayout(),
  circular: new CircularLayout()
};
Object.values(layouts).forEach(l => l.init(sg, sg.graph, sg.events));
```

### Why This Works

Layout plugins follow the same pattern as other SpaceGraphJS plugins:

1. **Create** the plugin instance with configuration
2. **Register** with plugin manager (optional for layouts)
3. **Initialize** with `init(sg, graph, events)`
4. **Use** the plugin (call `apply()`)

This ensures the layout has access to:

- `this.graph` - to get nodes and edges
- `this.events` - to emit layout events
- `this.config` - properly initialized configuration

### Verification

All demos now build and run without errors:

```bash
pnpm run build  # ✓ Success
```

All demos properly initialize layouts:

- ✅ quickstart.html
- ✅ interaction-meta.html
- ✅ layouts.html
- ✅ plugins.html
