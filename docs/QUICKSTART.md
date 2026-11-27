# SpaceGraphJS Quickstart

**Get a working graph in 5 minutes.**

---

## Prerequisites

- Node.js 20.19+ or 22.12+
- pnpm 10+

---

## Your First Graph

### 1. Create a project

```bash
pnpm dlx create-spacegraph my-graph
cd my-graph
pnpm install
```

The scaffold writes `index.html`, `src/main.ts`, `tsconfig.json` and `vite.config.ts`, and declares
`spacegraphjs` and `three` as dependencies. Run `pnpm run dev` now to see a two-node graph.

### 2. Use this `index.html` (or keep the scaffold's version)

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
        <script type="module" src="/src/main.ts"></script>
    </body>
</html>
```

### 3. Replace `src/main.ts` with this graph

```typescript
import { SpaceGraph, type GraphSpec } from 'spacegraphjs';

const container = document.getElementById('container')!;

// SpaceGraph.create is an async factory that initializes the engine and loads the spec.
export const spec: GraphSpec = {
    nodes: [
        {
            id: 'node-a',
            type: 'ShapeNode',
            label: 'Node A',
            position: [0, 0, 0],
            data: { color: '#3366ff' },
        },
        {
            id: 'node-b',
            type: 'ShapeNode',
            label: 'Node B',
            position: [200, 0, 0],
            data: { color: '#ff6633' },
        },
        {
            id: 'node-c',
            type: 'ShapeNode',
            label: 'Node C',
            position: [100, 150, 0],
            data: { color: '#33ff66' },
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
};

const graph = await SpaceGraph.create(container, spec);

// The graph is ready to render.
graph.render();

console.log('🚀 SpaceGraph initialized!');
```

### 4. Keep the generated `vite.config.ts`

The scaffold writes the equivalent of:

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
pnpm run dev
```

Open http://localhost:5173 — you should see three connected nodes.

---

## Check quality (optional)

`spacegraphjs/quality` is one import for a legibility, accessibility and DOM-budget floor. It reads a
graph spec or `RenderModel`; it does not capture a screenshot or change a default.

```typescript
import { checkQuality } from 'spacegraphjs/quality';

const report = checkQuality(spec);
console.log(report.score, report.issues);
```

Pass the hidden DOM mirror to assert keyboard reachability, RTL direction and reduced motion:

```typescript
checkQuality(spec, { dom: mirror, direction: 'rtl', reducedMotion: true });
```

Measured defects can be corrected within a bounded number of edits. Each edit is re-checked; an edit
that does not improve the score is discarded. Preferences are never changed automatically — they are
logged for a human decision under ADR 0008.

```typescript
import { correctQuality } from 'spacegraphjs/quality';

const outcome = correctQuality(spec, { maxEdits: 2 });
console.log(outcome.before, outcome.after, outcome.applied);
```

The same floor is exposed as a non-throwing build report and a test gate:

```typescript
import { spacegraphVision, visionAssert } from 'spacegraphjs/quality';

const gate = spacegraphVision(spec, { minScore: 80 });
console.log(gate.passed, gate.grade, gate.issues);

const assertions = visionAssert(spec);
assertions.noOverlap();
assertions.meetsFloor(80);
```

`visionAssert.accessible()` checks the DOM mirror, so pass `dom` (and `direction` / `reducedMotion`
when relevant) to both helpers.

---

## Interactive Controls

| Gesture                       | Does                   |
| ----------------------------- | ---------------------- |
| Right button + drag           | Pan the view           |
| Left button + drag background | Pan the view           |
| Wheel                         | Zoom about the pointer |
| Middle click on a node        | Frame that node        |
| Middle button + drag          | Orbit (3D only)        |
| Left click on a node          | Select it              |
| Left drag on a node           | Move it                |
| Shift + drag on background    | Box-select             |

---

## Next Steps

### Try Different Node Types

```typescript
const graph = await SpaceGraph.create(container, {
    nodes: [
        {
            id: 'html-node',
            type: 'HtmlNode',
            label: 'HTML Content',
            position: [0, 0, 0],
            data: {
                html: '<div style="padding: 20px; background: white; border-radius: 8px; color: black;"><h3>Hello</h3><p>Rich HTML content</p></div>',
            },
        },
        {
            id: 'image-node',
            type: 'ImageNode',
            label: 'Image',
            position: [200, 0, 0],
            data: {
                url: 'https://picsum.photos/200/150',
            },
        },
    ],
    edges: [],
});
```

### Try Layout Engines

```typescript
import { ForceLayout } from 'spacegraphjs';

// Get a layout plugin instance
const layout = new ForceLayout({
    repulsion: 8000,
    iterations: 100,
});

// Initialize with the graph context
layout.init(graph, graph.graph, graph.events);

// Apply the layout
await layout.apply();
```

### Add a Quality Assertion to Tests

```typescript
// tests/graph.test.ts
import { expect, test } from 'vitest';
import { checkQuality } from 'spacegraphjs/quality';
import { spec } from '../src/main';

test('the graph meets the quality floor', () => {
    const report = checkQuality(spec, { minScore: 80 });
    expect(report.issues).toEqual([]);
});
```

---

## Examples

Runnable examples live in the demo registry:

| Example                                                | Description             |
| ------------------------------------------------------ | ----------------------- |
| [Quickstart](../app/demo/html/plugins/quickstart.html) | The scaffolded graph    |
| [Layouts](../app/demo/html/layout/layouts.html)        | Layout strategies       |
| [HTML nodes](../app/demo/html/rendering/html.html)     | Rich HTML content       |
| [Large graph](../app/demo/html/rendering/large.html)   | 1000+ nodes performance |

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

---

## Get Help

- **Documentation:** https://spacegraphjs.dev
- **GitHub Issues:** https://github.com/autonull/spacegraphjs/issues
- **Matrix Community:** https://matrix.to/#/#spacegraphjs:matrix.org

---

## What's Next?

1. **Explore the API** — Read the [API Reference](./api)
2. **Build something** — Create your first project
3. **Join the community** — Say hi on Matrix
4. **Contribute** — Check
   out [good first issues](https://github.com/autonull/spacegraphjs/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)

---

**Stop describing. Start specifying.** 🚀
