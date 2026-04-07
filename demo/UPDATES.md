# Demo Updates Summary

## Overview

Added comprehensive demonstrations for SpaceGraphJS plugins, layouts, and interaction features to address the need for showcasing `src/plugins/layouts/`, `HoverMetaWidget.ts`, and other spacegraph-like functionality.

## New Demo Files

### 1. **quickstart.html** 🚀

**Purpose**: Essential setup with common plugins - the go-to starting point

**Features**:

- Complete minimal setup with essential plugins
- HoverMetaWidget for node actions
- MinimapPlugin for navigation
- HistoryPlugin for undo/redo
- ForceLayout for auto-arrangement
- Clear inline documentation

**Showcases**:

```typescript
- HoverMetaWidget (node hover actions)
- MinimapPlugin (bottom-right navigation)
- HistoryPlugin (undo/redo support)
- ForceLayout (automatic positioning)
```

---

### 2. **interaction-meta.html** ⚡

**Purpose**: Deep dive into HoverMetaWidget functionality

**Features**:

- Multiple node types (HTML, Shape, Image)
- Custom action configurations per node
- Live configuration controls
- Real-time parameter adjustment
- Per-node opt-out demonstration

**Configuration Controls**:

- Hide delay slider (0-2000ms)
- Fade delay slider (0-10000ms)
- Border toggle

**Node Examples**:

- **Basic Node**: Standard Focus/Connect/Delete actions
- **Custom Actions**: Focus/Pin/Share/Delete
- **No Widget**: Demonstrates `metaWidget: false`
- **3D Shape**: Shows widget works with ShapeNode
- **Image Node**: Shows widget works with ImageNode

---

### 3. **layouts.html** 🔷

**Purpose**: Comprehensive layout algorithm showcase

**Features**:

- Interactive layout switching
- All 7 major layout algorithms
- Sample hierarchical graph structure
- Minimap for navigation
- HoverMetaWidget integration

**Layouts Demonstrated**:

1. **ForceLayout** - Force-directed graph layout
2. **CircularLayout** - Circular arrangement
3. **GridLayout** - Grid-based positioning
4. **HierarchicalLayout** - Top-down hierarchy
5. **RadialLayout** - Radial distribution
6. **TreeLayout** - Tree structure
7. **SpectralLayout** - Spectral graph layout

**Controls**:

- Layout algorithm dropdown
- Apply Layout button
- Randomize Positions button
- Reset Camera button
- Node/Edge count display

---

### 4. **plugins.html** 🔌

**Purpose**: Plugin system demonstration with toggle controls

**Features**:

- Toggle plugins on/off
- Dynamic node addition/removal
- Undo/Redo functionality
- Real-time event logging
- FPS counter
- Live statistics

**Plugins Demonstrated**:

**Interaction Plugins**:

- HoverMetaWidget - Context action buttons
- MinimapPlugin - Miniature overview

**System Plugins**:

- HistoryPlugin - Undo/redo (Ctrl+Z/Ctrl+Y)
- HUDPlugin - Heads-up display

**Controls**:

- Checkboxes for each plugin
- Add Node button
- Remove Node button
- Undo/Redo buttons
- Clear Log button

---

## Updated Files

### demo/index.ts

Added metadata for new demos:

```typescript
'interaction-meta.html': {
  name: 'Meta Widget',
  icon: '⚡',
  description: 'HoverMetaWidget with context actions and customization'
},
'layouts.html': {
  name: 'Layouts',
  icon: '🔷',
  description: 'Layout algorithms: Force, Circular, Grid, Tree, etc.'
},
'plugins.html': {
  name: 'Plugins',
  icon: '🔌',
  description: 'Plugin system: Minimap, History, HUD, and more'
},
'quickstart.html': {
  name: 'Quick Start',
  icon: '🚀',
  description: 'Essential setup with common plugins - start here!'
},
```

### demo/README.md

Created comprehensive documentation including:

- Demo catalog with descriptions
- Plugin usage examples
- Configuration guides
- Event system documentation
- Best practices
- Troubleshooting guide

## Plugin Exports Verified

All demos properly import from `../src/index.ts`:

```typescript
import {
    SpaceGraph,
    HoverMetaWidget,
    MinimapPlugin,
    HistoryPlugin,
    HUDPlugin,
    ForceLayout,
    CircularLayout,
    GridLayout,
    HierarchicalLayout,
    RadialLayout,
    TreeLayout,
    SpectralLayout,
} from '../src/index.ts';
```

## Key Features Demonstrated

### HoverMetaWidget

- ✅ Default actions (Focus, Connect, Delete)
- ✅ Custom per-node actions
- ✅ Configuration options (hideDelay, fadeDelay, showBorder)
- ✅ Works with all node types (HTML, Shape, Image)
- ✅ Per-node opt-out
- ✅ Event emission (node:metaaction)

### Layout Plugins

- ✅ ForceLayout (force-directed)
- ✅ CircularLayout (circular arrangement)
- ✅ GridLayout (grid positioning)
- ✅ HierarchicalLayout (top-down)
- ✅ RadialLayout (radial distribution)
- ✅ TreeLayout (tree structure)
- ✅ SpectralLayout (spectral)

### System Plugins

- ✅ MinimapPlugin (navigation)
- ✅ HistoryPlugin (undo/redo)
- ✅ HUDPlugin (stats overlay)

### Interaction Features

- ✅ Node hover detection
- ✅ Context action buttons
- ✅ Drag and drop
- ✅ Event logging
- ✅ Dynamic node management

## Testing

All demos:

- ✅ Import correctly from src/index.ts
- ✅ Use proper TypeScript types
- ✅ Follow existing code patterns
- ✅ Include error handling
- ✅ Have clear documentation

## Usage

```bash
# Start development server
pnpm dev

# Access demos at:
# http://localhost:5173/demo/index.html
# http://localhost:5173/demo/quickstart.html
# http://localhost:5173/demo/interaction-meta.html
# http://localhost:5173/demo/layouts.html
# http://localhost:5173/demo/plugins.html
```

## File Sizes

- quickstart.html: ~5KB - Minimal, fast loading
- interaction-meta.html: ~14KB - Feature-rich
- layouts.html: ~9.5KB - Comprehensive
- plugins.html: ~17KB - Complete showcase

## Browser Compatibility

All demos tested to work with:

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ support required
- WebGL support required for 3D rendering

## Next Steps

Recommended additions:

1. Add TypeScript configuration examples
2. Create video tutorials linked from demos
3. Add more edge type demonstrations
4. Include performance benchmarking demo
5. Add accessibility features demo

## Support

- Documentation: `/demo/README.md`
- Source: `/src/plugins/`
- Examples: `/demo/`
