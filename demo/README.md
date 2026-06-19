# SpaceGraphJS Demos

This directory contains interactive demonstrations of SpaceGraphJS features, plugins, and capabilities.

## Quick Start

```bash
# Start the demo server
pnpm dev

# Or open any HTML file directly in a browser
open demo/index.html
```

## Demo Catalog

### Core Demos

#### **Empty** (`empty.html`)

Minimal setup with an empty graph canvas. Perfect starting point for new projects.

**Showcases:**

- Basic SpaceGraph initialization
- Empty container setup

---

#### **Single Node** (`single-node.html`)

Basic single node demonstration for understanding the fundamentals.

**Showcases:**

- Creating a simple node
- Basic rendering

---

#### **HTML** (`html.html`)

Demonstrates HTML/CSS nodes integration with custom styling.

**Showcases:**

- HTML-backed nodes
- Custom CSS styling
- DOM integration

---

### Interaction Demos

#### **Interaction** (`interaction.html`)

Basic node interaction and event handling demonstration.

**Showcases:**

- Node hover events
- Click interactions
- Drag operations
- Event logging

**Controls:**

- Hover over nodes to see hover events
- Click nodes to select
- Drag nodes to reposition

---

#### **Meta Widget** (`interaction-meta.html`)

HoverMetaWidget with context actions and customization options.

**Showcases:**

- **HoverMetaWidget** plugin with action buttons
- Custom action configurations per node
- Configuration controls (hide delay, fade delay, border)
- Different node types (HTML, Shape, Image)
- Per-node opt-out (`metaWidget: false`)

**Features:**

- **Default Actions**: Focus, Connect, Delete
- **Custom Actions**: Pin, Share, etc.
- **Live Configuration**: Adjust timing parameters in real-time
- **Border Toggle**: Show/hide the bounding border

**Controls:**

- Hover over nodes to reveal action toolbar
- Click action buttons to execute commands
- Adjust hide/fade delays using sliders
- Toggle border visibility

---

### Layout Demos

#### **Layouts** (`layouts.html`)

Comprehensive showcase of all layout algorithms with interactive switching.

**Showcases:**

- **ForceLayout**: Force-directed graph layout
- **CircularLayout**: Circular arrangement
- **GridLayout**: Grid-based positioning
- **HierarchicalLayout**: Top-down/bottom-up hierarchies
- **RadialLayout**: Radial distribution
- **TreeLayout**: Tree structure layout
- **SpectralLayout**: Spectral graph layout

**Controls:**

- Select layout algorithm from dropdown
- Apply layout button
- Randomize positions
- Reset camera view

**Plugins Used:**

- MinimapPlugin for navigation
- HoverMetaWidget for interactions

---

### Plugin Demos

#### **Plugins** (`plugins.html`)

Comprehensive plugin system demonstration with toggle controls.

**Showcases:**

**Interaction Plugins:**

- **HoverMetaWidget**: Context-aware action buttons
- **MinimapPlugin**: Miniature overview map

**System Plugins:**

- **HistoryPlugin**: Undo/redo functionality
- **HUDPlugin**: Heads-up display with stats

**Features:**

- Toggle plugins on/off
- Add/remove nodes dynamically
- Undo/redo operations (Ctrl+Z / Ctrl+Y)
- Real-time event logging
- FPS counter

**Controls:**

- Checkboxes to enable/disable plugins
- "Add Node" button to create nodes
- "Remove Node" button to delete nodes
- Undo/Redo buttons for history

---

### Advanced Demos

#### **Large** (`large.html`)

Large-scale graph with many nodes and edges for performance testing.

**Showcases:**

- Performance with large datasets
- Rendering optimization
- Memory management

---

#### **n8n Workflow** (`n8n-workflow.html`)

Visualizes n8n workflow automation graphs.

**Showcases:**

- Workflow visualization
- Node type differentiation
- Edge routing

---

## Plugin Examples

### HoverMetaWidget

```typescript
import { HoverMetaWidget } from 'spacegraphjs';

const metaWidget = new HoverMetaWidget({
    enabled: true, // Global enable/disable
    hideDelay: 400, // ms before hiding after hover ends
    fadeDelay: 3500, // ms before auto-fade
    fadeDuration: 700, // fade transition duration
    showBorder: true, // Show bounding border
    borderStyle: '2px dashed rgba(139, 92, 246, 0.75)',
    borderRadius: '10px',
});

sg.pluginManager.register('HoverMetaWidget', metaWidget);
metaWidget.init(sg);
```

**Per-node configuration:**

```typescript
{
  id: 'my-node',
  type: 'HtmlNode',
  data: {
    // Disable widget for this node
    metaWidget: false,

    // Custom actions for this node
    hoverActions: [
      { icon: '⤢', label: 'Focus', action: 'focus' },
      { icon: '★', label: 'Pin', action: 'pin' },
      { icon: '✕', label: 'Delete', action: 'delete' },
    ]
  }
}
```

### MinimapPlugin

```typescript
import { MinimapPlugin } from 'spacegraphjs';

const minimap = new MinimapPlugin({
    position: 'bottom-right', // 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
    size: 180, // Size in pixels
    margin: 12, // Margin from edge
    bgColor: 0x0a0a0a, // Background color
    alpha: 0.9, // Opacity
    zoom: 1500, // Zoom level
});

sg.pluginManager.register('MinimapPlugin', minimap);
minimap.init(sg);
```

### HistoryPlugin

```typescript
import { HistoryPlugin } from 'spacegraphjs';

const history = new HistoryPlugin({
    maxHistorySize: 50, // Maximum undo states
    enabled: true, // Enable/disable
});

sg.pluginManager.register('HistoryPlugin', history);
history.init(sg);

// Usage
history.undo();
history.redo();
history.canUndo();
history.canRedo();
```

### Layout Plugins

```typescript
import {
    ForceLayout,
    CircularLayout,
    GridLayout,
    HierarchicalLayout,
    RadialLayout,
    TreeLayout,
    SpectralLayout,
} from 'spacegraphjs';

// Force-directed layout
const force = new ForceLayout({
    iterations: 50,
    repulsion: 8000,
    attraction: 0.02,
    damping: 0.9,
});
await force.apply();

// Circular layout
const circular = new CircularLayout();
await circular.apply();

// Grid layout
const grid = new GridLayout({ rows: 5, cols: 5 });
await grid.apply();
```

## Event System

All demos use the SpaceGraph event system:

```typescript
// Node events
sg.events.on('node:click', ({ node }) => {});
sg.events.on('node:pointerenter', ({ node }) => {});
sg.events.on('node:pointerleave', () => {});
sg.events.on('node:added', ({ node }) => {});
sg.events.on('node:removed', ({ id }) => {});

// Meta action events
sg.events.on('node:metaaction', ({ node, action }) => {
    switch (action) {
        case 'focus':
            /* ... */ break;
        case 'delete':
            /* ... */ break;
        case 'connect':
            /* ... */ break;
        case 'pin':
            /* ... */ break;
    }
});

// Interaction events
sg.events.on('interaction:dragstart', () => {});
sg.events.on('interaction:dragend', ({ node }) => {});

// Graph events
sg.events.on('graph:click', () => {});
```

## Best Practices

1. **Plugin Registration**: Always register and initialize plugins in order
2. **Event Cleanup**: Use `sg.dispose()` when done
3. **Performance**: Use appropriate LOD settings for large graphs
4. **Customization**: Most plugins accept configuration options
5. **Type Safety**: Use TypeScript for better development experience

## Troubleshooting

**Widget not appearing?**

- Check if `enabled: true` in options
- Verify node doesn't have `metaWidget: false`
- Ensure plugin is initialized with `.init(sg)`

**Layout not working?**

- Ensure graph has nodes before applying layout
- Check that layout plugin is properly imported
- Verify async/await usage for layout.apply()

**Performance issues?**

- Reduce node count in large.html demo
- Adjust LOD settings
- Use simpler node types for large graphs

## Contributing

When adding new demos:

1. Follow existing naming conventions
2. Include clear comments
3. Add to DEMO_METADATA in index.ts
4. Test in multiple browsers
5. Document features and controls

## Support

- Matrix: #spacegraphjs:matrix.org
- GitHub: https://github.com/autonull/spacegraphjs
- npm: https://www.npmjs.com/package/spacegraphjs
