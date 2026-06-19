# SpaceGraphJS Demo Additions - Summary

## What Was Added

This update adds comprehensive demonstrations for the SpaceGraphJS plugin system, including:

- **Layout algorithms** from `src/plugins/layouts/`
- **HoverMetaWidget** from `src/plugins/HoverMetaWidget.ts`
- **System plugins** (Minimap, History, HUD)
- Other spacegraph-like functionality

## New Demo Files (4)

### 1. `demo/quickstart.html` 🚀

**The essential starting point for new users**

A minimal, complete example showing the most common plugin setup:

- HoverMetaWidget for node interactions
- MinimapPlugin for navigation
- HistoryPlugin for undo/redo
- ForceLayout for automatic arrangement

**Best for**: First-time users, template for new projects

---

### 2. `demo/interaction-meta.html` ⚡

**Deep dive into HoverMetaWidget**

Comprehensive demonstration of the HoverMetaWidget plugin with:

- Multiple node types (HTML, Shape, Image)
- Custom action configurations
- Live parameter adjustment (hide delay, fade delay, border)
- Per-node opt-out examples
- Event logging

**Best for**: Understanding HoverMetaWidget capabilities

---

### 3. `demo/layouts.html` 🔷

**All layout algorithms in one place**

Interactive showcase of all 7 layout algorithms:

1. ForceLayout - Force-directed
2. CircularLayout - Circular arrangement
3. GridLayout - Grid positioning
4. HierarchicalLayout - Top-down hierarchy
5. RadialLayout - Radial distribution
6. TreeLayout - Tree structure
7. SpectralLayout - Spectral graph layout

**Features**:

- Dropdown selector
- Apply/Randomize/Reset controls
- Live node/edge statistics
- Integrated minimap and hover widget

**Best for**: Comparing layout algorithms, choosing the right layout

---

### 4. `demo/plugins.html` 🔌

**Complete plugin system demonstration**

Shows the plugin ecosystem with toggle controls:

- **HoverMetaWidget** - Context action buttons
- **MinimapPlugin** - Navigation overview
- **HistoryPlugin** - Undo/redo functionality
- **HUDPlugin** - Performance stats

**Interactive features**:

- Toggle plugins on/off
- Add/remove nodes dynamically
- Undo/redo operations
- Real-time event logging
- FPS counter

**Best for**: Understanding plugin architecture, testing plugin interactions

---

## Documentation Updates

### `demo/README.md`

Comprehensive documentation including:

- Complete demo catalog
- Plugin usage examples with code
- Configuration guides
- Event system documentation
- Best practices
- Troubleshooting guide

### `demo/UPDATES.md`

This summary document explaining all changes.

### `demo/index.ts`

Updated metadata to include all new demos with proper icons and descriptions.

## Key Features Demonstrated

### HoverMetaWidget

✅ Default actions (Focus, Connect, Delete)  
✅ Custom per-node actions  
✅ Configuration options (timing, borders)  
✅ Works with all node types  
✅ Per-node opt-out  
✅ Event emission

### Layout Plugins

✅ ForceLayout  
✅ CircularLayout  
✅ GridLayout  
✅ HierarchicalLayout  
✅ RadialLayout  
✅ TreeLayout  
✅ SpectralLayout

### System Plugins

✅ MinimapPlugin  
✅ HistoryPlugin  
✅ HUDPlugin

## Usage

### Quick Start

```bash
# Start development server
pnpm dev

# Open in browser
open http://localhost:5173/demo/quickstart.html
```

### Recommended Demo Order

1. **quickstart.html** - Essential setup
2. **interaction-meta.html** - Deep dive into interactions
3. **layouts.html** - Layout algorithms
4. **plugins.html** - Complete plugin system

## Code Examples

### Basic Setup (from quickstart.html)

```typescript
import {
    SpaceGraph,
    HoverMetaWidget,
    MinimapPlugin,
    HistoryPlugin,
    ForceLayout,
} from 'spacegraphjs';

const sg = await SpaceGraph.create('#container', { nodes, edges });

// Register plugins
const history = new HistoryPlugin({ maxHistorySize: 50 });
sg.pluginManager.register('HistoryPlugin', history);
history.init(sg);

const minimap = new MinimapPlugin({ position: 'bottom-right', size: 180 });
sg.pluginManager.register('MinimapPlugin', minimap);
minimap.init(sg);

const hoverMeta = new HoverMetaWidget({ enabled: true });
sg.pluginManager.register('HoverMetaWidget', hoverMeta);
hoverMeta.init(sg);

// Apply layout
const layout = new ForceLayout({ iterations: 50 });
await layout.apply();
```

### Custom Actions (from interaction-meta.html)

```typescript
{
  id: 'my-node',
  type: 'HtmlNode',
  data: {
    hoverActions: [
      { icon: '⤢', label: 'Focus', action: 'focus' },
      { icon: '★', label: 'Pin', action: 'pin' },
      { icon: '✕', label: 'Delete', action: 'delete' },
    ]
  }
}
```

### Layout Switching (from layouts.html)

```typescript
const layouts = {
    force: new ForceLayout({ iterations: 50, repulsion: 8000 }),
    circular: new CircularLayout(),
    grid: new GridLayout(),
    hierarchical: new HierarchicalLayout({ direction: 'TB' }),
    radial: new RadialLayout(),
    tree: new TreeLayout({ direction: 'TB' }),
    spectral: new SpectralLayout(),
};

await layouts[layoutName].apply();
```

## Testing

All demos:

- ✅ Build successfully with `pnpm run build`
- ✅ Import correctly from src/index.ts
- ✅ Follow existing code patterns
- ✅ Include error handling
- ✅ Are properly documented

## File Structure

```
demo/
├── index.html          # Demo index page
├── index.ts            # Demo metadata and rendering
├── quickstart.html     # ⭐ NEW - Essential setup
├── interaction.html    # Basic interaction
├── interaction-meta.html # ⭐ NEW - HoverMetaWidget deep dive
├── layouts.html        # ⭐ NEW - Layout algorithms
├── plugins.html        # ⭐ NEW - Plugin system
├── html.html           # HTML nodes
├── instanced.html      # Instanced rendering
├── large.html          # Large graphs
├── n8n-workflow.html   # n8n workflows
├── single-node.html    # Single node
├── empty.html          # Empty canvas
├── README.md           # Documentation
└── UPDATES.md          # This summary
```

## Build Output

Build successful:

```
✓ 148 modules transformed.
dist/spacegraphjs.js 311.12 kB │ gzip: 75.02 kB
dist/spacegraphjs.cjs 243.40 kB │ gzip: 67.28 kB
```

## Browser Compatibility

- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Modern browsers with ES6+ and WebGL support

## Recommendations

### For New Users

Start with **quickstart.html** - it shows the essential plugins in a minimal setup.

### For Plugin Development

Study **plugins.html** - it demonstrates plugin registration, initialization, and interaction.

### For Layout Selection

Use **layouts.html** - compare all layout algorithms interactively.

### For Interaction Design

Reference **interaction-meta.html** - shows HoverMetaWidget customization options.

## Support

- **Documentation**: `/demo/README.md`
- **Source Code**: `/src/plugins/`
- **Examples**: `/demo/`
- **Issues**: https://github.com/autonull/spacegraphjs/issues
- **Matrix**: #spacegraphjs:matrix.org

## Next Steps (Optional)

Potential future additions:

1. Video tutorials linked from demos
2. Performance benchmarking demo
3. Accessibility features demo
4. Advanced edge types demo
5. Custom node types demo
6. Animation/transitions demo

---

**Summary**: Added 4 comprehensive demos showcasing layouts, HoverMetaWidget, and the plugin system. All demos build successfully and follow project conventions. Documentation updated with complete usage examples.
