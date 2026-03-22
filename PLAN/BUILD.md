# SpaceGraphJS — Build & Launch Guide

**Days 0-17: From Zero to Published**

---

## Overview

| Phase      | Days  | Focus              | Outcome                 |
| ---------- | ----- | ------------------ | ----------------------- |
| **Build**  | 0-14  | Core development   | Working, tested library |
| **Launch** | 15-17 | Publish + announce | npm package, community  |

**Total time:** 66 hours over 17 days (part-time, 4h/day)

---

## Build Phase (Days 0-14)

### Day 0: Environment Setup (1 hour)

**Goal:** Verified environment, clean project structure

```bash
# Verify prerequisites
node --version  # Should be v18+
npm --version   # Should be 9+
git --version   # Should be 2+

# Create project
mkdir spacegraphjs && cd spacegraphjs
git init
git checkout -b main

# Create .gitignore
cat > .gitignore << 'EOF'
node_modules/
dist/
*.log
.DS_Store
.env
EOF

git add .gitignore
git commit -m "Initial commit: project structure"
```

**✅ Success Criteria:**

- [ ] Node.js v18+ installed
- [ ] Git repo initialized
- [ ] Clean working directory

---

### Day 1: Project Setup (4 hours)

**Goal:** Complete build configuration

**Step 1: Initialize npm**

```bash
npm init -y
```

**Step 2: Edit package.json**

```json
{
    "name": "spacegraphjs",
    "version": "0.0.0-dev",
    "type": "module",
    "main": "./dist/spacegraphjs.js",
    "module": "./dist/spacegraphjs.js",
    "types": "./dist/types/index.d.ts",
    "exports": {
        ".": {
            "types": "./dist/types/index.d.ts",
            "import": "./dist/spacegraphjs.js"
        }
    },
    "files": ["dist", "README.md", "LICENSE"],
    "scripts": {
        "dev": "vite",
        "build": "tsc && vite build",
        "preview": "vite preview",
        "clean": "rm -rf dist/"
    },
    "peerDependencies": {
        "three": ">=0.150.0"
    },
    "devDependencies": {
        "@types/node": "^20.10.0",
        "@types/three": "^0.160.0",
        "typescript": "^5.3.2",
        "vite": "^5.0.0",
        "three": "^0.160.0"
    },
    "license": "MIT"
}
```

**Step 3: Create tsconfig.json**

```json
{
    "compilerOptions": {
        "target": "ES2020",
        "module": "ESNext",
        "lib": ["ES2020", "DOM", "DOM.Iterable"],
        "skipLibCheck": true,
        "moduleResolution": "bundler",
        "resolveJsonModule": true,
        "isolatedModules": true,
        "noEmit": true,
        "declaration": true,
        "declarationDir": "./dist/types",
        "strict": true,
        "esModuleInterop": true,
        "allowSyntheticDefaultImports": true,
        "forceConsistentCasingInFileNames": true
    },
    "include": ["src"],
    "exclude": ["node_modules", "dist"]
}
```

**Step 4: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'SpaceGraphJS',
            fileName: 'spacegraphjs',
        },
        rollupOptions: {
            external: ['three'],
            output: {
                globals: {
                    three: 'THREE',
                },
            },
        },
        sourcemap: true,
        minify: false,
    },
    server: {
        port: 5173,
        open: false,
    },
});
```

**Step 5: Create source files**

```bash
mkdir src
```

**src/index.ts:**

```typescript
console.log('[SpaceGraphJS] Loading...');

export { SpaceGraph } from './SpaceGraph';
export type { GraphSpec, NodeSpec, EdgeSpec } from './types';

console.log('[SpaceGraphJS] Loaded successfully');
```

**src/types.ts:**

```typescript
export interface NodeSpec {
    id: string;
    type: string;
    label?: string;
    position?: [number, number, number];
    data?: Record<string, any>;
}

export interface EdgeSpec {
    id: string;
    source: string;
    target: string;
    type: string;
    data?: Record<string, any>;
}

export interface GraphSpec {
    nodes: NodeSpec[];
    edges: EdgeSpec[];
}
```

**Step 6: Install dependencies**

```bash
npm install
```

**Step 7: Create LICENSE**

```bash
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2026 autonull

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
```

**Step 8: Create minimal README.md**

````markdown
# SpaceGraphJS

The first self-building UI framework.

## Quickstart

```bash
npm install spacegraphjs three
```
````

## License

MIT

````

**Step 9: Commit**

```bash
git add .
git commit -m "Day 1: Project setup with package.json, tsconfig, vite config"
````

**✅ Success Criteria:**

- [ ] `npm install` works without errors
- [ ] `npm run build` shows expected TypeScript error (no source yet)
- [ ] Git commit successful

---

### Day 2: SpaceGraph Class (4 hours)

**Goal:** Working SpaceGraph class with basic rendering

**Create src/SpaceGraph.ts:**

```typescript
import * as THREE from 'three';
import type { GraphSpec } from './types';

console.log('[SpaceGraph] Module loading...');

export class SpaceGraph {
    private container: HTMLElement;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private nodes: Map<string, THREE.Mesh> = new Map();
    private edges: THREE.Line[] = [];

    constructor(container: HTMLElement) {
        console.log('[SpaceGraph] Initializing...');
        this.container = container;

        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);

        // Camera setup
        const aspect = container.clientWidth / container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 10000);
        this.camera.position.set(0, 0, 500);

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(this.renderer.domElement);

        console.log('[SpaceGraph] Three.js initialized');

        // Handle resize
        window.addEventListener('resize', () => this.onResize());

        // Setup controls
        this.setupControls();
    }

    static create(container: string | HTMLElement, spec: GraphSpec): SpaceGraph {
        console.log('[SpaceGraph] Creating instance...');
        const element =
            typeof container === 'string' ? document.querySelector(container)! : container;

        if (!element) {
            throw new Error('Container not found: ' + container);
        }

        const graph = new SpaceGraph(element);
        graph.loadSpec(spec);
        console.log('[SpaceGraph] Instance created successfully');
        return graph;
    }

    loadSpec(spec: GraphSpec): void {
        console.log('[SpaceGraph] Loading spec...');

        if (spec.nodes && spec.nodes.length > 0) {
            console.log('[SpaceGraph] Creating', spec.nodes.length, 'nodes');
            for (const nodeSpec of spec.nodes) {
                this.createNode(nodeSpec);
            }
        }

        if (spec.edges && spec.edges.length > 0) {
            console.log('[SpaceGraph] Creating', spec.edges.length, 'edges');
            for (const edgeSpec of spec.edges) {
                this.createEdge(edgeSpec);
            }
        }

        console.log('[SpaceGraph] Spec loaded successfully');
    }

    createNode(spec: any): void {
        console.log('[SpaceGraph] Creating node:', spec.id);

        const geometry = new THREE.SphereGeometry(20, 32, 32);
        const material = new THREE.MeshBasicMaterial({
            color: spec.data?.color || 0x3366ff,
        });
        const sphere = new THREE.Mesh(geometry, material);

        if (spec.position) {
            sphere.position.set(spec.position[0], spec.position[1], spec.position[2]);
        }

        this.scene.add(sphere);
        this.nodes.set(spec.id, sphere);
        console.log('[SpaceGraph] Node created:', spec.id);
    }

    createEdge(spec: any): void {
        console.log('[SpaceGraph] Creating edge:', spec.id);

        const sourceNode = this.nodes.get(spec.source);
        const targetNode = this.nodes.get(spec.target);

        if (!sourceNode || !targetNode) {
            console.warn('[SpaceGraph] Edge missing nodes:', spec);
            return;
        }

        const points = [sourceNode.position, targetNode.position];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0x666666 });
        const line = new THREE.Line(geometry, material);

        this.scene.add(line);
        this.edges.push(line);
        console.log('[SpaceGraph] Edge created:', spec.id);
    }

    render(): void {
        console.log('[SpaceGraph] Rendering...');
        this.renderer.render(this.scene, this.camera);
        console.log('[SpaceGraph] Render complete');
    }

    private onResize(): void {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    private setupControls(): void {
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        let spherical = { theta: 0, phi: Math.PI / 2, radius: 500 };

        const updateCameraPosition = () => {
            this.camera.position.x =
                spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
            this.camera.position.y = spherical.radius * Math.cos(spherical.phi);
            this.camera.position.z =
                spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
            this.camera.lookAt(0, 0, 0);
        };

        const canvas = this.renderer.domElement;

        canvas.addEventListener('mousedown', () => {
            isDragging = true;
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;

            spherical.theta -= deltaX * 0.005;
            spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi + deltaY * 0.005));

            updateCameraPosition();
            previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        canvas.addEventListener('mouseup', () => {
            isDragging = false;
        });

        canvas.addEventListener('wheel', (e) => {
            spherical.radius = Math.max(100, Math.min(2000, spherical.radius + e.deltaY));
            updateCameraPosition();
        });

        updateCameraPosition();
        console.log('[SpaceGraph] Controls initialized');
    }
}
```

**Test build:**

```bash
npm run build
```

**Expected output:**

```
✓ built in 1.2s
dist/
├── spacegraphjs.js
└── types/
    └── index.d.ts
```

**Commit:**

```bash
git add .
git commit -m "Day 2: Core SpaceGraph class with basic rendering"
```

**✅ Success Criteria:**

- [ ] `npm run build` completes without errors
- [ ] `dist/` directory created with spacegraphjs.js and types/
- [ ] Git commit successful

---

### Days 3-4: Basic Demo (6 hours)

**Goal:** Working demo with 3 nodes and 3 edges

**Step 1: Create demo directory**

```bash
mkdir demo
```

**Step 2: Create demo/index.html**

```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>SpaceGraphJS Demo</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                overflow: hidden;
            }
            #container {
                width: 100vw;
                height: 100vh;
            }
            #status {
                position: fixed;
                top: 10px;
                left: 10px;
                background: rgba(0, 0, 0, 0.8);
                color: #0f0;
                padding: 10px;
                font-family: monospace;
                font-size: 12px;
                z-index: 1000;
                border-radius: 4px;
            }
        </style>
    </head>
    <body>
        <div id="status">SpaceGraphJS Demo - Loading...</div>
        <div id="container"></div>
        <script type="module" src="/demo/main.ts"></script>
    </body>
</html>
```

**Step 3: Create demo/main.ts**

```typescript
import { SpaceGraph } from '../src/index';

const statusEl = document.getElementById('status')!;

function updateStatus(message: string) {
    statusEl.textContent = message;
    console.log('[Demo]', message);
}

try {
    updateStatus('Creating graph...');

    const graph = SpaceGraph.create('#container', {
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
                position: [150, 0, 0],
                data: { color: 0xff6633 },
            },
            {
                id: 'node-c',
                type: 'ShapeNode',
                label: 'Node C',
                position: [75, 130, 0],
                data: { color: 0x33ff66 },
            },
        ],
        edges: [
            { id: 'edge-ab', source: 'node-a', target: 'node-b', type: 'Edge' },
            { id: 'edge-bc', source: 'node-b', target: 'node-c', type: 'Edge' },
            { id: 'edge-ca', source: 'node-c', target: 'node-a', type: 'Edge' },
        ],
    });

    updateStatus('Rendering graph...');
    graph.render();
    updateStatus('✓ Graph rendered successfully!');
} catch (error) {
    const errorMsg = '✗ Error: ' + (error as Error).message;
    updateStatus(errorMsg);
    statusEl.style.color = '#f00';
    console.error('[Demo] Error:', error);
}
```

**Step 4: Test the demo**

```bash
npm run dev
# Open http://localhost:5173/demo/index.html
```

**Expected result:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DEMO EXPECTATIONS                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  VISUAL:                                                                │
│  • Dark blue background (#1a1a2e)                                      │
│  • 3 colored spheres: blue, orange, green                              │
│  • 3 gray lines connecting them (triangle)                             │
│  • Status overlay: "✓ Graph rendered successfully!"                    │
│                                                                          │
│  INTERACTION:                                                           │
│  • Left-click + drag: Rotate camera                                    │
│  • Scroll wheel: Zoom in/out                                           │
│  • No console errors                                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Commit:**

```bash
git add .
git commit -m "Days 3-4: Working demo with 3 nodes and 3 edges"
```

**✅ Success Criteria:**

- [ ] Demo opens without errors
- [ ] 3 colored spheres visible
- [ ] 3 gray lines connecting them
- [ ] Camera rotates (left-click drag)
- [ ] Camera zooms (scroll wheel)
- [ ] No console errors

---

### Day 5: Testing (3 hours)

**Goal:** Edge cases tested, troubleshooting guide created

**Test 1: Empty graph**

Create `demo/empty.html`:

```html
<!DOCTYPE html>
<html>
    <head>
        <title>Empty Graph Test</title>
        <style>
            * {
                margin: 0;
            }
            #container {
                width: 100vw;
                height: 100vh;
            }
        </style>
    </head>
    <body>
        <div id="container"></div>
        <script type="module">
            import { SpaceGraph } from '../src/index.js';
            try {
                const graph = SpaceGraph.create('#container', { nodes: [], edges: [] });
                graph.render();
                console.log('✓ Empty graph works');
            } catch (e) {
                console.error('✗ Empty graph failed:', e);
            }
        </script>
    </body>
</html>
```

**Expected:** No errors, blank screen (correct behavior)

**Test 2: Single node**

Create `demo/single-node.html`:

```html
<!DOCTYPE html>
<html>
    <head>
        <title>Single Node Test</title>
        <style>
            * {
                margin: 0;
            }
            #container {
                width: 100vw;
                height: 100vh;
            }
        </style>
    </head>
    <body>
        <div id="container"></div>
        <script type="module">
            import { SpaceGraph } from '../src/index.js';
            try {
                const graph = SpaceGraph.create('#container', {
                    nodes: [{ id: 'a', type: 'ShapeNode', label: 'Single', position: [0, 0, 0] }],
                    edges: [],
                });
                graph.render();
                console.log('✓ Single node works');
            } catch (e) {
                console.error('✗ Single node failed:', e);
            }
        </script>
    </body>
</html>
```

**Expected:** One sphere visible

**Test 3: Large graph (100 nodes)**

Create `demo/large.html`:

```html
<!DOCTYPE html>
<html>
    <head>
        <title>Large Graph Test</title>
        <style>
            * {
                margin: 0;
            }
            #container {
                width: 100vw;
                height: 100vh;
            }
        </style>
    </head>
    <body>
        <div id="container"></div>
        <script type="module">
            import { SpaceGraph } from '../src/index.js';

            const startTime = performance.now();

            const nodes = [];
            for (let i = 0; i < 100; i++) {
                nodes.push({
                    id: `node-${i}`,
                    type: 'ShapeNode',
                    position: [Math.random() * 1000 - 500, Math.random() * 1000 - 500, 0],
                });
            }

            const graph = SpaceGraph.create('#container', { nodes, edges: [] });
            graph.render();

            const endTime = performance.now();
            console.log(`✓ 100 nodes rendered in ${(endTime - startTime).toFixed(2)}ms`);
        </script>
    </body>
</html>
```

**Expected:** < 100ms render time

**Test 4: Memory leak check**

1. Open demo/index.html
2. Open DevTools → Memory tab
3. Take heap snapshot
4. Refresh page 5 times
5. Take another heap snapshot
6. Compare snapshots

**Expected:** No significant memory growth (<10MB)

**Create TROUBLESHOOTING.md:**

```markdown
# Troubleshooting

## Demo shows blank screen

1. Check browser console (F12) for errors
2. Verify Three.js loaded: `console.log(typeof THREE)` → should be "object"
3. Check container has size: `document.getElementById('container').clientWidth` → should be > 0
4. Verify WebGL support: https://get.webgl.org/

## Camera controls don't work

1. Click directly on the canvas (not outside)
2. Check browser console for errors
3. Try a different browser

## npm install fails

1. Delete node_modules: `rm -rf node_modules`
2. Delete package-lock.json: `rm package-lock.json`
3. Reinstall: `npm install`

## TypeScript errors

1. Check TypeScript version: `npx tsc --version`
2. Should be 5.x.x
3. Run: `npm install` to get correct versions
```

**Commit:**

```bash
git add .
git commit -m "Day 5: Edge case testing and troubleshooting guide"
```

**✅ Success Criteria:**

- [ ] Empty graph test passes
- [ ] Single node test passes
- [ ] Large graph renders in <100ms
- [ ] No memory leaks
- [ ] TROUBLESHOOTING.md created

---

### Days 6-7: Buffer + Bug Fixes (8 hours)

**Goal:** Address any issues found, improve quality

**Use this time to:**

| Task                       | Priority | Time |
| -------------------------- | -------- | ---- |
| Fix bugs from testing      | High     | 2-4h |
| Improve error messages     | Medium   | 1-2h |
| Add missing features       | Medium   | 2-4h |
| Write better documentation | Low      | 1-2h |

**Common fixes:**

```typescript
// Better error messages
if (!element) {
    throw new Error(
        `Container not found: "${container}".\n` + `Make sure the element exists in the DOM.`,
    );
}

// Graceful WebGL fallback
function checkWebGL(): boolean {
    try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch {
        return false;
    }
}

if (!checkWebGL()) {
    console.warn('WebGL not supported. Some features may not work.');
}
```

**Commit:**

```bash
git add .
git commit -m "Days 6-7: Bug fixes and improvements"
```

**✅ Success Criteria:**

- [ ] All known bugs fixed
- [ ] Error messages are helpful
- [ ] Code is cleaner

---

### Days 8-10: Polish (12 hours)

**Goal:** Professional-quality defaults

**Add labels to nodes:**

```typescript
// In SpaceGraph.ts, add to createNode():
if (spec.label) {
  this.createLabel(spec.label, sphere.position);
}

// Add method:
createLabel(text: string, position: THREE.Vector3): void {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  canvas.width = 256;
  canvas.height = 64;

  context.font = 'Bold 32px Arial';
  context.fillStyle = 'white';
  context.textAlign = 'center';
  context.fillText(text, 128, 40);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(material);
  sprite.position.copy(position);
  sprite.position.y += 30;
  sprite.scale.set(50, 12.5, 1);

  this.scene.add(sprite);
}
```

**Improve camera controls:**

```typescript
// Add damping for smoothness
let damping = 0.9;
let velocity = { x: 0, y: 0 };

// In mousemove:
velocity.x = deltaX * 0.005;
velocity.y = deltaY * 0.005;

// In animation loop:
spherical.theta -= velocity.x * damping;
spherical.phi -= velocity.y * damping;
velocity.x *= 0.9;
velocity.y *= 0.9;
```

**Add performance optimizations:**

```typescript
// Object pooling for geometries
const geometryPool: THREE.SphereGeometry[] = [];

function getGeometry(): THREE.SphereGeometry {
    if (geometryPool.length > 0) {
        return geometryPool.pop()!;
    }
    return new THREE.SphereGeometry(20, 32, 32);
}

function releaseGeometry(geo: THREE.SphereGeometry) {
    geometryPool.push(geo);
}
```

**Commit:**

```bash
git add .
git commit -m "Days 8-10: Polish - labels, improved controls, performance"
```

**✅ Success Criteria:**

- [ ] Labels visible on nodes
- [ ] Camera feels smooth
- [ ] Performance improved

---

### Days 11-12: Fresh Install Test (4 hours)

**Goal:** Verify package works in clean environment

**Step 1: Clean build**

```bash
npm run clean && npm run build
```

**Step 2: Test fresh install**

```bash
# Create clean test directory
rm -rf /tmp/sg-test
mkdir /tmp/sg-test && cd /tmp/sg-test

# Initialize
npm init -y

# Install from local package
npm install /path/to/spacegraphjs
npm install three

# Create test file
cat > test.mjs << 'EOF'
import { SpaceGraph } from 'spacegraphjs';
console.log('Import successful:', typeof SpaceGraph);
EOF

# Test import
node test.mjs
# Expected: "Import successful: function"

# Verify types
npx tsc --noEmit test.mjs
```

```bash
gzip -c dist/spacegraphjs.js | wc -c

```

**Commit:**

```bash
git add .
git commit -m "Days 11-12: Fresh install test passes"
```

**✅ Success Criteria:**

- [ ] Fresh install works
- [ ] Import successful
- [ ] Types resolve correctly

---

### Days 13-14: QUICKSTART Verification (4 hours)

**Goal:** Stranger can use in <10 minutes

**Create QUICKSTART.md:**

````markdown
# SpaceGraphJS Quickstart

## Install

```bash
npm install spacegraphjs three
```
````

## Your First Graph

```html
<!DOCTYPE html>
<html>
    <body>
        <div id="container" style="width: 100vw; height: 100vh;"></div>
        <script type="module">
            import { SpaceGraph } from 'spacegraphjs';

            const graph = SpaceGraph.create('#container', {
                nodes: [
                    { id: 'a', type: 'ShapeNode', label: 'A', position: [0, 0, 0] },
                    { id: 'b', type: 'ShapeNode', label: 'B', position: [150, 0, 0] },
                ],
                edges: [{ id: 'e1', source: 'a', target: 'b', type: 'Edge' }],
            });

            graph.render();
        </script>
    </body>
</html>
```

Open in browser. Done.

## Controls

- Rotate: Left-click + drag
- Pan: Right-click + drag
- Zoom: Scroll wheel

````

**Test with stranger:**

1. Find someone who hasn't seen the code
2. Give them QUICKSTART.md
3. Watch them follow it (don't help!)
4. Note where they hesitate
5. Update based on feedback

**Commit:**

```bash
git add .
git commit -m "Days 13-14: QUICKSTART.md verified"
````

**✅ Success Criteria:**

- [ ] Stranger completes in <10 minutes
- [ ] No confusion points
- [ ] All commands work as written

---

## Launch Phase (Days 15-17)

### Day 15: Final Verification (2 hours)

**Checklist:**

```bash
# Clean build
npm run clean && npm run build

# Verify types
ls dist/types/index.d.ts

# Test fresh install
rm -rf /tmp/final-test
mkdir /tmp/final-test && cd /tmp/final-test
npm install /path/to/spacegraphjs
npm install three
# Verify import works

gzip -c dist/spacegraphjs.js | wc -c

# Run demo one more time
npm run dev
# Open demo/index.html in Chrome and Firefox

# npm login check
npm whoami
```

**✅ Success Criteria:**

- [ ] All checks pass
- [ ] Demo works in Chrome and Firefox
- [ ] npm login valid

---

### Day 16: Publish (2 hours)

**Step 1: Update version**

Edit package.json:

```json
{
    "version": "6.0.0-alpha.1"
}
```

**Step 2: Publish**

```bash
npm publish --tag alpha
```

**Step 3: Verify**

Visit: https://www.npmjs.com/package/spacegraphjs

Should show:

- Package name: spacegraphjs
- Version: 6.0.0-alpha.1
- Tag: alpha

**Step 4: Test public install**

```bash
mkdir /tmp/public-test && cd /tmp/public-test
npm install spacegraphjs@alpha three
```

**Commit:**

```bash
git add .
git commit -m "Day 16: Published to npm as spacegraphjs@alpha"
```

**✅ Success Criteria:**

- [ ] Package on npmjs.com
- [ ] Public install works
- [ ] Tag is alpha (not latest)

---

### Day 17: Announce (2 hours)

**GitHub Discussions:**

```markdown
🚀 SpaceGraphJS Alpha is Live!

The first self-building UI framework is now available on npm.

Try it: npm install spacegraphjs@alpha
Quickstart: [link to QUICKSTART.md]
Community: https://matrix.to/#/#spacegraphjs:matrix.org
```

**Matrix:**

```
🚀 SpaceGraphJS Alpha is live!

npm install spacegraphjs@alpha

Quickstart: [link]
GitHub: [link]
```

**✅ Success Criteria:**

- [ ] Announcement posted to GitHub
- [ ] Announcement posted to Matrix
- [ ] Links work

---

## Summary

| Day       | Focus            | Time    | Success Criteria          |
| --------- | ---------------- | ------- | ------------------------- |
| **0**     | Environment      | 1h      | Node 18+, git initialized |
| **1**     | Project Setup    | 4h      | npm install works         |
| **2**     | SpaceGraph Class | 4h      | Build succeeds            |
| **3-4**   | Demo             | 6h      | 3 nodes + 3 edges render  |
| **5**     | Testing          | 3h      | Edge cases pass           |
| **6-7**   | Buffer           | 8h      | Bugs fixed                |
| **8-10**  | Polish           | 12h     | Labels, performance       |
| **11-12** | Fresh Install    | 4h      | Works in empty directory  |
| **13-14** | QUICKSTART       | 4h      | <10 min for stranger      |
| **15**    | Final Check      | 2h      | All checks pass           |
| **16**    | Publish          | 2h      | On npm                    |
| **17**    | Announce         | 2h      | Community knows           |
| **TOTAL** |                  | **66h** | **Launch complete**       |

---

**Build complete. Launch successful. On to growth.** 🚀
