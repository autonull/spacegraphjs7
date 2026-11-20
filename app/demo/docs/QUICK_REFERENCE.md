> Historical notes from the pre-merge `demo/` tree. Paths below use the old layout; the pages now live under `app/demo/` and resolve at `/<name>.html`.

# SpaceGraphJS Demos - Quick Reference

## 🚀 Start Here

- **Quick Start**: `demo/html/plugins/quickstart.html` - Essential setup with common plugins
- **Demo Index**: `demo/index.html` - Browse all demos

## 📚 Demo Guide

### For First-Time Users

1. **html/plugins/quickstart.html** 🚀 - Essential setup, minimal example
2. **html/interaction/interaction-meta.html** ⚡ - Node interactions and actions
3. **html/layout/layouts.html** 🔷 - Layout algorithms
4. **html/plugins/plugins.html** 🔌 - Complete plugin system

### For Plugin Development

- **html/plugins/plugins.html** - Plugin registration and lifecycle
- **html/plugins/quickstart.html** - Minimal plugin setup
- **html/interaction/interaction-meta.html** - Event handling

### For Layout Selection

- **html/layout/layouts.html** - All 7 layout algorithms with live preview

### For Interaction Design

- **html/interaction/interaction-meta.html** - HoverMetaWidget customization
- **html/interaction/interaction.html** - Basic event handling

## 📦 What's Demonstrated

### Plugins

| Plugin          | Demo                       | Description                     |
| --------------- | -------------------------- | ------------------------------- |
| HoverMetaWidget | html/interaction/interaction-meta.html      | Context action buttons on hover |
| MinimapPlugin   | html/plugins/plugins.html, html/layout/layouts.html | Navigation overview             |
| HistoryPlugin   | html/plugins/plugins.html               | Undo/redo functionality         |
| HUDPlugin       | html/plugins/plugins.html               | Performance stats overlay       |

### Layouts

| Layout             | Description          | Best For                  |
| ------------------ | -------------------- | ------------------------- |
| ForceLayout        | Force-directed       | General purpose graphs    |
| CircularLayout     | Circular arrangement | Cyclic structures         |
| GridLayout         | Grid positioning     | Organized layouts         |
| HierarchicalLayout | Top-down hierarchy   | Organizational charts     |
| RadialLayout       | Radial distribution  | Central hub structures    |
| TreeLayout         | Tree structure       | Family trees, hierarchies |
| SpectralLayout     | Spectral graph       | Clustering visualization  |

## 💻 Quick Commands

```bash
# Start development server
pnpm dev

# Build for production
pnpm run build

# Run demos
open demo/html/plugins/quickstart.html
open demo/html/layout/layouts.html
open demo/html/plugins/plugins.html
open demo/html/interaction/interaction-meta.html
```

## 🔧 Code Templates

### Minimal Setup

```typescript
import { SpaceGraph, HoverMetaWidget, MinimapPlugin, HistoryPlugin } from 'spacegraphjs';

const sg = await SpaceGraph.create('#container', { nodes, edges });

sg.pluginManager.register('HoverMetaWidget', new HoverMetaWidget()).init(sg);
sg.pluginManager.register('MinimapPlugin', new MinimapPlugin()).init(sg);
sg.pluginManager.register('HistoryPlugin', new HistoryPlugin()).init(sg);
```

### Custom Actions

```typescript
{
  id: 'node-1',
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

### Layout Application

```typescript
import { ForceLayout } from 'spacegraphjs';

const layout = new ForceLayout({ iterations: 50, repulsion: 8000 });
await layout.apply();
```

## 📖 Documentation

- **README.md** - Complete demo documentation
- **UPDATES.md** - What was added
- **ADDITIONS_SUMMARY.md** - Detailed summary

## 🎯 Key Features

### HoverMetaWidget

- Context-aware action buttons
- Customizable per node
- Configurable timing and appearance
- Works with all node types

### Layout System

- 7 layout algorithms
- Interactive switching
- Configurable parameters
- Smooth animations

### Plugin Architecture

- Easy registration
- Lifecycle management
- Event-driven
- Modular design

## 🐛 Troubleshooting

**Widget not showing?**

- Check `enabled: true` in options
- Verify node doesn't have `metaWidget: false`
- Ensure plugin is initialized

**Layout not working?**

- Ensure graph has nodes before applying
- Use async/await for layout.apply()
- Check layout plugin is imported

**Build errors?**

```bash
pnpm install
pnpm run build
```

## 📊 Demo Statistics

- **Total Demos**: 14+ HTML files
- **New Demos**: 4 comprehensive examples
- **Plugins Demonstrated**: 4 major plugins
- **Layouts Shown**: 7 algorithms
- **Documentation Pages**: 3 (README, UPDATES, SUMMARY)

## 🔗 Links

- **Source**: `/src/plugins/`
- **Demos**: `/demo/`
- **Docs**: `/demo/README.md`
- **GitHub**: https://github.com/autonull/spacegraphjs

---

**Quick Start**: Open `demo/html/plugins/quickstart.html` to see essential plugins in action!
