# SpaceGraphJS Quickstart

**Get a working graph in 5 minutes.**

---

## Prerequisites

- Node.js 18+
- pnpm or pnpm

---

## Installation

```bash
pnpm install spacegraphjs three
```

---

## Your First Graph

### 1. Create a project

```bash
mkdir my-graph && cd my-graph
pnpm create -y
pnpm install spacegraphjs three vite
```

### 2. Create `index.html`

```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>My First SpaceGraph</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            #container {
                width: 100vw;
                height: 100vh;
                overflow: hidden;
            }
        </style>
    </head>
    <body>
        <div id="container"></div>
        <script type="module" src="/main.ts"></script>
    </body>
</html>
```

### 3. Create `main.ts`

```typescript
import { SpaceGraph } from 'spacegraphjs';

const container = document.getElementById('container')!;

const graph = SpaceGraph.create(container, {
    nodes: [
        {
            id: 'node-a',
            type: 'ShapeNode',
            label: 'Node A',
            position: [0, 0, 0],
            data: { color: 0x3366ff },
        },
        {
            id: 'node-b',
            type: 'ShapeNode',
            label: 'Node B',
            position: [200, 0, 0],
            data: { color: 0xff6633 },
        },
        {
            id: 'node-c',
            type: 'ShapeNode',
            label: 'Node C',
            position: [100, 150, 0],
            data: { color: 0x33ff66 },
        },
    ],
    edges: [
        {
            id: 'edge-ab',
            source: 'node-a',
            target: 'node-b',
            type: 'Edge',
        },
        {
            id: 'edge-bc',
            source: 'node-b',
            target: 'node-c',
            type: 'Edge',
        },
        {
            id: 'edge-ca',
            source: 'node-c',
            target: 'node-a',
            type: 'Edge',
        },
    ],
});

graph.render();

console.log('🚀 SpaceGraph initialized!');
```

### 4. Create `vite.config.ts`

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        port: 5173,
    },
});
```

### 5. Run

```bash
pnpm dlx vite
```

Open http://localhost:5173 — you should see three connected nodes.

---

## Interactive Controls

| Action           | Control            |
| ---------------- | ------------------ |
| **Rotate**       | Left-click + drag  |
| **Pan**          | Right-click + drag |
| **Zoom**         | Scroll wheel       |
| **Select Node**  | Click on node      |
| **Multi-select** | Shift + click      |

---

## Enable Vision System (Optional)

The vision system analyzes your graph and auto-fixes quality issues.

### 1. Install vision plugin

```bash
pnpm install spacegraphjs
```

### 2. Update `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import { spacegraphVision } from 'spacegraphjs/vision';

export default defineConfig({
    plugins: [
        spacegraphVision({
            enabled: true,
            autoFix: true,
            thresholds: {
                layout: 80,
                legibility: 85,
            },
        }),
    ],
});
```

### 3. Run with vision

```bash
pnpm dlx vite
```

The vision plugin will analyze your graph on build and report:

- Layout quality score
- Overlapping nodes
- Text legibility issues
- Color harmony suggestions

---

## Next Steps

### Try Different Node Types

```typescript
const graph = SpaceGraph.create(container, {
    nodes: [
        {
            id: 'html-node',
            type: 'HtmlNode',
            label: 'HTML Content',
            position: [0, 0, 0],
            data: {
                content:
                    '<div style="padding: 20px; background: white; border-radius: 8px;"><h3>Hello</h3><p>Rich HTML content</p></div>',
            },
        },
        {
            id: 'image-node',
            type: 'ImageNode',
            label: 'Image',
            position: [200, 0, 0],
            data: {
                src: 'https://picsum.photos/200/150',
            },
        },
    ],
    edges: [],
});
```

### Try Layout Engines

```typescript
import { ForceLayout } from 'spacegraphjs';

const layout = new ForceLayout(graph, {
    nodeDistance: 150,
    iterations: 100,
});

await layout.apply();
```

### Add Vision Assertions to Tests

```typescript
// tests/graph.test.ts
import { test, expect } from 'vitest';
import { visionAssert } from 'spacegraphjs/vision-test';

test('graph has no overlaps', async () => {
    await visionAssert.noOverlap('my-graph');
});

test('all text is legible', async () => {
    await visionAssert.allTextLegible('my-graph');
});

test('meets WCAG AA', async () => {
    await visionAssert.wcagCompliance('my-graph', 'AA');
});
```

---

## Examples

| Example                                 | Description             |
| --------------------------------------- | ----------------------- |
| [Basic Graph](./examples/basic)         | Simple nodes and edges  |
| [HTML Nodes](./examples/html-nodes)     | Rich HTML content       |
| [Image Nodes](./examples/images)        | Image textures          |
| [Force Layout](./examples/force-layout) | Physics-based layout    |
| [Large Graph](./examples/large)         | 1000+ nodes performance |

---

## Troubleshooting

### "Module not found: spacegraphjs"

Make sure you installed the package:

```bash
pnpm install spacegraphjs three
```

### "Three is not defined"

Three.js is a peer dependency:

```bash
pnpm install three
```

### Graph doesn't render

1. Check browser console for errors
2. Ensure container has dimensions (`width: 100vw; height: 100vh;`)
3. Call `graph.render()` after creating the graph

### Vision plugin not working

1. Ensure `enabled: true` in config
2. Check build output for vision reports
3. Verify thresholds are reasonable (0-100)

---

## Get Help

- **Documentation:** https://spacegraphjs.dev
- **GitHub Issues:** https://github.com/autonull/spacegraphjs/issues
- **Matrix Community:** https://matrix.to/#/#spacegraphjs:matrix.org

---

## What's Next?

1. **Explore the API** — Read the [API Reference](./docs/api)
2. **Build something** — Create your first project
3. **Join the community** — Say hi on Matrix
4. **Contribute** — Check out [good first issues](https://github.com/autonull/spacegraphjs/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)

---

**Stop describing. Start specifying.** 🚀
